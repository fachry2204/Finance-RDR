
import React from 'react';
import { LayoutDashboard, Receipt, FileText, X, PlusCircle, PieChart, Wallet, List, Settings as SettingsIcon, Users, Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const menuGroups = [
    {
      title: 'Menu Utama',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/jurnal', label: 'Semua Jurnal', icon: List },
        { path: '/laporan', label: 'Laporan Umum', icon: FileText },
      ]
    },
    {
      title: 'Pengeluaran',
      items: [
        { path: '/pengeluaran/dashboard', label: 'Dashboard Cash Out', icon: PieChart },
        { path: '/pengeluaran/tambah', label: 'Tambah Pengeluaran', icon: PlusCircle },
        { path: '/reimburse', label: 'Tambah Reimburse', icon: Receipt },
        { path: '/pengeluaran/laporan', label: 'Laporan Pengeluaran', icon: FileText },
      ]
    },
    {
      title: 'Pemasukan',
      items: [
        { path: '/pemasukan/tambah', label: 'Tambah Pemasukan', icon: Wallet },
        { path: '/pemasukan/statistik', label: 'Statistik Pemasukan', icon: PieChart },
      ]
    },
    {
      title: 'Lainnya',
      items: [
        { path: '/pegawai', label: 'Data Pegawai', icon: Users },
        { path: '/notifikasi', label: 'Notifikasi', icon: Bell },
        { path: '/pengaturan', label: 'Pengaturan', icon: SettingsIcon },
      ]
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 text-slate-700 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col pt-0`}>
        
        {/* Mobile Close Button Header inside Sidebar */}
        <div className="flex md:hidden items-center justify-end p-4 border-b border-slate-100">
           <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-800">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                          : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
