export type TransactionType = 'PEMASUKAN' | 'PENGELUARAN';
export type ExpenseType = 'NORMAL' | 'REIMBES';

export interface ItemDetail {
  id: string;
  name: string; // Keterangan untuk reimbes
  qty: number;
  price: number;
  total: number;
  file?: File | null; // Simulasikan upload
  filePreviewUrl?: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  expenseType?: ExpenseType; // Only if type is PENGELUARAN
  category: string;
  activityName: string;
  description: string;
  items: ItemDetail[];
  grandTotal: number;
  timestamp: number; // For sorting
}

export interface Reimbursement {
  id: string;
  date: string;
  requestorName: string;
  category: string;
  activityName: string;
  description: string;
  items: ItemDetail[];
  grandTotal: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: number;
}

export type PageView = 'DASHBOARD' | 'JOURNAL' | 'REIMBES' | 'REPORT';
