import { useTranslation } from 'react-i18next';
import { Globe, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../NotificationBell';
import api from '../../lib/api';

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  PROPONENT: { label: 'Proponent',    color: 'bg-blue-100 text-blue-700' },
  SCRUTINY:  { label: 'Scrutiny',    color: 'bg-yellow-100 text-yellow-700' },
  MOM_TEAM:  { label: 'MoM Team',    color: 'bg-purple-100 text-purple-700' },
  ADMIN:     { label: 'Admin',       color: 'bg-red-100 text-red-700' },
};

export default function TopBar() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const [showUser, setShowUser] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'hi' : 'en';
    void i18n.changeLanguage(next);
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUser(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roleBadge = user ? ROLE_BADGE[user.role] : null;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10 relative">
      {/* Government Banner Text */}
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-cecb flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            🌿
          </div>
          <span className="text-xs text-gray-500 font-medium">Chhattisgarh Environment Conservation Board</span>
          <span className="text-xs text-gray-300">|</span>
          <span className="text-xs text-green-700 font-semibold">PARIVESH 3.0</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Toggle Language"
        >
          <Globe className="w-3.5 h-3.5" />
          {i18n.language === 'en' ? 'हिन्दी' : 'English'}
        </button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUser(o => !o)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-cecb flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-gray-900 leading-none">{user?.name}</div>
              {roleBadge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
              )}
            </div>
          </button>

          {/* Dropdown */}
          {showUser && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="font-semibold text-sm text-gray-900">{user?.name}</div>
                <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                {user?.organization && (
                  <div className="text-xs text-gray-400 truncate mt-0.5">{user.organization}</div>
                )}
              </div>
              <div className="p-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <User className="w-4 h-4" /> Profile
                </button>
                <button
                  onClick={() => void handleLogout()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" /> {t('auth.signOut')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
