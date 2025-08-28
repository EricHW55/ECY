import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/timer': 'http://localhost:8000',
      '/links': 'http://localhost:8000',
      '/priority': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
    }
  }
})
