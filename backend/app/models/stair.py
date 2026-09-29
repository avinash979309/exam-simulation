from pydantic import BaseModel
from typing import List

class Stair(BaseModel):
    id: str
    floors: List[int]
    capacity: int
    travel_time: float
