import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Lets app code and shadcn/ui components import via "@/..." instead of relative paths
      '@': path.resolve(__dirname, './src'),
    },
  },
})
