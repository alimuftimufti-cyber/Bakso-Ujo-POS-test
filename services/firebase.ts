
import { Table, Order, Shift, StoreProfile, MenuItem, Ingredient, Expense, ShiftSummary, User, CartItem, OrderSource, AttendanceRecord } from '../types';
import { supabase } from './supabaseClient';

const handleError = (error: any, context: string) => {
    console.error(`🔴 Supabase Error [${context}]:`, error.message, error.details);
    return null;
};

// --- INITIALIZATION HELPER ---
export const ensureDefaultBranch = async () => {
    const { data: branch } = await supabase.from('branches').select('id').eq('id', 'pusat').maybeSingle();
    if (!branch) {
        await supabase.from('branches').insert({ id: 'pusat', name: 'Bakso Ujo Pusat' });
    }
};

// --- MAPPING HELPERS ---
const mapMenu = (item: any): MenuItem => {
    return {
        id: Number(item.id),
        name: item.name || 'Produk Tanpa Nama',
        price: parseFloat(item.price || 0),
        category: item.category || 'Bakso',
        imageUrl: item.image_url || '',
        stock: item.stock !== undefined && item.stock !== null ? Number(item.stock) : undefined,
        minStock: (item.min_stock !== undefined && item.min_stock !== null) ? Number(item.min_stock) : 5
    };
};

const mapProfile = (p: any): StoreProfile => ({
    branchId: p.branch_id || 'pusat',
    name: p.name || 'Bakso Ujo',
    address: p.address || '',
    slogan: p.slogan || '',
    logo: p.logo || '',
    taxRate: parseFloat(p.tax_rate || 0),
    enableTax: !!p.enable_tax,
    serviceChargeRate: parseFloat(p.service_charge_rate || 0),
    enableServiceCharge: !!p.enable_service_charge,
    themeColor: p.theme_color || 'orange',
    enableKitchen: true,
    kitchenMotivations: [],
    enableTableLayout: false,
    enableTableInput: true,
    autoPrintReceipt: false
});

const mapOrder = (o: any): Order => {
    const items: CartItem[] = (o.order_items && o.order_items.length > 0) 
        ? o.order_items.map((oi: any) => ({
            id: Number(oi.product_id),
            name: oi.product_name,
            price: parseFloat(oi.price || 0),
            quantity: oi.quantity || 0,
            note: oi.note || '',
            category: ''
        }))
        : [];

    return {
        id: String(o.id),
        branchId: o.branch_id,
        shiftId: o.shift_id,
        customerName: o.customer_name || 'Pelanggan',
        items: items,
        total: parseFloat(o.total || 0),
        subtotal: parseFloat(o.subtotal || 0),
        discount: parseFloat(o.discount || 0),
        taxAmount: parseFloat(o.tax || 0),
        serviceChargeAmount: parseFloat(o.service || 0),
        status: o.status || 'pending',
        isPaid: o.payment_status === 'Paid',
        paymentMethod: o.payment_method,
        orderType: o.type || 'Dine In',
        createdAt: Number(o.created_at),
        paidAt: o.completed_at ? Number(o.completed_at) : undefined,
        sequentialId: o.sequential_id,
        discountType: 'fixed',
        discountValue: 0,
        orderSource: o.order_source || 'admin'
    };
};

const mapShiftSummary = (s: any): ShiftSummary => ({
    id: String(s.id),
    branchId: s.branch_id,
    start: Number(s.start_time),
    end: s.end_time ? Number(s.end_time) : undefined,
    start_cash: parseFloat(s.start_cash || 0),
    closingCash: parseFloat(s.closing_cash || 0),
    revenue: parseFloat(s.revenue || 0),
    cashRevenue: parseFloat(s.cash_revenue || 0),
    nonCashRevenue: parseFloat(s.non_cash_revenue || 0),
    transactions: parseInt(s.transactions_count || 0),
    totalDiscount: parseFloat(s.total_discount || 0),
    cashDifference: parseFloat(s.closing_cash || 0) - (parseFloat(s.start_cash || 0) + parseFloat(s.cash_revenue || 0)),
    totalExpenses: 0, 
    netRevenue: parseFloat(s.revenue || 0),
    averageKitchenTime: 0,
    expectedCash: parseFloat(s.start_cash || 0) + parseFloat(s.cash_revenue || 0)
});

// --- STORE PROFILE ---
export const getStoreProfileFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('store_profiles').select('*').eq('branch_id', branchId).maybeSingle();
    if (error) handleError(error, 'getStoreProfile');
    return data ? mapProfile(data) : null;
};

export const updateStoreProfileInCloud = async (profile: StoreProfile) => {
    await ensureDefaultBranch();
    const { error } = await supabase.from('store_profiles').upsert({
        branch_id: profile.branchId,
        name: profile.name,
        address: profile.address,
        slogan: profile.slogan,
        logo: profile.logo,
        tax_rate: profile.taxRate,
        enable_tax: profile.enableTax,
        service_charge_rate: profile.serviceChargeRate,
        enable_service_charge: profile.enableServiceCharge,
        theme_color: profile.themeColor
    }, { onConflict: 'branch_id' });
    if (error) handleError(error, 'updateStoreProfile');
};

// --- PRODUCTS & CATEGORIES ---
export const getMenuFromCloud = async (branchId: string) => {
    const { data, error } = await supabase
        .from('products') 
        .select('*')
        .eq('branch_id', branchId)
        .order('id', { ascending: true });
    
    if (error) {
        handleError(error, 'getMenu');
        return [];
    }
    
    return (data || []).map(mapMenu);
};

export const addProductToCloud = async (item: MenuItem, branchId: string) => {
    await ensureDefaultBranch();
    const payload: any = {
        id: item.id,
        branch_id: branchId,
        name: item.name,
        price: item.price,
        category: item.category, 
        image_url: item.imageUrl,
        stock: item.stock,
        min_stock: item.minStock || 5
    };

    const { error } = await supabase.from('products').upsert(payload);
    if (error) handleError(error, 'addProduct');
};

export const deleteProductFromCloud = async (id: number) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) handleError(error, 'deleteProduct');
};

export const getCategoriesFromCloud = async () => {
    const { data } = await supabase.from('categories').select('name').order('name', { ascending: true });
    if (!data || data.length === 0) return ['Bakso', 'Mie Ayam', 'Tambahan', 'Makanan', 'Kriuk', 'Minuman'];
    return data.map(c => c.name);
};

export const addCategoryToCloud = async (name: string) => {
    const { error } = await supabase.from('categories').insert({ name });
    if (error) handleError(error, 'addCategory');
};

export const deleteCategoryFromCloud = async (name: string) => {
    const { error } = await supabase.from('categories').delete().eq('name', name);
    if (error) handleError(error, 'deleteCategory');
};

// --- USERS / STAFF ---
export const getUsersFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('users').select('*').eq('branch_id', branchId).order('name', { ascending: true });
    if (error) handleError(error, 'getUsers');
    return (data || []).map(u => ({
        id: String(u.id),
        name: u.name,
        pin: String(u.pin),
        attendancePin: String(u.attendance_pin),
        role: u.role,
        branchId: u.branch_id
    }));
};

export const addUserToCloud = async (user: User) => {
    await ensureDefaultBranch();
    const { error } = await supabase.from('users').upsert({
        id: user.id,
        branch_id: user.branchId || 'pusat',
        name: user.name,
        pin: user.pin,
        attendance_pin: user.attendancePin,
        role: user.role
    }, { onConflict: 'id' });
    if (error) handleError(error, 'addUser');
};

export const updateUserInCloud = async (user: User) => {
    const { error } = await supabase.from('users').update({
        name: user.name,
        pin: user.pin,
        attendance_pin: user.attendancePin,
        role: user.role
    }).eq('id', user.id);
    if (error) handleError(error, 'updateUser');
};

export const deleteUserFromCloud = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) handleError(error, 'deleteUser');
};

// --- ATTENDANCE ---
export const uploadSelfieToCloud = async (file: Blob, fileName: string) => {
    const { data, error } = await supabase.storage
        .from('BAKSOUJOPOS')
        .upload(`attendance/${fileName}`, file);
    
    if (error) {
        handleError(error, 'uploadSelfie');
        return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
        .from('BAKSOUJOPOS')
        .getPublicUrl(`attendance/${fileName}`);
        
    return publicUrl;
};

export const saveAttendanceToCloud = async (record: AttendanceRecord) => {
    const { error } = await supabase.from('attendance').insert({
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
    if (error) handleError(error, 'saveAttendance');
};

export const updateAttendanceInCloud = async (recordId: string, updates: any) => {
    const { error } = await supabase.from('attendance').update({
        clock_out: updates.clockOutTime,
        status: updates.status
    }).eq('id', recordId);
    if (error) handleError(error, 'updateAttendance');
};

export const getAttendanceRecordsFromCloud = async (branchId: string) => {
    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('branch_id', branchId)
        .order('clock_in', { ascending: false });
        
    if (error) handleError(error, 'getAttendance');
    return (data || []).map(r => ({
        id: String(r.id),
        userId: r.user_id,
        userName: r.user_name,
        date: r.date,
        clockInTime: Number(r.clock_in),
        clockOutTime: r.clock_out ? Number(r.clock_out) : undefined,
        photoUrl: r.photo_url,
        status: r.status,
        branchId: r.branch_id,
        location: (r.lat && r.lng) ? { lat: parseFloat(r.lat), lng: parseFloat(r.lng) } : undefined
    }));
};

// --- SHIFTS & ORDERS ---
export const getActiveShiftFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('shifts').select('*').eq('branch_id', branchId).is('end_time', null).maybeSingle();
    if (error) handleError(error, 'getActiveShift');
    return data ? {
        ...data,
        start: Number(data.start_time),
        end: data.end_time ? Number(data.end_time) : null,
        revenue: parseFloat(data.revenue || 0),
        start_cash: parseFloat(data.start_cash || 0),
        transactions: data.transactions_count || 0
    } : null;
};

export const getCompletedShiftsFromCloud = async (branchId: string) => {
    const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('branch_id', branchId)
        .not('end_time', 'is', null)
        .order('end_time', { ascending: false });
    
    if (error) {
        handleError(error, 'getCompletedShifts');
        return [];
    }
    return (data || []).map(mapShiftSummary);
};

export const startShiftInCloud = async (shift: Shift) => {
    await ensureDefaultBranch();
    const { error } = await supabase.from('shifts').insert({
        id: shift.id,
        branch_id: shift.branchId,
        start_time: shift.start,
        start_cash: shift.start_cash,
        revenue: 0
    });
    if (error) handleError(error, 'startShift');
};

export const updateShiftInCloud = async (id: string, updates: any) => {
    const { error } = await supabase.from('shifts').update(updates).eq('id', id);
    if (error) handleError(error, 'updateShift');
};

export const closeShiftInCloud = async (summary: ShiftSummary) => {
    const { error } = await supabase.from('shifts').update({
        end_time: summary.end,
        closing_cash: summary.closingCash,
        revenue: summary.revenue,
        cash_revenue: summary.cashRevenue,
        non_cash_revenue: summary.nonCashRevenue,
        total_discount: summary.totalDiscount,
        transactions_count: summary.transactions
    }).eq('id', summary.id);
    if (error) handleError(error, 'closeShift');
};

export const addOrderToCloud = async (order: Order) => {
    await ensureDefaultBranch();
    
    const { error: orderError } = await supabase.from('orders').insert({
        id: order.id,
        branch_id: order.branchId,
        shift_id: order.shiftId || null,
        customer_name: order.customerName,
        type: order.orderType,
        status: order.status,
        payment_status: order.isPaid ? 'Paid' : 'Unpaid',
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.taxAmount,
        service: order.serviceChargeAmount,
        total: order.total,
        created_at: order.createdAt,
        order_source: order.orderSource || 'admin'
    });

    if (orderError) {
        handleError(orderError, 'addOrder-Header');
        return;
    }

    const itemsToInsert = order.items.map(item => ({
        order_id: order.id,
        product_id: Number(item.id),
        product_name: item.name,
        price: item.price,
        quantity: item.quantity,
        note: item.note
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
    if (itemsError) {
        handleError(itemsError, 'addOrder-Items');
    } else {
        for (const item of order.items) {
            const { data: currentProduct } = await supabase
                .from('products')
                .select('stock')
                .eq('id', Number(item.id))
                .single();
            
            if (currentProduct && currentProduct.stock !== null) {
                const newStock = Math.max(0, currentProduct.stock - item.quantity);
                await supabase.from('products').update({ stock: newStock }).eq('id', Number(item.id));
            }
        }
    }
};

export const updateOrderInCloud = async (id: string, updates: any) => {
    if (updates.items) {
        const { data: oldItems } = await supabase.from('order_items').select('*').eq('order_id', id);
        
        if (oldItems && oldItems.length > 0) {
            for (const oldItem of oldItems) {
                const { data: prod } = await supabase.from('products').select('stock').eq('id', oldItem.product_id).single();
                if (prod && prod.stock !== null) {
                    await supabase.from('products').update({ stock: prod.stock + oldItem.quantity }).eq('id', oldItem.product_id);
                }
            }
        }

        await supabase.from('order_items').delete().eq('order_id', id);

        const itemsToInsert = updates.items.map((item: CartItem) => ({
            order_id: id,
            product_id: Number(item.id),
            product_name: item.name,
            price: item.price,
            quantity: item.quantity,
            note: item.note
        }));
        await supabase.from('order_items').insert(itemsToInsert);

        for (const newItem of updates.items) {
            const { data: prod } = await supabase.from('products').select('stock').eq('id', Number(newItem.id)).single();
            if (prod && prod.stock !== null) {
                const newStock = Math.max(0, prod.stock - newItem.quantity);
                await supabase.from('products').update({ stock: newStock }).eq('id', Number(newItem.id));
            }
        }
    }

    const dbUpdates: any = {};
    if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.total !== undefined) dbUpdates.total = updates.total;
    if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
    if (updates.discount !== undefined) dbUpdates.discount = updates.discount;
    if (updates.taxAmount !== undefined) dbUpdates.tax = updates.taxAmount;
    if (updates.serviceChargeAmount !== undefined) dbUpdates.service = updates.serviceChargeAmount;
    if (updates.orderType !== undefined) dbUpdates.type = updates.orderType;
    if (updates.isPaid !== undefined) {
        dbUpdates.payment_status = updates.isPaid ? 'Paid' : 'Unpaid';
        if (updates.isPaid) dbUpdates.completed_at = Date.now();
    }
    if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;

    if (Object.keys(dbUpdates).length === 0) return;

    const { error } = await supabase.from('orders').update(dbUpdates).eq('id', id);
    if (error) handleError(error, 'updateOrder-Header');
};

// --- TABLES ---
export const getTablesFromCloud = async (branchId: string): Promise<Table[]> => {
    const { data, error } = await supabase.from('tables').select('*').eq('branch_id', branchId);
    if (error) handleError(error, 'getTables');
    return (data || []).map(t => ({ id: String(t.id), number: t.table_number, qr_payload: t.qr_payload }));
};

export const addTableToCloud = async (table: Table, branchId: string) => {
    await ensureDefaultBranch();
    await supabase.from('tables').insert({ id: table.id, branch_id: branchId, table_number: table.number, qr_payload: table.qrCodeData });
};

export const deleteTableFromCloud = async (id: string) => {
    await supabase.from('tables').delete().eq('id', id);
};

// --- INVENTORY / INGREDIENTS ---
export const getIngredientsFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('ingredients').select('*').eq('branch_id', branchId);
    if (error) handleError(error, 'getIngredients');
    return (data || []).map(i => ({
        id: String(i.id),
        name: i.name,
        stock: parseFloat(i.stock || 0),
        unit: i.unit || 'pcs',
        type: i.type || 'other',
        minStock: i.min_stock !== null ? Number(i.min_stock) : 5
    }));
};

export const addIngredientToCloud = async (item: Ingredient, branchId: string) => {
    await ensureDefaultBranch();
    const { error } = await supabase.from('ingredients').upsert({
        id: item.id,
        branch_id: branchId,
        name: item.name,
        stock: item.stock,
        unit: item.unit,
        type: item.type,
        min_stock: item.minStock
    });
    if (error) handleError(error, 'addIngredient');
};

export const deleteIngredientFromCloud = async (id: string) => {
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) handleError(error, 'deleteIngredient');
};

export const updateProductStockInCloud = async (id: number, stock: number) => {
    const { error } = await supabase.from('products').update({ stock }).eq('id', id);
    if (error) handleError(error, 'updateProductStock');
};

export const updateIngredientStockInCloud = async (id: string, stock: number) => {
    const { error } = await supabase.from('ingredients').update({ stock }).eq('id', id);
    if (error) handleError(error, 'updateIngredientStock');
};

// --- EXPENSES ---
export const getExpensesFromCloud = async (shiftId: string) => {
    const { data, error } = await supabase.from('expenses').select('*').eq('shift_id', shiftId);
    if (error) handleError(error, 'getExpenses');
    return (data || []).map(e => ({
        id: Number(e.id),
        shiftId: e.shift_id,
        description: e.description,
        amount: parseFloat(e.amount || 0),
        date: Number(e.created_at)
    }));
};

export const addExpenseToCloud = async (expense: any) => {
    const { error } = await supabase.from('expenses').insert({
        shift_id: expense.shiftId,
        description: expense.description,
        amount: expense.amount,
        created_at: expense.date
    });
    if (error) handleError(error, 'addExpense');
};

// --- SUBSCRIPTIONS ---
export const subscribeToOrders = (branchId: string, onUpdate: (orders: Order[]) => void) => {
    const fetchOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('branch_id', branchId)
            .order('created_at', { ascending: false });
        onUpdate((data || []).map(mapOrder));
    };

    fetchOrders();

    const channel = supabase.channel(`orders-${branchId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branchId}` }, fetchOrders)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, fetchOrders)
        .subscribe();
        
    return () => supabase.removeChannel(channel);
};

export const subscribeToTables = (branchId: string, onUpdate: (tables: Table[]) => void) => {
    const channel = supabase.channel(`tables-${branchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `branch_id=eq.${branchId}` }, async () => {
        const data = await getTablesFromCloud(branchId);
        onUpdate(data);
    }).subscribe();
    return () => supabase.removeChannel(channel);
};

export const subscribeToShifts = (branchId: string, onUpdate: (shift: Shift | null) => void) => {
    const channel = supabase.channel(`shifts-${branchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `branch_id=eq.${branchId}` }, async () => {
        const data = await getActiveShiftFromCloud(branchId);
        onUpdate(data);
    }).subscribe();
    return () => supabase.removeChannel(channel);
};

export const subscribeToInventory = (branchId: string, onUpdate: () => void) => {
    const channel = supabase.channel(`inventory-${branchId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => onUpdate())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => onUpdate())
    .subscribe();
    return () => supabase.removeChannel(channel);
};

export const subscribeToExpenses = (shiftId: string, onUpdate: (expenses: Expense[]) => void) => {
    const channel = supabase.channel(`expenses-${shiftId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `shift_id=eq.${shiftId}` }, async () => {
        const data = await getExpensesFromCloud(shiftId);
        onUpdate(data);
    }).subscribe();
    return () => supabase.removeChannel(channel);
};

export const getBranchesFromCloud = async () => [];
export const addBranchToCloud = async (b: any) => {};
export const deleteBranchFromCloud = async (id: string) => {};
export const deleteExpenseFromCloud = async (id: number) => {};
