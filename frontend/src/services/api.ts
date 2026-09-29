import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000/api' });

// --- raw backend types (match Python models exactly) ---

export interface BackendSimConfig {
  classrooms: { id: string; floor: number; capacity: number; students: number }[];
  stairs: { id: string; floors: number[]; capacity: number; travel_time: number }[];
  movements: { source_class: string; destination_class: string; students: number; subject: string }[];
  subjects: { code: string; name: string }[];
  teachers: { id: string; classroom_id: string }[];
  checking: { desks: number; time_per_sheet: number };
  scheduling: {
    batch_window_minutes: number;
    sub_batch_interval_seconds: number;
    teacher_collection_delay_seconds: number;
  };
}

export interface BackendEvent {
  time: number;
  type: string;
  data: Record<string, unknown>;
}

export interface BackendState {
  status: string;
  current_time: number;
  events: BackendEvent[];
  stairs?: { id: string; capacity: number; current_occupancy: number; queue_size: number; utilization: number; level: string }[];
  classrooms?: { id: string; floor: number; capacity: number; occupancy: number; utilization: number; level: string }[];
  checking_room?: { desks_total: number; desks_occupied: number; queue_size: number; sheets_processed: number; total_sheets: number };
  config?: BackendSimConfig;
}

export interface BackendResults {
  total_time: number;
  total_students: number;
  students_arrived: number;
  students_releasing: number;
  avg_travel_time: number;
  max_travel_time: number;
  total_teachers: number;
  teachers_done: number;
  avg_teacher_check_start: number;
  stair_stats: Record<string, { id: string; total_entries: number; peak_occupancy: number; times_at_capacity: number; utilization_pct: number }>;
  desks_total: number;
  total_sheets: number;
  sheets_processed: number;
  peak_check_queue: number;
  avg_check_wait_time: number;
  completion_time: number;
  bottlenecks: { id: string; type: string; description: string; peak_utilization: number; peak_queue: number; severity: string }[];
}

// --- API calls ---

export const getSampleConfig = async (): Promise<BackendSimConfig> => {
  const res = await api.get<BackendSimConfig>('/simulation/sample');
  return res.data;
};

export const createSimulation = async (config: BackendSimConfig): Promise<{ simulation_id: string; status: string }> => {
  const res = await api.post<{ simulation_id: string; status: string }>('/simulation/create', config);
  return res.data;
};

export const startSimulation = async (simId: string): Promise<void> => {
  await api.post(`/simulation/${simId}/start`);
};

export const getSimulationState = async (simId: string): Promise<BackendState> => {
  const res = await api.get<BackendState>(`/simulation/${simId}/state`);
  return res.data;
};

export const getSimulationEvents = async (simId: string): Promise<{ events: BackendEvent[] }> => {
  const res = await api.get<{ events: BackendEvent[] }>(`/simulation/${simId}/events`);
  return res.data;
};

export const getSimulationResults = async (simId: string): Promise<BackendResults> => {
  const res = await api.get<BackendResults>(`/simulation/${simId}/results`);
  return res.data;
};

export const stopSimulation = async (simId: string): Promise<void> => {
  await api.post(`/simulation/${simId}/stop`);
};

export const compareSimulations = async (simIdA: string, simIdB: string): Promise<{ a: BackendResults; b: BackendResults }> => {
  const res = await api.post<{ a: BackendResults; b: BackendResults }>('/simulation/compare', {
    sim_id_a: simIdA,
    sim_id_b: simIdB,
  });
  return res.data;
};
