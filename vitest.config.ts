import path from "path"
import { fileURLToPath } from "url"
import { defineConfig } from "vitest/config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{js,ts,tsx}"],
    environment: "node",
    globals: true,
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
