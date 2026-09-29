# Exam Movement & Answer-Sheet Logistics Simulation System

A discrete-event simulation and visualization system for student/teacher movement
during examination transitions at a school or coaching institute.

---

## 1. Problem

When an exam ends at a large institution, hundreds of students must simultaneously:
- Leave their current examination room
- Navigate corridors and stairs to reach their next exam room
- Queue when stairs/corridors/classrooms are at capacity

Teachers must simultaneously:
- Collect answer sheets from students
- Transport them to a checking room
- Queue for available checking desks

This creates complex resource-contention, congestion, and scheduling problems.
The system simulates and visualizes this entire process.

---

## 2. Why This Problem Exists

It demonstrates multiple CS/system-design concepts simultaneously:
- **Queue management** — FIFO queues at stairs, corridors, checking room
- **Batch processing** — students released in controlled sub-batches
- **Scheduling** — timed release windows to prevent stampede
- **Resource allocation** — limited stairs, corridors, checking desks
- **Capacity constraints** — classrooms, stairs, corridors all have maximums
- **Congestion management** — entities wait rather than teleport
- **Graph/path traversal** — NetworkX shortest-path through building graph
- **Discrete-event simulation** — SimPy event-driven engine
- **Visualization** — SVG-based live building map

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│   Config UI │ Building Map (SVG) │ Dashboard │ Timeline      │
└──────────────────────────┬───────────────────────────────────┘
                           │ REST (polling every 500ms)
┌──────────────────────────▼───────────────────────────────────┐
│                     FastAPI Backend                          │
│   /api/simulation/*   /api/config/*   /api/results/*         │
└──────┬────────────────────┬──────────────────────┬───────────┘
       │                    │                      │
┌──────▼──────┐   ┌─────────▼──────┐   ┌──────────▼───────────┐
│ Simulation  │   │  Scheduling    │   │  Path/Graph          │
│ Engine      │   │  Engine        │   │  Engine (NetworkX)   │
│ (SimPy)     │   │  (Batch calc)  │   │  (Shortest path)     │
└──────┬──────┘   └─────────┬──────┘   └──────────┬───────────┘
       └────────────────────┴──────────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │   In-Memory State Store    │
              │   dict[sim_id → state]     │
              └────────────────────────────┘
```

---

## 4. Simulation Model

### Engine

Uses **SimPy** discrete-event simulation:
- `simpy.Environment` — event loop and clock
- `simpy.Resource(capacity=N)` — enforces capacity for stairs, corridors, classrooms, checking desks
- Student groups and teachers run as concurrent SimPy **processes**
- All capacity queuing is handled natively by SimPy

### Event Model

Every state change fires a `SimulationEvent`:

| Event | Description |
|-------|-------------|
| `EXAM_END` | Simulation starts |
| `STUDENT_BATCH_RELEASE` | Sub-batch of students released |
| `STUDENT_ENTER_PATH` | Group enters corridor |
| `STUDENT_ENTER_STAIR` | Group enters stair |
| `STUDENT_EXIT_STAIR` | Group exits stair |
| `STUDENT_ENTER_CLASS` | Group arrives at destination |
| `TEACHER_COLLECT_SHEETS` | Teacher collects answer sheets |
| `TEACHER_RELEASE` | Teacher starts moving |
| `TEACHER_ENTER_STAIR` | Teacher on stair |
| `TEACHER_REACH_CHECKING_ROOM` | Teacher arrives at checking room |
| `ANSWER_SHEET_QUEUE` | Sheets join checking queue |
| `CHECKING_DESK_ASSIGNMENT` | Desk assigned to batch |
| `CHECKING_COMPLETE` | Checking done |
| `SIMULATION_COMPLETE` | All done |

---

## 5. Queue Model

| Queue | Implementation | Policy |
|-------|---------------|--------|
| Stair | `simpy.Resource(capacity)` | FIFO |
| Corridor | `simpy.Resource(capacity)` | FIFO |
| Classroom | `simpy.Resource(capacity)` | FIFO |
| Checking desks | `simpy.Resource(n_desks)` | FIFO |

---

## 6. Batch Scheduling

Students released in sub-batches to prevent stampede:

```
bottleneck_capacity = min(edge.capacity for each edge on path)
sub_batch_size = max(1, bottleneck_capacity // 3)

t=0:            release sub_batch_size students
t=sub_interval: release next sub_batch_size
t=2*sub_interval: ...
```

Default: `sub_batch_interval = 60s`, `teacher_collection_delay = 120s`

---

## 7. Graph / Path Model

Building modeled as a **NetworkX DiGraph**:

```
Classroom 101 ──── Corridor-F1 ──── STAIR-1 ──── Corridor-F2 ──── Classroom 201
                        │
                   CHECKING-ROOM
```

Auto-generated topology:
- One corridor node per floor
- Each classroom connects to its floor's corridor (10s travel time)
- Each stair connects floor corridors
- Checking room connects to Floor 1 corridor

Pathfinding: `nx.shortest_path(G, source, target, weight='travel_time')`

---

## 8. Capacity Management

| Resource | Capacity | Behavior when full |
|----------|----------|-------------------|
| Stair | configured | Students wait in SimPy queue |
| Corridor | configured (default 200) | Wait |
| Classroom | configured | Wait until seat free |
| Checking desks | configured | Teacher waits |

State snapshot includes current occupancy and utilization level (LOW/MEDIUM/HIGH/FULL).

---

## 9. Answer Sheet Tagging

Format: `{roll_number}-{subject_code}`

Example:
```
Roll: 400, Subject: Science (SCI)
→ Answer Sheet ID: 400-SCI
```

One teacher per classroom collects all sheets. Teacher transports as a batch to checking room.

---

## 10. Backend Architecture

```
backend/app/
├── main.py              FastAPI app + CORS
├── api/
│   ├── simulation.py    REST endpoints
│   ├── configuration.py (sample scenario)
│   └── results.py
├── models/              Pydantic models
├── simulation/
│   ├── engine.py        SimulationEngine (SimPy coordinator)
│   ├── events.py        EventType enum + SimulationEvent
│   ├── scheduler.py     BatchScheduler
│   ├── queues.py        QueueManager (SimPy Resources)
│   ├── movement.py      SimPy process generators
│   └── metrics.py       MetricsCollector + BottleneckDetector
├── graph/
│   └── building_graph.py  NetworkX graph + auto-topology
└── services/
    ├── simulation_store.py  In-memory state dict
    └── sample_scenario.py   Default 5-classroom scenario
```

---

## 11. Frontend Architecture

```
frontend/src/
├── types/simulation.ts  All TypeScript types
├── services/api.ts      Typed API calls
├── hooks/useSimulation.ts  Playback + polling state machine
├── pages/
│   ├── Configuration/   Multi-step input form
│   ├── Simulation/      Building map + dashboard + timeline
│   └── Results/         Metrics + 6 Recharts charts
└── components/
    ├── BuildingMap/     SVG-based building visualization
    ├── Dashboard/       Live stats panel
    ├── Timeline/        Playback controls + scrubber
    └── EventLog/        Scrolling event list
```

---

## 12. How to Run

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Run tests

```bash
cd backend
source venv/bin/activate
python -m pytest tests/ -v
```

---

## 13. Example Scenario (Auto-Loaded)

```
Classrooms:
  101 (Floor 1, cap=100, 100 students)
  102 (Floor 1, cap=200, 150 students)
  103 (Floor 1, cap=150, 120 students)
  201 (Floor 2, cap=100, destination)
  202 (Floor 2, cap=100, destination)

Stairs:
  STAIR-1: floors=[1,2], capacity=50, travel_time=30s
  STAIR-2: floors=[1,2], capacity=40, travel_time=30s

Student Movements:
  101 → 201: 50 (Science)
  101 → 202: 50 (Mathematics)
  102 → 201: 60 (Science)
  102 → 202: 90 (Mathematics)
  103 → 201: 40 (Science)
  103 → 202: 80 (Mathematics)

Teachers: T-101, T-102, T-103 → Checking Room

Checking: 20 desks, 5 minutes/sheet
Scheduling: 5min batch window, 1min sub-batch interval, 2min collection delay
```

Click **Load Sample** on the Configuration page to auto-fill this scenario.

---

## 14. API Documentation

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/simulation/sample` | Default scenario config |
| `POST` | `/api/simulation/create` | Create simulation from config |
| `POST` | `/api/simulation/{id}/start` | Start simulation |
| `GET` | `/api/simulation/{id}/state` | Live state snapshot |
| `GET` | `/api/simulation/{id}/events` | Full event log |
| `GET` | `/api/simulation/{id}/results` | Final metrics + bottlenecks |
| `POST` | `/api/simulation/{id}/stop` | Stop simulation |
| `POST` | `/api/simulation/compare` | Compare two sim results |

Full interactive docs at `http://localhost:8000/docs`

### Example: Create and run

```bash
# Get sample config
SAMPLE=$(curl -s http://localhost:8000/api/simulation/sample)

# Create simulation
SIM=$(curl -s -X POST http://localhost:8000/api/simulation/create \
  -H "Content-Type: application/json" -d "$SAMPLE")
SIM_ID=$(echo $SIM | python3 -c "import sys,json; print(json.load(sys.stdin)['simulation_id'])")

# Start
curl -s -X POST "http://localhost:8000/api/simulation/$SIM_ID/start"

# Wait and get results
sleep 5
curl -s "http://localhost:8000/api/simulation/$SIM_ID/results" | python3 -m json.tool
```

---

## 15. Future Improvements

- WebSocket streaming (live events without polling)
- Multiple checking rooms
- Elevator support
- Dynamic route re-selection on congestion
- Priority-based queue policies (teachers over students on stairs)
- Redis-backed state for distributed/long-running simulations
- PostgreSQL persistence for historical comparison
- RL-based batch scheduling optimization
- Automatic timetable generation
- AI-based congestion prediction
- Real-time what-if scenario A/B testing

---

## Known Limitations / Ponytail Debt

- Students represented as groups (not individuals) — O(groups) not O(N_students)
- No dynamic route re-selection mid-movement
- Frontend polls `/state` every 500ms (no WebSocket)
- Single in-memory store: restarting backend loses all simulation state
- Stair SimPy resource counts individual requests (one per student) — for very large counts, individual resource requests replace group-level. Peak occupancy derived from event log is accurate; live `resource.count` reflects individual slots held.
- No mobile/responsive layout
