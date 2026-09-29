# DATA_MODEL.md

All core data structures for the simulation.

---

## 1. Classroom

```python
Classroom:
  id: str                # "101", "201"
  floor: int             # 1, 2, ...
  capacity: int          # max students
  current_students: int  # at sim start
  label: str             # display name
```

---

## 2. Subject

```python
Subject:
  id: str        # "SCI"
  name: str      # "Science"
  code: str      # "101" (for answer-sheet tagging)
```

---

## 3. StudentGroup

Aggregated group — avoids materializing millions of objects.

```python
StudentGroup:
  id: str               # "SG-101-201-SCI"
  source_class: str     # "101"
  destination_class: str # "201"
  subject_id: str       # "SCI"
  count: int            # number of students
  roll_start: int       # first roll number in this group
  roll_end: int         # last roll number
  state: GroupState     # WAITING | IN_TRANSIT | ARRIVED | QUEUED
  current_location: str # node id in building graph
  path: list[str]       # planned path node sequence
  batch_releases: list[BatchRelease]  # scheduled release events
```

---

## 4. Teacher

```python
Teacher:
  id: str               # "T-101"
  name: str             # "Teacher 101"
  classroom_id: str     # assigned classroom
  answer_sheets: list[AnswerSheetBatch]
  state: TeacherState   # COLLECTING | PACKAGING | MOVING | QUEUED | DONE
  current_location: str
  path: list[str]
```

---

## 5. AnswerSheet (individual, lazy-materialized)

Only created when needed (tagging, reporting). Not stored for every student in memory.

```python
AnswerSheet:
  id: str          # "400-SCI"
  roll_number: int
  subject_id: str
  subject_code: str
  source_class: str
  state: SheetState  # WITH_TEACHER | IN_QUEUE | BEING_CHECKED | DONE
```

Answer sheets are processed in batches (per teacher). Individual sheet objects only exist for the tag/log.

---

## 6. AnswerSheetBatch

```python
AnswerSheetBatch:
  teacher_id: str
  source_class: str
  sheets: list[AnswerSheet]
  count: int
  state: BatchState  # WITH_TEACHER | IN_QUEUE | BEING_CHECKED | DONE
```

---

## 7. Stair

```python
Stair:
  id: str               # "STAIR-1"
  floors: list[int]     # [1, 2] — floors connected
  capacity: int         # max simultaneous occupants
  travel_time: int      # seconds
  current_occupancy: int
  queue: deque[Entity]
  direction: str        # "BOTH" | "UP" | "DOWN"
```

---

## 8. Pathway (Graph Edge)

```python
Pathway:
  from_node: str
  to_node: str
  distance: float      # meters
  travel_time: int     # seconds
  capacity: int        # max simultaneous occupants
  type: PathType       # CORRIDOR | STAIR | DOOR
  current_occupancy: int
```

---

## 9. Corridor (Graph Node)

```python
Corridor:
  id: str
  floor: int
  label: str
  connected_to: list[str]  # node ids
```

---

## 10. CheckingRoom

```python
CheckingRoom:
  id: str = "CHECKING-ROOM"
  floor: int = 1
  desks: int
  checking_time: int    # seconds per sheet
  occupied_desks: int
  queue: deque[AnswerSheetBatch]
  processed: int
  total_sheets: int
```

---

## 11. BuildingGraph

```python
BuildingGraph:
  nodes: dict[str, Node]        # id → (Classroom | Corridor | Stair | CheckingRoom)
  edges: dict[tuple, Pathway]   # (from,to) → Pathway
  graph: nx.DiGraph             # NetworkX digraph for pathfinding
```

Node types: `CLASSROOM`, `CORRIDOR`, `STAIR`, `CHECKING_ROOM`

---

## 12. SimulationConfig

```python
SimulationConfig:
  simulation_id: str
  classrooms: list[ClassroomConfig]
  subjects: list[Subject]
  student_movements: list[MovementConfig]  # source → dest → count
  teachers: list[TeacherConfig]
  stairs: list[StairConfig]
  pathways: list[PathwayConfig]           # optional override
  checking_room: CheckingRoomConfig
  scheduling: SchedulingConfig
  exam_start_display: str  # "10:00" — cosmetic base time for UI
```

---

## 13. SchedulingConfig

```python
SchedulingConfig:
  batch_window_minutes: int      # default 5
  sub_batch_interval_minutes: int # default 1
  teacher_collection_delay_minutes: int  # default 2
  queue_policy: str              # "FIFO" (only supported now)
```

---

## 14. SimulationEvent

```python
SimulationEvent:
  id: str                # UUID
  timestamp: float       # seconds from sim start
  event_type: EventType  # enum
  entity_type: str       # "student_group" | "teacher" | "answer_sheet_batch"
  entity_id: str
  location: str          # current node id
  destination: str | None
  metadata: dict         # extra info (count, occupancy, etc.)
```

---

## 15. SimulationState (snapshot)

```python
SimulationState:
  simulation_id: str
  status: SimStatus      # CREATED | RUNNING | PAUSED | COMPLETED | ERROR
  current_time: float    # seconds
  student_groups: list[StudentGroup]
  teachers: list[Teacher]
  checking_room: CheckingRoom
  stairs: list[Stair]
  events: list[SimulationEvent]
  metrics: SimulationMetrics
```

---

## 16. SimulationMetrics

```python
SimulationMetrics:
  # Students
  total_students: int
  students_moved: int
  students_waiting: int
  students_arrived: int
  avg_travel_time: float
  max_travel_time: float
  avg_wait_time: float
  max_wait_time: float
  stair_delayed_count: int
  capacity_delayed_count: int

  # Teachers
  total_teachers: int
  teachers_moving: int
  teachers_at_checking: int
  avg_teacher_travel_time: float

  # Stairs
  stair_stats: dict[str, StairMetrics]

  # Checking Room
  desks_total: int
  desks_occupied: int
  sheets_waiting: int
  sheets_processed: int
  peak_queue: int
  avg_check_wait_time: float
  completion_time: float

  # Bottlenecks
  bottlenecks: list[Bottleneck]
```

---

## 17. EventType Enum

```python
class EventType(str, Enum):
    EXAM_END = "EXAM_END"
    STUDENT_BATCH_RELEASE = "STUDENT_BATCH_RELEASE"
    STUDENT_ENTER_PATH = "STUDENT_ENTER_PATH"
    STUDENT_ENTER_STAIR = "STUDENT_ENTER_STAIR"
    STUDENT_EXIT_STAIR = "STUDENT_EXIT_STAIR"
    STUDENT_ENTER_DESTINATION_QUEUE = "STUDENT_ENTER_DESTINATION_QUEUE"
    STUDENT_ENTER_CLASS = "STUDENT_ENTER_CLASS"
    STUDENT_WAIT = "STUDENT_WAIT"
    TEACHER_COLLECT_SHEETS = "TEACHER_COLLECT_SHEETS"
    TEACHER_RELEASE = "TEACHER_RELEASE"
    TEACHER_ENTER_PATH = "TEACHER_ENTER_PATH"
    TEACHER_ENTER_STAIR = "TEACHER_ENTER_STAIR"
    TEACHER_EXIT_STAIR = "TEACHER_EXIT_STAIR"
    TEACHER_REACH_CHECKING_ROOM = "TEACHER_REACH_CHECKING_ROOM"
    ANSWER_SHEET_QUEUE = "ANSWER_SHEET_QUEUE"
    CHECKING_DESK_ASSIGNMENT = "CHECKING_DESK_ASSIGNMENT"
    CHECKING_COMPLETE = "CHECKING_COMPLETE"
    CONGESTION_DETECTED = "CONGESTION_DETECTED"
    SIMULATION_COMPLETE = "SIMULATION_COMPLETE"
```
