import tailwindcss from '@tailwindcss/vite'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@': resolve('src') } },
    // electron-vite ships with minify OFF by default for main/preload so
    // crash stacks stay readable in dev. For production builds we want
    // a smaller binary — esbuild is fast and gives a ~30% reduction.
    build: { minify: 'esbuild' },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { minify: 'esbuild' },
  },
  renderer: {
    root: resolve('src/renderer'),
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        path: 'path-browserify',
      },
    },
    plugins: [react(), tailwindcss()],
    server: { port: 5174 },
    build: {
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        input: resolve('src/renderer/index.html'),
      },
    },
  },
})
