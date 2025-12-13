
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

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL atau Anon Key belum diset. Pastikan .env atau Environment Variables di Vercel sudah diisi.');
}

// Export client untuk digunakan di seluruh aplikasi
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
