from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.simulation.events import SimulationEvent, EventType


class StairMetrics(BaseModel):
    id: str
    total_entries: int = 0
    peak_occupancy: int = 0
    times_at_capacity: int = 0
    utilization_pct: float = 0.0


class Bottleneck(BaseModel):
    id: str
    type: str
    description: str
    peak_utilization: float
    peak_queue: int
    severity: str  # LOW | MEDIUM | HIGH | CRITICAL


class SimulationMetrics(BaseModel):
    # Time
    total_time: float = 0.0

    # Students
    total_students: int = 0
    students_arrived: int = 0
    students_releasing: int = 0  # released from source but not yet arrived
    avg_travel_time: float = 0.0
    max_travel_time: float = 0.0

    # Teachers
    total_teachers: int = 0
    teachers_done: int = 0
    avg_teacher_check_start: float = 0.0

    # Stairs
    stair_stats: Dict[str, StairMetrics] = {}

    # Checking
    desks_total: int = 0
    total_sheets: int = 0
    sheets_processed: int = 0
    peak_check_queue: int = 0
    avg_check_wait_time: float = 0.0
    completion_time: float = 0.0

    # Bottlenecks
    bottlenecks: List[Bottleneck] = []


class MetricsCollector:
    def __init__(self):
        self.metrics = SimulationMetrics()

    def calculate(self, events: List[SimulationEvent], config=None) -> SimulationMetrics:
        if not events:
            return self.metrics

        self.metrics.total_time = max(e.time for e in events)

        # Student metrics — derive from STUDENT_BATCH_RELEASE and STUDENT_ENTER_CLASS
        releases: Dict[str, Dict[str, Any]] = {}  # group_id → {release_time, count}
        arrivals: Dict[str, Dict[str, Any]] = {}  # group_id → {arrive_time, count}
        travel_times: List[float] = []

        # Teacher metrics
        teacher_release_times: Dict[str, float] = {}
        teacher_check_start_times: Dict[str, float] = {}
        check_start_times: List[float] = []
        n_teachers = 0
        teachers_done = 0

        # Stair metrics
        stair_entries: Dict[str, int] = {}
        stair_occupancy: Dict[str, int] = {}
        stair_peak: Dict[str, int] = {}
        stair_at_cap: Dict[str, int] = {}

        # Checking queue tracking
        sheets_queued = 0
        sheets_processed = 0
        current_queue = 0
        peak_queue = 0
        check_wait_times: List[float] = []

        # Sort events by time for ordered processing
        sorted_events = sorted(events, key=lambda e: e.time)

        for ev in sorted_events:
            t = ev.time
            d = ev.data

            if ev.type == EventType.STUDENT_BATCH_RELEASE:
                gid = d.get("group_id", "?")
                cnt = d.get("count", 0)
                if gid not in releases:
                    releases[gid] = {"time": t, "count": 0}
                releases[gid]["count"] += cnt

            elif ev.type == EventType.STUDENT_ENTER_CLASS:
                gid = d.get("group_id", "?")
                cnt = d.get("count", 0)
                if gid not in arrivals:
                    arrivals[gid] = {"time": t, "count": 0}
                arrivals[gid]["count"] += cnt
                if gid in releases:
                    travel_times.append(t - releases[gid]["time"])

            elif ev.type == EventType.STUDENT_ENTER_STAIR:
                sid = d.get("stair_id", "?")
                cnt = d.get("count", 0)
                stair_entries[sid] = stair_entries.get(sid, 0) + cnt
                stair_occupancy[sid] = stair_occupancy.get(sid, 0) + cnt
                peak = stair_occupancy.get(sid, 0)
                if peak > stair_peak.get(sid, 0):
                    stair_peak[sid] = peak

            elif ev.type == EventType.STUDENT_EXIT_STAIR:
                sid = d.get("stair_id", "?")
                cnt = d.get("count", 0)
                stair_occupancy[sid] = max(0, stair_occupancy.get(sid, 0) - cnt)

            elif ev.type == EventType.TEACHER_RELEASE:
                n_teachers += 1
                teacher_release_times[d.get("teacher_id", "?")] = t

            elif ev.type == EventType.TEACHER_ENTER_STAIR:
                sid = d.get("stair_id", "?")
                stair_entries[sid] = stair_entries.get(sid, 0) + 1

            elif ev.type == EventType.ANSWER_SHEET_QUEUE:
                cnt = d.get("count", 0)
                sheets_queued += cnt
                current_queue += cnt
                if current_queue > peak_queue:
                    peak_queue = current_queue
                tid = d.get("teacher_id", "?")
                teacher_check_start_times[tid] = t
                if tid in teacher_release_times:
                    check_wait_times.append(t - teacher_release_times[tid])

            elif ev.type == EventType.CHECKING_DESK_ASSIGNMENT:
                current_queue = max(0, current_queue - 1)
                check_start_times.append(t)

            elif ev.type == EventType.CHECKING_COMPLETE:
                teachers_done += 1
                cnt = d.get("count", 0)
                sheets_processed += cnt
                self.metrics.completion_time = t

        # Aggregate
        self.metrics.total_students = sum(r["count"] for r in releases.values())
        self.metrics.students_arrived = sum(a["count"] for a in arrivals.values())
        self.metrics.students_releasing = self.metrics.total_students - self.metrics.students_arrived
        self.metrics.avg_travel_time = sum(travel_times) / len(travel_times) if travel_times else 0.0
        self.metrics.max_travel_time = max(travel_times) if travel_times else 0.0
        self.metrics.total_teachers = n_teachers
        self.metrics.teachers_done = teachers_done
        self.metrics.avg_teacher_check_start = sum(check_wait_times) / len(check_wait_times) if check_wait_times else 0.0
        self.metrics.total_sheets = sheets_queued
        self.metrics.sheets_processed = sheets_processed
        self.metrics.peak_check_queue = peak_queue
        self.metrics.avg_check_wait_time = sum(check_wait_times) / len(check_wait_times) if check_wait_times else 0.0

        # Stair stats
        for sid in set(list(stair_entries.keys()) + list(stair_peak.keys())):
            entries = stair_entries.get(sid, 0)
            peak = stair_peak.get(sid, 0)
            # capacity from config if available
            cap = 1
            if config:
                for s in config.stairs:
                    if s.id == sid:
                        cap = s.capacity
                        break
            util = (peak / cap * 100) if cap > 0 else 0.0
            self.metrics.stair_stats[sid] = StairMetrics(
                id=sid,
                total_entries=entries,
                peak_occupancy=peak,
                times_at_capacity=stair_at_cap.get(sid, 0),
                utilization_pct=round(util, 1),
            )

        # Bottleneck detection
        bottlenecks: List[Bottleneck] = []
        for sid, sm in self.metrics.stair_stats.items():
            if sm.utilization_pct >= 90:
                bottlenecks.append(Bottleneck(
                    id=sid, type="STAIR",
                    description=f"Peak {sm.peak_occupancy} occupants",
                    peak_utilization=sm.utilization_pct,
                    peak_queue=sm.peak_occupancy,
                    severity="CRITICAL" if sm.utilization_pct >= 100 else "HIGH",
                ))
        if peak_queue > 20:
            bottlenecks.append(Bottleneck(
                id="CHECKING-ROOM", type="CHECKING_ROOM",
                description=f"Peak queue: {peak_queue} sheets",
                peak_utilization=min(100.0, peak_queue / max(1, self.metrics.desks_total) * 100),
                peak_queue=peak_queue,
                severity="HIGH" if peak_queue > 50 else "MEDIUM",
            ))

        # Sort by severity
        sev_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        bottlenecks.sort(key=lambda b: sev_order.get(b.severity, 99))
        self.metrics.bottlenecks = bottlenecks

        return self.metrics
