from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_integration():
    resp = client.get("/api/simulation/sample")
    assert resp.status_code == 200
    config = resp.json()
    
    resp2 = client.post("/api/simulation/create", json=config)
    assert resp2.status_code == 200
    sim_id = resp2.json()["simulation_id"]
    
    resp3 = client.post(f"/api/simulation/{sim_id}/start")
    assert resp3.status_code == 200
    
    # Check state
    resp4 = client.get(f"/api/simulation/{sim_id}/state")
    assert resp4.status_code == 200
