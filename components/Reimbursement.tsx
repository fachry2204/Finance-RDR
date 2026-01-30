import React, { useState } from 'react';
import { Reimbursement, ItemDetail } from '../types';
import { generateId, formatCurrency } from '../utils';
import { Plus, Save, UploadCloud, Trash2, User, FileText } from 'lucide-react';

interface ReimbursementProps {
  reimbursements: Reimbursement[];
  onAddReimbursement: (reimb: Reimbursement) => void;
}

const ReimbursementPage: React.FC<ReimbursementProps> = ({ reimbursements, onAddReimbursement }) => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [requestorName, setRequestorName] = useState('');
  const [category, setCategory] = useState('');
  const [activityName, setActivityName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ItemDetail[]>([]);

  const addItem = () => {
    setItems([...items, { id: generateId(), name: '', qty: 1, price: 0, total: 0 }]);
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const updateItem = (id: string, field: keyof ItemDetail, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'price') {
          updated.total = Number(updated.qty) * Number(updated.price);
        }
        return updated;
      }
      return item;
    }));
  };

   // Handle File Upload
   const handleFileUpload = (id: string, file: File | null) => {
    setItems(items.map(item => {
      if(item.id === id) {
        return { ...item, file, filePreviewUrl: file ? URL.createObjectURL(file) : undefined };
      }
      return item;
    }));
  }

  const calculateTotal = () => items.reduce((sum, i) => sum + i.total, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert("Minimal 1 item reimbes.");

    const newReimb: Reimbursement = {
      id: generateId(),
      date,
      requestorName,
      category,
      activityName,
      description,
      items,
      grandTotal: calculateTotal(),
      status: 'PENDING',
      timestamp: Date.now()
    };

    onAddReimbursement(newReimb);
    setView('LIST');
    
    // Reset
    setRequestorName('');
    setCategory('');
    setActivityName('');
    setDescription('');
    setItems([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Sistem Reimbes</h2>
        {view === 'LIST' ? (
          <button 
            onClick={() => setView('FORM')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} /> Ajukan Reimbes
          </button>
        ) : (
          <button onClick={() => setView('LIST')} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">Kembali</button>
        )}
      </div>

      {view === 'FORM' ? (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-fade-in transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal Pengajuan</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border p-2.5 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Pengaju</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input type="text" required placeholder="Nama Lengkap" value={requestorName} onChange={e => setRequestorName(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border p-2.5 pl-10 focus:ring-blue-500 outline-none transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
              <input type="text" required placeholder="Divisi / Project" value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border p-2.5 outline-none transition-colors" />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Kegiatan</label>
              <input type="text" required value={activityName} onChange={e => setActivityName(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border p-2.5 outline-none transition-colors" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border p-2.5 outline-none transition-colors"></textarea>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
             <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Detail Item Reimbes</h3>
              <button type="button" onClick={addItem} className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium transition-colors">+ Tambah Item</button>
            </div>
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600 grid grid-cols-1 md:grid-cols-12 gap-4 items-end transition-colors">
                   <div className="md:col-span-4">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Keterangan Barang/Jasa</label>
                    <input type="text" required value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded text-sm outline-none focus:border-blue-500" />
                   </div>
                   <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Qty</label>
                    <input type="number" required min="1" value={item.qty} onChange={e => updateItem(item.id, 'qty', parseInt(e.target.value)||0)} className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded text-sm outline-none focus:border-blue-500" />
                   </div>
                   <div className="md:col-span-3">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Harga</label>
                    <input type="number" required min="0" value={item.price} onChange={e => updateItem(item.id, 'price', parseInt(e.target.value)||0)} className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded text-sm outline-none focus:border-blue-500" />
                   </div>
                   <div className="md:col-span-3">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Total</label>
                    <div className="w-full p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded text-sm font-medium">{formatCurrency(item.total)}</div>
                   </div>
                   <div className="md:col-span-12 flex justify-between pt-2 border-t border-dashed border-slate-200 dark:border-slate-600 mt-2">
                       <label className="cursor-pointer flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          <UploadCloud size={16} /> {item.file ? <span className="text-blue-600 dark:text-blue-400 font-medium">{item.file.name}</span> : 'Upload Bukti Struk'}
                          <input type="file" className="hidden" onChange={e => handleFileUpload(item.id, e.target.files?.[0] || null)} />
                       </label>
                       <button type="button" onClick={() => removeItem(item.id)} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1"><Trash2 size={16}/></button>
                   </div>
                </div>
              ))}
            </div>
             <div className="flex justify-end mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
               <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Grand Total Reimbes</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(calculateTotal())}</p>
               </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setView('LIST')} className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Batal</button>
            <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm shadow-blue-200 dark:shadow-none transition-colors"><Save size={18}/> Simpan Pengajuan</button>
          </div>
        </form>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tanggal</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Pengaju</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Kegiatan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Items</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">Total</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-center">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {reimbursements.length > 0 ? (
                reimbursements.sort((a,b)=> b.timestamp - a.timestamp).map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{r.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{r.requestorName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      <div>{r.activityName}</div>
                      <div className="text-xs text-slate-400">{r.category}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{r.items.length} Item</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800 dark:text-slate-200">{formatCurrency(r.grandTotal)}</td>
                    <td className="px-6 py-4 text-center">
                      {r.items.some(i => i.file) ? <FileText size={16} className="text-blue-500 mx-auto"/> : <span className="text-slate-300 dark:text-slate-600">-</span>}
                    </td>
                  </tr>
                ))
              ) : (
                 <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">Belum ada data reimbes</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReimbursementPage;