
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../types';
import type { Order } from '../types';

const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const OrderCard: React.FC<{ order: Order, elapsed: number, isOverdue: boolean, type: 'food' | 'drink', onAction: (id: string, s: any) => void }> = ({ order, elapsed, isOverdue, type, onAction }) => {
    const items = order.items;
    const headerStyle = type === 'food' ? 'bg-amber-500/10 border-amber-400' : 'bg-sky-500/10 border-sky-400';

    return (
        <div className={`bg-gray-800 rounded-2xl shadow-xl w-80 flex-shrink-0 text-gray-300 flex flex-col overflow-hidden border border-gray-700 ${isOverdue ? 'animate-pulse-red' : ''}`}>
            <div className={`p-4 border-b-2 flex justify-between items-center ${headerStyle}`}>
                <div className="font-black text-xl text-white">
                    #{order.sequentialId || '...'} <span className="text-sm font-normal opacity-70">/ {order.customerName}</span>
                </div>
                <div className="text-xs font-black bg-white/20 px-2 py-1 rounded uppercase tracking-widest">{order.orderType}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.map(item => (
                    <div key={item.id} className="flex justify-between items-start bg-white/5 p-3 rounded-xl">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-white">{item.quantity}x</span>
                                <span className="text-lg font-bold leading-tight">{item.name}</span>
                            </div>
                            {item.note && <div className="mt-1 text-red-400 text-sm font-bold bg-red-400/10 px-2 py-1 rounded inline-block">Catatan: {item.note}</div>}
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 bg-black/40 border-t border-gray-700 flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Waktu Tunggu</span>
                    <span className="font-black text-2xl text-white font-mono">{formatTime(elapsed)}</span>
                </div>
                <button 
                    onClick={() => onAction(order.id, order.status === 'pending' ? 'ready' : 'completed')}
                    className={`px-6 py-3 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 ${order.status === 'pending' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {order.status === 'pending' ? 'SIAP!' : 'SELESAI'}
                </button>
            </div>
        </div>
    );
};

const KitchenView: React.FC = () => {
    const { orders, updateOrderStatus, kitchenAlarmTime } = useAppContext();
    const [now, setNow] = useState(Date.now());
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // FILTER PESANAN AKTIF (Hanya yang pending atau ready, bukan completed/cancelled)
    const activeOrders = useMemo(() => {
        return orders.filter(o => o.status === 'pending' || o.status === 'ready')
                     .sort((a, b) => a.createdAt - b.createdAt);
    }, [orders]);

    const historyOrders = useMemo(() => {
        return orders.filter(o => o.status === 'completed' || o.status === 'cancelled')
                     .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    }, [orders]);

    return (
        <div className="bg-[#0f172a] text-white h-full flex flex-col font-sans">
            <header className="p-6 bg-slate-800 shadow-2xl flex justify-between items-center border-b border-slate-700">
                <div className="flex items-center gap-6">
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">Monitor Dapur</h1>
                    <div className="flex bg-black/30 p-1 rounded-2xl">
                        <button onClick={() => setActiveTab('active')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'active' ? 'bg-orange-600 text-white' : 'text-gray-500'}`}>ANTRIAN ({activeOrders.length})</button>
                        <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'history' ? 'bg-orange-600 text-white' : 'text-gray-500'}`}>RIWAYAT</button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-x-auto p-6">
                {activeTab === 'active' ? (
                    <div className="flex items-start gap-6 h-full">
                        {activeOrders.length === 0 ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                <p className="text-2xl font-black uppercase tracking-widest">Belum ada pesanan</p>
                            </div>
                        ) : (
                            activeOrders.map(order => (
                                <OrderCard 
                                    key={order.id} 
                                    order={order} 
                                    elapsed={now - order.createdAt} 
                                    isOverdue={(now - order.createdAt) / 1000 > kitchenAlarmTime} 
                                    type={order.items.every(i => i.category === 'Minuman') ? 'drink' : 'food'} 
                                    onAction={updateOrderStatus}
                                />
                            ))
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {historyOrders.map(order => (
                            <div key={order.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 opacity-60">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-black text-white">#{order.sequentialId}</span>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${order.status === 'completed' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{order.status}</span>
                                </div>
                                <div className="text-sm font-bold text-gray-300 truncate mb-2">{order.customerName}</div>
                                <div className="space-y-1">
                                    {order.items.map(i => <div key={i.id} className="text-xs text-gray-500">{i.quantity}x {i.name}</div>)}
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-700 text-[10px] text-slate-500 flex justify-between uppercase font-black">
                                    <span>Selesai: {order.completedAt ? new Date(order.completedAt).toLocaleTimeString() : '-'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default KitchenView;
