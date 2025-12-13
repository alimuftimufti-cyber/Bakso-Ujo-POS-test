import React, { createContext, useContext } from 'react';

// --- GLOBAL DEVICE TYPES (Web Bluetooth & USB) ---
declare global {
    interface USBDevice {
        productName?: string;
        opened: boolean;
        configuration: USBConfiguration | null;
        reset(): Promise<void>;
        open(): Promise<void>;
        selectConfiguration(configurationValue: number): Promise<void>;
        claimInterface(interfaceNumber: number): Promise<void>;
        releaseInterface(interfaceNumber: number): Promise<void>;
        transferOut(endpointNumber: number, data: BufferSource): Promise<any>;
        close(): Promise<void>;
    }
    interface USBConfiguration { interfaces: USBInterface[]; }
    interface USBInterface { interfaceNumber: number; alternate: USBAlternateInterface; claimed: boolean; }
    interface USBAlternateInterface { endpoints: USBEndpoint[]; }
    interface USBEndpoint { endpointNumber: number; direction: 'in' | 'out'; }
    
    interface BluetoothDevice { 
        id: string;
        name?: string;
        productName?: string; 
        gatt?: BluetoothRemoteGATTServer; 
    }
    interface BluetoothRemoteGATTServer { 
        connected: boolean; 
        connect(): Promise<BluetoothRemoteGATTServer>; 
        disconnect(): void; 
        getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>; 
    }
    interface BluetoothRemoteGATTService { 
        getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>; 
        getCharacteristics(characteristic?: string | number): Promise<BluetoothRemoteGATTCharacteristic[]>;
    }
    interface BluetoothRemoteGATTCharacteristic { 
        properties: BluetoothCharacteristicProperties;
        writeValue(value: BufferSource): Promise<void>;
        writeValueWithoutResponse(value: BufferSource): Promise<void>; 
    }
    interface BluetoothCharacteristicProperties {
        write: boolean;
        writeWithoutResponse: boolean;
        read: boolean;
        notify: boolean;
        indicate: boolean;
    }

    interface Navigator {
        bluetooth: { requestDevice(options?: any): Promise<BluetoothDevice>; };
        usb: { requestDevice(options?: any): Promise<USBDevice>; };
    }
}

// --- CORE TYPES ---
export type Category = string;
export type ThemeColor = 'orange' | 'red' | 'blue' | 'green' | 'purple' | 'slate' | 'pink';
export type AppMode = 'landing' | 'admin' | 'customer';

// UPDATED: More detailed ingredient types
export type IngredientType = 'raw' | 'spice' | 'packaging' | 'equipment' | 'other';

export interface Ingredient {
    id: string;
    name: string;
    unit: string; // 'gram', 'ml', 'pcs', 'porsi', 'ikat', 'kg'
    stock: number;
    type: IngredientType;
    minStock?: number; // Alert threshold
}

export interface RecipeItem {
    ingredientId: string;
    amount: number;
}

export interface MenuItem {
    id: number;
    name: string;
    price: number;
    category: Category;
    imageUrl?: string;
    defaultNote?: string;
    recipe?: RecipeItem[];
    stock?: number; // Direct stock for non-recipe items (e.g. Kerupuk)
    minStock?: number;
}

export interface CartItem extends MenuItem {
    quantity: number;
    note: string;
}

// --- NEW: Table Management ---
export interface Table {
    id: string;
    number: string;
    qrCodeData: string;
}

// --- NEW: Branch Management ---
export interface Branch {
    id: string; // unique key e.g., 'cabang-bandung'
    name: string; // display name e.g., 'Cabang Bandung'
    address?: string;
}

// --- ORDER TYPES ---
export type OrderStatus = 'pending' | 'ready' | 'completed' | 'cancelled';
export type OrderType = 'Dine In' | 'Take Away';
export type PaymentMethod = 'Tunai' | 'QRIS' | 'Debit';

export interface Order {
    id: string;
    customerName: string;
    items: CartItem[];
    
    // Financials
    total: number; // Grand Total (Net)
    subtotal: number; // Sum of items
    discount: number; // Nominal Value applied
    discountType: 'percent' | 'fixed'; 
    discountValue: number; // Input value (e.g. 10 for 10%)
    taxAmount: number;
    serviceChargeAmount: number;

    status: OrderStatus;
    createdAt: number;
    readyAt?: number;
    completedAt?: number;
    
    isPaid: boolean;
    paidAt?: number;
    paymentMethod?: PaymentMethod;
    
    shiftId: string;
    orderType: OrderType;
    sequentialId?: number;
    
    // Multi-Branch
    branchId?: string;
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
    orderCount?: number;
    branchId?: string;
}

export interface ShiftSummary extends Shift {
    averageKitchenTime: number;
    totalExpenses: number;
    netRevenue: number;
    expectedCash: number; // Calculated: Start + CashRevenue - Expenses
}

// --- ATTENDANCE TYPES ---
export interface AttendanceRecord {
    id: string;
    userId: string;
    userName: string;
    date: string; // YYYY-MM-DD
    clockInTime: number;
    clockOutTime?: number;
    photoUrl?: string; // Base64 of selfie
    status: 'Present' | 'Late' | 'Completed';
    branchId: string;
    location?: { lat: number; lng: number }; // NEW: GPS Coords
}

// --- USER & STORE TYPES ---
// ADDED 'staff' role for general employees
export type UserRole = 'owner' | 'admin' | 'cashier' | 'kitchen' | 'staff';

export interface User {
    id: string;
    name: string;
    pin: string; // SYSTEM ACCESS PIN (For Login)
    attendancePin: string; // NEW: ATTENDANCE ONLY PIN (For Clock In/Out)
    role: UserRole;
    branchId?: string; // Limit user to branch
}

export interface StoreProfile {
    name: string;
    address: string;
    phoneNumber?: string; // NEW: WhatsApp Number
    logo?: string;
    slogan?: string;
    
    // Multi-Branch
    branchId: string; // Defines which orders this device listens to
    
    // Branding & Features
    themeColor: ThemeColor;
    enableKitchen: boolean;
    kitchenMotivations: string[];

    // Tax & Service Settings
    taxRate: number;
    enableTax: boolean;
    serviceChargeRate: number;
    enableServiceCharge: boolean;
    
    enableTableLayout: boolean;
    enableTableInput: boolean;
    autoPrintReceipt: boolean; 
}

// --- CONTEXT INTERFACE ---
// ADDED 'attendance' to View type
export type View = 'dashboard' | 'pos' | 'kitchen' | 'settings' | 'owner_settings' | 'shift' | 'report' | 'inventory' | 'attendance';

export interface AppContextType {
    // Data State
    menu: MenuItem[];
    categories: Category[];
    orders: Order[];
    expenses: Expense[];
    activeShift: Shift | null;
    completedShifts: ShiftSummary[];
    storeProfile: StoreProfile;
    ingredients: Ingredient[];
    tables: Table[]; 
    branches: Branch[]; // NEW
    users: User[];
    currentUser: User | null;
    attendanceRecords: AttendanceRecord[]; // NEW
    kitchenAlarmTime: number;
    kitchenAlarmSound: string;
    
    // Global Status
    isStoreOpen: boolean; // NEW: Global store open status synced via Firebase

    // Setters & Actions
    setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
    setStoreProfile: React.Dispatch<React.SetStateAction<StoreProfile>>;
    setKitchenAlarmTime: React.Dispatch<React.SetStateAction<number>>;
    setKitchenAlarmSound: React.Dispatch<React.SetStateAction<string>>;
    
    // Categories
    addCategory: (cat: string) => void;
    deleteCategory: (cat: string) => void;

    // Inventory
    setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
    addIngredient: (ing: Ingredient) => void;
    updateIngredient: (ing: Ingredient) => void;
    deleteIngredient: (id: string) => void;

    // Tables
    setTables: React.Dispatch<React.SetStateAction<Table[]>>;
    addTable: (num: string) => void;
    deleteTable: (id: string) => void;

    // Branches
    addBranch: (branch: Branch) => void;
    deleteBranch: (id: string) => void;
    switchBranch: (branchId: string) => void;

    // Users
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    addUser: (user: User) => void;
    updateUser: (user: User) => void;
    deleteUser: (id: string) => void;
    loginUser: (pin: string) => boolean;
    logout: () => void;

    // Attendance
    clockIn: (userId: string, userName: string, photoUrl?: string, location?: {lat: number, lng: number}) => Promise<void>;
    clockOut: (recordId: string) => Promise<void>;

    // Order Logic
    startShift: (startCash: number) => void;
    addOrder: (cart: CartItem[], customerName: string, discountValue: number, discountType: 'percent' | 'fixed', orderType: OrderType, payment?: { method: PaymentMethod }) => Order | null;
    updateOrder: (orderId: string, cart: CartItem[], discountValue: number, discountType: 'percent' | 'fixed', orderType: OrderType) => void;
    updateOrderStatus: (id: string, status: OrderStatus) => void;
    payForOrder: (order: Order, method: PaymentMethod) => Order | null;
    voidOrder: (order: Order) => void; // NEW: Critical for cancelling orders
    splitOrder: (original: Order, itemsToMove: CartItem[]) => void;
    customerSubmitOrder: (cart: CartItem[], customerName: string) => Promise<boolean>;
    closeShift: (cash: number) => ShiftSummary | null;
    deleteAndResetShift: () => void;
    
    // Expenses
    addExpense: (description: string, amount: number) => void;
    deleteExpense: (id: number) => void;
    
    // Security
    requestPassword: (title: string, onConfirm: () => void, requireAdmin?: boolean) => void;
    
    // Printer
    printerDevice: BluetoothDevice | USBDevice | null;
    isPrinting: boolean;
    connectToPrinter: (type: 'bluetooth' | 'usb') => Promise<void>;
    disconnectPrinter: () => Promise<void>;
    previewReceipt: (order: Order, variant?: 'receipt' | 'kitchen') => void;
    printOrderToDevice: (order: Order) => Promise<void>;
    printShiftToDevice: (shift: ShiftSummary) => Promise<void>;
    printOrderViaBrowser: (data: Order | ShiftSummary, variant?: 'receipt' | 'kitchen' | 'shift') => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};