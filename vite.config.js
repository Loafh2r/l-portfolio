import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      // 东方财富搜索（保留）
      '/search': {
        target: 'https://searchadapter.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/search/, ''),
      },
      // 新浪 K 线（保留）
      '/sina': {
        target: 'https://money.finance.sina.com.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sina/, ''),
      },
    },
  },
})
