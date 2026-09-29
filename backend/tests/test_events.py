from app.simulation.events import EventManager, EventType
def test_event_manager():
    em = EventManager()
    em.fire(EventType.SIMULATION_START, 0.0)
    assert len(em.events) == 1
    assert em.events[0].type == EventType.SIMULATION_START
