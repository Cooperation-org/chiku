import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'build', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Resetting local form state when a dialog opens and reading stored
      // session state on mount are deliberate one-time initialisations ported
      // from the Svelte app; revisit with useSyncExternalStore-style refactors.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // TanStack file routes always export a `Route` object next to the page
    // component — that is the framework convention, not a fast-refresh bug.
    // The ui/ primitives likewise export variant constants alongside
    // components, straight from the shadcn registry.
    files: ['src/routes/**/*.{ts,tsx}', 'src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Ported verbatim from the Svelte-era codebase; its type looseness is
    // pre-existing debt, tighten opportunistically.
    files: ['src/lib/api/**', 'src/lib/auth/**', 'src/lib/filters/**', 'src/lib/utils/**', 'src/lib/markdown.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
])
