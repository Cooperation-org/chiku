import path from "path"
import { fileURLToPath } from "url"
import { defineConfig } from "vitest/config"
import mdx from "@mdx-js/rollup"
import remarkGfm from "remark-gfm"
import remarkFrontmatter from "remark-frontmatter"
import remarkMdxFrontmatter from "remark-mdx-frontmatter"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Same MDX pipeline as vite.config so import.meta.glob over .mdx compiles in tests.
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter],
      }),
    },
  ],
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
