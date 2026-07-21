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
      // 东方财富搜索（searchapi.eastmoney.com）
      '/api/search': {
        target: 'https://searchapi.eastmoney.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/search/, '/api/suggest/get'),
      },
      // 新浪 K 线
      '/sina': {
        target: 'https://money.finance.sina.com.cn',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/sina/, ''),
      },
    },
  },
})
