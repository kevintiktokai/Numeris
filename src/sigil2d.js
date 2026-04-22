// 2D canvas sigil renderers.
// All take: ctx, R, symmetry, layers, c1, c2, ca, numbers, phi
// Drawn around (0,0); caller handles translate/rotate.

export const hexA = (hex, a) => {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

const drawAmbient = (ctx, R, c1) => {
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
  grad.addColorStop(0, hexA(c1, 0.18))
  grad.addColorStop(0.6, hexA(c1, 0.04))
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.fill()
}

const drawBoundary = (ctx, R, c1) => {
  ctx.strokeStyle = hexA(c1, 0.55)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = hexA(c1, 0.15)
  ctx.beginPath()
  ctx.arc(0, 0, R + 6, 0, Math.PI * 2)
  ctx.stroke()
}

const renderMandala = (ctx, R, symmetry, layers, c1, c2, ca, numbers, phi) => {
  drawAmbient(ctx, R, c1)
  const N = Math.max(3, symmetry)
  for (let l = 0; l < layers; l++) {
    const r = R * (1 - l / layers) * 0.92
    ctx.strokeStyle = hexA(l % 2 ? c2 : c1, 0.25 + 0.4 * (l / layers))
    ctx.lineWidth = 0.8
    ctx.beginPath()
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  const outerR = R * 0.92
  for (let i = 0; i < N; i++) {
    const a1 = (i / N) * Math.PI * 2 - Math.PI / 2
    const a2 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2
    const mx = (Math.cos(a1) + Math.cos(a2)) / 2 * outerR
    const my = (Math.sin(a1) + Math.sin(a2)) / 2 * outerR
    const dist = Math.hypot(mx, my) || 1
    const cx = (mx / dist) * outerR * 1.25
    const cy = (my / dist) * outerR * 1.25
    ctx.strokeStyle = hexA(ca, 0.5)
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.arc(cx, cy, outerR * 0.45, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.strokeStyle = hexA(c2, 0.18)
  ctx.lineWidth = 0.5
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a1 = (i / N) * Math.PI * 2 - Math.PI / 2
      const a2 = (j / N) * Math.PI * 2 - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR)
      ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR)
      ctx.stroke()
    }
  }
  const seed = numbers[0] || 1
  ctx.strokeStyle = hexA(ca, 0.7)
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let t = 0; t < Math.PI * 6; t += 0.04) {
    const r = (t / (Math.PI * 6)) * outerR * (phi / 1.62)
    const a = t + seed * 0.3
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke()
  drawBoundary(ctx, R, c1)
}

const renderInterference = (ctx, R, symmetry, layers, c1, c2, ca, numbers, phi) => {
  drawAmbient(ctx, R, c1)
  const N = numbers.length || 1
  const sourceR = R * 0.36
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2
    const sx = Math.cos(a) * sourceR
    const sy = Math.sin(a) * sourceR
    const seed = numbers[i] || (i + 1)
    const color = i % 2 === 0 ? c1 : c2
    for (let k = 1; k <= 14; k++) {
      const r = k * (R * 0.07) + (seed % 5) * 0.6
      ctx.strokeStyle = hexA(color, 0.35 - (k / 14) * 0.28)
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = hexA(ca, 0.9)
    ctx.beginPath()
    ctx.arc(sx, sy, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = hexA(ca, 0.18)
  ctx.lineWidth = 0.5
  for (let i = 0; i < N * 2; i++) {
    const a = (i / (N * 2)) * Math.PI * 2 - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R)
    ctx.stroke()
  }
  drawBoundary(ctx, R, c1)
}

const renderConstellation = (ctx, R, symmetry, layers, c1, c2, ca, numbers, phi) => {
  drawAmbient(ctx, R, c1)
  const nodes = []
  numbers.forEach((n, i) => {
    const angle = (n * 0.31 + i) % (Math.PI * 2)
    const radius = ((n % 100) / 100) * R * 0.7 + R * 0.15
    nodes.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, main: true, n })
    const subs = 2 + (n % 4)
    for (let s = 0; s < subs; s++) {
      const sa = angle + (s - subs / 2) * 0.4 + (n % 7) * 0.08
      const sr = radius + (s + 1) * R * 0.06 * (s % 2 === 0 ? 1 : -1)
      const r = Math.max(R * 0.05, Math.min(R * 0.85, sr))
      nodes.push({ x: Math.cos(sa) * r, y: Math.sin(sa) * r, main: false })
    }
  })
  const threshold = R * 0.5
  ctx.strokeStyle = hexA(c2, 0.35)
  ctx.lineWidth = 0.5
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      const d = Math.hypot(dx, dy)
      if (d < threshold) {
        ctx.globalAlpha = 1 - d / threshold
        ctx.beginPath()
        ctx.moveTo(nodes[i].x, nodes[i].y)
        ctx.lineTo(nodes[j].x, nodes[j].y)
        ctx.stroke()
      }
    }
  }
  ctx.globalAlpha = 1
  nodes.filter((n) => !n.main).forEach((n) => {
    ctx.fillStyle = hexA(ca, 0.7)
    ctx.beginPath()
    ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2)
    ctx.fill()
  })
  nodes.filter((n) => n.main).forEach((n) => {
    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 14)
    grad.addColorStop(0, hexA(c1, 0.95))
    grad.addColorStop(0.4, hexA(c1, 0.4))
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(n.x, n.y, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = hexA(c1, 1)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(n.x, n.y, 4, 0, Math.PI * 2)
    ctx.stroke()
  })
  drawBoundary(ctx, R, c1)
}

const renderSpiral = (ctx, R, symmetry, layers, c1, c2, ca, numbers, phi) => {
  drawAmbient(ctx, R, c1)
  const N = Math.max(2, symmetry)
  const tMax = Math.PI * 5
  for (let b = 0; b < N; b++) {
    const branchRot = (b / N) * Math.PI * 2
    ctx.strokeStyle = hexA(b % 2 === 0 ? c1 : c2, 0.6)
    ctx.lineWidth = 0.8
    ctx.beginPath()
    for (let t = 0; t < tMax; t += 0.04) {
      const r = (t / tMax) * R * 0.92 * (phi / 1.62)
      const a = t + branchRot
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()
    numbers.forEach((n) => {
      const t = ((n % 100) / 100) * tMax * 0.9 + 0.2
      const r = (t / tMax) * R * 0.92 * (phi / 1.62)
      const a = t + branchRot
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      ctx.strokeStyle = hexA(ca, 0.85)
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = hexA(ca, 0.95)
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  drawBoundary(ctx, R, c1)
}

export const RENDERERS_2D = {
  mandala: renderMandala,
  interference: renderInterference,
  constellation: renderConstellation,
  spiral: renderSpiral
}

export const inscribeNumbers = (ctx, cx, cy, R, numbers, color) => {
  ctx.font = "11px 'Space Mono', monospace"
  ctx.fillStyle = hexA(color, 0.9)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const ringR = R + 22
  const N = numbers.length
  numbers.forEach((n, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(a) * ringR
    const y = cy + Math.sin(a) * ringR
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a + Math.PI / 2)
    ctx.fillText(String(n), 0, 0)
    ctx.restore()
  })
}
