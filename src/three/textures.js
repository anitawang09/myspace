import * as THREE from 'three'

/** 程序化贴图：全部用离屏 canvas 画，不依赖外部素材 */
export function makeTexture(w, h, paint, { repeat } = {}) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  paint(cv.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeat[0], repeat[1])
  }
  tex.anisotropy = 8
  return tex
}

const noise = (ctx, w, h, n, alpha) => {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * alpha})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5)
  }
}

export const resumePaper = (ctx, w, h) => {
  ctx.fillStyle = '#f7f3e8'
  ctx.fillRect(0, 0, w, h)
  noise(ctx, w, h, 700, 0.035)
  const m = w * 0.13
  ctx.fillStyle = '#1d1a17'
  ctx.font = `600 ${w * 0.062}px "Noto Serif JP", serif`
  ctx.fillText('ANITA WANG', m, h * 0.11)
  ctx.fillStyle = '#8a7f70'
  ctx.font = `${w * 0.03}px "Noto Serif JP", serif`
  ctx.fillText('CURRICULUM VITAE', m, h * 0.145)
  ctx.fillStyle = '#c0b6a4'
  ctx.fillRect(m, h * 0.17, w - m * 2, 2)

  let y = h * 0.235
  for (const block of [4, 5, 3, 4]) {
    ctx.fillStyle = '#2a2521'
    ctx.fillRect(m, y, w * 0.2, 5)
    y += h * 0.035
    for (let i = 0; i < block; i++) {
      ctx.fillStyle = `rgba(90,82,72,${0.5 - i * 0.05})`
      ctx.fillRect(m, y, (w - m * 2) * (0.62 + Math.random() * 0.36), 3)
      y += h * 0.026
    }
    y += h * 0.03
  }
}

/** OV-chipkaart：荷兰交通卡的青蓝配色 + 金色芯片 */
export const ovCard = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#0aa7dd')
  g.addColorStop(0.55, '#1f7fc4')
  g.addColorStop(1, '#0f5f9e')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,.42)'
  ctx.lineWidth = w * 0.012
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(w * 0.86, h * 0.5, w * (0.16 + i * 0.1), 0, Math.PI * 2)
    ctx.stroke()
  }
  // 芯片
  ctx.fillStyle = '#d8b45a'
  ctx.fillRect(w * 0.1, h * 0.36, w * 0.14, h * 0.2)
  ctx.strokeStyle = 'rgba(120,90,30,.7)'
  ctx.lineWidth = 2
  ctx.strokeRect(w * 0.1, h * 0.36, w * 0.14, h * 0.2)
  ctx.beginPath()
  ctx.moveTo(w * 0.1, h * 0.46)
  ctx.lineTo(w * 0.24, h * 0.46)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${h * 0.13}px "Helvetica Neue", Arial, sans-serif`
  ctx.fillText('OV-chipkaart', w * 0.09, h * 0.24)
  ctx.font = `${h * 0.075}px "Helvetica Neue", Arial, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,.8)'
  ctx.fillText('3528 1149 0027 6641', w * 0.09, h * 0.82)
}

/** 登机牌：奶白票纸 + 打孔副券 + 条码 */
export const boardingPass = (ctx, w, h) => {
  ctx.fillStyle = '#f6efe2'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#16324a'
  ctx.fillRect(0, 0, w, h * 0.17)
  ctx.fillStyle = '#f6efe2'
  ctx.font = `700 ${h * 0.1}px "Helvetica Neue", Arial, sans-serif`
  ctx.fillText('BOARDING PASS', w * 0.035, h * 0.12)
  ctx.fillStyle = '#16324a'
  ctx.font = `700 ${h * 0.22}px "Helvetica Neue", Arial, sans-serif`
  ctx.fillText('AMS', w * 0.04, h * 0.48)
  ctx.fillText('TPE', w * 0.34, h * 0.48)
  ctx.strokeStyle = '#c2553a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(w * 0.2, h * 0.42)
  ctx.lineTo(w * 0.32, h * 0.42)
  ctx.stroke()
  ctx.fillStyle = '#7b7166'
  ctx.font = `${h * 0.085}px "Helvetica Neue", Arial, sans-serif`
  ctx.fillText('SEAT 27A   GATE D8   SEQ 041', w * 0.04, h * 0.66)
  // 打孔线
  ctx.fillStyle = '#cfc6b6'
  for (let y = 6; y < h; y += 12) ctx.fillRect(w * 0.63, y, 3, 6)
  // 条码
  ctx.fillStyle = '#1d1a17'
  let x = w * 0.68
  while (x < w * 0.96) {
    const bw = 1 + Math.random() * 4
    ctx.fillRect(x, h * 0.2, bw, h * 0.6)
    x += bw + 2 + Math.random() * 3
  }
}

/** 相机机身：香槟银拉丝 + 小字 */
export const cameraBody = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#b4b1aa')
  g.addColorStop(0.45, '#96938c')
  g.addColorStop(0.55, '#85817a')
  g.addColorStop(1, '#a8a59e')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.14})`
    ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 26 + 6, 1)
  }
  ctx.fillStyle = '#2b2a28'
  ctx.font = `700 ${h * 0.09}px "Helvetica Neue", Arial, sans-serif`
  ctx.fillText('OLYMPUS', w * 0.08, h * 0.9)
}
