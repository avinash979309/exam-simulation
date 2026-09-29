import simpy
import threading
from app.models.config import SimulationConfig
from app.graph.building_graph import BuildingGraph
from app.simulation.scheduler import BatchScheduler
from app.simulation.queues import QueueManager
from app.simulation.events import EventManager, EventType
from app.simulation.movement import student_group_process, teacher_process
from app.services.simulation_store import update_state


class SimulationEngine:
    def __init__(self, config: SimulationConfig, sim_id: str):
        self.config = config
        self.sim_id = sim_id
        self.env = simpy.Environment()
        self.graph = BuildingGraph(config)
        self.events = EventManager()
        self.resources = QueueManager(self.env, config, self.graph.edges)
        # Track group/teacher states for snapshots
        self._group_states: list[dict] = []
        self._teacher_states: list[dict] = []

    def _build_snapshot(self) -> dict:
        """Build a lightweight state snapshot for polling."""
        stair_snapshots = []
        for stair_cfg in self.config.stairs:
            res = self.resources.stairs.get(stair_cfg.id)
            if res:
                occ = res.count
                q_size = len(res.queue)
                cap = stair_cfg.capacity
                util = occ / cap if cap > 0 else 0.0
                level = "FULL" if util >= 1.0 else "HIGH" if util >= 0.8 else "MEDIUM" if util >= 0.5 else "LOW"
                stair_snapshots.append({
                    "id": stair_cfg.id,
                    "capacity": cap,
                    "current_occupancy": occ,
                    "queue_size": q_size,
                    "utilization": round(util, 3),
                    "level": level,
                })

        checking_res = self.resources.checking_room
        checking_snapshot = {
            "desks_total": self.config.checking.desks,
            "desks_occupied": checking_res.count,
            "queue_size": len(checking_res.queue),
            "sheets_processed": 0,  # derived from events
            "total_sheets": sum(c.students for c in self.config.classrooms),
        }

        classroom_snapshots = []
        for c in self.config.classrooms:
            res = self.resources.classrooms.get(c.id)
            if res:
                occ = res.count
                util = occ / c.capacity if c.capacity > 0 else 0.0
                level = "FULL" if util >= 1.0 else "HIGH" if util >= 0.8 else "MEDIUM" if util >= 0.5 else "LOW"
                classroom_snapshots.append({
                    "id": c.id,
                    "floor": c.floor,
                    "capacity": c.capacity,
                    "occupancy": occ,
                    "utilization": round(util, 3),
                    "level": level,
                })

        return {
            "current_time": self.env.now,
            "stairs": stair_snapshots,
            "checking_room": checking_snapshot,
            "classrooms": classroom_snapshots,
            "events": [e.model_dump() for e in self.events.events],
        }

    def setup(self):
        self.events.fire(EventType.SIMULATION_START, 0)

        for m in self.config.movements:
            path = self.graph.get_shortest_path(m.source_class, m.destination_class)
            edges = []
            for i in range(len(path) - 1):
                edge = self.graph.get_edge_info(path[i], path[i + 1])
                if edge:
                    edges.append(edge)

            releases = BatchScheduler.compute_batches(m.students, edges, self.config.scheduling)
            from app.models.student import StudentGroup
            sg = StudentGroup(
                id=f"{m.source_class}-{m.destination_class}",
                source_class=m.source_class,
                destination_class=m.destination_class,
                student_count=m.students,
                subject=m.subject,
                batch_releases=releases,
            )
            self.env.process(student_group_process(self.env, sg, path, self.resources, self.events, self.graph))

        sheet_counts = {c.id: c.students for c in self.config.classrooms}
        for t_conf in self.config.teachers:
            from app.models.teacher import Teacher
            t = Teacher(
                id=t_conf.id,
                classroom_id=t_conf.classroom_id,
                collection_delay=self.config.scheduling.teacher_collection_delay_seconds,
                sheet_count=sheet_counts.get(t_conf.classroom_id, 0),
            )
            path = self.graph.get_shortest_path(t.classroom_id, "CHECKING-ROOM")
            self.env.process(
                teacher_process(self.env, t, path, self.resources, self.events, self.graph, self.config.checking.time_per_sheet)
            )

    def run(self):
        update_state(self.sim_id, {"status": "RUNNING", "current_time": 0, "events": []})
        self.setup()

        last_snapshot_time = -10
        while self.env.peek() != float("inf"):
            try:
                self.env.step()
                # Snapshot every 10 sim-time units (not every step — too expensive)
                if self.env.now - last_snapshot_time >= 10:
                    last_snapshot_time = self.env.now
                    update_state(self.sim_id, self._build_snapshot())
            except simpy.core.EmptySchedule:
                break

        self.events.fire(EventType.SIMULATION_COMPLETE, self.env.now)
        final = self._build_snapshot()
        final["status"] = "COMPLETED"
        update_state(self.sim_id, final)


def run_simulation_bg(config: SimulationConfig, sim_id: str):
    engine = SimulationEngine(config, sim_id)
    engine.run()
