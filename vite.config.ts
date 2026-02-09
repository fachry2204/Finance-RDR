
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', 
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Build langsung ke dalam folder server/public
    outDir: 'server/public',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Separate Lucide icons (usually large)
            if (id.includes('lucide-react')) {
              return 'lucide-vendor';
            }
            // Separate React ecosystem (including dependencies to avoid circular chunks)
            if (id.includes('/react') || id.includes('/react-dom') || id.includes('/react-router') || id.includes('/scheduler') || id.includes('/prop-types')) {
              return 'react-vendor';
            }
            // All other dependencies
            return 'vendor';
          }
        }
      }
    }
  }
})
