from enum import Enum
from pydantic import BaseModel
from typing import Any, Dict, Optional

class EventType(str, Enum):
    STUDENT_BATCH_RELEASE = "STUDENT_BATCH_RELEASE"
    STUDENT_ENTER_STAIR = "STUDENT_ENTER_STAIR"
    STUDENT_EXIT_STAIR = "STUDENT_EXIT_STAIR"
    STUDENT_ENTER_PATH = "STUDENT_ENTER_PATH"
    STUDENT_ENTER_CLASS = "STUDENT_ENTER_CLASS"
    
    TEACHER_COLLECT_SHEETS = "TEACHER_COLLECT_SHEETS"
    TEACHER_RELEASE = "TEACHER_RELEASE"
    TEACHER_ENTER_STAIR = "TEACHER_ENTER_STAIR"
    TEACHER_EXIT_STAIR = "TEACHER_EXIT_STAIR"
    TEACHER_REACH_CHECKING_ROOM = "TEACHER_REACH_CHECKING_ROOM"
    
    ANSWER_SHEET_QUEUE = "ANSWER_SHEET_QUEUE"
    CHECKING_DESK_ASSIGNMENT = "CHECKING_DESK_ASSIGNMENT"
    CHECKING_COMPLETE = "CHECKING_COMPLETE"

    SIMULATION_START = "SIMULATION_START"
    SIMULATION_COMPLETE = "SIMULATION_COMPLETE"

class SimulationEvent(BaseModel):
    time: float
    type: EventType
    data: Dict[str, Any]

class EventManager:
    def __init__(self):
        self.events = []
        
    def fire(self, event_type: EventType, time: float, **data):
        self.events.append(SimulationEvent(time=time, type=event_type, data=data))
