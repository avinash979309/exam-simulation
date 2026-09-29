from app.simulation.scheduler import BatchScheduler
from app.models.config import SchedulingConfig
from app.models.pathway import Pathway

def test_compute_batches():
    config = SchedulingConfig(batch_window_minutes=5, sub_batch_interval_seconds=60, teacher_collection_delay_seconds=120)
    edges = [Pathway(id="s1", source="A", target="B", capacity=30, travel_time=10, type="STAIR")]
    batches = BatchScheduler.compute_batches(25, edges, config)
    assert len(batches) == 3
    assert batches[0]['count'] == 10
    assert batches[1]['count'] == 10
    assert batches[2]['count'] == 5
    assert batches[0]['t'] == 0
    assert batches[1]['t'] == 60
    assert batches[2]['t'] == 120
