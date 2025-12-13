import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // FIX: Base path relative agar asset (js/css) selalu ketemu dimanapun di-deploy
  base: './', 
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  }
})