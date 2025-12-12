import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { AppContext } from './types'; 
import type { MenuItem, Order, Shift, CartItem, Category, StoreProfile, AppContextType, ShiftSummary, Expense, OrderType, Ingredient, User, PaymentMethod, OrderStatus, ThemeColor, View, AppMode, Table, Branch, AttendanceRecord } from './types';
import { initialMenuData, initialCategories, defaultStoreProfile, initialBranches } from './data';
import PrintableReceipt from './components/PrintableReceipt';
import { printOrder, printShift } from './services/printerService';
import { subscribeToOrders, addOrderToCloud, updateOrderInCloud, syncMasterData, subscribeToMasterData, isFirebaseReady, subscribeToAttendance, addAttendanceToCloud, updateAttendanceInCloud } from './services/firebase';

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
const AttendanceView = React.lazy(() => import('./components/AttendanceView')); // NEW

// ... Icons definition ...
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
    Attendance: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> // NEW ICON
};

// ... ErrorBoundary, useLocalStorage, PasswordModal, OfflineIndicator, ConfigWarning, LandingPage ...
// (Keeping existing helper components same as before to save space in this response, assume they are present)

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

// UPDATED: useLocalStorage that reacts to key changes
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try { const item = window.localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; } catch (error) { console.error(error); return initialValue; }
    });

    useEffect(() => {
        try {
            const item = window.localStorage.getItem(key);
            setStoredValue(item ? JSON.parse(item) : initialValue);
        } catch (error) {
            setStoredValue(initialValue);
        }
    }, [key]);

    const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
        try { 
            const valueToStore = value instanceof Function ? value(storedValue) : value; 
            setStoredValue(valueToStore); 
            window.localStorage.setItem(key, JSON.stringify(valueToStore)); 
        } catch (error) { console.error(error); }
    };
    return [storedValue, setValue];
}

// Helper: Password Modal
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

// Helper: Offline Indicator
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

// NEW: Config Warning Banner
const ConfigWarning = () => {
    if (isFirebaseReady) return null;
    return (
        <div className="bg-orange-600 text-white text-xs font-bold p-3 text-center sticky top-0 z-[100] shadow-md flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <span>MODE OFFLINE: Pesanan Self-Order tidak akan masuk ke kasir. Mohon setup Firebase di services/firebase.ts</span>
        </div>
    );
}

const LandingPage = ({ onSelectMode, storeName, logo, slogan, theme = 'orange' }: { onSelectMode: (mode: AppMode) => void, storeName: string, logo?: string, slogan?: string, theme?: ThemeColor }) => (
    <div className={`h-[100dvh] w-full bg-gradient-to-br from-${theme}-600 to-${theme}-800 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none"><div className="absolute -top-20 -left-20 w-96 h-96 bg-white rounded-full blur-3xl"></div><div className="absolute bottom-0 right-0 w-96 h-96 bg-black rounded-full blur-3xl"></div></div>
        
        <div 
            onClick={() => onSelectMode('admin')} 
            className="absolute top-0 right-0 w-20 h-20 z-50 cursor-default opacity-0 hover:opacity-10 flex items-center justify-center text-white text-xs font-bold bg-black"
            title="Staff Access"
        >
            ADMIN
        </div>

        <div className="z-10 flex flex-col items-center justify-center w-full max-w-md text-center space-y-10">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-full inline-block shadow-2xl ring-4 ring-white/20">{logo ? <img src={logo} alt="Logo" className="h-28 w-28 object-cover rounded-full" /> : <div className={`h-28 w-28 flex items-center justify-center text-white font-black text-5xl`}>UJO</div>}</div>
            <div><h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tight drop-shadow-sm">{storeName}</h1><p className={`text-lg md:text-xl font-medium text-${theme}-100 opacity-90`}>{slogan || "Selamat Datang"}</p></div>
            <button onClick={() => onSelectMode('customer')} className={`bg-white text-${theme}-700 p-6 rounded-3xl shadow-2xl hover:scale-105 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-6 w-full max-w-sm group border-b-4 border-${theme}-900/10`}><div className={`bg-${theme}-50 p-4 rounded-2xl group-hover:bg-${theme}-100 transition-colors`}><Icons.Pos /></div><div className="text-left"><span className="block text-xl font-extrabold tracking-tight text-gray-900">PESAN MAKAN</span><span className="text-sm text-gray-500 font-medium">Order Mandiri (Self Service)</span></div></button>
        </div>
    </div>
);

// UPDATED: Login Screen with Dual Mode (Attendance vs POS)
const LoginScreen = ({ onLogin, onBack, theme = 'orange', activeBranchName, activeBranchId }: { onLogin: (pin: string) => void, onBack: () => void, theme?: ThemeColor, activeBranchName: string, activeBranchId: string }) => {
    const [mode, setMode] = useState<'selection' | 'login' | 'attendance'>('selection');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onLogin(password); };
    
    // Mode Selection Screen
    if (mode === 'selection') {
        return (
            <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50 p-4">
                <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none"><div className={`absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-${theme}-900 to-gray-900`}></div></div>
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full relative flex flex-col justify-center border-t-4 border-t-orange-500 animate-scale-in p-8">
                    <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-gray-800 transition-colors p-2 rounded-full hover:bg-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                    
                    <div className="text-center mb-8 mt-2">
                        <h2 className="text-2xl font-black text-gray-900 uppercase">Portal Akses</h2>
                        <p className="text-gray-500 text-sm mt-1">{activeBranchName}</p>
                    </div>

                    <div className="space-y-4">
                        <button onClick={() => setMode('attendance')} className={`w-full bg-blue-600 text-white p-6 rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex flex-col items-center gap-2 group`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                            <span className="font-bold text-lg">Absensi Karyawan</span>
                            <span className="text-blue-200 text-xs">Untuk semua staff</span>
                        </button>

                        <button onClick={() => setMode('login')} className={`w-full bg-white border-2 border-gray-100 text-gray-800 p-6 rounded-2xl hover:border-${theme}-500 hover:text-${theme}-600 transition-all flex flex-col items-center gap-2 group`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 group-hover:text-${theme}-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span className="font-bold text-lg">Masuk Kasir / Admin</span>
                            <span className="text-gray-400 text-xs">Hanya untuk Kasir & Owner</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Attendance Mode (Render Attendance View directly in kiosk mode)
    if (mode === 'attendance') {
        return (
            <Suspense fallback={<div className="fixed inset-0 bg-white flex items-center justify-center">Loading Camera...</div>}>
                <AttendanceView isKioskMode={true} onBack={() => setMode('selection')} />
            </Suspense>
        );
    }

    // Login Mode (Existing Logic)
    return (
     <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50 p-4">
        <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none"><div className={`absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-${theme}-900 to-gray-900`}></div></div>
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full relative flex flex-col justify-center border-t-4 border-t-orange-500 animate-scale-in">
            <div className="bg-gray-50 p-6 border-b border-gray-100 text-center relative">
                <button onClick={() => setMode('selection')} className="absolute top-4 left-4 text-gray-400 hover:text-gray-800 transition-colors p-2 rounded-full hover:bg-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Login Sistem</h2>
                <p className="text-xs text-gray-500">POS & Backoffice</p>
            </div>
            <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 text-center">Masukkan PIN Login</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`block w-full border-2 border-gray-200 rounded-2xl bg-gray-50 p-4 text-center text-3xl tracking-[0.5em] font-bold focus:bg-white focus:ring-4 focus:ring-${theme}-100 focus:border-${theme}-500 outline-none transition-all`} placeholder="••••" autoFocus required pattern="[0-9]*" inputMode="numeric"/>
                    </div>
                    <button type="submit" className={`w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all shadow-xl hover:scale-[1.02]`}>Buka Kasir</button>
                </form>
                <div className="mt-6 text-center"><p className="text-[10px] text-gray-400">Pastikan Anda memiliki hak akses.</p></div>
            </div>
        </div>
    </div>
    );
};

const DB_VER = 'v4_production';

const App: React.FC = () => {
    const [appMode, setAppMode] = useState<AppMode>('landing');
    const [view, setView] = useState<View>('pos');
    
    const [isLoggedIn, setIsLoggedIn] = useLocalStorage<boolean>(`pos-global-isLoggedIn-${DB_VER}`, false);
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>(`pos-global-currentUser-${DB_VER}`, null);
    
    // Branches
    const [branches, setBranches] = useLocalStorage<Branch[]>(`pos-global-branches-${DB_VER}`, initialBranches);
    
    // Active Branch
    const [activeBranchId, setActiveBranchId] = useLocalStorage<string>(`pos-global-activeBranchId-${DB_VER}`, 'pusat');

    const branchPrefix = `pos-branch-${activeBranchId}`;

    // --- DATA STATES ---
    const [menu, setMenu] = useLocalStorage<MenuItem[]>(`${branchPrefix}-menu`, initialMenuData);
    const [categories, setCategories] = useLocalStorage<Category[]>(`${branchPrefix}-categories`, initialCategories);
    const [orders, setOrders] = useState<Order[]>([]); 
    const [expenses, setExpenses] = useLocalStorage<Expense[]>(`${branchPrefix}-expenses`, []);
    const [activeShift, setActiveShift] = useLocalStorage<Shift | null>(`${branchPrefix}-activeShift`, null);
    const [completedShifts, setCompletedShifts] = useLocalStorage<ShiftSummary[]>(`${branchPrefix}-completedShifts`, []);
    
    const [storeProfile, setStoreProfile] = useLocalStorage<StoreProfile>(`${branchPrefix}-storeProfile`, { ...defaultStoreProfile, branchId: activeBranchId });
    
    const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>(`${branchPrefix}-ingredients`, []);
    const [tables, setTables] = useLocalStorage<Table[]>(`${branchPrefix}-tables`, []);
    
    const [users, setUsers] = useLocalStorage<User[]>(`${branchPrefix}-users`, [
        // Updated Default User with attendancePin
        { id: 'admin-default', name: 'Admin Cabang', pin: '1234', attendancePin: '1111', role: 'admin' },
    ]);

    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]); // NEW STATE

    const [kitchenAlarmTime, setKitchenAlarmTime] = useLocalStorage<number>(`${branchPrefix}-kitchenAlarmTime`, 600);
    const [kitchenAlarmSound, setKitchenAlarmSound] = useLocalStorage<string>(`${branchPrefix}-kitchenAlarmSound`, 'beep');

    const [passwordRequest, setPasswordRequest] = useState<{title: string, onConfirm: () => void, requireAdmin: boolean} | null>(null);
    const [orderToPreview, setOrderToPreview] = useState<Order | null>(null);
    const [printerDevice, setPrinterDevice] = useState<BluetoothDevice | USBDevice | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [dataForBrowserPrint, setDataForBrowserPrint] = useState<{data: Order | ShiftSummary, variant: 'receipt' | 'kitchen' | 'shift'} | null>(null);
    const [printVariant, setPrintVariant] = useState<'receipt' | 'kitchen' | 'shift'>('receipt');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 1024);

    const themeColor = storeProfile.themeColor || 'orange';
    const activeBranchName = branches.find(b => b.id === activeBranchId)?.name || 'Unknown Branch';

    // --- CLOUD SYNC: ORDERS & ATTENDANCE ---
    useEffect(() => {
        const unsubscribeOrders = subscribeToOrders(activeBranchId, setOrders);
        const unsubscribeAttendance = subscribeToAttendance(activeBranchId, setAttendanceRecords); // NEW SYNC
        return () => { unsubscribeOrders(); unsubscribeAttendance(); }
    }, [activeBranchId]);

    // --- CLOUD SYNC: MASTER DATA (Menu, etc) ---
    useEffect(() => {
        const unsubMenu = subscribeToMasterData(activeBranchId, 'menu', (data) => { if(data) setMenu(data); });
        const unsubCats = subscribeToMasterData(activeBranchId, 'categories', (data) => { if(data) setCategories(data); });
        const unsubProfile = subscribeToMasterData(activeBranchId, 'profile', (data) => { if(data) setStoreProfile(data); });
        const unsubIng = subscribeToMasterData(activeBranchId, 'ingredients', (data) => { if(data) setIngredients(data); });
        
        return () => { unsubMenu(); unsubCats(); unsubProfile(); unsubIng(); }
    }, [activeBranchId]);

    // --- UPLOAD MASTER DATA WHEN CHANGED (DEBOUNCED) ---
    const isStaff = isLoggedIn && currentUser;
    
    useEffect(() => { if(isStaff) syncMasterData(activeBranchId, 'menu', menu); }, [menu, activeBranchId, isStaff]);
    useEffect(() => { if(isStaff) syncMasterData(activeBranchId, 'categories', categories); }, [categories, activeBranchId, isStaff]);
    useEffect(() => { if(isStaff) syncMasterData(activeBranchId, 'profile', storeProfile); }, [storeProfile, activeBranchId, isStaff]);
    useEffect(() => { if(isStaff) syncMasterData(activeBranchId, 'ingredients', ingredients); }, [ingredients, activeBranchId, isStaff]);


    // --- DEEP LINKING (QR CODE) ---
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const branchParam = params.get('branch');

        if (branchParam && branchParam !== activeBranchId) {
            setActiveBranchId(branchParam);
        }

        if (mode === 'customer') {
            setAppMode('customer');
        }
    }, []);

    useEffect(() => {
        if (storeProfile.branchId !== activeBranchId) {
            setStoreProfile(prev => ({ ...prev, branchId: activeBranchId }));
        }
    }, [activeBranchId]);

    useEffect(() => {
        const handleResize = () => { if (window.innerWidth < 1024) setIsSidebarCollapsed(true); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (dataForBrowserPrint) {
            const printRootElement = document.getElementById('print-root');
            if (printRootElement) {
                const printRoot = createRoot(printRootElement);
                if (dataForBrowserPrint.variant === 'shift') {
                    printRoot.render(<PrintableReceipt shift={dataForBrowserPrint.data as ShiftSummary} profile={storeProfile} variant="shift" />);
                } else {
                    printRoot.render(<PrintableReceipt order={dataForBrowserPrint.data as Order} profile={storeProfile} variant={dataForBrowserPrint.variant as any} />);
                }
                setTimeout(() => { window.print(); printRoot.unmount(); setDataForBrowserPrint(null); }, 500);
            }
        }
    }, [dataForBrowserPrint, storeProfile]);

    const connectToPrinter = async (type: 'bluetooth' | 'usb') => {
        if (printerDevice) { alert("Printer sudah dipilih."); return; }
        try {
            let device: USBDevice | BluetoothDevice;
            if (type === 'usb') device = await navigator.usb.requestDevice({ filters: [{ classCode: 0x07 }] });
            else device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '00001101-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455'] });
            if(device){ setPrinterDevice(device); alert(`Printer ${device.productName} terhubung.`); }
        } catch (err: any) { 
             alert(`Gagal: ${err.message}. Pastikan Bluetooth/USB aktif & Browser mendukung.`); 
        }
    };

    const disconnectPrinter = async () => { 
        if (printerDevice && 'gatt' in printerDevice && printerDevice.gatt?.connected) { printerDevice.gatt.disconnect(); }
        setPrinterDevice(null); 
    };
    
    const previewReceipt = (order: Order, variant: 'receipt' | 'kitchen' = 'receipt') => { setPrintVariant(variant); setOrderToPreview(order); };
    
    const printOrderToDevice = async (order: Order) => { 
        if (!printerDevice) { alert("Printer belum terhubung."); return; }
        setIsPrinting(true);
        try { await printOrder(printerDevice, order, storeProfile); } catch (error: any) { alert(`Gagal mencetak: ${error.message}`); } finally { setIsPrinting(false); }
    }; 

    const printShiftToDevice = async (shift: ShiftSummary) => {
        if (!printerDevice) { alert("Printer belum terhubung."); return; }
        setIsPrinting(true);
        try { await printShift(printerDevice, shift, storeProfile); } catch (error: any) { alert(`Gagal mencetak: ${error.message}`); } finally { setIsPrinting(false); }
    };

    const printOrderViaBrowser = (data: Order | ShiftSummary, variant: 'receipt' | 'kitchen' | 'shift' = 'receipt') => { setOrderToPreview(null); setDataForBrowserPrint({ data, variant }); };

    const handleLogin = (pin: string) => {
        if (pin === '9999') {
            const ownerUser: User = { id: 'owner', name: 'Super Owner', pin: '9999', attendancePin: '9999', role: 'owner' };
            setCurrentUser(ownerUser);
            setIsLoggedIn(true);
            setView('dashboard'); 
            return;
        }
        // Login uses 'pin', not 'attendancePin'
        const branchUser = users.find(u => u.pin === pin);
        if (branchUser) {
            // RESTRICT STAFF FROM LOGGING INTO POS
            if (branchUser.role === 'staff') {
                alert("Akses Ditolak. Role 'Staff' hanya bisa melakukan Absensi, tidak bisa masuk ke sistem POS.");
                return;
            }

            setCurrentUser(branchUser);
            setIsLoggedIn(true);
            if (branchUser.role === 'kitchen') setView('kitchen');
            else setView('pos');
        } else {
            if (users.length === 0 && pin === '1234') {
                const tempUser: User = { id: 'temp-admin', name: 'Admin (Darurat)', pin: '1234', attendancePin: '1111', role: 'admin' };
                setCurrentUser(tempUser);
                setIsLoggedIn(true);
                setView('pos');
                alert("Login Mode Darurat.");
            } else {
                alert(`PIN Salah.`);
            }
        }
    };
    
    const handleLogout = () => { setIsLoggedIn(false); setCurrentUser(null); setAppMode('landing'); };

    const addCategory = (cat: string) => { if(!categories.includes(cat)) setCategories([...categories, cat]); }
    const deleteCategory = (cat: string) => { if(confirm(`Hapus kategori ${cat}?`)) { setCategories(categories.filter(c => c !== cat)); } }

    const deductStock = (items: CartItem[]) => {
        const deductions = new Map<string, number>();
        const productDeductions = new Map<number, number>();
        items.forEach(item => {
            const menuItem = menu.find(m => m.id === item.id);
            if (menuItem) {
                if (menuItem.recipe && menuItem.recipe.length > 0) { menuItem.recipe.forEach(r => deductions.set(r.ingredientId, (deductions.get(r.ingredientId) || 0) + r.amount * item.quantity)); }
                if (menuItem.stock !== undefined) { productDeductions.set(menuItem.id, (productDeductions.get(menuItem.id) || 0) + item.quantity); }
            }
        });
        setIngredients(prev => prev.map(ing => { const amount = deductions.get(ing.id); return amount ? { ...ing, stock: ing.stock - amount } : ing; }));
        setMenu(prev => prev.map(m => { const deduction = productDeductions.get(m.id); return deduction ? { ...m, stock: (m.stock || 0) - deduction } : m; }));
    };

    const restoreStock = (items: CartItem[]) => {
        const restorations = new Map<string, number>();
        const productRestorations = new Map<number, number>();
        items.forEach(item => {
            const menuItem = menu.find(m => m.id === item.id);
            if (menuItem) {
                if (menuItem.recipe && menuItem.recipe.length > 0) { menuItem.recipe.forEach(r => restorations.set(r.ingredientId, (restorations.get(r.ingredientId) || 0) + r.amount * item.quantity)); }
                if (menuItem.stock !== undefined) { productRestorations.set(menuItem.id, (productRestorations.get(menuItem.id) || 0) + item.quantity); }
            }
        });
        setIngredients(prev => prev.map(ing => { const amount = restorations.get(ing.id); return amount ? { ...ing, stock: ing.stock + amount } : ing; }));
        setMenu(prev => prev.map(m => { const restoration = productRestorations.get(m.id); return restoration ? { ...m, stock: (m.stock || 0) + restoration } : m; }));
    };

    const calculateOrderTotals = (items: CartItem[], discountValue: number, discountType: 'percent' | 'fixed') => {
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        let discount = discountType === 'percent' ? (subtotal * discountValue / 100) : discountValue;
        discount = Math.min(discount, subtotal);
        const taxable = subtotal - discount;
        const service = storeProfile.enableServiceCharge ? taxable * (storeProfile.serviceChargeRate / 100) : 0;
        const tax = storeProfile.enableTax ? (taxable + service) * (storeProfile.taxRate / 100) : 0;
        const total = Math.round(taxable + service + tax);
        return { subtotal, discount, service, tax, total };
    }

    const addOrder = (cart: CartItem[], customerName: string, discountValue: number, discountType: 'percent' | 'fixed', orderType: OrderType, payment?: { method: PaymentMethod }) => {
        const isCustomerSelfOrder = appMode === 'customer';
        if (!activeShift && !isCustomerSelfOrder) { alert("Buka shift terlebih dahulu."); return null; }
        const totals = calculateOrderTotals(cart, discountValue, discountType);
        const shiftOrderCount = (activeShift?.orderCount || 0) + 1;
        const newOrder: Order = {
            id: Date.now().toString(),
            sequentialId: shiftOrderCount,
            customerName,
            items: cart,
            total: totals.total,
            subtotal: totals.subtotal,
            discount: totals.discount,
            discountType,
            discountValue,
            taxAmount: totals.tax,
            serviceChargeAmount: totals.service,
            status: 'pending',
            createdAt: Date.now(),
            isPaid: !!payment,
            paidAt: payment ? Date.now() : undefined,
            paymentMethod: payment?.method,
            shiftId: activeShift?.id || 'offline-customer',
            orderType,
            branchId: activeBranchId
        };
        addOrderToCloud(newOrder);
        if(activeShift) setActiveShift(prev => prev ? { ...prev, orderCount: shiftOrderCount } : null);
        deductStock(cart);
        return newOrder;
    };

    const updateOrder = (orderId: string, cart: CartItem[], discountValue: number, discountType: 'percent' | 'fixed', orderType: OrderType) => {
        const existing = orders.find(o => o.id === orderId);
        if (existing) {
             restoreStock(existing.items);
             deductStock(cart);
             const totals = calculateOrderTotals(cart, discountValue, discountType);
             updateOrderInCloud(orderId, { items: cart, total: totals.total, subtotal: totals.subtotal, discount: totals.discount, taxAmount: totals.tax, serviceChargeAmount: totals.service, discountValue, discountType, orderType });
        }
    };
    
    const voidOrder = (order: Order) => {
        restoreStock(order.items);
        updateOrderInCloud(order.id, { status: 'cancelled' });
        if (order.isPaid && activeShift && order.shiftId === activeShift.id) {
            setActiveShift(prev => {
                if (!prev) return null;
                const isCash = order.paymentMethod === 'Tunai';
                return { ...prev, revenue: prev.revenue - order.total, cashRevenue: isCash ? prev.cashRevenue - order.total : prev.cashRevenue, nonCashRevenue: !isCash ? prev.nonCashRevenue - order.total : prev.nonCashRevenue, transactions: prev.transactions - 1, totalDiscount: prev.totalDiscount - order.discount }
            });
        }
    };
    
    const updateOrderStatus = (id: string, status: OrderStatus) => {
        const updates: Partial<Order> = { status };
        if (status === 'ready') updates.readyAt = Date.now();
        if (status === 'completed') updates.completedAt = Date.now();
        updateOrderInCloud(id, updates);
    };

    const payForOrder = (order: Order, method: PaymentMethod) => {
        if (!activeShift) return null;
        const updates = { isPaid: true, paidAt: Date.now(), paymentMethod: method };
        updateOrderInCloud(order.id, updates);
        const isCash = method === 'Tunai';
        setActiveShift(prev => {
            if(!prev) return null;
            return { ...prev, revenue: prev.revenue + order.total, cashRevenue: isCash ? prev.cashRevenue + order.total : prev.cashRevenue, nonCashRevenue: !isCash ? prev.nonCashRevenue + order.total : prev.nonCashRevenue, transactions: prev.transactions + 1, totalDiscount: prev.totalDiscount + order.discount };
        });
        const updatedOrder = { ...order, ...updates };
        if (storeProfile.autoPrintReceipt) { printOrderViaBrowser(updatedOrder, 'receipt'); } else { setOrderToPreview(updatedOrder); setPrintVariant('receipt'); }
        return updatedOrder;
    };
    
    const splitOrder = (original: Order, itemsToMove: CartItem[]) => {
         if (!activeShift) return;
         const newOrder = addOrder(itemsToMove, `${original.customerName} (Split)`, 0, 'percent', original.orderType);
         if (newOrder) {
             const remainingItems = original.items.map(item => {
                 const splitItem = itemsToMove.find(i => i.id === item.id && i.note === item.note);
                 if (splitItem) { return { ...item, quantity: item.quantity - splitItem.quantity }; }
                 return item;
             }).filter(i => i.quantity > 0);
             if(remainingItems.length > 0) { updateOrder(original.id, remainingItems, original.discountValue, original.discountType, original.orderType); } else { updateOrderStatus(original.id, 'cancelled'); }
         }
    };

    const customerSubmitOrder = async (cart: CartItem[], customerName: string) => {
        const order = addOrder(cart, customerName, 0, 'percent', 'Dine In');
        return !!order;
    };

    // --- ATTENDANCE ACTIONS ---
    const handleClockIn = async (userId: string, userName: string, photoUrl?: string, location?: {lat: number, lng: number}) => {
        const record: AttendanceRecord = {
            id: Date.now().toString(),
            userId,
            userName,
            date: new Date().toISOString().split('T')[0],
            clockInTime: Date.now(),
            status: 'Present',
            photoUrl,
            location, // NEW: Save GPS
            branchId: activeBranchId
        };
        await addAttendanceToCloud(record);
    };

    const handleClockOut = async (recordId: string) => {
        await updateAttendanceInCloud(recordId, { clockOutTime: Date.now(), status: 'Completed' }, activeBranchId);
    };

    const startShift = (startCash: number) => {
        const newShift: Shift = { id: Date.now().toString(), start: Date.now(), start_cash: startCash, revenue: 0, transactions: 0, cashRevenue: 0, nonCashRevenue: 0, totalDiscount: 0, orderCount: 0, branchId: activeBranchId };
        setActiveShift(newShift);
    };

    const closeShift = (closingCash: number) => {
        if (!activeShift) return null;
        const shiftExpenses = expenses.filter(e => e.shiftId === activeShift.id);
        const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
        const expectedCash = activeShift.start_cash + activeShift.cashRevenue - totalExpenses;
        const cashDifference = closingCash - expectedCash;
        const netRevenue = activeShift.revenue - totalExpenses;
        const summary: ShiftSummary = { ...activeShift, end: Date.now(), closingCash, cashDifference, totalExpenses, netRevenue, averageKitchenTime: 0, expectedCash };
        setCompletedShifts(prev => [...prev, summary]);
        setActiveShift(null);
        return summary;
    };

    const deleteAndResetShift = () => { setActiveShift(null); };
    
    const addExpense = (description: string, amount: number) => {
        if(!activeShift) return;
        const newExpense: Expense = { id: Date.now(), description, amount, date: Date.now(), shiftId: activeShift.id };
        setExpenses(prev => [...prev, newExpense]);
    };

    const deleteExpense = (id: number) => setExpenses(prev => prev.filter(e => e.id !== id));

    const requestPassword = (title: string, onConfirm: () => void, requireAdmin = false) => { setPasswordRequest({ title, onConfirm, requireAdmin }); };

    const handlePasswordConfirm = (password: string) => {
        if (password === '9999') { passwordRequest?.onConfirm(); setPasswordRequest(null); return; }
        const valid = requireAdminAccess ? users.find(u => (u.role === 'admin' || u.role === 'owner') && u.pin === password) : users.find(u => u.pin === password);
        if (valid) { passwordRequest?.onConfirm(); setPasswordRequest(null); } else { alert('PIN Salah / Akses Ditolak'); }
    };
    const requireAdminAccess = passwordRequest?.requireAdmin || false;

    const addUser = (user: User) => setUsers(prev => [...prev, user]);
    const updateUser = (user: User) => setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    const deleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));
    const loginUser = (pin: string) => { const user = users.find(u => u.pin === pin); if (user) { setCurrentUser(user); return true; } return false; };
    const addIngredient = (ing: Ingredient) => setIngredients(prev => [...prev, ing]);
    const updateIngredient = (ing: Ingredient) => setIngredients(prev => prev.map(i => i.id === ing.id ? ing : i));
    const deleteIngredient = (id: string) => setIngredients(prev => prev.filter(i => i.id !== id));
    const addTable = (num: string) => { setTables(prev => [...prev, { id: Date.now().toString(), number: num, qrCodeData: `{"table":"${num}"}` }]); };
    const deleteTable = (id: string) => setTables(prev => prev.filter(t => t.id !== id));

    const addBranch = (branch: Branch) => {
        setBranches(prev => [...prev, branch]);
        const newBranchPrefix = `pos-branch-${branch.id}`;
        // Default admin with both keys
        const defaultBranchUsers: User[] = [
            { id: 'admin-' + Date.now(), name: `Admin ${branch.name}`, pin: '1234', attendancePin: '1111', role: 'admin' }
        ];
        localStorage.setItem(`${newBranchPrefix}-users`, JSON.stringify(defaultBranchUsers));
        localStorage.setItem(`${newBranchPrefix}-menu`, JSON.stringify(initialMenuData));
        localStorage.setItem(`${newBranchPrefix}-categories`, JSON.stringify(initialCategories));
        const newProfile: StoreProfile = { ...defaultStoreProfile, name: branch.name, branchId: branch.id };
        localStorage.setItem(`${newBranchPrefix}-storeProfile`, JSON.stringify(newProfile));
    };

    const deleteBranch = (id: string) => setBranches(prev => prev.filter(b => b.id !== id));
    const switchBranch = (branchId: string) => {
        setActiveBranchId(branchId); 
        if (currentUser?.role === 'owner') { setView('dashboard'); } else { setView('pos'); }
    };

    const contextValue: AppContextType = {
        menu, categories, orders, expenses, activeShift, completedShifts, storeProfile, ingredients, tables, branches, users, currentUser, attendanceRecords, kitchenAlarmTime, kitchenAlarmSound,
        setMenu, setCategories, setStoreProfile, setKitchenAlarmTime, setKitchenAlarmSound,
        addCategory, deleteCategory, setIngredients, addIngredient, updateIngredient, deleteIngredient,
        setTables, addTable, deleteTable,
        addBranch, deleteBranch, switchBranch,
        setUsers, addUser, updateUser, deleteUser, loginUser, logout: handleLogout,
        clockIn: handleClockIn, clockOut: handleClockOut, // NEW
        startShift, addOrder, updateOrder, updateOrderStatus, payForOrder, voidOrder, splitOrder, customerSubmitOrder, closeShift, deleteAndResetShift,
        addExpense, deleteExpense, requestPassword,
        printerDevice, isPrinting, connectToPrinter, disconnectPrinter, previewReceipt, printOrderToDevice, printOrderViaBrowser, printShiftToDevice
    };

    const isAdmin = currentUser?.role === 'admin';
    const isKitchen = currentUser?.role === 'kitchen';
    const isCashier = currentUser?.role === 'cashier';
    const isOwner = currentUser?.role === 'owner';
    // isStaff check added implicitly via view logic

    const SidebarLink = ({ v, icon, label }: { v: View, icon: any, label: string }) => {
        const isActive = view === v;
        return (
            <button 
                onClick={() => setView(v)} 
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative 
                    ${isActive ? `bg-white text-${themeColor}-600 shadow-md` : `text-${themeColor}-100 hover:bg-${themeColor}-700/50 hover:text-white`}
                    ${isSidebarCollapsed ? 'justify-center px-2' : ''}
                `}
                title={isSidebarCollapsed ? label : ''}
            >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-current rounded-r-full"></div>}
                <div className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-200`}>
                    {icon}
                </div>
                {!isSidebarCollapsed && <span className={`font-semibold tracking-wide ${isActive ? 'font-bold' : ''}`}>{label}</span>}
            </button>
        );
    }

    return (
        <ErrorBoundary>
            <AppContext.Provider value={contextValue}>
                <ConfigWarning />
                <OfflineIndicator />
                {passwordRequest && <PasswordModal title={passwordRequest.title} onConfirm={handlePasswordConfirm} onCancel={() => setPasswordRequest(null)} theme={themeColor} />}
                
                <Suspense fallback={null}>
                    {orderToPreview && <ReceiptPreviewModal order={orderToPreview} onClose={() => setOrderToPreview(null)} variant={printVariant} />}
                </Suspense>

                {appMode === 'landing' && <LandingPage onSelectMode={setAppMode} storeName={storeProfile.name} logo={storeProfile.logo} slogan={storeProfile.slogan} theme={themeColor} />}
                
                {appMode === 'admin' && !isLoggedIn && <LoginScreen onLogin={handleLogin} onBack={() => setAppMode('landing')} theme={themeColor} activeBranchName={activeBranchName} activeBranchId={activeBranchId} />}
                
                {appMode === 'admin' && isLoggedIn && (
                    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
                        {/* HIDE SIDEBAR FOR STAFF ROLE - THEY ARE LOCKED TO ATTENDANCE VIEW */}
                        {(!isKitchen && currentUser?.role !== 'staff') && (
                            <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-${themeColor}-600 to-${themeColor}-800 flex flex-col py-6 shadow-2xl z-50 flex-shrink-0 relative overflow-hidden transition-all duration-300`}>
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>

                                <div className={`flex items-center gap-3 px-4 mb-4 mt-2 z-10 ${isSidebarCollapsed ? 'flex-col justify-center' : ''}`}>
                                    <div onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-lg font-black text-gray-800 shrink-0 cursor-pointer hover:scale-105 transition-transform">
                                        {storeProfile.logo ? <img src={storeProfile.logo} className="w-full h-full object-cover rounded-xl"/> : 'U'}
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <div className="flex flex-col min-w-0">
                                            <h1 className="font-bold text-white text-lg truncate leading-tight">{storeProfile.name}</h1>
                                            <span className="text-xs text-white/60 font-medium capitalize">{currentUser?.role}</span>
                                        </div>
                                    )}
                                </div>

                                <nav className="flex-1 space-y-2 z-10 px-3 overflow-y-auto scrollbar-hide">
                                    {isOwner && <SidebarLink v="dashboard" icon={<Icons.Dashboard />} label="Command Center" />}
                                    {isOwner && <SidebarLink v="owner_settings" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Kelola Bisnis" />}
                                    <SidebarLink v="pos" icon={<Icons.Pos />} label="Kasir" />
                                    
                                    {/* Attendance Link ONLY VISIBLE TO OWNER */}
                                    {isOwner && <SidebarLink v="attendance" icon={<Icons.Attendance />} label="Absensi" />}
                                    
                                    {storeProfile.enableKitchen && <SidebarLink v="kitchen" icon={<Icons.Kitchen />} label="Dapur" />}
                                    {(isAdmin || isCashier || isOwner) && <SidebarLink v="inventory" icon={<Icons.Inventory />} label="Inventory" />}
                                    <SidebarLink v="shift" icon={<Icons.Shift />} label="Keuangan" />
                                    {(isAdmin || isOwner) && <SidebarLink v="report" icon={<Icons.Report />} label="Laporan" />}
                                </nav>

                                <div className={`mt-auto space-y-3 pt-6 border-t border-white/10 z-10 px-3 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
                                    {(isAdmin || isOwner) && (
                                        <button onClick={() => requestPassword("Masuk Pengaturan?", () => setView('settings'), true)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${view === 'settings' ? 'bg-white text-gray-800 shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`} title="Pengaturan">
                                            <Icons.Settings />
                                            {!isSidebarCollapsed && <span className="font-medium text-sm">{isOwner ? 'Atur Cabang Ini' : 'Pengaturan'}</span>}
                                        </button>
                                    )}
                                    <button onClick={handleLogout} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-200 hover:bg-red-500/20 hover:text-red-100 transition-all group ${isSidebarCollapsed ? 'justify-center px-2' : ''}`} title="Keluar">
                                        <Icons.Logout />
                                        {!isSidebarCollapsed && <span className="font-medium text-sm">Keluar</span>}
                                    </button>
                                </div>
                            </aside>
                        )}

                        <main className="flex-1 relative overflow-hidden flex flex-col h-[100dvh]">
                            <div className="flex-1 overflow-hidden relative">
                                <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-500 font-medium">Memuat Modul...</div>}>
                                    {isKitchen ? (
                                        <KitchenView />
                                    ) : (
                                        <>
                                            {view === 'dashboard' && isOwner && <OwnerDashboard />}
                                            {view === 'owner_settings' && isOwner && <OwnerSettingsView />}
                                            {view === 'pos' && ((activeShift || isOwner) ? <POSView /> : <ShiftView />)}
                                            {/* Attendance View inside Admin Panel (Reports) */}
                                            {view === 'attendance' && isOwner && <AttendanceView isKioskMode={false} />}
                                            {view === 'kitchen' && <KitchenView />}
                                            {view === 'shift' && <ShiftView />}
                                            {view === 'inventory' && (isAdmin || isCashier || isOwner) && <InventoryView />}
                                            {view === 'report' && (isAdmin || isOwner) && <ReportView />}
                                            {view === 'settings' && (isAdmin || isOwner) && <SettingsView />}
                                        </>
                                    )}
                                </Suspense>
                            </div>
                        </main>
                    </div>
                )}

                {appMode === 'customer' && (
                    <Suspense fallback={<div className={`flex items-center justify-center h-screen bg-${themeColor}-50 text-${themeColor}-600 font-bold`}>Memuat Menu...</div>}>
                        <CustomerOrderView onBack={() => setAppMode('landing')} />
                    </Suspense>
                )}
            </AppContext.Provider>
        </ErrorBoundary>
    );
};

export default App;