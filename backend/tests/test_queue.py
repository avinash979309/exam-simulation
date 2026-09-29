import simpy
from app.simulation.queues import QueueManager
from app.models.config import SimulationConfig

def test_queue_capacity():
    env = simpy.Environment()
    config = SimulationConfig(classrooms=[], stairs=[], movements=[], subjects=[], teachers=[], checking={"desks": 10, "time_per_sheet": 10}, scheduling={"batch_window_minutes": 5, "sub_batch_interval_seconds": 60, "teacher_collection_delay_seconds": 120})
    qm = QueueManager(env, config, [])
    assert qm.checking_room.capacity == 10
