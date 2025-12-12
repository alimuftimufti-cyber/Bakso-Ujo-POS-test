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
        orders.forEach(order => {
            if (!order.completedAt) return;
            const date = new Date(order.completedAt).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit' });
            if (!sales[date]) sales[date] = 0;
            sales[date] += order.total;
        });
        return Object.entries(sales).map(([label, value]) => ({ label, value })).reverse();
    }, [orders]);

    if (dataByDay.length === 0) {
       return (<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 md:col-span-2 flex items-center justify-center h-80">
            <p className="text-gray-400 font-medium">Belum ada data penjualan.</p>
        </div>)
    }

    const maxValue = Math.max(...dataByDay.map(d => d.value), 1);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Tren Omzet Harian</h3>
            <div className="flex justify-around items-end h-64 space-x-3 pt-4 border-t border-dashed border-gray-100">
                {dataByDay.map(({ label, value }, index) => {
                    const colorClass = chartColors[index % chartColors.length];
                    const heightPercent = Math.max((value / maxValue) * 100, 5); // min 5% height
                    
                    return (
                        <div key={label} className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer relative">
                            {/* Tooltip */}
                            <div className="absolute -top-10 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                                {formatRupiah(value)}
                            </div>
                            <div className={`w-full max-w-[40px] rounded-t-lg transition-all duration-300 hover:opacity-80 ${colorClass}`} style={{ height: `${heightPercent}%` }}></div>
                            <div className="text-xs font-bold text-gray-500 mt-3">{label}</div>
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
        orders.forEach(order => {
            order.items.forEach(item => {
                if (selectedCat !== 'All' && item.category !== selectedCat) return;

                if (!productSales[item.id]) {
                    productSales[item.id] = { id: item.id, name: item.name, quantity: 0, revenue: 0, category: item.category };
                }
                productSales[item.id].quantity += item.quantity;
                productSales[item.id].revenue += item.price * item.quantity;
            });
        });

        const sorted = Object.values(productSales).sort((a, b) => {
            if (a[sortKey] < b[sortKey]) return sortDirection === 'asc' ? -1 : 1;
            if (a[sortKey] > b[sortKey]) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted.slice(0, 50); // Limit list
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
             <th onClick={() => handleSort(tkey)} className={`text-${align} text-xs font-bold text-gray-400 uppercase py-3 cursor-pointer hover:text-gray-700 transition-colors`}>
                {label} {isSorted ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </th>
        );
    }


    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 md:col-span-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
                <h3 className="text-lg font-bold text-gray-800">Performa Produk</h3>
                <select 
                    value={selectedCat} 
                    onChange={e => setSelectedCat(e.target.value)} 
                    className="border border-gray-200 bg-gray-50 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-gray-200"
                >
                    <option value="All">Semua Kategori</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            
            {sortedTopProducts.length === 0 ? (
                <div className="text-gray-400 text-center py-10 font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">Tidak ada data untuk kategori ini.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="border-b border-gray-100">
                            <tr>
                                <SortableHeader tkey="name" label="Nama Produk" align="left" />
                                <SortableHeader tkey="quantity" label="Terjual" />
                                <SortableHeader tkey="revenue" label="Omzet" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sortedTopProducts.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 pr-4">
                                        <div className="font-bold text-gray-800 text-sm">{p.name}</div>
                                        <div className="text-[10px] text-gray-400 font-medium uppercase">{p.category}</div>
                                    </td>
                                    <td className="py-3 text-right text-gray-600 font-mono text-sm">{p.quantity}</td>
                                    <td className="py-3 text-right text-gray-800 font-bold text-sm">{formatRupiah(p.revenue)}</td>
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
        orders.forEach(order => {
            order.items.forEach(item => {
                if (sales[item.category] === undefined) sales[item.category] = 0;
                sales[item.category] += item.quantity * item.price;
            });
        });
        return Object.entries(sales).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [orders, categories]);
    
    const total = categorySales.reduce((sum, cat) => sum + cat.value, 0);
    if(total === 0) return <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center h-full"><p className="text-gray-400 font-medium">Data kosong.</p></div>;

    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#f59e0b', '#10b981', '#06b6d4'];

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-gray-800 mb-6">Omzet Kategori</h3>
             <div className="flex flex-col space-y-4">
                {categorySales.filter(c => c.value > 0).map((c, i) => {
                    const percent = (c.value / total) * 100;
                    return (
                        <div key={c.name} className="relative group">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold text-gray-700">{c.name}</span>
                                <span className="font-bold text-gray-900">{percent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: colors[i % colors.length] }}></div>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{formatRupiah(c.value)}</div>
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-full">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Riwayat Tutup Buku (Shift)</h3>
            {shifts.length === 0 ? (
                <p className="text-gray-400 text-center py-8 font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">Belum ada riwayat shift yang tersimpan.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-gray-500">Mulai</th>
                                <th className="px-4 py-3 text-left font-bold text-gray-500">Selesai</th>
                                <th className="px-4 py-3 text-right font-bold text-gray-500">Omzet</th>
                                <th className="px-4 py-3 text-right font-bold text-gray-500">Selisih</th>
                                <th className="px-4 py-3 text-center font-bold text-gray-500">Bukti</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {shifts.slice().reverse().map(shift => (
                                <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 font-medium text-gray-700">{formatDateTime(shift.start)}</td>
                                    <td className="px-4 py-4 font-medium text-gray-700">{formatDateTime(shift.end || 0)}</td>
                                    <td className="px-4 py-4 text-right font-bold text-gray-900">{formatRupiah(shift.revenue)}</td>
                                    <td className={`px-4 py-4 text-right font-bold ${shift.cashDifference && shift.cashDifference < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {formatRupiah(shift.cashDifference || 0)}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <button 
                                            onClick={() => setSelectedShift(shift)}
                                            className="text-gray-600 hover:text-black font-bold text-xs border border-gray-200 bg-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all"
                                        >
                                            Lihat Struk
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
    const { orders, categories, completedShifts } = useAppContext();
    const [endDate, setEndDate] = useState(new Date());
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 6);
        return date;
    });
    const [activeTab, setActiveTab] = useState<'sales' | 'shifts'>('sales');

    const setDateRange = (type: 'today' | 'week' | 'month') => {
        const end = new Date();
        const start = new Date();
        if (type === 'today') { /* no op, start is now */ } 
        else if (type === 'week') start.setDate(start.getDate() - 6);
        else if (type === 'month') start.setMonth(start.getMonth() - 1);
        
        if (type === 'today') start.setHours(0,0,0,0);
        
        setStartDate(start);
        setEndDate(end);
    };

    const completedOrdersInDateRange = useMemo(() => {
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        const startTimestamp = startOfDay.getTime();

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        const endTimestamp = endOfDay.getTime();
        
        return orders.filter(o => 
            o.status === 'completed' && 
            o.completedAt && 
            o.completedAt >= startTimestamp && 
            o.completedAt <= endTimestamp
        );
    }, [orders, startDate, endDate]);

    const reportData = useMemo(() => {
        return completedOrdersInDateRange.reduce((acc, order) => {
            acc.revenue += order.total;
            acc.transactions += 1;
            acc.totalDiscount += order.discount;
            if (order.paymentMethod === 'Tunai') acc.cashRevenue += order.total;
            else acc.nonCashRevenue += order.total;
            
            // New Tax & Service Calc
            acc.totalTax += order.taxAmount || 0;
            acc.totalService += order.serviceChargeAmount || 0;

            return acc;
        }, { revenue: 0, transactions: 0, cashRevenue: 0, nonCashRevenue: 0, totalDiscount: 0, totalTax: 0, totalService: 0 });
    }, [completedOrdersInDateRange]);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header with Filters */}
            <header className="px-8 py-6 bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Business Analytics</h1>
                        <p className="text-sm text-gray-500 font-medium">Pantau performa bisnis Anda secara real-time.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                         <div className="bg-gray-100 p-1 rounded-xl flex shrink-0">
                            <button onClick={() => setActiveTab('sales')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'sales' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Penjualan</button>
                            <button onClick={() => setActiveTab('shifts')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'shifts' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Riwayat Shift</button>
                        </div>
                        
                        {activeTab === 'sales' && (
                            <div className="flex items-center gap-2 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                                <div className="flex items-center px-2 gap-2">
                                     <input type="date" value={startDate.toISOString().split('T')[0]} onChange={e => setStartDate(new Date(e.target.value))} className="text-sm font-bold text-gray-700 bg-transparent outline-none cursor-pointer"/>
                                     <span className="text-gray-400 font-bold">-</span>
                                     <input type="date" value={endDate.toISOString().split('T')[0]} onChange={e => setEndDate(new Date(e.target.value))} className="text-sm font-bold text-gray-700 bg-transparent outline-none cursor-pointer"/>
                                </div>
                                <div className="h-6 w-px bg-gray-200"></div>
                                <button onClick={() => setDateRange('today')} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg">Hari Ini</button>
                                <button onClick={() => setDateRange('week')} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg">7 Hari</button>
                                <button onClick={() => setDateRange('month')} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg">30 Hari</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            
            <div className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'sales' ? (
                    <div className="max-w-7xl mx-auto space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Total Omzet (Net)" value={formatRupiah(reportData.revenue)} className="border-l-4 border-l-indigo-500" />
                            <StatCard title="Transaksi" value={reportData.transactions} />
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase">Pajak</h3>
                                    <p className="text-lg font-black text-gray-800">{formatRupiah(reportData.totalTax)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase">Service</h3>
                                    <p className="text-lg font-black text-gray-800">{formatRupiah(reportData.totalService)}</p>
                                </div>
                            </div>

                            <StatCard title="Rata-rata Basket" value={reportData.transactions > 0 ? formatRupiah(reportData.revenue / reportData.transactions) : formatRupiah(0)} />
                        </div>
                        
                        {/* Charts Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <SalesChart orders={completedOrdersInDateRange} />
                            <CategorySales orders={completedOrdersInDateRange} categories={categories} />
                        </div>

                        {/* Top Products Table */}
                        <TopProducts orders={completedOrdersInDateRange} categories={categories} />
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto">
                        <ShiftHistory shifts={completedShifts} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportView;