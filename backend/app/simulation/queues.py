import simpy
from app.models.config import SimulationConfig

class QueueManager:
    def __init__(self, env: simpy.Environment, config: SimulationConfig, edges):
        self.env = env
        self.stairs = {}
        self.corridors = {}
        self.classrooms = {}
        
        for c in config.classrooms:
            self.classrooms[c.id] = simpy.Resource(env, capacity=c.capacity)
            
        for edge in edges:
            if edge.type == 'STAIR':
                if edge.id not in self.stairs:
                    self.stairs[edge.id] = simpy.Resource(env, capacity=edge.capacity)
            elif edge.type == 'CORRIDOR':
                if edge.id not in self.corridors:
                    self.corridors[edge.id] = simpy.Resource(env, capacity=edge.capacity)
                    
        self.checking_room = simpy.Resource(env, capacity=config.checking.desks)
        
    def get_edge(self, source, target, building_graph):
        return building_graph.get_edge_info(source, target)
