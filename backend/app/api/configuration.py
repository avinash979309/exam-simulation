from fastapi import APIRouter
from app.services.sample_scenario import get_sample_scenario

router = APIRouter(prefix="/api/config", tags=["config"])

@router.get("/sample")
def sample_config():
    return get_sample_scenario().model_dump()
