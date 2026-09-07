import path from "path"
import { readFileSync } from "fs"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { devtools } from "@tanstack/devtools-vite"
import mdx from "@mdx-js/rollup"
import remarkGfm from "remark-gfm"
import remarkFrontmatter from "remark-frontmatter"
import remarkMdxFrontmatter from "remark-mdx-frontmatter"

// The app version is baked at build/serve time as a compile-time constant —
// no runtime read of package.json in the bundle.
const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  // router plugin must run before the react plugin so the route tree is
  // generated before anything imports it
  plugins: [
    // TanStack devtools: console piping, go-to-source, and devtools imports
    // stripped from production builds (first, per its docs).
    devtools(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    // MDX compiles to a React component at build time — no runtime HTML strings.
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter],
      }),
    },
    react(),
    tailwindcss(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
