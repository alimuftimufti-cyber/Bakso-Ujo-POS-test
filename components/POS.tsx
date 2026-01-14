
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppContext } from '../types'; 
import type { MenuItem, CartItem, Category, Order, OrderType, PaymentMethod } from '../types';
// @ts-ignore
import { Html5QrcodeScanner } from 'html5-qrcode';

const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const BEEP_URL = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"; 

// Loader Transparan yang indah
const TransparentLoader = ({ message }: { message: string }) => (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center border border-gray-100 scale-110">
            <div className="w-14 h-14 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin mb-4"></div>
            <p className="font-black text-gray-900 uppercase tracking-widest text-[10px]">{message}</p>
            <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase">Bakso Ujo Cloud System</p>
        </div>
    </div>
);

const QuickOrderUpdateModal = ({ order, menu, onClose, onUpdate, onPay, theme }: { order: Order, menu: MenuItem[], onClose: () => void, onUpdate: (items: CartItem[]) => void, onPay: (items: CartItem[]) => void, theme: string }) => {
    const [currentItems, setCurrentItems] = useState<CartItem[]>(order.items);
    const [searchTerm, setSearchTerm] = useState('');
    
    const fullMenuList = useMemo(() => {
        return menu.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [menu, searchTerm]);

    const handleAddItem = (item: MenuItem) => {
        setCurrentItems(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1, note: '' }];
        });
    };

    const updateQty = (id: number, delta: number) => {
        setCurrentItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
    };

    const total = currentItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[80] p-4 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] border border-white/20">
                <button onClick={onClose} className="absolute top-6 right-6 bg-white/20 hover:bg-white/40 text-white w-12 h-12 rounded-full flex items-center justify-center text-3xl font-light z-[90] transition-all">&times;</button>

                <div className="w-full md:w-5/12 p-8 flex flex-col border-r border-gray-100 bg-gray-50/50">
                    <div className="mb-6">
                        <h3 className="text-2xl font-black text-gray-900 uppercase italic">Isi Pesanan</h3>
                        <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">#{order.sequentialId} - {order.customerName}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {currentItems.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                                <div className="flex-1 mr-4">
                                    <h4 className="font-bold text-gray-800 text-sm leading-tight">{item.name}</h4>
                                    <p className="text-[10px] text-orange-600 font-black mt-0.5">{formatRupiah(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl border">
                                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 font-black text-red-500 bg-white rounded-lg shadow-sm">-</button>
                                    <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 font-black text-green-600 bg-white rounded-lg shadow-sm">+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-dashed border-gray-200">
                        <div className="flex justify-between items-center mb-6 px-2">
                            <span className="font-bold text-gray-400 uppercase tracking-widest text-xs">Total Akhir</span>
                            <span className="text-3xl font-black text-orange-600 tracking-tighter">{formatRupiah(total)}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => onPay(currentItems)} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">BAYAR</button>
                            <button onClick={() => onUpdate(currentItems)} className={`w-full bg-gray-900 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all`}>SIMPAN</button>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-7/12 p-8 bg-white flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h3 className="text-xl font-black text-gray-900">TAMBAH MENU</h3>
                        <input type="text" placeholder="Cari..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:w-64 bg-gray-100 border-none rounded-full py-2 px-4 text-xs font-bold outline-none"/>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4">
                            {fullMenuList.map(item => (
                                <div key={item.id} onClick={() => handleAddItem(item)} className="border-2 border-gray-50 p-3 rounded-2xl text-center hover:border-orange-500 hover:shadow-lg cursor-pointer transition-all active:scale-95 group flex flex-col items-center">
                                    <div className="w-full aspect-square bg-gray-100 rounded-xl mb-2 overflow-hidden shadow-inner">
                                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">?</div>}
                                    </div>
                                    <h4 className="font-bold text-[11px] text-gray-700 line-clamp-1">{item.name}</h4>
                                    <p className="text-[10px] font-black text-gray-400 mt-0.5">{formatRupiah(item.price)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SplitBillModal = ({ order, onClose, onSplit, theme }: { order: Order, onClose: () => void, onSplit: (items: CartItem[]) => void, theme: string }) => {
    const [splitItems, setSplitItems] = useState<{ [key: string]: number }>({});
    const getKey = (item: CartItem) => item.id.toString();
    const updateQty = (item: CartItem, change: number) => { const key = getKey(item); const current = splitItems[key] || 0; const next = Math.max(0, Math.min(item.quantity, current + change)); setSplitItems(prev => ({ ...prev, [key]: next })); };
    const handleConfirm = () => { const itemsToMove: CartItem[] = []; order.items.forEach(item => { const qty = splitItems[getKey(item)] || 0; if (qty > 0) itemsToMove.push({ ...item, quantity: qty }); }); onSplit(itemsToMove); };
    return (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[80vh]"><div className="p-4 border-b bg-gray-50 rounded-t-lg"><h3 className="font-bold text-lg text-gray-800">Pisah Pesanan (Split Bill)</h3></div><div className="flex-1 overflow-y-auto p-4 space-y-2">{order.items.map((item, idx) => { const key = getKey(item); const selectedQty = splitItems[key] || 0; return (<div key={idx} className={`flex items-center justify-between p-3 border rounded-lg ${selectedQty > 0 ? `bg-${theme}-50 border-${theme}-200` : 'bg-white'}`}><div className="flex-1"><div>{item.name}</div><div className="text-xs text-gray-500">Sisa: {item.quantity - selectedQty}</div></div><div className="flex items-center bg-white border rounded"><button onClick={() => updateQty(item, -1)} className="px-3 py-1 hover:bg-gray-100 font-bold">-</button><span className="px-3 text-sm font-bold w-8 text-center">{selectedQty}</span><button onClick={() => updateQty(item, 1)} className="px-3 py-1 hover:bg-gray-100 font-bold">+</button></div></div>); })}</div><div className="p-4 border-t flex gap-2"><button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg font-semibold text-gray-700">Batal</button><button onClick={handleConfirm} disabled={Object.values(splitItems).every(q => q === 0)} className={`flex-1 py-2 bg-${theme}-600 text-white rounded-lg font-semibold disabled:bg-gray-300`}>Pisahkan</button></div></div></div>);
};

const PaymentModal = ({ total, onClose, onPay, theme }: { total: number, onClose: () => void, onPay: (method: PaymentMethod) => void, theme: string }) => {
    return (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"><div className="bg-white rounded-xl shadow-2xl p-6 max-sm w-full animate-scale-in"><h3 className="text-xl font-bold mb-2 text-center">Metode Bayar</h3><p className={`text-center text-2xl font-bold text-${theme}-600 mb-6`}>{formatRupiah(total)}</p><div className="grid grid-cols-1 gap-3"><button onClick={() => onPay('Tunai')} className="flex items-center justify-center p-4 border-2 border-gray-100 hover:border-orange-500 rounded-lg font-bold text-lg hover:bg-orange-50 transition-all">💵 Tunai</button><button onClick={() => onPay('QRIS')} className="flex items-center justify-center p-4 border-2 border-gray-100 hover:border-orange-500 rounded-lg font-bold text-lg hover:bg-orange-50 transition-all">📷 QRIS</button><button onClick={() => onPay('Debit')} className="flex items-center justify-center p-4 border-2 border-gray-100 hover:border-orange-500 rounded-lg font-bold text-lg hover:bg-orange-50 transition-all">💳 Debit / EDC</button></div><button onClick={onClose} className="w-full mt-6 py-3 text-gray-500 font-semibold hover:bg-gray-100 rounded-lg">Batal</button></div></div>)
}

const CustomerNameModal = ({ onConfirm, onCancel, theme, requireTable }: { onConfirm: (name: string) => void, onCancel: () => void, theme: string, requireTable: boolean }) => {
    const [name, setName] = useState('');
    const [table, setTable] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(name.trim()) { onConfirm(requireTable && table.trim() ? `${name} (Meja ${table})` : name); } }
    return (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4"><form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-xl w-full max-sm"><h3 className="text-lg font-bold mb-4 text-gray-800">Identitas Pesanan</h3>
    {requireTable && <input type="text" value={table} onChange={e => setTable(e.target.value)} placeholder="Meja" className="w-full p-3 border rounded mb-4 font-bold text-center text-lg" autoFocus required />}
    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nama Pelanggan" className="w-full p-3 border rounded mb-4" autoFocus={!requireTable} required /><div className="space-y-2"><button type="submit" disabled={!name} className={`w-full bg-${theme}-500 text-white font-semibold py-3 rounded-lg hover:bg-${theme}-600 disabled:bg-gray-300`}>Konfirmasi</button><button type="button" onClick={onCancel} className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg mt-2 hover:bg-gray-300">Batal</button></div></form></div>);
};

const ScanQRModal = ({ onClose, onScan, theme }: { onClose: () => void, onScan: (data: string) => void, theme: string }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    useEffect(() => {
        scannerRef.current = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true }, false);
        scannerRef.current.render((text: string) => { if (scannerRef.current) { scannerRef.current.clear().then(() => onScan(text)); } }, (err: any) => {});
        return () => { if (scannerRef.current) { scannerRef.current.clear().catch(e => console.log(e)); } };
    }, []);
    return (<div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-xl"><div className="bg-white rounded-[3rem] shadow-2xl p-10 max-w-lg w-full text-center relative overflow-hidden"><button onClick={onClose} className="absolute top-6 right-8 text-gray-300 hover:text-gray-900 text-3xl font-light">&times;</button><h3 className="text-2xl font-black mb-2 uppercase">Scanner Kamera</h3><div id="qr-reader" className="overflow-hidden rounded-3xl border-4 border-gray-50 bg-black aspect-square mb-8"></div><button onClick={onClose} className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl">BATAL</button></div></div>);
};

const POSView: React.FC = () => {
    const { 
        menu, categories, orders, addOrder, updateOrder, updateOrderStatus, 
        payForOrder, splitOrder, voidOrder, printerDevice, connectToPrinter, 
        storeProfile, printOrderViaBrowser, requestPassword,
        isStoreOpen, isShiftLoading, setView, refreshOrders 
    } = useAppContext();
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Category>('All');
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    const [discountVal, setDiscountVal] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [orderType, setOrderType] = useState<OrderType>('Dine In');
    
    // States
    const [isNameModalOpen, setNameModalOpen] = useState(false);
    const [isSplitOpen, setIsSplitOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [isQuickUpdateOpen, setIsQuickUpdateOpen] = useState(false);
    const [isLoadingOverlay, setIsLoadingOverlay] = useState(false); // NEW: Global Loading
    const [loaderMessage, setLoaderMessage] = useState('Sedang Memproses...');

    const [searchTerm, setSearchTerm] = useState('');
    const [pendingAction, setPendingAction] = useState<'save' | 'pay' | null>(null);
    const [sidebarTab, setSidebarTab] = useState<'active' | 'history'>('active');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const theme = storeProfile.themeColor || 'orange';

    const prevOrdersLength = useRef(orders.length);
    const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

    useEffect(() => {
        if (orders.length > prevOrdersLength.current) {
            const latestOrder = orders[0];
            if (latestOrder && latestOrder.status === 'pending') {
                new Audio(BEEP_URL).play().catch(() => {});
                setHighlightedOrderId(latestOrder.id);
            }
        }
        prevOrdersLength.current = orders.length;
    }, [orders]);

    const isReadOnly = useMemo(() => activeOrder?.isPaid || activeOrder?.status === 'completed' || activeOrder?.status === 'cancelled', [activeOrder]);

    const totals = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        let discount = discountType === 'percent' ? (subtotal * discountVal / 100) : discountVal;
        discount = Math.min(discount, subtotal);
        const taxable = subtotal - discount;
        const service = storeProfile.enableServiceCharge ? taxable * (storeProfile.serviceChargeRate / 100) : 0;
        const tax = storeProfile.enableTax ? (taxable + service) * (storeProfile.taxRate / 100) : 0;
        return { subtotal, discount, service, tax, total: Math.round(taxable + service + tax) };
    }, [cart, discountVal, discountType, storeProfile]);

    useEffect(() => {
        if (activeOrder) {
            setCart(activeOrder.items);
            setDiscountVal(activeOrder.discountValue || 0);
            setDiscountType(activeOrder.discountType || 'percent');
            setOrderType(activeOrder.orderType);
        } else {
            setCart([]);
            setDiscountVal(0);
            setOrderType('Dine In');
        }
    }, [activeOrder]);

    const filteredMenu = useMemo(() => menu.filter(item => (selectedCategory === 'All' || item.category === selectedCategory) && item.name.toLowerCase().includes(searchTerm.toLowerCase())), [menu, selectedCategory, searchTerm]);
    const pendingOrders = useMemo(() => orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').sort((a, b) => b.createdAt - a.createdAt), [orders]);
    const historyOrders = useMemo(() => orders.filter(o => o.status === 'completed' || o.status === 'cancelled').sort((a, b) => (b.completedAt || b.createdAt || 0) - (a.completedAt || a.createdAt || 0)).slice(0, 20), [orders]);
    const displayedOrders = sidebarTab === 'active' ? pendingOrders : historyOrders;

    const addToCart = useCallback((item: MenuItem) => { 
        if (isReadOnly) return; 
        if (item.stock !== undefined && item.stock <= 0) { alert(`Stok ${item.name} habis!`); return; }
        setCart(prev => { 
            const existing = prev.find(i => i.id === item.id);
            if (existing && item.stock !== undefined && existing.quantity >= item.stock) { alert(`Stok tidak mencukupi.`); return prev; }
            return existing ? prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { ...item, quantity: 1, note: item.defaultNote || '' }]; 
        }); 
    }, [isReadOnly]);

    const updateCart = (id: number, qty: number, note?: string) => { if (isReadOnly) return; setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty, note: note !== undefined ? note : i.note } : i).filter(i => i.quantity > 0)); };

    const handleAction = async (action: 'save' | 'pay') => { 
        if (cart.length === 0) return; 
        if (activeOrder) { 
            setIsLoadingOverlay(true);
            setLoaderMessage('Memperbarui Pesanan...');
            try {
                await updateOrder(activeOrder.id, cart, discountVal, discountType, orderType); 
                if (action === 'pay') { setIsPaymentModalOpen(true); } else { setActiveOrder(null); setCart([]); setDiscountVal(0); }
            } finally { setIsLoadingOverlay(false); }
        } else { 
            setPendingAction(action); 
            setNameModalOpen(true); 
        } 
    };
    
    const handleNameConfirm = async (name: string) => { 
        setNameModalOpen(false);
        setIsLoadingOverlay(true);
        setLoaderMessage('Menyimpan Pesanan Baru...');
        try {
            if (pendingAction === 'save') { 
                await addOrder(cart, name, discountVal, discountType, orderType); 
                setActiveOrder(null); 
                setCart([]); 
                setDiscountVal(0); 
            } else if (pendingAction === 'pay') { 
                const newOrder = await addOrder(cart, name, discountVal, discountType, orderType); 
                if(newOrder) { setActiveOrder(newOrder); setIsPaymentModalOpen(true); } 
            } 
        } finally {
            setPendingAction(null); 
            setIsLoadingOverlay(false);
        }
    };

    const handlePayment = async (method: PaymentMethod) => { 
        if (activeOrder) { 
            setIsLoadingOverlay(true);
            setLoaderMessage('Memproses Pembayaran...');
            try {
                const finalOrder = { ...activeOrder, items: cart, total: totals.total, discount: totals.discount, taxAmount: totals.tax, serviceChargeAmount: totals.service }; 
                const paidOrder = await payForOrder(finalOrder, method); 
                if(paidOrder) { setActiveOrder(paidOrder); } 
                setIsPaymentModalOpen(false); 
            } finally { setIsLoadingOverlay(false); }
        } 
    };

    const handleCompleteOrder = async (order: Order) => { 
        setIsLoadingOverlay(true);
        setLoaderMessage('Menyelesaikan Pesanan...');
        try {
            await updateOrderStatus(order.id, 'completed'); 
            setActiveOrder(null); 
            setCart([]); 
        } finally { setIsLoadingOverlay(false); }
    };

    const handleSelectOrder = (o: Order) => { 
        if(activeOrder?.id === o.id) { setActiveOrder(null); } else { setActiveOrder(o); } 
        if (window.innerWidth < 1024) setIsLeftSidebarOpen(false); 
        if (highlightedOrderId === o.id) setHighlightedOrderId(null);
    }

    const handleVoidOrder = () => {
        if (!activeOrder) return;
        requestPassword("Batalkan Pesanan?", async () => {
            setIsLoadingOverlay(true);
            setLoaderMessage('Membatalkan Pesanan...');
            try {
                await voidOrder(activeOrder);
                setActiveOrder(null);
                setCart([]);
            } finally { setIsLoadingOverlay(false); }
        });
    }

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        try { await refreshOrders(); } finally { setTimeout(() => setIsRefreshing(false), 800); }
    };

    const handleQRScan = (rawData: string) => {
        const foundOrder = orders.find(o => o.id === rawData);
        if (foundOrder) {
            if (foundOrder.isPaid || foundOrder.status === 'completed') { alert('Pesanan sudah dibayar.'); setIsScanOpen(false); return; }
            setActiveOrder(foundOrder);
            setIsScanOpen(false);
            setIsQuickUpdateOpen(true); 
            new Audio(BEEP_URL).play().catch(() => {});
        } else { alert('QR Tidak Valid.'); }
    };

    if (isShiftLoading) return <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mb-4"></div><p>Sinkronisasi Shift...</p></div>;
    if (!isStoreOpen) return <div className="flex flex-col items-center justify-center h-full w-full bg-gray-100 p-6"><div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border"><h2 className="text-3xl font-black mb-2">Shift Tutup</h2><button onClick={() => setView('shift')} className={`w-full bg-${theme}-600 text-white font-bold py-4 rounded-xl mt-4 shadow-xl`}>Buka Keuangan</button></div></div>;

    return (
        <div className="flex h-full w-full bg-gray-50 relative overflow-hidden">
            {isLoadingOverlay && <TransparentLoader message={loaderMessage} />}
            {isNameModalOpen && <CustomerNameModal onConfirm={handleNameConfirm} onCancel={() => setNameModalOpen(false)} theme={theme} requireTable={storeProfile.enableTableInput ?? true} />}
            {isSplitOpen && activeOrder && <SplitBillModal order={activeOrder} onClose={() => setIsSplitOpen(false)} onSplit={async (items) => { setIsLoadingOverlay(true); try { await splitOrder(activeOrder, items); setIsSplitOpen(false); setActiveOrder(null); } finally { setIsLoadingOverlay(false); } }} theme={theme} />}
            {isPaymentModalOpen && <PaymentModal total={totals.total} onClose={() => setIsPaymentModalOpen(false)} onPay={handlePayment} theme={theme} />}
            {isScanOpen && <ScanQRModal onClose={() => setIsScanOpen(false)} onScan={handleQRScan} theme={theme} />}
            {isQuickUpdateOpen && activeOrder && <QuickOrderUpdateModal order={activeOrder} menu={menu} onClose={() => setIsQuickUpdateOpen(false)} onUpdate={async (newItems) => { setIsQuickUpdateOpen(false); setIsLoadingOverlay(true); try { await updateOrder(activeOrder.id, newItems, 0, 'percent', 'Dine In'); setCart(newItems); } finally { setIsLoadingOverlay(false); } }} onPay={(newItems) => { setIsQuickUpdateOpen(false); setIsPaymentModalOpen(true); setCart(newItems); }} theme={theme} />}
            {isLeftSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsLeftSidebarOpen(false)}></div>}

            <aside className={`absolute inset-y-0 left-0 z-30 w-72 bg-white border-r flex flex-col shadow-xl transition-transform duration-300 lg:relative lg:translate-x-0 lg:shadow-none lg:z-10 ${isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex p-2 gap-2 bg-gray-50 border-b">
                    <button onClick={() => { setSidebarTab('active'); setActiveOrder(null); }} className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${sidebarTab === 'active' ? `bg-white shadow text-${theme}-600` : 'text-gray-500 hover:bg-gray-200'}`}>Aktif ({pendingOrders.length})</button>
                    <button onClick={() => { setSidebarTab('history'); setActiveOrder(null); }} className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${sidebarTab === 'history' ? `bg-white shadow text-${theme}-600` : 'text-gray-500 hover:bg-gray-200'}`}>Riwayat</button>
                </div>
                <div className="p-3 border-b flex gap-2 bg-white items-center">
                    <button onClick={() => { setActiveOrder(null); if (window.innerWidth < 1024) setIsLeftSidebarOpen(false); }} className={`flex-1 text-xs bg-${theme}-500 text-white px-3 py-2.5 rounded-md font-bold shadow-md`}>+ Manual</button>
                    <button onClick={() => setIsScanOpen(true)} className="flex-1 text-xs bg-gray-800 text-white px-3 py-2.5 rounded-md font-bold shadow-md">Scan QR</button>
                    <button onClick={handleManualRefresh} className={`p-2 rounded-md ${isRefreshing ? 'animate-spin' : ''}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {displayedOrders.map(o => (
                        <div key={o.id} onClick={() => handleSelectOrder(o)} className={`p-4 border-b cursor-pointer border-l-4 transition-all ${activeOrder?.id === o.id ? `bg-${theme}-50 border-l-${theme}-500` : 'border-l-transparent hover:bg-gray-50'} ${highlightedOrderId === o.id ? 'animate-pulse bg-yellow-50 border-l-yellow-400' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-bold text-sm truncate">#{o.sequentialId} {o.customerName}</div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{o.isPaid ? 'Lunas' : 'Unpaid'}</span>
                            </div>
                            <div className="flex justify-between items-end mt-2 text-[10px] font-black uppercase text-gray-400">
                                <span>{o.status}</span>
                                <span className="text-gray-800 font-bold">{formatRupiah(o.total)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-white shadow-sm z-20">
                    <div className="p-3 border-b flex items-center gap-3">
                        <button onClick={() => setIsLeftSidebarOpen(true)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                        <input type="text" placeholder="Cari menu..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 bg-gray-100 border-none rounded-full text-sm outline-none" />
                    </div>
                    <div className="px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
                         <button onClick={() => setSelectedCategory('All')} className={`px-4 py-1.5 rounded-full text-xs font-bold ${selectedCategory === 'All' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>Semua</button>
                         {categories.map(c => <button key={c} onClick={() => setSelectedCategory(c)} className={`px-4 py-1.5 rounded-full text-xs font-bold ${selectedCategory === c ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>{c}</button>)}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 no-scrollbar">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {filteredMenu.map(item => (
                            <div key={item.id} onClick={() => addToCart(item)} className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden active:scale-95 group ${item.stock !== undefined && item.stock <= 0 ? 'opacity-60 grayscale' : 'cursor-pointer'}`}>
                                <div className="h-32 bg-gray-200 overflow-hidden relative">
                                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">?</div>}
                                    {item.stock !== undefined && <span className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${item.stock <= 0 ? 'bg-red-600' : 'bg-black/70'}`}>{item.stock <= 0 ? 'HABIS' : `${item.stock} Stok`}</span>}
                                </div>
                                <div className="p-3 flex flex-col flex-1">
                                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-snug mb-1">{item.name}</h3>
                                    <p className={`text-${theme}-600 font-black mt-auto`}>{formatRupiah(item.price)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <aside className="w-80 bg-white border-l flex flex-col shadow-2xl z-20 flex-shrink-0 hidden md:flex">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <span className={`w-2 h-6 bg-${theme}-500 rounded-full`}></span>
                        {activeOrder ? `Order #${activeOrder.sequentialId}` : 'Pesanan Baru'}
                    </h2>
                </div>
                {!isReadOnly && (
                    <div className="p-2 border-b grid grid-cols-2 gap-2 bg-white">
                        <button onClick={() => setOrderType('Dine In')} className={`py-1.5 text-xs font-bold rounded-md ${orderType === 'Dine In' ? `bg-${theme}-100 text-${theme}-700 ring-1 ring-${theme}-500` : 'bg-gray-100 text-gray-600'}`}>Makan</button>
                        <button onClick={() => setOrderType('Take Away')} className={`py-1.5 text-xs font-bold rounded-md ${orderType === 'Take Away' ? `bg-${theme}-100 text-${theme}-700 ring-1 ring-${theme}-500` : 'bg-gray-100 text-gray-600'}`}>Bungkus</button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50 no-scrollbar">
                    {cart.map(item => (
                        <div key={item.id} className="flex flex-col bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 mr-2"><div className="font-bold text-sm leading-tight">{item.name}</div><div className="text-xs text-gray-500">{formatRupiah(item.price)}</div></div>
                                <div className="font-bold text-sm">{formatRupiah(item.price * item.quantity)}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                {!isReadOnly ? (
                                    <>
                                        <input placeholder="Catatan..." value={item.note || ''} onChange={e => updateCart(item.id, item.quantity, e.target.value)} className="text-xs border-b outline-none w-24 bg-transparent py-1" />
                                        <div className="flex items-center bg-gray-100 rounded-md">
                                            <button onClick={() => updateCart(item.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center font-bold">-</button>
                                            <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                                            <button onClick={() => updateCart(item.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center font-bold">+</button>
                                        </div>
                                    </>
                                ) : (
                                    <><div className="text-xs italic text-gray-400">{item.note && `"${item.note}"`}</div><div className="text-xs font-bold ml-auto">{item.quantity}x</div></>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-white border-t text-sm space-y-2 shadow-2xl">
                    <div className="flex justify-between text-gray-600"><span>Subtotal</span> <span>{formatRupiah(totals.subtotal)}</span></div>
                    {!isReadOnly && (
                        <div className="flex justify-between items-center text-gray-600">
                            <span>Diskon</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setDiscountType(discountType === 'percent' ? 'fixed' : 'percent')} className="text-[10px] font-bold bg-gray-200 px-1.5 py-0.5 rounded uppercase">{discountType === 'percent' ? '%' : 'Rp'}</button>
                                <input type="number" value={discountVal} onChange={e => setDiscountVal(parseFloat(e.target.value) || 0)} className="w-16 text-right border rounded p-1 text-xs" />
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between font-black text-xl border-t border-dashed pt-3"><span>TOTAL</span><span>{formatRupiah(totals.total)}</span></div>
                    {!isReadOnly ? (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button onClick={() => handleAction('save')} className="bg-gray-800 text-white py-3 rounded-xl font-bold text-sm">{activeOrder ? 'Update' : 'Simpan'}</button>
                            <button onClick={() => handleAction('pay')} className={`bg-${theme}-600 text-white py-3 rounded-xl font-bold text-sm`}>Bayar</button>
                            {activeOrder && (
                                <>
                                    <button onClick={() => setIsSplitOpen(true)} className="bg-white border text-gray-700 py-2 rounded-xl font-bold text-xs">Split</button>
                                    <button onClick={handleVoidOrder} className="bg-red-50 text-red-600 py-2 rounded-xl font-bold text-xs">Batal</button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button onClick={() => printOrderViaBrowser({ ...activeOrder!, items: cart }, 'receipt')} className="bg-gray-600 text-white py-3 rounded-xl font-bold text-sm">Cetak</button>
                            <button onClick={() => handleCompleteOrder(activeOrder!)} className="bg-blue-600 text-white py-3 rounded-xl font-bold text-sm">Selesai</button>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default POSView;
