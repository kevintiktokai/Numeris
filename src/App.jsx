import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { RENDERERS_2D, inscribeNumbers } from './sigil2d.js'

const Sigil3D = lazy(() => import('./Sigil3D.jsx'))

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
const DEEPENABLE = ['narrative', 'math', 'numerology', 'history', 'pattern']
const MAX_DEPTH = 3

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
// API calls
// ───────────────────────────────────────────────────────────────────────

const callOracle = async (numbers) => {
  const res = await fetch('/api/oracle', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ numbers })
  })
  if (!res.ok) {
    let detail = ''
    try { const body = await res.json(); detail = body?.error || body?.detail || '' }
    catch { detail = await res.text() }
    throw new Error(detail ? `${res.status}: ${detail}` : `Request failed (${res.status})`)
  }
  return res.json()
}

const callDeepen = async ({ numbers, section, previousLayers, reading }) => {
  const res = await fetch('/api/deepen', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ numbers, section, previousLayers, reading })
  })
  if (!res.ok) {
    let detail = ''
    try { const body = await res.json(); detail = body?.error || body?.detail || '' }
    catch { detail = await res.text() }
    throw new Error(detail ? `${res.status}: ${detail}` : `Deepen failed (${res.status})`)
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
        points={Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2
          return `${50 + Math.cos(a) * 28},${50 + Math.sin(a) * 28}`
        }).join(' ')}
        opacity="0.7"
      />
      <polygon
        points={Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + Math.PI / 6
          return `${50 + Math.cos(a) * 28},${50 + Math.sin(a) * 28}`
        }).join(' ')}
        opacity="0.5"
      />
      <circle cx="50" cy="50" r="3" fill="#c8a96e" stroke="none" />
    </g>
  </svg>
)

// ───────────────────────────────────────────────────────────────────────
// DeepenBlock: reusable section with "go deeper" button
// ───────────────────────────────────────────────────────────────────────

const DeepenBlock = ({ section, baseText, className = 'card', label, layers = [], loading, error, onDeepen, variant }) => {
  const depth = layers.length + 1
  const maxed = depth >= MAX_DEPTH + 1
  return (
    <div className={className}>
      {label && <p className="card-title">{label}</p>}
      <div className={variant === 'narrative' ? 'narrative' : 'card-body'}>
        <p>{baseText}</p>
        {layers.map((text, i) => (
          <p key={i} className="deepen-layer">
            <span className="deepen-mark">✦ layer {i + 2}</span>
            {text}
          </p>
        ))}
      </div>
      <div className="deepen-row">
        {maxed ? (
          <span className="deepen-maxed">✦ deepest layer reached</span>
        ) : (
          <button
            className="deepen-btn"
            onClick={() => onDeepen(section)}
            disabled={loading}
          >
            {loading ? 'descending…' : 'go deeper ↓'}
          </button>
        )}
        {error && <span className="deepen-error">{error}</span>}
      </div>
    </div>
  )
}

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
  const [mode, setMode] = useState('2d') // '2d' | '3d'
  const [deepenings, setDeepenings] = useState({}) // { section: [string, string, ...] }
  const [deepenLoading, setDeepenLoading] = useState({}) // { section: bool }
  const [deepenErrors, setDeepenErrors] = useState({}) // { section: msg }

  const inputRef = useRef(null)
  const canvasRef = useRef(null)
  const sigil3dRef = useRef(null)
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
    setDeepenings({})
    setDeepenErrors({})
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
    setDeepenings({})
    setDeepenErrors({})
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

  const deepenSection = async (section) => {
    if (!reading) return
    const previousLayers = deepenings[section] || []
    if (previousLayers.length >= MAX_DEPTH) return
    setDeepenLoading((s) => ({ ...s, [section]: true }))
    setDeepenErrors((s) => ({ ...s, [section]: null }))
    try {
      const { text } = await callDeepen({ numbers: chips, section, previousLayers, reading })
      setDeepenings((s) => ({ ...s, [section]: [...previousLayers, text] }))
    } catch (e) {
      setDeepenErrors((s) => ({ ...s, [section]: e.message }))
    } finally {
      setDeepenLoading((s) => ({ ...s, [section]: false }))
    }
  }

  const reset = () => {
    setChips([])
    setDraft('')
    setReading(null)
    setPattern(null)
    setError(null)
    setDeepenings({})
    setDeepenErrors({})
  }

  const copyReading = () => {
    if (!reading) return
    const section = (key) => {
      const layers = deepenings[key] || []
      return [reading[key], ...layers].join('\n\n')
    }
    const text = [
      reading.archetype,
      '',
      section('narrative'),
      '',
      `— ${reading.affirmation}`,
      '',
      '── MATHEMATICS ──',
      section('math'),
      '',
      '── NUMEROLOGY ──',
      section('numerology'),
      '',
      '── HISTORY ──',
      section('history'),
      '',
      '── PATTERN ──',
      section('pattern')
    ].join('\n')
    navigator.clipboard.writeText(text)
  }

  const savePNG = () => {
    let dataUrl = null
    if (mode === '2d') {
      const c = canvasRef.current
      if (!c) return
      dataUrl = c.toDataURL('image/png')
    } else {
      dataUrl = sigil3dRef.current?.toDataURL()
    }
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = `numeris-${chips.join('-')}-${mode}.png`
    link.href = dataUrl
    link.click()
  }

  const energyKey = reading?.energy && PALETTES[reading.energy] ? reading.energy : 'Mystery'
  const palette = PALETTES[energyKey]

  // 2D canvas loop
  useEffect(() => {
    if (!reading || !pattern || mode !== '2d') {
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
    const { c1, c2, ca } = palette
    const symmetry = Math.max(3, Math.min(12, Math.floor(reading.symmetry || 6)))
    const layers = Math.max(3, Math.min(9, Math.floor(reading.layers || 5)))
    const phi = Math.max(0.5, Math.min(2, Number(reading.phi_ratio) || PHI / 1.62))
    const renderer = RENDERERS_2D[pattern] || RENDERERS_2D.mandala

    const draw = () => {
      ctx.clearRect(0, 0, size, size)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rotationRef.current)
      renderer(ctx, R, symmetry, layers, c1, c2, ca, chips, phi)
      ctx.restore()
      inscribeNumbers(ctx, cx, cy, R, chips, c1)
      rotationRef.current += 0.0012
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [reading, pattern, chips, mode, palette])

  const today = dailyNumber()

  return (
    <>
      <div className="grain" />
      <div className="vignette" />
      <div className="shell">

        <header className="header">
          <HeaderSigil />
          <h1 className="title">Num<em>eris</em></h1>
          <p className="subtitle">Oracle · of · Numbers</p>
        </header>

        <div className="daily" onClick={() => loadPreset([today])} role="button">
          <span className="daily-label">Today's Number</span>
          <span className="daily-value">{today}</span>
        </div>

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

          <button className="read-btn" onClick={receiveReading} disabled={loading || chips.length === 0}>
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
              <div className="energy-badge">{energyKey}</div>
            </div>

            <DeepenBlock
              section="narrative"
              className="narrative-block"
              baseText={reading.narrative}
              variant="narrative"
              layers={deepenings.narrative || []}
              loading={deepenLoading.narrative}
              error={deepenErrors.narrative}
              onDeepen={deepenSection}
            />

            <div className="grid">
              <DeepenBlock
                section="math"
                label="Mathematics"
                baseText={reading.math}
                layers={deepenings.math || []}
                loading={deepenLoading.math}
                error={deepenErrors.math}
                onDeepen={deepenSection}
              />
              <DeepenBlock
                section="numerology"
                label="Numerology"
                baseText={reading.numerology}
                layers={deepenings.numerology || []}
                loading={deepenLoading.numerology}
                error={deepenErrors.numerology}
                onDeepen={deepenSection}
              />
              <DeepenBlock
                section="history"
                label="History"
                baseText={reading.history}
                layers={deepenings.history || []}
                loading={deepenLoading.history}
                error={deepenErrors.history}
                onDeepen={deepenSection}
              />
              <DeepenBlock
                section="pattern"
                label="Pattern"
                baseText={reading.pattern}
                layers={deepenings.pattern || []}
                loading={deepenLoading.pattern}
                error={deepenErrors.pattern}
                onDeepen={deepenSection}
              />
            </div>

            <div className="affirmation">
              <div className="affirmation-label">Affirmation</div>
              <p className="affirmation-text">"{reading.affirmation}"</p>
            </div>

            <div className="visual">
              <div className="visual-head">
                <h3 className="visual-title">A geometry for these numbers</h3>
                <div className="mode-toggle">
                  <button
                    className={`mode-btn ${mode === '2d' ? 'active' : ''}`}
                    onClick={() => setMode('2d')}
                  >2D</button>
                  <button
                    className={`mode-btn ${mode === '3d' ? 'active' : ''}`}
                    onClick={() => setMode('3d')}
                  >3D</button>
                </div>
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
                    {mode === '2d' ? (
                      <canvas ref={canvasRef} className="sigil" />
                    ) : (
                      <Suspense fallback={<div className="three-loading">loading dimensional renderer…</div>}>
                        <Sigil3D
                          ref={sigil3dRef}
                          pattern={pattern}
                          reading={reading}
                          numbers={chips}
                          palette={palette}
                          size={520}
                        />
                      </Suspense>
                    )}
                  </div>
                  {mode === '3d' && (
                    <p className="hint">drag to orbit · releases into slow rotation</p>
                  )}
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
