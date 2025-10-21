import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8081,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
});

process.env.MONGODB_URI = 'mongodb://localhost:27017';
process.env.MONGODB_DB = 'sandbox_db';
process.env.JWT_SECRET = 'sb_publishable_JtRi9l_JtwYWLdjJ_pkl0g_yN8g32LZ';
process.env.PORT = '3001';

