import { useParams, useNavigate } from 'react-router-dom';
import { useSimulation } from '../../hooks/useSimulation';
import Timeline from '../../components/Timeline';
import BuildingMap from '../../components/BuildingMap';
import Dashboard from '../../components/Dashboard';
import EventLog from '../../components/EventLog';

export default function Simulation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sim = useSimulation(id ?? null);

  if (sim.error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 text-xl mb-4">{sim.error}</div>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 text-white rounded">
          ← Back to Config
        </button>
      </div>
    );
  }

  if (!sim.state) {
    return <div className="p-8 text-center text-gray-500">Connecting to simulation…</div>;
  }

  const statusColor: Record<string, string> = {
    RUNNING: 'text-green-400',
    COMPLETED: 'text-blue-400',
    ERROR: 'text-red-400',
    CREATED: 'text-gray-400',
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* Top bar */}
      <div className="flex justify-between items-center bg-gray-800 text-white px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-sm">Exam Transition Simulation</h1>
          <span className={`text-xs font-mono ${statusColor[sim.state.status] ?? 'text-gray-400'}`}>
            [{sim.state.status}]
          </span>
          <span className="text-xs text-gray-400">ID: {id?.slice(0, 8)}…</span>
        </div>
        <div className="flex gap-2">
          {sim.state.status === 'COMPLETED' && (
            <button
              onClick={() => navigate(`/results/${id}`)}
              className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-xs"
            >
              View Results →
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500 text-xs"
          >
            ← Config
          </button>
        </div>
      </div>

      {/* Timeline controls */}
      <Timeline
        isPlaying={sim.isPlaying}
        setIsPlaying={sim.setIsPlaying}
        speed={sim.speed}
        setSpeed={sim.setSpeed}
        playbackTime={sim.playbackTime}
        setPlaybackTime={sim.setPlaybackTime}
        totalTime={sim.totalSimTime}
        formatTime={sim.formatTime}
        onRestart={sim.restart}
        onStop={sim.stop}
        status={sim.state.status}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <BuildingMap state={sim.state} playbackTime={sim.playbackTime} visibleEvents={sim.visibleEvents} />
        <Dashboard state={sim.state} visibleEvents={sim.visibleEvents} />
      </div>

      {/* Event log */}
      <EventLog events={sim.visibleEvents} formatTime={sim.formatTime} />
    </div>
  );
}