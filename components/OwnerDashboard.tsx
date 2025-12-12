
import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../types';

const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const OwnerDashboard: React.FC = () => {
    const { 
        storeProfile, 
        branches, 
        switchBranch, 
        orders, 
        completedShifts,
        activeShift
    } = useAppContext();

    // Check if running in offline mode (simplified check for demo purposes)
    // In a real app, this would check the firebase connection state from context
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    
    useEffect(() => {
        // Simple check: if we are using the placeholder API Key, we are definitely offline/local only
        // This is a heuristic for the demo environment
        // @ts-ignore
        const isConfigured = true; // Assume true for UI unless specific check fails
        // In real implementation, check firebase.apps.length
    }, []);

    // -- ANALYTICS FOR CURRENT SELECTED BRANCH --
    const stats = useMemo(() => {
        // Today's Stats
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        
        const todaysOrders = orders.filter(o => o.createdAt >= startOfDay.getTime());
        const revenueToday = todaysOrders.reduce((acc, o) => acc + (o.status !== 'cancelled' ? o.total : 0), 0);
        const pendingCount = todaysOrders.filter(o => o.status === 'pending').length;
        const completedCount = todaysOrders.filter(o => o.status === 'completed' || o.status === 'ready').length;
        
        // Month Stats (Simple projection from completed shifts + active)
        const currentMonthRevenue = completedShifts.reduce((acc, s) => acc + s.revenue, 0) + (activeShift?.revenue || 0);

        return { revenueToday, pendingCount, completedCount, currentMonthRevenue, totalOrdersToday: todaysOrders.length };
    }, [orders, completedShifts, activeShift]);

    const activeBranchName = branches.find(b => b.id === storeProfile.branchId)?.name || 'Unknown Branch';

    return (
        // FIX: Changed min-h-full to h-full overflow-y-auto to allow scrolling inside the layout
        <div className="bg-slate-900 h-full overflow-y-auto text-slate-100 p-6 lg:p-10 font-sans custom-scrollbar">
            <div className="max-w-7xl mx-auto pb-20">
                {/* TOP HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white mb-1 flex items-center gap-3">
                            <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-transparent bg-clip-text">COMMAND CENTER</span>
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">SUPER ADMIN</span>
                        </h1>
                        <p className="text-slate-400 text-sm">Monitoring operasional real-time & manajemen multi-cabang.</p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-xl">
                        <div className="px-4">
                            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Cabang Terpantau</p>
                            <p className="font-bold text-white text-lg">{activeBranchName}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-700"></div>
                        <div className="px-4 text-right">
                            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Status Shift</p>
                            <div className="flex items-center gap-2 justify-end">
                                <span className={`w-2 h-2 rounded-full ${activeShift ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                <p className={`font-bold ${activeShift ? 'text-emerald-400' : 'text-red-400'}`}>{activeShift ? 'OPEN' : 'CLOSED'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warning Banner for Offline Mode */}
                <div className="bg-blue-900/50 border border-blue-800 p-4 rounded-xl mb-8 flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h4 className="font-bold text-blue-100 text-sm">Info Database (Firebase)</h4>
                        <p className="text-xs text-blue-300 mt-1">
                            Aplikasi menggunakan database Firebase (Google Cloud) untuk sinkronisasi pesanan antar HP. Layanan ini <strong>Gratis (Spark Plan)</strong> untuk UMKM.
                            <br/>
                            Jika belum dikonfigurasi, aplikasi berjalan dalam <strong>Mode Offline</strong> (Data tersimpan di perangkat ini saja).
                        </p>
                    </div>
                </div>

                {/* BRANCH SELECTOR CARDS */}
                <div className="mb-10">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Pilih Cabang untuk Dipantau</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {branches.map(branch => {
                            const isActive = storeProfile.branchId === branch.id;
                            return (
                                <button 
                                    key={branch.id}
                                    onClick={() => switchBranch(branch.id)}
                                    className={`group relative p-5 rounded-2xl border text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl
                                        ${isActive 
                                            ? 'bg-gradient-to-br from-indigo-600 to-blue-700 border-indigo-500 shadow-lg shadow-indigo-900/50' 
                                            : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400 group-hover:text-white'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                        </div>
                                        {isActive && <span className="bg-white text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Live View</span>}
                                    </div>
                                    <h4 className={`font-bold text-lg mb-1 ${isActive ? 'text-white' : 'text-slate-200'}`}>{branch.name}</h4>
                                    <p className={`text-xs ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>{branch.id}</p>
                                </button>
                            );
                        })}
                        <div className="p-5 rounded-2xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors cursor-pointer min-h-[140px]">
                            <span className="text-2xl mb-2">+</span>
                            <span className="text-sm font-bold">Tambah Cabang</span>
                            <span className="text-xs mt-1">(via Settings)</span>
                        </div>
                    </div>
                </div>

                {/* LIVE ANALYTICS (SELECTED BRANCH) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Key Metrics */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm relative overflow-hidden">
                                <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500"></div>
                                <p className="text-slate-400 text-xs font-bold uppercase mb-2">Omzet Hari Ini</p>
                                <p className="text-3xl font-black text-white">{formatRupiah(stats.revenueToday)}</p>
                                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11.586 10l3.293-3.293H12z" clipRule="evenodd" /></svg>
                                    Updated Real-time
                                </p>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm relative overflow-hidden">
                                <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
                                <p className="text-slate-400 text-xs font-bold uppercase mb-2">Total Transaksi</p>
                                <p className="text-3xl font-black text-white">{stats.totalOrdersToday}</p>
                                <p className="text-xs text-blue-400 mt-2">{stats.completedCount} Selesai</p>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm relative overflow-hidden">
                                <div className="absolute right-0 top-0 h-full w-1 bg-amber-500"></div>
                                <p className="text-slate-400 text-xs font-bold uppercase mb-2">Antrian Dapur</p>
                                <p className="text-3xl font-black text-white">{stats.pendingCount}</p>
                                <p className="text-xs text-amber-400 mt-2">Perlu perhatian</p>
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
                            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                                <h3 className="font-bold text-white">Log Aktivitas Terkini</h3>
                                <span className="text-xs text-slate-500">{activeBranchName}</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                {orders.slice(0, 8).map(order => (
                                    <div key={order.id} className="p-4 border-b border-slate-700/50 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : (order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500')}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-white">{order.customerName || 'Pelanggan'}</p>
                                                <p className="text-xs text-slate-400">Ord #{order.sequentialId} • {order.items.length} Item</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-white">{formatRupiah(order.total)}</p>
                                            <p className={`text-[10px] font-bold uppercase ${order.status === 'completed' ? 'text-emerald-500' : (order.status === 'cancelled' ? 'text-red-500' : 'text-blue-500')}`}>{order.status}</p>
                                        </div>
                                    </div>
                                ))}
                                {orders.length === 0 && <div className="p-8 text-center text-slate-500">Belum ada aktivitas hari ini.</div>}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Quick Status & Month */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-lg">
                            <h3 className="font-bold text-slate-300 text-sm mb-4 uppercase tracking-wider">Akumulasi Bulan Ini</h3>
                            <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-2">
                                {formatRupiah(stats.currentMonthRevenue)}
                            </p>
                            <p className="text-xs text-slate-500 mb-6">Total omzet tercatat dari shift yang sudah ditutup + shift aktif.</p>
                            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '75%' }}></div>
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-slate-400">
                                <span>Progress Target</span>
                                <span>75%</span>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <h3 className="font-bold text-white mb-4">Quick Links</h3>
                            <div className="space-y-3">
                                <button disabled className="w-full text-left p-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors flex items-center gap-3 opacity-50 cursor-not-allowed">
                                    <span className="bg-slate-600 p-1.5 rounded text-white">📊</span> Download Laporan Excel (Coming Soon)
                                </button>
                                <button disabled className="w-full text-left p-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors flex items-center gap-3 opacity-50 cursor-not-allowed">
                                    <span className="bg-slate-600 p-1.5 rounded text-white">⚙️</span> Konfigurasi Global (Coming Soon)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;
