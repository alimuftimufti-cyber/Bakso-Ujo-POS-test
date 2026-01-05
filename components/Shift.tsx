
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../types';
import type { Shift, ShiftSummary, Expense, StoreProfile, Order } from '../types';
import ReceiptPreviewModal from './ReceiptPreviewModal';
import PrintableReceipt from './PrintableReceipt';
import { printShift } from '../services/printerService';

const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
const formatDateTime = (timestamp: number) => new Date(timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

const StatCard = ({ title, value, icon, className }: { title: string, value: string | number, icon?: React.ReactNode, className?: string }) => (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full ${className}`}>
        <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">{title}</h3>
            {icon && <div className="p-2 bg-gray-50 rounded-lg text-gray-400">{icon}</div>}
        </div>
        <p className="text-3xl font-black text-gray-800 tracking-tight">{value}</p>
    </div>
);

const StartShiftForm = ({ onStart, onLogout, theme }: { onStart: (amount: number) => Promise<void> | void, onLogout: () => void, theme: string }) => {
    const [startCash, setStartCash] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cash = parseFloat(startCash);
        if (!isNaN(cash) && cash >= 0) {
            setIsSubmitting(true);
            try {
                await onStart(cash);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            alert('Masukkan jumlah modal awal yang valid.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-50 relative overflow-hidden">
            <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center border border-gray-100 relative z-10">
                <div className={`w-20 h-20 bg-${theme}-50 rounded-2xl flex items-center justify-center mx-auto mb-8 text-${theme}-600 shadow-inner ring-4 ring-white`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Mulai Shift Baru</h2>
                <p className="text-gray-500 mb-8 font-medium">Siapkan modal kasir untuk memulai operasional hari ini.</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                        <label className="block text-left text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Modal Awal (Cash Drawer)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold text-lg">Rp</span>
                            <input 
                                type="number" 
                                value={startCash} 
                                onChange={(e) => setStartCash(e.target.value)} 
                                className={`w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 pl-12 text-2xl font-bold focus:bg-white focus:ring-4 focus:ring-${theme}-100 focus:border-${theme}-500 outline-none transition-all`} 
                                placeholder="0" 
                                required 
                                autoFocus
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`w-full bg-${theme}-600 text-white font-bold py-4 rounded-2xl hover:bg-${theme}-700 transition-all transform hover:scale-[1.02] shadow-xl shadow-${theme}-200 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed`}
                    >
                        {isSubmitting ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : 'Buka Operasional'}
                    </button>
                </form>
            </div>
             <p className="mt-8 text-gray-400 text-sm font-medium z-10">Pastikan uang fisik sesuai dengan input.</p>
        </div>
    );
}

const CloseShiftModal = ({ onConfirm, onCancel, activeShift, expenses, storeProfile, orders }: { onConfirm: (closingCash: number) => void, onCancel: () => void, activeShift: Shift, expenses: number, storeProfile: StoreProfile, orders: Order[] }) => {
    const [closingCash, setClosingCash] = useState('');
    
    const shiftOrders = orders.filter(o => String(o.shiftId) === String(activeShift.id) && o.isPaid && o.status !== 'cancelled');
    const cashRevenue = shiftOrders.filter(o => o.paymentMethod === 'Tunai').reduce((sum, o) => sum + (o.total || 0), 0);
    const nonCashRevenue = shiftOrders.filter(o => o.paymentMethod !== 'Tunai').reduce((sum, o) => sum + (o.total || 0), 0);
    const totalRevenue = cashRevenue + nonCashRevenue;

    const startCash = activeShift.start_cash;
    const expectedCash = startCash + cashRevenue - expenses;
    const actualCash = parseFloat(closingCash) || 0;
    const difference = actualCash - expectedCash;

    const tempSummary: ShiftSummary = useMemo(() => ({
        ...activeShift,
        revenue: totalRevenue,
        cashRevenue: cashRevenue,
        nonCashRevenue: nonCashRevenue,
        transactions: shiftOrders.length,
        end: Date.now(),
        closingCash: actualCash,
        cashDifference: difference,
        totalExpenses: expenses,
        netRevenue: totalRevenue - expenses,
        averageKitchenTime: 0,
        expectedCash: expectedCash
    }), [activeShift, actualCash, difference, expenses, expectedCash, totalRevenue, cashRevenue, nonCashRevenue, shiftOrders.length]);

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onConfirm(actualCash); };

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] animate-scale-in">
                <form onSubmit={handleSubmit} className="p-8 w-full md:w-3/5 flex flex-col bg-white">
                    <h2 className="text-2xl font-black mb-6 text-gray-900">Closing Shift</h2>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                             <div className="text-xs font-bold text-gray-500 uppercase mb-1">Modal Awal</div>
                             <div className="font-bold text-lg text-gray-800">{formatRupiah(startCash)}</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                             <div className="text-xs font-bold text-green-600 uppercase mb-1">Tunai Masuk</div>
                             <div className="font-bold text-lg text-green-700">+{formatRupiah(cashRevenue)}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                             <div className="text-xs font-bold text-red-600 uppercase mb-1">Pengeluaran</div>
                             <div className="font-bold text-lg text-red-700">-{formatRupiah(expenses)}</div>
                        </div>
                         <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                             <div className="text-xs font-bold text-blue-600 uppercase mb-1">Non-Tunai</div>
                             <div className="font-bold text-lg text-blue-700">{formatRupiah(nonCashRevenue)}</div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-900 text-white p-5 rounded-2xl mb-6 flex justify-between items-center shadow-lg">
                        <span className="font-bold text-sm uppercase tracking-wide opacity-80">Ekspektasi Uang Fisik</span>
                        <span className="font-mono text-2xl font-bold">{formatRupiah(expectedCash)}</span>
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Hitung Uang di Laci (Aktual)</label>
                        <input 
                            type="number" 
                            value={closingCash} 
                            onChange={(e) => setClosingCash(e.target.value)} 
                            className="block w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-3xl font-bold focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all" 
                            placeholder="0" 
                            autoFocus 
                            required 
                        />
                         <div className={`mt-3 flex items-center gap-2 font-bold ${difference === 0 ? 'text-green-600' : 'text-red-500'}`}>
                            <span className="text-sm uppercase">Selisih:</span>
                            <span className="text-lg">{difference > 0 ? '+' : ''}{formatRupiah(difference)}</span>
                        </div>
                    </div>

                    <div className="flex space-x-4 mt-auto">
                        <button type="button" onClick={onCancel} className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors">Batal</button>
                        <button type="submit" className="flex-1 px-6 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-colors shadow-xl">Tutup Shift & Cetak</button>
                    </div>
                </form>

                <div className="hidden md:flex w-2/5 bg-gray-100 border-l border-gray-200 p-8 flex-col items-center justify-center overflow-y-auto">
                    <div className="bg-white shadow-xl p-4 w-full max-w-[320px] rounded-sm transform rotate-1 border-t-8 border-gray-800 shrink-0">
                        <PrintableReceipt shift={tempSummary} profile={storeProfile} variant="shift" />
                    </div>
                    <p className="mt-6 text-gray-400 font-medium text-sm text-center">Preview Struk Laporan</p>
                </div>
            </div>
        </div>
    );
};

const ShiftTransactions = ({ orders, shiftId, theme }: { orders: Order[], shiftId: string, theme: string }) => {
    const shiftOrders = useMemo(() => {
        return orders.filter(o => String(o.shiftId) === String(shiftId)).sort((a, b) => b.createdAt - a.createdAt);
    }, [orders, shiftId]);

    return (
        <div className="p-8">
            <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-700">Daftar Transaksi Shift Ini</h3>
                    <span className={`bg-${theme}-100 text-${theme}-700 px-3 py-1 rounded-full text-xs font-bold`}>{shiftOrders.length} Pesanan</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 text-left">Waktu</th>
                                <th className="px-6 py-3 text-left">Pelanggan</th>
                                <th className="px-6 py-3 text-center">Tipe</th>
                                <th className="px-6 py-3 text-center">Metode</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {shiftOrders.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-400 italic">Belum ada transaksi di shift ini.</td></tr>
                            )}
                            {shiftOrders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500">{new Date(order.createdAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">{order.customerName}</div>
                                        <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">#{order.sequentialId}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-600">{order.orderType}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {order.isPaid ? (
                                            <span className="text-[10px] font-black text-blue-600">{order.paymentMethod}</span>
                                        ) : (
                                            <span className="text-[10px] font-black text-red-400 italic">Unpaid</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900 text-sm">{formatRupiah(order.total)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${order.status === 'completed' ? 'bg-green-100 text-green-700' : (order.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-700')}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ExpenseManagement = ({ theme }: { theme: string }) => {
    // Fix: Added deleteExpense
    const { expenses, addExpense, deleteExpense, activeShift, requestPassword } = useAppContext();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
    if (!activeShift) return null; 
    
    const shiftExpenses = expenses.filter(e => String(e.shiftId) === String(activeShift.id));
    const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if(description && !isNaN(numAmount) && numAmount > 0) {
            setIsAdding(true);
            try {
                await addExpense(description, numAmount);
                setDescription('');
                setAmount('');
            } catch (err) {
                console.error(err);
            } finally {
                setIsAdding(false);
            }
        }
    }

    const handleDelete = (id: number) => {
        requestPassword('Yakin hapus biaya ini?', () => deleteExpense(id));
    }

    return (
         <div className="p-8 animate-fade-in">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <h2 className="text-lg font-bold mb-4 text-gray-800">Input Pengeluaran Operasional</h2>
                 <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                     <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Keterangan</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Contoh: Beli Gas, Es Batu..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-gray-200 outline-none" required disabled={isAdding} />
                     </div>
                     <div className="w-full md:w-48">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nominal</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-gray-200 outline-none font-bold" required disabled={isAdding} />
                     </div>
                     <button 
                        type="submit" 
                        disabled={isAdding}
                        className={`w-full md:w-auto bg-${theme}-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-${theme}-700 transition-all shadow-lg shadow-${theme}-200 flex items-center justify-center gap-2 disabled:bg-gray-400`}
                    >
                        {isAdding ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : '+ Tambah'}
                    </button>
                 </form>
             </div>

             <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-700">Daftar Pengeluaran Shift Ini</h3>
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold italic">Total: {formatRupiah(totalExpenses)}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <tbody className="divide-y divide-gray-100">
                            {shiftExpenses.length === 0 && <tr><td colSpan={3} className="text-center py-12 text-gray-400 italic">Belum ada pengeluaran tercatat di shift ini.</td></tr>}
                            {shiftExpenses.map(expense => (
                                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{expense.description}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 text-right font-mono font-bold">{formatRupiah(expense.amount)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(expense.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Hapus">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
         </div>
    );
}

const ShiftView: React.FC = () => {
    // Fix: Handled missing deleteAndResetShift
    const { orders, activeShift, expenses, closeShift, deleteAndResetShift, requestPassword, startShift, logout, storeProfile, printerDevice, isShiftLoading } = useAppContext();
    const [isCloseModalOpen, setCloseModalOpen] = useState(false);
    const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'transactions' | 'expenses'>('summary');
    
    const theme = storeProfile.themeColor || 'orange';

    const handleConfirmCloseShift = (closingCash: number) => {
        requestPassword('Konfirmasi Tutup Shift', () => {
            const summary = closeShift(closingCash);
            if (summary) {
                setShiftSummary(summary);
                setCloseModalOpen(false);
            }
        });
    };

    if (isShiftLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500"></div>
            </div>
        );
    }

    if (shiftSummary) {
        return (
             <div className="bg-gray-50 h-full overflow-y-auto pb-10">
                <ShiftSummaryDisplay summary={shiftSummary} />
             </div>
        )
    }

    if (!activeShift) {
        return <StartShiftForm onStart={startShift} onLogout={logout} theme={theme} />;
    }

    const shiftOrders = orders.filter(o => String(o.shiftId) === String(activeShift.id) && o.isPaid && o.status !== 'cancelled');
    const cashRevenue = shiftOrders.filter(o => o.paymentMethod === 'Tunai').reduce((sum, o) => sum + (o.total || 0), 0);
    const nonCashRevenue = shiftOrders.filter(o => o.paymentMethod !== 'Tunai').reduce((sum, o) => sum + (o.total || 0), 0);
    const totalRevenue = cashRevenue + nonCashRevenue;

    const currentExpenses = expenses.filter(e => String(e.shiftId) === String(activeShift.id));
    const totalExpenses = currentExpenses.reduce((sum, e) => sum + (item.amount || 0), 0);
    
    return (
        <>
            {isCloseModalOpen && <CloseShiftModal onConfirm={handleConfirmCloseShift} onCancel={() => setCloseModalOpen(false)} activeShift={activeShift} expenses={totalExpenses} storeProfile={storeProfile} orders={orders} />}
            <div className="flex flex-col h-full bg-gray-50">
                <header className="px-8 py-6 bg-white border-b border-gray-100 flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 shadow-sm gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Shift Operational</h1>
                        <p className="text-sm text-gray-500 font-medium">Aktif • Sejak {formatDateTime(activeShift.start)}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                         <div className="bg-gray-100 p-1 rounded-xl flex flex-1 md:flex-none">
                            <button onClick={() => setActiveTab('summary')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'summary' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Ringkasan</button>
                            <button onClick={() => setActiveTab('transactions')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'transactions' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Transaksi</button>
                            <button onClick={() => setActiveTab('expenses')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Biaya</button>
                        </div>
                        <div className="h-8 w-px bg-gray-200 hidden md:block mx-2"></div>
                        <button onClick={() => setCloseModalOpen(true)} className="bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-black transition-all shadow-lg hover:shadow-xl flex items-center gap-2 whitespace-nowrap">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Tutup Shift
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'summary' && (
                        <div className="p-8 max-w-7xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <StatCard 
                                    title="Omzet Bruto" 
                                    value={formatRupiah(totalRevenue)} 
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                    className="border-l-4 border-l-blue-500"
                                />
                                <StatCard 
                                    title="Daftar Transaksi" 
                                    value={shiftOrders.length} 
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                                />
                                <StatCard 
                                    title="Total Pengeluaran" 
                                    value={formatRupiah(totalExpenses)} 
                                    className="border-l-4 border-l-red-500"
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>}
                                />
                                <StatCard 
                                    title="Ekspektasi Kas Fisik" 
                                    value={formatRupiah(activeShift.start_cash + cashRevenue - totalExpenses)} 
                                    className="bg-gray-900 text-white border-gray-900"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-6 uppercase tracking-wider text-sm">Metode Pembayaran Real-time</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-100 rounded-lg text-green-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg></div>
                                                <span className="font-bold text-green-900 text-sm">Uang Tunai (Cash)</span>
                                            </div>
                                            <span className="font-mono font-bold text-green-700 text-lg">{formatRupiah(cashRevenue)}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg></div>
                                                <span className="font-bold text-blue-900 text-sm">Digital (QRIS/EDC)</span>
                                            </div>
                                            <span className="font-mono font-bold text-blue-700 text-lg">{formatRupiah(nonCashRevenue)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-6 uppercase tracking-wider text-sm">Informasi Sesi</h3>
                                    <div className="space-y-4 text-sm font-medium">
                                        <div className="flex justify-between border-b border-gray-50 pb-3">
                                            <span className="text-gray-500">ID Sesi</span>
                                            <span className="font-mono text-xs">{activeShift.id}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-50 pb-3">
                                            <span className="text-gray-500">Buka Oleh</span>
                                            {/* Fix: Handled missing createdBy */}
                                            <span className="font-bold">{activeShift.createdBy || 'System'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-50 pb-3">
                                            <span className="text-gray-500">Modal Kasir Awal</span>
                                            <span className="font-bold">{formatRupiah(activeShift.start_cash)}</span>
                                        </div>
                                        <div className="flex justify-between pt-2">
                                            <span className="text-gray-500">Omzet Bersih (Projected)</span>
                                            <span className="text-green-600 font-black text-lg">{formatRupiah(totalRevenue - totalExpenses)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'transactions' && <ShiftTransactions orders={orders} shiftId={activeShift.id} theme={theme} />}
                    {activeTab === 'expenses' && <ExpenseManagement theme={theme} />}
                </div>
            </div>
        </>
    );
};

const ShiftSummaryDisplay = ({ summary }: { summary: ShiftSummary }) => {
    const [showPreview, setShowPreview] = useState(false);

    return (
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg mx-auto border border-gray-100 mt-10 animate-scale-in">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-black text-gray-900">Shift Selesai</h2>
            <p className="text-gray-500 mt-1 font-medium italic">{formatDateTime(summary.start)} — {formatDateTime(summary.end || Date.now())}</p>
        </div>

        <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-gray-500">Total Omzet</span>
                    <span className="text-xl font-black text-gray-900">{formatRupiah(summary.revenue || 0)}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs text-gray-400 font-bold uppercase tracking-widest">
                    <span>{summary.transactions || 0} Transaksi</span>
                 </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                     <span className="text-[10px] font-black text-green-600 uppercase block mb-1 tracking-widest">Selisih Kas</span>
                     <span className={`text-lg font-black ${(summary.cashDifference || 0) === 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {(summary.cashDifference || 0) > 0 ? '+' : ''}{formatRupiah(summary.cashDifference || 0)}
                     </span>
                </div>
                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                     <span className="text-[10px] font-black text-blue-600 uppercase block mb-1 tracking-widest">Non-Tunai</span>
                     <span className="text-lg font-black text-blue-700">{formatRupiah(summary.nonCashRevenue || 0)}</span>
                </div>
            </div>
        </div>

        <button onClick={() => setShowPreview(true)} className="mt-8 w-full bg-gray-900 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-3 hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            LIHAT BUKTI / CETAK
        </button>
        {showPreview && <ReceiptPreviewModal shift={summary} variant="shift" onClose={() => setShowPreview(false)} />}
    </div>
    );
};

export default ShiftView;
