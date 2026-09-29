from pydantic import BaseModel

class AnswerSheet(BaseModel):
    id: str
    subject: str
    student_class: str
    
class AnswerSheetBatch(BaseModel):
    id: str
    sheets: int
    teacher_id: str
