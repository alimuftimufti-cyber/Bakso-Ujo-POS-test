
import React, { useState, useEffect, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { AppContext } from './types'; 
import type { MenuItem, Order, Shift, CartItem, Category, StoreProfile, AppContextType, ShiftSummary, Expense, OrderType, Ingredient, User, PaymentMethod, OrderStatus, ThemeColor, View, AppMode, Table, Branch, AttendanceRecord } from './types';
import { initialCategories, defaultStoreProfile, initialBranches } from './data';
import PrintableReceipt from './components/PrintableReceipt';
import { printOrder, printShift } from './services/printerService';

// IMPORT CLOUD SERVICES
import { 
    subscribeToOrders, addOrderToCloud, updateOrderInCloud, 
    subscribeToAttendance, addAttendanceToCloud, updateAttendanceInCloud,
    getBranchesFromCloud, addBranchToCloud, deleteBranchFromCloud,
    getUsersFromCloud, addUserToCloud, deleteUserFromCloud, updateUserInCloud,
    getMenuFromCloud, addProductToCloud, deleteProductFromCloud, updateProductStockInCloud,
    getCategoriesFromCloud, addCategoryToCloud, deleteCategoryFromCloud,
    getActiveShiftFromCloud, startShiftInCloud, closeShiftInCloud, updateShiftInCloud, subscribeToShifts,
    getCompletedShiftsFromCloud, getExpensesFromCloud, addExpenseToCloud, deleteExpenseFromCloud,
    getStoreProfileFromCloud, updateStoreProfileInCloud, updateIngredientStockInCloud,
    getIngredientsFromCloud, addIngredientToCloud, deleteIngredientFromCloud
} from './services/firebase';
import { checkConnection } from './services/supabaseClient'; 

// Lazy Load Components
const POSView = React.lazy(() => import('./components/POS'));
const KitchenView = React.lazy(() => import('./components/Kitchen'));
const SettingsView = React.lazy(() => import('./components/SettingsView')); 
const OwnerSettingsView = React.lazy(() => import('./components/OwnerSettingsView'));
const ShiftView = React.lazy(() => import('./components/Shift'));
const ReportView = React.lazy(() => import('./components/Report'));
const InventoryView = React.lazy(() => import('./components/InventoryView'));
const CustomerOrderView = React.lazy(() => import('./components/CustomerOrderView'));
const ReceiptPreviewModal = React.lazy(() => import('./components/ReceiptPreviewModal'));
const OwnerDashboard = React.lazy(() => import('./components/OwnerDashboard'));
const AttendanceView = React.lazy(() => import('./components/AttendanceView')); 

// Icons
const Icons = {
    Dashboard: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    Pos: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    Kitchen: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    Settings: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    Shift: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Report: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    Inventory: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    Logout: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    Menu: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>,
    Attendance: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> 
};

// --- ERROR BOUNDARY ---
interface ErrorBoundaryProps { children?: React.ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };
    static getDerivedStateFromError(error: any) { return { hasError: true }; }
    componentDidCatch(error: any, errorInfo: any) { console.error("Uncaught error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-center p-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Terjadi Kesalahan</h1>
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 transition-colors">Reset Aplikasi</button>
                </div>
            );
        }
        return (this as any).props.children;
    }
}

// Local Storage Helper (Hanya untuk Sesi Login HP ini)
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try { const item = window.localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; } catch (error) { console.error(error); return initialValue; }
    });
    useEffect(() => {
        try { const item = window.localStorage.getItem(key); setStoredValue(item ? JSON.parse(item) : initialValue); } catch (error) { setStoredValue(initialValue); }
    }, [key]);
    const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
        try { const valueToStore = value instanceof Function ? value(storedValue) : value; setStoredValue(valueToStore); window.localStorage.setItem(key, JSON.stringify(valueToStore)); } catch (error) { console.error(error); }
    };
    return [storedValue, setValue];
}

// Password Modal
const PasswordModal = ({ title, onConfirm, onCancel, theme = 'orange' }: { title: string, onConfirm: (password: string) => void, onCancel: () => void, theme?: ThemeColor }) => {
    const [password, setPassword] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onConfirm(password); };
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full transform transition-all scale-100 animate-scale-in">
                <div className="text-center mb-6"><h2 className="text-xl font-bold text-gray-800">{title}</h2><p className="text-sm text-gray-500 mt-1">Otorisasi Diperlukan</p></div>
                <div className="relative mb-8"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`block w-full border-2 border-gray-200 rounded-2xl p-4 text-center text-3xl tracking-widest font-bold focus:ring-4 focus:ring-${theme}-100 focus:border-${theme}-500 outline-none transition-all`} placeholder="••••" autoFocus required pattern="[0-9]*" inputMode="numeric"/></div>
                <div className="grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Batal</button><button type="submit" className={`px-4 py-3 bg-${theme}-600 text-white font-bold rounded-xl hover:bg-${theme}-700 transition-all shadow-lg shadow-${theme}-200`}>Verifikasi</button></div>
            </form>
        </div>
    );
};

const OfflineIndicator = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
    }, []);
    if (isOnline) return null;
    return <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white text-center py-2 px-4 z-[999] text-xs font-bold animate-pulse pb-safe">⚠️ Koneksi Internet Terputus (Mode Offline)</div>;
};

const SetupWarning = ({ theme }: { theme: ThemeColor }) => (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[100] p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-4 uppercase">Data Cloud Belum Siap</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
                Aplikasi ini memerlukan koneksi <strong>Supabase</strong> agar data bisa sinkron antar perangkat secara online.
            </p>
            <div className="bg-gray-50 p-4 rounded-2xl text-left border border-gray-200 mb-8 font-mono text-xs text-gray-500">
                <p className="font-bold mb-2 text-gray-700">Langkah Perbaikan:</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Dapatkan URL & API Key dari Supabase.com</li>
                    <li>Buat file <span className="bg-yellow-200 text-black px-1">.env</span> di folder root aplikasi.</li>
                    <li>Masukkan <span className="text-red-600">VITE_SUPABASE_URL</span></li>
                    <li>Masukkan <span className="text-red-600">VITE_SUPABASE_ANON_KEY</span></li>
                    <li>Restart terminal aplikasi Anda.</li>
                </ol>
            </div>
            <button onClick={() => window.location.reload()} className={`w-full bg-${theme}-600 text-white font-bold py-4 rounded-2xl hover:bg-${theme}-700 transition-all shadow-xl`}>Sudah Beres? Refresh Halaman</button>
        </div>
    </div>
);

const LoginScreen = ({ onLogin, onBack, theme = 'orange', activeBranchName, activeBranchId }: { onLogin: (pin: string) => void, onBack: () => void, theme?: ThemeColor, activeBranchName: string, activeBranchId: string }) => {
    const [mode, setMode] = useState<'selection' | 'login' | 'attendance'>('selection');
    const [password, setPassword] = useState('');
    const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking');
    useEffect(() => { checkConnection().then(ok => setDbStatus(ok ? 'ok' : 'error')); }, []);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onLogin(password); };
    if (mode === 'selection') {
        return (
            <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full relative flex flex-col justify-center border-t-4 border-t-orange-500 animate-scale-in p-8">
                    <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-gray-800 transition-colors p-2 rounded-full hover:bg-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                    <div className="absolute top-4 right-4">{dbStatus === 'checking' && <span className="w-3 h-3 bg-yellow-400 rounded-full inline-block"></span>}{dbStatus === 'ok' && <span className="w-3 h-3 bg-green-500 rounded-full inline-block"></span>}{dbStatus === 'error' && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse inline-block"></span>}</div>
                    <div className="text-center mb-8 mt-2"><h2 className="text-2xl font-black text-gray-900 uppercase">Portal Akses</h2><p className="text-gray-500 text-sm mt-1">{activeBranchName}</p></div>
                    <div className="space-y-4"><button onClick={() => setMode('attendance')} className={`w-full bg-blue-600 text-white p-6 rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex flex-col items-center gap-2 group`}><Icons.Attendance /> <span className="font-bold text-lg">Absensi Karyawan</span></button><button onClick={() => setMode('login')} className={`w-full bg-white border-2 border-gray-100 text-gray-800 p-6 rounded-2xl hover:border-${theme}-500 hover:text-${theme}-600 transition-all flex flex-col items-center gap-2 group`}><Icons.Pos /> <span className="font-bold text-lg">Masuk Kasir / Admin</span></button></div>
                    {dbStatus === 'error' && <div className="mt-6 p-3 bg-red-50 rounded-lg text-xs text-red-600 text-center border border-red-100"><strong>Database Tidak Terhubung.</strong><br/>Cek file .env URL & Anon Key.</div>}
                </div>
            </div>
        );
    }
    if (mode === 'attendance') { return <Suspense fallback={<div>Loading...</div>}><AttendanceView isKioskMode={true} onBack={() => setMode('selection')} /></Suspense>; }
    return (
     <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full relative flex flex-col justify-center border-t-4 border-t-orange-500 animate-scale-in"><div className="bg-gray-50 p-6 border-b border-gray-100 text-center relative"><button onClick={() => setMode('selection')} className="absolute top-4 left-4 text-gray-400 hover:text-gray-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button><h2 className="text-xl font-black text-gray-900 uppercase">Login Sistem</h2></div><div className="p-8"><form onSubmit={handleSubmit} className="space-y-6"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2 text-center">Masukkan PIN Login</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`block w-full border-2 border-gray-200 rounded-2xl bg-gray-50 p-4 text-center text-3xl tracking-[0.5em] font-bold focus:bg-white focus:ring-4 focus:ring-${theme}-100 focus:border-${theme}-500 outline-none transition-all`} placeholder="••••" autoFocus required pattern="[0-9]*" inputMode="numeric"/></div><button type="submit" className={`w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all shadow-xl hover:scale-[1.02]`}>Buka Kasir</button></form></div></div>
    </div>
    );
};

const LandingPage = ({ onSelectMode, storeName, logo, slogan, theme = 'orange' }: { onSelectMode: (mode: AppMode) => void, storeName: string, logo?: string, slogan?: string, theme?: ThemeColor }) => (
    <div className={`h-[100dvh] w-full bg-gradient-to-br from-${theme}-600 to-${theme}-800 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden`}><div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none"><div className="absolute -top-20 -left-20 w-96 h-96 bg-white rounded-full blur-3xl"></div><div className="absolute bottom-0 right-0 w-96 h-96 bg-black rounded-full blur-3xl"></div></div><div onClick={() => onSelectMode('admin')} className="absolute top-0 right-0 w-20 h-20 z-50 cursor-default opacity-0 hover:opacity-10 flex items-center justify-center text-white text-xs font-bold bg-black" title="Staff Access">ADMIN</div><div className="z-10 flex flex-col items-center justify-center w-full max-w-md text-center space-y-10"><div className="bg-white/10 backdrop-blur-md p-6 rounded-full inline-block shadow-2xl ring-4 ring-white/20">{logo ? <img src={logo} alt="Logo" className="h-28 w-28 object-cover rounded-full" /> : <div className={`h-28 w-28 flex items-center justify-center text-white font-black text-5xl`}>UJO</div>}</div><div><h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tight drop-shadow-sm">{storeName}</h1><p className={`text-lg md:text-xl font-medium text-${theme}-100 opacity-90`}>{slogan || "Selamat Datang"}</p></div><button onClick={() => onSelectMode('customer')} className={`bg-white text-${theme}-700 p-6 rounded-3xl shadow-2xl hover:scale-105 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-6 w-full max-w-sm group border-b-4 border-${theme}-900/10`}><div className={`bg-${theme}-50 p-4 rounded-2xl group-hover:bg-${theme}-100 transition-colors`}><Icons.Pos /></div><div className="text-left"><span className="block text-xl font-extrabold tracking-tight text-gray-900">PESAN MAKAN</span><span className="text-sm text-gray-500 font-medium">Order Mandiri (Self Service)</span></div></button></div></div>
);

const DB_VER = 'v6_cloud_native';

const App: React.FC = () => {
    const [appMode, setAppMode] = useState<AppMode>('landing');
    const [view, setView] = useState<View>('pos');
    const [isLoggedIn, setIsLoggedIn] = useLocalStorage<boolean>(`pos-isLoggedIn-${DB_VER}`, false);
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>(`pos-currentUser-${DB_VER}`, null);
    const [activeBranchId, setActiveBranchId] = useLocalStorage<string>(`pos-activeBranchId-${DB_VER}`, 'pusat');

    // DATA STATE (Cloud Only)
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

    // Initial Master Data
    useEffect(() => {
        const loadMaster = async () => {
            const isReady = await checkConnection();
            setIsDatabaseReady(isReady);
            if (!isReady) return;

            const b = await getBranchesFromCloud(); setBranches(b.length ? b : initialBranches);
            const c = await getCategoriesFromCloud(); setCategories(c.length ? c : initialCategories);
        };
        loadMaster();
    }, []);

    // Branch Specific Data
    useEffect(() => {
        if (isDatabaseReady === false) return;
        
        const loadBranchData = async () => {
            console.warn(`🔄 Memuat data untuk cabang: ${activeBranchId}`);
            setIsShiftLoading(true); 
            
            // Ambil Profil & Menu
            const [p, m, i, u] = await Promise.all([
                getStoreProfileFromCloud(activeBranchId),
                getMenuFromCloud(activeBranchId),
                getIngredientsFromCloud(activeBranchId),
                getUsersFromCloud(activeBranchId)
            ]);
            setStoreProfile(p); setMenu(m); setIngredients(i); setUsers(u);
            
            // Ambil SHIFT - Kritis: Hanya dari database
            const shift = await getActiveShiftFromCloud(activeBranchId);
            setActiveShift(shift);
            if (shift) {
                const ex = await getExpensesFromCloud(shift.id);
                setExpenses(ex);
            }
            
            const history = await getCompletedShiftsFromCloud(activeBranchId);
            setCompletedShifts(history);
            
            setIsShiftLoading(false); 
        };
        loadBranchData();
        
        const unsubOrders = subscribeToOrders(activeBranchId, setOrders);
        const unsubShifts = subscribeToShifts(activeBranchId, (s) => {
             console.log("🔔 Cloud Sinyal: Shift Berubah.");
             setActiveShift(s);
        });
        
        return () => { unsubOrders(); unsubShifts(); };
    }, [activeBranchId, isDatabaseReady]);

    // WRAPPERS FOR CLOUD ACTIONS
    const startShift = async (cash: number) => {
        setIsGlobalLoading(true);
        const sId = Date.now().toString();
        const newS: Shift = { id: sId, start: Date.now(), start_cash: cash, revenue: 0, transactions: 0, cashRevenue: 0, nonCashRevenue: 0, totalDiscount: 0, branchId: activeBranchId, createdBy: currentUser?.id };
        
        const result = await startShiftInCloud(newS);
        setIsGlobalLoading(false);
        if (result) setActiveShift(result); 
    };

    const closeShift = (cash: number) => {
        if (!activeShift) return null;
        const totalEx = expenses.reduce((sum, e) => sum + e.amount, 0);
        const expected = activeShift.start_cash + activeShift.cashRevenue - totalEx;
        const summary: ShiftSummary = { ...activeShift, end: Date.now(), closingCash: cash, cashDifference: cash - expected, totalExpenses: totalEx, netRevenue: activeShift.revenue - totalEx, averageKitchenTime: 0, expectedCash: expected };
        closeShiftInCloud(summary).then(() => setActiveShift(null));
        return summary;
    };

    const addOrderWrapper = (cart: CartItem[], name: string, dVal: number, dType: any, oType: OrderType, payment?: any) => {
        if (!activeShift && appMode !== 'customer') { alert("Shift belum dibuka di database."); return null; }
        const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        let disc = dType === 'percent' ? (sub * dVal / 100) : dVal;
        const tax = storeProfile.enableTax ? (sub - disc) * (storeProfile.taxRate / 100) : 0;
        const srv = storeProfile.enableServiceCharge ? (sub - disc) * (storeProfile.serviceChargeRate / 100) : 0;
        const order: Order = { id: Date.now().toString(), sequentialId: orders.length + 1, customerName: name, items: cart, total: Math.round(sub - disc + tax + srv), subtotal: sub, discount: disc, discountType: dType, discountValue: dVal, taxAmount: tax, serviceChargeAmount: srv, status: 'pending', createdAt: Date.now(), isPaid: !!payment, paymentMethod: payment?.method, shiftId: activeShift?.id || 'public', orderType: oType, branchId: activeBranchId };
        addOrderToCloud(order);
        if (payment && activeShift) {
             const isCash = payment.method === 'Tunai';
             const up = { revenue: activeShift.revenue + order.total, cashRevenue: isCash ? activeShift.cashRevenue + order.total : activeShift.cashRevenue, nonCashRevenue: !isCash ? activeShift.nonCashRevenue + order.total : activeShift.nonCashRevenue, transactions: activeShift.transactions + 1 };
             updateShiftInCloud(activeShift.id, up);
             setActiveShift(prev => prev ? ({ ...prev, ...up }) : null);
        }
        return order;
    };

    const updateOrderWrapper = (orderId: string, cart: CartItem[], dVal: number, dType: 'percent' | 'fixed', oType: OrderType) => {
        const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        let disc = dType === 'percent' ? (sub * dVal / 100) : dVal;
        const tax = storeProfile.enableTax ? (sub - disc) * (storeProfile.taxRate / 100) : 0;
        const srv = storeProfile.enableServiceCharge ? (sub - disc) * (storeProfile.serviceChargeRate / 100) : 0;
        const updates: any = { items: cart, total: Math.round(sub - disc + tax + srv), subtotal: sub, discount: disc, discountType: dType, discountValue: dVal, taxAmount: tax, serviceChargeAmount: srv, orderType: oType };
        updateOrderInCloud(orderId, updates);
    };

    const deleteAndResetShift = () => { setActiveShift(null); };

    // CONTEXT PROVIDER
    const contextValue: AppContextType = {
        menu, categories, orders, expenses, activeShift, completedShifts, storeProfile, ingredients, tables: [], branches, users, currentUser, attendanceRecords: [], kitchenAlarmTime: 600, kitchenAlarmSound: 'beep',
        isStoreOpen: !!activeShift,
        isShiftLoading,
        setMenu, setCategories, setStoreProfile: (p: any) => { setStoreProfile(p); updateStoreProfileInCloud(p); },
        setKitchenAlarmTime: () => {}, setKitchenAlarmSound: () => {}, addCategory: addCategoryToCloud, deleteCategory: deleteCategoryFromCloud, setIngredients,
        saveMenuItem: (i) => addProductToCloud(i, activeBranchId), removeMenuItem: deleteProductFromCloud, saveIngredient: (i) => addIngredientToCloud(i, activeBranchId), removeIngredient: deleteIngredientFromCloud,
        addIngredient: (i) => addIngredientToCloud(i, activeBranchId),
        updateIngredient: (i) => addIngredientToCloud(i, activeBranchId),
        deleteIngredient: deleteIngredientFromCloud,
        updateProductStock: updateProductStockInCloud, updateIngredientStock: updateIngredientStockInCloud,
        addBranch: addBranchToCloud, deleteBranch: deleteBranchFromCloud, switchBranch: setActiveBranchId, setView,
        addUser: addUserToCloud, updateUser: updateUserInCloud, deleteUser: deleteUserFromCloud, loginUser: () => false, logout: () => { setIsLoggedIn(false); setAppMode('landing'); },
        startShift, closeShift, addOrder: addOrderWrapper, 
        updateOrder: updateOrderWrapper,
        updateOrderStatus: (id, status) => updateOrderInCloud(id, { status }),
        payForOrder: (o, m) => { updateOrderInCloud(o.id, { isPaid: true, paymentMethod: m }); return null; },
        voidOrder: (o) => updateOrderInCloud(o.id, { status: 'cancelled' }),
        addExpense: (d, a) => { if(activeShift) addExpenseToCloud({ id: Date.now(), shiftId: activeShift.id, description: d, amount: a, date: Date.now() }); },
        deleteExpense: deleteExpenseFromCloud,
        deleteAndResetShift,
        requestPassword: (t, c) => { c(); }, 
        printerDevice: null, isPrinting: false, connectToPrinter: async () => {}, disconnectPrinter: async () => {}, previewReceipt: () => {}, printOrderToDevice: async () => {}, printShiftToDevice: async () => {}, printOrderViaBrowser: () => {},
        setTables: () => {}, addTable: () => {}, deleteTable: () => {}, setUsers: () => {}, clockIn: async () => {}, clockOut: async () => {}, splitOrder: () => {}, customerSubmitOrder: async () => true,
    };

    if (isDatabaseReady === false) {
        return <SetupWarning theme={storeProfile.themeColor} />;
    }

    return (
        <ErrorBoundary>
            <AppContext.Provider value={contextValue}>
                {isGlobalLoading && <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white p-6 rounded-2xl flex flex-col items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600 mb-4"></div><p className="font-bold">Menyimpan ke Cloud...</p></div></div>}
                <OfflineIndicator />
                {appMode === 'landing' && <LandingPage onSelectMode={setAppMode} storeName={storeProfile.name} logo={storeProfile.logo} slogan={storeProfile.slogan} theme={storeProfile.themeColor} />}
                {appMode === 'admin' && !isLoggedIn && <LoginScreen onLogin={(p) => { if(p === '9999') setIsLoggedIn(true); else alert("Salah PIN"); }} onBack={() => setAppMode('landing')} activeBranchName={branches.find(b => b.id === activeBranchId)?.name || 'Pusat'} activeBranchId={activeBranchId} />}
                {appMode === 'admin' && isLoggedIn && (
                    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
                        <aside className="w-64 bg-slate-800 text-white p-6 hidden md:block">
                            <h2 className="font-black text-xl mb-8 uppercase tracking-tighter">{storeProfile.name}</h2>
                            <nav className="space-y-4">
                                <button onClick={() => setView('pos')} className="w-full text-left font-bold opacity-80 hover:opacity-100">Kasir</button>
                                <button onClick={() => setView('shift')} className="w-full text-left font-bold opacity-80 hover:opacity-100">Keuangan</button>
                                <button onClick={() => setView('kitchen')} className="w-full text-left font-bold opacity-80 hover:opacity-100">Dapur</button>
                                <button onClick={() => setView('inventory')} className="w-full text-left font-bold opacity-80 hover:opacity-100">Stok</button>
                                <button onClick={() => { setIsLoggedIn(false); setAppMode('landing'); }} className="w-full text-left font-bold text-red-400">Logout</button>
                            </nav>
                        </aside>
                        <main className="flex-1 relative overflow-hidden bg-white">
                            <Suspense fallback={<div className="p-20 text-center">Memuat...</div>}>
                                {view === 'pos' && <POSView />}
                                {view === 'shift' && <ShiftView />}
                                {view === 'kitchen' && <KitchenView />}
                                {view === 'inventory' && <InventoryView />}
                            </Suspense>
                        </main>
                    </div>
                )}
                {appMode === 'customer' && <Suspense fallback={null}><CustomerOrderView onBack={() => setAppMode('landing')} /></Suspense>}
            </AppContext.Provider>
        </ErrorBoundary>
    );
};

export default App;
