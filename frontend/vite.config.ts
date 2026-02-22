import { readdir, unlink } from "node:fs/promises"
import { resolve } from "node:path"
import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: "cleanup-previous-svelte-assets",
      async buildStart() {
        const assetsDir = resolve(__dirname, "../static/assets")
        const files = await readdir(assetsDir)
        await Promise.all(
          files
            .filter((file) => /^main-.*\.(js|css)$/.test(file))
            .map((file) => unlink(resolve(assetsDir, file))),
        )
      },
    },
  ],
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
