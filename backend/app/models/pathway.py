from pydantic import BaseModel

class Pathway(BaseModel):
    id: str
    source: str
    target: str
    capacity: int
    travel_time: float
    type: str # 'STAIR' or 'CORRIDOR'
