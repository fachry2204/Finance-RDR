
import React, { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Calendar, Database, Bell, Check, Trash2, X } from 'lucide-react';
import { User } from '../types';
import { getCurrentDateFormatted, API_BASE_URL } from '../utils';

interface HeaderProps {
  user: User | null;
  onLogoutClick: () => void;
  toggleSidebar: () => void;
  isDbConnected: boolean;
  onProfileClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogoutClick, toggleSidebar, isDbConnected, onProfileClick }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Only fetch for admin here, as employee has their own dashboard notifications
    if (user?.role === 'admin') {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications`, {
             headers: { 'Authorization': `Bearer ${localStorage.getItem('rdr_token')}` }
        });
        if (response.ok) {
            const data = await response.json();
            setNotificationCount(data.count);
            setNotifications(data.notifications || []);
        }
    } catch (e) {
        console.error("Failed to fetch admin notifications");
    }
  };

  const markAllRead = async () => {
      try {
          await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('rdr_token')}` }
          });
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
          setNotificationCount(0);
      } catch (e) {
          console.error("Failed to mark all read");
      }
  };

  const clearAll = async () => {
      if (!confirm('Hapus semua notifikasi?')) return;
      try {
          await fetch(`${API_BASE_URL}/api/notifications/clear-all`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('rdr_token')}` }
          });
          setNotifications([]);
          setNotificationCount(0);
      } catch (e) {
          console.error("Failed to clear notifications");
      }
  };

  const deleteNotification = async (id: number) => {
      try {
           await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('rdr_token')}` }
          });
          
          setNotifications(prev => {
              const updated = prev.filter(n => n.id !== id);
              // Recount unread
              const unread = updated.filter(n => !n.is_read).length;
              setNotificationCount(unread);
              return updated;
          });
      } catch (e) {
           console.error("Failed to delete notification");
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

        {/* Admin Notification Bell */}
        {user?.role === 'admin' && (
             <div className="relative">
                 <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer relative transition-colors"
                 >
                     <Bell size={20} />
                     {notificationCount > 0 && (
                         <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                     )}
                 </button>

                 {/* Notification Modal/Dropdown */}
                 {showNotifications && (
                     <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-semibold text-slate-800">Notifikasi</h3>
                            <div className="flex gap-2">
                                <button onClick={markAllRead} className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors" title="Tandai semua dibaca">
                                    <Check size={14} /> Baca Semua
                                </button>
                                <button onClick={clearAll} className="text-xs flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors" title="Hapus semua">
                                    <Trash2 size={14} /> Hapus
                                </button>
                            </div>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                                    <Bell size={32} className="text-slate-200" />
                                    <p>Tidak ada notifikasi baru</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {notifications.map((notif) => (
                                        <div key={notif.id} className={`p-4 hover:bg-slate-50 transition-colors relative group ${!notif.is_read ? 'bg-blue-50/40' : ''}`}>
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1">
                                                    <p className={`text-sm ${!notif.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {notif.timestamp ? new Date(notif.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => deleteNotification(notif.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                                                    title="Hapus notifikasi ini"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            {!notif.is_read && (
                                                <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l"></span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                     </div>
                 )}
                 
                 {/* Backdrop to close when clicking outside */}
                 {showNotifications && (
                     <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowNotifications(false)}></div>
                 )}
             </div>
        )}

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
