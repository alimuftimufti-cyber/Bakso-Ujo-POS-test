
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

// Logging untuk membantu diagnosa
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.warn("⚠️ [Supabase] Database belum terkonfigurasi. Aplikasi berjalan dalam MODE OFFLINE.");
}

// Inisialisasi klien dengan penanganan URL kosong
const finalUrl = (!supabaseUrl || supabaseUrl.includes('placeholder')) 
    ? 'https://placeholder.supabase.co' 
    : supabaseUrl;
const finalKey = (!supabaseAnonKey || supabaseAnonKey.includes('placeholder')) 
    ? 'placeholder' 
    : supabaseAnonKey;

export const supabase = createClient(finalUrl, finalKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
});

export const checkConnection = async () => {
    // Jika masih placeholder, langsung anggap tidak siap (gagal koneksi)
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) return false;
    
    try {
        // Gunakan timeout agar fetch tidak gantung selamanya jika URL salah
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const { error } = await supabase
            .from('branches')
            .select('id')
            .limit(1)
            .abortSignal(controller.signal);
            
        clearTimeout(timeoutId);
        
        if (error) {
            console.error("🔴 Koneksi Database Ditolak:", error.message);
            return false;
        }
        return true;
    } catch (e) {
        console.error("🔴 Koneksi Database Gagal (Network Error):", e);
        return false;
    }
};
