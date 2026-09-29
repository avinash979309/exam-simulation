from app.models.config import SimulationConfig

def get_sample_scenario() -> SimulationConfig:
    return SimulationConfig(**{
      "classrooms": [
        {"id": "101", "floor": 1, "capacity": 100, "students": 100},
        {"id": "102", "floor": 1, "capacity": 200, "students": 150},
        {"id": "103", "floor": 1, "capacity": 150, "students": 120},
        {"id": "201", "floor": 2, "capacity": 100, "students": 0},
        {"id": "202", "floor": 2, "capacity": 100, "students": 0}
      ],
      "stairs": [
        {"id": "STAIR-1", "floors": [1, 2], "capacity": 50, "travel_time": 30.0},
        {"id": "STAIR-2", "floors": [1, 2], "capacity": 40, "travel_time": 30.0}
      ],
      "movements": [
        {"source_class": "101", "destination_class": "201", "students": 50, "subject": "SCI"},
        {"source_class": "101", "destination_class": "202", "students": 50, "subject": "MTH"},
        {"source_class": "102", "destination_class": "201", "students": 60, "subject": "SCI"},
        {"source_class": "102", "destination_class": "202", "students": 90, "subject": "MTH"},
        {"source_class": "103", "destination_class": "201", "students": 40, "subject": "SCI"},
        {"source_class": "103", "destination_class": "202", "students": 80, "subject": "MTH"}
      ],
      "subjects": [
        {"code": "SCI", "name": "Science"},
        {"code": "MTH", "name": "Mathematics"}
      ],
      "teachers": [
        {"id": "T-101", "classroom_id": "101"},
        {"id": "T-102", "classroom_id": "102"},
        {"id": "T-103", "classroom_id": "103"}
      ],
      "checking": {
        "desks": 20,
        "time_per_sheet": 300.0
      },
      "scheduling": {
        "batch_window_minutes": 5.0,
        "sub_batch_interval_seconds": 60.0,
        "teacher_collection_delay_seconds": 120.0
      }
    })
