import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure relative paths for assets so it works in subfolders on Plesk
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})