
export function OccupancyBar({ current, capacity }: { current: number; capacity: number }) {
  const pct = capacity > 0 ? current / capacity : 0;
  const filled = Math.round(Math.min(pct, 1) * 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  const color = pct >= 1 ? 'text-red-500' : pct >= 0.8 ? 'text-orange-500' : pct >= 0.5 ? 'text-yellow-500' : 'text-green-500';
  
  return (
    <div className="font-mono text-xs flex items-center">
      <span className={color}>{bar}</span>
      <span className="text-gray-500 ml-2 whitespace-nowrap">
        {current}/{capacity} ({(pct * 100).toFixed(0)}%)
      </span>
    </div>
  );
}