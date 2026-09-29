from pydantic import BaseModel
from typing import List, Optional, Dict

class ClassroomConfig(BaseModel):
    id: str
    floor: int
    capacity: int
    students: int = 0

class StairConfig(BaseModel):
    id: str
    floors: List[int]
    capacity: int
    travel_time: float

class MovementConfig(BaseModel):
    source_class: str
    destination_class: str
    students: int
    subject: str

class SubjectConfig(BaseModel):
    code: str
    name: str

class TeacherConfig(BaseModel):
    id: str
    classroom_id: str

class CheckingConfig(BaseModel):
    desks: int
    time_per_sheet: float

class SchedulingConfig(BaseModel):
    batch_window_minutes: float
    sub_batch_interval_seconds: float
    teacher_collection_delay_seconds: float

class SimulationConfig(BaseModel):
    classrooms: List[ClassroomConfig]
    stairs: List[StairConfig]
    movements: List[MovementConfig]
    subjects: List[SubjectConfig]
    teachers: List[TeacherConfig]
    checking: CheckingConfig
    scheduling: SchedulingConfig
