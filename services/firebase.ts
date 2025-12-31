
import { Table, Order, Shift, StoreProfile, MenuItem, Ingredient, Expense, ShiftSummary, User } from '../types';
import { supabase } from './supabaseClient';

const handleError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    throw error;
};

// --- MAPPING HELPERS ---
const mapMenu = (item: any): MenuItem => ({
    id: item.id,
    name: item.name,
    price: parseFloat(item.price),
    category: item.category,
    imageUrl: item.image_url,
    stock: item.stock,
    minStock: item.min_stock
});

const mapProfile = (p: any): StoreProfile => ({
    branchId: p.branch_id,
    name: p.name,
    address: p.address,
    slogan: p.slogan,
    logo: p.logo,
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

const mapOrder = (o: any): Order => ({
    id: o.id,
    branchId: o.branch_id,
    shiftId: o.shift_id,
    customerName: o.customer_name,
    items: o.items, // JSONB auto maps to array
    total: parseFloat(o.total),
    discount: parseFloat(o.discount || 0),
    status: o.status,
    isPaid: !!o.is_paid,
    paymentMethod: o.payment_method,
    orderType: o.order_type,
    createdAt: parseInt(o.created_at),
    paidAt: o.paid_at ? parseInt(o.paid_at) : undefined,
    sequentialId: o.sequential_id,
    subtotal: 0, // Calculated in UI
    discountType: 'fixed',
    discountValue: 0,
    taxAmount: 0,
    serviceChargeAmount: 0
});

// --- STORE PROFILE ---
export const getStoreProfileFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('store_profiles').select('*').eq('branch_id', branchId).single();
    if (error && error.code !== 'PGRST116') handleError(error, 'getStoreProfile');
    return data ? mapProfile(data) : null;
};

export const updateStoreProfileInCloud = async (profile: StoreProfile) => {
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

// --- MENU & CATEGORIES ---
export const getMenuFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('menu').select('*').eq('branch_id', branchId).order('name', { ascending: true });
    if (error) handleError(error, 'getMenu');
    return (data || []).map(mapMenu);
};

export const addProductToCloud = async (item: MenuItem, branchId: string) => {
    const { error } = await supabase.from('menu').upsert({
        id: item.id || Date.now(),
        branch_id: branchId,
        name: item.name,
        price: item.price,
        category: item.category,
        image_url: item.imageUrl,
        stock: item.stock,
        min_stock: item.minStock
    });
    if (error) handleError(error, 'addProduct');
};

export const deleteProductFromCloud = async (id: number) => {
    const { error } = await supabase.from('menu').delete().eq('id', id);
    if (error) handleError(error, 'deleteProduct');
};

export const getCategoriesFromCloud = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
    if (error) handleError(error, 'getCategories');
    return (data || []).map(c => c.name);
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
    const { data, error } = await supabase.from('users').select('*').eq('branch_id', branchId);
    if (error) handleError(error, 'getUsers');
    return (data || []).map(u => ({
        id: u.id,
        name: u.name,
        pin: u.pin,
        attendancePin: u.attendance_pin,
        role: u.role,
        branchId: u.branch_id
    }));
};

export const addUserToCloud = async (user: User) => {
    const { error } = await supabase.from('users').upsert({
        id: user.id,
        branch_id: user.branchId || 'pusat',
        name: user.name,
        pin: user.pin,
        attendance_pin: user.attendancePin,
        role: user.role
    });
    if (error) handleError(error, 'addUser');
};

export const deleteUserFromCloud = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) handleError(error, 'deleteUser');
};

// --- SHIFTS & ORDERS ---
export const getActiveShiftFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('shifts').select('*').eq('branch_id', branchId).is('end_time', null).single();
    if (error && error.code !== 'PGRST116') handleError(error, 'getActiveShift');
    return data ? {
        ...data,
        start: parseInt(data.start_time),
        end: data.end_time ? parseInt(data.end_time) : null,
        revenue: parseFloat(data.revenue),
        start_cash: parseFloat(data.start_cash)
    } : null;
};

export const startShiftInCloud = async (shift: Shift) => {
    const { error } = await supabase.from('shifts').insert({
        id: shift.id,
        branch_id: shift.branchId,
        start_time: shift.start,
        start_cash: shift.start_cash,
        revenue: 0,
        transactions: 0
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
        transactions: summary.transactions
    }).eq('id', summary.id);
    if (error) handleError(error, 'closeShift');
};

export const addOrderToCloud = async (order: Order) => {
    const { error } = await supabase.from('orders').insert({
        id: order.id,
        branch_id: order.branchId,
        shift_id: order.shiftId,
        customer_name: order.customerName,
        items: order.items,
        total: order.total,
        discount: order.discount,
        status: order.status,
        is_paid: order.isPaid,
        order_type: order.orderType,
        created_at: order.createdAt
    });
    if (error) handleError(error, 'addOrder');
};

export const updateOrderInCloud = async (id: string, updates: any) => {
    const dbUpdates: any = { ...updates };
    if (updates.customerName) { dbUpdates.customer_name = updates.customerName; delete dbUpdates.customerName; }
    if (updates.isPaid !== undefined) { dbUpdates.is_paid = updates.isPaid; delete dbUpdates.isPaid; }
    if (updates.paymentMethod) { dbUpdates.payment_method = updates.paymentMethod; delete dbUpdates.paymentMethod; }
    
    const { error } = await supabase.from('orders').update(dbUpdates).eq('id', id);
    if (error) handleError(error, 'updateOrder');
};

// --- TABLES ---
export const getTablesFromCloud = async (branchId: string): Promise<Table[]> => {
    const { data, error } = await supabase.from('tables').select('*').eq('branch_id', branchId);
    if (error) handleError(error, 'getTables');
    return (data || []).map(t => ({ id: t.id, number: t.table_number, qrCodeData: t.qr_payload }));
};

export const addTableToCloud = async (table: Table, branchId: string) => {
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
        id: i.id,
        name: i.name,
        stock: parseFloat(i.stock),
        unit: i.unit,
        type: i.type,
        minStock: i.min_stock
    }));
};

export const addIngredientToCloud = async (item: Ingredient, branchId: string) => {
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
    const { error } = await supabase.from('menu').update({ stock }).eq('id', id);
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
        id: e.id,
        shiftId: e.shift_id,
        description: e.description,
        amount: parseFloat(e.amount),
        date: parseInt(e.created_at)
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
    const channel = supabase.channel(`orders-${branchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branchId}` }, async () => {
        const { data } = await supabase.from('orders').select('*').eq('branch_id', branchId).order('created_at', { ascending: false });
        onUpdate((data || []).map(mapOrder));
    }).subscribe();
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
    const channel = supabase.channel(`inventory-${branchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, () => onUpdate())
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
export const getCompletedShiftsFromCloud = async (b: string) => [];
export const deleteExpenseFromCloud = async (id: number) => {};
export const updateUserInCloud = async (u: any) => {};
