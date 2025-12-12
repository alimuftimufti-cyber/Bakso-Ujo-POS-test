import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../types';
import type { Order, CartItem, Category } from '../types';

const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const MotivationTicker = ({ messages }: { messages: string[] }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (messages.length === 0) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % messages.length);
        }, 8000); // Change message every 8 seconds
        return () => clearInterval(interval);
    }, [messages]);

    if (messages.length === 0) return null;

    return (
        <div className="bg-gray-900 border-t border-gray-800 p-2 overflow-hidden relative">
            <div key={index} className="text-center text-amber-400 font-bold text-lg animate-fade-in transition-all duration-500">
                {messages[index]}
            </div>
        </div>
    );
};

const OrderCard: React.FC<{ order: Order, elapsed: number, isOverdue: boolean, type: 'food' | 'drink', onPrint: (o: Order) => void }> = ({ order, elapsed, isOverdue, type, onPrint }) => {
    const mainFoodItems = order.items.filter(item => !['Minuman', 'Kriuk', 'Tambahan'].includes(item.category));
    const addOnItems = order.items.filter(item => ['Kriuk', 'Tambahan'].includes(item.category));
    const drinkItems = order.items.filter(item => item.category === 'Minuman');

    const headerStyle = type === 'food' 
        ? 'bg-amber-500/10 border-amber-400' 
        : 'bg-sky-500/10 border-sky-400';

    return (
        <div className={`bg-gray-800 rounded-lg shadow-md w-72 flex-shrink-0 text-gray-300 flex flex-col ${isOverdue ? 'animate-pulse-red' : ''}`}>
            <div className={`p-3 border-b-2 flex justify-between items-center ${headerStyle}`}>
                <div className="font-bold text-lg text-white">
                    #{order.sequentialId || order.id.slice(-4)} - {order.customerName}
                </div>
                <button onClick={() => onPrint(order)} className="text-gray-400 hover:text-white p-1 rounded" title="Cetak Tiket Dapur">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
                {mainFoodItems.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-amber-300 border-b border-gray-700/50 mb-2 pb-1">Makanan</h4>
                        <div className="space-y-2">
                        {mainFoodItems.map(item => (
                            <div key={item.id} className="flex justify-between items-start">
                                <div>
                                    <span className="font-semibold text-white">{item.quantity}x</span> {item.name}
                                </div>
                                {item.note && <div className="text-right text-xs text-red-400 italic pl-2">*{item.note}</div>}
                            </div>
                        ))}
                        </div>
                    </div>
                )}
                 {addOnItems.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-gray-400 border-b border-gray-700/50 mb-2 pb-1">Tambahan & Kriuk</h4>
                        <div className="space-y-2">
                        {addOnItems.map(item => (
                            <div key={item.id} className="flex justify-between items-start">
                                <div>
                                    <span className="font-semibold text-white">{item.quantity}x</span> {item.name}
                                </div>
                                {item.note && <div className="text-right text-xs text-red-400 italic pl-2">*{item.note}</div>}
                            </div>
                        ))}
                        </div>
                    </div>
                )}
                 {drinkItems.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sky-300 border-b border-gray-700/50 mb-2 pb-1">Minuman</h4>
                        <div className="space-y-2">
                        {drinkItems.map(item => (
                            <div key={item.id} className="flex justify-between items-start">
                                <div>
                                    <span className="font-semibold text-white">{item.quantity}x</span> {item.name}
                                </div>
                                {item.note && <div className="text-right text-xs text-red-400 italic pl-2">*{item.note}</div>}
                            </div>
                        ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="p-3 bg-gray-900/50 border-t border-gray-700 flex justify-between items-center">
                <span className="font-bold text-lg text-white">{formatTime(elapsed)}</span>
                <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    );
};

const HistoryOrderCard: React.FC<{ order: Order }> = ({ order }) => {
    const mainFoodItems = order.items.filter(item => !['Minuman', 'Kriuk', 'Tambahan'].includes(item.category));
    const addOnItems = order.items.filter(item => ['Kriuk', 'Tambahan'].includes(item.category));
    const drinkItems = order.items.filter(item => item.category === 'Minuman');

    // Calculate duration
    const endTime = order.readyAt || order.completedAt || Date.now();
    const durationMs = endTime - order.createdAt;

    return (
    <div className="bg-gray-800 rounded-lg shadow-md text-gray-300 flex flex-col border border-gray-700 h-full">
        <div className={`p-3 border-b-2 flex justify-between items-center ${order.status === 'ready' ? 'border-blue-500' : 'border-green-500'}`}>
            <div className="font-bold text-white">
                #{order.sequentialId || order.id.slice(-4)} - {order.customerName}
            </div>
            <div className={`text-sm font-semibold px-2 py-1 rounded-full ${order.status === 'ready' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                {order.status === 'ready' ? 'Siap' : 'Selesai'}
            </div>
        </div>
        <div className="flex-1 p-3 space-y-3 text-sm overflow-y-auto">
                {mainFoodItems.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-amber-300 border-b border-gray-700/50 mb-2 pb-1">Makanan</h4>
                        <div className="space-y-1">
                        {mainFoodItems.map(item => (
                            <div key={item.id} className="flex justify-between items-start">
                                <div><span className="font-semibold text-white">{item.quantity}x</span> {item.name}</div>
                                {item.note && <div className="text-right text-xs text-red-400 italic pl-2">*{item.note}</div>}
                            </div>
                        ))}
                        </div>
                    </div>
                )}
                {addOnItems.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-gray-400 border-b border-gray-700/50 mb-2 pb-1">Tambahan & Kriuk</h4>
                        <div className="space-y-1">
                        {addOnItems.map(item => (
                            <div key={item.id} className="flex justify-between items-start">
                                <div><span className="font-semibold text-white">{item.quantity}x</span> {item.name}</div>
                                {item.note && <div className="text-right text-xs text-red-400 italic pl-2">*{item.note}</div>}
                            </div>
                        ))}
                        </div>
                    </div>
                )}
                 {drinkItems.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sky-300 border-b border-gray-700/50 mb-2 pb-1">Minuman</h4>
                        <div className="space-y-1">
                        {drinkItems.map(item => (
                             <div key={item.id} className="flex justify-between items-start">
                                <div><span className="font-semibold text-white">{item.quantity}x</span> {item.name}</div>
                                {item.note && <div className="text-right text-xs text-red-400 italic pl-2">*{item.note}</div>}
                            </div>
                        ))}
                        </div>
                    </div>
                )}
        </div>
        <div className="p-3 bg-gray-900/50 border-t border-gray-700 flex justify-between items-center text-xs">
             <div className="flex items-center gap-1 text-gray-400" title="Durasi Pengerjaan">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="font-mono font-bold">{formatTime(durationMs)}</span>
            </div>
            <span>{new Date(endTime).toLocaleString('id-ID')}</span>
        </div>
    </div>
)};


const KitchenView: React.FC = () => {
    const { orders, updateOrderStatus, kitchenAlarmTime, kitchenAlarmSound, previewReceipt, logout, storeProfile } = useAppContext();
    const [now, setNow] = useState(Date.now());
    const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
    const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [alarmInterval, setAlarmInterval] = useState<number | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const { foodOrders, drinkOrders, historyOrders } = useMemo(() => {
        const pending = orders.filter(o => o.status === 'pending').sort((a, b) => a.createdAt - b.createdAt);
        const drinkOnlyOrders = pending.filter(o => o.items.every(item => item.category === 'Minuman'));
        const foodAndMixedOrders = pending.filter(o => o.items.some(item => item.category !== 'Minuman'));
        const history = orders.filter(o => ['ready', 'completed'].includes(o.status)).sort((a, b) => (b.readyAt || b.completedAt || 0) - (a.readyAt || a.completedAt || 0));
        return { foodOrders: foodAndMixedOrders, drinkOrders: drinkOnlyOrders, historyOrders: history.slice(0, 50) };
    }, [orders]);


    const isAnyOrderOverdue = useMemo(() => {
        const allPending = [...foodOrders, ...drinkOrders];
        return allPending.some(order => (now - order.createdAt) / 1000 > kitchenAlarmTime);
    }, [foodOrders, drinkOrders, now, kitchenAlarmTime]);

    // Reset mute if no orders are overdue
    useEffect(() => {
        if (!isAnyOrderOverdue) setIsMuted(false);
    }, [isAnyOrderOverdue]);

    const playBeep = () => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (kitchenAlarmSound === 'beep') {
            osc.type = 'sine';
            osc.frequency.value = 1000;
        } else if (kitchenAlarmSound === 'ring') {
            osc.type = 'triangle';
            osc.frequency.value = 800;
        } else if (kitchenAlarmSound === 'bell') {
            osc.type = 'square';
            osc.frequency.value = 600;
        } else {
            return; // None
        }

        gain.gain.value = 0.1;
        osc.start();
        osc.stop(ctx.currentTime + 0.3); // 300ms beep
    };

    useEffect(() => {
        if (isAnyOrderOverdue && kitchenAlarmSound !== 'none' && !isMuted) {
            if (!alarmInterval) {
                // Play immediately then interval
                playBeep();
                const id = window.setInterval(playBeep, 2000); // Beep every 2 seconds
                setAlarmInterval(id);
                setIsAlarmPlaying(true);
            }
        } else {
            if (alarmInterval) {
                clearInterval(alarmInterval);
                setAlarmInterval(null);
                setIsAlarmPlaying(false);
            }
        }
        
        return () => {
            if (alarmInterval) clearInterval(alarmInterval);
        }
    }, [isAnyOrderOverdue, kitchenAlarmSound, isMuted, alarmInterval]);

    const stopAlarm = () => setIsMuted(true);

    const handlePrint = (order: Order) => {
        previewReceipt(order, 'kitchen');
    };

    const TabButton = ({ tab, label }: { tab: 'queue' | 'history', label: string }) => (
        <button onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-semibold ${activeTab === tab ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-400'}`}>
            {label} ({tab === 'queue' ? foodOrders.length + drinkOrders.length : historyOrders.length})
        </button>
    );

    return (
        <div className="bg-gray-900 text-white h-full flex flex-col">
            <header className="p-4 bg-gray-800 shadow-md flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">Monitor Dapur</h1>
                    {isAlarmPlaying && (
                        <button onClick={stopAlarm} className="bg-red-600 text-white font-bold py-1.5 px-3 rounded-lg flex items-center space-x-2 text-sm">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 5.636a9 9 0 0112.728 0m-12.728 0a9 9 0 010 12.728" /></svg>
                            <span>Matikan Alarm</span>
                        </button>
                    )}
                </div>
                <button onClick={logout} className="flex items-center gap-2 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Logout
                </button>
            </header>

            <div className="border-b border-gray-700 px-4 flex-shrink-0">
                <TabButton tab="queue" label="Antrian" />
                <TabButton tab="history" label="Riwayat" />
            </div>

            <main className="flex-1 overflow-y-auto">
                {activeTab === 'queue' && (
                    <div className="p-4 h-full flex flex-col">
                        {(foodOrders.length === 0 && drinkOrders.length === 0) && (
                            <div className="w-full flex flex-col items-center justify-center h-full">
                                <p className="text-gray-400 text-xl font-medium">Semua pesanan selesai! 🎉</p>
                                <p className="text-gray-600 text-sm mt-2">Istirahat sejenak sambil menunggu pesanan baru.</p>
                            </div>
                        )}
                        
                        {foodOrders.length > 0 && (
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-amber-300 mb-3">
                                    Makanan
                                    <span className="text-base font-medium text-gray-400 ml-2">({foodOrders.length})</span>
                                </h2>
                                <div className="flex items-start space-x-4 pb-4 overflow-x-auto">
                                    {foodOrders.map(order => {
                                        const elapsed = now - order.createdAt;
                                        const isOverdue = elapsed / 1000 > kitchenAlarmTime;
                                        return (
                                            <div key={order.id} className="flex flex-col">
                                                <OrderCard order={order} elapsed={elapsed} isOverdue={isOverdue} type="food" onPrint={handlePrint} />
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'ready')}
                                                    className="mt-2 w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                    Pesanan Siap
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {drinkOrders.length > 0 && (
                             <div>
                                <h2 className="text-xl font-bold text-sky-300 mb-3 pt-4 border-t border-gray-700">
                                    Minuman
                                    <span className="text-base font-medium text-gray-400 ml-2">({drinkOrders.length})</span>
                                </h2>
                                <div className="flex items-start space-x-4 pb-4 overflow-x-auto">
                                     {drinkOrders.map(order => {
                                        const elapsed = now - order.createdAt;
                                        const isOverdue = elapsed / 1000 > kitchenAlarmTime;
                                        return (
                                            <div key={order.id} className="flex flex-col">
                                                <OrderCard order={order} elapsed={elapsed} isOverdue={isOverdue} type="drink" onPrint={handlePrint} />
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'ready')}
                                                    className="mt-2 w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                    Pesanan Siap
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>
                )}
                {activeTab === 'history' && (
                     <div className="w-full h-full text-gray-300 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {historyOrders.map(order => (
                            <HistoryOrderCard key={order.id} order={order} />
                        ))}
                        </div>
                     </div>
                )}
            </main>
            
            {/* Customizable Motivation Banner */}
            <MotivationTicker messages={storeProfile.kitchenMotivations || []} />
        </div>
    );
};

export default KitchenView;