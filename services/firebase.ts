
import { supabase } from './supabaseClient';
import type { Order, AttendanceRecord, MenuItem, Category, StoreProfile, Ingredient, Branch, User, Shift, ShiftSummary, Expense } from '../types';
import { defaultStoreProfile, initialBranches } from '../data';

// --- STATUS KONEKSI ---
export const isFirebaseReady = true; 
export const currentProjectId = "Supabase Project";

const handleError = (error: any, context: string) => {
    if (error) {
        console.error(`🔴 DATABASE ERROR [${context}]:`, error.message, error.details);
        if (error.code === '23503') {
            alert(`Gagal Simpan: Data Shift atau Cabang tidak valid di database.`);
        } else {
            alert(`Terjadi kesalahan database: ${error.message}`);
        }
    }
};

// ==========================================
// 1. STORE PROFILE & BRANCHES
// ==========================================

export const getBranchesFromCloud = async (): Promise<Branch[]> => {
    const { data, error } = await supabase.from('branches').select('*');
    if (error) handleError(error, 'getBranches');
    return data || [];
};

export const getStoreProfileFromCloud = async (branchId: string): Promise<StoreProfile> => {
    const { data, error } = await supabase
        .from('branches')
        .select('name, address, settings')
        .eq('id', branchId)
        .maybeSingle();

    if (error) handleError(error, 'getStoreProfile');
    if (!data) return { ...defaultStoreProfile, branchId }; 
    return { 
        ...defaultStoreProfile, 
        ...(data.settings || {}), 
        name: data.name, 
        address: data.address, 
        branchId 
    };
};

export const updateStoreProfileInCloud = async (profile: StoreProfile) => {
    const { error } = await supabase.from('branches').update({
        name: profile.name,
        address: profile.address,
        settings: profile
    }).eq('id', profile.branchId);
    if (error) handleError(error, 'updateStoreProfile');
};

export const addBranchToCloud = async (branch: Branch) => {
    const { error } = await supabase.from('branches').upsert({ id: branch.id, name: branch.name, address: branch.address });
    if (error) handleError(error, 'addBranch');
};

export const deleteBranchFromCloud = async (id: string) => {
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) handleError(error, 'deleteBranch');
};

// ==========================================
// 2. SHIFTS & EXPENSES
// ==========================================

export const getActiveShiftFromCloud = async (branchId: string): Promise<Shift | null> => {
    const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('branch_id', branchId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) handleError(error, 'getActiveShift');
    if (data) {
        return {
            id: data.id,
            start: Number(data.start_time),
            start_cash: Number(data.start_cash),
            revenue: Number(data.revenue || 0),
            cashRevenue: Number(data.cash_revenue || 0),
            nonCashRevenue: Number(data.non_cash_revenue || 0),
            transactions: data.transactions_count || 0,
            totalDiscount: Number(data.total_discount || 0),
            branchId: data.branch_id,
            createdBy: data.created_by
        };
    }
    return null;
};

export const startShiftInCloud = async (shift: Shift): Promise<Shift | null> => {
    const { data, error } = await supabase.from('shifts').insert({
        id: shift.id,
        branch_id: shift.branchId,
        start_time: shift.start,
        start_cash: shift.start_cash,
        revenue: 0,
        cash_revenue: 0,
        non_cash_revenue: 0,
        transactions_count: 0,
        total_expenses: 0,
        created_by: shift.createdBy
    }).select().maybeSingle();

    if (error) handleError(error, 'startShift');
    return data ? shift : null;
};

export const updateShiftInCloud = async (shiftId: string, updates: Partial<Shift>) => {
    const dbUpdates: any = {};
    if (updates.revenue !== undefined) dbUpdates.revenue = updates.revenue;
    if (updates.cashRevenue !== undefined) dbUpdates.cash_revenue = updates.cashRevenue;
    if (updates.nonCashRevenue !== undefined) dbUpdates.non_cash_revenue = updates.nonCashRevenue;
    if (updates.transactions !== undefined) dbUpdates.transactions_count = updates.transactions;

    const { error } = await supabase.from('shifts').update(dbUpdates).eq('id', shiftId);
    if (error) handleError(error, 'updateShift');
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
    if (error) handleError(error, 'closeShift');
};

export const subscribeToShifts = (branchId: string, onShiftChange: (shift: Shift | null) => void) => {
    const channel = supabase
        .channel(`shifts-realtime-${branchId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `branch_id=eq.${branchId}` }, 
            async () => {
                const shift = await getActiveShiftFromCloud(branchId);
                onShiftChange(shift);
            }
        ).subscribe();
    return () => { supabase.removeChannel(channel); };
};

export const getCompletedShiftsFromCloud = async (branchId: string): Promise<ShiftSummary[]> => {
    const { data, error } = await supabase.from('shifts').select('*').eq('branch_id', branchId).not('end_time', 'is', null).order('end_time', { ascending: false }).limit(10);
    if (error) handleError(error, 'getCompletedShifts');
    return (data || []).map((s: any) => ({ ...s, start: Number(s.start_time), end: Number(s.end_time), start_cash: Number(s.start_cash), revenue: Number(s.revenue), cashRevenue: Number(s.cash_revenue), nonCashRevenue: Number(s.non_cash_revenue), totalExpenses: Number(s.total_expenses), netRevenue: Number(s.revenue) - Number(s.total_expenses), transactions: s.transactions_count, expectedCash: Number(s.start_cash) + Number(s.cash_revenue) - Number(s.total_expenses), cashDifference: Number(s.closing_cash) - (Number(s.start_cash) + Number(s.cash_revenue) - Number(s.total_expenses)) }));
};

export const getExpensesFromCloud = async (shiftId: string): Promise<Expense[]> => {
    const { data, error } = await supabase.from('expenses').select('*').eq('shift_id', shiftId);
    if (error) handleError(error, 'getExpenses');
    return (data || []).map((e: any) => ({ id: e.id, shiftId: e.shift_id, description: e.description, amount: Number(e.amount), date: Number(e.created_at) }));
};

export const addExpenseToCloud = async (expense: Expense) => {
    const { error } = await supabase.from('expenses').insert({ shift_id: expense.shiftId, description: expense.description, amount: expense.amount, created_at: expense.date });
    if (error) handleError(error, 'addExpense');
};

export const deleteExpenseFromCloud = async (id: number) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) handleError(error, 'deleteExpense');
};

// ==========================================
// 3. MENU & INVENTORY
// ==========================================

export const getMenuFromCloud = async (branchId: string): Promise<MenuItem[]> => {
    const { data, error } = await supabase.from('products').select(`*, categories (name)`).eq('is_active', true).order('name', { ascending: true });
    if (error) handleError(error, 'getMenu');
    return (data || []).map((p: any) => ({ 
        id: p.id, 
        name: p.name, 
        price: Number(p.price), 
        category: p.categories?.name || 'Umum', 
        imageUrl: p.image_url, 
        stock: p.stock === null ? undefined : Number(p.stock), 
        minStock: p.min_stock === null ? undefined : Number(p.min_stock)
    }));
};

export const addProductToCloud = async (item: MenuItem, branchId: string) => {
    const { data: catData } = await supabase.from('categories').select('id').eq('name', item.category).maybeSingle();
    
    const payload = { 
        name: item.name, 
        price: item.price, 
        category_id: catData?.id || 1, 
        image_url: item.imageUrl, 
        stock: item.stock === undefined ? null : item.stock, 
        min_stock: item.minStock === undefined ? null : item.minStock, 
        is_active: true, 
        branch_id: null 
    };

    if (item.id > 2000000000) {
        const { error } = await supabase.from('products').insert(payload);
        if (error) handleError(error, 'insertProduct');
    } else {
        const { error } = await supabase.from('products').update(payload).eq('id', item.id);
        if (error) handleError(error, 'updateProduct');
    }
};

export const updateProductStockInCloud = async (id: number, stock: number) => {
    const { error } = await supabase.from('products').update({ stock: stock }).eq('id', id);
    if (error) handleError(error, 'updateStock');
};

export const deleteProductFromCloud = async (id: number) => {
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
    if (error) handleError(error, 'deleteProduct');
};

export const getIngredientsFromCloud = async (branchId: string): Promise<Ingredient[]> => {
    const { data, error } = await supabase.from('ingredients').select('*').eq('branch_id', branchId).order('name', { ascending: true });
    if (error) handleError(error, 'getIngredients');
    return (data || []).map((i: any) => ({ id: i.id, name: i.name, unit: i.unit, stock: Number(i.stock), minStock: Number(i.min_stock), type: i.type }));
};

export const addIngredientToCloud = async (ingredient: Ingredient, branchId: string) => {
    const { error } = await supabase.from('ingredients').upsert({ 
        id: ingredient.id, 
        name: ingredient.name, 
        unit: ingredient.unit, 
        stock: ingredient.stock, 
        min_stock: ingredient.minStock, 
        type: ingredient.type, 
        branch_id: branchId 
    });
    if (error) handleError(error, 'upsertIngredient');
};

export const updateIngredientStockInCloud = async (id: string, stock: number) => {
    const { error } = await supabase.from('ingredients').update({ stock: stock }).eq('id', id);
    if (error) handleError(error, 'updateIngStock');
};

export const deleteIngredientFromCloud = async (id: string) => {
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) handleError(error, 'deleteIngredient');
};

export const subscribeToInventory = (branchId: string, onUpdate: () => void) => {
    const productsChannel = supabase.channel(`inv-products`).on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => onUpdate()).subscribe();
    const ingredientsChannel = supabase.channel(`inv-ingredients-${branchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients', filter: `branch_id=eq.${branchId}` }, () => onUpdate()).subscribe();
    
    return () => {
        supabase.removeChannel(productsChannel);
        supabase.removeChannel(ingredientsChannel);
    };
};

// ==========================================
// 4. ORDERS & REALTIME (VITAL FIX)
// ==========================================

export const subscribeToOrders = (branchId: string, onUpdate: (orders: Order[], isNew: boolean) => void) => {
    const fetchOrders = async (isNew: boolean = false) => {
        console.log(`[Realtime] Syncing orders for branch: ${branchId}`);
        const { data, error } = await supabase
            .from('orders')
            .select(`*, order_items (*)`)
            .eq('branch_id', branchId)
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (!error && data) {
            const mappedOrders: Order[] = data.map((dbOrder: any) => ({ 
                id: dbOrder.id, 
                sequentialId: dbOrder.sequential_id, 
                customerName: dbOrder.customer_name, 
                items: dbOrder.order_items ? dbOrder.order_items.map((i: any) => ({ 
                    id: i.product_id || 0, 
                    name: i.product_name, 
                    price: Number(i.price), 
                    quantity: Number(i.quantity), 
                    note: i.note || '', 
                    category: 'Umum' 
                })) : [], 
                total: Number(dbOrder.total), 
                subtotal: Number(dbOrder.subtotal), 
                discount: Number(dbOrder.discount || 0), 
                discountType: 'percent', 
                discountValue: 0, 
                taxAmount: Number(dbOrder.tax || 0), 
                serviceChargeAmount: Number(dbOrder.service || 0), 
                status: dbOrder.status, 
                createdAt: Number(dbOrder.created_at), 
                completedAt: dbOrder.completed_at ? Number(dbOrder.completed_at) : undefined, 
                readyAt: dbOrder.ready_at ? Number(dbOrder.ready_at) : undefined,
                isPaid: dbOrder.payment_status === 'paid', 
                paymentMethod: dbOrder.payment_method, 
                shiftId: dbOrder.shift_id, 
                orderType: dbOrder.type, 
                branchId: dbOrder.branch_id 
            }));
            onUpdate(mappedOrders, isNew);
        }
    };

    // Beban awal
    fetchOrders(false);

    // FIX: Gunakan nama channel yang unik untuk setiap sesi agar tidak ada tabrakan cache realtime
    const channelId = `orders-push-${branchId}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId)
        .on('postgres_changes', { 
            event: 'INSERT', // Pantau khusus penambahan baru untuk notifikasi
            schema: 'public', 
            table: 'orders', 
            filter: `branch_id=eq.${branchId}` 
        }, (payload) => {
            console.log("🔔 Pesanan Baru Masuk dari Self-Service!");
            // DEBOUNCE 800ms: Memberikan waktu bagi tabel order_items untuk selesai menyimpan detail menu
            setTimeout(() => fetchOrders(true), 800);
        })
        .on('postgres_changes', { 
            event: 'UPDATE', // Pantau perubahan status (siap, bayar, dll)
            schema: 'public', 
            table: 'orders', 
            filter: `branch_id=eq.${branchId}` 
        }, () => {
            fetchOrders(false);
        })
        .subscribe((status) => {
            console.log(`[Realtime] Subscription Status for ${branchId}:`, status);
        });

    return () => { 
        console.log(`[Realtime] Unsubscribing from ${channelId}`);
        supabase.removeChannel(channel); 
    };
};

export const addOrderToCloud = async (order: Order) => {
    // Validasi Shift: Jika pesanan dari customer dan shift_id kosong, tetap izinkan masuk (Public)
    const validShiftId = (order.shiftId === 'public' || !order.shiftId) ? null : order.shiftId;

    const { error: orderError } = await supabase.from('orders').insert({ 
        id: order.id, 
        branch_id: order.branchId, 
        shift_id: validShiftId, 
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
        handleError(orderError, 'addOrder');
        throw orderError; 
    }

    const items = order.items.map(item => ({ 
        order_id: order.id, 
        product_id: (item.id > 2000000000 || item.id === 0) ? null : item.id, 
        product_name: item.name, 
        price: item.price, 
        quantity: item.quantity, 
        note: item.note 
    }));
    
    const { error: itemsError } = await supabase.from('order_items').insert(items);
    if (itemsError) handleError(itemsError, 'addOrderItems');
};

export const updateOrderInCloud = async (orderId: string, data: Partial<Order> | any) => {
    const updates: any = {};
    if (data.status) updates.status = data.status;
    if (data.isPaid !== undefined) updates.payment_status = data.isPaid ? 'paid' : 'unpaid';
    if (data.payment_status) updates.payment_status = data.payment_status; 
    if (data.paymentMethod) updates.payment_method = data.paymentMethod;
    if (data.completedAt) updates.completed_at = data.completedAt;
    if (data.readyAt) updates.ready_at = data.readyAt; 
    
    updates.updated_at = new Date().toISOString();
    
    const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
    if (error) handleError(error, 'updateOrder');
};

export const getUsersFromCloud = async (branchId: string): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) handleError(error, 'getUsers');
    return (data || []).map((u: any) => ({ id: u.id, name: u.name, pin: u.pin, attendancePin: u.attendance_pin, role: u.role, branchId: u.branch_id }));
};

export const addUserToCloud = async (user: User) => {
    const { error } = await supabase.from('users').upsert({ id: user.id, name: user.name, pin: user.pin, attendance_pin: user.attendancePin, role: user.role, branch_id: user.branchId });
    if (error) handleError(error, 'addUser');
};

export const deleteUserFromCloud = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) handleError(error, 'deleteUser');
};

export const updateUserInCloud = async (user: User) => {
    const { error } = await supabase.from('users').update({ name: user.name, pin: user.pin, attendance_pin: user.attendancePin, role: user.role }).eq('id', user.id);
    if (error) handleError(error, 'updateUser');
};

export const getCategoriesFromCloud = async (): Promise<Category[]> => {
    const { data, error } = await supabase.from('categories').select('name');
    if (error) handleError(error, 'getCategories');
    return (data || []).map((c: any) => c.name);
};

export const addCategoryToCloud = async (name: string) => {
    const { error } = await supabase.from('categories').insert({ name });
    if (error) handleError(error, 'addCategory');
};

export const deleteCategoryFromCloud = async (name: string) => {
    const { error } = await supabase.from('categories').delete().eq('name', name);
    if (error) handleError(error, 'deleteCategory');
};

export const subscribeToAttendance = (branchId: string, onUpdate: (data: AttendanceRecord[]) => void) => {
    const fetch = async () => {
        const { data } = await supabase.from('attendance').select('*').eq('branch_id', branchId).order('clock_in', { ascending: false });
        if (data) onUpdate(data.map((r: any) => ({ id: r.id, userId: r.user_id, userName: r.user_name, branchId: r.branch_id, date: r.date, clockInTime: Number(r.clock_in), clockOutTime: r.clock_out ? Number(r.clock_out) : undefined, status: r.status, photoUrl: r.photo_url, location: { lat: Number(r.lat), lng: Number(r.lng) } })));
    };
    fetch(); return () => {};
};

export const addAttendanceToCloud = async (record: AttendanceRecord) => {
    const { error } = await supabase.from('attendance').insert({ id: record.id, user_id: record.userId, user_name: record.userName, branch_id: record.branchId, date: record.date, clock_in: record.clockInTime, status: record.status, photo_url: record.photoUrl, lat: record.location?.lat, lng: record.location?.lng });
    if (error) handleError(error, 'addAttendance');
};

export const updateAttendanceInCloud = async (id: string, data: Partial<AttendanceRecord>, branchId: string) => {
    const { error } = await supabase.from('attendance').update({ clock_out: data.clockOutTime, status: data.status }).eq('id', id);
    if (error) handleError(error, 'updateAttendance');
};
