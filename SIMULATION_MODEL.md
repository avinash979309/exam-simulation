# SIMULATION_MODEL.md

How the simulation engine works.

---

## Engine Overview

Discrete-event simulation using **SimPy**.

SimPy processes = concurrent agents (student groups, teachers, checking desks).
SimPy resources = capacity-limited nodes (stairs, corridors, checking desks).
SimPy containers = queues.

All time in **seconds** internally. UI displays minutes:seconds.

---

## Lifecycle

```
t=0   EXAM_END event fired
      ↓
      BatchScheduler schedules student group releases
      TeacherScheduler schedules teacher releases (after collection_delay)
      ↓
t=sub_batch_interval*n   Student sub-batches released
      ↓
      Each group follows its path node by node
      Each edge = acquire corridor resource → wait travel_time → release
      Each stair = acquire stair resource (capacity) → wait travel_time → release
      ↓
      On arrival at destination: check classroom capacity
        - If room not full → STUDENT_ENTER_CLASS, update occupancy
        - If room full → STUDENT_WAIT in destination queue
      ↓
t=collection_delay   Teachers release with answer sheet batches
      Teachers follow shortest path to checking room
      ↓
      On arrival: join checking queue (SimPy resource, n_desks capacity)
      Each desk processes: wait checking_time × sheets_in_batch
      ↓
t=all_done   SIMULATION_COMPLETE event, metrics finalized
```

---

## Batch Scheduling Algorithm

```python
def schedule_batches(group: StudentGroup, config: SchedulingConfig) -> list[BatchRelease]:
    """
    Split group.count students into sub-batches.
    Released at: t=0, t=sub_interval, t=2*sub_interval, ...
    Batch size limited by:
      - min(stair_capacity, corridor_capacity) along path
      - configured max sub-batch size (default: bottleneck_capacity // 3)
    """
    bottleneck = min(edge.capacity for edge in group.path_edges)
    sub_batch_size = max(1, bottleneck // 3)
    remaining = group.count
    releases = []
    t = 0
    while remaining > 0:
        size = min(sub_batch_size, remaining)
        releases.append(BatchRelease(t=t, count=size))
        remaining -= size
        t += config.sub_batch_interval_seconds
    return releases
```

Sub-batches with the same destination from different source classrooms enter a **global destination queue**. The queue releases entities onto the shared path based on path capacity.

---

## Queue Design

### 1. Departure Queue (per classroom)
- Students waiting to leave. Ordered by scheduled release time.
- Drain rate = 1 sub-batch per sub_batch_interval.

### 2. Destination Queue (per destination classroom)
- Students who have arrived at destination corridor but destination is full.
- FIFO. Checked every time a student exits the destination class (vacating a seat, not modeled here → checked on each new arrival).
- Actually: checked at each STUDENT_ENTER_CLASS event — if room full, student waits in SimPy queue on a resource(capacity=room_capacity).

### 3. Stair Queue
- SimPy `Resource(capacity=stair.capacity)`.
- Auto-queues when full. SimPy handles this natively.

### 4. Corridor Queue
- Same: SimPy `Resource(capacity=corridor.capacity)`.

### 5. Checking Room Queue
- SimPy `Resource(capacity=n_desks)`.
- Teachers request 1 desk. Process entire batch. Release desk.

---

## Path Finding

NetworkX `shortest_path` with `weight='travel_time'`.

Path computed once per group at release time. No dynamic re-routing (see ASSUMPTIONS).

```python
path = nx.shortest_path(G, source=src_node, target=dst_node, weight='travel_time')
```

---

## Congestion Detection

After each resource acquire/release, compute utilization:

```python
utilization = resource.count / resource.capacity
if utilization >= 1.0:   level = "FULL"
elif utilization >= 0.8: level = "HIGH"
elif utilization >= 0.5: level = "MEDIUM"
else:                    level = "LOW"
```

`CONGESTION_DETECTED` event fired when level changes.

---

## Simultaneous Movement

SimPy processes run concurrently in the same event loop.
Student group processes and teacher processes are launched simultaneously at `t=0`.
SimPy's cooperative multitasking handles interleaving.

---

## Event Log

Every state transition fires a `SimulationEvent` appended to the global event list.
Events are timestamped with SimPy `env.now`.
Events stored in-memory, returned via API.

---

## Metrics Collection

`MetricsCollector` subscribes to events. Maintains:
- running counts
- time-series arrays (sampled every 10s of sim time)
- per-entity travel/wait time accumulators

Metrics finalized on `SIMULATION_COMPLETE`.

---

## Bottleneck Detection

After simulation:

```python
for stair in stairs:
    if stair.max_occupancy / stair.capacity >= 0.9:
        bottlenecks.append(Bottleneck(id=stair.id, type="STAIR", peak=...))

for classroom in destination_classes:
    if classroom.capacity_reached_at is not None:
        bottlenecks.append(Bottleneck(id=class.id, type="CLASSROOM", ...))

if checking_room.peak_queue > checking_room.desks * 3:
    bottlenecks.append(Bottleneck(id="CHECKING-ROOM", ...))
```

Ranked by severity (peak utilization %).

---

## Sample Scenario (auto-loaded)

```
Classrooms:
  101 (Floor 1, cap 100, 100 students)
  102 (Floor 1, cap 200, 150 students)
  103 (Floor 1, cap 150, 120 students)
  201 (Floor 2, cap 100)
  202 (Floor 2, cap 100)

Graph:
  101 ─ Corridor-F1 ─ Stair-1 ─ Corridor-F2 ─ 201
  102 ─ Corridor-F1 ─ Stair-1 ─ Corridor-F2 ─ 201
  103 ─ Corridor-F1 ─ Stair-2 ─ Corridor-F2 ─ 202
  Corridor-F1 ─ Checking-Room

Stairs:
  STAIR-1: cap 50, 30s
  STAIR-2: cap 40, 30s

Movements:
  101 → 201: 50 (Science)
  101 → 202: 50 (Math)
  102 → 201: 60 (Science)
  102 → 202: 90 (Math)
  103 → 201: 40 (Science)
  103 → 202: 80 (Math)

Checking desks: 20, time: 300s (5 min)

Scheduling:
  batch_window: 5 min
  sub_batch_interval: 1 min
  teacher_collection_delay: 2 min
```
