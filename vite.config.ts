import path from "path"
import { readFileSync } from "fs"
import { loadEnv, type Plugin } from "vite"
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

const DESCRIPTION = "Fast, modern project management. Powered by Chiku."
/** The shipped default when no brand env is set at all. */
const DEFAULT_NAME = "Chiku"
const DEFAULT_FAVICON = "/favicon.ico"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

/**
 * Bakes the deployment brand into index.html's <head> at serve/build time.
 *
 * Social crawlers (Facebook, LinkedIn, X…) fetch the raw HTML and run no
 * JavaScript, so branding those tags at runtime with client script is useless
 * to them — the static head must already carry the org's name, favicon, and
 * preview image, resolved from VITE_BRAND_* env with the shipped defaults
 * when unset. The inline pre-paint script in index.html stays for the one
 * thing baking cannot do: a shared bundle that must revert to the default on
 * hosts outside VITE_BRAND_HOSTS. The full env contract lives in
 * src/lib/brand.ts and README "Branding your deployment".
 */
function brandMeta(env: Record<string, string>, production: boolean): Plugin {
  const value = (key: string) => env[key]?.trim() || undefined
  const name = value("VITE_BRAND_NAME") ?? DEFAULT_NAME
  const favicon = value("VITE_BRAND_FAVICON") ?? DEFAULT_FAVICON
  const ogImage = value("VITE_BRAND_OG_IMAGE") ?? value("VITE_BRAND_LOGO") ?? favicon
  // og:url and twitter:url need an absolute origin; only emit them when the
  // deployment states its URL, because a fabricated default would be wrong.
  const siteUrl = value("VITE_BRAND_URL")?.replace(/\/$/, "")
  // The "chiku | " prefix is the branded cascade; the unbranded default is
  // just "Chiku" — prefixing the product with itself says nothing.
  const title = value("VITE_BRAND_NAME") ? `chiku | ${name}` : name
  const faviconType = (() => {
    const file = favicon.split(/[?#]/)[0]
    const ext = file.slice(file.lastIndexOf(".") + 1).toLowerCase()
    if (ext === "svg") return "image/svg+xml"
    if (ext === "png") return "image/png"
    if (ext === "webp") return "image/webp"
    if (ext === "gif") return "image/gif"
    return undefined
  })()
  // Preview-image URLs go absolute against VITE_BRAND_URL in production
  // builds, where crawlers read them without any JavaScript. In dev they
  // stay relative so in-browser preview tooling (TanStack devtools SEO
  // panel and friends) resolves them against localhost and can actually
  // load the image.
  const absolute = (href: string) =>
    !production || /^https?:/i.test(href) || !siteUrl ? href : `${siteUrl}${href}`
  const metas: string[] = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${DESCRIPTION}" />`,
    `<link rel="icon"${faviconType ? ` type="${faviconType}"` : ""} href="${escapeHtml(favicon)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(name)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${DESCRIPTION}" />`,
    `<meta property="og:image" content="${escapeHtml(absolute(ogImage))}" />`,
    siteUrl ? `<meta property="og:url" content="${siteUrl}" />` : "",
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${DESCRIPTION}" />`,
    `<meta name="twitter:image" content="${escapeHtml(absolute(ogImage))}" />`,
    siteUrl ? `<meta name="twitter:url" content="${siteUrl}" />` : "",
  ]

  return {
    name: "brand-meta",
    // Runs after Vite's env replacement; swaps the <!--brand-meta--> marker
    // for the resolved block. Production builds additionally ship a
    // comment-free head: HTML comments and full-line `//` comments inside
    // classic inline scripts (Vite minifies bundles, not these) are stripped
    // — dev keeps everything for readability.
    transformIndexHtml: {
      order: "post",
      handler(html) {
        let out = html.replace("<!--brand-meta-->", metas.filter(Boolean).join("\n    "))
        if (production) {
          out = out.replace(/<!--[\s\S]*?-->/g, "")
          out = out.replace(
            /(<script(?![^>]*\bsrc\b)[^>]*>)([\s\S]*?)(<\/script>)/g,
            (_match, open, body, close) =>
              open + String(body).replace(/^[ \t]*\/\/.*$\n?/gm, "") + close,
          )
        }
        return out
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  // Brand env for the baked head: process env plus this mode's .env files,
  // the same precedence Vite itself uses for import.meta.env.
  const brandEnv = loadEnv(mode, process.cwd(), "VITE_BRAND")

  return {
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
      brandMeta(brandEnv, mode === "production"),
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
  }
})
