export type EventType =
  | 'EXAM_END'
  | 'STUDENT_BATCH_RELEASE'
  | 'STUDENT_ENTER_PATH'
  | 'STUDENT_ENTER_STAIR'
  | 'STUDENT_EXIT_STAIR'
  | 'STUDENT_ENTER_DESTINATION_QUEUE'
  | 'STUDENT_ENTER_CLASS'
  | 'STUDENT_WAIT'
  | 'TEACHER_COLLECT_SHEETS'
  | 'TEACHER_RELEASE'
  | 'TEACHER_ENTER_PATH'
  | 'TEACHER_ENTER_STAIR'
  | 'TEACHER_EXIT_STAIR'
  | 'TEACHER_REACH_CHECKING_ROOM'
  | 'ANSWER_SHEET_QUEUE'
  | 'CHECKING_DESK_ASSIGNMENT'
  | 'CHECKING_COMPLETE'
  | 'CONGESTION_DETECTED'
  | 'SIMULATION_COMPLETE';

export interface SimulationEvent {
  id: string;
  timestamp: number;
  event_type: EventType;
  entity_type: string;
  entity_id: string;
  location: string;
  destination?: string;
  metadata: Record<string, unknown>;
}

export interface StudentGroupState {
  id: string;
  source_class: string;
  destination_class: string;
  subject_id: string;
  count: number;
  state: 'WAITING' | 'IN_TRANSIT' | 'QUEUED' | 'ARRIVED';
  current_location: string;
}

export interface TeacherState {
  id: string;
  name: string;
  classroom_id: string;
  state: 'COLLECTING' | 'PACKAGING' | 'MOVING' | 'QUEUED' | 'CHECKING' | 'DONE';
  current_location: string;
  sheet_count: number;
}

export interface StairState {
  id: string;
  capacity: number;
  current_occupancy: number;
  queue_size: number;
  utilization: number;
}

export interface CheckingRoomState {
  desks_total: number;
  desks_occupied: number;
  queue_size: number;
  sheets_processed: number;
  total_sheets: number;
}

export interface CongestionInfo {
  node_id: string;
  label: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL';
  current: number;
  capacity: number;
  utilization: number;
}

export interface Bottleneck {
  id: string;
  type: string;
  description: string;
  peak_utilization: number;
  peak_queue: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface StairMetrics {
  total_passed: number;
  avg_wait_time: number;
  peak_occupancy: number;
  congestion_events: number;
}

export interface SimulationMetrics {
  total_students: number;
  students_moved: number;
  students_waiting: number;
  students_arrived: number;
  avg_travel_time: number;
  max_travel_time: number;
  avg_wait_time: number;
  max_wait_time: number;
  stair_delayed_count: number;
  capacity_delayed_count: number;
  total_teachers: number;
  teachers_moving: number;
  teachers_at_checking: number;
  avg_teacher_travel_time: number;
  stair_stats: Record<string, StairMetrics>;
  desks_total: number;
  desks_occupied: number;
  sheets_waiting: number;
  sheets_processed: number;
  peak_queue: number;
  avg_check_wait_time: number;
  completion_time: number;
  bottlenecks: Bottleneck[];
}

export interface SimulationState {
  simulation_id: string;
  status: 'CREATED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';
  current_time: number;
  total_sim_time: number;
  student_groups: StudentGroupState[];
  teachers: TeacherState[];
  stairs: StairState[];
  checking_room: CheckingRoomState;
  congestion: CongestionInfo[];
  events: SimulationEvent[];
  metrics: SimulationMetrics | null;
}

export interface ClassroomConfig { id: string; floor: number; capacity: number; students: number; label?: string; }
export interface SubjectConfig { id: string; name: string; code: string; }
export interface MovementConfig { source_class: string; destination_class: string; subject_id: string; count: number; }
export interface TeacherConfig { id: string; name: string; classroom_id: string; }
export interface StairConfig { id: string; floors: number[]; capacity: number; travel_time: number; direction: 'BOTH' | 'UP' | 'DOWN'; }
export interface CheckingRoomConfig { desks: number; checking_time: number; floor: number; }
export interface SchedulingConfig { batch_window_minutes: number; sub_batch_interval_minutes: number; teacher_collection_delay_minutes: number; queue_policy: 'FIFO'; }

export interface SimulationConfig {
  classrooms: ClassroomConfig[];
  subjects: SubjectConfig[];
  movements: MovementConfig[];
  teachers: TeacherConfig[];
  stairs: StairConfig[];
  checking_room: CheckingRoomConfig;
  scheduling: SchedulingConfig;
  exam_start_display: string;
}
