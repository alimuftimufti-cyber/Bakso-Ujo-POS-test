
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../types';
import type { Order, Category, CartItem, ShiftSummary } from '../types';
import ReceiptPreviewModal from './ReceiptPreviewModal';

const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
const formatDateTime = (timestamp: number) => new Date(timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

type SortKey = 'name' | 'quantity' | 'revenue';
type SortDirection = 'asc' | 'desc';

const StatCard = ({ title, value, className }: { title: string, value: string | number, className?: string }) => (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 ${className}`}>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
        <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
    </div>
);

const chartColors = [
    'bg-indigo-500', 'bg-blue-500', 'bg-sky-500', 'bg-cyan-500', 
    'bg-teal-500', 'bg-emerald-500', 'bg-green-500', 'bg-lime-500',
    'bg-yellow-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500'
];

const SalesChart = ({ orders }: { orders: Order[] }) => {
    const dataByDay = useMemo(() => {
        const sales: { [key: string]: number } = {};
        const validOrders = orders.filter(o => o.isPaid && o.status !== 'cancelled');
        
        validOrders.forEach(order => {
            const date = new Date(order.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            if (!sales[date]) sales[date] = 0;
            sales[date] += order.total;
        });
        
        // Return sorted by date
        return Object.entries(sales)
            .map(([label, value]) => ({ label, value }))
            .sort((a,b) => {
                // Heuristic sort, ideally we use original timestamp
                return 0; 
            }).slice(-7);
    }, [orders]);

    if (dataByDay.length === 0) {
       return (<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 md:col-span-2 flex items-center justify-center h-80">
            <p className="text-gray-400 font-medium">Belum ada data penjualan pada periode ini.</p>
        </div>)
    }

    const maxValue = Math.max(...dataByDay.map(d => d.value), 1);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Tren Penjualan (Harian)</h3>
            <div className="flex justify-around items-end h-64 space-x-3 pt-4 border-t border-dashed border-gray-100">
                {dataByDay.map(({ label, value }, index) => {
                    const colorClass = chartColors[index % chartColors.length];
                    const heightPercent = Math.max((value / maxValue) * 100, 5);
                    
                    return (
                        <div key={label} className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer relative">
                            <div className="absolute -top-10 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                                {formatRupiah(value)}
                            </div>
                            <div className={`w-full max-w-[32px] rounded-t-lg transition-all duration-300 hover:opacity-80 ${colorClass}`} style={{ height: `${heightPercent}%` }}></div>
                            <div className="text-[10px] font-bold text-gray-400 mt-3 uppercase tracking-tighter">{label}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const TopProducts = ({ orders, categories }: { orders: Order[], categories: Category[] }) => {
    const [sortKey, setSortKey] = useState<SortKey>('quantity');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [selectedCat, setSelectedCat] = useState<Category | 'All'>('All');

    const sortedTopProducts = useMemo(() => {
        const productSales: { [key: string]: { id: number, name: string, quantity: number, revenue: number, category: string } } = {};
        const validOrders = orders.filter(o => o.isPaid && o.status !== 'cancelled');

        validOrders.forEach(order => {
            order.items.forEach(item => {
                if (selectedCat !== 'All' && item.category !== selectedCat) return;

                if (!productSales[item.id]) {
                    productSales[item.id] = { id: item.id, name: item.name, quantity: 0, revenue: 0, category: item.category };
                }
                productSales[item.id].quantity += item.quantity;
                productSales[item.id].revenue += item.price * item.quantity;
            });
        });

        const sorted = Object.values(productSales).sort((a: any, b: any) => {
            if (a[sortKey] < b[sortKey]) return sortDirection === 'asc' ? -1 : 1;
            if (a[sortKey] > b[sortKey]) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [orders, sortKey, sortDirection, selectedCat]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    };
    
    const SortableHeader = ({ tkey, label, align='right' }: { tkey: SortKey, label: string, align?: 'left'|'right' }) => {
        const isSorted = sortKey === tkey;
        return (
             <th onClick={() => handleSort(tkey)} className={`text-${align} text-[10px] font-black text-gray-400 uppercase py-4 cursor-pointer hover:text-gray-700 transition-colors tracking-widest`}>
                {label} {isSorted ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </th>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Performa Produk Terlaris</h3>
                <select 
                    value={selectedCat} 
                    onChange={e => setSelectedCat(e.target.value)} 
                    className="border-2 border-gray-100 bg-gray-50 rounded-xl text-xs font-bold p-3 outline-none focus:border-black transition-all"
                >
                    <option value="All">Semua Kategori</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            
            {sortedTopProducts.length === 0 ? (
                <div className="text-gray-400 text-center py-20 font-bold uppercase tracking-widest bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">Data Tidak Ditemukan</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="border-b border-gray-100">
                            <tr>
                                <SortableHeader tkey="name" label="Nama Menu" align="left" />
                                <SortableHeader tkey="quantity" label="Jml Terjual" />
                                <SortableHeader tkey="revenue" label="Total Omzet" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sortedTopProducts.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="py-4 pr-4">
                                        <div className="font-bold text-gray-800 text-sm">{p.name}</div>
                                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{p.category}</div>
                                    </td>
                                    <td className="py-4 text-right">
                                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-black">{p.quantity}</span>
                                    </td>
                                    <td className="py-4 text-right text-gray-900 font-black text-sm">{formatRupiah(p.revenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const CategorySales = ({ orders, categories }: { orders: Order[], categories: Category[] }) => {
    const categorySales = useMemo(() => {
        const sales: { [key: string]: number } = {};
        categories.forEach(cat => sales[cat] = 0);
        const validOrders = orders.filter(o => o.isPaid && o.status !== 'cancelled');

        validOrders.forEach(order => {
            order.items.forEach(item => {
                const cat = item.category || 'Lainnya';
                if (!sales[cat]) sales[cat] = 0;
                sales[cat] += item.quantity * item.price;
            });
        });
        return Object.entries(sales).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [orders, categories]);
    
    const total = categorySales.reduce((sum, cat) => sum + cat.value, 0);
    if(total === 0) return <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center h-full"><p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Data Kategori Kosong</p></div>;

    const colors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4', '#6366f1'];

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-6">Omzet Per Kategori</h3>
             <div className="flex flex-col space-y-5">
                {categorySales.filter(c => c.value > 0).map((c, i) => {
                    const percent = (c.value / total) * 100;
                    return (
                        <div key={c.name} className="group">
                            <div className="flex justify-between text-xs font-bold mb-2">
                                <span className="text-gray-600 uppercase tracking-tighter">{c.name}</span>
                                <span className="text-gray-900">{percent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-50 rounded-full h-2.5 overflow-hidden border border-gray-100">
                                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${percent}%`, backgroundColor: colors[i % colors.length] }}></div>
                            </div>
                            <div className="text-[10px] text-gray-400 font-black mt-1 uppercase">{formatRupiah(c.value)}</div>
                        </div>
                    );
                })}
             </div>
        </div>
    )
}

const ShiftHistory = ({ shifts }: { shifts: ShiftSummary[] }) => {
    const [selectedShift, setSelectedShift] = useState<ShiftSummary | null>(null);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 col-span-full">
            <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Riwayat Tutup Buku (Shift)</h3>
            </div>
            {shifts.length === 0 ? (
                <div className="p-20 text-gray-400 text-center font-bold uppercase tracking-widest italic">Belum Ada Riwayat Shift</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left">Waktu Mulai</th>
                                <th className="px-6 py-4 text-left">Waktu Selesai</th>
                                <th className="px-6 py-4 text-right">Total Omzet</th>
                                <th className="px-6 py-4 text-right">Selisih Kas</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {shifts.map(shift => (
                                <tr key={shift.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-gray-700">{formatDateTime(shift.start)}</td>
                                    <td className="px-6 py-4 font-bold text-gray-700">{formatDateTime(shift.end || 0)}</td>
                                    <td className="px-6 py-4 text-right font-black text-gray-900">{formatRupiah(shift.revenue)}</td>
                                    <td className={`px-6 py-4 text-right font-black ${shift.cashDifference && shift.cashDifference < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {shift.cashDifference && shift.cashDifference > 0 ? '+' : ''}{formatRupiah(shift.cashDifference || 0)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => setSelectedShift(shift)}
                                            className="text-white bg-gray-900 hover:bg-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg transition-all shadow-md active:scale-95"
                                        >
                                            Buka Struk
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {selectedShift && <ReceiptPreviewModal shift={selectedShift} variant="shift" onClose={() => setSelectedShift(null)} />}
        </div>
    );
};


const ReportView: React.FC = () => {
    const { orders, categories, completedShifts, storeProfile } = useAppContext();
    const [endDate, setEndDate] = useState(new Date());
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 6);
        return date;
    });
    const [activeTab, setActiveTab] = useState<'sales' | 'shifts'>('sales');

    const theme = storeProfile.themeColor || 'orange';

    const setDateRange = (type: 'today' | 'week' | 'month') => {
        const end = new Date();
        const start = new Date();
        if (type === 'today') { start.setHours(0,0,0,0); } 
        else if (type === 'week') start.setDate(start.getDate() - 6);
        else if (type === 'month') start.setMonth(start.getMonth() - 1);
        
        setStartDate(start);
        setEndDate(end);
    };

    const ordersInDateRange = useMemo(() => {
        const startTimestamp = startDate.setHours(0,0,0,0);
        const endTimestamp = endDate.setHours(23,59,59,999);
        
        return orders.filter(o => 
            o.createdAt >= startTimestamp && 
            o.createdAt <= endTimestamp
        );
    }, [orders, startDate, endDate]);

    const reportData = useMemo(() => {
        const validOrders = ordersInDateRange.filter(o => o.isPaid && o.status !== 'cancelled');
        return validOrders.reduce((acc, order) => {
            acc.revenue += order.total;
            acc.transactions += 1;
            acc.totalDiscount += order.discount;
            if (order.paymentMethod === 'Tunai') acc.cashRevenue += order.total;
            else acc.nonCashRevenue += order.total;
            acc.totalTax += order.taxAmount || 0;
            acc.totalService += order.serviceChargeAmount || 0;
            return acc;
        }, { revenue: 0, transactions: 0, cashRevenue: 0, nonCashRevenue: 0, totalDiscount: 0, totalTax: 0, totalService: 0 });
    }, [ordersInDateRange]);

    return (
        <div className="flex flex-col h-full bg-gray-50 font-sans">
            <header className="px-8 py-6 bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">Analytics Dashboard</h1>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Laporan Operasional & Penjualan</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                         <div className="bg-gray-100 p-1 rounded-2xl flex">
                            <button onClick={() => setActiveTab('sales')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'sales' ? 'bg-white shadow-lg text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Penjualan</button>
                            <button onClick={() => setActiveTab('shifts')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'shifts' ? 'bg-white shadow-lg text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Data Shift</button>
                        </div>
                        
                        {activeTab === 'sales' && (
                            <div className="flex items-center gap-2 bg-white border-2 border-gray-100 p-1 rounded-2xl shadow-sm">
                                <div className="flex items-center px-3 gap-3">
                                     <input type="date" value={startDate.toISOString().split('T')[0]} onChange={e => setStartDate(new Date(e.target.value))} className="text-xs font-black text-gray-700 bg-transparent outline-none cursor-pointer uppercase"/>
                                     <span className="text-gray-300 font-black">TO</span>
                                     <input type="date" value={endDate.toISOString().split('T')[0]} onChange={e => setEndDate(new Date(e.target.value))} className="text-xs font-black text-gray-700 bg-transparent outline-none cursor-pointer uppercase"/>
                                </div>
                                <div className="h-8 w-px bg-gray-100 mx-1"></div>
                                <button onClick={() => setDateRange('today')} className="px-4 py-2 text-[10px] font-black text-gray-500 hover:bg-gray-50 rounded-xl uppercase tracking-widest">Today</button>
                                <button onClick={() => setDateRange('week')} className="px-4 py-2 text-[10px] font-black text-gray-500 hover:bg-gray-50 rounded-xl uppercase tracking-widest">Week</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            
            <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
                {activeTab === 'sales' ? (
                    <div className="max-w-7xl mx-auto space-y-8 pb-20">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Omzet Bersih (Lunas)" value={formatRupiah(reportData.revenue)} className="border-l-8 border-l-blue-600" />
                            <StatCard title="Total Transaksi" value={reportData.transactions} />
                            <StatCard title="Rata-rata Struk" value={reportData.transactions > 0 ? formatRupiah(reportData.revenue / reportData.transactions) : formatRupiah(0)} />
                            <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-center">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pajak & Service</h3>
                                <p className="text-xl font-black text-blue-400">{formatRupiah(reportData.totalTax + reportData.totalService)}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <SalesChart orders={ordersInDateRange} />
                            <CategorySales orders={ordersInDateRange} categories={categories} />
                        </div>

                        <TopProducts orders={ordersInDateRange} categories={categories} />
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto pb-20">
                        <ShiftHistory shifts={completedShifts} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportView;
