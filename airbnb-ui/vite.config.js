import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Enhanced logging - shows info, warnings, and errors in console
  logLevel: 'info', // 'info' | 'warn' | 'error' | 'silent'

  // Keep console history visible (don't clear on rebuild)
  clearScreen: false,

  plugins: [react()],

  // Server configuration for better error reporting
  server: {
    // HMR error overlay in browser
    hmr: {
      overlay: true, // Shows errors as overlay in browser
    },
    // Dev proxy: forward `/api` to backend to keep same-origin requests
    // This ensures cookies (sessions) are handled correctly in local development
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      // Proxy uploads so `src="/uploads/xxx"` URLs are served from the backend
      '/uploads': {
        target: process.env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/uploads/, '/uploads'),
      },
    },
  },

  // Build configuration for debugging
  build: {
    // Generate source maps for better error stack traces
    sourcemap: true,
    // Show compressed size in build output
    reportCompressedSize: true,
  },
})
