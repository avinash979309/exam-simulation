from pydantic import BaseModel

class Teacher(BaseModel):
    id: str
    classroom_id: str
    collection_delay: float
    sheet_count: int = 0
