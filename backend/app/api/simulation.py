from fastapi import APIRouter, HTTPException, BackgroundTasks
import uuid
from collections import defaultdict
from app.models.config import SimulationConfig
from app.services.simulation_store import create_state, get_state, update_state
from app.simulation.engine import run_simulation_bg
from app.services.sample_scenario import get_sample_scenario
from app.simulation.metrics import MetricsCollector
from app.simulation.events import SimulationEvent

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

# NOTE: /sample must be before /{sim_id}/* to avoid route shadowing
@router.get("/sample")
def get_sample():
    return get_sample_scenario().model_dump()


@router.post("/compare")
def compare_simulations(body: dict):
    sim_id_a = body.get("sim_id_a")
    sim_id_b = body.get("sim_id_b")
    if not sim_id_a or not sim_id_b:
        raise HTTPException(status_code=422, detail="sim_id_a and sim_id_b required")

    def _metrics(sim_id: str):
        state = get_state(sim_id)
        if not state or state.get("status") != "COMPLETED":
            raise HTTPException(status_code=400, detail=f"Simulation {sim_id} not completed")
        events = [SimulationEvent(**e) for e in state.get("events", [])]
        config_data = state.get("config")
        config = SimulationConfig(**config_data) if config_data else None
        collector = MetricsCollector()
        if config:
            collector.metrics.desks_total = config.checking.desks
        return collector.calculate(events, config).model_dump()

    return {"a": _metrics(sim_id_a), "b": _metrics(sim_id_b)}


@router.post("/create")
def create_simulation(config: SimulationConfig):
    class_ids = [c.id for c in config.classrooms]
    if len(class_ids) != len(set(class_ids)):
        raise HTTPException(status_code=422, detail="Duplicate classroom IDs")

    for m in config.movements:
        if m.destination_class not in class_ids:
            raise HTTPException(status_code=422, detail=f"Destination class {m.destination_class} does not exist")

    # Validate movement totals per source class
    source_totals: dict = defaultdict(int)
    for m in config.movements:
        source_totals[m.source_class] += m.students
    for c in config.classrooms:
        if source_totals[c.id] > c.students:
            raise HTTPException(
                status_code=422,
                detail=f"Classroom {c.id}: movements total ({source_totals[c.id]}) exceeds students ({c.students})"
            )

    sim_id = str(uuid.uuid4())
    create_state(sim_id)
    update_state(sim_id, {"config": config.model_dump(), "status": "CREATED"})
    return {"simulation_id": sim_id, "status": "CREATED"}


@router.post("/{sim_id}/start")
def start_simulation(sim_id: str, background_tasks: BackgroundTasks):
    state = get_state(sim_id)
    if not state:
        raise HTTPException(status_code=404, detail="Simulation not found")
    config = SimulationConfig(**state["config"])
    background_tasks.add_task(run_simulation_bg, config, sim_id)
    return {"status": "RUNNING"}


@router.get("/{sim_id}/state")
def get_sim_state(sim_id: str):
    state = get_state(sim_id)
    if not state:
        raise HTTPException(status_code=404, detail="Not found")
    return state


@router.get("/{sim_id}/events")
def get_sim_events(sim_id: str):
    state = get_state(sim_id)
    if not state:
        raise HTTPException(status_code=404, detail="Not found")
    return {"events": state.get("events", [])}


@router.get("/{sim_id}/results")
def get_sim_results(sim_id: str):
    state = get_state(sim_id)
    if not state or state.get("status") != "COMPLETED":
        raise HTTPException(status_code=400, detail="Simulation not completed")
    events = [SimulationEvent(**e) for e in state.get("events", [])]
    config_data = state.get("config")
    config = SimulationConfig(**config_data) if config_data else None
    collector = MetricsCollector()
    if config:
        collector.metrics.desks_total = config.checking.desks
    metrics = collector.calculate(events, config)
    return metrics.model_dump()


@router.post("/{sim_id}/stop")
def stop_simulation(sim_id: str):
    update_state(sim_id, {"status": "STOPPED"})
    return {"status": "STOPPED"}
