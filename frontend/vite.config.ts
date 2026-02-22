import { resolve } from "node:path"
import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: "../static",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app.html"),
        register: resolve(__dirname, "register.html"),
      },
    },
  },
})
