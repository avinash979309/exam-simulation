import threading
from typing import Dict, Any

_store = {}
_lock = threading.Lock()

def create_state(sim_id: str):
    with _lock:
        _store[sim_id] = {"status": "CREATED", "current_time": 0, "events": []}

def update_state(sim_id: str, updates: Dict[str, Any]):
    with _lock:
        if sim_id not in _store:
            _store[sim_id] = {}
        _store[sim_id].update(updates)

def get_state(sim_id: str) -> Dict[str, Any]:
    with _lock:
        return _store.get(sim_id, {})
