"""Stair and classroom capacity tests using SimPy."""
import simpy
from app.simulation.queues import QueueManager
from app.models.config import SimulationConfig, ClassroomConfig, StairConfig, CheckingConfig, SchedulingConfig
from app.models.pathway import Pathway


def _config(classroom_cap: int = 10, stair_cap: int = 5) -> SimulationConfig:
    return SimulationConfig(
        classrooms=[ClassroomConfig(id="101", floor=1, capacity=classroom_cap, students=classroom_cap)],
        stairs=[StairConfig(id="ST-1", floors=[1, 2], capacity=stair_cap, travel_time=10)],
        movements=[],
        subjects=[],
        teachers=[],
        checking=CheckingConfig(desks=2, time_per_sheet=10),
        scheduling=SchedulingConfig(
            batch_window_minutes=5,
            sub_batch_interval_seconds=60,
            teacher_collection_delay_seconds=120,
        ),
    )


def test_stair_capacity_enforced():
    """Stair resource must block when capacity is reached."""
    env = simpy.Environment()
    edges = [Pathway(id="ST-1", source="Corridor-F1", target="Corridor-F2", capacity=5, travel_time=10, type="STAIR")]
    qm = QueueManager(env, _config(stair_cap=5), edges)

    stair = qm.stairs["ST-1"]
    assert stair.capacity == 5

    # Request 5 slots — all should succeed immediately
    reqs = [stair.request() for _ in range(5)]
    for r in reqs:
        env.step()
    assert stair.count == 5

    # 6th request must queue
    extra = stair.request()
    assert len(stair.queue) == 1  # one waiting
    assert stair.count == 5       # capacity not exceeded

    # Release one — queued request gets it
    stair.release(reqs[0])
    env.step()
    assert stair.count == 5
    assert len(stair.queue) == 0


def test_classroom_capacity_enforced():
    """Classroom resource must not exceed capacity."""
    env = simpy.Environment()
    qm = QueueManager(env, _config(classroom_cap=3), [])
    classroom = qm.classrooms["101"]
    assert classroom.capacity == 3

    reqs = [classroom.request() for _ in range(3)]
    for _ in range(3):
        env.step()
    assert classroom.count == 3

    extra = classroom.request()
    assert len(classroom.queue) == 1


def test_checking_room_capacity():
    """Checking room resource must cap at desk count."""
    env = simpy.Environment()
    qm = QueueManager(env, _config(), [])
    assert qm.checking_room.capacity == 2
