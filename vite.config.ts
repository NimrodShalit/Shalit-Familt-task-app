import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: "/Shalit-Familt-task-app/",
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['@google/genai']
    }
  }
})