
import { supabase } from './supabaseClient';
import type { Order, AttendanceRecord, MenuItem, Category, StoreProfile, Ingredient, Branch, User, Shift, ShiftSummary, Expense } from '../types';
import { defaultStoreProfile } from '../data';

// --- STATUS KONEKSI ---
export const isFirebaseReady = true; 
export const currentProjectId = "Supabase Project";

const handleError = (error: any, context: string) => {
    if (error) {
        console.error(`Error in ${context}:`, error);
        // console.warn(error.message);
    }
};

// ==========================================
// 1. STORE PROFILE & BRANCHES
// ==========================================

export const getBranchesFromCloud = async (): Promise<Branch[]> => {
    const { data, error } = await supabase.from('branches').select('*');
    handleError(error, 'getBranches');
    return data || [];
};

export const getStoreProfileFromCloud = async (branchId: string): Promise<StoreProfile> => {
    const { data, error } = await supabase.from('branches').select('name, address, settings').eq('id', branchId).single();
    
    if (error || !data) {
        // Fallback jika belum ada di DB
        return { ...defaultStoreProfile, branchId }; 
    }

    const settings = data.settings || {};
    
    return {
        ...defaultStoreProfile,
        ...settings, // Override defaults with DB settings
        name: data.name,
        address: data.address,
        branchId: branchId
    };
};

export const updateStoreProfileInCloud = async (profile: StoreProfile) => {
    const settings = {
        themeColor: profile.themeColor,
        phoneNumber: profile.phoneNumber,
        slogan: profile.slogan,
        logo: profile.logo,
        enableKitchen: profile.enableKitchen,
        kitchenMotivations: profile.kitchenMotivations,
        taxRate: profile.taxRate,
        enableTax: profile.enableTax,
        serviceChargeRate: profile.serviceChargeRate,
        enableServiceCharge: profile.enableServiceCharge,
        enableTableLayout: profile.enableTableLayout,
        enableTableInput: profile.enableTableInput,
        autoPrintReceipt: profile.autoPrintReceipt
    };

    const { error } = await supabase.from('branches').update({
        name: profile.name,
        address: profile.address,
        settings: settings
    }).eq('id', profile.branchId);
    
    handleError(error, 'updateStoreProfile');
};

export const addBranchToCloud = async (branch: Branch) => {
    const { error } = await supabase.from('branches').insert({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        settings: { themeColor: 'orange' } // Default settings
    });
    handleError(error, 'addBranch');
};

export const deleteBranchFromCloud = async (id: string) => {
    const { error } = await supabase.from('branches').delete().eq('id', id);
    handleError(error, 'deleteBranch');
};

// ==========================================
// 2. SHIFTS & EXPENSES (CLOUD)
// ==========================================

export const getActiveShiftFromCloud = async (branchId: string): Promise<Shift | null> => {
    // Cari shift yang end_time nya masih NULL untuk branch ini
    const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('branch_id', branchId)
        .is('end_time', null)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("Error getting active shift", error);
    }

    if (data) {
        return {
            id: data.id,
            start: Number(data.start_time),
            start_cash: Number(data.start_cash),
            revenue: Number(data.revenue),
            cashRevenue: Number(data.cash_revenue),
            nonCashRevenue: Number(data.non_cash_revenue),
            transactions: data.transactions_count,
            totalDiscount: Number(data.total_discount),
            branchId: data.branch_id
        };
    }
    return null;
};

// NEW: Realtime Shift Subscription
export const subscribeToShifts = (branchId: string, onShiftChange: (shift: Shift | null) => void) => {
    // Listen for changes in the shifts table for this branch
    const channel = supabase
        .channel(`realtime-shifts-${branchId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'shifts', filter: `branch_id=eq.${branchId}` },
            async () => {
                // When any change happens, fetch the fresh active shift state
                const activeShift = await getActiveShiftFromCloud(branchId);
                onShiftChange(activeShift);
            }
        )
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const startShiftInCloud = async (shift: Shift) => {
    const { error } = await supabase.from('shifts').insert({
        id: shift.id,
        branch_id: shift.branchId,
        start_time: shift.start,
        start_cash: shift.start_cash,
        revenue: 0,
        cash_revenue: 0,
        non_cash_revenue: 0,
        total_expenses: 0,
        transactions_count: 0
    });
    handleError(error, 'startShift');
};

export const updateShiftInCloud = async (shiftId: string, updates: Partial<Shift>) => {
    const dbUpdates: any = {};
    if (updates.revenue !== undefined) dbUpdates.revenue = updates.revenue;
    if (updates.cashRevenue !== undefined) dbUpdates.cash_revenue = updates.cashRevenue;
    if (updates.nonCashRevenue !== undefined) dbUpdates.non_cash_revenue = updates.nonCashRevenue;
    if (updates.transactions !== undefined) dbUpdates.transactions_count = updates.transactions;
    if (updates.totalDiscount !== undefined) dbUpdates.total_discount = updates.totalDiscount;

    const { error } = await supabase.from('shifts').update(dbUpdates).eq('id', shiftId);
    handleError(error, 'updateShift');
};

export const closeShiftInCloud = async (summary: ShiftSummary) => {
    const { error } = await supabase.from('shifts').update({
        end_time: summary.end,
        closing_cash: summary.closingCash,
        total_expenses: summary.totalExpenses,
        revenue: summary.revenue,
        cash_revenue: summary.cashRevenue,
        non_cash_revenue: summary.nonCashRevenue,
        transactions_count: summary.transactions
    }).eq('id', summary.id);
    handleError(error, 'closeShift');
};

export const getCompletedShiftsFromCloud = async (branchId: string): Promise<ShiftSummary[]> => {
    // Ambil 20 shift terakhir yang sudah selesai (end_time NOT NULL)
    const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('branch_id', branchId)
        .not('end_time', 'is', null)
        .order('end_time', { ascending: false })
        .limit(20);

    handleError(error, 'getCompletedShifts');

    return (data || []).map((s: any) => {
        const startCash = Number(s.start_cash);
        const cashRev = Number(s.cash_revenue);
        const expenses = Number(s.total_expenses);
        const closingCash = Number(s.closing_cash);
        const expected = startCash + cashRev - expenses;

        return {
            id: s.id,
            start: Number(s.start_time),
            end: Number(s.end_time),
            start_cash: startCash,
            revenue: Number(s.revenue),
            cashRevenue: cashRev,
            nonCashRevenue: Number(s.non_cash_revenue),
            totalDiscount: Number(s.total_discount),
            transactions: s.transactions_count,
            closingCash: closingCash,
            totalExpenses: expenses,
            netRevenue: Number(s.revenue) - expenses,
            expectedCash: expected,
            cashDifference: closingCash - expected,
            averageKitchenTime: 0,
            branchId: s.branch_id
        };
    });
};

export const getExpensesFromCloud = async (shiftId: string): Promise<Expense[]> => {
    const { data, error } = await supabase.from('expenses').select('*').eq('shift_id', shiftId);
    handleError(error, 'getExpenses');
    return (data || []).map((e: any) => ({
        id: e.id,
        shiftId: e.shift_id,
        description: e.description,
        amount: Number(e.amount),
        date: Number(e.created_at)
    }));
};

export const addExpenseToCloud = async (expense: Expense) => {
    const { error } = await supabase.from('expenses').insert({
        shift_id: expense.shiftId,
        description: expense.description,
        amount: expense.amount,
        created_at: expense.date
    });
    handleError(error, 'addExpense');
};

export const deleteExpenseFromCloud = async (id: number) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    handleError(error, 'deleteExpense');
};

// ==========================================
// 3. USERS (PEGAWAI)
// ==========================================

export const getUsersFromCloud = async (branchId: string): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`branch_id.eq.${branchId},role.eq.owner`);
        
    handleError(error, 'getUsers');
    
    return (data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        pin: u.pin,
        attendancePin: u.attendance_pin,
        role: u.role as any,
        branchId: u.branch_id
    }));
};

export const addUserToCloud = async (user: User) => {
    const { error } = await supabase.from('users').insert({
        id: user.id,
        name: user.name,
        pin: user.pin,
        attendance_pin: user.attendancePin,
        role: user.role,
        branch_id: user.branchId
    });
    handleError(error, 'addUser');
};

export const deleteUserFromCloud = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    handleError(error, 'deleteUser');
};

export const updateUserInCloud = async (user: User) => {
    const { error } = await supabase.from('users').update({
        name: user.name,
        pin: user.pin,
        attendance_pin: user.attendancePin,
        role: user.role
    }).eq('id', user.id);
    handleError(error, 'updateUser');
};

// ==========================================
// 4. CATEGORIES & MENU
// ==========================================

export const getCategoriesFromCloud = async (): Promise<Category[]> => {
    const { data, error } = await supabase.from('categories').select('name');
    handleError(error, 'getCategories');
    return (data || []).map((c: any) => c.name);
};

export const addCategoryToCloud = async (name: string) => {
    const { error } = await supabase.from('categories').insert({ name });
    handleError(error, 'addCategory');
};

export const deleteCategoryFromCloud = async (name: string) => {
    const { error } = await supabase.from('categories').delete().eq('name', name);
    handleError(error, 'deleteCategory');
};

export const getMenuFromCloud = async (branchId: string): Promise<MenuItem[]> => {
    const { data, error } = await supabase
        .from('products')
        .select(`*, categories (name)`)
        .eq('is_active', true)
        .or(`branch_id.is.null,branch_id.eq.${branchId}`);

    handleError(error, 'getMenu');

    return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        category: p.categories?.name || 'Umum',
        imageUrl: p.image_url,
        stock: p.stock,
        minStock: p.min_stock
    }));
};

export const addProductToCloud = async (item: MenuItem, branchId: string) => {
    const { data: catData } = await supabase.from('categories').select('id').eq('name', item.category).single();
    if (!catData) return;

    const payload = {
        name: item.name,
        price: item.price,
        category_id: catData.id,
        image_url: item.imageUrl,
        stock: item.stock,
        min_stock: item.minStock,
        is_active: true,
        branch_id: null 
    };

    if (item.id && typeof item.id === 'number' && item.id < 1000000000) {
        await supabase.from('products').update(payload).eq('id', item.id);
    } else {
        await supabase.from('products').insert(payload);
    }
};

// NEW: Update only stock for efficiency
export const updateProductStockInCloud = async (id: number, stock: number) => {
    const { error } = await supabase.from('products').update({ stock: stock }).eq('id', id);
    handleError(error, 'updateProductStock');
}

export const updateIngredientStockInCloud = async (id: string, stock: number) => {
    const { error } = await supabase.from('ingredients').update({ stock: stock }).eq('id', id);
    handleError(error, 'updateIngredientStock');
}

export const deleteProductFromCloud = async (id: number) => {
    await supabase.from('products').update({ is_active: false }).eq('id', id);
};

// ==========================================
// 5. ORDERS
// ==========================================

const mapToAppOrder = (dbOrder: any): Order => {
    return {
        id: dbOrder.id,
        sequentialId: dbOrder.sequential_id,
        customerName: dbOrder.customer_name,
        items: dbOrder.order_items ? dbOrder.order_items.map((i: any) => ({
            id: i.product_id,
            name: i.product_name,
            price: i.price,
            quantity: i.quantity,
            note: i.note,
            category: 'Uncategorized', 
        })) : [],
        total: dbOrder.total,
        subtotal: dbOrder.subtotal,
        discount: dbOrder.discount || 0,
        discountType: 'percent',
        discountValue: 0,
        taxAmount: dbOrder.tax || 0,
        serviceChargeAmount: dbOrder.service || 0,
        status: dbOrder.status,
        createdAt: Number(dbOrder.created_at),
        completedAt: dbOrder.completed_at ? Number(dbOrder.completed_at) : undefined,
        paidAt: dbOrder.payment_status === 'paid' ? new Date(dbOrder.updated_at).getTime() : undefined,
        isPaid: dbOrder.payment_status === 'paid',
        paymentMethod: dbOrder.payment_method,
        shiftId: dbOrder.shift_id,
        orderType: dbOrder.type,
        branchId: dbOrder.branch_id
    };
};

export const subscribeToOrders = (branchId: string, onUpdate: (orders: Order[]) => void) => {
    if (!branchId) return () => {};

    const fetchOrders = async () => {
        // Ambil orders dari 24 jam terakhir agar tidak terlalu berat
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const { data, error } = await supabase
            .from('orders')
            .select(`*, order_items (*)`)
            .eq('branch_id', branchId)
            .gte('created_at', oneDayAgo) 
            .order('created_at', { ascending: false });

        if (!error && data) {
            onUpdate(data.map(mapToAppOrder));
        }
    };

    fetchOrders();

    const channel = supabase
        .channel(`realtime-orders-${branchId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branchId}` }, () => fetchOrders())
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const addOrderToCloud = async (order: Order) => {
    const { error: orderError } = await supabase.from('orders').insert({
        id: order.id,
        branch_id: order.branchId,
        shift_id: order.shiftId,
        customer_name: order.customerName,
        type: order.orderType,
        status: order.status,
        payment_method: order.paymentMethod,
        payment_status: order.isPaid ? 'paid' : 'unpaid',
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.taxAmount,
        service: order.serviceChargeAmount,
        total: order.total,
        created_at: order.createdAt
    });

    if (orderError) {
        console.error("Add Order Error", orderError);
        return;
    }

    const items = order.items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        price: item.price,
        quantity: item.quantity,
        note: item.note
    }));
    
    await supabase.from('order_items').insert(items);
};

export const updateOrderInCloud = async (orderId: string, data: Partial<Order>) => {
    const updates: any = {};
    if (data.status) updates.status = data.status;
    if (data.isPaid !== undefined) updates.payment_status = data.isPaid ? 'paid' : 'unpaid';
    if (data.paymentMethod) updates.payment_method = data.paymentMethod;
    if (data.completedAt) updates.completed_at = data.completedAt; 
    
    if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString(); 
        await supabase.from('orders').update(updates).eq('id', orderId);
    }
};

// ==========================================
// 6. ATTENDANCE
// ==========================================

export const subscribeToAttendance = (branchId: string, onUpdate: (data: AttendanceRecord[]) => void) => {
    const fetch = async () => {
        // Fetch only today's attendance
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        
        const { data } = await supabase.from('attendance')
            .select('*')
            .eq('branch_id', branchId)
            .gte('clock_in', startOfDay.getTime())
            .order('clock_in', { ascending: false });
            
        if (data) {
            onUpdate(data.map((r: any) => ({
                id: r.id,
                userId: r.user_id,
                userName: r.user_name,
                branchId: r.branch_id,
                date: r.date,
                clockInTime: Number(r.clock_in),
                clockOutTime: r.clock_out ? Number(r.clock_out) : undefined,
                status: r.status,
                photoUrl: r.photo_url,
                location: r.lat ? { lat: r.lat, lng: r.lng } : undefined
            })));
        }
    };
    fetch();
    return () => {};
};

export const addAttendanceToCloud = async (record: AttendanceRecord) => {
    await supabase.from('attendance').insert({
        id: record.id,
        user_id: record.userId,
        user_name: record.userName,
        branch_id: record.branchId,
        date: record.date,
        clock_in: record.clockInTime,
        status: record.status,
        photo_url: record.photoUrl,
        lat: record.location?.lat,
        lng: record.location?.lng
    });
};

export const updateAttendanceInCloud = async (id: string, data: Partial<AttendanceRecord>, branchId: string) => {
    const updates: any = {};
    if (data.clockOutTime) updates.clock_out = data.clockOutTime;
    if (data.status) updates.status = data.status;
    await supabase.from('attendance').update(updates).eq('id', id);
};

export const setStoreStatus = async (branchId: string, isOpen: boolean) => {};
