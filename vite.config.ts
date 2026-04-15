import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? './',
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        luminet: resolve(__dirname, 'luminet.html'),
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          rendering: ['three', '@react-three/fiber'],
          state: ['zustand'],
        },
      },
    },
  },
  plugins: [react()],
})
