import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    tanstackStart(),
    tsconfigPaths(),
    viteReact(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        // 8001: port 8000 is taken by the Tareon Django project on this machine.
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
})
