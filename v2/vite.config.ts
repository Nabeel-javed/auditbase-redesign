import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    target: 'es2020',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 1500,
    // Artifact iframes are sandboxed with an opaque origin where inline
    // <script type="module"> does not execute — emit a classic IIFE instead.
    ...(mode === 'single'
      ? { rollupOptions: { output: { format: 'iife' as const, inlineDynamicImports: true } } }
      : {}),
  },
}))
