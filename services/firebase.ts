
// FIX: Added missing imports and utility functions
import { Table } from '../types';
import { supabase } from './supabaseClient';

const handleError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    throw error;
};

// FIX: Added missing cloud functions referenced in App.tsx
export const getStoreProfileFromCloud = async (branchId: string) => {
    const { data, error } = await supabase.from('store_profiles').select('*').eq('branch_id', branchId).single();
    if (error) handleError(error, 'getStoreProfile');
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
    return data || [];
};

export const getBranchesFromCloud = async () => {
    const { data, error } = await supabase.from('branches').select('*');
    if (error) handleError(error, 'getBranches');
    return data || [];
};

// ==========================================
// 5. TABLE MANAGEMENT (QR CODE PERSISTENCE)
// ==========================================

export const getTablesFromCloud = async (branchId: string): Promise<Table[]> => {
    const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('branch_id', branchId)
        .order('table_number', { ascending: true });
    
    if (error) handleError(error, 'getTables');
    return (data || []).map(t => ({
        id: t.id,
        number: t.table_number,
        qrCodeData: t.qr_payload // Mengambil data payload dari DB
    }));
};

export const addTableToCloud = async (table: Table, branchId: string) => {
    const { error } = await supabase.from('tables').insert({
        id: table.id,
        branch_id: branchId,
        table_number: table.number,
        qr_payload: table.qrCodeData // Simpan isi QR ke database
    });
    if (error) handleError(error, 'addTable');
};

export const deleteTableFromCloud = async (id: string) => {
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) handleError(error, 'deleteTable');
};

export const subscribeToTables = (branchId: string, onUpdate: (tables: Table[]) => void) => {
    const fetch = async () => {
        const data = await getTablesFromCloud(branchId);
        onUpdate(data);
    };

    const channel = supabase
        .channel(`tables-realtime-${branchId}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'tables', 
            filter: `branch_id=eq.${branchId}` 
        }, () => fetch())
        .subscribe();
        
    return () => { supabase.removeChannel(channel); };
};
