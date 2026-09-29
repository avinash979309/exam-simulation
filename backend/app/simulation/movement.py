import simpy
from app.simulation.events import EventType

def student_group_process(env, group, path, resources, events, building_graph):
    for batch in group.batch_releases:
        delay = batch['t'] - env.now if batch['t'] > env.now else 0
        if delay > 0:
            yield env.timeout(delay)
            
        events.fire(EventType.STUDENT_BATCH_RELEASE, env.now, group_id=group.id, count=batch['count'])
        
        for i, (from_node, to_node) in enumerate(zip(path, path[1:])):
            edge = resources.get_edge(from_node, to_node, building_graph)
            if not edge:
                continue
                
            if edge.type == 'STAIR':
                events.fire(EventType.STUDENT_ENTER_STAIR, env.now, group_id=group.id, stair_id=edge.id, count=batch['count'])
                with resources.stairs[edge.id].request() as req:
                    yield req
                    yield env.timeout(edge.travel_time)
                events.fire(EventType.STUDENT_EXIT_STAIR, env.now, group_id=group.id, stair_id=edge.id, count=batch['count'])
            else:
                events.fire(EventType.STUDENT_ENTER_PATH, env.now, group_id=group.id, path_id=edge.id, count=batch['count'])
                with resources.corridors[edge.id].request() as req:
                    yield req
                    yield env.timeout(edge.travel_time)
        
        if group.destination_class in resources.classrooms:
            dest_resource = resources.classrooms[group.destination_class]
            # Create a separate process for each student to hold capacity
            for _ in range(int(batch['count'])):
                env.process(hold_classroom(env, dest_resource))
            events.fire(EventType.STUDENT_ENTER_CLASS, env.now, group_id=group.id, classroom_id=group.destination_class, count=batch['count'])

def hold_classroom(env, resource):
    req = resource.request()
    yield req
    # Hold forever
    yield env.timeout(float('inf'))

def teacher_process(env, teacher, path, resources, events, building_graph, checking_time):
    yield env.timeout(teacher.collection_delay)
    events.fire(EventType.TEACHER_COLLECT_SHEETS, env.now, teacher_id=teacher.id, count=teacher.sheet_count)
    events.fire(EventType.TEACHER_RELEASE, env.now, teacher_id=teacher.id)
    
    for from_node, to_node in zip(path, path[1:]):
        edge = resources.get_edge(from_node, to_node, building_graph)
        if not edge:
            continue
            
        if edge.type == 'STAIR':
            events.fire(EventType.TEACHER_ENTER_STAIR, env.now, teacher_id=teacher.id, stair_id=edge.id)
            with resources.stairs[edge.id].request() as req:
                yield req
                yield env.timeout(edge.travel_time)
            events.fire(EventType.TEACHER_EXIT_STAIR, env.now, teacher_id=teacher.id, stair_id=edge.id)
        else:
            with resources.corridors[edge.id].request() as req:
                yield req
                yield env.timeout(edge.travel_time)
                
    events.fire(EventType.TEACHER_REACH_CHECKING_ROOM, env.now, teacher_id=teacher.id)
    events.fire(EventType.ANSWER_SHEET_QUEUE, env.now, teacher_id=teacher.id, count=teacher.sheet_count)
    
    with resources.checking_room.request() as req:
        yield req
        events.fire(EventType.CHECKING_DESK_ASSIGNMENT, env.now, teacher_id=teacher.id)
        yield env.timeout(checking_time * teacher.sheet_count)
        events.fire(EventType.CHECKING_COMPLETE, env.now, teacher_id=teacher.id, count=teacher.sheet_count)
