import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import copy from 'rollup-plugin-copy'
import removeConsole from "vite-plugin-remove-console";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    removeConsole({
      include: [/\.[jt]sx?$/, /\.vue$/], // 匹配文件类型
      exclude: [/node_modules/], // 排除 node_modules
      // 保留 error 级别的日志
      removeMethods: ["log", "warn", "info", "debug"],
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'panel.html'),
      output: {
        entryFileNames: 'panel.js',
        chunkFileNames: 'vendors/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'assets/panel.css';
          return 'assets/[name].[ext]';
        },
      },
      plugins: [
        copy({
          targets: [
            {
              src: 'src/icons',
              dest: 'dist'
            },
            {
              src: 'src/manifest.json',
              dest: 'dist'
            },
            {
              src: 'src/background.js',
              dest: 'dist'
            },
            {
              src: 'src/devtools.html',
              dest: 'dist'
            },
            {
              src: 'src/devtools.js',
              dest: 'dist'
            },
            {
              src: 'vendors',
              dest: 'dist'
            }
          ],
          hook: 'writeBundle'
        })
      ]
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
