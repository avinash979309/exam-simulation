from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.simulation import router as sim_router
from app.api.configuration import router as config_router
from app.api.results import router as results_router

app = FastAPI(title="MorphleLabs Simulation Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sim_router)
app.include_router(config_router)
app.include_router(results_router)
