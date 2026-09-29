"""Answer sheet tagging format tests."""
from app.models.answer_sheet import AnswerSheet, AnswerSheetBatch


def _tag(roll: int, subject_code: str) -> str:
    """Generate answer sheet ID in the format {roll}-{subject_code}."""
    return f"{roll}-{subject_code}"


def test_tag_format():
    tag = _tag(400, "SCI")
    assert tag == "400-SCI"


def test_tag_numeric_subject_code():
    tag = _tag(101, "101")
    assert tag == "101-101"


def test_answer_sheet_model():
    sheet = AnswerSheet(id="400-SCI", subject="SCI", student_class="101")
    assert sheet.id == "400-SCI"
    assert sheet.subject == "SCI"


def test_answer_sheet_batch_model():
    batch = AnswerSheetBatch(id="BATCH-T101", sheets=100, teacher_id="T-101")
    assert batch.sheets == 100
    assert batch.teacher_id == "T-101"


def test_tag_uniqueness():
    """Different roll numbers or subjects must produce different tags."""
    assert _tag(400, "SCI") != _tag(401, "SCI")
    assert _tag(400, "SCI") != _tag(400, "MTH")


def test_roll_range():
    """Tags for a range of rolls should all be unique."""
    tags = [_tag(i, "SCI") for i in range(1, 101)]
    assert len(set(tags)) == 100
