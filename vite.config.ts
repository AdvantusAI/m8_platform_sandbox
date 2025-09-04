import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: [
      "demoenv.m8solutions.platform.com",
      "localhost",
      "127.0.0.1"
    ]
  },
  proxy: {
    '/api': {
      target: 'https://analytics.m8solutions.com.mx/',
      changeOrigin: true,
      secure: false,
    },
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
