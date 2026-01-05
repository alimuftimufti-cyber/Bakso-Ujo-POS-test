
import React, { createContext, useContext } from 'react';

// --- CORE TYPES ---
export type Category = string;
export type ThemeColor = 'orange' | 'red' | 'blue' | 'green' | 'purple' | 'slate' | 'pink';
export type AppMode = 'landing' | 'admin' | 'customer' | 'attendance';

export type IngredientType = 'raw' | 'spice' | 'packaging' | 'equipment' | 'other';

export interface Ingredient {
    id: string;
    name: string;
    unit: string;
    stock: number;
    type: IngredientType;
    minStock?: number;
}

export interface MenuItem {
    id: number;
    name: string;
    price: number;
    category: Category;
    imageUrl?: string;
    stock?: number;
    minStock?: number;
    // Fix: Added missing defaultNote property
    defaultNote?: string;
}

export interface CartItem extends MenuItem {
    quantity: number;
    note: string;
}

export interface Table {
    id: string;
    number: string;
    qrCodeData: string;
}

export interface Branch {
    id: string;
    name: string;
    address?: string;
}

// --- ORDER TYPES ---
export type OrderStatus = 'pending' | 'ready' | 'serving' | 'completed' | 'cancelled';
export type OrderType = 'Dine In' | 'Take Away';
export type PaymentMethod = 'Tunai' | 'QRIS' | 'Debit';
export type OrderSource = 'admin' | 'customer';

export interface Order {
    id: string;
    customerName: string;
    items: CartItem[];
    total: number;
    subtotal: number;
    discount: number;
    discountType: 'percent' | 'fixed'; 
    discountValue: number;
    taxAmount: number;
    serviceChargeAmount: number;
    status: OrderStatus;
    createdAt: number;
    isPaid: boolean;
    paidAt?: number;
    paymentMethod?: PaymentMethod;
    shiftId: string;
    orderType: OrderType;
    sequentialId?: number;
    branchId?: string;
    orderSource?: OrderSource;
    // Fix: Added missing completedAt and readyAt properties
    completedAt?: number;
    readyAt?: number;
}

export interface Expense {
    id: number;
    description: string;
    amount: number;
    date: number;
    shiftId: string;
}

export interface Shift {
    id: string;
    start: number;
    end?: number;
    revenue: number; 
    transactions: number;
    cashRevenue: number;
    nonCashRevenue: number;
    start_cash: number;
    totalDiscount: number;
    closingCash?: number;
    cashDifference?: number;
    branchId?: string;
    // Fix: Added missing createdBy property
    createdBy?: string;
}

export interface ShiftSummary extends Shift {
    averageKitchenTime: number;
    totalExpenses: number;
    netRevenue: number;
    expectedCash: number;
}

// --- ATTENDANCE & MONITORING ---
export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Pulang Awal' | 'Alpha';

export interface AttendanceRecord {
    id: string;
    userId: string;
    userName: string;
    department?: string;
    date: string; // YYYY-MM-DD
    clockInTime: number;
    clockOutTime?: number;
    photoUrl?: string;
    status: AttendanceStatus;
    branchId: string;
    location?: { lat: number; lng: number };
    locationName?: string;
    distanceMeters?: number;
    isWithinRadius?: boolean;
    ipAddress?: string;
    deviceInfo?: string;
}

export interface OfficeSettings {
    branchId: string;
    officeName: string;
    latitude: number;
    longitude: number;
    radiusKm: number;
    startTime: string; // HH:mm:ss
    endTime: string; // HH:mm:ss
}

// --- USER & STAFF ---
export type UserRole = 'owner' | 'admin' | 'cashier' | 'kitchen' | 'staff';

export interface User {
    id: string;
    name: string;
    pin: string; 
    attendancePin: string; 
    role: UserRole;
    department?: string;
    branchId?: string; 
}

export interface StoreProfile {
    name: string;
    address: string;
    logo?: string;
    slogan?: string;
    branchId: string; 
    themeColor: ThemeColor;
    enableKitchen: boolean;
    kitchenMotivations: string[];
    taxRate: number;
    enableTax: boolean;
    serviceChargeRate: number;
    enableServiceCharge: boolean;
    enableTableLayout: boolean;
    enableTableInput: boolean;
    autoPrintReceipt: boolean;
    // Fix: Added missing phoneNumber property
    phoneNumber: string;
    // New: Kitchen settings
    kitchenAlarmTime: number; // in seconds
}

// --- CONTEXT INTERFACE ---
export type View = 'dashboard' | 'pos' | 'kitchen' | 'settings' | 'shift' | 'report' | 'inventory' | 'attendance';

export interface AppContextType {
    menu: MenuItem[];
    categories: Category[];
    orders: Order[];
    expenses: Expense[];
    activeShift: Shift | null;
    completedShifts: ShiftSummary[];
    storeProfile: StoreProfile;
    ingredients: Ingredient[];
    tables: Table[]; 
    users: User[];
    currentUser: User | null;
    attendanceRecords: AttendanceRecord[]; 
    officeSettings: OfficeSettings | null;
    
    isStoreOpen: boolean; 
    isShiftLoading: boolean; 

    setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
    saveMenuItem: (item: MenuItem) => Promise<void>; 
    removeMenuItem: (id: number) => Promise<void>; 
    setStoreProfile: React.Dispatch<React.SetStateAction<StoreProfile>>;
    
    addCategory: (cat: string) => void;
    deleteCategory: (cat: string) => void;

    saveIngredient: (ing: Ingredient) => Promise<void>; 
    removeIngredient: (id: string) => Promise<void>; 
    updateProductStock: (id: number, stock: number) => Promise<void>;
    updateIngredientStock: (id: string, stock: number) => Promise<void>;

    addTable: (num: string) => void;
    deleteTable: (id: string) => void;
    setView: (view: View) => void; 

    addUser: (user: User) => void;
    updateUser: (user: User) => void;
    deleteUser: (id: string) => void;
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    loginUser: (pin: string) => boolean;
    logout: () => void;

    clockIn: (userId: string, userName: string, photoUrl?: string, location?: {lat: number, lng: number}) => Promise<void>;
    clockOut: (recordId: string) => Promise<void>;
    updateOfficeSettings: (settings: OfficeSettings) => Promise<void>;

    startShift: (startCash: number) => void;
    addOrder: (cart: CartItem[], customerName: string, dv: number, dt: 'percent' | 'fixed', ot: OrderType) => Promise<Order | null>;
    updateOrder: (id: string, cart: CartItem[], dv: number, dt: 'percent' | 'fixed', ot: OrderType) => Promise<void>;
    updateOrderStatus: (id: string, status: OrderStatus) => void;
    payForOrder: (order: Order, method: PaymentMethod) => Order | null;
    voidOrder: (order: Order) => void; 
    splitOrder: (original: Order, itemsToMove: CartItem[]) => void;
    customerSubmitOrder: (cart: CartItem[], customerName: string) => Promise<Order | null>;
    closeShift: (cash: number) => ShiftSummary | null;
    // Fix: Added missing deleteAndResetShift method
    deleteAndResetShift: () => Promise<void>;
    refreshOrders: () => Promise<void>; 

    addExpense: (description: string, amount: number) => Promise<void>;
    // Fix: Added missing deleteExpense method
    deleteExpense: (id: number) => Promise<void>;
    requestPassword: (title: string, onConfirm: () => void) => void;
    
    // Fix: Added missing branches state and multi-branch management methods
    branches: Branch[];
    addBranch: (branch: Branch) => Promise<void>;
    deleteBranch: (id: string) => Promise<void>;
    switchBranch: (id: string) => Promise<void>;

    // Fix: Added missing printer control methods
    printerDevice: any;
    isPrinting: boolean;
    connectToPrinter: () => Promise<void>;
    printOrderToDevice: (order: Order) => Promise<void>;
    printShiftToDevice: (shift: ShiftSummary) => Promise<void>;
    printOrderViaBrowser: (data: any, variant?: string) => void;

    // Fix: Added missing kitchenAlarmTime property
    kitchenAlarmTime: number;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};
