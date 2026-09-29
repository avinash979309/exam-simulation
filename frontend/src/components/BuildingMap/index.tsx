import { useMemo } from 'react';
import { BackendState, BackendEvent } from '../../services/api';

interface BuildingMapProps {
  state: BackendState;
  playbackTime: number;
  visibleEvents: BackendEvent[];
}

export default function BuildingMap({ state, visibleEvents }: BuildingMapProps) {
  const config = state.config;

  const layout = useMemo(() => {
    if (!config) return null;

    // Determine floors
    const floors = Array.from(new Set(config.classrooms.map(c => c.floor))).sort((a, b) => b - a);
    
    const floorY = (floor: number) => {
      const idx = floors.indexOf(floor);
      return 100 + idx * 150;
    };

    const classroomNodes = config.classrooms.map((c) => {
      const floorClassrooms = config.classrooms.filter(cls => cls.floor === c.floor);
      const idxInFloor = floorClassrooms.findIndex(cls => cls.id === c.id);
      const totalInFloor = floorClassrooms.length;
      
      const xOffset = 100 + (700 / (totalInFloor + 1)) * (idxInFloor + 1);
      return {
        ...c,
        x: xOffset - 40,
        y: floorY(c.floor) - 30,
        w: 80,
        h: 60
      };
    });

    const stairNodes = config.stairs.map((s, i) => {
      const xOffset = 150 + (i * 200); // spread stairs horizontally
      const topFloor = Math.max(...s.floors);
      const bottomFloor = Math.min(...s.floors);
      return {
        ...s,
        x: xOffset - 25,
        y: floorY(topFloor) + 10,
        w: 50,
        h: (floorY(bottomFloor) - floorY(topFloor)) + 40
      };
    });

    const checkingRoomNode = {
      x: 400 - 60,
      y: 500,
      w: 120,
      h: 70
    };

    return { floors, floorY, classroomNodes, stairNodes, checkingRoomNode };
  }, [config]);

  if (!layout || !config) {
    return <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-100">Waiting for layout data...</div>;
  }

  // Live data helpers
  const getClassroom = (id: string) => state.classrooms?.find(c => c.id === id);
  const getStair = (id: string) => state.stairs?.find(s => s.id === id);

  const getClassroomColor = (id: string) => {
    const cr = getClassroom(id);
    if (!cr) return { fill: '#1e3a5f', stroke: '#60a5fa' };
    const pct = cr.capacity > 0 ? cr.occupancy / cr.capacity : 0;
    if (pct >= 1) return { fill: '#450a0a', stroke: '#ef4444' }; // full
    if (pct >= 0.8) return { fill: '#422006', stroke: '#f59e0b' }; // high
    return { fill: '#1e3a5f', stroke: '#60a5fa' }; // normal
  };

  const getStairColor = (id: string) => {
    const s = getStair(id);
    if (!s) return 'stroke-gray-400 fill-gray-200';
    if (s.level === 'FULL') return 'stroke-red-500 fill-red-100 text-red-800';
    if (s.level === 'HIGH') return 'stroke-orange-500 fill-orange-100 text-orange-800';
    if (s.level === 'MEDIUM') return 'stroke-yellow-500 fill-yellow-100 text-yellow-800';
    return 'stroke-green-500 fill-green-100 text-green-800';
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col">
      <svg className="w-full h-full" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid meet">
        {/* Corridors (Floors) */}
        {layout.floors.map(f => (
          <g key={`floor-${f}`}>
            <line 
              x1="50" y1={layout.floorY(f)} 
              x2="850" y2={layout.floorY(f)} 
              stroke="#cbd5e1" strokeWidth="12" strokeLinecap="round" 
            />
            <text x="50" y={layout.floorY(f) - 15} fontSize="12" fill="#64748b" fontWeight="bold">Floor {f}</text>
          </g>
        ))}

        {/* Stairs */}
        {layout.stairNodes.map(s => {
          const colorClass = getStairColor(s.id);
          const liveStair = getStair(s.id);
          return (
            <g key={s.id}>
              <rect 
                x={s.x} y={s.y} width={s.w} height={s.h} 
                className={`${colorClass} stroke-2 transition-colors duration-500`} 
                rx="4"
              />
              <text x={s.x + s.w / 2} y={s.y + 15} textAnchor="middle" fontSize="10" fontWeight="bold">{s.id}</text>
              <text x={s.x + s.w / 2} y={s.y + 30} textAnchor="middle" fontSize="10">
                {liveStair ? `${liveStair.current_occupancy}/${liveStair.capacity}` : '0/0'}
              </text>
            </g>
          );
        })}

        {/* Classrooms */}
        {layout.classroomNodes.map(c => {
          const colors = getClassroomColor(c.id);
          const liveC = getClassroom(c.id);
          return (
            <g key={c.id}>
              {/* Connector to corridor */}
              <line x1={c.x + c.w / 2} y1={c.y + c.h} x2={c.x + c.w / 2} y2={layout.floorY(c.floor)} stroke="#94a3b8" strokeWidth="4" />
              
              <rect 
                x={c.x} y={c.y} width={c.w} height={c.h} 
                fill={colors.fill} stroke={colors.stroke} strokeWidth="3" rx="6"
                className="transition-colors duration-500"
              />
              <text x={c.x + c.w / 2} y={c.y + 25} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">Class {c.id}</text>
              <text x={c.x + c.w / 2} y={c.y + 40} textAnchor="middle" fill="#93c5fd" fontSize="10">
                {liveC ? `${liveC.occupancy}/${liveC.capacity}` : '0/0'}
              </text>
            </g>
          );
        })}

        {/* Checking Room */}
        <g>
          <line x1={400} y1={450} x2={400} y2={500} stroke="#94a3b8" strokeWidth="4" />
          <rect 
            x={layout.checkingRoomNode.x} y={layout.checkingRoomNode.y} 
            width={layout.checkingRoomNode.w} height={layout.checkingRoomNode.h} 
            fill="#3f6212" stroke="#a3e635" strokeWidth="3" rx="6"
          />
          <text x={layout.checkingRoomNode.x + layout.checkingRoomNode.w / 2} y={layout.checkingRoomNode.y + 20} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">Checking Room</text>
          <text x={layout.checkingRoomNode.x + layout.checkingRoomNode.w / 2} y={layout.checkingRoomNode.y + 35} textAnchor="middle" fill="#d9f99d" fontSize="10">
            Desks: {state.checking_room?.desks_occupied ?? 0}/{state.checking_room?.desks_total ?? 0}
          </text>
          <text x={layout.checkingRoomNode.x + layout.checkingRoomNode.w / 2} y={layout.checkingRoomNode.y + 50} textAnchor="middle" fill="#d9f99d" fontSize="10">
            Queue: {state.checking_room?.queue_size ?? 0}
          </text>
        </g>
        
        {/* Animated Moving Entities (visual indication based on visible events) */}
        {/* A simple visual feedback: recent events blink dots near classrooms/stairs */}
        {visibleEvents.filter(ev => ev.type.startsWith('STUDENT_') || ev.type.startsWith('TEACHER_')).slice(-10).map((ev, i) => {
          let cx = 0, cy = 0;
          let color = ev.type.startsWith('STUDENT_') ? '#60a5fa' : '#facc15';
          let show = false;

          // Just scatter them along the top corridor as a simplified simulation placeholder
          // A full pathing system would be too complex, we just place a blip indicating activity.
          if (ev.type === 'STUDENT_ENTER_CLASS' || ev.type === 'STUDENT_BATCH_RELEASE') {
            const cId = ev.data.class_id || ev.data.source_class;
            const cNode = layout.classroomNodes.find(n => n.id === cId);
            if (cNode) {
              cx = cNode.x + cNode.w / 2 + (Math.random() * 20 - 10);
              cy = cNode.y + cNode.h + 10;
              show = true;
            }
          }
          if (ev.type === 'STUDENT_ENTER_STAIR' || ev.type === 'TEACHER_ENTER_STAIR') {
            const sId = ev.data.stair_id;
            const sNode = layout.stairNodes.find(n => n.id === sId);
            if (sNode) {
              cx = sNode.x + sNode.w / 2 + (Math.random() * 10 - 5);
              cy = sNode.y + 20;
              show = true;
            }
          }

          if (!show) return null;

          return (
            <circle key={`dot-${ev.time}-${i}`} cx={cx} cy={cy} r="4" fill={color}>
              <animate attributeName="opacity" values="1;0" dur="1s" repeatCount="1" fill="freeze" />
              <animate attributeName="cy" by="10" dur="1s" repeatCount="1" fill="freeze" />
            </circle>
          );
        })}

      </svg>
    </div>
  );
}