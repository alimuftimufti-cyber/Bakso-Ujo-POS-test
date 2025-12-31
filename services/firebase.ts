
import { Table, Order, Shift, StoreProfile, MenuItem, Ingredient, Expense, ShiftSummary } from '../types';
import { supabase } from './supabaseClient';

const handleError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    throw error;
};

// BASIC READS
export const getStoreProfileFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('store_profiles').select('*').eq('branch_id', branchId).single();
    if (error && error.code !== 'PGRST116') handleError(error, 'getStoreProfile');
    return data;
};

export const getMenuFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('menu').select('*').eq('branch_id', branchId);
    if (error) handleError(error, 'getMenu');
    return data || [];
};

export const getIngredientsFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('ingredients').select('*').eq('branch_id', branchId);
    if (error) handleError(error, 'getIngredients');
    return data || [];
};

export const getUsersFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('users').select('*').eq('branch_id', branchId);
    if (error) handleError(error, 'getUsers');
    return data || [];
};

export const getCategoriesFromCloud = async () => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) handleError(error, 'getCategories');
    return (data || []).map(c => c.name);
};

// SHIFTS
export const getActiveShiftFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('shifts').select('*').eq('branch_id', branchId).is('end', null).single();
    if (error && error.code !== 'PGRST116') handleError(error, 'getActiveShift');
    return data;
};

export const startShiftInCloud = async (shift: Shift) => {
    const { error } = await supabase.from('shifts').insert(shift);
    if (error) handleError(error, 'startShift');
};

export const closeShiftInCloud = async (summary: ShiftSummary) => {
    const { error } = await supabase.from('shifts').update(summary).eq('id', summary.id);
    if (error) handleError(error, 'closeShift');
};

export const updateShiftInCloud = async (id: string, updates: any) => {
    const { error } = await supabase.from('shifts').update(updates).eq('id', id);
    if (error) handleError(error, 'updateShift');
};

// ORDERS
export const addOrderToCloud = async (order: Order) => {
    const { error } = await supabase.from('orders').insert(order);
    if (error) handleError(error, 'addOrder');
};

export const updateOrderInCloud = async (id: string, updates: any) => {
    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (error) handleError(error, 'updateOrder');
};

// EXPENSES
export const getExpensesFromCloud = async (shiftId: string) => {
    const { data, error } = await supabase.from('expenses').select('*').eq('shift_id', shiftId);
    if (error) handleError(error, 'getExpenses');
    return data || [];
};

export const addExpenseToCloud = async (expense: any) => {
    const { error } = await supabase.from('expenses').insert(expense);
    if (error) handleError(error, 'addExpense');
};

// STOCK UPDATES
export const updateProductStockInCloud = async (id: number, stock: number) => {
    const { error } = await supabase.from('menu').update({ stock }).eq('id', id);
    if (error) handleError(error, 'updateProductStock');
};

export const updateIngredientStockInCloud = async (id: string, stock: number) => {
    const { error } = await supabase.from('ingredients').update({ stock }).eq('id', id);
    if (error) handleError(error, 'updateIngredientStock');
};

// TABLE MANAGEMENT
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

// SUBSCRIPTIONS
export const subscribeToOrders = (branchId: string, onUpdate: (orders: Order[]) => void) => {
    const channel = supabase.channel(`orders-${branchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const { data } = await supabase.from('orders').select('*').eq('branch_id', branchId).order('createdAt', { ascending: false });
        onUpdate(data || []);
    }).subscribe();
    return () => supabase.removeChannel(channel);
};

export const subscribeToTables = (branchId: string, onUpdate: (tables: Table[]) => void) => {
    const channel = supabase.channel(`tables-${branchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, async () => {
        const data = await getTablesFromCloud(branchId);
        onUpdate(data);
    }).subscribe();
    return () => supabase.removeChannel(channel);
};

export const subscribeToShifts = (branchId: string, onUpdate: (shift: Shift | null) => void) => {
    const channel = supabase.channel(`shifts-${branchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, async () => {
        const data = await getActiveShiftFromCloud(branchId);
        onUpdate(data);
    }).subscribe();
    return () => supabase.removeChannel(channel);
};

export const subscribeToInventory = (branchId: string, onUpdate: () => void) => {
    const channel = supabase.channel(`inv-${branchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, onUpdate).subscribe();
    return () => supabase.removeChannel(channel);
};

export const subscribeToExpenses = (shiftId: string, onUpdate: (expenses: Expense[]) => void) => {
    const channel = supabase.channel(`exp-${shiftId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, async () => {
        const data = await getExpensesFromCloud(shiftId);
        onUpdate(data);
    }).subscribe();
    return () => supabase.removeChannel(channel);
};

// STUBS FOR TYPES
export const getBranchesFromCloud = async () => [];
export const addBranchToCloud = async (b: any) => {};
export const deleteBranchFromCloud = async (id: string) => {};
export const addUserToCloud = async (u: any) => {};
export const updateUserInCloud = async (u: any) => {};
export const deleteUserFromCloud = async (id: string) => {};
export const addProductToCloud = async (i: any, b: string) => {};
export const deleteProductFromCloud = async (id: number) => {};
export const addCategoryToCloud = async (c: string) => {};
export const deleteCategoryFromCloud = async (c: string) => {};
export const getCompletedShiftsFromCloud = async (b: string) => [];
export const deleteExpenseFromCloud = async (id: number) => {};
export const updateStoreProfileInCloud = async (p: any) => {};
export const addIngredientToCloud = async (i: any, b: string) => {};
export const deleteIngredientFromCloud = async (id: string) => {};
