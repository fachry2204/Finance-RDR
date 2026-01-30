import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Journal from './components/Journal';
import ReimbursementPage from './components/Reimbursement';
import Report from './components/Report';
import Settings from './components/Settings';
import { Transaction, Reimbursement, PageView, AppSettings } from './types';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageView>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // --- APP SETTINGS STATE (Categories, DB, Drive) ---
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default Settings
    return {
      categories: [
        'Operasional', 
        'Transportasi', 
        'Makan & Minum', 
        'ATK', 
        'Marketing', 
        'Gaji', 
        'Maintenance',
        'Project Alpha'
      ],
      database: {
        host: '',
        user: '',
        password: '',
        name: '',
        port: '3306',
        isConnected: false
      },
      drive: {
        isConnected: false,
        selectedFolderId: '',
        selectedFolderName: '',
        autoUpload: false
      }
    };
  });

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
  }, [appSettings]);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
  };

  // Global State (Simulating Database)
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'tx-001',
      date: '2023-10-25',
      type: 'PEMASUKAN',
      category: 'Project Alpha',
      activityName: 'Termin 1 Pembayaran',
      description: 'Pembayaran DP Project Web',
      items: [{ id: '1', name: 'Jasa Dev', qty: 1, price: 15000000, total: 15000000 }],
      grandTotal: 15000000,
      timestamp: 1698200000000
    },
    {
      id: 'tx-002',
      date: '2023-10-26',
      type: 'PENGELUARAN',
      expenseType: 'NORMAL',
      category: 'Operasional',
      activityName: 'Beli Server',
      description: 'Sewa VPS Tahunan',
      items: [{ id: '2', name: 'VPS 8GB', qty: 1, price: 2500000, total: 2500000 }],
      grandTotal: 2500000,
      timestamp: 1698300000000
    }
  ]);

  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([
    {
      id: 'rm-001',
      date: '2023-10-27',
      requestorName: 'Budi Santoso',
      category: 'Transportasi',
      activityName: 'Meeting Client',
      description: 'Grab ke kantor client',
      items: [{ id: '3', name: 'Grab Car', qty: 1, price: 75000, total: 75000 }],
      grandTotal: 75000,
      status: 'PENDING',
      timestamp: 1698400000000
    }
  ]);

  const handleAddTransaction = (transaction: Transaction) => {
    setTransactions([...transactions, transaction]);
    // SIMULATION: If DB connected, this would POST to API
    if (appSettings.database.isConnected) {
      console.log("Simulating Save to MySQL:", transaction);
    }
    // SIMULATION: If Drive connected, this would Upload Files
    if (appSettings.drive.isConnected && appSettings.drive.autoUpload) {
      console.log("Simulating Upload to Drive Folder:", appSettings.drive.selectedFolderName);
    }
  };

  const handleAddReimbursement = (reimbursement: Reimbursement) => {
    setReimbursements([...reimbursements, reimbursement]);
  };

  const handleUpdateReimbursement = (updatedReimb: Reimbursement) => {
    setReimbursements(prev => prev.map(r => r.id === updatedReimb.id ? updatedReimb : r));
  };

  const renderContent = () => {
    switch (activePage) {
      case 'DASHBOARD':
        return <Dashboard transactions={transactions} reimbursements={reimbursements} isDarkMode={theme === 'dark'} filterType="ALL" />;
      
      // Expense Category Views
      case 'STAT_EXPENSE':
        return <Dashboard transactions={transactions} reimbursements={reimbursements} isDarkMode={theme === 'dark'} filterType="EXPENSE" />;
      case 'ADD_EXPENSE':
        return <Journal onAddTransaction={handleAddTransaction} transactions={transactions} defaultType="PENGELUARAN" filterType="PENGELUARAN" initialView="LIST" categories={appSettings.categories} />;
      case 'REIMBES':
        return <ReimbursementPage reimbursements={reimbursements} onAddReimbursement={handleAddReimbursement} onUpdateReimbursement={handleUpdateReimbursement} categories={appSettings.categories} />;
      case 'REPORT_EXPENSE':
        return <Report transactions={transactions} reimbursements={reimbursements} fixedFilterType="PENGELUARAN" />;
      
      // Income Category Views
      case 'ADD_INCOME':
        return <Journal onAddTransaction={handleAddTransaction} transactions={transactions} defaultType="PEMASUKAN" filterType="PEMASUKAN" initialView="LIST" categories={appSettings.categories} />;
      case 'STAT_INCOME':
        return <Dashboard transactions={transactions} reimbursements={reimbursements} isDarkMode={theme === 'dark'} filterType="INCOME" />;
      
      // General Views
      case 'JOURNAL_LIST':
        return <Journal onAddTransaction={handleAddTransaction} transactions={transactions} defaultType="PENGELUARAN" initialView="LIST" categories={appSettings.categories} />;
      case 'REPORT':
        return <Report transactions={transactions} reimbursements={reimbursements} />;
      
      // Settings
      case 'SETTINGS':
        return <Settings settings={appSettings} onUpdateSettings={handleUpdateSettings} />;
        
      default:
        return <Dashboard transactions={transactions} reimbursements={reimbursements} isDarkMode={theme === 'dark'} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between p-4 z-10">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
            <span className="text-blue-600 dark:text-blue-400">RDR</span> Finance
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
            <Menu size={24} />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
          <div className="max-w-7xl mx-auto">
             {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;