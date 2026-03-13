import { useTranslation } from 'react-i18next';
import { Bell, Globe, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function TopBar() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const unreadCount: number = notifData?.meta?.unreadCount || 0;

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'hi' : 'en';
    void i18n.changeLanguage(next);
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      {/* Government Banner Text */}
      <div className="flex items-center gap-2">
        <div className="hidden md:block">
          <span className="text-xs text-gray-500 font-medium">
            Chhattisgarh Environment Conservation Board
          </span>
          <span className="text-xs text-gray-400 ml-2">|</span>
          <span className="text-xs text-green-700 font-semibold ml-2">PARIVESH 3.0</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Toggle Language"
        >
          <Globe className="w-3.5 h-3.5" />
          {i18n.language === 'en' ? 'हिन्दी' : 'English'}
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-cecb flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
