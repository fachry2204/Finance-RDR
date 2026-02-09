import React, { useState, useEffect } from 'react';
import { User, LogOut, Bell, Briefcase, Phone, Mail, FileText, Calendar, DollarSign, ChevronLeft } from 'lucide-react';
import { User as UserType, Reimbursement } from '../types';
import { getCurrentDateFormatted, API_BASE_URL } from '../utils';
import { useNavigate, useLocation } from 'react-router-dom';
import ReimbursementPage from './Reimbursement';

interface EmployeeDashboardProps {
  user: UserType;
  authToken: string | null;
  categories: string[];
  onLogout: () => void;
  onProfileClick: () => void;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ user, authToken, categories, onLogout, onProfileClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isReimbursementPage = location.pathname.includes('/reimburse');

  const employeeDetails = user.details;
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Refs for polling logic
  const lastNotifIdRef = React.useRef<string | number | null>(null);
  const isFirstLoadRef = React.useRef(true);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    fetchReimbursements();
    fetchNotifications();

    // Polling interval (every 10 seconds)
    const interval = setInterval(() => {
        fetchNotifications();
        // Also refresh reimbursements to keep status up to date
        fetchReimbursements(); 
    }, 10000);

    return () => clearInterval(interval);
  }, [authToken]);

  const fetchNotifications = async () => {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const data = await response.json();
            const fetchedNotifs = data.notifications;
            setNotifications(fetchedNotifs);

            // Push Notification Logic
            if (fetchedNotifs.length > 0) {
                const topId = fetchedNotifs[0].id;
                
                // Detect new top notification
                if (topId !== lastNotifIdRef.current) {
                    // Only notify if not first load
                    if (!isFirstLoadRef.current) {
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('Ruang Dimensi Records', {
                                body: fetchedNotifs[0].message,
                                icon: '/vite.svg' // Optional icon
                            });
                        }
                    }
                    lastNotifIdRef.current = topId;
                }
            }
            isFirstLoadRef.current = false;
        }
    } catch (error) {
        console.error("Failed to fetch notifications", error);
    }
  };

  const fetchReimbursements = async () => {
    if (!authToken) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/reimbursements`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReimbursements(data);
      }
    } catch (error) {
      console.error("Failed to fetch reimbursements", error);
    }
  };

  const handleAddReimbursement = async (reimb: Reimbursement) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reimbursements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(reimb)
        });
        if (response.ok) {
            alert('Pengajuan berhasil disimpan');
            fetchReimbursements();
        } else {
            const err = await response.json();
            alert('Gagal menyimpan: ' + err.message);
        }
    } catch (error) {
        alert('Terjadi kesalahan saat menyimpan');
    }
  };

  const handleUpdateReimbursementDetails = async (reimb: Reimbursement) => {
      try {
          const response = await fetch(`${API_BASE_URL}/api/reimbursements/${reimb.id}/details`, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify(reimb)
          });
          if (response.ok) {
              alert('Pengajuan berhasil diupdate');
              fetchReimbursements();
          } else {
              const err = await response.json();
              alert('Gagal update: ' + err.message);
          }
      } catch (error) {
          alert('Terjadi kesalahan saat update');
      }
  };

  // Dummy handlers for actions not allowed for employees (just in case)
  const handleUpdateReimbursementStatus = (reimb: Reimbursement) => {
      console.warn("Employees cannot update status");
  };

  const handleDeleteReimbursement = (id: string) => {
      console.warn("Employees cannot delete reimbursements");
  };

  if (isReimbursementPage) {
      return (
          <div className="min-h-screen bg-slate-50 font-sans pb-20">
              <div className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-30 flex items-center gap-3">
                  <button onClick={() => navigate('/employee')} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                      <ChevronLeft size={24} />
                  </button>
                  <h1 className="text-lg font-bold">Reimbursement</h1>
              </div>
              <div className="p-4">
                  <ReimbursementPage 
                    reimbursements={reimbursements}
                    onAddReimbursement={handleAddReimbursement}
                    onUpdateReimbursement={handleUpdateReimbursementStatus}
                    onDeleteReimbursement={handleDeleteReimbursement}
                    onUpdateReimbursementDetails={handleUpdateReimbursementDetails}
                    categories={categories}
                    authToken={authToken}
                    isEmployeeView={true}
                    currentUser={user}
                  />
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Mobile Header */}
      <div className="bg-blue-600 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <Briefcase size={120} />
        </div>
        
        {/* Logo */}
        <div className="absolute top-6 left-6 z-20">
           <img src="https://ruangdimensirecords.com/img/logo.png" alt="Logo" className="h-8 w-auto brightness-0 invert" />
        </div>

        <div className="flex justify-between items-start mb-6 relative z-10 pt-8">
           <div>
              <p className="text-blue-100 text-sm mb-1">{getCurrentDateFormatted()}</p>
              <h1 className="text-2xl font-bold">Halo, {employeeDetails?.name || user.username}</h1>
              <p className="text-blue-100 opacity-90">{employeeDetails?.position || 'Staff'}</p>
           </div>
           <button onClick={onLogout} className="bg-white/20 p-2 rounded-full hover:bg-white/30 backdrop-blur-sm transition-colors">
              <LogOut size={20} />
           </button>
        </div>

        {/* Quick Stats / Highlights */}
        <div className="flex gap-4 relative z-10">
            {/* Info Card moved here as requested */}
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 flex-1">
              <p className="text-xs text-blue-100 mb-1">Status</p>
              <div className="flex items-center gap-1 font-bold">
                 <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div> Aktif
              </div>
           </div>
           
           <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 flex-1 relative" onClick={() => document.getElementById('info-section')?.scrollIntoView({ behavior: 'smooth' })}>
              <p className="text-xs text-blue-100 mb-1">Notifikasi</p>
              <div className="flex items-center gap-1 font-bold">
                 <Bell size={16} /> {notifications.length > 0 ? `${notifications.length} Baru` : '0 Baru'}
              </div>
              {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              )}
           </div>
        </div>
      </div>

      <div className="p-6 -mt-6 relative z-10 space-y-6">
        
        {/* Profile Card (Now below info) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow" onClick={onProfileClick}>
            <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                {user.photo_url ? (
                    <img src={`http://localhost:5000${user.photo_url}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <User size={32} />
                    </div>
                )}
            </div>
            <div className="flex-1">
                <h2 className="font-bold text-slate-800">{employeeDetails?.name || user.username}</h2>
                <p className="text-sm text-slate-500">{employeeDetails?.position || 'Employee'}</p>
                <p className="text-xs text-blue-600 mt-1">Edit Profil & Upload Foto</p>
            </div>
            <div className="bg-slate-50 p-2 rounded-full text-slate-400">
                <User size={20} />
            </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 gap-4">
            <button 
               onClick={() => navigate('/employee/reimburse')}
               className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 flex flex-col items-center justify-center gap-3 hover:bg-blue-50 transition-colors group"
            >
               <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                   <DollarSign size={24} />
               </div>
               <span className="font-semibold text-slate-700 group-hover:text-blue-700">Reimbursement</span>
            </button>

            <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 flex flex-col items-center justify-center gap-3 opacity-50 cursor-not-allowed">
               <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                   <Calendar size={24} />
               </div>
               <span className="font-semibold text-slate-400">Absensi</span>
            </div>
        </div>

        {/* Detailed Info (Was Profile Card) */}
        <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-100 relative group">
           <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <User size={18} className="text-blue-600"/> Data Diri
               </h3>
           </div>
           <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                 <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Briefcase size={18} />
                 </div>
                 <div>
                    <p className="text-xs text-slate-500">Jabatan</p>
                    <p className="font-medium text-slate-800">{employeeDetails?.position || '-'}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                 <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Phone size={18} />
                  </div>
                  <div>
                     <p className="text-xs text-slate-500">Telepon / WhatsApp</p>
                     <p className="font-medium text-slate-800">{employeeDetails?.phone || '-'}</p>
                  </div>
               </div>
               <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                     <Mail size={18} />
                  </div>
                  <div className="overflow-hidden">
                     <p className="text-xs text-slate-500">Email</p>
                     <p className="font-medium text-slate-800 truncate">{employeeDetails?.email || '-'}</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Announcements / Tasks Placeholder */}
         <div id="info-section" className="bg-white p-5 rounded-2xl shadow-md border border-slate-100">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <Bell size={18} className="text-amber-500"/> Pemberitahuan
            </h3>
            <div className="space-y-3">
               {notifications.length > 0 ? (
                   notifications.map((notif, idx) => (
                       <div key={idx} className={`p-3 rounded-xl border flex gap-3 ${
                           notif.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                           notif.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                           notif.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                           'bg-blue-50 border-blue-100 text-blue-800'
                       }`}>
                           <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                               notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                               notif.type === 'error' ? 'bg-red-100 text-red-600' :
                               notif.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                               'bg-blue-100 text-blue-600'
                           }`}>
                               {notif.type === 'success' ? <FileText size={14} /> : 
                                notif.type === 'error' ? <LogOut size={14} /> : 
                                <Bell size={14} />}
                           </div>
                           <div>
                               <p className="text-sm font-medium">{notif.message}</p>
                               {notif.timestamp && (
                                   <p className="text-xs opacity-70 mt-1">
                                       {new Date(notif.timestamp).toLocaleString('id-ID', { 
                                           day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                                       })}
                                   </p>
                               )}
                           </div>
                       </div>
                   ))
               ) : (
                   <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-sm">
                       <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
                       <p>Belum ada pemberitahuan baru.</p>
                   </div>
               )}
            </div>
         </div>

      </div>
    </div>
  );
};

export default EmployeeDashboard;
