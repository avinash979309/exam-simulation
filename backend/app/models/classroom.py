from pydantic import BaseModel
from typing import Optional

class Classroom(BaseModel):
    id: str
    floor: int
    capacity: int
    students: int
    capacity_reached_at: Optional[float] = None
