
import React, { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Calendar, Database, Bell, Sun, Moon, Menu } from 'lucide-react';
import { User } from '../types';
import { getCurrentDateFormatted, API_BASE_URL } from '../utils';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  user: User | null;
  onLogoutClick: () => void;
  toggleSidebar: () => void;
  isDbConnected: boolean;
  onProfileClick: () => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  logoUrl?: string;
  systemName?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  user, 
  onLogoutClick, 
  toggleSidebar, 
  isDbConnected,
  onProfileClick,
  isDarkMode,
  toggleDarkMode,
  logoUrl,
  systemName
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-16 fixed top-0 left-0 right-0 z-30 px-4 md:px-6 flex items-center justify-between transition-colors duration-200 shadow-sm">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors md:hidden"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
            <div className="w-[100px] flex items-center justify-start overflow-hidden">
                {logoUrl ? (
                    <img src={logoUrl.startsWith('/uploads') ? `${API_BASE_URL}${logoUrl}` : logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                    <div className="w-8 h-8 bg-slate-900 dark:bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-slate-200 dark:shadow-slate-800 shadow-lg">R</div>
                )}
            </div>
            {!logoUrl && (
                <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block">
                    {systemName || 'Finance RDR'}
                </h1>
            )}
            {logoUrl && systemName && (
                 <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block">
                    {systemName}
                </h1>
            )}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Date & Time (Desktop) */}
        <div className="hidden md:flex flex-col items-end mr-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Calendar size={14} />
                <span>{getCurrentDateFormatted()}</span>
            </div>
            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
            {/* DB Status */}
            <div 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                isDbConnected 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' 
                  : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'
              }`}
              title={isDbConnected ? "Database Terhubung" : "Database Terputus"}
            >
                <div className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="hidden sm:inline">{isDbConnected ? 'Online' : 'Offline'}</span>
            </div>

            {/* Dark Mode Toggle */}
            {toggleDarkMode && (
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} />}
              </button>
            )}

            {/* Notification Bell (Placeholder) */}
            <button 
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative"
                onClick={() => navigate('/notifikasi')}
            >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

            {/* User Profile */}
            <div className="flex items-center gap-3 group cursor-pointer" onClick={onProfileClick}>
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                        {user?.full_name || user?.username || 'Admin'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role || 'User'}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                    {user?.photo_url ? (
                         <img src={`${API_BASE_URL}${user.photo_url}`} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon size={18} className="text-slate-500 dark:text-slate-400" />
                    )}
                </div>
            </div>

             <button 
                onClick={onLogoutClick}
                className="ml-1 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                title="Keluar"
            >
                <LogOut size={20} />
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
