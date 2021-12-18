import { defineConfig } from "vite";
import macrosPlugin from "vite-plugin-babel-macros";
import reactRefresh from "@vitejs/plugin-react-refresh";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh(), macrosPlugin()],

  server: {
    port: 4000,
    proxy: {
      "/api/socket.io": { target: "ws://localhost:3000", ws: true },
      "/api": "http://localhost:3000",
      "/files": "http://localhost:3000",
    },
  },
  optimizeDeps: {
    exclude: ["react-spring", "@react-spring/web", "@react-spring/three"],
  },
  build: {
    outDir: "build",
  },
});
