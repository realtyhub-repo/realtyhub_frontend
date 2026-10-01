import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // El backend solo permite CORS desde http://localhost:5500 (docs/auth_service.md §2.4)
  server: { port: 5500, strictPort: true },
  preview: { port: 5500, strictPort: true },
})
