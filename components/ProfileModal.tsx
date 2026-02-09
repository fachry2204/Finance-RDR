import React, { useState, useEffect } from 'react';
import { User, Lock, Save, X, Eye, EyeOff } from 'lucide-react';
import { User as UserType } from '../types';
import { API_BASE_URL } from '../utils';

interface ProfileModalProps {
    user: UserType;
    isOpen: boolean;
    onClose: () => void;
    onUpdateProfile: (fullName: string, password?: string, photoUrl?: string) => Promise<void>;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose, onUpdateProfile }) => {
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [photoUrl, setPhotoUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            // Priority: Employee name -> Admin full_name -> Username
            const currentName = user.role === 'employee' ? user.details?.name : (user.full_name || '');
            setFullName(currentName || '');
            setPassword('');
            setConfirmPassword('');
            setPhotoUrl(user.photo_url || '');
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('rdr_token')}` // Fixed key
                },
                body: formData
            });
            const data = await response.json();
            if (data.status === 'success') {
                setPhotoUrl(data.url);
            } else {
                alert('Gagal upload foto: ' + data.message);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Gagal upload foto');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password && password !== confirmPassword) {
            alert("Konfirmasi password tidak sesuai");
            return;
        }

        setIsSubmitting(true);
        try {
            await onUpdateProfile(fullName, password, photoUrl);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <User size={24} className="text-blue-600" /> Edit Profil
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center mb-4">
                        <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden mb-2 relative group">
                            {photoUrl ? (
                                <img src={`${API_BASE_URL}${photoUrl}`} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={40} className="text-slate-400" />
                            )}
                            <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                <span className="text-white text-xs">Ubah Foto</span>
                                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            </label>
                        </div>
                        {uploading && <p className="text-xs text-blue-500">Mengupload...</p>}
                    </div>

                    {/* Read Only Fields */}
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Username</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={user.username} 
                                disabled 
                                className="w-full pl-10 p-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed"
                            />
                            <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Role</label>
                        <div className="relative">
                             <input 
                                type="text" 
                                value={user.role.toUpperCase()} 
                                disabled 
                                className="w-full pl-10 p-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed"
                            />
                            <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                        </div>
                    </div>

                    {/* Editable Fields */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                        <input 
                            type="text" 
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                            placeholder="Masukkan nama lengkap"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Password Baru <span className="text-slate-400 font-normal text-xs">(Kosongkan jika tidak diubah)</span>
                        </label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-2.5 pr-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                placeholder="******"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                     {password && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Konfirmasi Password</label>
                            <input 
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full p-2.5 bg-white dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white focus:ring-2 outline-none transition-colors ${password === confirmPassword ? 'border-emerald-500 focus:ring-emerald-500' : 'border-rose-500 focus:ring-rose-500'}`}
                                placeholder="Ulangi password baru"
                            />
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-rose-500 mt-1">Password tidak cocok</p>
                            )}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || (password !== '' && password !== confirmPassword)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? 'Menyimpan...' : <><Save size={18} /> Simpan Perubahan</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;
