
// @ts-ignore
import { createClient } from '@supabase/supabase-js';

// Fungsi pencari Env Var yang lebih pintar
const getEnvVar = (key: string) => {
  // @ts-ignore
  const env = import.meta.env || process.env || {};
  // Coba cari dengan awalan VITE_ (Standar Vite)
  if (env[`VITE_${key}`]) return env[`VITE_${key}`];
  // Coba cari tanpa awalan (Standar Hosting Umum)
  if (env[key]) return env[key];
  return '';
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

// Logging untuk membantu user pemula mendiagnosa masalah
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ [Supabase] URL atau API Key belum diset di file .env");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const checkConnection = async () => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) return false;
    try {
        const { error } = await supabase.from('branches').select('count', { count: 'exact', head: true });
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("🔴 Koneksi Database Gagal:", e);
        return false;
    }
};
