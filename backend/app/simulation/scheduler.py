from typing import List, Dict
from app.models.config import SchedulingConfig
from app.models.pathway import Pathway

class BatchScheduler:
    @staticmethod
    def compute_batches(group_count: int, path_edges: List[Pathway], config: SchedulingConfig) -> List[Dict[str, float]]:
        if not path_edges:
            bottleneck_capacity = 200
        else:
            bottleneck_capacity = min(e.capacity for e in path_edges)
        
        sub_batch_size = max(1, bottleneck_capacity // 3)
        releases = []
        remaining = group_count
        t = 0.0
        while remaining > 0:
            size = min(sub_batch_size, remaining)
            releases.append({'t': t, 'count': size})
            remaining -= size
            t += config.sub_batch_interval_seconds
        return releases
