// Tipos compartilhados — espelham as respostas da API do EntreTurnos.

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type CommuteMode = 'WALK' | 'BUS' | 'SUBWAY' | 'CAR' | 'BIKE' | 'RIDE_APP' | 'OTHER';
export type CommutePosition = 'BEFORE' | 'AFTER';
export type PomodoroType = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
export type NotificationType =
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'APPOINTMENT_SOON'
  | 'SUGGESTION_AVAILABLE'
  | 'SYSTEM';
export type SuggestionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type CalendarEventKind = 'APPOINTMENT' | 'RECURRING' | 'COMMUTE';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  categoryId: string;
  category: Category;
  title: string;
  description: string | null;
  dueDate: string | null;
  estimatedMinutes: number;
  priority: Priority;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description: string | null;
  categoryId: string;
  dueDate: string | null;
  estimatedMinutes: number;
  priority: Priority;
  status: TaskStatus;
}

export interface Commute {
  id: string;
  origin: string;
  destination: string;
  durationMinutes: number;
  mode: CommuteMode;
  position: CommutePosition;
  startAt: string | null;
  appointmentId: string | null;
  recurringAppointmentId: string | null;
  appointment?: { id: string; title: string; startAt: string; endAt: string } | null;
  recurringAppointment?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    weekdays: number[];
  } | null;
}

export interface CommuteInput {
  origin: string;
  destination: string;
  durationMinutes: number;
  mode: CommuteMode;
  position: CommutePosition;
  startAt: string | null;
  appointmentId: string | null;
  recurringAppointmentId: string | null;
  force?: boolean;
}

export interface Appointment {
  id: string;
  categoryId: string;
  category: Category;
  taskId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  commutes: Commute[];
}

export interface AppointmentInput {
  title: string;
  description: string | null;
  location: string | null;
  categoryId: string;
  startAt: string;
  endAt: string;
  force?: boolean;
}

export interface RecurringAppointment {
  id: string;
  categoryId: string;
  category: Category;
  title: string;
  description: string | null;
  location: string | null;
  weekdays: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string | null;
  commutes: Commute[];
}

export interface RecurringInput {
  title: string;
  description: string | null;
  location: string | null;
  categoryId: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string | null;
  force?: boolean;
}

export interface CalendarEvent {
  id: string;
  sourceId: string;
  kind: CalendarEventKind;
  title: string;
  start: string;
  end: string;
  description: string | null;
  location: string | null;
  category: Category | null;
  taskId: string | null;
  commute?: { origin: string; destination: string; mode: CommuteMode; durationMinutes: number };
}

export interface ConflictItem {
  title: string;
  kind: CalendarEventKind;
  start: string;
  end: string;
  label: string;
}

export interface FreeSlot {
  start: string;
  end: string;
  dateKey: string;
  minutes: number;
}

export interface SlotSummary {
  count: number;
  totalMinutes: number;
}

export interface FreeSlotsReport extends SlotSummary {
  start: string;
  days: number;
  byDay: Array<SlotSummary & { dateKey: string; slots: FreeSlot[] }>;
  busyCount: number;
}

export interface Suggestion {
  id: string;
  taskId: string;
  task: Task;
  startAt: string;
  endAt: string;
  score: number;
  reason: string;
  status: SuggestionStatus;
  appointmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionList {
  pending: Suggestion[];
  history: Suggestion[];
}

export interface PomodoroSession {
  id: string;
  taskId: string | null;
  task: { id: string; title: string } | null;
  type: PomodoroType;
  durationMinutes: number;
  startedAt: string;
  endedAt: string;
  completed: boolean;
}

export interface PomodoroInput {
  taskId: string | null;
  type: PomodoroType;
  durationMinutes: number;
  startedAt: string;
  endedAt: string;
  completed: boolean;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unread: number;
}

export interface Preferences {
  availabilityStart: string;
  availabilityEnd: string;
  availableWeekdays: number[];
  breakMinutes: number;
  minSlotMinutes: number;
  maxTaskBlockMinutes: number;
  planningHorizonDays: number;
  pomodoroFocusMinutes: number;
  pomodoroShortBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  pomodoroCyclesBeforeLong: number;
  notifyTaskDeadlines: boolean;
  notifyAppointments: boolean;
  notifySuggestions: boolean;
  deadlineAlertHours: number;
  appointmentAlertMinutes: number;
}

export interface Dashboard {
  counts: {
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    completedThisWeek: number;
  };
  todayEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  priorityTasks: Array<Task & { score: number }>;
  studyMinutesWeek: number;
  freeTime: { today: SlotSummary; week: SlotSummary; todaySlots: FreeSlot[] };
  weeklyProgress: number;
  weeklyChart: Array<{ dateKey: string; completed: number; focusMinutes: number }>;
  focusMinutesWeek: number;
  pendingSuggestions: number;
  unreadNotifications: number;
  eventDays: string[];
}

export interface WeeklyReport {
  weekStart: string;
  label: string;
  completedTasks: number;
  dueTasks: number;
  focusSessions: number;
  focusMinutes: number;
  studyMinutes: number;
  workMinutes: number;
  completionRate: number;
}

export interface ReportSummary {
  period: { start: string; end: string; weeks: number };
  totals: {
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    completedInPeriod: number;
    focusSessions: number;
    focusMinutes: number;
    studyMinutes: number;
    workMinutes: number;
    commuteMinutes: number;
  };
  weekly: WeeklyReport[];
  categoryDistribution: Array<{ slug: string; name: string; color: string; minutes: number; tasks: number }>;
}
