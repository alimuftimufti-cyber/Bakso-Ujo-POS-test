
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../types'; 
import type { MenuItem, CartItem, Order, OrderType } from '../types';

const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const DigitalReceipt = ({ order, onExit, theme }: { order: Order, onExit: () => void, theme: string }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${order.id}`;

    // Trap back button
    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            // Push state back so they can't go back
            window.history.pushState(null, '', window.location.href);
            handleCloseAttempt();
        };
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const handleCloseAttempt = () => {
        if (confirm("Yakin ingin keluar dari struk ini? \nPastikan Anda sudah menyimpan/screenshot QR Code pesanan Anda.")) {
            // "Otomatis" download simulasi via print atau direct screenshot logic
            // Karena download otomatis murni butuh library eksternal untuk konversi DOM ke Image secara reliable,
            // kita gunakan browser print trigger yang paling user-friendly untuk "Save as PDF/Image"
            onExit();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 z-[100] flex flex-col items-center overflow-y-auto p-4 md:p-10 font-mono">
            <div ref={receiptRef} className="bg-white w-full max-w-sm rounded-sm shadow-2xl p-6 text-gray-900 border-t-8 border-orange-600 relative overflow-hidden flex flex-col items-center">
                {/* Receipt Header */}
                <div className="text-center mb-6 w-full">
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">BAKSO UJO</h2>
                    <p className="text-[10px] opacity-70">STRUK PESANAN MANDIRI</p>
                    <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
                    <div className="flex justify-between text-[10px] font-bold">
                        <span>WAKTU:</span>
                        <span>{new Date(order.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                        <span>ID:</span>
                        <span className="truncate ml-4">#{order.id}</span>
                    </div>
                </div>

                {/* QR Code Section */}
                <div className="bg-gray-50 p-4 rounded-xl mb-6 border-2 border-gray-100 flex flex-col items-center">
                    <img src={qrUrl} alt="Order QR" className="w-48 h-48 mb-2 mix-blend-multiply" />
                    <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest animate-pulse">Tunjukkan ke Kasir</p>
                </div>

                {/* Order Details */}
                <div className="w-full text-sm space-y-3 mb-6">
                    <p className="text-xs font-bold text-center bg-gray-900 text-white py-1 rounded uppercase tracking-widest">{order.customerName}</p>
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex flex-col border-b border-gray-100 pb-2">
                            <div className="flex justify-between font-bold">
                                <span>{item.quantity}x {item.name}</span>
                                <span>{formatRupiah(item.price * item.quantity)}</span>
                            </div>
                            {item.note && <p className="text-[10px] italic text-red-500 font-bold ml-4 leading-tight">"Catatan: {item.note}"</p>}
                        </div>
                    ))}
                </div>

                {/* Total */}
                <div className="w-full border-t-2 border-black border-double pt-4">
                    <div className="flex justify-between text-xl font-black">
                        <span>TOTAL</span>
                        <span>{formatRupiah(order.total)}</span>
                    </div>
                </div>

                <p className="text-[10px] mt-8 text-center text-gray-400 font-bold italic">Terima kasih atas pesanan Anda!</p>
                
                {/* Zigzag bottom effect mockup */}
                <div className="absolute bottom-0 left-0 right-0 flex overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="w-4 h-4 bg-gray-900 -mb-2 rotate-45 shrink-0"></div>
                    ))}
                </div>
            </div>

            {/* Receipt Actions (Floating) */}
            <div className="mt-8 flex gap-3 w-full max-w-sm">
                <button onClick={() => window.print()} className="flex-1 bg-white/20 hover:bg-white/30 text-white font-black py-4 rounded-2xl border-2 border-white/20 transition-all flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    SIMPAN STRUK
                </button>
                <button onClick={handleCloseAttempt} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all">
                    SELESAI / TUTUP
                </button>
            </div>
        </div>
    );
};

const CustomerOrderView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { menu, categories, customerSubmitOrder, storeProfile } = useAppContext();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
    const [activeCategory, setActiveCategory] = useState('All');

    const filteredMenu = useMemo(() => {
        return menu.filter(item => (activeCategory === 'All' || item.category === activeCategory));
    }, [menu, activeCategory]);

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const addToCart = (item: MenuItem) => {
        if (item.stock !== undefined && item.stock <= 0) {
            alert(`Maaf, ${item.name} sedang habis.`);
            return;
        }

        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                if (item.stock !== undefined && existing.quantity >= item.stock) {
                    alert(`Maaf, stok ${item.name} hanya tersisa ${item.stock} porsi.`);
                    return prev;
                }
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1, note: '' }];
        });
    };

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.id === id) {
                const menuItem = menu.find(m => m.id === id);
                const newQty = i.quantity + delta;
                if (delta > 0 && menuItem?.stock !== undefined && newQty > menuItem.stock) {
                    alert(`Stok tidak mencukupi.`);
                    return i;
                }
                return { ...i, quantity: Math.max(0, newQty) };
            }
            return i;
        }).filter(i => i.quantity > 0));
    };

    const updateNote = (id: number, note: string) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, note } : i));
    };

    const handleSubmit = async () => {
        if (!customerName || !tableNumber) { alert("Mohon isi Nama dan Nomor Meja."); return; }
        if (cart.length === 0) return;
        
        setIsSubmitting(true);
        // FIX: No longer needs 'as Order' because customerSubmitOrder now correctly returns Promise<Order | null>
        const orderResult = await customerSubmitOrder(cart, `${customerName} (Meja ${tableNumber})`);
        setIsSubmitting(false);
        
        if (orderResult) {
            setSubmittedOrder(orderResult);
            setCart([]);
        } else {
            alert("Gagal mengirim pesanan. Pastikan koneksi internet aktif.");
        }
    };

    // TAMPILKAN STRUK DIGITAL SETELAH BERHASIL
    if (submittedOrder) {
        return <DigitalReceipt order={submittedOrder} onExit={onBack} theme="orange" />;
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-orange-50 overflow-hidden font-sans">
            {/* Header */}
            <header className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <div>
                    <h1 className="font-black text-xl text-gray-900 tracking-tighter uppercase italic">Bakso Ujo</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Self-Ordering System</p>
                </div>
            </header>

            {/* Filter Kategori */}
            <div className="bg-white px-4 py-2 border-b flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar shadow-sm">
                <button onClick={() => setActiveCategory('All')} className={`px-5 py-2 rounded-full text-xs font-black transition-all ${activeCategory === 'All' ? `bg-orange-600 text-white shadow-lg` : 'bg-gray-100 text-gray-500'}`}>SEMUA</button>
                {categories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-xs font-black transition-all ${activeCategory === cat ? `bg-orange-600 text-white shadow-lg` : 'bg-gray-100 text-gray-500'}`}>{cat.toUpperCase()}</button>
                ))}
            </div>

            {/* Daftar Menu */}
            <main className="flex-1 overflow-y-auto p-4 pb-32">
                <div className="grid grid-cols-2 gap-4">
                    {filteredMenu.map(item => {
                        const isSoldOut = item.stock !== undefined && item.stock <= 0;
                        return (
                            <div key={item.id} onClick={() => !isSoldOut && addToCart(item)} className={`bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden active:scale-95 transition-all flex flex-col relative ${isSoldOut ? 'opacity-70 grayscale cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}`}>
                                {isSoldOut && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                        <div className="bg-red-600 text-white font-black text-xs px-4 py-2 rounded-full shadow-2xl transform -rotate-12 uppercase tracking-widest border-2 border-white">SOLD OUT</div>
                                    </div>
                                )}
                                <div className="h-32 bg-gray-200 relative">
                                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-2xl">?</div>}
                                    {!isSoldOut && item.stock !== undefined && item.stock < 10 && (
                                        <div className="absolute bottom-2 right-2 bg-orange-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Sisa {item.stock}</div>
                                    )}
                                </div>
                                <div className="p-3 flex flex-col flex-1">
                                    <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">{item.name}</h3>
                                    <p className={`text-orange-600 font-black text-sm mt-auto`}>{formatRupiah(item.price)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Keranjang Mengambang */}
            {cartCount > 0 && !isCartOpen && (
                <div className="fixed bottom-6 left-6 right-6 z-40 animate-slide-in-up">
                    <button onClick={() => setIsCartOpen(true)} className="w-full bg-orange-600 text-white p-4 rounded-2xl shadow-[0_10px_30px_rgba(234,88,12,0.4)] flex justify-between items-center ring-4 ring-white">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center font-black">{cartCount}</div>
                            <div className="text-left leading-none">
                                <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Keranjang</p>
                                <p className="text-lg font-black">{formatRupiah(cartTotal)}</p>
                            </div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                </div>
            )}

            {/* Overlay Keranjang Detail */}
            {isCartOpen && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex flex-col justify-end animate-fade-in">
                    <div className="bg-white rounded-t-[2.5rem] max-h-[90vh] flex flex-col overflow-hidden animate-slide-in-up">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Detail Pesanan</h2>
                            <button onClick={() => setIsCartOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {cart.map(item => (
                                <div key={item.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-inner">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex-1 pr-4">
                                            <h4 className="font-bold text-gray-800 leading-tight">{item.name}</h4>
                                            <p className="text-xs text-orange-600 font-black">{formatRupiah(item.price)}</p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                                            <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center font-black text-red-500">-</button>
                                            <span className="font-black w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center font-black text-green-600">+</button>
                                        </div>
                                    </div>
                                    {/* FIX: INPUT CATATAN PER ITEM */}
                                    <div className="relative">
                                        <input 
                                            value={item.note} 
                                            onChange={e => updateNote(item.id, e.target.value)} 
                                            placeholder="Tambah catatan (cth: tidak pedas)..." 
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold focus:ring-1 focus:ring-orange-500 outline-none italic"
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="pt-2 space-y-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nama Pemesan</label>
                                    <input value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-4 font-bold outline-none focus:border-orange-500 transition-all" placeholder="Nama Anda" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nomor Meja</label>
                                    <input value={tableNumber} onChange={e => setTableNumber(e.target.value)} type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-4 font-bold outline-none focus:border-orange-500 transition-all" placeholder="Nomor Meja" />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Total Bayar</span>
                                <span className="text-3xl font-black text-orange-600 tracking-tighter">{formatRupiah(cartTotal)}</span>
                            </div>
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting || cart.length === 0}
                                className="w-full bg-orange-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-orange-200 uppercase tracking-widest text-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-gray-300"
                            >
                                {isSubmitting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : 'PESAN SEKARANG'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerOrderView;
