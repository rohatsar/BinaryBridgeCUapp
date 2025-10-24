import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    open: true // ← BU SATIRI EKLE, tarayıcıyı otomatik açsın
  }
})