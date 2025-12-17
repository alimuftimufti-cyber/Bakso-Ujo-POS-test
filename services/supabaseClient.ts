
// @ts-ignore
import { createClient } from '@supabase/supabase-js';

// Safe access to environment variables (Vite or Process)
const getEnvVar = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    // @ts-ignore
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// DEBUG LOGGING (Hapus di production jika perlu)
console.log("🔵 [Supabase Init] URL Detect:", supabaseUrl ? "OK (Hidden)" : "MISSING");
console.log("🔵 [Supabase Init] Key Detect:", supabaseAnonKey ? "OK (Hidden)" : "MISSING");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🔴 FATAL: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan di .env!');
}

// Export client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});

// Fungsi Test Koneksi Sederhana
export const checkConnection = async () => {
    try {
        const { data, error } = await supabase.from('branches').select('count', { count: 'exact', head: true });
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("🔴 [Connection Test Failed]:", e);
        return false;
    }
};
