import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSimulationResults, compareSimulations, BackendResults } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [results, setResults] = useState<BackendResults | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // What-if
  const [compareIdA, setCompareIdA] = useState(id || '');
  const [compareIdB, setCompareIdB] = useState('');
  const [comparison, setComparison] = useState<{ a: BackendResults; b: BackendResults } | null>(null);

  useEffect(() => {
    if (id) {
      getSimulationResults(id)
        .then(res => {
          setResults(res);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError('Failed to load results');
          setLoading(false);
        });
    }
  }, [id]);

  const handleCompare = async () => {
    if (!compareIdA || !compareIdB) return;
    try {
      const res = await compareSimulations(compareIdA, compareIdB);
      setComparison(res);
    } catch (err) {
      console.error(err);
      alert('Failed to compare simulations. Make sure both IDs are valid and completed.');
    }
  };

  if (loading) return <div className="p-8">Loading results...</div>;
  if (error || !results) return <div className="p-8 text-red-500">{error}</div>;

  const stairData = Object.values(results.stair_stats);
  const checkingData = [{
    name: 'Checking Room',
    'Total Sheets': results.total_sheets,
    'Processed': results.sheets_processed,
    'Peak Queue': results.peak_check_queue
  }];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen text-gray-800">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Simulation Results: {id}</h1>
        <Link to="/" className="text-blue-500 hover:underline">← Back to Home</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Students', value: results.total_students },
          { label: 'Arrived', value: results.students_arrived },
          { label: 'Avg Travel Time', value: `${results.avg_travel_time.toFixed(1)}s` },
          { label: 'Max Travel Time', value: `${results.max_travel_time.toFixed(1)}s` },
          { label: 'Sheets Processed', value: results.sheets_processed },
          { label: 'Completion Time', value: `${results.completion_time.toFixed(1)}s` },
        ].map(m => (
          <div key={m.label} className="bg-white p-4 rounded shadow text-center">
            <div className="text-gray-500 text-sm font-bold uppercase">{m.label}</div>
            <div className="text-2xl font-mono mt-2">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Stair Peak Occupancy</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stairData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="peak_occupancy" fill="#3b82f6" name="Peak Occupancy" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Checking Room Stats</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={checkingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Total Sheets" fill="#94a3b8" />
                <Bar dataKey="Processed" fill="#22c55e" />
                <Bar dataKey="Peak Queue" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4 text-red-600">Bottlenecks</h2>
        {results.bottlenecks.length === 0 ? (
          <div className="text-gray-500">No major bottlenecks detected.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.bottlenecks.map((b, i) => (
              <div key={i} className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                <div className="font-bold text-red-700">{b.id} ({b.type}) - {b.severity}</div>
                <div className="text-sm text-red-600">{b.description}</div>
                <div className="text-xs text-red-500 mt-2 font-mono">
                  Peak Queue: {b.peak_queue} | Peak Util: {(b.peak_utilization * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Stair Statistics</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-sm uppercase">
              <th className="p-2 border-b">Stair ID</th>
              <th className="p-2 border-b">Total Entries</th>
              <th className="p-2 border-b">Peak Occupancy</th>
              <th className="p-2 border-b">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {stairData.map(s => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-bold">{s.id}</td>
                <td className="p-2 font-mono">{s.total_entries}</td>
                <td className="p-2 font-mono">{s.peak_occupancy}</td>
                <td className="p-2 font-mono">{(s.utilization_pct * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-800 text-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">What-If Comparison</h2>
        <div className="flex gap-4 mb-4">
          <input 
            className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none" 
            placeholder="Sim ID A" 
            value={compareIdA} 
            onChange={e => setCompareIdA(e.target.value)} 
          />
          <input 
            className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none" 
            placeholder="Sim ID B" 
            value={compareIdB} 
            onChange={e => setCompareIdB(e.target.value)} 
          />
          <button 
            onClick={handleCompare}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold"
          >
            Compare
          </button>
        </div>

        {comparison && (
          <table className="w-full text-left border-collapse bg-gray-900 rounded overflow-hidden">
            <thead>
              <tr className="bg-gray-700 text-sm uppercase">
                <th className="p-3">Metric</th>
                <th className="p-3 text-blue-300">Sim A ({compareIdA})</th>
                <th className="p-3 text-green-300">Sim B ({compareIdB})</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              <tr className="border-b border-gray-700">
                <td className="p-3 text-gray-400">Total Time</td>
                <td className="p-3">{comparison.a.total_time.toFixed(1)}s</td>
                <td className="p-3">{comparison.b.total_time.toFixed(1)}s</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="p-3 text-gray-400">Avg Travel Time</td>
                <td className="p-3">{comparison.a.avg_travel_time.toFixed(1)}s</td>
                <td className="p-3">{comparison.b.avg_travel_time.toFixed(1)}s</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="p-3 text-gray-400">Max Travel Time</td>
                <td className="p-3">{comparison.a.max_travel_time.toFixed(1)}s</td>
                <td className="p-3">{comparison.b.max_travel_time.toFixed(1)}s</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="p-3 text-gray-400">Bottlenecks Count</td>
                <td className="p-3">{comparison.a.bottlenecks.length}</td>
                <td className="p-3">{comparison.b.bottlenecks.length}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}