import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSocketSetup } from './hooks/useSocket';

// Auth pages
import LoginPage from './pages/auth/Login';
import RegisterPage from './pages/auth/Register';

// Layouts
import AppLayout from './components/layout/AppLayout';

// Proponent pages
import ProponentDashboard from './pages/proponent/Dashboard';
import NewApplication from './pages/proponent/NewApplication';
import ApplicationDetail from './pages/proponent/ApplicationDetail';
import PaymentPage from './pages/proponent/PaymentPage';

// Scrutiny pages
import ScrutinyDashboard from './pages/scrutiny/Dashboard';
import ApplicationReview from './pages/scrutiny/ApplicationReview';

// MoM pages
import MomDashboard from './pages/mom/Dashboard';
import MomEditor from './pages/mom/MomEditor';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AuditLog from './pages/admin/AuditLog';
import UserManagement from './pages/admin/UserManagement';

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RoleRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  const roleRoutes: Record<string, string> = {
    PROPONENT: '/dashboard/proponent',
    SCRUTINY: '/dashboard/scrutiny',
    MOM_TEAM: '/dashboard/mom',
    ADMIN: '/dashboard/admin',
  };
  return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
}

export default function App() {
  useSocketSetup();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected */}
      <Route path="/dashboard" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<RoleRedirect />} />

        {/* Proponent */}
        <Route path="proponent" element={<RequireAuth roles={['PROPONENT']}><ProponentDashboard /></RequireAuth>} />
        <Route path="proponent/new" element={<RequireAuth roles={['PROPONENT']}><NewApplication /></RequireAuth>} />
        <Route path="proponent/application/:id" element={<RequireAuth roles={['PROPONENT']}><ApplicationDetail /></RequireAuth>} />
        <Route path="proponent/payment/:id" element={<RequireAuth roles={['PROPONENT']}><PaymentPage /></RequireAuth>} />

        {/* Scrutiny */}
        <Route path="scrutiny" element={<RequireAuth roles={['SCRUTINY']}><ScrutinyDashboard /></RequireAuth>} />
        <Route path="scrutiny/review/:id" element={<RequireAuth roles={['SCRUTINY']}><ApplicationReview /></RequireAuth>} />

        {/* MoM Team */}
        <Route path="mom" element={<RequireAuth roles={['MOM_TEAM']}><MomDashboard /></RequireAuth>} />
        <Route path="mom/editor/:id" element={<RequireAuth roles={['MOM_TEAM']}><MomEditor /></RequireAuth>} />

        {/* Admin */}
        <Route path="admin" element={<RequireAuth roles={['ADMIN']}><AdminDashboard /></RequireAuth>} />
        <Route path="admin/audit/:id" element={<RequireAuth roles={['ADMIN']}><AuditLog /></RequireAuth>} />
        <Route path="admin/users" element={<RequireAuth roles={['ADMIN']}><UserManagement /></RequireAuth>} />

        {/* Shared application detail */}
        <Route path="application/:id" element={<RequireAuth><ApplicationDetail /></RequireAuth>} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
