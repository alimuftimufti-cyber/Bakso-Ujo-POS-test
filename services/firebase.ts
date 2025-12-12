
// This file acts as the bridge to Firebase Firestore.
// Users must fill in their firebaseConfig for real-time features.

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import type { Order, MenuItem, Category, StoreProfile, Ingredient, AttendanceRecord } from '../types';

// -------------------------------------------------------------------------
// PENTING UNTUK PEMILIK:
// Agar Pesanan Self-Order masuk ke Kasir, Anda WAJIB membuat project Firebase.
// 1. Buka https://console.firebase.google.com/
// 2. Buat Project baru (Gratis)
// 3. Tambahkan App Web (icon </>), beri nama "Bakso POS"
// 4. Copy config yang muncul dan TIMPA (Paste) ke variabel di bawah ini.
// -------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyBC7NkySKbNNvJbbH1gvxBMWjd5VCDFGiI",
  authDomain: "bakso-ujo-pos.firebaseapp.com",
  projectId: "bakso-ujo-pos",
  storageBucket: "bakso-ujo-pos.firebasestorage.app",
  messagingSenderId: "826969755412",
  appId: "1:826969755412:web:97dc6fac7f66c28619fc01",
  measurementId: "G-2FFN1263H7"
};

// Internal checking if config is valid
// Jika API Key masih default, kita anggap OFFLINE MODE
export const isFirebaseReady = firebaseConfig.apiKey !== "ISI_API_KEY_DISINI";

let db: any;

if (isFirebaseReady) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("✅ Firebase Connected: Online Mode Active");
    } catch (e) {
        console.error("❌ Firebase Init Failed:", e);
        // Fallback to offline if config is wrong
    }
} else {
    console.warn("⚠️ Firebase Config Missing: Running in Offline Mode (LocalStorage Only). Orders will NOT sync between devices.");
}

// --- ORDERS ---

export const subscribeToOrders = (branchId: string, onUpdate: (orders: Order[]) => void) => {
    // OFFLINE MODE: Listen to LocalStorage changes
    if (!db) {
        const localKey = `pos-orders-${branchId}`;
        
        // Initial Load
        const loadLocal = () => {
            try {
                const stored = localStorage.getItem(localKey);
                if (stored) onUpdate(JSON.parse(stored));
                else onUpdate([]);
            } catch(e) { onUpdate([]); }
        };
        loadLocal();

        // Listen for updates from same device (e.g. diff tabs)
        const handler = (e: StorageEvent) => {
            if (e.key === localKey) loadLocal();
        };
        // Custom event for same-tab updates
        const localHandler = () => loadLocal();
        
        window.addEventListener('storage', handler);
        window.addEventListener('local-storage-update', localHandler);
        
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('local-storage-update', localHandler);
        };
    }

    // ONLINE MODE: Real-time listener
    const q = query(collection(db, "orders"), where("branchId", "==", branchId), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const orders: Order[] = [];
        snapshot.forEach((doc) => {
            orders.push({ ...doc.data(), id: doc.id } as Order);
        });
        onUpdate(orders);
    }, (error) => {
        console.error("Error subscribing to orders:", error);
    });
};

export const addOrderToCloud = async (order: Order) => {
    if (!db) {
        // Fallback Local for Offline Demo
        const localKey = `pos-orders-${order.branchId}`;
        const stored = localStorage.getItem(localKey);
        const currentOrders: Order[] = stored ? JSON.parse(stored) : [];
        
        // Add new order
        currentOrders.push(order);
        localStorage.setItem(localKey, JSON.stringify(currentOrders));
        
        // Dispatch event to update UI immediately
        window.dispatchEvent(new Event('local-storage-update'));
        return order.id;
    }
    
    try {
        // Hapus field undefined agar tidak error di Firestore
        const orderData = JSON.parse(JSON.stringify(order));
        const docRef = await addDoc(collection(db, "orders"), {
            ...orderData,
            createdAt: Date.now()
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding order: ", e);
        throw e;
    }
};

export const updateOrderInCloud = async (orderId: string, data: Partial<Order>) => {
    if (!db) {
        // Local Update
        // We need to find which branch this order belongs to, or search all (inefficient but okay for offline demo)
        // For simplicity in offline mode, we assume active branch from localStorage keys? 
        // Better: We iterate likely keys.
        const keys = Object.keys(localStorage).filter(k => k.startsWith('pos-orders-'));
        for (const key of keys) {
            const stored = localStorage.getItem(key);
            if (!stored) continue;
            let orders: Order[] = JSON.parse(stored);
            const idx = orders.findIndex(o => o.id === orderId);
            if (idx !== -1) {
                orders[idx] = { ...orders[idx], ...data };
                localStorage.setItem(key, JSON.stringify(orders));
                window.dispatchEvent(new Event('local-storage-update'));
                break;
            }
        }
        return;
    }

    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, data);
    } catch (e) {
        console.error("Error updating order:", e);
    }
};

// --- ATTENDANCE ---

export const subscribeToAttendance = (branchId: string, onUpdate: (data: AttendanceRecord[]) => void) => {
    if (!db) {
        // Offline Attendance
        const localKey = `pos-attendance-${branchId}`;
        const load = () => {
            try { onUpdate(JSON.parse(localStorage.getItem(localKey) || '[]')); } catch(e) { onUpdate([]); }
        };
        load();
        const handler = () => load();
        window.addEventListener('attendance-update', handler);
        return () => window.removeEventListener('attendance-update', handler);
    }

    const q = query(collection(db, "attendance"), where("branchId", "==", branchId), orderBy("clockInTime", "desc"));
    return onSnapshot(q, (snapshot) => {
        const records: AttendanceRecord[] = [];
        snapshot.forEach((doc) => records.push({ ...doc.data(), id: doc.id } as AttendanceRecord));
        onUpdate(records);
    });
};

export const addAttendanceToCloud = async (record: AttendanceRecord) => {
    if (!db) {
        const localKey = `pos-attendance-${record.branchId}`;
        const stored = JSON.parse(localStorage.getItem(localKey) || '[]');
        stored.unshift(record);
        localStorage.setItem(localKey, JSON.stringify(stored));
        window.dispatchEvent(new Event('attendance-update'));
        return;
    }
    await addDoc(collection(db, "attendance"), record);
};

export const updateAttendanceInCloud = async (id: string, data: Partial<AttendanceRecord>, branchId: string) => {
    if (!db) {
        const localKey = `pos-attendance-${branchId}`;
        const stored: AttendanceRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
        const idx = stored.findIndex(r => r.id === id);
        if (idx !== -1) {
            stored[idx] = { ...stored[idx], ...data };
            localStorage.setItem(localKey, JSON.stringify(stored));
            window.dispatchEvent(new Event('attendance-update'));
        }
        return;
    }
    await updateDoc(doc(db, "attendance", id), data);
};

// --- SYNC DATA LAIN (MENU, STOCK, PROFILE) ---

export const syncMasterData = async (branchId: string, type: 'menu' | 'categories' | 'profile' | 'ingredients', data: any) => {
    if (!db) return; // Local changes handled by React State & useLocalStorage in App.tsx
    try {
        const docRef = doc(db, `branches/${branchId}/master/${type}`);
        await setDoc(docRef, { data, updatedAt: Date.now() });
    } catch (e) {
        console.error(`Gagal sync ${type}:`, e);
    }
};

export const subscribeToMasterData = (branchId: string, type: 'menu' | 'categories' | 'profile' | 'ingredients', onUpdate: (data: any) => void) => {
    if (!db) return () => {};
    
    const docRef = doc(db, `branches/${branchId}/master/${type}`);
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            onUpdate(doc.data().data);
        }
    });
};
