import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 把这个仓库发布在 https://<user>.github.io/myspace/，不是域名根，
// 所以生产构建的资源路径都要带上 /myspace/ 前缀。本地 npm run dev 不受影响，
// 用 command === 'serve' 判断，开发时依旧是根路径。
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/myspace/' : '/',
  server: { host: '127.0.0.1', port: 5173 },
}))
