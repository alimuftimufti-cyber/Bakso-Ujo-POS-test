
import { Table, Order, Shift, StoreProfile, MenuItem, Ingredient, Expense, ShiftSummary, User, CartItem, OrderSource, AttendanceRecord, OfficeSettings } from '../types';
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
const mapOrder = (o: any): Order => {
    const items = Array.isArray(o.order_items) ? o.order_items.map((item: any) => ({
        id: item.product_id,
        name: item.product_name,
        price: parseFloat(item.price),
        quantity: item.quantity,
        note: item.note || '',
        category: 'Bakso' // Default category mapping
    })) : [];

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
        readyAt: o.ready_at ? Number(o.ready_at) : undefined,
        completedAt: o.completed_at ? Number(o.completed_at) : undefined,
        sequentialId: o.sequential_id,
        discountType: 'fixed',
        discountValue: parseFloat(o.discount || 0),
        orderSource: o.order_source || 'admin'
    };
};

// --- ORDER SERVICES (REALTIME OPTIMIZED) ---
export const subscribeToOrders = (branchId: string, onUpdate: (orders: Order[]) => void) => {
    const fetchOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('branch_id', branchId)
            .order('created_at', { ascending: false });
        
        if (error) { handleError(error, 'fetchOrders'); return; }
        onUpdate((data || []).map(mapOrder));
    };

    // Initial load
    fetchOrders();

    // Listen to ALL changes on orders and order_items
    const channel = supabase.channel(`realtime-orders-${branchId}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'orders',
            filter: `branch_id=eq.${branchId}`
        }, (payload) => {
            console.log('Order change detected:', payload.eventType);
            fetchOrders(); 
        })
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'order_items'
        }, (payload) => {
            console.log('Items change detected:', payload.eventType);
            fetchOrders(); 
        })
        .subscribe((status) => {
            console.log('Realtime Order Sync Status:', status);
        });

    return () => {
        supabase.removeChannel(channel);
    };
};

export const addOrderToCloud = async (order: Order) => {
    await ensureDefaultBranch();
    
    // 1. Insert Header
    const { error: orderError } = await supabase.from('orders').insert({
        id: order.id,
        branch_id: order.branchId || 'pusat',
        shift_id: order.shiftId || null,
        customer_name: order.customerName,
        type: order.orderType,
        status: order.status,
        payment_status: order.isPaid ? 'Paid' : 'Unpaid',
        payment_method: order.paymentMethod || null,
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.taxAmount || 0,
        service: order.serviceChargeAmount || 0,
        total: order.total,
        created_at: order.createdAt,
        order_source: order.orderSource || 'admin'
    });

    if (orderError) throw orderError;

    // 2. Insert Items
    const itemsPayload = order.items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        price: item.price,
        quantity: item.quantity,
        note: item.note
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
    if (itemsError) throw itemsError;
};

export const updateOrderInCloud = async (id: string, updates: any) => {
    const dbPayload: any = {};
    
    if (updates.status) dbPayload.status = updates.status;
    if (updates.orderType) dbPayload.type = updates.orderType;
    if (updates.paymentMethod) dbPayload.payment_method = updates.paymentMethod;
    if (updates.total !== undefined) dbPayload.total = updates.total;
    if (updates.subtotal !== undefined) dbPayload.subtotal = updates.subtotal;
    if (updates.discount !== undefined) dbPayload.discount = updates.discount;
    
    if (updates.isPaid !== undefined) {
        dbPayload.payment_status = updates.isPaid ? 'Paid' : 'Unpaid';
        if (updates.isPaid) dbPayload.paid_at = Date.now();
    }

    if (updates.status === 'serving' || updates.status === 'ready') dbPayload.ready_at = Date.now();
    if (updates.status === 'completed') dbPayload.completed_at = Date.now();

    try {
        const { error } = await supabase.from('orders').update(dbPayload).eq('id', id);
        if (error) throw error;

        // If updating items, replace them
        if (updates.items) {
            await supabase.from('order_items').delete().eq('order_id', id);
            const itemsPayload = updates.items.map((item: any) => ({
                order_id: id,
                product_id: item.id,
                product_name: item.name,
                price: item.price,
                quantity: item.quantity,
                note: item.note
            }));
            await supabase.from('order_items').insert(itemsPayload);
        }
    } catch (err) {
        handleError(err, 'updateOrderInCloud');
        throw err;
    }
};

export const getStoreProfileFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('store_profiles').select('*').eq('branch_id', branchId).maybeSingle();
    if (error) handleError(error, 'getStoreProfile');
    return data ? {
        branchId: data.branch_id,
        name: data.name,
        address: data.address,
        slogan: data.slogan,
        logo: data.logo,
        taxRate: parseFloat(data.tax_rate || 0),
        enableTax: !!data.enable_tax,
        serviceChargeRate: parseFloat(data.service_charge_rate || 0),
        enableServiceCharge: !!data.enable_service_charge,
        themeColor: data.theme_color || 'orange',
        phoneNumber: data.phone_number || ''
    } : null;
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
        theme_color: profile.themeColor,
        phone_number: profile.phoneNumber
    }, { onConflict: 'branch_id' });
    if (error) handleError(error, 'updateStoreProfile');
};

export const getMenuFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('products').select('*').eq('branch_id', branchId).order('name', { ascending: true });
    if (error) return [];
    return (data || []).map(i => ({
        id: Number(i.id),
        name: i.name,
        price: parseFloat(i.price),
        category: i.category,
        imageUrl: i.image_url,
        stock: i.stock
    }));
};

export const addProductToCloud = async (item: MenuItem, branchId: string) => {
    await supabase.from('products').upsert({
        id: item.id,
        branch_id: branchId,
        name: item.name,
        price: item.price,
        category: item.category,
        image_url: item.imageUrl,
        stock: item.stock
    });
};

export const deleteProductFromCloud = async (id: number) => {
    await supabase.from('products').delete().eq('id', id);
};

export const getCategoriesFromCloud = async (): Promise<string[]> => {
    const { data, error } = await supabase.from('categories').select('name').order('name', { ascending: true });
    if (error) return [];
    return (data || []).map((c: any) => c.name);
};

export const addCategoryToCloud = async (name: string) => {
    await supabase.from('categories').insert({ name });
};

export const deleteCategoryFromCloud = async (name: string) => {
    await supabase.from('categories').delete().eq('name', name);
};

export const getActiveShiftFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('shifts').select('*').eq('branch_id', branchId).is('end_time', null).maybeSingle();
    if (error) return null;
    return data ? {
        id: String(data.id),
        start: Number(data.start_time),
        start_cash: parseFloat(data.start_cash || 0),
        revenue: parseFloat(data.revenue || 0),
        transactions: 0,
        cashRevenue: parseFloat(data.cash_revenue || 0),
        nonCashRevenue: parseFloat(data.non_cash_revenue || 0),
        totalDiscount: parseFloat(data.total_discount || 0),
        branchId: data.branch_id
    } : null;
};

export const startShiftInCloud = async (shift: Shift) => {
    await supabase.from('shifts').insert({
        id: shift.id,
        branch_id: shift.branchId,
        start_time: shift.start,
        start_cash: shift.start_cash,
        revenue: 0
    });
};

export const closeShiftInCloud = async (summary: ShiftSummary) => {
    await supabase.from('shifts').update({
        end_time: summary.end,
        closing_cash: summary.closingCash,
        revenue: summary.revenue,
        cash_revenue: summary.cashRevenue,
        non_cash_revenue: summary.nonCashRevenue,
        total_discount: summary.totalDiscount
    }).eq('id', summary.id);
};

export const getUsersFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('users').select('*').eq('branch_id', branchId);
    if (error) return [];
    return (data || []).map(u => ({
        id: String(u.id),
        name: u.name,
        pin: String(u.pin),
        attendancePin: String(u.attendance_pin),
        role: u.role,
        department: u.department,
        branchId: u.branch_id
    }));
};

export const addUserToCloud = async (user: User) => {
    await supabase.from('users').insert({
        id: user.id,
        branch_id: user.branchId || 'pusat',
        name: user.name,
        pin: user.pin,
        attendance_pin: user.attendancePin,
        role: user.role,
        department: user.department
    });
};

export const updateUserInCloud = async (user: User) => {
    await supabase.from('users').update({
        name: user.name,
        pin: user.pin,
        attendance_pin: user.attendancePin,
        role: user.role,
        department: user.department
    }).eq('id', user.id);
};

export const deleteUserFromCloud = async (id: string) => {
    await supabase.from('users').delete().eq('id', id);
};

export const getAttendanceRecordsFromCloud = async (branchId: string, date: string) => {
    const { data, error } = await supabase.from('attendance').select('*').eq('branch_id', branchId).eq('date', date);
    if (error) return [];
    return (data || []).map(r => ({
        id: String(r.id),
        userId: r.user_id,
        userName: r.user_name,
        department: r.department,
        date: r.date,
        clockInTime: Number(r.clock_in),
        clockOutTime: r.clock_out ? Number(r.clock_out) : undefined,
        status: r.status,
        branchId: r.branch_id,
        photoUrl: r.photo_url
    }));
};

export const saveAttendanceToCloud = async (record: AttendanceRecord) => {
    await supabase.from('attendance').insert({
        id: record.id,
        user_id: record.userId,
        user_name: record.userName,
        department: record.department,
        branch_id: record.branchId,
        date: record.date,
        clock_in: record.clockInTime,
        status: record.status,
        photo_url: record.photoUrl
    });
};

export const updateAttendanceInCloud = async (id: string, updates: any) => {
    await supabase.from('attendance').update({
        clock_out: updates.clockOutTime
    }).eq('id', id);
};

export const subscribeToAttendance = (branchId: string, date: string, callback: (records: AttendanceRecord[]) => void) => {
    const fetch = async () => {
        const records = await getAttendanceRecordsFromCloud(branchId, date);
        callback(records);
    };
    fetch();
    const sub = supabase.channel(`attendance-${branchId}-${date}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `branch_id=eq.${branchId}` }, fetch)
        .subscribe();
    return () => supabase.removeChannel(sub);
};

export const getOfficeSettingsFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('office_settings').select('*').eq('branch_id', branchId).maybeSingle();
    if (error) return null;
    return data ? {
        branchId: data.branch_id,
        officeName: data.office_name,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusKm: data.radius_km,
        startTime: data.start_time,
        endTime: data.end_time
    } : null;
};

export const updateOfficeSettingsInCloud = async (settings: OfficeSettings) => {
    await supabase.from('office_settings').upsert({
        branch_id: settings.branchId,
        office_name: settings.officeName,
        latitude: settings.latitude,
        longitude: settings.longitude,
        radius_km: settings.radiusKm,
        start_time: settings.startTime,
        end_time: settings.endTime
    });
};

export const getTablesFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('tables').select('*').eq('branch_id', branchId);
    if (error) return [];
    return (data || []).map(t => ({ id: String(t.id), number: t.table_number, qrCodeData: t.qr_payload }));
};

export const addTableToCloud = async (table: Table, branchId: string) => {
    await ensureDefaultBranch();
    await supabase.from('tables').insert({ id: table.id, branch_id: branchId, table_number: table.number, qr_payload: table.qrCodeData });
};

export const deleteTableFromCloud = async (id: string) => {
    await supabase.from('tables').delete().eq('id', id);
};

export const getCompletedShiftsFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('shifts').select('*').eq('branch_id', branchId).not('end_time', 'is', null).order('end_time', { ascending: false });
    if (error) return [];
    return data.map(s => ({
        id: String(s.id),
        start: Number(s.start_time),
        end: Number(s.end_time),
        revenue: parseFloat(s.revenue || 0),
        cashRevenue: parseFloat(s.cash_revenue || 0),
        nonCashRevenue: parseFloat(s.non_cash_revenue || 0),
        start_cash: parseFloat(s.start_cash || 0),
        closingCash: parseFloat(s.closing_cash || 0),
        cashDifference: (parseFloat(s.closing_cash || 0)) - (parseFloat(s.start_cash || 0) + parseFloat(s.cash_revenue || 0)),
        transactions: 0
    }));
};

export const getIngredientsFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('ingredients').select('*').eq('branch_id', branchId);
    if (error) return [];
    return data.map(i => ({ id: String(i.id), name: i.name, stock: parseFloat(i.stock), unit: i.unit, type: i.type, minStock: i.min_stock }));
};

export const addIngredientToCloud = async (ing: Ingredient, branchId: string) => {
    await supabase.from('ingredients').upsert({ id: ing.id, branch_id: branchId, name: ing.name, stock: ing.stock, unit: ing.unit, type: ing.type, min_stock: ing.minStock });
};

export const deleteIngredientFromCloud = async (id: string) => {
    await supabase.from('ingredients').delete().eq('id', id);
};

export const updateProductStockInCloud = async (id: number, stock: number) => {
    await supabase.from('products').update({ stock }).eq('id', id);
};

export const updateIngredientStockInCloud = async (id: string, stock: number) => {
    await supabase.from('ingredients').update({ stock }).eq('id', id);
};

export const getExpensesFromCloud = async (shiftId: string) => {
    const { data, error } = await supabase.from('expenses').select('*').eq('shift_id', shiftId);
    if (error) return [];
    return data.map(e => ({ id: Number(e.id), description: e.description, amount: parseFloat(e.amount), date: Number(e.created_at), shiftId: e.shift_id }));
};

export const addExpenseToCloud = async (exp: any) => {
    await supabase.from('expenses').insert({ shift_id: exp.shiftId, description: exp.description, amount: exp.amount, created_at: exp.date });
};

export const deleteExpenseFromCloud = async (id: number) => {
    await supabase.from('expenses').delete().eq('id', id);
};

export const subscribeToShifts = (branchId: string, callback: (s: Shift | null) => void) => {
    const fetch = async () => {
        const s = await getActiveShiftFromCloud(branchId);
        callback(s);
    };
    fetch();
    const sub = supabase.channel(`shifts-${branchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, fetch).subscribe();
    return () => supabase.removeChannel(sub);
};

export const subscribeToTables = (branchId: string, callback: (t: Table[]) => void) => {
    const fetch = async () => {
        const t = await getTablesFromCloud(branchId);
        callback(t);
    };
    fetch();
    const sub = supabase.channel(`tables-${branchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetch).subscribe();
    return () => supabase.removeChannel(sub);
};

export const subscribeToInventory = (branchId: string, callback: () => void) => {
    const sub = supabase.channel(`inventory-${branchId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, callback)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, callback)
        .subscribe();
    return () => supabase.removeChannel(sub);
};

export const uploadSelfieToCloud = async (file: Blob, fileName: string) => {
    const { error } = await supabase.storage.from('BAKSOUJOPOS').upload(`attendance/${fileName}`, file);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('BAKSOUJOPOS').getPublicUrl(`attendance/${fileName}`);
    return publicUrl;
};
