from pydantic import BaseModel

class CheckingRoom(BaseModel):
    id: str = "CHECKING-ROOM"
    desks: int
    peak_queue: int = 0
    sheets_processed: int = 0
