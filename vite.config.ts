import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? './',
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
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
