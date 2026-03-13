import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FileText, Plus, ShieldCheck, BookOpen,
  Users, LogOut, Activity, Settings, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  // Proponent
  { to: '/dashboard/proponent', icon: LayoutDashboard, label: 'nav.dashboard', roles: ['PROPONENT'] },
  { to: '/dashboard/proponent/new', icon: Plus, label: 'nav.newApplication', roles: ['PROPONENT'] },

  // Scrutiny
  { to: '/dashboard/scrutiny', icon: ShieldCheck, label: 'nav.dashboard', roles: ['SCRUTINY'] },

  // MoM Team
  { to: '/dashboard/mom', icon: BookOpen, label: 'nav.dashboard', roles: ['MOM_TEAM'] },

  // Admin
  { to: '/dashboard/admin', icon: LayoutDashboard, label: 'nav.dashboard', roles: ['ADMIN'] },
  { to: '/dashboard/admin/users', icon: Users, label: 'nav.users', roles: ['ADMIN'] },

  // Shared
  { to: '/dashboard/application', icon: FileText, label: 'nav.applications' },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const roleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    SCRUTINY: 'bg-amber-100 text-amber-700',
    MOM_TEAM: 'bg-cyan-100 text-cyan-700',
    PROPONENT: 'bg-green-100 text-green-700',
  };

  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg z-10"
    >
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-cecb flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight">CECB Clearance</div>
            <div className="text-xs text-gray-500">PARIVESH 3.0</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {/* Role section header */}
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
          {user?.role?.replace(/_/g, ' ')} PORTAL
        </div>

        {roleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{t(item.label)}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-cecb flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleColors[user?.role || 'PROPONENT']}`}>
              {user?.role?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="nav-item nav-item-inactive w-full text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </motion.aside>
  );
}
