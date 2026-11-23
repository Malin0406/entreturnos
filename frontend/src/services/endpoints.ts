// Funções de acesso a cada recurso da API.
import type {
  Appointment,
  AppointmentInput,
  AuthResponse,
  CalendarEvent,
  Category,
  Commute,
  CommuteInput,
  Dashboard,
  FreeSlotsReport,
  NotificationList,
  PomodoroInput,
  PomodoroSession,
  Preferences,
  Priority,
  RecurringAppointment,
  RecurringInput,
  ReportSummary,
  Suggestion,
  SuggestionList,
  Task,
  TaskInput,
  TaskStatus,
  User,
} from '../types';
import { request } from './api';

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  register: (data: { name: string; email: string; password: string; confirmPassword: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: data }),
  me: () => request<{ user: User }>('/auth/me'),
  forgotPassword: (email: string) =>
    request<{ message: string; resetToken: string | null }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  resetPassword: (data: { token: string; password: string; confirmPassword: string }) =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: data }),
};

export const userApi = {
  updateProfile: (data: { name: string; email: string }) =>
    request<{ user: User }>('/users/me', { method: 'PUT', body: data }),
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    request<{ message: string }>('/users/me/password', { method: 'PUT', body: data }),
  deleteAccount: () => request<void>('/users/me', { method: 'DELETE' }),
  getPreferences: () => request<Preferences>('/preferences'),
  updatePreferences: (data: Partial<Preferences>) =>
    request<Preferences>('/preferences', { method: 'PUT', body: data }),
  categories: () => request<Category[]>('/categories'),
};

export interface TaskFilters {
  status?: TaskStatus | '';
  priority?: Priority | '';
  categoryId?: string;
  search?: string;
  sort?: 'dueDate' | 'createdAt' | 'priority';
  order?: 'asc' | 'desc';
}

export const taskApi = {
  list: (filters: TaskFilters = {}) => request<Task[]>('/tasks', { query: { ...filters } }),
  create: (data: TaskInput) => request<Task>('/tasks', { method: 'POST', body: data }),
  update: (id: string, data: Partial<TaskInput>) => request<Task>(`/tasks/${id}`, { method: 'PUT', body: data }),
  setStatus: (id: string, status: TaskStatus) =>
    request<Task>(`/tasks/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};

export const calendarApi = {
  events: (start: string, end: string) => request<CalendarEvent[]>('/calendar/events', { query: { start, end } }),
};

export const appointmentApi = {
  list: (start?: string, end?: string) => request<Appointment[]>('/appointments', { query: { start, end } }),
  get: (id: string) => request<Appointment>(`/appointments/${id}`),
  create: (data: AppointmentInput) => request<Appointment>('/appointments', { method: 'POST', body: data }),
  update: (id: string, data: AppointmentInput) =>
    request<Appointment>(`/appointments/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => request<void>(`/appointments/${id}`, { method: 'DELETE' }),
};

export const recurringApi = {
  list: () => request<RecurringAppointment[]>('/recurring-appointments'),
  get: (id: string) => request<RecurringAppointment>(`/recurring-appointments/${id}`),
  create: (data: RecurringInput) =>
    request<RecurringAppointment>('/recurring-appointments', { method: 'POST', body: data }),
  update: (id: string, data: RecurringInput) =>
    request<RecurringAppointment>(`/recurring-appointments/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => request<void>(`/recurring-appointments/${id}`, { method: 'DELETE' }),
};

export const commuteApi = {
  list: () => request<Commute[]>('/commutes'),
  get: (id: string) => request<Commute>(`/commutes/${id}`),
  create: (data: CommuteInput) => request<Commute>('/commutes', { method: 'POST', body: data }),
  update: (id: string, data: CommuteInput) => request<Commute>(`/commutes/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => request<void>(`/commutes/${id}`, { method: 'DELETE' }),
};

export const planningApi = {
  freeSlots: (days?: number) => request<FreeSlotsReport>('/planning/free-slots', { query: { days } }),
  suggestions: () => request<SuggestionList>('/planning/suggestions'),
  generate: () => request<SuggestionList>('/planning/suggestions/generate', { method: 'POST' }),
  accept: (id: string) => request<Suggestion>(`/planning/suggestions/${id}/accept`, { method: 'POST' }),
  reject: (id: string) => request<Suggestion>(`/planning/suggestions/${id}/reject`, { method: 'POST' }),
};

export const pomodoroApi = {
  list: (limit = 20) => request<PomodoroSession[]>('/pomodoro-sessions', { query: { limit } }),
  today: () => request<{ focusSessions: number; focusMinutes: number }>('/pomodoro-sessions/today'),
  create: (data: PomodoroInput) => request<PomodoroSession>('/pomodoro-sessions', { method: 'POST', body: data }),
};

export const notificationApi = {
  list: () => request<NotificationList>('/notifications'),
  markRead: (id: string) => request<unknown>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request<{ updated: number }>('/notifications/read-all', { method: 'PATCH' }),
  remove: (id: string) => request<void>(`/notifications/${id}`, { method: 'DELETE' }),
};

export const reportApi = {
  summary: (weeks: number) => request<ReportSummary>('/reports/summary', { query: { weeks } }),
};

export const dashboardApi = {
  overview: () => request<Dashboard>('/dashboard'),
};
