
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
        if (confirm("Ingin keluar? Pastikan sudah simpan struk.")) {
            onExit();
        }
    };

    // UI Status Mapper
    const getStatusInfo = () => {
        if (liveOrder.status === 'cancelled') return { label: 'PESANAN DIBATALKAN', color: 'bg-red-600' };
        if (liveOrder.status === 'completed') return { label: 'PESANAN SELESAI', color: 'bg-blue-600' };
        if (liveOrder.status === 'ready' || liveOrder.status === 'serving') return { label: 'PESANAN SIAP DISAJIKAN!', color: 'bg-green-600 animate-bounce' };
        if (liveOrder.isPaid) return { label: 'SEDANG DIMASAK', color: 'bg-orange-500' };
        return { label: 'MENUNGGU PEMBAYARAN DI KASIR', color: 'bg-gray-700' };
    };

    const statusInfo = getStatusInfo();

    return (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center font-mono overflow-hidden">
            {/* Real-time Status Header */}
            <div className={`w-full ${statusInfo.color} text-white p-4 text-center font-black text-sm tracking-widest shadow-xl z-10 transition-colors duration-500`}>
                {statusInfo.label}
            </div>

            <div className="flex-1 w-full overflow-y-auto py-6 px-4 flex flex-col items-center custom-scrollbar">
                <div id="receipt-inner-content" ref={receiptRef} className="bg-white w-full max-w-sm rounded-sm shadow-2xl p-6 text-gray-900 border-t-8 border-orange-600 relative flex flex-col items-center mb-8 h-auto shrink-0">
                    <div className="text-center mb-6 w-full">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">BAKSO UJO</h2>
                        <p className="text-[10px] opacity-70">STRUK PESANAN MANDIRI</p>
                        <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
                        <div className="flex justify-between text-[10px] font-bold"><span>WAKTU:</span><span>{new Date(order.createdAt).toLocaleString('id-ID')}</span></div>
                        <div className="flex justify-between text-[10px] font-bold"><span>STATUS:</span><span className="font-black underline uppercase">{liveOrder.status}</span></div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl mb-6 border-2 border-gray-100 flex flex-col items-center">
                        <img src={qrUrl} alt="Order QR" className="w-48 h-48 mb-2 mix-blend-multiply" crossOrigin="anonymous" />
                        <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Tunjukkan ke Kasir</p>
                    </div>

                    <div className="w-full text-sm space-y-4 mb-8">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex flex-col border-b border-gray-50 pb-2">
                                <div className="flex justify-between font-bold items-start"><span className="flex-1 pr-4">{item.quantity}x {item.name}</span><span>{formatRupiah(item.price * item.quantity)}</span></div>
                                {item.note && <p className="text-[10px] italic text-red-500 font-bold ml-2 mt-1">Catatan: {item.note}</p>}
                            </div>
                        ))}
                    </div>
                    <div className="w-full border-t-2 border-black border-double pt-4 mb-6">
                        <div className="flex justify-between text-xl font-black"><span>TOTAL</span><span>{formatRupiah(order.total)}</span></div>
                    </div>
                    <p className="text-[8px] text-gray-400 text-center italic mt-4">Simpan struk ini sebagai bukti pesanan Anda.</p>
                </div>
                
                <div className="w-full max-w-sm flex flex-col gap-3 shrink-0 pb-10">
                    <button onClick={() => saveAsPDF(false)} disabled={isDownloading} className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl border-2 border-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                        {isDownloading ? 'MENYIAPKAN...' : 'SIMPAN KE HP (PDF)'}
                    </button>
                    <button onClick={handleCloseAttempt} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl shadow-2xl transition-all active:scale-95">KEMBALI KE MENU</button>
                </div>
            </div>
        </div>
    );
};

const CustomerOrderView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { menu, categories, customerSubmitOrder, storeProfile, isStoreOpen } = useAppContext();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
    const [activeCategory, setActiveCategory] = useState('All');

    // DETEKSI OTOMATIS NOMOR MEJA SAAT MOUNT
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
            } catch (e) {
                console.error("Gagal dekripsi data meja:", e);
            }
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
                <h2 className="text-3xl font-black mb-4 uppercase italic">Kedai Sedang Tutup</h2>
                <p className="mb-8 text-gray-500">Mohon maaf, kami belum menerima pesanan saat ini.</p>
                <button onClick={onBack} className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black">Kembali</button>
            </div>
        );
    }

    if (submittedOrder) return <DigitalReceipt order={submittedOrder} onExit={onBack} theme="orange" />;

    return (
        <div className="flex flex-col h-[100dvh] bg-orange-50 overflow-hidden">
            <header className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <h1 className="font-black text-xl uppercase italic">Self Order</h1>
            </header>

            <div className="bg-white px-4 py-2 border-b flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
                <button onClick={() => setActiveCategory('All')} className={`px-5 py-2 rounded-full text-xs font-black transition-all ${activeCategory === 'All' ? `bg-orange-600 text-white shadow-md` : 'bg-gray-100 text-gray-500'}`}>SEMUA</button>
                {categories.map(cat => <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-xs font-black transition-all ${activeCategory === cat ? `bg-orange-600 text-white shadow-md` : 'bg-gray-100 text-gray-500'}`}>{cat.toUpperCase()}</button>)}
            </div>

            <main className="flex-1 overflow-y-auto p-4 pb-32">
                <div className="grid grid-cols-2 gap-4">
                    {filteredMenu.map(item => (
                        <div key={item.id} onClick={() => addToCart(item)} className="bg-white rounded-[1.5rem] shadow-sm border p-1 overflow-hidden active:scale-95 transition-all">
                            <div className="h-32 bg-gray-100 rounded-[1.2rem] overflow-hidden">
                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black">?</div>}
                            </div>
                            <div className="p-3">
                                <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight mb-1">{item.name}</h3>
                                <p className="text-orange-600 font-black text-sm mt-1">{formatRupiah(item.price)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {cartCount > 0 && !isCartOpen && (
                <div className="fixed bottom-6 left-6 right-6 z-40">
                    <button onClick={() => setIsCartOpen(true)} className="w-full bg-orange-600 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center ring-4 ring-white transition-all transform active:scale-95">
                        <div className="flex items-center gap-3"><span className="bg-white/20 px-2 py-1 rounded-lg font-black">{cartCount}</span><span className="font-black text-lg">{formatRupiah(cartTotal)}</span></div>
                        <span className="font-bold text-sm">LIHAT PESANAN →</span>
                    </button>
                </div>
            )}

            {isCartOpen && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex flex-col justify-end animate-fade-in">
                    <div className="bg-white rounded-t-[2.5rem] max-h-[90vh] flex flex-col animate-slide-in-up">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Konfirmasi Pesanan</h2>
                            <button onClick={() => setIsCartOpen(false)} className="bg-gray-100 p-2 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl shadow-inner">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {cart.map(item => (
                                <div key={item.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 leading-tight">{item.name}</h4>
                                            <p className="text-xs text-orange-600 font-bold mt-1">{formatRupiah(item.price)}</p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border">
                                            <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 font-black text-red-500 active:bg-red-50 rounded-lg">-</button>
                                            <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 font-black text-green-600 active:bg-green-50 rounded-lg">+</button>
                                        </div>
                                    </div>
                                    {/* Kolom Catatan per Item */}
                                    <div className="mt-2">
                                        <input 
                                            type="text" 
                                            placeholder="Tambah catatan (contoh: pedas, dsb)..." 
                                            value={item.note || ''} 
                                            onChange={e => updateNote(item.id, e.target.value)}
                                            className="w-full bg-white border-b-2 border-gray-200 text-xs p-2 focus:border-orange-500 outline-none rounded-t-lg transition-all italic"
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="space-y-4 mt-6 pt-4 border-t border-dashed border-gray-200">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Data Pemesan</label>
                                    <input value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-gray-100 p-4 rounded-xl font-bold border-2 border-transparent focus:bg-white focus:border-orange-500 transition-all outline-none" placeholder="Nama Lengkap" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Meja</label>
                                    <input value={tableNumber} onChange={e => setTableNumber(e.target.value)} type="text" className="w-full bg-gray-100 p-4 rounded-xl font-bold border-2 border-transparent focus:bg-white focus:border-orange-500 transition-all outline-none" placeholder="Nomor Meja" />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-white border-t shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-gray-400 font-bold">TOTAL BAYAR</span>
                                <span className="text-3xl font-black text-orange-600">{formatRupiah(cartTotal)}</span>
                            </div>
                            <button onClick={handleSubmit} disabled={isSubmitting || !customerName || !tableNumber} className="w-full bg-orange-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl uppercase tracking-widest active:scale-95 disabled:bg-gray-300 disabled:shadow-none transition-all">
                                {isSubmitting ? 'MENGIRIM PESANAN...' : 'PESAN SEKARANG'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerOrderView;
