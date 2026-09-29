import networkx as nx
from typing import List
from app.models.config import SimulationConfig
from app.models.pathway import Pathway

class BuildingGraph:
    def __init__(self, config: SimulationConfig):
        self.config = config
        self.graph = nx.DiGraph()
        self.edges: List[Pathway] = []
        self._build()
        
    def _build(self):
        # Auto-generate corridors per floor based on classrooms and stairs
        floors = set()
        for c in self.config.classrooms:
            floors.add(c.floor)
        for s in self.config.stairs:
            for f in s.floors:
                floors.add(f)
                
        for f in floors:
            self.graph.add_node(f"Corridor-F{f}", type="CORRIDOR")
            
        for c in self.config.classrooms:
            self.graph.add_node(c.id, type="CLASSROOM")
            corridor = f"Corridor-F{c.floor}"
            # Both ways
            self._add_edge(c.id, corridor, 200, 10, "CORRIDOR", f"{c.id}-{corridor}")
            self._add_edge(corridor, c.id, 200, 10, "CORRIDOR", f"{corridor}-{c.id}")
            
        for s in self.config.stairs:
            sorted_f = sorted(s.floors)
            for i in range(len(sorted_f) - 1):
                c1 = f"Corridor-F{sorted_f[i]}"
                c2 = f"Corridor-F{sorted_f[i+1]}"
                self._add_edge(c1, c2, s.capacity, s.travel_time, "STAIR", s.id)
                self._add_edge(c2, c1, s.capacity, s.travel_time, "STAIR", s.id)
                
        self.graph.add_node("CHECKING-ROOM", type="CHECKING_ROOM")
        if 1 in floors:
            self._add_edge("Corridor-F1", "CHECKING-ROOM", 200, 10, "CORRIDOR", "Corridor-F1-CHECKING")
            
    def _add_edge(self, source, target, capacity, travel_time, edge_type, edge_id):
        self.graph.add_edge(source, target, id=edge_id, travel_time=travel_time, capacity=capacity, type=edge_type)
        self.edges.append(Pathway(id=edge_id, source=source, target=target, capacity=capacity, travel_time=travel_time, type=edge_type))
        
    def get_shortest_path(self, source, target):
        try:
            return nx.shortest_path(self.graph, source=source, target=target, weight='travel_time')
        except nx.NetworkXNoPath:
            return []
            
    def get_edge_info(self, source, target):
        if self.graph.has_edge(source, target):
            data = self.graph.get_edge_data(source, target)
            return Pathway(id=data['id'], source=source, target=target, capacity=data['capacity'], travel_time=data['travel_time'], type=data['type'])
        return None
