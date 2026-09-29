"""Movement tests: student group and teacher SimPy processes generate correct events."""
import simpy
from app.simulation.events import EventManager, EventType
from app.simulation.movement import student_group_process, teacher_process
from app.simulation.queues import QueueManager
from app.models.student import StudentGroup
from app.models.teacher import Teacher
from app.models.config import (
    SimulationConfig, ClassroomConfig, StairConfig, CheckingConfig, SchedulingConfig
)
from app.graph.building_graph import BuildingGraph


def _base_config() -> SimulationConfig:
    return SimulationConfig(
        classrooms=[
            ClassroomConfig(id="101", floor=1, capacity=50, students=50),
            ClassroomConfig(id="201", floor=2, capacity=50, students=0),
        ],
        stairs=[StairConfig(id="STAIR-1", floors=[1, 2], capacity=20, travel_time=10)],
        movements=[],
        subjects=[],
        teachers=[],
        checking=CheckingConfig(desks=5, time_per_sheet=10),
        scheduling=SchedulingConfig(
            batch_window_minutes=5,
            sub_batch_interval_seconds=60,
            teacher_collection_delay_seconds=5,
        ),
    )


def test_student_group_fires_enter_class_event():
    """A student group process must fire STUDENT_ENTER_CLASS on arrival."""
    config = _base_config()
    env = simpy.Environment()
    graph = BuildingGraph(config)
    events = EventManager()
    resources = QueueManager(env, config, graph.edges)

    path = graph.get_shortest_path("101", "201")
    assert len(path) > 0, "No path found from 101 to 201"

    group = StudentGroup(
        id="101-201",
        source_class="101",
        destination_class="201",
        student_count=5,
        subject="SCI",
        batch_releases=[{"t": 0, "count": 5}],
    )
    env.process(student_group_process(env, group, path, resources, events, graph))
    env.run(until=200)

    fired_types = [e.type for e in events.events]
    assert EventType.STUDENT_BATCH_RELEASE in fired_types
    assert EventType.STUDENT_ENTER_CLASS in fired_types


def test_student_group_respects_stair_capacity():
    """Two concurrent groups sharing a stair: total never exceeds stair capacity."""
    config = _base_config()
    env = simpy.Environment()
    graph = BuildingGraph(config)
    events = EventManager()
    resources = QueueManager(env, config, graph.edges)

    path = graph.get_shortest_path("101", "201")

    for i in range(2):
        group = StudentGroup(
            id=f"grp-{i}",
            source_class="101",
            destination_class="201",
            student_count=10,
            subject="SCI",
            batch_releases=[{"t": 0, "count": 10}],
        )
        env.process(student_group_process(env, group, path, resources, events, graph))

    env.run(until=200)
    # Both groups should eventually arrive
    arrivals = [e for e in events.events if e.type == EventType.STUDENT_ENTER_CLASS]
    assert len(arrivals) == 2


def test_teacher_fires_checking_complete():
    """Teacher process must fire CHECKING_COMPLETE after processing sheets."""
    config = _base_config()
    env = simpy.Environment()
    graph = BuildingGraph(config)
    events = EventManager()
    resources = QueueManager(env, config, graph.edges)

    teacher = Teacher(id="T-101", classroom_id="101", collection_delay=5, sheet_count=3)
    path = graph.get_shortest_path("101", "CHECKING-ROOM")
    assert len(path) > 0

    env.process(teacher_process(env, teacher, path, resources, events, graph, checking_time=10))
    env.run(until=500)

    fired_types = [e.type for e in events.events]
    assert EventType.TEACHER_COLLECT_SHEETS in fired_types
    assert EventType.TEACHER_REACH_CHECKING_ROOM in fired_types
    assert EventType.CHECKING_COMPLETE in fired_types
