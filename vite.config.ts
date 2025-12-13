
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Ini dibutuhkan agar Gemini API (yang mungkin pakai process.env) tetap jalan
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Kita tidak menimpa seluruh process.env agar tidak berat, cukup key penting saja
    },
    server: {
      host: true
    },
    preview: {
      host: true, 
      port: parseInt(process.env.PORT || '8080'), 
      strictPort: true,
    }
  }
})
