
import React, { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Calendar, Database, Bell } from 'lucide-react';
import { User } from '../types';
import { getCurrentDateFormatted, API_BASE_URL } from '../utils';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  user: User | null;
  onLogoutClick: () => void;
  toggleSidebar: () => void;
  isDbConnected: boolean;
  onProfileClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogoutClick, toggleSidebar, isDbConnected, onProfileClick }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch notifications for all users (Admin & Employee)
    fetchNotifications();

    // Poll for new notifications every 15 seconds
    const interval = setInterval(() => {
        fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications`, {
             headers: { 'Authorization': `Bearer ${localStorage.getItem('rdr_token')}` }
        });
        if (response.ok) {
            const data = await response.json();
            setNotificationCount(data.count);
        }
    } catch (e) {
        console.error("Failed to fetch notifications");
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-40 px-4 md:px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <img 
          src="https://ruangdimensirecords.com/img/logo.png" 
          alt="RDR Finance" 
          className="h-10 w-auto object-contain"
        />
        <span className="font-bold text-lg text-slate-800 tracking-tight hidden md:block">KEUANGAN <span className="text-blue-600">RDR</span></span>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Display - Hidden on mobile */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
           <Calendar size={14} className="text-slate-400" />
           {getCurrentDateFormatted()}
        </div>

        {/* Database Status Indicator */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${isDbConnected ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`} title={isDbConnected ? "Database Terhubung" : "Database Terputus"}>
           <Database size={14} />
           <span className="flex items-center gap-1.5">
             <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
             {isDbConnected ? 'DB Online' : 'DB Offline'}
           </span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
            <button 
            onClick={() => navigate('/notifikasi')}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer relative transition-colors"
            >
                <Bell size={20} />
                {notificationCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
            </button>
        </div>

        <button 
          onClick={onProfileClick}
          className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-100 transition-colors cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors overflow-hidden">
            {user?.photo_url ? (
                <img src={`${API_BASE_URL}${user.photo_url}`} alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <UserIcon size={16} />
            )}
          </div>
          <div className="hidden md:block pr-2 text-left">
            <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">{user?.role === 'employee' ? user.details?.name : (user?.full_name || user?.username || 'Admin')}</p>
            <p className="text-[10px] text-slate-500 uppercase leading-none group-hover:text-blue-500 transition-colors">{user?.role || 'User'}</p>
          </div>
        </button>
        
        <button 
          onClick={onLogoutClick}
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Keluar Sistem"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
