from pydantic import BaseModel
from typing import List, Dict

class StudentGroup(BaseModel):
    id: str
    source_class: str
    destination_class: str
    student_count: int
    subject: str
    batch_releases: List[Dict[str, float]] = []  # e.g. [{"t": 0, "count": 20}]
