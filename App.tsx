
import React, { useState, useEffect, Suspense, useCallback, useRef, Component } from 'react';
import { AppContext } from './types'; 
import type { MenuItem, Order, Shift, CartItem, Category, StoreProfile, AppContextType, ShiftSummary, Expense, OrderType, Ingredient, User, PaymentMethod, OrderStatus, ThemeColor, View, AppMode, Table, Branch, AttendanceRecord } from './types';
import { initialCategories, defaultStoreProfile, initialBranches, initialMenuData } from './data';

// IMPORT CLOUD SERVICES
import { 
    subscribeToOrders, addOrderToCloud, updateOrderInCloud, 
    getBranchesFromCloud, addBranchToCloud, deleteBranchFromCloud,
    getUsersFromCloud, addUserToCloud, updateUserInCloud, deleteUserFromCloud,
    getMenuFromCloud, addProductToCloud, deleteProductFromCloud,
    getCategoriesFromCloud, addCategoryToCloud, deleteCategoryFromCloud,
    getActiveShiftFromCloud, startShiftInCloud, closeShiftInCloud, updateShiftInCloud, subscribeToShifts,
    getCompletedShiftsFromCloud, getExpensesFromCloud, addExpenseToCloud, deleteExpenseFromCloud,
    getStoreProfileFromCloud, updateStoreProfileInCloud, updateProductStockInCloud,
    getIngredientsFromCloud, addIngredientToCloud, deleteIngredientFromCloud, updateIngredientStockInCloud,
    subscribeToInventory
} from './services/firebase';
import { checkConnection, supabase } from './services/supabaseClient'; 

const BEEP_URL = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"; 

// Lazy Load Components
const POSView = React.lazy(() => import('./components/POS'));
const KitchenView = React.lazy(() => import('./components/Kitchen'));
const SettingsView = React.lazy(() => import('./components/SettingsView')); 
const OwnerSettingsView = React.lazy(() => import('./components/OwnerSettingsView'));
const ShiftView = React.lazy(() => import('./components/Shift'));
const ReportView = React.lazy(() => import('./components/Report'));
const InventoryView = React.lazy(() => import('./components/InventoryView'));
const CustomerOrderView = React.lazy(() => import('./components/CustomerOrderView'));
const OwnerDashboard = React.lazy(() => import('./components/OwnerDashboard'));

// Icons
const SidebarIcons = {
    Pos: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    Shift: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Kitchen: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    Inventory: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    Report: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    Settings: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    Logout: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    Dashboard: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2-2h-2a2 2 0 01-2-2v-2z" /></svg>
};

const ConfigMissingView = () => (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-6 text-center z-[100]">
        <div className="max-w-md">
            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl font-black shadow-inner italic">!</div>
            <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight uppercase">Database Belum Siap</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
                Aplikasi butuh dihubungkan ke <strong>Supabase</strong> agar bisa Online. 
                Anda perlu mengatur <code>SUPABASE_URL</code> dan <code>SUPABASE_ANON_KEY</code> di pengaturan hosting (Vercel/Netlify).
            </p>
            <button onClick={() => window.location.reload()} className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-black transition-all">Coba Segarkan Halaman</button>
        </div>
    </div>
);

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) { 
    super(props); 
    this.state = { hasError: false }; 
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
        <div><h1 className="text-2xl font-bold text-red-600 mb-2">Terjadi Kesalahan Sistem</h1><button onClick={() => window.location.reload()} className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold">Refresh</button></div>
      </div>
    );
    return this.props.children;
  }
}

function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try { const item = window.localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; } 
    catch (error) { return initialValue; }
  });
  const setValue = (value: T) => {
    try { setStoredValue(value); window.localStorage.setItem(key, JSON.stringify(value)); } 
    catch (error) {}
  };
  return [storedValue, setValue];
}

const LandingPage = ({ onSelectMode, branchName, logo, slogan, isStoreOpen, isLoading }: any) => (
  <div className="min-h-[100dvh] bg-orange-50 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
    <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-200/50 rounded-full blur-3xl"></div>
    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-orange-300/30 rounded-full blur-3xl"></div>
    
    <button onClick={() => onSelectMode('admin')} className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center text-orange-900/10 hover:text-orange-900/50 transition-all z-50 rounded-full hover:bg-orange-100/50"><SidebarIcons.Settings /></button>
    
    <div className="max-w-md w-full animate-fade-in relative z-10">
      {logo ? <img src={logo} alt="Logo" className="w-32 h-32 mx-auto mb-6 object-contain" /> : <div className={`w-28 h-28 bg-orange-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-5xl font-black shadow-2xl shadow-orange-200 ring-8 ring-white`}>U</div>}
      
      <div className="mb-8">
          <h1 className="text-6xl font-black text-gray-900 mb-2 tracking-tighter uppercase italic">Bakso Ujo</h1>
          <div className="bg-orange-600 text-white px-6 py-2 rounded-full inline-block text-sm font-black uppercase tracking-widest shadow-xl border-2 border-white">
              {branchName || 'Cabang Pusat'}
          </div>
      </div>
      
      <p className="text-gray-500 mb-12 font-bold text-xl italic leading-tight">"{slogan}"</p>
      
      {isLoading ? (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
            <p className="text-xs font-black text-orange-800 uppercase tracking-widest">Sinkronisasi Stok...</p>
          </div>
      ) : (
          <div className="space-y-4">
            {isStoreOpen ? (
                <button 
                  onClick={() => onSelectMode('customer')} 
                  className={`w-full group relative p-7 bg-orange-600 rounded-[2.5rem] text-center transition-all shadow-2xl shadow-orange-300 hover:scale-[1.03] active:scale-95 border-b-8 border-orange-800`}
                >
                    <div className="flex flex-col items-center justify-center">
                        <span className="text-white font-black text-3xl uppercase tracking-tighter mb-1">PESAN SEKARANG</span>
                        <span className="text-orange-100/80 text-xs font-bold uppercase tracking-widest">Buka Menu & Cek Stok Terbaru</span>
                    </div>
                </button>
            ) : (
                <div className="p-10 bg-white/60 backdrop-blur-md rounded-[3rem] border-4 border-dashed border-orange-200">
                    <p className="font-black text-orange-800 uppercase tracking-widest mb-1 text-lg">Maaf, Kedai Sedang Tutup</p>
                    <p className="text-sm text-gray-500 font-bold">Silakan kembali saat jam operasional kami.</p>
                </div>
            )}
          </div>
      )}
    </div>
  </div>
);

const DB_VER = 'v6_cloud_native';

const App: React.FC = () => {
    const [appMode, setAppMode] = useState<AppMode>('landing');
    const [view, setView] = useState<View>('pos');
    const [isLoggedIn, setIsLoggedIn] = useLocalStorage<boolean>(`pos-isLoggedIn-${DB_VER}`, false);
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>(`pos-currentUser-${DB_VER}`, null);
    const [activeBranchId, setActiveBranchId] = useLocalStorage<string>(`pos-activeBranchId-${DB_VER}`, 'pusat');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage<boolean>(`pos-isSidebarCollapsed-${DB_VER}`, false);

    const [branches, setBranches] = useState<Branch[]>([]);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]); 
    const [orders, setOrders] = useState<Order[]>([]); 
    const [expenses, setExpenses] = useState<Expense[]>([]); 
    const [activeShift, setActiveShift] = useState<Shift | null>(null);
    const [completedShifts, setCompletedShifts] = useState<ShiftSummary[]>([]);
    const [storeProfile, setStoreProfile] = useState<StoreProfile>({ ...defaultStoreProfile, branchId: activeBranchId });
    
    const [isShiftLoading, setIsShiftLoading] = useState(true);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [isDatabaseReady, setIsDatabaseReady] = useState<boolean | null>(null);
    const [newOrderIncoming, setNewOrderIncoming] = useState(false);
    const [hasUnreadOrders, setHasUnreadOrders] = useState(false);

    const appModeRef = useRef(appMode);
    useEffect(() => { appModeRef.current = appMode; }, [appMode]);

    const refreshAllData = useCallback(async (isInitial = false) => {
        if (isDatabaseReady === false) return;
        try {
            if (isInitial) setIsShiftLoading(true);
            const [p, m, i, u, cat, br] = await Promise.all([
                getStoreProfileFromCloud(activeBranchId),
                getMenuFromCloud(activeBranchId),
                getIngredientsFromCloud(activeBranchId),
                getUsersFromCloud(activeBranchId),
                getCategoriesFromCloud(),
                getBranchesFromCloud()
            ]);
            setStoreProfile(p); setMenu(m); setIngredients(i); setUsers(u); setCategories(cat); setBranches(br);
            const shift = await getActiveShiftFromCloud(activeBranchId);
            setActiveShift(shift);
            if (shift) { const ex = await getExpensesFromCloud(shift.id); setExpenses(ex); }
            const history = await getCompletedShiftsFromCloud(activeBranchId);
            setCompletedShifts(history);
        } catch (err) { console.error("Gagal refresh data:", err); } finally {
            if (isInitial) setIsShiftLoading(false);
        }
    }, [activeBranchId, isDatabaseReady]);

    useEffect(() => {
        const init = async () => {
            const isReady = await checkConnection();
            setIsDatabaseReady(isReady);
            if (isReady) { await refreshAllData(true); } else { setIsShiftLoading(false); }
        };
        init();
    }, [activeBranchId, refreshAllData]);

    useEffect(() => {
        if (isDatabaseReady !== true) return;
        const unsubOrders = subscribeToOrders(activeBranchId, (newOrders, isNew) => {
            setOrders(newOrders);
            if (isNew && appModeRef.current === 'admin') {
                const audio = new Audio(BEEP_URL);
                audio.play().catch(() => {});
                setNewOrderIncoming(true);
                setHasUnreadOrders(true);
                setTimeout(() => setNewOrderIncoming(false), 5000);
            }
        });
        const unsubInv = subscribeToInventory(activeBranchId, () => refreshAllData());
        const unsubShifts = subscribeToShifts(activeBranchId, (s) => setActiveShift(s));
        return () => { unsubOrders(); unsubInv(); unsubShifts(); };
    }, [activeBranchId, isDatabaseReady, refreshAllData]);

    useEffect(() => {
        if (view === 'pos') setHasUnreadOrders(false);
    }, [view]);

    const handleSetMode = async (mode: AppMode) => {
        if (mode === 'customer') {
            setIsGlobalLoading(true);
            await refreshAllData(); 
            setIsGlobalLoading(false);
        }
        setAppMode(mode);
    };

    const loginAction = (pin: string) => {
        const foundUser = users.find(u => u.pin === pin);
        if (foundUser) { setCurrentUser(foundUser); setIsLoggedIn(true); return true; } 
        else { alert("PIN Salah."); return false; }
    };

    const startShift = async (cash: number) => {
        setIsGlobalLoading(true);
        const sId = Date.now().toString();
        const newS: Shift = { id: sId, start: Date.now(), start_cash: cash, revenue: 0, transactions: 0, cashRevenue: 0, nonCashRevenue: 0, totalDiscount: 0, branchId: activeBranchId, createdBy: currentUser?.id };
        if (isDatabaseReady) await startShiftInCloud(newS);
        setActiveShift(newS);
        setIsGlobalLoading(false);
    };

    const closeShift = (cash: number) => {
        if (!activeShift) return null;
        const totalEx = expenses.reduce((sum, e) => sum + e.amount, 0);
        const expected = activeShift.start_cash + activeShift.cashRevenue - totalEx;
        const summary: ShiftSummary = { ...activeShift, end: Date.now(), closingCash: cash, cashDifference: cash - expected, totalExpenses: totalEx, netRevenue: activeShift.revenue - totalEx, averageKitchenTime: 0, expectedCash: expected };
        if (isDatabaseReady) closeShiftInCloud(summary);
        setActiveShift(null);
        return summary;
    };

    const addOrderWrapper = (cart: CartItem[], name: string, dVal: number, dType: any, oType: OrderType, payment?: any) => {
        const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        let disc = dType === 'percent' ? (sub * dVal / 100) : dVal;
        const tax = storeProfile.enableTax ? (sub - disc) * (storeProfile.taxRate / 100) : 0;
        const srv = storeProfile.enableServiceCharge ? (sub - disc) * (storeProfile.serviceChargeRate / 100) : 0;
        const order: Order = { id: Date.now().toString(), sequentialId: orders.length + 1, customerName: name, items: cart, total: Math.round(sub - disc + tax + srv), subtotal: sub, discount: disc, discountType: dType, discountValue: dVal, taxAmount: tax, serviceChargeAmount: srv, status: 'pending', createdAt: Date.now(), isPaid: !!payment, paymentMethod: payment?.method, shiftId: activeShift?.id || 'public', orderType: oType, branchId: activeBranchId };
        
        cart.forEach(item => {
            const menuItem = menu.find(m => m.id === item.id);
            if (menuItem && menuItem.stock !== undefined) {
                const newStock = Math.max(0, menuItem.stock - item.quantity);
                setMenu(prev => prev.map(m => m.id === item.id ? { ...m, stock: newStock } : m));
                if (isDatabaseReady) updateProductStockInCloud(item.id, newStock);
            }
        });

        setOrders(prev => [order, ...prev]);
        if (isDatabaseReady) {
            addOrderToCloud(order).then(() => {
                if (payment && activeShift) {
                     const isCash = payment.method === 'Tunai';
                     const up = { revenue: activeShift.revenue + order.total, cashRevenue: isCash ? activeShift.cashRevenue + order.total : activeShift.cashRevenue, nonCashRevenue: !isCash ? activeShift.nonCashRevenue + order.total : activeShift.nonCashRevenue, transactions: activeShift.transactions + 1 };
                     updateShiftInCloud(activeShift.id, up);
                     setActiveShift(prev => prev ? { ...prev, ...up } : null);
                }
            }).catch(() => { setOrders(prev => prev.filter(o => o.id !== order.id)); alert("Gagal sinkron cloud."); });
        }
        return order;
    };

    const contextValue: AppContextType = {
        menu, categories, orders, expenses, activeShift, completedShifts, storeProfile, ingredients, tables: [], branches, users, currentUser, attendanceRecords: [], kitchenAlarmTime: 600, kitchenAlarmSound: 'beep', isStoreOpen: !!activeShift, isShiftLoading,
        setMenu, setCategories, setStoreProfile: (p: any) => { setStoreProfile(p); if(isDatabaseReady) updateStoreProfileInCloud(p); },
        setKitchenAlarmTime: () => {}, setKitchenAlarmSound: () => {}, addCategory: addCategoryToCloud, deleteCategory: deleteCategoryFromCloud, setIngredients,
        saveMenuItem: async (i) => {
            // Langsung update ke cloud, lalu refresh data agar UI akurat
            await addProductToCloud(i, activeBranchId);
            await refreshAllData();
        },
        removeMenuItem: async (id) => {
            await deleteProductFromCloud(id);
            await refreshAllData();
        },
        saveIngredient: async (i) => {
            setIngredients(prev => { const existing = prev.findIndex(ing => ing.id === i.id); if (existing > -1) { const n = [...prev]; n[existing] = i; return n; } return [...prev, i]; });
            await addIngredientToCloud(i, activeBranchId);
        },
        removeIngredient: deleteIngredientFromCloud,
        addIngredient: (i) => addIngredientToCloud(i, activeBranchId),
        updateIngredient: (i) => addIngredientToCloud(i, activeBranchId),
        deleteIngredient: deleteIngredientFromCloud,
        updateProductStock: async (id, stock) => { setMenu(prev => prev.map(m => m.id === id ? { ...m, stock } : m)); await updateProductStockInCloud(id, stock); },
        updateIngredientStock: async (id, stock) => { setIngredients(prev => prev.map(i => i.id === id ? { ...i, stock } : i)); await updateIngredientStockInCloud(id, stock); },
        addBranch: addBranchToCloud, deleteBranch: deleteBranchFromCloud, switchBranch: setActiveBranchId, setView,
        addUser: addUserToCloud, updateUser: updateUserInCloud, deleteUser: deleteUserFromCloud, loginUser: loginAction, logout: () => { setIsLoggedIn(false); setAppMode('landing'); },
        startShift, closeShift, addOrder: addOrderWrapper, 
        updateOrder: (id, cart, dVal, dType, oType) => { if(isDatabaseReady) updateOrderInCloud(id, { items: cart, orderType: oType }); },
        updateOrderStatus: (id, status) => { 
            const updates: any = { status };
            if (status === 'completed') updates.completedAt = Date.now();
            if (status === 'ready') updates.readyAt = Date.now();
            if (isDatabaseReady) updateOrderInCloud(id, updates);
            setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
        },
        payForOrder: (o, m) => { 
            const updates = { isPaid: true, paymentMethod: m, paidAt: Date.now(), payment_status: 'paid' };
            if (isDatabaseReady) updateOrderInCloud(o.id, updates);
            const updated = { ...o, ...updates, isPaid: true, paymentMethod: m };
            setOrders(prev => prev.map(order => order.id === o.id ? updated : order));
            return updated; 
        },
        voidOrder: (o) => { if(isDatabaseReady) updateOrderInCloud(o.id, { status: 'cancelled' }); setOrders(prev => prev.map(order => order.id === o.id ? { ...order, status: 'cancelled' } : order)); },
        addExpense: (d, a) => { if(activeShift && isDatabaseReady) addExpenseToCloud({ id: Date.now(), shiftId: activeShift.id, description: d, amount: a, date: Date.now() }); },
        deleteExpense: deleteExpenseFromCloud, deleteAndResetShift: () => setActiveShift(null),
        refreshOrders: () => refreshAllData(),
        requestPassword: (t, c) => { c(); }, 
        printerDevice: null, isPrinting: false, connectToPrinter: async () => {}, disconnectPrinter: async () => {}, previewReceipt: () => {}, printOrderToDevice: async () => {}, printShiftToDevice: async () => {}, printOrderViaBrowser: () => {},
        setTables: () => {}, addTable: () => {}, deleteTable: () => {}, setUsers: () => {}, clockIn: async () => {}, clockOut: async () => {}, splitOrder: () => {}, 
        customerSubmitOrder: async (cart, name) => { const res = addOrderWrapper(cart, name, 0, 'percent', 'Dine In'); return res; }, 
    };

    if (isDatabaseReady === false) return <ConfigMissingView />;

    return (
        <ErrorBoundary>
            <AppContext.Provider value={contextValue}>
                <div className="h-full w-full relative bg-orange-50">
                    {isGlobalLoading && (
                        <div className="fixed inset-0 z-[200] bg-orange-950/70 flex items-center justify-center backdrop-blur-md">
                            <div className="bg-white p-8 rounded-[3rem] flex flex-col items-center shadow-2xl animate-scale-in border-4 border-orange-500">
                                <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-orange-600 mb-6"></div>
                                <p className="font-black text-orange-900 text-lg uppercase tracking-widest">SINKRONISASI...</p>
                            </div>
                        </div>
                    )}
                    {appMode === 'landing' && (
                        <div key="mode-landing" className="h-full">
                            <LandingPage 
                                onSelectMode={handleSetMode} 
                                branchName={branches.find(b => b.id === activeBranchId)?.name}
                                logo={storeProfile.logo} slogan={storeProfile.slogan} theme={storeProfile.themeColor} isStoreOpen={!!activeShift} isLoading={isShiftLoading}
                            />
                        </div>
                    )}
                    {appMode === 'admin' && (
                        <div key="mode-admin" className="h-full">
                            {!isLoggedIn ? (
                                <div className="fixed inset-0 bg-orange-950/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                                    <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden max-w-sm w-full border-t-8 border-t-orange-600 p-10 text-center animate-scale-in">
                                        <h2 className="text-2xl font-black mb-6 uppercase tracking-widest text-gray-800">Login Kasir</h2>
                                        <input type="password" placeholder="••••" className="w-full bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 text-center text-4xl tracking-[0.5em] font-bold focus:border-orange-500 outline-none mb-6" onChange={(e) => { if(e.target.value.length >= 4) loginAction(e.target.value); }} autoFocus />
                                        <button onClick={() => setAppMode('landing')} className="text-sm font-bold text-gray-400 hover:text-orange-600 uppercase tracking-widest transition-colors">Kembali ke Depan</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-[100dvh] overflow-hidden bg-slate-900">
                                    <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} transition-all duration-300 bg-[#0f172a] text-white hidden md:flex flex-col border-r border-slate-800 shadow-2xl relative`}>
                                        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute -right-3 top-20 bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-50 hover:bg-orange-700 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <div className={`p-8 border-b border-slate-800/50 mb-4 transition-all ${isSidebarCollapsed ? 'px-4' : 'px-8'}`}>
                                            {!isSidebarCollapsed ? (
                                                <>
                                                    <h2 className="font-black text-xl uppercase tracking-tighter text-white leading-tight truncate">{branches.find(b => b.id === activeBranchId)?.name || 'CABANG PUSAT'}</h2>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest bg-slate-800/50 inline-block px-2 py-0.5 rounded">Terminal Kasir</p>
                                                </>
                                            ) : (
                                                <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg mx-auto">{(branches.find(b => b.id === activeBranchId)?.name || 'B').charAt(0)}</div>
                                            )}
                                        </div>
                                        <nav className="flex-1 px-4 space-y-1.5 custom-scrollbar overflow-y-auto">
                                            <NavItem id="pos" label="Kasir (POS)" icon={SidebarIcons.Pos} view={view} setView={setView} isCollapsed={isSidebarCollapsed} hasBadge={hasUnreadOrders} />
                                            <NavItem id="shift" label="Keuangan & Biaya" icon={SidebarIcons.Shift} view={view} setView={setView} isCollapsed={isSidebarCollapsed} />
                                            <NavItem id="kitchen" label="Monitor Dapur" icon={SidebarIcons.Kitchen} view={view} setView={setView} isCollapsed={isSidebarCollapsed} />
                                            <NavItem id="inventory" label="Manajemen Stok" icon={SidebarIcons.Inventory} view={view} setView={setView} isCollapsed={isSidebarCollapsed} />
                                            <NavItem id="report" label="Laporan Penjualan" icon={SidebarIcons.Report} view={view} setView={setView} isCollapsed={isSidebarCollapsed} />
                                            {!isSidebarCollapsed && <div className="pt-6 pb-2 px-5"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pengaturan</p></div>}
                                            {isSidebarCollapsed && <div className="h-px bg-slate-800 my-4"></div>}
                                            <NavItem id="settings" label="Toko & Menu" icon={SidebarIcons.Settings} view={view} setView={setView} isCollapsed={isSidebarCollapsed} />
                                            {currentUser?.role === 'owner' && <NavItem id="owner_settings" label="Owner Panel" icon={SidebarIcons.Dashboard} view={view} setView={setView} isCollapsed={isSidebarCollapsed} />}
                                        </nav>
                                        <div className="p-4 border-t border-slate-800">
                                            <button onClick={() => { setIsLoggedIn(false); handleSetMode('landing'); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl font-bold text-red-400 hover:bg-red-500/10 transition-all ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
                                                <SidebarIcons.Logout />{!isSidebarCollapsed && <span className="text-sm">Keluar (Logout)</span>}
                                            </button>
                                        </div>
                                    </aside>
                                    <main className="flex-1 relative overflow-hidden bg-white">
                                        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>}>
                                            {view === 'pos' && <POSView />}
                                            {view === 'shift' && <ShiftView />}
                                            {view === 'kitchen' && <KitchenView />}
                                            {view === 'inventory' && <InventoryView />}
                                            {view === 'report' && <ReportView />}
                                            {view === 'settings' && <SettingsView />}
                                            {view === 'owner_settings' && <OwnerSettingsView />}
                                        </Suspense>
                                    </main>
                                </div>
                            )}
                        </div>
                    )}
                    {appMode === 'customer' && (
                        <div key="mode-customer" className="h-full bg-orange-50">
                            <Suspense fallback={null}><CustomerOrderView onBack={() => handleSetMode('landing')} /></Suspense>
                        </div>
                    )}
                </div>
            </AppContext.Provider>
        </ErrorBoundary>
    );
};

const NavItem = ({ id, label, icon: Icon, view, setView, isCollapsed, hasBadge }: any) => (
    <button onClick={() => setView(id)} title={isCollapsed ? label : ''} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl font-bold transition-all group relative overflow-hidden ${isCollapsed ? 'justify-center px-0' : ''} ${view === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'} ${hasBadge ? 'animate-pulse' : ''}`}>
        {view === id && <div className={`absolute left-0 top-0 h-full bg-orange-500 rounded-r-full shadow-[0_0_10px_#f97316] ${isCollapsed ? 'w-1' : 'w-1.5'}`}></div>}
        <div className="relative"><Icon />{hasBadge && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-[#0f172a]"></div>}</div>
        {!isCollapsed && <span className="text-sm tracking-tight truncate">{label}</span>}
    </button>
);

export default App;
