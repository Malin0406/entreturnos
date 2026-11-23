import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { AgendaPage } from './pages/AgendaPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PlannerPage } from './pages/PlannerPage';
import { PomodoroPage } from './pages/PomodoroPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TasksPage } from './pages/TasksPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/compromissos" element={<AppointmentsPage />} />
        <Route path="/tarefas" element={<TasksPage />} />
        <Route path="/planejamento" element={<PlannerPage />} />
        <Route path="/pomodoro" element={<PomodoroPage />} />
        <Route path="/relatorios" element={<ReportsPage />} />
        <Route path="/notificacoes" element={<NotificationsPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
