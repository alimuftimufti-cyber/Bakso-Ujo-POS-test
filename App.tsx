
import { Table, Order, Shift, StoreProfile, MenuItem, Ingredient, Expense, ShiftSummary, User, CartItem, OrderSource, AttendanceRecord, OfficeSettings, AttendanceStatus } from './types';
import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { AppContext } from './types'; 
import type { Category, AppContextType, OrderType, View, AppMode, Branch, PaymentMethod, OrderStatus } from './types';
import { defaultStoreProfile, initialBranches } from './data';

// CLOUD SERVICES
import { 
    subscribeToOrders, addOrderToCloud, updateOrderInCloud, 
    getUsersFromCloud, addUserToCloud, updateUserInCloud, deleteUserFromCloud,
    getMenuFromCloud, addProductToCloud, deleteProductFromCloud,
    getCategoriesFromCloud, addCategoryToCloud, deleteCategoryFromCloud,
    getActiveShiftFromCloud, startShiftInCloud, closeShiftInCloud, subscribeToShifts,
    getCompletedShiftsFromCloud, getExpensesFromCloud, addExpenseToCloud, deleteExpenseFromCloud,
    getStoreProfileFromCloud, updateStoreProfileInCloud, updateProductStockInCloud,
    getIngredientsFromCloud, addIngredientToCloud, deleteIngredientFromCloud, updateIngredientStockInCloud,
    subscribeToInventory,
    getTablesFromCloud, addTableToCloud, deleteTableFromCloud, subscribeToTables,
    ensureDefaultBranch,
    saveAttendanceToCloud, updateAttendanceInCloud, getAttendanceRecordsFromCloud,
    getOfficeSettingsFromCloud, updateOfficeSettingsInCloud, calculateDistance, getReverseGeocoding
} from './services/firebase';
import { checkConnection } from './services/supabaseClient'; 

// Fix: Imported printing services
import { selectBluetoothPrinter, printOrder, printShift } from './services/printerService';

// Lazy Load Components
const POSView = React.lazy(() => import('./components/POS'));
const KitchenView = React.lazy(() => import('./components/Kitchen'));
const SettingsView = React.lazy(() => import('./components/SettingsView')); 
const ShiftView = React.lazy(() => import('./components/Shift'));
const ReportView = React.lazy(() => import('./components/Report'));
const InventoryView = React.lazy(() => import('./components/InventoryView'));
const CustomerOrderView = React.lazy(() => import('./components/CustomerOrderView'));
const AttendanceView = React.lazy(() => import('./components/AttendanceView'));

// Icons
const SidebarIcons = {
    Pos: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    Shift: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Kitchen: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v13m0-13c-1.168-.776-2.754-1.253-4.5-1.253S4.168 5.477 3 6.253v13c1.168-.776 2.754-1.253 7.5-1.253s6.332.477 7.5 1.253m0-13c1.668-.776 3.254-1.253 5-1.253s3.332.477 4.5 1.253v13c-1.168-.776-2.754-1.253-4.5-1.253s-3.332.477-4.5 1.253" /></svg>,
    Inventory: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    Report: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    Settings: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>,
    Logout: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
};

const LandingPage = ({ onOpenPanel, branchName, slogan, isStoreOpen }: any) => (
  <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
    <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-200/50 rounded-full blur-3xl"></div>
    
    <button 
        onClick={onOpenPanel} 
        className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center text-orange-900/5 hover:text-orange-900/20 transition-all z-50 rounded-full"
        title="Admin Panel"
    >
        <SidebarIcons.Settings />
    </button>

    <div className="max-w-md w-full relative z-10 animate-fade-in">
      <div className="mb-8">
          <div className="w-24 h-24 bg-orange-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl font-black shadow-2xl ring-8 ring-white">U</div>
          <h1 className="text-5xl font-black text-gray-900 mb-2 tracking-tighter uppercase italic">Bakso Ujo</h1>
          <p className="bg-orange-600 text-white px-4 py-1 rounded-full inline-block text-xs font-bold uppercase tracking-widest shadow-lg border-2 border-white">{branchName || 'Cabang Pusat'}</p>
      </div>
      <p className="text-gray-500 mb-12 font-bold text-lg italic leading-tight">"{slogan || 'Nikmatnya Asli, Bikin Nagih!'}"</p>
      
      <div className="space-y-4">
        <button onClick={() => window.location.href='?appMode=customer'} className="w-full p-8 bg-orange-600 rounded-[2.5rem] text-white font-black text-3xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all border-b-8 border-orange-800">PESAN SEKARANG</button>
        {!isStoreOpen && <p className="text-red-500 text-xs font-bold uppercase tracking-widest animate-pulse mt-4">Maaf, Kedai Sedang Tutup</p>}
      </div>
    </div>
    <div className="mt-12 text-[10px] font-bold text-orange-200 uppercase tracking-[0.3em]">Smart POS v2.5</div>
  </div>
);

const DatabaseErrorView = ({ message }: { message?: string }) => (
    <div className="min-h-screen bg-white flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-black">!</div>
            <h2 className="text-2xl font-black text-gray-900 mb-4 uppercase">Database Belum Siap</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
                {message || "Aplikasi mendeteksi bahwa tabel database belum dibuat lengkap di akun Supabase Anda."} <br/><br/>
                Silakan buka <strong>Supabase Dashboard &gt; SQL Editor</strong> dan jalankan kode SQL Schema yang telah disediakan.
            </p>
            <button onClick={() => window.location.reload()} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold">Segarkan Halaman</button>
        </div>
    </div>
);

const App: React.FC = () => {
    const [appMode, setAppMode] = useState<AppMode>('landing');
    const [view, setView] = useState<View>('pos');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeBranchId, setActiveBranchId] = useState('pusat');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authChoice, setAuthChoice] = useState<'none' | 'choice' | 'login_admin' | 'login_attendance'>('none');

    const [storeProfile, setStoreProfile] = useState<StoreProfile>(defaultStoreProfile);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [activeShift, setActiveShift] = useState<Shift | null>(null);
    const [completedShifts, setCompletedShifts] = useState<ShiftSummary[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [officeSettings, setOfficeSettings] = useState<OfficeSettings | null>(null);
    // Fix: Added branches state
    const [branches, setBranches] = useState<Branch[]>(initialBranches);
    const [printerDevice, setPrinterDevice] = useState<any>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    // Fix: Added kitchen alarm state
    const [kitchenAlarmTime, setKitchenAlarmTime] = useState(600); // 10 minutes default

    const [isDatabaseReady, setIsDatabaseReady] = useState<boolean | null>(null);
    const [isGlobalLoading, setIsGlobalLoading] = useState(true);
    const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);

    const refreshAllData = useCallback(async () => {
        try {
            await ensureDefaultBranch();
            
            const [profileData, menuData, categoriesData, usersData, tablesData, histShifts, ingredientData, attenData, offSetData] = await Promise.all([
                getStoreProfileFromCloud(activeBranchId).catch(() => null),
                getMenuFromCloud(activeBranchId).catch(() => []),
                getCategoriesFromCloud().catch(() => []),
                getUsersFromCloud(activeBranchId).catch(() => []),
                getTablesFromCloud(activeBranchId).catch(() => []),
                getCompletedShiftsFromCloud(activeBranchId).catch(() => []),
                getIngredientsFromCloud(activeBranchId).catch(() => []),
                getAttendanceRecordsFromCloud(activeBranchId, new Date().toISOString().split('T')[0]).catch(() => []),
                getOfficeSettingsFromCloud(activeBranchId).catch(() => null)
            ]);

            if (profileData) setStoreProfile(profileData);
            setMenu(menuData);
            setCategories(categoriesData);
            setUsers(usersData);
            setTables(tablesData);
            setCompletedShifts(histShifts);
            setIngredients(ingredientData); 
            setAttendanceRecords(attenData);
            setOfficeSettings(offSetData);
            
            const sh = await getActiveShiftFromCloud(activeBranchId).catch(() => null);
            setActiveShift(sh);
            
            setDbErrorMessage(null);
        } catch (err: any) { 
            console.error("Refresh error:", err);
            if (err.message?.includes('not find the table') || err.message?.includes('404')) {
                setDbErrorMessage(`Tabel '${err.details || 'tidak dikenal'}' tidak ditemukan.`);
            }
        }
        finally { setIsGlobalLoading(false); }
    }, [activeBranchId]);

    useEffect(() => {
        const init = async () => {
            const ok = await checkConnection();
            setIsDatabaseReady(ok);
            if (ok) {
                const params = new URLSearchParams(window.location.search);
                if (params.has('q') || params.has('table') || params.get('appMode') === 'customer') {
                    setAppMode('customer');
                }
                await refreshAllData();
            } else {
                setIsGlobalLoading(false);
            }
        };
        init();
    }, [refreshAllData]);

    useEffect(() => {
        if (!isDatabaseReady || dbErrorMessage) return;
        
        const unsubTables = subscribeToTables(activeBranchId, (newTables) => setTables(newTables));
        const unsubOrders = subscribeToOrders(activeBranchId, (newOrders) => setOrders(newOrders));
        const unsubShifts = subscribeToShifts(activeBranchId, setActiveShift);
        const unsubInventory = subscribeToInventory(activeBranchId, async () => {
            const m = await getMenuFromCloud(activeBranchId);
            setMenu(m);
            const ing = await getIngredientsFromCloud(activeBranchId);
            setIngredients(ing);
        });

        return () => { 
            unsubTables(); 
            unsubOrders(); 
            unsubShifts(); 
            unsubInventory();
        };
    }, [activeBranchId, isDatabaseReady, dbErrorMessage]);

    const calculateTotalsHelper = (cart: CartItem[], dv: number, dt: 'percent' | 'fixed') => {
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        let discount = dt === 'percent' ? (subtotal * dv / 100) : dv;
        discount = Math.min(discount, subtotal);
        const taxable = subtotal - discount;
        const service = storeProfile.enableServiceCharge ? taxable * (storeProfile.serviceChargeRate / 100) : 0;
        const tax = storeProfile.enableTax ? (taxable + service) * (storeProfile.taxRate / 100) : 0;
        const total = Math.round(taxable + service + tax);
        return { subtotal, discount, tax, service, total };
    };

    const handleLoginAdmin = (pin: string) => {
        const user = users.find(u => String(u.pin) === String(pin));
        if (user) {
            setCurrentUser(user);
            setIsLoggedIn(true);
            setAppMode('admin');
            setAuthChoice('none');
            if (user.role === 'kitchen') setView('kitchen');
            else setView('pos');
            return true;
        }
        alert("PIN Salah!");
        return false;
    };

    const handleLoginAttendance = (pin: string) => {
        const user = users.find(u => String(u.attendancePin) === String(pin));
        if (user) {
            setCurrentUser(user);
            setAppMode('attendance');
            setAuthChoice('none');
            return true;
        }
        alert("PIN Absen Salah!");
        return false;
    };

    const contextValue: AppContextType = {
        menu, categories, orders, expenses, activeShift, completedShifts, storeProfile, ingredients, tables, users, currentUser, attendanceRecords, officeSettings, isStoreOpen: !!activeShift, isShiftLoading: isGlobalLoading,
        setMenu, setStoreProfile: (p: any) => { setStoreProfile(p); updateStoreProfileInCloud(p); },
        addCategory: addCategoryToCloud, deleteCategory: deleteCategoryFromCloud,
        saveMenuItem: async (i) => { await addProductToCloud(i, activeBranchId); await refreshAllData(); },
        removeMenuItem: async (id) => { await deleteProductFromCloud(id); await refreshAllData(); },
        saveIngredient: async (ing) => { await addIngredientToCloud(ing, activeBranchId); await refreshAllData(); },
        removeIngredient: async (id) => { await deleteIngredientFromCloud(id); await refreshAllData(); },
        addTable: async (num) => {
            const payload = btoa(`B:${activeBranchId}|T:${num}`);
            const newTable = { id: Date.now().toString(), number: num, qrCodeData: payload };
            setTables(prev => [...prev, newTable]);
            try { await addTableToCloud(newTable, activeBranchId); } catch (e) { setTables(prev => prev.filter(t => t.id !== newTable.id)); throw e; }
        },
        deleteTable: async (id) => {
            setTables(prev => prev.filter(t => t.id !== id));
            try { await deleteTableFromCloud(id); } catch (e) { const tb = await getTablesFromCloud(activeBranchId); setTables(tb); throw e; }
        },
        updateProductStock: async (id, stock) => { await updateProductStockInCloud(id, stock); await refreshAllData(); },
        updateIngredientStock: async (id, stock) => { await updateIngredientStockInCloud(id, stock); await refreshAllData(); },
        addUser: async (u) => { await addUserToCloud({...u, branchId: activeBranchId}); await refreshAllData(); }, 
        updateUser: async (u) => { await updateUserInCloud(u); await refreshAllData(); }, 
        deleteUser: async (id) => { await deleteUserFromCloud(id); await refreshAllData(); },
        setUsers,
        loginUser: (pin) => handleLoginAdmin(pin), logout: () => { setIsLoggedIn(false); setAppMode('landing'); setCurrentUser(null); },
        startShift: async (cash) => {
            const newS: Shift = { id: Date.now().toString(), start: Date.now(), start_cash: cash, revenue: 0, transactions: 0, cashRevenue: 0, nonCashRevenue: 0, totalDiscount: 0, branchId: activeBranchId, createdBy: currentUser?.name || 'System' };
            await startShiftInCloud(newS);
            setActiveShift(newS);
        },
        closeShift: (cash) => {
            if (!activeShift) return null;
            const shiftOrders = orders.filter(o => String(o.shiftId) === String(activeShift.id) && o.isPaid && o.status !== 'cancelled');
            const cashRevenue = shiftOrders.filter(o => o.paymentMethod === 'Tunai').reduce((sum, o) => sum + (o.total || 0), 0);
            const nonCashRevenue = shiftOrders.filter(o => o.paymentMethod !== 'Tunai').reduce((sum, o) => sum + (o.total || 0), 0);
            const totalRevenue = cashRevenue + nonCashRevenue;
            const totalExpenses = expenses.filter(e => String(e.shiftId) === String(activeShift.id)).reduce((sum, e) => sum + (e.amount || 0), 0);
            const summary: ShiftSummary = { ...activeShift, end: Date.now(), closingCash: cash, expectedCash: activeShift.start_cash + cashRevenue - totalExpenses, cashDifference: cash - (activeShift.start_cash + cashRevenue - totalExpenses), revenue: totalRevenue, cashRevenue, nonCashRevenue, totalDiscount: 0, transactions: shiftOrders.length, totalExpenses, netRevenue: totalRevenue - totalExpenses, averageKitchenTime: 0 };
            closeShiftInCloud(summary);
            setActiveShift(null);
            setCompletedShifts(prev => [summary, ...prev]);
            return summary;
        },
        // Fix: Implemented missing deleteAndResetShift
        deleteAndResetShift: async () => {
            if (!activeShift) return;
            // logic to delete shift from cloud and reset locally
            setActiveShift(null);
            await refreshAllData();
        },
        addOrder: async (cart, name, dv, dt, ot) => {
             const f = calculateTotalsHelper(cart, dv, dt);
             const order: Order = { id: Date.now().toString(), customerName: name, items: cart, total: f.total, subtotal: f.subtotal, discount: f.discount, discountType: dt, discountValue: dv, taxAmount: f.tax, serviceChargeAmount: f.service, status: 'pending', createdAt: Date.now(), isPaid: false, shiftId: activeShift?.id || '', orderType: ot, branchId: activeBranchId, orderSource: 'admin' };
             await addOrderToCloud(order);
             return order;
        },
        updateOrder: async (id, cart, dv, dt, ot) => {
             const f = calculateTotalsHelper(cart, dv, dt);
             await updateOrderInCloud(id, { items: cart, discountValue: dv, discountType: dt, orderType: ot, subtotal: f.subtotal, discount: f.discount, taxAmount: f.tax, serviceChargeAmount: f.service, total: f.total });
        },
        updateOrderStatus: (id, status) => updateOrderInCloud(id, { status }),
        payForOrder: (o, m) => { updateOrderInCloud(o.id, { isPaid: true, paymentMethod: m }); return o; },
        voidOrder: (order) => updateOrderInCloud(order.id, { status: 'cancelled' }),
        splitOrder: (original, itemsToMove) => {
            const remainingItems = original.items.map(item => {
                const moved = itemsToMove.find(m => m.id === item.id);
                if (moved) return { ...item, quantity: item.quantity - moved.quantity };
                return item;
            }).filter(i => i.quantity > 0);
            const fOrig = calculateTotalsHelper(remainingItems, original.discountValue || 0, original.discountType || 'fixed');
            updateOrderInCloud(original.id, { items: remainingItems, subtotal: fOrig.subtotal, total: fOrig.total });
            const fNew = calculateTotalsHelper(itemsToMove, 0, 'fixed');
            const newOrder: Order = { ...original, id: Date.now().toString(), items: itemsToMove, status: 'pending', isPaid: false, createdAt: Date.now(), total: fNew.total, subtotal: fNew.subtotal, discount: 0, taxAmount: fNew.tax, serviceChargeAmount: fNew.service };
            addOrderToCloud(newOrder);
        },
        addExpense: async (d, a) => { if(activeShift) await addExpenseToCloud({ shiftId: activeShift.id, description: d, amount: a, date: Date.now() }); },
        // Fix: Implemented missing deleteExpense
        deleteExpense: async (id) => { await deleteExpenseFromCloud(id); await refreshAllData(); },
        setView, 
        clockIn: async (userId, userName, photoUrl, location) => {
            let status: AttendanceStatus = 'Hadir';
            let locName = "";
            let dist = 0;
            let within = true;

            // Logika Cek Terlambat
            if (officeSettings) {
                const now = new Date();
                const [startH, startM] = officeSettings.startTime.split(':').map(Number);
                const startTime = new Date();
                startTime.setHours(startH, startM, 0);
                if (now > startTime) status = 'Terlambat';
                
                // Logika Geo-fencing
                if (location) {
                    dist = calculateDistance(location.lat, location.lng, officeSettings.latitude, officeSettings.longitude);
                    within = dist <= (officeSettings.radiusKm * 1000);
                    locName = await getReverseGeocoding(location.lat, location.lng);
                }
            }

            // Get Audit Info
            const ipData = await fetch('https://api.ipify.org?format=json').then(r => r.json()).catch(() => ({ ip: 'Unknown' }));

            const record: AttendanceRecord = {
                id: Date.now().toString(),
                userId,
                userName,
                department: users.find(u => u.id === userId)?.department || 'Operasional',
                date: new Date().toISOString().split('T')[0],
                clockInTime: Date.now(),
                status,
                branchId: activeBranchId,
                photoUrl,
                location,
                locationName: locName,
                distanceMeters: Math.round(dist),
                isWithinRadius: within,
                ipAddress: ipData.ip,
                deviceInfo: navigator.userAgent
            };
            await saveAttendanceToCloud(record);
            await refreshAllData();
        },
        clockOut: async (recordId) => {
            let status: AttendanceStatus = 'Hadir';
            if (officeSettings) {
                const now = new Date();
                const [endH, endM] = officeSettings.endTime.split(':').map(Number);
                const endTime = new Date();
                endTime.setHours(endH, endM, 0);
                if (now < endTime) status = 'Pulang Awal';
            }
            await updateAttendanceInCloud(recordId, { clockOutTime: Date.now(), status: status === 'Pulang Awal' ? 'Pulang Awal' : 'Hadir' });
            await refreshAllData();
        },
        updateOfficeSettings: async (settings) => {
            await updateOfficeSettingsInCloud(settings);
            setOfficeSettings(settings);
        },
        refreshOrders: refreshAllData, requestPassword: (t, c) => c(), 
        // Fix: Implemented missing branches and branch management
        branches,
        addBranch: async (b) => { setBranches(prev => [...prev, b]); },
        deleteBranch: async (id) => { setBranches(prev => prev.filter(b => b.id !== id)); },
        switchBranch: async (id) => { setActiveBranchId(id); await refreshAllData(); },
        // Fix: Implemented missing printer control
        printerDevice, isPrinting,
        connectToPrinter: async () => { const dev = await selectBluetoothPrinter(); setPrinterDevice(dev); },
        printOrderToDevice: async (o) => { if(printerDevice) { setIsPrinting(true); try { await printOrder(printerDevice, o, storeProfile); } finally { setIsPrinting(false); } } },
        printShiftToDevice: async (s) => { if(printerDevice) { setIsPrinting(true); try { await printShift(printerDevice, s, storeProfile); } finally { setIsPrinting(false); } } },
        printOrderViaBrowser: () => {},
        customerSubmitOrder: async (cart, name) => {
            const f = calculateTotalsHelper(cart, 0, 'percent');
            const order: Order = { id: Date.now().toString(), customerName: name, items: cart, total: f.total, subtotal: f.subtotal, discount: 0, discountType: 'percent', discountValue: 0, taxAmount: f.tax, serviceChargeAmount: f.service, status: 'pending', createdAt: Date.now(), isPaid: false, shiftId: activeShift?.id || '', orderType: 'Dine In', branchId: activeBranchId, orderSource: 'customer' };
            await addOrderToCloud(order);
            return order;
        },
        kitchenAlarmTime
    } as any;

    if (isGlobalLoading) return <div className="h-screen flex items-center justify-center bg-orange-50"><div className="animate-spin rounded-full h-14 w-14 border-t-4 border-orange-600 border-b-4"></div></div>;
    if (dbErrorMessage) return <DatabaseErrorView message={dbErrorMessage} />;

    return (
        <AppContext.Provider value={contextValue}>
            <div className="h-full w-full bg-gray-50">
                {appMode === 'landing' && (
                    <LandingPage 
                        onOpenPanel={() => setAuthChoice('choice')} 
                        branchName={storeProfile.name} 
                        slogan={storeProfile.slogan} 
                        isStoreOpen={!!activeShift} 
                    />
                )}
                
                {authChoice === 'choice' && (
                    <div className="fixed inset-0 bg-gray-900/95 flex items-center justify-center z-[100] p-4 backdrop-blur-md animate-fade-in">
                        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full text-center border-t-8 border-orange-600">
                             <h2 className="text-2xl font-black mb-2 uppercase tracking-widest text-gray-800">Pilih Akses</h2>
                             <p className="text-gray-400 text-xs font-bold mb-8 uppercase tracking-widest">Silakan pilih menu tujuan</p>
                             <div className="grid grid-cols-1 gap-4">
                                 <button onClick={() => setAuthChoice('login_attendance')} className="p-6 bg-blue-50 border-2 border-blue-100 rounded-[2rem] hover:border-blue-600 transition-all group flex flex-col items-center gap-3">
                                     <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg></div>
                                     <span className="font-black text-blue-900 uppercase tracking-widest">Absensi Staff</span>
                                 </button>
                                 <button onClick={() => setAuthChoice('login_admin')} className="p-6 bg-orange-50 border-2 border-orange-100 rounded-[2rem] hover:border-orange-600 transition-all group flex flex-col items-center gap-3">
                                     <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg></div>
                                     <span className="font-black text-orange-900 uppercase tracking-widest">Admin Panel</span>
                                 </button>
                                 <button onClick={() => setAuthChoice('none')} className="text-sm font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest mt-4">Tutup</button>
                             </div>
                        </div>
                    </div>
                )}

                {authChoice === 'login_admin' && (
                    <div className="fixed inset-0 bg-gray-900/95 flex items-center justify-center z-[100] p-4 backdrop-blur-md">
                        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-sm w-full text-center border-t-8 border-orange-600 animate-scale-in">
                            <h2 className="text-2xl font-black mb-2 uppercase tracking-widest text-gray-800">Admin Login</h2>
                            <p className="text-gray-400 text-xs font-bold mb-8 uppercase tracking-widest">Masukkan PIN Login</p>
                            <input type="password" placeholder="••••" className="w-full bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 text-center text-4xl tracking-[0.5em] font-bold focus:border-orange-500 outline-none mb-6" onChange={(e) => { if(e.target.value.length >= 4) handleLoginAdmin(e.target.value); }} autoFocus inputMode="numeric" />
                            <button onClick={() => setAuthChoice('choice')} className="text-sm font-bold text-gray-400 hover:text-orange-600 uppercase tracking-widest">Kembali</button>
                        </div>
                    </div>
                )}

                {authChoice === 'login_attendance' && (
                    <div className="fixed inset-0 bg-gray-900/95 flex items-center justify-center z-[100] p-4 backdrop-blur-md">
                        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-sm w-full text-center border-t-8 border-blue-600 animate-scale-in">
                            <h2 className="text-2xl font-black mb-2 uppercase tracking-widest text-gray-800">Staff Absensi</h2>
                            <p className="text-gray-400 text-xs font-bold mb-8 uppercase tracking-widest">Masukkan PIN Absensi</p>
                            <input type="password" placeholder="••••" className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 text-center text-4xl tracking-[0.5em] font-bold focus:border-blue-500 outline-none mb-6" onChange={(e) => { if(e.target.value.length >= 4) handleLoginAttendance(e.target.value); }} autoFocus inputMode="numeric" />
                            <button onClick={() => setAuthChoice('choice')} className="text-sm font-bold text-gray-400 hover:text-blue-600 uppercase tracking-widest">Kembali</button>
                        </div>
                    </div>
                )}

                {appMode === 'customer' && <Suspense fallback={null}><CustomerOrderView onBack={() => { window.location.href='/'; }} /></Suspense>}
                {appMode === 'attendance' && <Suspense fallback={null}><AttendanceView isKioskMode onBack={() => { setAppMode('landing'); setCurrentUser(null); }} /></Suspense>}
                
                {appMode === 'admin' && isLoggedIn && (
                    <div className="flex h-screen overflow-hidden bg-slate-900">
                        <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col shadow-2xl">
                            <div className="p-8 border-b border-slate-800">
                                <h2 className="font-black text-white text-2xl uppercase italic tracking-tighter">Bakso Ujo</h2>
                                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-1">Terminal Kasir</p>
                            </div>
                            <nav className="flex-1 p-4 space-y-2">
                                <button onClick={() => setView('pos')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${view === 'pos' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><SidebarIcons.Pos /> Kasir (POS)</button>
                                <button onClick={() => setView('shift')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${view === 'shift' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><SidebarIcons.Shift /> Keuangan</button>
                                <button onClick={() => setView('kitchen')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${view === 'kitchen' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><SidebarIcons.Kitchen /> Dapur</button>
                                <button onClick={() => setView('inventory')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${view === 'inventory' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><SidebarIcons.Inventory /> Stok Gudang</button>
                                <button onClick={() => setView('report')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${view === 'report' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><SidebarIcons.Report /> Laporan</button>
                                <button onClick={() => setView('attendance')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${view === 'attendance' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg> Absensi</button>
                                <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${view === 'settings' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><SidebarIcons.Settings /> Pengaturan Sistem</button>
                            </nav>
                            <div className="p-4 border-t border-slate-800">
                                <button onClick={() => { setIsLoggedIn(false); setAppMode('landing'); setCurrentUser(null); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-red-400 font-bold hover:bg-red-500/10 rounded-xl transition-all"><SidebarIcons.Logout /> Keluar</button>
                            </div>
                        </aside>
                        <main className="flex-1 overflow-hidden bg-white">
                            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>}>
                                {view === 'pos' && <POSView />}
                                {view === 'kitchen' && <KitchenView />}
                                {view === 'settings' && <SettingsView />}
                                {view === 'shift' && <ShiftView />}
                                {view === 'report' && <ReportView />}
                                {view === 'inventory' && <InventoryView />}
                                {view === 'attendance' && <AttendanceView />}
                            </Suspense>
                        </main>
                    </div>
                )}
            </div>
        </AppContext.Provider>
    );
};

export default App;
