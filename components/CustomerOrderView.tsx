
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../types'; 
import type { MenuItem, CartItem, Order, OrderType } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const DigitalReceipt = ({ order, onExit, theme }: { order: Order, onExit: () => void, theme: string }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${order.id}`;

    // Trap back button
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
            // Berikan jeda agar rendering browser selesai sempurna
            await new Promise(resolve => setTimeout(resolve, 800));

            const element = receiptRef.current;
            const canvas = await html2canvas(element, {
                scale: 2, // Kualitas tinggi agar teks tidak pecah
                backgroundColor: "#ffffff",
                useCORS: true,
                allowTaint: true,
                scrollY: -window.scrollY,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                onclone: (clonedDoc) => {
                    // Pastikan elemen kloning terlihat di shadow DOM capture
                    const clonedEl = clonedDoc.getElementById('receipt-inner-content');
                    if (clonedEl) (clonedEl as HTMLElement).style.height = 'auto';
                }
            });
            
            const imgData = canvas.toDataURL('image/png');
            // Lebar kertas thermal standar 80mm
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [80, Math.max(120, (canvas.height * 80) / canvas.width)]
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            // Generate filename yang unik
            const filename = `Struk-BaksoUjo-${order.id.slice(-6)}.pdf`;
            
            // Method save() lebih reliable di browser modern
            pdf.save(filename);
            
            if (shouldExit) {
                // Jeda 1 detik setelah trigger download sebelum tutup agar proses browser selesai
                setTimeout(onExit, 1000);
            }
        } catch (err) {
            console.error("Gagal simpan PDF:", err);
            alert("Terjadi kendala saat menyimpan. Silakan ambil tangkapan layar (screenshot) sebagai bukti.");
            if (shouldExit) onExit();
        } finally {
            setIsDownloading(false);
        }
    };

    const handleCloseAttempt = () => {
        if (confirm("Pastikan Anda sudah mendownload struk ini.\nTekan OK untuk mendownload struk otomatis dan keluar.")) {
            saveAsPDF(true);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center font-mono overflow-hidden">
            {/* CONTAINER SCROLL UTAMA */}
            <div className="flex-1 w-full overflow-y-auto scroll-smooth py-10 px-4 flex flex-col items-center custom-scrollbar">
                
                {/* ELEMEN STRUK YANG DI-CAPTURE */}
                <div 
                    id="receipt-inner-content"
                    ref={receiptRef} 
                    className="bg-white w-full max-w-sm rounded-sm shadow-2xl p-6 text-gray-900 border-t-8 border-orange-600 relative flex flex-col items-center mb-8 h-auto shrink-0"
                >
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

                    <div className="bg-gray-50 p-4 rounded-xl mb-6 border-2 border-gray-100 flex flex-col items-center">
                        <img 
                            src={qrUrl} 
                            alt="Order QR" 
                            className="w-48 h-48 mb-2 mix-blend-multiply" 
                            crossOrigin="anonymous" 
                        />
                        <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Tunjukkan ke Kasir</p>
                    </div>

                    <div className="w-full mb-4">
                         <p className="text-xs font-bold text-center bg-slate-900 text-white py-2 rounded uppercase tracking-widest">{order.customerName}</p>
                    </div>

                    <div className="w-full text-sm space-y-4 mb-8">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex flex-col border-b border-gray-50 pb-2">
                                <div className="flex justify-between font-bold items-start">
                                    <span className="flex-1 pr-4">{item.quantity}x {item.name}</span>
                                    <span className="shrink-0">{formatRupiah(item.price * item.quantity)}</span>
                                </div>
                                {item.note && <p className="text-[10px] italic text-red-500 font-bold ml-2 mt-1">Catatan: {item.note}</p>}
                            </div>
                        ))}
                    </div>

                    <div className="w-full border-t-2 border-black border-double pt-4 mb-6">
                        <div className="flex justify-between text-xl font-black">
                            <span>TOTAL</span>
                            <span>{formatRupiah(order.total)}</span>
                        </div>
                    </div>

                    <p className="text-[10px] text-center text-gray-400 font-bold italic mb-4">Terima kasih atas pesanan Anda!</p>
                    
                    <div className="absolute -bottom-2 left-0 right-0 flex overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="w-4 h-4 bg-slate-900 rotate-45 shrink-0"></div>
                        ))}
                    </div>
                </div>

                {/* TOMBOL AKSI - BERADA DI LUAR ELEMEN CAPTURE AGAR TIDAK MASUK KE PDF */}
                <div className="w-full max-w-sm flex flex-col gap-3 shrink-0 pb-10">
                    <button 
                        onClick={() => saveAsPDF(false)} 
                        disabled={isDownloading}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl border-2 border-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        )}
                        {isDownloading ? 'MENYIAPKAN FILE...' : 'SIMPAN KE PDF / HP'}
                    </button>
                    <button 
                        onClick={handleCloseAttempt} 
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        SELESAI & KEMBALI
                    </button>
                </div>
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

    // NEW: Autofill table from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const table = params.get('table');
        if (table) setTableNumber(table);
    }, []);

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
        const orderResult = await customerSubmitOrder(cart, `${customerName} (Meja ${tableNumber})`);
        setIsSubmitting(false);
        
        if (orderResult) {
            setSubmittedOrder(orderResult);
            setCart([]);
        } else {
            alert("Gagal mengirim pesanan. Pastikan koneksi internet aktif.");
        }
    };

    if (submittedOrder) {
        return <DigitalReceipt order={submittedOrder} onExit={onBack} theme="orange" />;
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-orange-50 overflow-hidden font-sans">
            <header className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <div>
                    <h1 className="font-black text-xl text-gray-900 tracking-tighter uppercase italic">Bakso Ujo</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Self-Ordering System</p>
                </div>
            </header>

            <div className="bg-white px-4 py-2 border-b flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar shadow-sm">
                <button onClick={() => setActiveCategory('All')} className={`px-5 py-2 rounded-full text-xs font-black transition-all ${activeCategory === 'All' ? `bg-orange-600 text-white shadow-lg` : 'bg-gray-100 text-gray-500'}`}>SEMUA</button>
                {categories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-xs font-black transition-all ${activeCategory === cat ? `bg-orange-600 text-white shadow-lg` : 'bg-gray-100 text-gray-500'}`}>{cat.toUpperCase()}</button>
                ))}
            </div>

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
