import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../types';
import { Search, RotateCcw, Monitor, User as UserIcon, Calendar, Clock, Globe } from 'lucide-react';

interface ActivityLogPageProps {
  user: any; // Using any for simplicity as User type is complex
}

const ActivityLogPage: React.FC<ActivityLogPageProps> = ({ user }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('rdr_token');
      const response = await fetch('/api/logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
        }
        throw new Error('Gagal mengambil data log');
      }

      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Error loading logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.ip_address?.includes(searchTerm)
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Helper to parse device info (simplify user agent)
  const formatDevice = (userAgent: string) => {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Other';
  };

  const formatActionText = (action: string) => {
    // Handle legacy logs with underscores
    if (action.includes('_')) {
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return action;
  };

  const getActionColor = (action: string) => {
    const upperAction = action.toUpperCase();
    if (upperAction.includes('DELETE') || upperAction.includes('HAPUS')) return 'bg-red-50 text-red-700 border border-red-100';
    if (upperAction.includes('UPDATE') || upperAction.includes('EDIT')) return 'bg-amber-50 text-amber-700 border border-amber-100';
    if (upperAction.includes('LOGIN') || upperAction.includes('LOGOUT')) return 'bg-green-50 text-green-700 border border-green-100';
    return 'bg-blue-50 text-blue-700 border border-blue-100';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Log Aktivitas</h1>
          <p className="text-slate-600 mt-1">Pantau semua kegiatan pengguna sistem</p>
        </div>
        <button 
          onClick={fetchLogs} 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari user, aktivitas, atau IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-[180px]">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        Waktu
                    </div>
                </th>
                <th className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        User
                    </div>
                </th>
                <th className="px-6 py-4">Aktivitas</th>
                <th className="px-6 py-4 w-[140px]">
                    <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        IP Address
                    </div>
                </th>
                <th className="px-6 py-4 w-[160px]">
                    <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-slate-400" />
                        Device
                    </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p>Memuat data log...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada data log yang ditemukan
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{formatDate(log.created_at)}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatTime(log.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{log.username || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">ID: {log.user_id || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${getActionColor(log.action)}
                      `}>
                        {formatActionText(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600" title={log.device_info}>
                      <div className="flex items-center gap-2">
                        {formatDevice(log.device_info)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
            <span>Menampilkan {filteredLogs.length} entri</span>
            <span>Data log diurutkan dari yang terbaru</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;
