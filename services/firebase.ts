
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

// --- GEOLOCATION HELPERS ---
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius bumi dalam KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Kembalikan dalam Meter
};

export const getReverseGeocoding = async (lat: number, lng: number) => {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await res.json();
        return data.display_name || "Lokasi Tidak Dikenal";
    } catch (e) {
        return "Gagal melacak alamat";
    }
};

// --- OFFICE SETTINGS ---
export const getOfficeSettingsFromCloud = async (branchId: string): Promise<OfficeSettings | null> => {
    const { data, error } = await supabase.from('office_settings').select('*').eq('branch_id', branchId).maybeSingle();
    if (error) { handleError(error, 'getOfficeSettings'); return null; }
    if (!data) return null;
    return {
        branchId: data.branch_id,
        officeName: data.office_name,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusKm: data.radius_km,
        startTime: data.start_time,
        endTime: data.end_time
    };
};

export const updateOfficeSettingsInCloud = async (settings: OfficeSettings) => {
    const { error } = await supabase.from('office_settings').upsert({
        branch_id: settings.branchId,
        office_name: settings.officeName,
        latitude: settings.latitude,
        longitude: settings.longitude,
        radius_km: settings.radiusKm,
        start_time: settings.startTime,
        end_time: settings.endTime
    }, { onConflict: 'branch_id' });
    if (error) handleError(error, 'updateOfficeSettings');
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

// FIX: Added missing properties to match StoreProfile interface
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
    enableKitchen: p.enable_kitchen !== undefined ? !!p.enable_kitchen : true,
    kitchenMotivations: Array.isArray(p.kitchen_motivations) ? p.kitchen_motivations : [],
    enableTableLayout: !!p.enable_table_layout,
    enableTableInput: p.enable_table_input !== undefined ? !!p.enable_table_input : true,
    autoPrintReceipt: !!p.auto_print_receipt,
    phoneNumber: p.phone_number || '',
    kitchenAlarmTime: p.kitchen_alarm_time || 600
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
        orderSource: o.order_source || 'admin',
        completedAt: o.completed_at ? Number(o.completed_at) : undefined,
        readyAt: o.ready_at ? Number(o.ready_at) : undefined
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
    expectedCash: parseFloat(s.start_cash || 0) + parseFloat(s.cash_revenue || 0),
    createdBy: s.created_by
});

// --- STORE PROFILE ---
export const getStoreProfileFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('store_profiles').select('*').eq('branch_id', branchId).maybeSingle();
    if (error) handleError(error, 'getStoreProfile');
    return data ? mapProfile(data) : null;
};

// FIX: Updated to upsert all StoreProfile properties
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
        theme_color: profile.themeColor,
        phone_number: profile.phoneNumber,
        enable_kitchen: profile.enableKitchen,
        kitchen_motivations: profile.kitchenMotivations,
        enable_table_layout: profile.enableTableLayout,
        enable_table_input: profile.enableTableInput,
        auto_print_receipt: profile.autoPrintReceipt,
        kitchen_alarm_time: profile.kitchenAlarmTime
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
        department: u.department,
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
        role: user.role,
        department: user.department || 'Operasional'
    }, { onConflict: 'id' });
    if (error) handleError(error, 'addUser');
};

export const updateUserInCloud = async (user: User) => {
    const { error } = await supabase.from('users').update({
        name: user.name,
        pin: user.pin,
        attendance_pin: user.attendancePin,
        role: user.role,
        department: user.department
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
        department: record.department,
        branch_id: record.branchId,
        date: record.date,
        clock_in: record.clock_in,
        status: record.status,
        photo_url: record.photoUrl,
        lat: record.location?.lat,
        lng: record.location?.lng,
        location_name: record.locationName,
        distance_meters: record.distanceMeters,
        is_within_radius: record.isWithinRadius,
        ip_address: record.ipAddress,
        device_info: record.deviceInfo
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

export const getAttendanceRecordsFromCloud = async (branchId: string, date?: string) => {
    let query = supabase.from('attendance').select('*').eq('branch_id', branchId);
    
    if (date) {
        query = query.eq('date', date);
    }
    
    const { data, error } = await query.order('clock_in', { ascending: false });
        
    if (error) handleError(error, 'getAttendance');
    return (data || []).map(r => ({
        id: String(r.id),
        userId: r.user_id,
        userName: r.user_name,
        department: r.department,
        date: r.date,
        clockInTime: Number(r.clock_in),
        clockOutTime: r.clock_out ? Number(r.clock_out) : undefined,
        photoUrl: r.photo_url,
        status: r.status,
        branchId: r.branch_id,
        location: (r.lat && r.lng) ? { lat: parseFloat(r.lat), lng: parseFloat(r.lng) } : undefined,
        locationName: r.location_name,
        distanceMeters: r.distance_meters ? parseFloat(r.distance_meters) : undefined,
        isWithinRadius: r.is_within_radius,
        ipAddress: r.ip_address,
        deviceInfo: r.device_info
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
        revenue: 0,
        created_by: shift.createdBy
    });
    if (error) handleError(error, 'startShift');
};

export const closeShiftInCloud = async (summary: ShiftSummary) => {
    const { error } = await supabase.from('shifts').update({
        end_time: summary.end,
        closing_cash: summary.closingCash,
        revenue: summary.revenue,
        cash_revenue: summary.cashRevenue,
        non_cash_revenue: summary.non_cash_revenue,
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
        total: order.total,
        created_at: order.createdAt,
        order_source: order.orderSource || 'admin'
    });
    if (orderError) handleError(orderError, 'addOrder');
};

export const updateOrderInCloud = async (id: string, updates: any) => {
    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (error) handleError(error, 'updateOrder');
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

// --- INVENTORY ---
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

// Fix: Implemented deleteExpenseFromCloud
export const deleteExpenseFromCloud = async (id: number) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) handleError(error, 'deleteExpense');
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

export const subscribeToAttendance = (branchId: string, date: string, onUpdate: (records: AttendanceRecord[]) => void) => {
    const fetchAttendance = async () => {
        const records = await getAttendanceRecordsFromCloud(branchId, date);
        onUpdate(records);
    };

    fetchAttendance();

    const channel = supabase.channel(`attendance-${branchId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `branch_id=eq.${branchId}` }, fetchAttendance)
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
