import { useEffect, useRef } from 'react';
import { BackendEvent } from '../../services/api';

interface EventLogProps {
  events: BackendEvent[];
  formatTime: (s: number) => string;
}

export default function EventLog({ events, formatTime }: EventLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  const getColor = (type: string) => {
    if (type.startsWith('STUDENT_')) return 'text-blue-400';
    if (type.startsWith('TEACHER_')) return 'text-yellow-400';
    if (type.startsWith('CHECKING_')) return 'text-green-400';
    if (type.startsWith('ANSWER_SHEET_')) return 'text-purple-400';
    return 'text-gray-400';
  };

  return (
    <div 
      ref={containerRef}
      className="bg-gray-900 border border-gray-700 rounded p-2 overflow-y-auto font-mono text-xs max-h-[140px]"
    >
      {events.map((ev, i) => (
        <div key={i} className="mb-1">
          <span className="text-gray-500 w-16 inline-block">[{formatTime(ev.time)}]</span>
          <span className={`${getColor(ev.type)} font-bold w-48 inline-block`}>{ev.type}</span>
          <span className="text-gray-300 ml-2">
            {Object.entries(ev.data).map(([k, v]) => `${k}=${v}`).join(' ')}
          </span>
        </div>
      ))}
      {events.length === 0 && <div className="text-gray-500">No events yet.</div>}
    </div>
  );
}