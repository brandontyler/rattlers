import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Polyfill for amazon-cognito-identity-js which expects Node.js globals
    global: 'globalThis',
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-map': ['leaflet', 'react-leaflet'],
          'vendor-cognito': ['amazon-cognito-identity-js'],
          'vendor-utils': ['axios', 'date-fns', 'clsx'],
        },
      },
    },
  },
})
