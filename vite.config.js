import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  
  // Build configuration
  build: {
    outDir: 'public',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    target: 'es2015'
  },
  
  // Root should be project root, not src
  root: './',
  
  // Entry point
  publicDir: 'assets',
  
  // Development server
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});