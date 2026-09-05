import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"

// https://vite.dev/config/
export default defineConfig({
  // router plugin must run before the react plugin so the route tree is
  // generated before anything imports it
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  // SvelteKit-era layout kept: static assets (favicons, logo) live in static/
  publicDir: "static",
  server: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts: ["help.raisethevoices.org", "help.linkedtrust.us"],
  },
  // the cohort VM deploy script publishes build/
  build: {
    outDir: "build",
  },
})
