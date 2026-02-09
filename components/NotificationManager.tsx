import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Send, Users, AlertCircle, CheckCircle, Info, User } from 'lucide-react';
import { API_BASE_URL } from '../utils';

interface NotificationManagerProps {
    authToken: string | null;
}

interface Employee {
    id: number;
    name: string;
    position: string;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ authToken }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const userId = params.get('userId');
        if (userId) {
            setSelectedEmployee(userId);
        }
    }, [location]);

    useEffect(() => {
        fetchEmployees();
    }, [authToken]);

    const fetchEmployees = async () => {
        if (!authToken) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/employees`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data);
            }
        } catch (error) {
            console.error("Failed to fetch employees", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        if (!message.trim()) {
            setStatus({ type: 'error', message: 'Pesan tidak boleh kosong' });
            setLoading(false);
            return;
        }

        try {
            const payload = {
                userId: selectedEmployee === 'all' ? null : parseInt(selectedEmployee),
                message,
                type
            };

            const response = await fetch(`${API_BASE_URL}/api/notifications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setStatus({ type: 'success', message: 'Notifikasi berhasil dikirim!' });
                setMessage('');
                setSelectedEmployee('all');
                setType('info');
            } else {
                setStatus({ type: 'error', message: data.message || 'Gagal mengirim notifikasi' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Terjadi kesalahan jaringan' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                    <Bell size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Manajemen Notifikasi</h1>
                    <p className="text-slate-500">Kirim pemberitahuan ke pegawai</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Send size={20} className="text-blue-600" /> Buat Pesan Baru
                        </h2>

                        {status && (
                            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                {status.message}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Tujuan Penerima</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select
                                        value={selectedEmployee}
                                        onChange={(e) => setSelectedEmployee(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value="all">Semua Pegawai (Broadcast)</option>
                                        <optgroup label="Pilih Pegawai Tertentu">
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.name} - {emp.position}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 ml-1">
                                    {selectedEmployee === 'all' 
                                        ? 'Pesan akan dikirim ke seluruh pegawai aktif.' 
                                        : 'Pesan hanya akan dikirim ke pegawai yang dipilih.'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Jenis Notifikasi</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setType('info')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <Info size={18} /> Info
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('success')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <CheckCircle size={18} /> Sukses
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('warning')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <AlertCircle size={18} /> Peringatan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('error')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${type === 'error' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <AlertCircle size={18} /> Penting
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Isi Pesan</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Tulis pesan pemberitahuan di sini..."
                                    rows={4}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                ></textarea>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? 'Mengirim...' : <><Send size={18} /> Kirim Notifikasi</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Preview / Info Section */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Info size={18} className="text-blue-400" /> Preview Tampilan
                        </h3>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <p className="text-xs text-slate-400 mb-2">Dashboard Pegawai</p>
                            <div className={`p-3 rounded-lg flex items-start gap-3 bg-white text-slate-800 shadow-sm`}>
                                <div className={`p-2 rounded-full shrink-0 ${
                                    type === 'info' ? 'bg-blue-100 text-blue-600' :
                                    type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                    type === 'warning' ? 'bg-amber-100 text-amber-600' :
                                    'bg-red-100 text-red-600'
                                }`}>
                                    <Bell size={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{message || 'Contoh pesan notifikasi...'}</p>
                                    <p className="text-xs text-slate-400 mt-1">Baru saja</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 text-sm text-slate-300">
                            <p>Notifikasi ini akan muncul di dashboard pegawai yang dipilih.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationManager;