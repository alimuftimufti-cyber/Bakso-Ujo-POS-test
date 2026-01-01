
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../types'; 
import type { MenuItem, CartItem, Order, OrderType } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const DigitalReceipt = ({ order, onExit, theme }: { order: Order, onExit: () => void, theme: string }) => {
    const { orders } = useAppContext();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Sinkronisasi status real-time dari database
    const liveOrder = useMemo(() => {
        return orders.find(o => o.id === order.id) || order;
    }, [orders, order]);

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${order.id}`;

    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            window.history.pushState(null, '', window.location.href);
            handleCloseAttempt();
        };
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const saveAsPDF = async (shouldExit: boolean = false) => {
        if (!receiptRef.current) return;
        setIsDownloading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            const element = receiptRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true,
                allowTaint: true,
                scrollY: -window.scrollY,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [80, Math.max(120, (canvas.height * 80) / canvas.width)]
            });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width);
            pdf.save(`Struk-BaksoUjo-${order.id.slice(-6)}.pdf`);
            if (shouldExit) setTimeout(onExit, 1000);
        } catch (err) {
            alert("Gagal simpan PDF. Silakan screenshot layar.");
            if (shouldExit) onExit();
        } finally { setIsDownloading(false); }
    };

    const handleCloseAttempt = () => {
        if (confirm("Ingin keluar? Status pesanan tidak akan terpantau lagi.")) {
            onExit();
        }
    };

    // UI Status Mapper
    const getStatusConfig = () => {
        switch (liveOrder.status) {
            case 'pending': 
                return { label: 'MENUNGGU ANTRIAN DAPUR', color: 'bg-slate-600', icon: '🕒', step: 1 };
            case 'ready': 
                return { label: 'PESANAN SEDANG DIMASAK', color: 'bg-orange-500 animate-pulse', icon: '🔥', step: 2 };
            case 'serving': 
                return { label: 'PESANAN SIAP DISAJIKAN!', color: 'bg-green-600 animate-bounce', icon: '✅', step: 3 };
            case 'completed': 
                return { label: 'PESANAN SELESAI', color: 'bg-blue-600', icon: '⭐', step: 4 };
            case 'cancelled': 
                return { label: 'PESANAN DIBATALKAN', color: 'bg-red-600', icon: '❌', step: 0 };
            default: 
                return { label: 'MEMPROSES...', color: 'bg-gray-400', icon: '⌛', step: 1 };
        }
    };

    const status = getStatusConfig();

    return (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center font-sans overflow-hidden">
            {/* 1. Header Status Real-time */}
            <div className={`w-full ${status.color} text-white p-5 text-center shadow-xl z-10 transition-colors duration-500`}>
                <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">{status.icon}</span>
                    <span className="font-black text-sm tracking-widest uppercase">{status.label}</span>
                </div>
            </div>

            {/* 2. Progres Tracker (Visual) */}
            <div className="w-full bg-slate-800 px-6 py-4 border-b border-white/5 flex justify-between items-center">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex flex-col items-center flex-1 relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all duration-500 ${status.step >= s ? 'bg-orange-500 text-white scale-110 shadow-lg shadow-orange-500/50' : 'bg-slate-700 text-slate-500'}`}>
                            {s === 1 ? '👨‍🍳' : s === 2 ? '🔥' : '🍲'}
                        </div>
                        <span className={`text-[8px] mt-2 font-bold uppercase tracking-tighter ${status.step >= s ? 'text-orange-400' : 'text-slate-600'}`}>
                            {s === 1 ? 'Antri' : s === 2 ? 'Masak' : 'Siap'}
                        </span>
                        {s < 3 && <div className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 ${status.step > s ? 'bg-orange-500' : 'bg-slate-700'}`}></div>}
                    </div>
                ))}
            </div>

            <div className="flex-1 w-full overflow-y-auto py-6 px-4 flex flex-col items-center custom-scrollbar">
                <div id="receipt-inner-content" ref={receiptRef} className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-gray-900 border-t-8 border-orange-600 relative flex flex-col items-center mb-8 h-auto shrink-0 animate-scale-in">
                    <div className="text-center mb-6 w-full">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-1 italic">BAKSO UJO</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {order.id.slice(-8)}</p>
                        <div className="border-b-2 border-dashed border-gray-200 my-4"></div>
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-gray-400 uppercase">Waktu Pesan</span>
                            <span>{new Date(order.createdAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold mt-1">
                            <span className="text-gray-400 uppercase">Meja / Nama</span>
                            <span>{liveOrder.customerName}</span>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-2xl mb-6 border-2 border-gray-100 flex flex-col items-center w-full">
                        <img src={qrUrl} alt="Order QR" className="w-40 h-40 mb-2 mix-blend-multiply" crossOrigin="anonymous" />
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest text-center">Scan di kasir jika ingin bayar tunai</p>
                    </div>

                    <div className="w-full space-y-4 mb-8">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase border-b pb-1">Daftar Pesanan</h4>
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex flex-col">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 pr-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm text-gray-800">{item.quantity}x</span>
                                            <span className="font-bold text-sm text-gray-700">{item.name}</span>
                                        </div>
                                        {item.note && (
                                            <div className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded mt-1 inline-block italic">
                                                Note: {item.note}
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-black text-sm text-gray-900">{formatRupiah(item.price * item.quantity)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="w-full border-t-2 border-black pt-4 mb-4">
                        <div className="flex justify-between text-xl font-black italic">
                            <span>TOTAL</span>
                            <span className="text-orange-600">{formatRupiah(order.total)}</span>
                        </div>
                    </div>
                    
                    <div className="w-full bg-orange-50 p-3 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wide">Status Pembayaran</p>
                        <p className={`font-black text-xs mt-0.5 ${liveOrder.isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                            {liveOrder.isPaid ? '✅ SUDAH LUNAS' : '⌛ BELUM DIBAYAR'}
                        </p>
                    </div>
                </div>
                
                <div className="w-full max-w-sm flex flex-col gap-3 shrink-0 pb-10">
                    <button onClick={() => saveAsPDF(false)} disabled={isDownloading} className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl border-2 border-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                        {isDownloading ? 'MENYIAPKAN...' : '💾 SIMPAN STRUK (PDF)'}
                    </button>
                    <button onClick={handleCloseAttempt} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl shadow-2xl transition-all active:scale-95">KEMBALI KE MENU</button>
                </div>
            </div>
        </div>
    );
};

const CustomerOrderView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { menu, categories, customerSubmitOrder, isStoreOpen } = useAppContext();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        const table = params.get('table');

        if (q) {
            try {
                const decoded = atob(q);
                const parts = decoded.split('|');
                parts.forEach(p => {
                    const [k, v] = p.split(':');
                    if (k === 'T') setTableNumber(v);
                });
            } catch (e) { console.error(e); }
        } else if (table) {
            setTableNumber(table);
        }
    }, []);

    const filteredMenu = useMemo(() => menu.filter(item => (activeCategory === 'All' || item.category === activeCategory)), [menu, activeCategory]);
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const addToCart = (item: MenuItem) => {
        if (item.stock !== undefined && item.stock <= 0) { alert(`Maaf, ${item.name} habis.`); return; }
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { ...item, quantity: 1, note: '' }];
        });
    };

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
    };

    const updateNote = (id: number, note: string) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, note } : i));
    };

    const handleSubmit = async () => {
        if (!customerName || !tableNumber) { alert("Isi Nama dan Nomor Meja."); return; }
        if (cart.length === 0) return;
        setIsSubmitting(true);
        const orderResult = await customerSubmitOrder(cart, `${customerName} (Meja ${tableNumber})`);
        setIsSubmitting(false);
        if (orderResult) { setSubmittedOrder(orderResult); setCart([]); }
        else { alert("Gagal kirim pesanan."); }
    };

    if (!isStoreOpen) {
        return (
            <div className="min-h-[100dvh] bg-orange-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 text-4xl">😴</div>
                <h2 className="text-3xl font-black mb-4 uppercase italic">Kedai Sedang Tutup</h2>
                <p className="mb-8 text-gray-500 font-medium">Mohon maaf, kasir kami sedang istirahat. Silakan kembali lagi nanti.</p>
                <button onClick={onBack} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black shadow-lg">KEMBALI KE BERANDA</button>
            </div>
        );
    }

    if (submittedOrder) return <DigitalReceipt order={submittedOrder} onExit={onBack} theme="orange" />;

    return (
        <div className="flex flex-col h-[100dvh] bg-orange-50 overflow-hidden font-sans">
            <header className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-orange-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="font-black text-xl uppercase italic tracking-tighter">Self Order</h1>
                </div>
                <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-200">
                    Meja: {tableNumber || '??'}
                </div>
            </header>

            <div className="bg-white px-4 py-3 border-b flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
                <button onClick={() => setActiveCategory('All')} className={`px-5 py-2 rounded-full text-[10px] font-black transition-all border-2 ${activeCategory === 'All' ? `bg-orange-600 text-white border-orange-600 shadow-lg` : 'bg-gray-50 text-gray-400 border-gray-100'}`}>SEMUA</button>
                {categories.map(cat => <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-[10px] font-black transition-all border-2 ${activeCategory === cat ? `bg-orange-600 text-white border-orange-600 shadow-lg` : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{cat.toUpperCase()}</button>)}
            </div>

            <main className="flex-1 overflow-y-auto p-4 pb-32">
                <div className="grid grid-cols-2 gap-4">
                    {filteredMenu.map(item => (
                        <div key={item.id} onClick={() => addToCart(item)} className="bg-white rounded-3xl shadow-sm border p-1 overflow-hidden active:scale-95 transition-all group">
                            <div className="h-36 bg-gray-100 rounded-[1.4rem] overflow-hidden relative">
                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={item.name} /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black">?</div>}
                                {item.stock !== undefined && item.stock <= 5 && item.stock > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">SISA {item.stock}</span>}
                            </div>
                            <div className="p-3">
                                <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight h-10">{item.name}</h3>
                                <p className="text-orange-600 font-black text-base mt-1">{formatRupiah(item.price)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {cartCount > 0 && !isCartOpen && (
                <div className="fixed bottom-6 left-6 right-6 z-40 animate-slide-in-up">
                    <button onClick={() => setIsCartOpen(true)} className="w-full bg-gray-900 text-white p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex justify-between items-center ring-4 ring-white transition-all transform active:scale-95">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-600 w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg">{cartCount}</div>
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Total Belanja</p>
                                <p className="font-black text-lg leading-none mt-1">{formatRupiah(cartTotal)}</p>
                            </div>
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest bg-white/10 px-4 py-2 rounded-lg">Review →</span>
                    </button>
                </div>
            )}

            {isCartOpen && (
                <div className="fixed inset-0 bg-black/70 z-[60] flex flex-col justify-end animate-fade-in backdrop-blur-sm">
                    <div className="bg-white rounded-t-[2.5rem] max-h-[90vh] flex flex-col animate-slide-in-up shadow-2xl">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50 rounded-t-[2.5rem]">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                                <span className="bg-orange-600 w-2 h-8 rounded-full"></span>
                                Cek Pesanan
                            </h2>
                            <button onClick={() => setIsCartOpen(false)} className="bg-white p-2 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl shadow-md border">&times;</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {cart.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-3xl border-2 border-gray-100 shadow-sm transition-all hover:border-orange-200">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 text-base leading-tight">{item.name}</h4>
                                            <p className="text-xs text-orange-600 font-black mt-1">{formatRupiah(item.price)}</p>
                                        </div>
                                        <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-2xl border shadow-inner">
                                            <button onClick={() => updateQty(item.id, -1)} className="w-9 h-9 font-black text-red-500 bg-white shadow-sm rounded-xl active:bg-red-50">-</button>
                                            <span className="font-black text-base w-5 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQty(item.id, 1)} className="w-9 h-9 font-black text-green-600 bg-white shadow-sm rounded-xl active:bg-green-50">+</button>
                                        </div>
                                    </div>
                                    
                                    <div className="relative group">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Catatan: pedas / tanpa sayur..." 
                                            value={item.note || ''} 
                                            onChange={e => updateNote(item.id, e.target.value)}
                                            className="w-full bg-gray-50 border-2 border-transparent border-b-gray-200 text-xs pl-9 pr-4 py-3 rounded-xl focus:bg-orange-50/50 focus:border-orange-200 outline-none transition-all font-bold italic text-gray-600"
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-dashed border-gray-200">
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Identitas</label>
                                    <input value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold border-2 border-gray-100 focus:bg-white focus:border-orange-500 transition-all outline-none shadow-inner" placeholder="Nama Anda" />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Nomor Meja</label>
                                    <input value={tableNumber} onChange={e => setTableNumber(e.target.value)} type="text" className="w-full bg-gray-50 p-4 rounded-2xl font-black text-center border-2 border-gray-100 focus:bg-white focus:border-orange-500 transition-all outline-none shadow-inner text-xl" placeholder="00" />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-white border-t-2 border-gray-50 shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-between items-center mb-8 px-2">
                                <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">Estimasi Bayar</span>
                                <span className="text-3xl font-black text-orange-600 tracking-tighter">{formatRupiah(cartTotal)}</span>
                            </div>
                            <button onClick={handleSubmit} disabled={isSubmitting || !customerName || !tableNumber} className="w-full bg-orange-600 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-orange-200 uppercase tracking-widest active:scale-95 disabled:bg-gray-300 disabled:shadow-none transition-all flex items-center justify-center gap-3">
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>MENGIRIM...</span>
                                    </>
                                ) : 'PESAN & LIHAT PROGRES'}
                            </button>
                            <p className="text-[9px] text-gray-400 text-center mt-4 font-bold uppercase tracking-widest">Pesanan akan masuk antrian dapur setelah dikirim</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerOrderView;
