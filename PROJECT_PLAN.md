# PROJECT_PLAN.md

## Exam Movement & Answer-Sheet Logistics Simulation System

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│   Config UI │ Building Map (SVG) │ Dashboard │ Timeline      │
└──────────────────────────┬───────────────────────────────────┘
                           │ REST (polling)
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
              │   dict[sim_id → SimState]  │
              └────────────────────────────┘
```

---

## Directory Structure

```
MorphleLabs/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── simulation.py
│   │   │   ├── configuration.py
│   │   │   └── results.py
│   │   ├── models/
│   │   │   ├── student.py
│   │   │   ├── teacher.py
│   │   │   ├── classroom.py
│   │   │   ├── stair.py
│   │   │   ├── pathway.py
│   │   │   ├── answer_sheet.py
│   │   │   ├── checking_room.py
│   │   │   └── config.py
│   │   ├── simulation/
│   │   │   ├── engine.py       # SimPy event loop
│   │   │   ├── events.py       # EventType, SimulationEvent
│   │   │   ├── scheduler.py    # BatchScheduler
│   │   │   ├── queues.py       # QueueManager, QueuePolicy
│   │   │   ├── movement.py     # MovementManager (SimPy processes)
│   │   │   └── metrics.py      # MetricsCollector, BottleneckDetector
│   │   ├── graph/
│   │   │   └── building_graph.py  # BuildingGraph, auto-topology
│   │   └── services/
│   │       ├── simulation_store.py  # in-memory state store
│   │       └── sample_scenario.py   # auto-load default scenario
│   ├── tests/
│   │   ├── test_batch.py
│   │   ├── test_queue.py
│   │   ├── test_capacity.py
│   │   ├── test_movement.py
│   │   ├── test_tagging.py
│   │   ├── test_events.py
│   │   └── test_integration.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BuildingMap/     # SVG-based building visualization
│   │   │   ├── Dashboard/       # Live metrics panel
│   │   │   ├── Timeline/        # Playback controls + scrubber
│   │   │   ├── EventLog/        # Scrolling event log
│   │   │   ├── CheckingRoom/    # Checking room widget
│   │   │   └── SimControls/     # Play/Pause/Speed
│   │   ├── pages/
│   │   │   ├── Configuration/   # Input forms
│   │   │   ├── Simulation/      # Main sim view
│   │   │   └── Results/         # Post-sim analytics + charts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── hooks/
│   │   │   └── useSimulation.ts
│   │   └── types/
│   │       └── simulation.ts
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── ASSUMPTIONS.md
├── DATA_MODEL.md
├── SIMULATION_MODEL.md
├── PROJECT_PLAN.md
└── README.md
```

---

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Core simulation engine (SimPy + queues + batching) | Pending |
| 2 | FastAPI REST layer | Pending |
| 3 | Config UI + Run button + Dashboard | Pending |
| 4 | SVG Building Map | Pending |
| 5 | Animation from event timeline | Pending |
| 6 | Analytics + Charts + Results page | Pending |
| 7 | What-if comparison | Pending |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/simulation/create | Create simulation from config |
| POST | /api/simulation/{id}/start | Start simulation |
| GET  | /api/simulation/{id}/state | Current state snapshot |
| GET  | /api/simulation/{id}/events | Full event log |
| GET  | /api/simulation/{id}/results | Final metrics |
| POST | /api/simulation/{id}/stop | Stop simulation |
| GET  | /api/simulation/sample | Get sample scenario config |
| POST | /api/simulation/compare | Compare two sim results |

---

## Run Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Key Constraints

- Stair: SimPy Resource(capacity=stair.capacity)
- Corridor: SimPy Resource(capacity=corridor.capacity)
- Classroom: SimPy Resource(capacity=classroom.capacity)
- Checking desks: SimPy Resource(capacity=n_desks)
- All queues: FIFO (SimPy default)
- No DB; state in dict[sim_id → SimState]
- Students as groups (not individual objects)
- Frontend polls /state every 500ms during playback
