import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Journal from './components/Journal';
import ReimbursementPage from './components/Reimbursement';
import Report from './components/Report';
import { Transaction, Reimbursement, PageView } from './types';
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
      category: 'Transport',
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
  };

  const handleAddReimbursement = (reimbursement: Reimbursement) => {
    setReimbursements([...reimbursements, reimbursement]);
  };

  const renderContent = () => {
    switch (activePage) {
      case 'DASHBOARD':
        return <Dashboard transactions={transactions} reimbursements={reimbursements} isDarkMode={theme === 'dark'} />;
      case 'JOURNAL':
        return <Journal onAddTransaction={handleAddTransaction} transactions={transactions} />;
      case 'REIMBES':
        return <ReimbursementPage reimbursements={reimbursements} onAddReimbursement={handleAddReimbursement} />;
      case 'REPORT':
        return <Report transactions={transactions} reimbursements={reimbursements} />;
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