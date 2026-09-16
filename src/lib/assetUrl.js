// public/ 目录下资源的路径帮手。
//
// GitHub Pages 把这个仓库发布在子路径下（.../myspace/），而不是域名根。
// Vite 会自动重写 index.html 与 import 语句里的路径，但运行时字符串
// 拼出来的绝对路径（比如 '/roofs/chidori.svg'）不会被改写——直接在浏览器里
// 打开就是 404。所有指向 public/ 的路径都要经过这里，一次改对，不用挨个记。
export function assetUrl(path) {
  const base = import.meta.env.BASE_URL // 本地开发是 '/'，Pages 上是 '/myspace/'
  return base + path.replace(/^\/+/, '')
}
