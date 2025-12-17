
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env so usage like process.env.API_KEY or process.env.VITE_... works
      'process.env': JSON.stringify(env)
    },
    server: {
      host: true
    },
    preview: {
      host: true, // Wajib true agar bisa diakses dari luar container (Cloud Run)
      port: parseInt(process.env.PORT || '8080'), // Menggunakan PORT dari Google Cloud atau default 8080
      strictPort: true,
    }
  }
})
