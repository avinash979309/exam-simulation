
export function CongestionBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    FULL: 'bg-red-100 text-red-800',
  };
  
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors[level] ?? 'bg-gray-100 text-gray-800'}`}>
      {level}
    </span>
  );
}