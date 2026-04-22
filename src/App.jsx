import { useState, useEffect, useRef } from 'react'

// ───────────────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────────────

const PHI = (1 + Math.sqrt(5)) / 2

const PALETTES = {
  Expansion:      { c1: '#c8a96e', c2: '#6e8ec8', ca: '#8ec86e' },
  Dissolution:    { c1: '#8e9ec8', c2: '#c86e8e', ca: '#c8c86e' },
  Mastery:        { c1: '#c8a96e', c2: '#8e6ec8', ca: '#6ec8c8' },
  Chaos:          { c1: '#c87060', c2: '#c8a96e', ca: '#6e8ec8' },
  Harmony:        { c1: '#6ec8a9', c2: '#c8a96e', ca: '#a96ec8' },
  Transformation: { c1: '#c8a96e', c2: '#6ec8c8', ca: '#c86e8e' },
  Mystery:        { c1: '#8e6ec8', c2: '#c8a96e', ca: '#6e8ec8' }
}

const PATTERNS = ['mandala', 'interference', 'constellation', 'spiral']

// ───────────────────────────────────────────────────────────────────────
// Utility
// ───────────────────────────────────────────────────────────────────────

const digitSum = (n) => {
  let s = Math.abs(Math.floor(n))
  let total = 0
  while (s > 0) { total += s % 10; s = Math.floor(s / 10) }
  return total
}

const dailyNumber = () => {
  const d = new Date()
  return digitSum(d.getDate()) + digitSum(d.getMonth() + 1) + digitSum(d.getFullYear())
}

const formatDate = () => {
  const d = new Date()
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
}

// ───────────────────────────────────────────────────────────────────────
// Sigil Renderers
// All take: ctx, R, symmetry, layers, c1, c2, ca, numbers, phi
// Drawn around (0,0) — caller handles translation/rotation.
// ───────────────────────────────────────────────────────────────────────

const hexA = (hex, a) => {
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
  // concentric polygons at decreasing radii
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
  // petal arcs between vertices on outermost polygon
  const outerR = R * 0.92
  for (let i = 0; i < N; i++) {
    const a1 = (i / N) * Math.PI * 2 - Math.PI / 2
    const a2 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2
    const x1 = Math.cos(a1) * outerR
    const y1 = Math.sin(a1) * outerR
    const x2 = Math.cos(a2) * outerR
    const y2 = Math.sin(a2) * outerR
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const dist = Math.hypot(mx, my)
    const cx = (mx / dist) * outerR * 1.25
    const cy = (my / dist) * outerR * 1.25
    ctx.strokeStyle = hexA(ca, 0.5)
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.arc(cx, cy, outerR * 0.45, 0, Math.PI * 2)
    ctx.stroke()
  }
  // star connector lines across all vertices
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
  // archimedean phi spiral from seed
  const seed = numbers[0] || 1
  ctx.strokeStyle = hexA(ca, 0.7)
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let t = 0; t < Math.PI * 6; t += 0.04) {
    const r = (t / (Math.PI * 6)) * outerR * (phi / 1.62)
    const a = t + (seed * 0.3)
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
  // ring-wave sources
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
    // mark source
    ctx.fillStyle = hexA(ca, 0.9)
    ctx.beginPath()
    ctx.arc(sx, sy, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  // radial divider lines
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
    const angle = ((n * 0.31 + i) % (Math.PI * 2))
    const radius = ((n % 100) / 100) * R * 0.7 + R * 0.15
    const main = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, main: true, n }
    nodes.push(main)
    const subs = 2 + (n % 4)
    for (let s = 0; s < subs; s++) {
      const sa = angle + (s - subs / 2) * 0.4 + (n % 7) * 0.08
      const sr = radius + ((s + 1) * R * 0.06) * (s % 2 === 0 ? 1 : -1)
      const r = Math.max(R * 0.05, Math.min(R * 0.85, sr))
      nodes.push({ x: Math.cos(sa) * r, y: Math.sin(sa) * r, main: false })
    }
  })
  // connecting lines between any two close nodes
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
  // sub-nodes: small dots
  nodes.filter((n) => !n.main).forEach((n) => {
    ctx.fillStyle = hexA(ca, 0.7)
    ctx.beginPath()
    ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2)
    ctx.fill()
  })
  // main nodes: glowing circles
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
    // mark each number's position on this branch
    numbers.forEach((n, i) => {
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

const RENDERERS = {
  mandala: renderMandala,
  interference: renderInterference,
  constellation: renderConstellation,
  spiral: renderSpiral
}

// Inscribe numbers around outer ring (drawn after rotation reset)
const inscribeNumbers = (ctx, cx, cy, R, numbers, color) => {
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

// ───────────────────────────────────────────────────────────────────────
// Oracle API (server-side proxy → OpenAI)
// ───────────────────────────────────────────────────────────────────────

const callOracle = async (numbers) => {
  const res = await fetch('/api/oracle', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ numbers })
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.error || body?.detail || ''
    } catch {
      detail = await res.text()
    }
    throw new Error(detail ? `${res.status}: ${detail}` : `Request failed (${res.status})`)
  }
  return res.json()
}

// ───────────────────────────────────────────────────────────────────────
// SVG Sigil (header)
// ───────────────────────────────────────────────────────────────────────

const HeaderSigil = () => (
  <svg className="sigil-head" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#c8a96e" strokeWidth="0.6">
      <circle cx="50" cy="50" r="46" opacity="0.6" />
      <circle cx="50" cy="50" r="34" opacity="0.4" />
      <circle cx="50" cy="50" r="20" opacity="0.5" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <line
            key={i}
            x1={50 + Math.cos(a) * 20}
            y1={50 + Math.sin(a) * 20}
            x2={50 + Math.cos(a) * 46}
            y2={50 + Math.sin(a) * 46}
            opacity="0.35"
          />
        )
      })}
      <polygon
        points={Array.from({ length: 6 })
          .map((_, i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2
            return `${50 + Math.cos(a) * 28},${50 + Math.sin(a) * 28}`
          })
          .join(' ')}
        opacity="0.7"
      />
      <polygon
        points={Array.from({ length: 6 })
          .map((_, i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + Math.PI / 6
            return `${50 + Math.cos(a) * 28},${50 + Math.sin(a) * 28}`
          })
          .join(' ')}
        opacity="0.5"
      />
      <circle cx="50" cy="50" r="3" fill="#c8a96e" stroke="none" />
    </g>
  </svg>
)

// ───────────────────────────────────────────────────────────────────────
// Main App
// ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [chips, setChips] = useState([])
  const [draft, setDraft] = useState('')
  const [reading, setReading] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pattern, setPattern] = useState(null)
  const inputRef = useRef(null)
  const canvasRef = useRef(null)
  const rotationRef = useRef(0)
  const animRef = useRef(null)

  const addChip = (raw) => {
    const cleaned = raw.trim().replace(/[^0-9.\-]/g, '')
    if (!cleaned) return
    const n = Number(cleaned)
    if (!Number.isFinite(n)) return
    setChips((c) => [...c, n])
  }

  const onKey = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (draft.trim()) {
        addChip(draft)
        setDraft('')
      } else if (e.key === 'Enter' && chips.length > 0 && !loading) {
        receiveReading()
      }
    } else if (e.key === 'Backspace' && !draft && chips.length > 0) {
      setChips((c) => c.slice(0, -1))
    }
  }

  const loadPreset = (nums) => {
    setChips(nums)
    setDraft('')
    setReading(null)
    setPattern(null)
    setError(null)
  }

  const presets = [
    { label: 'today', value: () => formatDate() },
    { label: '42', value: () => [42] },
    { label: '3 · 6 · 9', value: () => [3, 6, 9] },
    { label: '137', value: () => [137] },
    { label: 'fibonacci', value: () => [1, 1, 2, 3, 5, 8] }
  ]

  const receiveReading = async () => {
    if (chips.length === 0) return
    setLoading(true)
    setError(null)
    setReading(null)
    setPattern(null)
    try {
      const result = await callOracle(chips)
      setReading(result)
      setPattern('mandala')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setChips([])
    setDraft('')
    setReading(null)
    setPattern(null)
    setError(null)
  }

  const copyReading = () => {
    if (!reading) return
    const text = `${reading.archetype}\n\n${reading.narrative}\n\n— ${reading.affirmation}`
    navigator.clipboard.writeText(text)
  }

  const savePNG = () => {
    const c = canvasRef.current
    if (!c) return
    const link = document.createElement('a')
    link.download = `numeris-${chips.join('-')}.png`
    link.href = c.toDataURL('image/png')
    link.click()
  }

  // Animated canvas
  useEffect(() => {
    if (!reading || !pattern) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = 520
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const cx = size / 2
    const cy = size / 2
    const R = size * 0.4
    const energy = reading.energy && PALETTES[reading.energy] ? reading.energy : 'Mystery'
    const { c1, c2, ca } = PALETTES[energy]
    const symmetry = Math.max(3, Math.min(12, Math.floor(reading.symmetry || 6)))
    const layers = Math.max(3, Math.min(9, Math.floor(reading.layers || 5)))
    const phi = Math.max(0.5, Math.min(2, Number(reading.phi_ratio) || PHI / 1.62))
    const renderer = RENDERERS[pattern] || renderMandala

    const draw = () => {
      ctx.clearRect(0, 0, size, size)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rotationRef.current)
      renderer(ctx, R, symmetry, layers, c1, c2, ca, chips, phi)
      ctx.restore()
      // numbers inscribed AFTER rotation reset → stay fixed
      inscribeNumbers(ctx, cx, cy, R, chips, c1)
      rotationRef.current += 0.0012
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [reading, pattern, chips])

  const today = dailyNumber()
  const energy = reading?.energy && PALETTES[reading.energy] ? reading.energy : null

  return (
    <>
      <div className="grain" />
      <div className="vignette" />
      <div className="shell">

        {/* Header */}
        <header className="header">
          <HeaderSigil />
          <h1 className="title">Num<em>eris</em></h1>
          <p className="subtitle">Oracle · of · Numbers</p>
        </header>

        {/* Daily bar */}
        <div className="daily" onClick={() => loadPreset([today])} role="button">
          <span className="daily-label">Today's Number</span>
          <span className="daily-value">{today}</span>
        </div>

        {/* Input zone */}
        <section className="zone">
          <p className="section-label">Offer · Your · Numbers</p>
          <div className="chip-input" onClick={() => inputRef.current?.focus()}>
            {chips.map((n, i) => (
              <span key={i} className="chip">
                {n}
                <button onClick={() => setChips((c) => c.filter((_, j) => j !== i))} aria-label="remove">×</button>
              </span>
            ))}
            <input
              ref={inputRef}
              className="chip-field"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              onBlur={() => { if (draft.trim()) { addChip(draft); setDraft('') } }}
              placeholder={chips.length === 0 ? 'type a number, press space…' : ''}
              inputMode="decimal"
            />
          </div>
          <div className="presets">
            {presets.map((p) => (
              <button key={p.label} className="preset" onClick={() => loadPreset(p.value())}>
                {p.label}
              </button>
            ))}
          </div>

          <button
            className="read-btn"
            onClick={receiveReading}
            disabled={loading || chips.length === 0}
          >
            {loading ? 'Listening…' : 'Receive Reading'}
          </button>
        </section>

        {error && <div className="error">{error}</div>}

        {loading && (
          <div className="loading">
            <div className="loading-mark">∴</div>
            <div className="loading-text">Consulting the patterns</div>
          </div>
        )}

        {reading && (
          <div className="reading">
            <div className="reading-head">
              <div className="reading-numbers">{chips.join(' · ')}</div>
              <h2 className="reading-archetype">{reading.archetype}</h2>
              {energy && <div className="energy-badge">{energy}</div>}
            </div>

            <p className="narrative">{reading.narrative}</p>

            <div className="grid">
              <div className="card">
                <p className="card-title">Mathematics</p>
                <p className="card-body">{reading.math}</p>
              </div>
              <div className="card">
                <p className="card-title">Numerology</p>
                <p className="card-body">{reading.numerology}</p>
              </div>
              <div className="card">
                <p className="card-title">History</p>
                <p className="card-body">{reading.history}</p>
              </div>
              <div className="card">
                <p className="card-title">Pattern</p>
                <p className="card-body">{reading.pattern}</p>
              </div>
            </div>

            <div className="affirmation">
              <div className="affirmation-label">Affirmation</div>
              <p className="affirmation-text">"{reading.affirmation}"</p>
            </div>

            <div className="visual">
              <div className="visual-head">
                <h3 className="visual-title">A geometry for these numbers</h3>
              </div>

              {pattern ? (
                <>
                  <div className="tabs">
                    {PATTERNS.map((p) => (
                      <button
                        key={p}
                        className={`tab ${pattern === p ? 'active' : ''}`}
                        onClick={() => setPattern(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="canvas-wrap">
                    <canvas ref={canvasRef} className="sigil" />
                  </div>
                </>
              ) : (
                <div className="canvas-wrap">
                  <div className="sigil-placeholder">
                    <button className="generate-btn" onClick={() => setPattern('mandala')}>
                      Generate Sigil
                    </button>
                  </div>
                </div>
              )}

              <div className="actions">
                <button className="action" onClick={savePNG} disabled={!pattern}>Save ↓</button>
                <button className="action" onClick={copyReading}>Copy Reading</button>
                <button className="action" onClick={receiveReading}>Read Again</button>
                <button className="action danger" onClick={reset}>New Numbers</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
