// 檐口轮廓提取：屋顶 mask 加载后画进离屏 Canvas，逐列自下而上找第一个
// 不透明像素，得到檐口下沿（字帘就挂在这条线上）。
// 结果按 0~1 归一化存储，之后随视口尺寸任意缩放都能对齐。

const ALPHA_MIN = 24
const SAMPLES = 320
const cache = new Map()

export function scanProfile(img) {
  const key = img.currentSrc || img.src
  if (cache.has(key)) return cache.get(key)

  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return null

  // 扫描分辨率：宽度对齐采样数，高度等比，够精确又便宜
  const sw = SAMPLES
  const sh = Math.max(2, Math.round((ih / iw) * sw))
  const cv = document.createElement('canvas')
  cv.width = sw
  cv.height = sh
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, sw, sh)
  const { data } = ctx.getImageData(0, 0, sw, sh)

  const bottom = new Float32Array(sw).fill(NaN)
  for (let x = 0; x < sw; x++) {
    for (let y = sh - 1; y >= 0; y--) {
      if (data[(y * sw + x) * 4 + 3] > ALPHA_MIN) {
        bottom[x] = y / sh
        break
      }
    }
  }

  // 采样列全空（图片没画上/还没解码）就当失败，让调用方重试
  const filled = bottom.reduce((n, v) => n + (Number.isNaN(v) ? 0 : 1), 0)
  if (filled < sw * 0.1) return null

  const profile = { samples: sw, bottom }
  cache.set(key, profile)
  return profile
}

// u: 0~1 的横向位置 -> 归一化 y（相对图片高度）。空列返回 null。
export function sampleProfile(profile, u) {
  const arr = profile.bottom
  const f = Math.min(profile.samples - 1, Math.max(0, u * (profile.samples - 1)))
  const i = Math.floor(f)
  const j = Math.min(profile.samples - 1, i + 1)
  const a = arr[i]
  const b = arr[j]
  if (Number.isNaN(a) && Number.isNaN(b)) return null
  if (Number.isNaN(a)) return b
  if (Number.isNaN(b)) return a
  return a + (b - a) * (f - i)
}

// 轮廓的有效横向区间（左右两端可能是全透明的空列）
export function profileSpan(profile) {
  const { bottom, samples } = profile
  let lo = 0
  let hi = samples - 1
  while (lo < samples && Number.isNaN(bottom[lo])) lo++
  while (hi >= 0 && Number.isNaN(bottom[hi])) hi--
  if (lo >= hi) return null
  return { u0: lo / (samples - 1), u1: hi / (samples - 1) }
}
