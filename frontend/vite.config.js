import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/stockPlus/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Docker 컨테이너 외부 접속 허용
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})