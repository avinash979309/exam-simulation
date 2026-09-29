import { BackendState, BackendEvent } from '../../services/api';
import { OccupancyBar } from '../common/OccupancyBar';
import { CongestionBadge } from '../common/CongestionBadge';

interface DashboardProps {
  state: BackendState;
  visibleEvents: BackendEvent[];
}

export default function Dashboard({ state, visibleEvents }: DashboardProps) {
  let studentsReleased = 0;
  let studentsArrived = 0;
  let teachersAtChecking = 0;
  let checkingComplete = 0;

  for (const ev of visibleEvents) {
    if (ev.type === 'STUDENT_BATCH_RELEASE' && typeof ev.data.count === 'number') {
      studentsReleased += ev.data.count;
    }
    if (ev.type === 'STUDENT_ENTER_CLASS' && typeof ev.data.count === 'number') {
      studentsArrived += ev.data.count;
    }
    if (ev.type === 'TEACHER_REACH_CHECKING_ROOM') {
      teachersAtChecking += 1;
    }
    if (ev.type === 'CHECKING_COMPLETE') {
      checkingComplete += 1;
    }
  }

  const studentsMoving = studentsReleased - studentsArrived;

  return (
    <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto flex flex-col h-full shadow-lg">
      <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-lg">
        Live Dashboard
      </div>

      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-600 mb-2 uppercase">Students</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Released: <span className="font-mono font-bold">{studentsReleased}</span></div>
          <div>Arrived: <span className="font-mono font-bold">{studentsArrived}</span></div>
          <div className="col-span-2">Moving: <span className="font-mono font-bold">{studentsMoving}</span></div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-600 mb-2 uppercase">Teachers</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>At Checking: <span className="font-mono font-bold">{teachersAtChecking}</span></div>
          <div>Done: <span className="font-mono font-bold">{checkingComplete}</span></div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-600 mb-2 uppercase">Checking Room</h3>
        {state.checking_room ? (
          <div className="text-sm space-y-1">
            <div>Desks: <span className="font-mono">{state.checking_room.desks_occupied}/{state.checking_room.desks_total}</span></div>
            <div>Queue: <span className="font-mono">{state.checking_room.queue_size} batches</span></div>
            <div>Processed: <span className="font-mono">{state.checking_room.sheets_processed}/{state.checking_room.total_sheets}</span></div>
          </div>
        ) : (
          <div className="text-xs text-gray-400">Waiting for data...</div>
        )}
      </div>

      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-600 mb-2 uppercase">Stairs</h3>
        {state.stairs && state.stairs.length > 0 ? (
          <div className="space-y-3">
            {state.stairs.map(stair => (
              <div key={stair.id} className="border border-gray-100 p-2 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm">{stair.id}</span>
                  <CongestionBadge level={stair.level} />
                </div>
                <OccupancyBar current={stair.current_occupancy} capacity={stair.capacity} />
                <div className="text-xs text-gray-500 mt-1">Queue: {stair.queue_size}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400">Waiting for data...</div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-600 mb-2 uppercase">Classrooms</h3>
        {state.classrooms && state.classrooms.length > 0 ? (
          <div className="space-y-2">
            {state.classrooms.map(room => (
              <div key={room.id} className="flex flex-col text-sm border-b border-gray-50 pb-1">
                <div className="flex justify-between">
                  <span className="font-bold">{room.id} <span className="text-gray-400 font-normal">(F{room.floor})</span></span>
                  <CongestionBadge level={room.level} />
                </div>
                <OccupancyBar current={room.occupancy} capacity={room.capacity} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400">Waiting for data...</div>
        )}
      </div>
    </div>
  );
}