
// @ts-ignore
import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string) => {
  // @ts-ignore
  const env = import.meta.env || process.env || {};
  if (env[`VITE_${key}`]) return env[`VITE_${key}`];
  if (env[key]) return env[key];
  return '';
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

// Deteksi apakah konfigurasi valid
const isConfigValid = supabaseUrl && 
                     !supabaseUrl.includes('placeholder') && 
                     supabaseAnonKey && 
                     supabaseAnonKey !== 'placeholder';

const finalUrl = isConfigValid ? supabaseUrl : 'https://placeholder-project.supabase.co';
const finalKey = isConfigValid ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
});

export const checkConnection = async () => {
    if (!isConfigValid) {
        console.warn("⚠️ [Supabase] Konfigurasi tidak ditemukan atau masih placeholder.");
        return false;
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 detik timeout
        
        // Gunakan query super ringan untuk cek koneksi
        const { error } = await supabase
            .from('branches')
            .select('id')
            .limit(1)
            .abortSignal(controller.signal);
            
        clearTimeout(timeoutId);
        
        if (error) {
            console.error("🔴 Supabase Error:", error.message);
            // Jika errornya 'PGRST116' (no rows found) itu sebenarnya koneksi OK tapi tabel kosong
            if (error.code === 'PGRST116') return true;
            return false;
        }
        return true;
    } catch (e) {
        console.error("🔴 Jaringan Gagal:", e);
        return false;
    }
};
