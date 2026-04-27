import { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react'
import { RENDERERS_2D, inscribeNumbers } from './sigil2d.js'
import { computeProfile, computeCompatibility, CORE_KEYS, CORE_LABELS } from './numerology.js'
import { computeAllTraditions, traditionsSigilVector } from './traditions/index.js'
import ProfileInput, { ProfileExplainer } from './ProfileInput.jsx'
import TraditionDeck from './TraditionDeck.jsx'
import NowPanel from './NowPanel.jsx'
import LifeMap from './LifeMap.jsx'
import { computeLifeMap } from './lifemap.js'

const NatalChart = lazy(() => import('./NatalChart.jsx'))
// natal.js (astronomy-engine) is dynamic-imported on demand so the heavy
// ephemeris code doesn't ship on first page load.

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
const MAX_DEPTH = 3

const THEMES = [
  { key: 'premium', label: 'Premium' },
  { key: 'earth',   label: 'Earth' },
  { key: 'light',   label: 'Light' }
]

// Which sections are deepenable per reading mode
const DEEPEN_SECTIONS = {
  numbers: ['narrative', 'math', 'numerology', 'history', 'pattern'],
  profile: ['narrative', ...CORE_KEYS],
  compatibility: ['narrative', 'lifePath', 'expression', 'soulUrge', 'birthday', 'strengths', 'tensions', 'practice']
}

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

const postJSON = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    let detail = ''
    try { const b = await res.json(); detail = b?.error || b?.detail || '' }
    catch { detail = await res.text() }
    throw new Error(detail ? `${res.status}: ${detail}` : `Request failed (${res.status})`)
  }
  return res.json()
}

const callOracle = (numbers) => postJSON('/api/oracle', { numbers })
const callProfile = (profile) => postJSON('/api/profile', { profile })
const callCompatibility = (profileA, profileB, compatibility) =>
  postJSON('/api/compatibility', { profileA, profileB, compatibility })
const callDeepen = (payload) => postJSON('/api/deepen', payload)

// ───────────────────────────────────────────────────────────────────────
// SVG Sigil (header)
// ───────────────────────────────────────────────────────────────────────

const HeaderSigil = () => (
  <svg className="sigil-head" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" strokeWidth="0.6">
      <circle cx="50" cy="50" r="46" opacity="0.6" />
      <circle cx="50" cy="50" r="34" opacity="0.4" />
      <circle cx="50" cy="50" r="20" opacity="0.5" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <line key={i}
            x1={50 + Math.cos(a) * 20} y1={50 + Math.sin(a) * 20}
            x2={50 + Math.cos(a) * 46} y2={50 + Math.sin(a) * 46}
            opacity="0.35" />
        )
      })}
      <polygon opacity="0.7"
        points={Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2
          return `${50 + Math.cos(a) * 28},${50 + Math.sin(a) * 28}`
        }).join(' ')} />
      <polygon opacity="0.5"
        points={Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + Math.PI / 6
          return `${50 + Math.cos(a) * 28},${50 + Math.sin(a) * 28}`
        }).join(' ')} />
      <circle cx="50" cy="50" r="3" fill="currentColor" stroke="none" />
    </g>
  </svg>
)

// ───────────────────────────────────────────────────────────────────────
// DeepenBlock
// ───────────────────────────────────────────────────────────────────────

const DeepenBlock = ({ section, baseText, className = 'card', label, sublabel, layers = [], loading, error, onDeepen, variant }) => {
  const depth = layers.length + 1
  const maxed = depth >= MAX_DEPTH + 1
  return (
    <div className={className}>
      {label && <p className="card-title">{label}{sublabel ? <span className="card-subtitle"> · {sublabel}</span> : null}</p>}
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
          <button className="deepen-btn" onClick={() => onDeepen(section)} disabled={loading}>
            {loading ? 'descending…' : 'go deeper ↓'}
          </button>
        )}
        {error && <span className="deepen-error">{error}</span>}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Compatibility meter
// ───────────────────────────────────────────────────────────────────────

const CompatibilityMeter = ({ score, axes, masterIntensity }) => (
  <div className="compat-meter">
    <div className="compat-score">
      <div className="compat-score-value">{score}</div>
      <div className="compat-score-label">harmony</div>
      {masterIntensity && <div className="master-intensity">master intensity</div>}
    </div>
    <div className="compat-axes">
      {axes.map((ax) => (
        <div key={ax.key} className="compat-axis">
          <div className="compat-axis-label">
            <span>
              {ax.label}
              {(ax.masterA || ax.masterB) && <em className="master-axis-tag"> ✦</em>}
            </span>
            <span className="compat-axis-numbers">
              {ax.a}{ax.masterA ? '*' : ''} · {ax.b}{ax.masterB ? '*' : ''}
            </span>
          </div>
          <div className="compat-axis-bar">
            <div className="compat-axis-fill" style={{ width: `${Math.round(ax.harmony * 100)}%` }} />
          </div>
          <div className="compat-axis-verdict">
            {ax.characters ? `${ax.characters} · ` : ''}
            <span className={`verdict-${(ax.verdict || '').replace(/ /g, '-')}`}>{ax.verdict}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// ───────────────────────────────────────────────────────────────────────
// Main App
// ───────────────────────────────────────────────────────────────────────

const ThemeToggle = ({ theme, onChange }) => (
  <div className="theme-toggle" role="group" aria-label="Theme">
    {THEMES.map((t) => (
      <button
        key={t.key}
        data-theme={t.key}
        className={`theme-btn ${theme === t.key ? 'active' : ''}`}
        onClick={() => onChange(t.key)}
        aria-pressed={theme === t.key}
        title={t.label}
      >
        <span className="theme-btn-orb" aria-hidden="true" />
        {t.label}
      </button>
    ))}
  </div>
)

export default function App() {
  // Theme: 'premium' | 'earth' | 'light'
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'premium'
    return localStorage.getItem('numeris-theme') || 'premium'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('numeris-theme', theme)
  }, [theme])

  // Input mode: 'numbers' | 'profile' | 'compatibility'
  const [inputMode, setInputMode] = useState('numbers')

  // Numbers mode state
  const [chips, setChips] = useState([])
  const [draft, setDraft] = useState('')

  // Profile/Compat mode state
  const [system, setSystem] = useState('pythagorean')
  const [profileA, setProfileA] = useState({ name: '', birthdate: '' })
  const [profileB, setProfileB] = useState({ name: '', birthdate: '' })

  // Reading state (shape varies by mode — tagged by readingMode)
  const [readingMode, setReadingMode] = useState(null) // what mode produced the current reading
  const [reading, setReading] = useState(null)
  const [computedProfile, setComputedProfile] = useState(null) // for profile/compat
  const [computedProfileB, setComputedProfileB] = useState(null)
  const [computedCompat, setComputedCompat] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Visual state
  const [pattern, setPattern] = useState(null)
  const [viewMode, setViewMode] = useState('2d')

  // Save state
  const [saveStatus, setSaveStatus] = useState(null)  // null | 'saving' | 'saved' | 'unavailable' | 'error'
  const [saveError, setSaveError] = useState(null)

  // Deepen state
  const [deepenings, setDeepenings] = useState({})
  const [deepenLoading, setDeepenLoading] = useState({})
  const [deepenErrors, setDeepenErrors] = useState({})

  const inputRef = useRef(null)
  const canvasRef = useRef(null)
  const sigil3dRef = useRef(null)
  const rotationRef = useRef(0)
  const animRef = useRef(null)

  // Live-computed profile previews for the input form.
  // We merge the natal-chart inputs into `inputs` so downstream code can
  // pick them up uniformly.
  const buildPreview = (src) => {
    if (!src.name || !/^\d{4}-\d{2}-\d{2}$/.test(src.birthdate)) return null
    try {
      const computed = computeProfile({ name: src.name, birthdate: src.birthdate, system })
      return {
        ...computed,
        inputs: {
          ...computed.inputs,
          birthtime: src.birthtime || null,
          lat: src.lat !== undefined && src.lat !== '' ? src.lat : null,
          lon: src.lon !== undefined && src.lon !== '' ? src.lon : null,
          tz:  src.tz  !== undefined && src.tz  !== '' ? src.tz  : null
        }
      }
    } catch { return null }
  }
  const previewA = useMemo(() => buildPreview(profileA), [profileA, system])
  const previewB = useMemo(() => buildPreview(profileB), [profileB, system])
  const previewCompat = useMemo(() => {
    if (!previewA || !previewB) return null
    return computeCompatibility(previewA, previewB)
  }, [previewA, previewB])

  // Tradition signatures (client-side pure math). Computed whenever we
  // have a resolved profile so the deck appears instantly with the reading.
  const traditionSignatures = useMemo(() => {
    if (readingMode !== 'profile' || !computedProfile) return null
    return computeAllTraditions({
      birthdate: computedProfile.inputs.birthdate,
      name: computedProfile.inputs.name
    })
  }, [readingMode, computedProfile])

  // Natal chart — dynamic-imported on demand (astronomy-engine is heavy).
  const [natalChart, setNatalChart] = useState(null)
  const [natalReading, setNatalReading] = useState(null)
  const [natalLoading, setNatalLoading] = useState(false)
  const [natalError, setNatalError] = useState(null)

  // Life Map — temporal cross-tradition view (pure math from birthdate)
  const lifeMap = useMemo(() => {
    if (readingMode !== 'profile' || !computedProfile) return null
    try { return computeLifeMap(computedProfile) } catch { return null }
  }, [readingMode, computedProfile])

  const [lifeMapReading, setLifeMapReading] = useState(null)
  const [lifeMapLoading, setLifeMapLoading] = useState(false)
  const [lifeMapError, setLifeMapError] = useState(null)

  const readLifeMap = async () => {
    if (!lifeMap) return
    setLifeMapLoading(true); setLifeMapError(null)
    try {
      const result = await postJSON('/api/lifemap', {
        profile: computedProfile.inputs,
        map: lifeMap
      })
      setLifeMapReading(result)
    } catch (e) {
      setLifeMapError(e.message)
    } finally {
      setLifeMapLoading(false)
    }
  }

  useEffect(() => {
    if (readingMode !== 'profile' || !computedProfile) { setNatalChart(null); return }
    const { inputs } = computedProfile
    const ready = inputs.birthtime && inputs.lat != null && inputs.lon != null && inputs.tz != null
    if (!ready) { setNatalChart(null); return }
    let cancelled = false
    import('./natal.js').then(({ natal }) => {
      if (cancelled) return
      try {
        const result = natal.compute({
          birthdate: inputs.birthdate,
          birthtime: inputs.birthtime,
          lat: Number(inputs.lat),
          lon: Number(inputs.lon),
          tz: Number(inputs.tz)
        })
        setNatalChart(result)
      } catch {
        setNatalChart(null)
      }
    })
    return () => { cancelled = true }
  }, [readingMode, computedProfile])

  const readNatalChart = async () => {
    if (!natalChart) return
    setNatalLoading(true); setNatalError(null)
    try {
      const result = await postJSON('/api/natal', {
        profile: computedProfile.inputs,
        chart: natalChart.chart
      })
      setNatalReading(result)
    } catch (e) {
      setNatalError(e.message)
    } finally {
      setNatalLoading(false)
    }
  }

  // Numbers array used for the sigil, derived from whatever the active reading is.
  // In profile mode, core numerology vector + tradition key numbers get merged.
  const sigilNumbers = useMemo(() => {
    if (readingMode === 'numbers') return chips
    if (readingMode === 'profile') {
      const base = computedProfile?.vector || []
      const extras = traditionSignatures ? traditionsSigilVector(traditionSignatures) : []
      return [...base, ...extras].slice(0, 24)
    }
    if (readingMode === 'compatibility') return computedCompat?.mergedVector || []
    return []
  }, [readingMode, chips, computedProfile, computedCompat, traditionSignatures])

  // Input: numbers mode
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
      if (draft.trim()) { addChip(draft); setDraft('') }
      else if (e.key === 'Enter' && chips.length > 0 && !loading) { receiveReading() }
    } else if (e.key === 'Backspace' && !draft && chips.length > 0) {
      setChips((c) => c.slice(0, -1))
    }
  }
  const presets = [
    { label: 'today', value: () => formatDate() },
    { label: '42', value: () => [42] },
    { label: '3 · 6 · 9', value: () => [3, 6, 9] },
    { label: '137', value: () => [137] },
    { label: 'fibonacci', value: () => [1, 1, 2, 3, 5, 8] }
  ]
  const loadPreset = (nums) => {
    setChips(nums); setDraft('')
    clearReading()
  }

  const clearReading = () => {
    setReading(null); setReadingMode(null); setPattern(null)
    setComputedProfile(null); setComputedProfileB(null); setComputedCompat(null)
    setError(null)
    setDeepenings({}); setDeepenErrors({}); setDeepenLoading({})
    setSaveStatus(null); setSaveError(null)
    setNatalReading(null); setNatalError(null); setNatalLoading(false)
    setLifeMapReading(null); setLifeMapError(null); setLifeMapLoading(false)
  }

  const reset = () => {
    clearReading()
    setChips([]); setDraft('')
    setProfileA({ name: '', birthdate: '' })
    setProfileB({ name: '', birthdate: '' })
  }

  // The one Receive button — dispatches by mode
  const receiveReading = async () => {
    setLoading(true); setError(null)
    setReading(null); setPattern(null)
    setDeepenings({}); setDeepenErrors({}); setDeepenLoading({})
    try {
      if (inputMode === 'numbers') {
        if (chips.length === 0) { setLoading(false); return }
        const result = await callOracle(chips)
        setReading(result); setReadingMode('numbers'); setPattern('mandala')
      } else if (inputMode === 'profile') {
        if (!previewA) throw new Error('Please enter a full name and birth date.')
        const result = await callProfile(previewA)
        setReading(result); setReadingMode('profile')
        setComputedProfile(previewA); setPattern('mandala')
      } else if (inputMode === 'compatibility') {
        if (!previewA || !previewB) throw new Error('Both profiles need name + birth date.')
        if (!previewCompat) throw new Error('Could not compute compatibility.')
        const result = await callCompatibility(previewA, previewB, previewCompat)
        setReading(result); setReadingMode('compatibility')
        setComputedProfile(previewA); setComputedProfileB(previewB); setComputedCompat(previewCompat)
        setPattern('mandala')
      }
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
      let context = ''
      if (readingMode === 'profile' && computedProfile) {
        context = `Profile: ${computedProfile.inputs.name}, born ${computedProfile.inputs.birthdate} (${computedProfile.inputs.system}). Core numbers: LP ${computedProfile.lifePath.value}, Ex ${computedProfile.expression.value}, SU ${computedProfile.soulUrge.value}, Pe ${computedProfile.personality.value}, Bd ${computedProfile.birthday.value}, PY ${computedProfile.personalYear.value}.`
      } else if (readingMode === 'compatibility' && computedProfile && computedProfileB) {
        context = `Compatibility between ${computedProfile.inputs.name} (LP ${computedProfile.lifePath.value}, Ex ${computedProfile.expression.value}, SU ${computedProfile.soulUrge.value}) and ${computedProfileB.inputs.name} (LP ${computedProfileB.lifePath.value}, Ex ${computedProfileB.expression.value}, SU ${computedProfileB.soulUrge.value}). Score: ${computedCompat.score}/100.`
      }
      const { text } = await callDeepen({ numbers: sigilNumbers, section, previousLayers, reading, context })
      setDeepenings((s) => ({ ...s, [section]: [...previousLayers, text] }))
    } catch (e) {
      setDeepenErrors((s) => ({ ...s, [section]: e.message }))
    } finally {
      setDeepenLoading((s) => ({ ...s, [section]: false }))
    }
  }

  const copyReading = () => {
    if (!reading) return
    const sectionText = (key) => {
      const raw = reading[key]
      const base = typeof raw === 'string' ? raw : raw?.meaning || raw?.text || ''
      const layers = deepenings[key] || []
      return [base, ...layers].filter(Boolean).join('\n\n')
    }
    const lines = [reading.archetype, '', sectionText('narrative')]
    if (reading.affirmation) lines.push('', `— ${reading.affirmation}`)
    if (reading.verdict) lines.push('', `— ${reading.verdict}`)
    const sections = readingMode === 'numbers'
      ? [['MATHEMATICS', 'math'], ['NUMEROLOGY', 'numerology'], ['HISTORY', 'history'], ['PATTERN', 'pattern']]
      : readingMode === 'profile'
      ? CORE_KEYS.map((k) => [CORE_LABELS[k].label.toUpperCase(), k])
      : [['LIFE PATH', 'lifePath'], ['EXPRESSION', 'expression'], ['SOUL URGE', 'soulUrge'], ['STRENGTHS', 'strengths'], ['TENSIONS', 'tensions'], ['PRACTICE', 'practice']]
    sections.forEach(([label, key]) => {
      const t = sectionText(key)
      if (t) { lines.push('', `── ${label} ──`, t) }
    })
    navigator.clipboard.writeText(lines.join('\n'))
  }

  const saveReading = async () => {
    if (!reading) return
    setSaveStatus('saving'); setSaveError(null)
    try {
      const body = {
        kind: readingMode,
        payload: reading,
        pattern,
        palette,
        inputs: readingMode === 'numbers'
          ? { numbers: chips }
          : readingMode === 'profile'
          ? { profile: computedProfile?.inputs, vector: computedProfile?.vector }
          : { profileA: computedProfile?.inputs, profileB: computedProfileB?.inputs, compatibility: computedCompat },
        profile: readingMode === 'profile' ? computedProfile?.inputs : null
      }
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.status === 503) {
        setSaveStatus('unavailable')
        return
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || errBody.detail || `Save failed (${res.status})`)
      }
      setSaveStatus('saved')
    } catch (e) {
      setSaveStatus('error')
      setSaveError(e.message)
    }
  }

  const savePNG = () => {
    let dataUrl = null
    if (viewMode === '2d') {
      const c = canvasRef.current
      if (!c) return
      dataUrl = c.toDataURL('image/png')
    } else {
      dataUrl = sigil3dRef.current?.toDataURL()
    }
    if (!dataUrl) return
    const link = document.createElement('a')
    const tag = readingMode === 'profile' && computedProfile
      ? computedProfile.inputs.name.split(/\s+/).join('-').toLowerCase()
      : readingMode === 'compatibility' && computedProfile && computedProfileB
      ? `${computedProfile.inputs.name.split(/\s+/)[0]}-${computedProfileB.inputs.name.split(/\s+/)[0]}`.toLowerCase()
      : sigilNumbers.join('-')
    link.download = `numeris-${tag}-${viewMode}.png`
    link.href = dataUrl
    link.click()
  }

  const energyKey = reading?.energy && PALETTES[reading.energy] ? reading.energy : 'Mystery'
  const palette = PALETTES[energyKey]

  // 2D canvas loop
  useEffect(() => {
    if (!reading || !pattern || viewMode !== '2d' || sigilNumbers.length === 0) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = 520
    canvas.width = size * dpr; canvas.height = size * dpr
    canvas.style.width = `${size}px`; canvas.style.height = `${size}px`
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const cx = size / 2, cy = size / 2, R = size * 0.4
    const { c1, c2, ca } = palette
    const symmetry = Math.max(3, Math.min(12, Math.floor(reading.symmetry || 6)))
    const layers = Math.max(3, Math.min(9, Math.floor(reading.layers || 5)))
    const phi = Math.max(0.5, Math.min(2, Number(reading.phi_ratio) || PHI / 1.62))
    const renderer = RENDERERS_2D[pattern] || RENDERERS_2D.mandala

    const draw = () => {
      ctx.clearRect(0, 0, size, size)
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rotationRef.current)
      renderer(ctx, R, symmetry, layers, c1, c2, ca, sigilNumbers, phi)
      ctx.restore()
      inscribeNumbers(ctx, cx, cy, R, sigilNumbers, c1)
      rotationRef.current += 0.0012
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [reading, pattern, sigilNumbers, viewMode, palette])

  // ─── Render helpers per mode ────────────────────────────────────────

  const renderCoreCard = (key) => {
    if (!computedProfile) return null
    const core = computedProfile[key]
    const meaning = reading?.[key]?.meaning || ''
    return (
      <DeepenBlock
        key={key}
        section={key}
        label={CORE_LABELS[key].label}
        sublabel={`${core.value}${core.isMaster ? ' · master' : ''}${core.karmicDebt ? ' · karmic' : ''}`}
        baseText={meaning}
        layers={deepenings[key] || []}
        loading={deepenLoading[key]}
        error={deepenErrors[key]}
        onDeepen={deepenSection}
      />
    )
  }

  return (
    <>
      <div className="grain" />
      <div className="vignette" />
      <ThemeToggle theme={theme} onChange={setTheme} />
      <div className="shell">

        <header className="header">
          <HeaderSigil />
          <h1 className="title">Num<em>eris</em></h1>
          <p className="subtitle">Oracle · of · Numbers</p>
        </header>

        <NowPanel
          personalProfile={computedProfile}
          onLoadDailyNumber={(n) => { setInputMode('numbers'); loadPreset([n]) }}
        />


        {/* Input-mode tabs */}
        <div className="mode-tabs">
          {['numbers', 'profile', 'compatibility'].map((m) => (
            <button
              key={m}
              className={`mode-tab ${inputMode === m ? 'active' : ''}`}
              onClick={() => { setInputMode(m); clearReading() }}
            >
              {m === 'numbers' ? 'Numbers' : m === 'profile' ? 'Your Profile' : 'Compatibility'}
            </button>
          ))}
        </div>

        <section className="zone">
          {inputMode === 'numbers' && (
            <>
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
                  <button key={p.label} className="preset" onClick={() => loadPreset(p.value())}>{p.label}</button>
                ))}
              </div>
            </>
          )}

          {inputMode === 'profile' && (
            <>
              <p className="section-label">Name · Birth · Date</p>
              <ProfileInput
                value={profileA}
                onChange={setProfileA}
                system={system}
                onSystemChange={setSystem}
              />
              <ProfileExplainer />
            </>
          )}

          {inputMode === 'compatibility' && (
            <>
              <p className="section-label">Two · Profiles</p>
              <div className="compat-inputs">
                <ProfileInput value={profileA} onChange={setProfileA} label="Person A" system={system} />
                <ProfileInput value={profileB} onChange={setProfileB} label="Person B" system={system} onSystemChange={setSystem} />
              </div>
              {previewCompat && (
                <CompatibilityMeter score={previewCompat.score} axes={previewCompat.axes} masterIntensity={previewCompat.masterIntensity} />
              )}
              <ProfileExplainer />
            </>
          )}

          <button
            className="read-btn"
            onClick={receiveReading}
            disabled={
              loading ||
              (inputMode === 'numbers' && chips.length === 0) ||
              (inputMode === 'profile' && !previewA) ||
              (inputMode === 'compatibility' && (!previewA || !previewB))
            }
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
              {readingMode === 'numbers' && (
                <div className="reading-numbers">{sigilNumbers.join(' · ')}</div>
              )}
              {readingMode === 'profile' && computedProfile && (
                <div className="reading-numbers">{computedProfile.inputs.name} · {computedProfile.inputs.birthdate}</div>
              )}
              {readingMode === 'compatibility' && computedProfile && computedProfileB && (
                <div className="reading-numbers">{computedProfile.inputs.name} · {computedProfileB.inputs.name}</div>
              )}
              <h2 className="reading-archetype">{reading.archetype}</h2>
              <div className="energy-badge">{energyKey}</div>
              {readingMode === 'compatibility' && computedCompat && (
                <CompatibilityMeter score={computedCompat.score} axes={computedCompat.axes} masterIntensity={computedCompat.masterIntensity} />
              )}
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

            {/* Body per mode */}
            {readingMode === 'numbers' && (
              <div className="grid">
                <DeepenBlock section="math" label="Mathematics" baseText={reading.math} layers={deepenings.math || []} loading={deepenLoading.math} error={deepenErrors.math} onDeepen={deepenSection} />
                <DeepenBlock section="numerology" label="Numerology" baseText={reading.numerology} layers={deepenings.numerology || []} loading={deepenLoading.numerology} error={deepenErrors.numerology} onDeepen={deepenSection} />
                <DeepenBlock section="history" label="History" baseText={reading.history} layers={deepenings.history || []} loading={deepenLoading.history} error={deepenErrors.history} onDeepen={deepenSection} />
                <DeepenBlock section="pattern" label="Pattern" baseText={reading.pattern} layers={deepenings.pattern || []} loading={deepenLoading.pattern} error={deepenErrors.pattern} onDeepen={deepenSection} />
              </div>
            )}

            {readingMode === 'profile' && (
              <>
                <div className="core-grid">
                  {CORE_KEYS.map(renderCoreCard)}
                </div>
                {traditionSignatures && computedProfile && (
                  <TraditionDeck
                    profile={computedProfile.inputs}
                    numerology={computedProfile}
                    signatures={traditionSignatures}
                  />
                )}
                {lifeMap && (
                  <div className="lifemap-section">
                    <div className="lifemap-section-head">
                      <p className="section-label">✦ The · Life · Map</p>
                      <p className="lifemap-section-sub">
                        Pinnacles · Challenges · Saturn &amp; Jupiter Returns · the 9-year Personal Year cycle
                      </p>
                    </div>
                    <LifeMap map={lifeMap} />
                    {!lifeMapReading && (
                      <div className="natal-read-row">
                        <button
                          className="confluence-btn"
                          onClick={readLifeMap}
                          disabled={lifeMapLoading}
                        >
                          {lifeMapLoading ? 'reading the arc…' : '✦ Read the Life Arc ✦'}
                        </button>
                      </div>
                    )}
                    {lifeMapError && <div className="error">{lifeMapError}</div>}
                    {lifeMapReading && (
                      <div className="lifemap-reading">
                        <div className="natal-archetype">{lifeMapReading.archetype}</div>
                        <div className="narrative"><p>{lifeMapReading.lifeArc}</p></div>
                        <div className="grid">
                          <div className="card">
                            <p className="card-title">The Past Chapter</p>
                            <p className="card-body">{lifeMapReading.pastChapter}</p>
                          </div>
                          <div className="card">
                            <p className="card-title">The Present Chapter</p>
                            <p className="card-body">{lifeMapReading.presentChapter}</p>
                          </div>
                          <div className="card">
                            <p className="card-title">The Next Threshold</p>
                            <p className="card-body">{lifeMapReading.nextThreshold}</p>
                          </div>
                          <div className="card">
                            <p className="card-title">Path of Liberation</p>
                            <p className="card-body">{lifeMapReading.liberationPath}</p>
                          </div>
                        </div>
                        <div className="affirmation">
                          <div className="affirmation-label">For This Chapter</div>
                          <p className="affirmation-text">"{lifeMapReading.affirmation}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {natalChart && (
                  <div className="natal-section">
                    <div className="natal-section-head">
                      <p className="section-label">✦ The · Natal · Chart</p>
                      <p className="natal-section-sub">{natalChart.signature}</p>
                    </div>
                    <Suspense fallback={<div className="three-loading">casting the chart…</div>}>
                      <NatalChart chart={natalChart.chart} />
                    </Suspense>
                    {!natalReading && (
                      <div className="natal-read-row">
                        <button
                          className="confluence-btn"
                          onClick={readNatalChart}
                          disabled={natalLoading}
                        >
                          {natalLoading ? 'reading the heavens…' : '✦ Read the Chart ✦'}
                        </button>
                      </div>
                    )}
                    {natalError && <div className="error">{natalError}</div>}
                    {natalReading && (
                      <div className="natal-reading">
                        <div className="natal-archetype">{natalReading.archetype}</div>
                        <div className="narrative"><p>{natalReading.chartEssence}</p></div>
                        <div className="grid">
                          <div className="card">
                            <p className="card-title">Sun · {natalChart.chart.planets.find((p) => p.key === 'Sun')?.name}</p>
                            <p className="card-body">{natalReading.sun?.meaning}</p>
                          </div>
                          <div className="card">
                            <p className="card-title">Moon · {natalChart.chart.planets.find((p) => p.key === 'Moon')?.name}</p>
                            <p className="card-body">{natalReading.moon?.meaning}</p>
                          </div>
                          <div className="card">
                            <p className="card-title">Rising · {natalChart.chart.ascendant?.name}</p>
                            <p className="card-body">{natalReading.rising?.meaning}</p>
                          </div>
                          <div className="card">
                            <p className="card-title">Key Aspects</p>
                            <p className="card-body">{natalReading.keyAspects}</p>
                          </div>
                          <div className="card">
                            <p className="card-title">Life Theme</p>
                            <p className="card-body">{natalReading.lifeTheme}</p>
                          </div>
                          <div className="card">
                            <p className="card-title">Shadow Work</p>
                            <p className="card-body">{natalReading.shadow}</p>
                          </div>
                        </div>
                        <div className="affirmation">
                          <div className="affirmation-label">The Chart Speaks</div>
                          <p className="affirmation-text">"{natalReading.affirmation}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {readingMode === 'compatibility' && (
              <>
                <div className="grid">
                  <DeepenBlock section="lifePath" label="Life Path" sublabel={`${computedProfile.lifePath.value} · ${computedProfileB.lifePath.value}`} baseText={reading.lifePath?.meaning || ''} layers={deepenings.lifePath || []} loading={deepenLoading.lifePath} error={deepenErrors.lifePath} onDeepen={deepenSection} />
                  <DeepenBlock section="expression" label="Expression" sublabel={`${computedProfile.expression.value} · ${computedProfileB.expression.value}`} baseText={reading.expression?.meaning || ''} layers={deepenings.expression || []} loading={deepenLoading.expression} error={deepenErrors.expression} onDeepen={deepenSection} />
                  <DeepenBlock section="soulUrge" label="Soul Urge" sublabel={`${computedProfile.soulUrge.value} · ${computedProfileB.soulUrge.value}`} baseText={reading.soulUrge?.meaning || ''} layers={deepenings.soulUrge || []} loading={deepenLoading.soulUrge} error={deepenErrors.soulUrge} onDeepen={deepenSection} />
                  <DeepenBlock section="birthday" label="Birthday" sublabel={`${computedProfile.birthday.value} · ${computedProfileB.birthday.value}`} baseText={reading.birthday?.meaning || ''} layers={deepenings.birthday || []} loading={deepenLoading.birthday} error={deepenErrors.birthday} onDeepen={deepenSection} />
                </div>
                <div className="grid">
                  <DeepenBlock section="strengths" label="Strengths" baseText={reading.strengths} layers={deepenings.strengths || []} loading={deepenLoading.strengths} error={deepenErrors.strengths} onDeepen={deepenSection} />
                  <DeepenBlock section="tensions" label="Tensions" baseText={reading.tensions} layers={deepenings.tensions || []} loading={deepenLoading.tensions} error={deepenErrors.tensions} onDeepen={deepenSection} />
                </div>
                <DeepenBlock section="practice" label="Practice" className="practice-block card" baseText={reading.practice} layers={deepenings.practice || []} loading={deepenLoading.practice} error={deepenErrors.practice} onDeepen={deepenSection} />
              </>
            )}

            {/* Affirmation for single-profile / numbers */}
            {reading.affirmation && (
              <div className="affirmation">
                <div className="affirmation-label">Affirmation</div>
                <p className="affirmation-text">"{reading.affirmation}"</p>
              </div>
            )}
            {reading.verdict && (
              <div className="affirmation">
                <div className="affirmation-label">Verdict</div>
                <p className="affirmation-text">"{reading.verdict}"</p>
              </div>
            )}

            {/* Visual section */}
            <div className="visual">
              <div className="visual-head">
                <h3 className="visual-title">A geometry for these numbers</h3>
                <div className="mode-toggle">
                  <button className={`mode-btn ${viewMode === '2d' ? 'active' : ''}`} onClick={() => setViewMode('2d')}>2D</button>
                  <button className={`mode-btn ${viewMode === '3d' ? 'active' : ''}`} onClick={() => setViewMode('3d')}>3D</button>
                </div>
              </div>

              {pattern && sigilNumbers.length > 0 ? (
                <>
                  <div className="tabs">
                    {PATTERNS.map((p) => (
                      <button key={p} className={`tab ${pattern === p ? 'active' : ''}`} onClick={() => setPattern(p)}>{p}</button>
                    ))}
                  </div>
                  <div className="canvas-wrap">
                    {viewMode === '2d' ? (
                      <canvas ref={canvasRef} className="sigil" />
                    ) : (
                      <Suspense fallback={<div className="three-loading">loading dimensional renderer…</div>}>
                        <Sigil3D
                          ref={sigil3dRef}
                          pattern={pattern}
                          reading={reading}
                          numbers={sigilNumbers}
                          palette={palette}
                          size={520}
                        />
                      </Suspense>
                    )}
                  </div>
                  {viewMode === '3d' && (
                    <p className="hint">drag to orbit · releases into slow rotation</p>
                  )}
                </>
              ) : (
                <div className="canvas-wrap">
                  <div className="sigil-placeholder">
                    <button className="generate-btn" onClick={() => setPattern('mandala')}>Generate Sigil</button>
                  </div>
                </div>
              )}

              <div className="actions">
                <button className="action" onClick={savePNG} disabled={!pattern}>Save PNG ↓</button>
                <button className="action" onClick={copyReading}>Copy Reading</button>
                <button
                  className={`action ${saveStatus === 'saved' ? 'saved' : ''}`}
                  onClick={saveReading}
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                  title={saveStatus === 'unavailable' ? 'Persistence not configured on the server' : 'Save this reading'}
                >
                  {saveStatus === 'saving' && 'saving…'}
                  {saveStatus === 'saved' && '★ saved'}
                  {saveStatus === 'unavailable' && '★ Save (offline)'}
                  {saveStatus === 'error' && '★ retry save'}
                  {!saveStatus && '★ Save reading'}
                </button>
                <button className="action" onClick={receiveReading}>Read Again</button>
                <button className="action danger" onClick={reset}>New Reading</button>
              </div>
              {saveStatus === 'unavailable' && (
                <p className="save-hint">Saving requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.</p>
              )}
              {saveStatus === 'error' && saveError && (
                <p className="save-hint save-error">Save failed: {saveError}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
