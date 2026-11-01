/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Bind IPv4 explicitly: "localhost" may resolve to ::1 only on some Windows setups.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep vendor libraries in separate cacheable chunks.
        manualChunks(id) {
          const path = id.replace(/\\/g, '/')
          if (!path.includes('/node_modules/')) return
          if (/\/node_modules\/(react|react-dom|react-router|scheduler)\//.test(path)) return 'react'
          if (path.includes('/node_modules/@supabase/')) return 'supabase'
          if (path.includes('/node_modules/@tanstack/')) return 'query'
        },
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
