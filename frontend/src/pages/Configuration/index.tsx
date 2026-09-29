import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSampleConfig, createSimulation, startSimulation, BackendSimConfig } from '../../services/api';

export default function Configuration() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<BackendSimConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [json, setJson] = useState('');

  const loadSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSampleConfig();
      setConfig(data);
      setJson(JSON.stringify(data, null, 2));
    } catch (e) {
      setError('Failed to load sample config. Is the backend running on port 8000?');
    }
    setLoading(false);
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(json);
      setConfig(parsed);
      setError(null);
    } catch {
      setError('Invalid JSON');
    }
  };

  const runSim = async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    try {
      const { simulation_id } = await createSimulation(config);
      await startSimulation(simulation_id);
      navigate(`/simulation/${simulation_id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      // axios error body
      const axiosErr = e as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail ?? msg);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Exam Simulation — Configuration</h1>
      <p className="text-gray-500 mb-6">
        Load the default sample scenario or paste/edit JSON config, then click <strong>Run Simulation</strong>.
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <button
          onClick={loadSample}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load Sample Config'}
        </button>
        <button
          onClick={runSim}
          disabled={!config || loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          ▶ Run Simulation
        </button>
      </div>

      {/* Config summary */}
      {config && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Classrooms', value: config.classrooms.length },
            { label: 'Teachers', value: config.teachers.length },
            { label: 'Stairs', value: config.stairs.length },
            { label: 'Checking Desks', value: config.checking.desks },
            { label: 'Total Students', value: config.classrooms.reduce((s, c) => s + c.students, 0) },
            { label: 'Movements', value: config.movements.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white p-3 rounded shadow text-center">
              <div className="text-2xl font-bold text-blue-600">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Classroom breakdown */}
      {config && (
        <div className="mb-6 bg-white rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Classroom</th>
                <th className="px-4 py-2 text-left">Floor</th>
                <th className="px-4 py-2 text-left">Capacity</th>
                <th className="px-4 py-2 text-left">Students</th>
              </tr>
            </thead>
            <tbody>
              {config.classrooms.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2 font-mono">{c.id}</td>
                  <td className="px-4 py-2">{c.floor}</td>
                  <td className="px-4 py-2">{c.capacity}</td>
                  <td className="px-4 py-2">{c.students}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* JSON editor */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-gray-700">Config JSON (editable)</h2>
          <button
            onClick={applyJson}
            className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Apply JSON
          </button>
        </div>
        <textarea
          className="w-full h-72 p-2 border font-mono text-xs rounded resize-y"
          value={json}
          onChange={e => setJson(e.target.value)}
          placeholder='Click "Load Sample Config" or paste your config JSON here'
          spellCheck={false}
        />
      </div>
    </div>
  );
}
