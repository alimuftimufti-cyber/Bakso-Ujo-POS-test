
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, where, updateDoc, doc, setDoc } from 'firebase/firestore';
import type { Order, AttendanceRecord } from '../types';

// --- HELPER: SAFE ENV ACCESS ---
// Mencegah crash jika import.meta.env tidak terdefinisi
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    console.warn("Env access warning:", e);
  }
  return undefined;
};

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

// EXPORT Project ID untuk ditampilkan di UI Settings
export const currentProjectId = firebaseConfig.projectId;

// Cek apakah user sudah mengisi config
// Pastikan minimal API Key dan Project ID ada
const isConfigConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let db: any = null;
let isFirebaseInitialized = false;

// Helper to notify UI about connection errors
let hasDispatchedError = false;
const dispatchConnectionError = (msg: string) => {
    if (!hasDispatchedError) {
        console.warn("Dispatching Firebase Error:", msg);
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('firebase-connection-error', { detail: msg }));
        }, 2000);
        hasDispatchedError = true;
    }
};

if (isConfigConfigured) {
    try {
        // Prevent multiple app initialization
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        
        try {
            db = getFirestore(app);
            isFirebaseInitialized = true;
            console.log("✅ Firebase Connected: Online Mode Active");
        } catch (firestoreError: any) {
            console.error("⚠️ Firestore Init Error:", firestoreError.message);
            db = null;
            dispatchConnectionError("Gagal inisialisasi Database. Pastikan Firestore sudah dibuat di Console.");
        }
    } catch (e: any) {
        console.error("❌ Firebase App Init Failed (Check Config):", e.message);
        db = null;
        dispatchConnectionError("Config Firebase tidak valid. Cek Environment Variables di Vercel.");
    }
} else {
    console.log("ℹ️ Firebase Config Kosong. Aplikasi berjalan di MODE OFFLINE.");
}

export const isFirebaseReady = isFirebaseInitialized && db !== null;

// --- HELPER: LOCAL STORAGE FALLBACK ---
const getLocal = (key: string) => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const setLocal = (key: string, data: any) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
};

// --- STORE STATUS (BUKA/TUTUP) ---
export const setStoreStatus = async (branchId: string, isOpen: boolean) => {
    if (!db) return;
    try {
        await setDoc(doc(db, `branches/${branchId}/status/current`), { 
            isOpen, 
            updatedAt: Date.now() 
        });
    } catch (e) { console.warn("Offline: Store status not synced"); }
};

export const subscribeToStoreStatus = (branchId: string, onUpdate: (isOpen: boolean) => void) => {
    if (!db) return () => {};
    try {
        return onSnapshot(doc(db, `branches/${branchId}/status/current`), (doc) => {
            if (doc.exists()) onUpdate(doc.data().isOpen);
            else onUpdate(false);
        }, (err) => {
            console.warn("Status sync failed (likely offline):", err.message);
        });
    } catch (e) { return () => {}; }
};

// --- ORDERS ---

export const subscribeToOrders = (branchId: string, onUpdate: (orders: Order[]) => void) => {
    const localKey = `pos-orders-${branchId}`;
    
    const loadLocal = () => {
        const stored = getLocal(localKey);
        if (Array.isArray(stored)) {
            stored.sort((a: Order, b: Order) => b.createdAt - a.createdAt);
            onUpdate(stored);
        } else {
            onUpdate([]);
        }
    };

    if (!db) {
        loadLocal();
        const handler = (e: StorageEvent) => { if (e.key === localKey) loadLocal(); };
        const localHandler = () => loadLocal();
        window.addEventListener('storage', handler);
        window.addEventListener('local-storage-update', localHandler);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('local-storage-update', localHandler);
        };
    }

    try {
        const q = query(collection(db, "orders"), where("branchId", "==", branchId));
        return onSnapshot(q, (snapshot) => {
            const orders: Order[] = [];
            snapshot.forEach((doc) => {
                orders.push({ ...doc.data(), id: doc.id } as Order);
            });
            orders.sort((a, b) => b.createdAt - a.createdAt);
            onUpdate(orders);
        }, (error) => {
            console.warn("Offline fallback triggered:", error.message);
            dispatchConnectionError("Koneksi Database Gagal. Mode Offline Aktif.");
            loadLocal();
        });
    } catch (e) {
        console.error("Critical Firestore Error:", e);
        loadLocal();
        return () => {};
    }
};

export const addOrderToCloud = async (order: Order) => {
    const localKey = `pos-orders-${order.branchId}`;
    try {
        const currentOrders = getLocal(localKey);
        if (!currentOrders.find((o: Order) => o.id === order.id)) {
            currentOrders.push(order);
            setLocal(localKey, currentOrders);
            window.dispatchEvent(new Event('local-storage-update'));
        }
    } catch (e) { console.error("Local save failed", e); }

    if (!db) return order.id;
    
    try {
        const orderData = JSON.parse(JSON.stringify(order));
        const docRef = await addDoc(collection(db, "orders"), { ...orderData, createdAt: Date.now() });
        return docRef.id;
    } catch (e) {
        console.warn("Upload failed (Offline?), order kept locally.");
        return order.id;
    }
};

export const updateOrderInCloud = async (orderId: string, data: Partial<Order>) => {
    try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('pos-orders-'));
        for (const key of keys) {
            const orders = getLocal(key);
            const idx = orders.findIndex((o: Order) => o.id === orderId);
            if (idx !== -1) {
                orders[idx] = { ...orders[idx], ...data };
                setLocal(key, orders);
                window.dispatchEvent(new Event('local-storage-update'));
                break; 
            }
        }
    } catch (e) {}

    if (!db) return;
    try {
        // Note: In production, store the Firestore Doc ID to update directly.
        // This is a simplified query update for robustness in this template.
        const q = query(collection(db, "orders"), where("id", "==", orderId));
        // Logic to update docs found by query would go here
    } catch (e) {
        console.warn("Cloud update failed (Offline?)");
    }
};

// --- ATTENDANCE ---

export const subscribeToAttendance = (branchId: string, onUpdate: (data: AttendanceRecord[]) => void) => {
    const localKey = `pos-attendance-${branchId}`;
    const loadLocal = () => onUpdate(getLocal(localKey));

    if (!db) {
        loadLocal();
        const handler = () => loadLocal();
        window.addEventListener('attendance-update', handler);
        return () => window.removeEventListener('attendance-update', handler);
    }

    try {
        const q = query(collection(db, "attendance"), where("branchId", "==", branchId));
        return onSnapshot(q, (snapshot) => {
            const records: AttendanceRecord[] = [];
            snapshot.forEach((doc) => records.push({ ...doc.data(), id: doc.id } as AttendanceRecord));
            records.sort((a, b) => b.clockInTime - a.clockInTime);
            onUpdate(records);
        }, () => loadLocal());
    } catch (e) {
        loadLocal();
        return () => {};
    }
};

export const addAttendanceToCloud = async (record: AttendanceRecord) => {
    const localKey = `pos-attendance-${record.branchId}`;
    const stored = getLocal(localKey);
    stored.unshift(record);
    setLocal(localKey, stored);
    window.dispatchEvent(new Event('attendance-update'));

    if (!db) return;
    try { await addDoc(collection(db, "attendance"), record); } catch(e) {}
};

export const updateAttendanceInCloud = async (id: string, data: Partial<AttendanceRecord>, branchId: string) => {
    const localKey = `pos-attendance-${branchId}`;
    const stored = getLocal(localKey);
    const idx = stored.findIndex((r: AttendanceRecord) => r.id === id);
    if (idx !== -1) {
        stored[idx] = { ...stored[idx], ...data };
        setLocal(localKey, stored);
        window.dispatchEvent(new Event('attendance-update'));
    }
};

// --- SYNC DATA LAIN ---

export const syncMasterData = async (branchId: string, type: 'menu' | 'categories' | 'profile' | 'ingredients', data: any) => {
    if (!db) return; 
    try {
        const docRef = doc(db, `branches/${branchId}/master/${type}`);
        await setDoc(docRef, { data, updatedAt: Date.now() });
    } catch (e) {}
};

export const subscribeToMasterData = (branchId: string, type: 'menu' | 'categories' | 'profile' | 'ingredients', onUpdate: (data: any) => void) => {
    if (!db) return () => {};
    try {
        const docRef = doc(db, `branches/${branchId}/master/${type}`);
        return onSnapshot(docRef, (doc) => {
            if (doc.exists()) onUpdate(doc.data().data);
        }, () => {});
    } catch (e) { return () => {}; }
};

