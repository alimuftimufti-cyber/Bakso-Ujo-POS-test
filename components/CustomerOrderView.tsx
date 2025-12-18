
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../types'; 
import type { MenuItem, CartItem, OrderType } from '../types';

const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const CustomerOrderView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { menu, categories, customerSubmitOrder, storeProfile, isStoreOpen } = useAppContext();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOrderSuccess, setIsOrderSuccess] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');

    const theme = storeProfile.themeColor || 'orange';

    const filteredMenu = useMemo(() => {
        return menu.filter(item => (activeCategory === 'All' || item.category === activeCategory));
    }, [menu, activeCategory]);

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { ...item, quantity: 1, note: '' }];
        });
    };

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
    };

    const handleSubmit = async () => {
        if (!customerName || !tableNumber) { alert("Mohon isi Nama dan Nomor Meja."); return; }
        if (cart.length === 0) return;
        
        setIsSubmitting(true);
        const success = await customerSubmitOrder(cart, `${customerName} (Meja ${tableNumber})`);
        setIsSubmitting(false);
        
        if (success) {
            setIsOrderSuccess(true);
            setCart([]);
        } else {
            alert("Gagal mengirim pesanan. Pastikan koneksi internet aktif.");
        }
    };

    if (isOrderSuccess) {
        return (
            <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 text-center">
                <div className={`w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-2">PESANAN TERKIRIM!</h2>
                <p className="text-gray-500 mb-8">Dapur kami sedang menyiapkan pesanan Anda. Silakan tunggu di meja.</p>
                <button onClick={onBack} className={`w-full max-w-xs bg-gray-900 text-white font-black py-4 rounded-2xl shadow-xl`}>Kembali ke Menu Utama</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-gray-50 overflow-hidden font-sans">
            {/* Mobile Header */}
            <header className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <div>
                    <h1 className="font-black text-xl text-gray-900 tracking-tighter uppercase">{storeProfile.name}</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Self-Ordering System</p>
                </div>
            </header>

            {/* Category Filter */}
            <div className="bg-white px-4 py-2 border-b flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
                <button onClick={() => setActiveCategory('All')} className={`px-5 py-2 rounded-full text-xs font-black transition-all ${activeCategory === 'All' ? `bg-${theme}-600 text-white shadow-lg` : 'bg-gray-100 text-gray-500'}`}>SEMUA</button>
                {categories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-xs font-black transition-all ${activeCategory === cat ? `bg-${theme}-600 text-white shadow-lg` : 'bg-gray-100 text-gray-500'}`}>{cat.toUpperCase()}</button>
                ))}
            </div>

            {/* Menu Grid */}
            <main className="flex-1 overflow-y-auto p-4 pb-32">
                <div className="grid grid-cols-2 gap-4">
                    {filteredMenu.map(item => (
                        <div key={item.id} onClick={() => addToCart(item)} className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden active:scale-95 transition-transform flex flex-col">
                            <div className="h-32 bg-gray-200">
                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-2xl">?</div>}
                            </div>
                            <div className="p-3 flex flex-col flex-1">
                                <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">{item.name}</h3>
                                <p className={`text-${theme}-600 font-black text-sm mt-auto`}>{formatRupiah(item.price)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Floating Mobile Cart Bar */}
            {cartCount > 0 && !isCartOpen && (
                <div className="fixed bottom-6 left-6 right-6 z-40 animate-slide-in-up">
                    <button onClick={() => setIsCartOpen(true)} className={`w-full bg-${theme}-600 text-white p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] flex justify-between items-center ring-4 ring-white`}>
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

            {/* Shopping Cart Drawer / Overlay */}
            {isCartOpen && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex flex-col justify-end animate-fade-in">
                    <div className="bg-white rounded-t-[2.5rem] max-h-[85vh] flex flex-col overflow-hidden animate-slide-in-up">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Detail Pesanan</h2>
                            <button onClick={() => setIsCartOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                                    <div className="flex-1 pr-4">
                                        <h4 className="font-bold text-gray-800 leading-tight">{item.name}</h4>
                                        <p className="text-xs text-gray-400 font-bold">{formatRupiah(item.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm">
                                        <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center font-black text-gray-400">-</button>
                                        <span className="font-black w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQty(item.id, 1)} className={`w-8 h-8 flex items-center justify-center font-black text-${theme}-600`}>+</button>
                                    </div>
                                </div>
                            ))}

                            <div className="pt-4 space-y-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nama Pemesan</label>
                                    <input value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-gray-100 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-orange-500" placeholder="Contoh: Budi" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nomor Meja</label>
                                    <input value={tableNumber} onChange={e => setTableNumber(e.target.value)} type="number" className="w-full bg-gray-100 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-orange-500" placeholder="Contoh: 12" />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Total Pembayaran</span>
                                <span className={`text-3xl font-black text-${theme}-600 tracking-tighter`}>{formatRupiah(cartTotal)}</span>
                            </div>
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting || cart.length === 0}
                                className={`w-full bg-${theme}-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-orange-200 uppercase tracking-widest text-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-gray-300`}
                            >
                                {isSubmitting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : 'KONFIRMASI PESANAN'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerOrderView;
