import { useMemo } from 'react'
import { SIGNS, ASPECTS } from './natal.js'

// SVG natal chart wheel.
// Outer ring: zodiac signs (12 × 30°).
// Inner ring: house cusps (Whole Sign — one sign per house).
// Inside: planet glyphs placed by longitude.
// Center: aspect lines (major aspects with color by nature).

const SIZE = 520
const CX = SIZE / 2
const CY = SIZE / 2

const R_OUTER        = 252   // outermost zodiac ring
const R_ZODIAC_INNER = 216
const R_HOUSE_INNER  = 180
const R_PLANET       = 156
const R_ASPECT       = 138   // aspect lines end here

// Chart runs counterclockwise starting from ASC at "9 o'clock" (180° in SVG).
// We rotate the entire chart so that the Ascendant sits at the left.
// SVG angle 0 = right, positive y is down (clockwise). We want 0° ecliptic
// (0 Aries) at a rotated position determined by the ASC placement.
//
// Standard chart convention: ASC (ecliptic longitude L_asc) is drawn at the
// 9-o'clock position. So a point at ecliptic longitude L should appear at
// angle θ (SVG) = 180° + (L_asc − L).

const ecliptoSVG = (lon, ascLon) => {
  const theta = 180 + (ascLon - lon)
  const rad = theta * Math.PI / 180
  return rad
}

const polar = (r, angleRad) => ({
  x: CX + r * Math.cos(angleRad),
  y: CY + r * Math.sin(angleRad)
})

const ASPECT_COLOR = {
  Conjunction: 'var(--gold)',
  Sextile:     '#6ec8a9',
  Square:      '#c87060',
  Trine:       '#8ec86e',
  Opposition:  '#c86e8e'
}

export default function NatalChart({ chart }) {
  const ascLon = chart?.ascendant?.longitude ?? 0

  // Zodiac ring: 12 sign segments
  const signSegments = useMemo(() => SIGNS.map((s, i) => {
    const startLon = i * 30
    const endLon   = startLon + 30
    const midLon   = startLon + 15
    const a1 = ecliptoSVG(startLon, ascLon)
    const a2 = ecliptoSVG(endLon, ascLon)
    const aMid = ecliptoSVG(midLon, ascLon)
    const p1 = polar(R_OUTER, a1)
    const p2 = polar(R_OUTER, a2)
    const p3 = polar(R_ZODIAC_INNER, a2)
    const p4 = polar(R_ZODIAC_INNER, a1)
    // Arc direction: we're going counterclockwise in ecliptic, but SVG angles
    // move clockwise. The proper large-arc / sweep flag depends on direction.
    const large = 0
    const sweep = 0
    const pathD = [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${R_OUTER} ${R_OUTER} 0 ${large} ${sweep} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${R_ZODIAC_INNER} ${R_ZODIAC_INNER} 0 ${large} ${1 - sweep} ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      'Z'
    ].join(' ')
    const glyphPos = polar((R_OUTER + R_ZODIAC_INNER) / 2, aMid)
    return { sign: s, pathD, glyphPos, i, startAngle: a1, endAngle: a2 }
  }), [ascLon])

  // House cusps are every 30° anchored at the ASC.
  const houseCusps = useMemo(() => {
    const cusps = []
    const ascSignStart = Math.floor(ascLon / 30) * 30
    for (let i = 0; i < 12; i++) {
      const cuspLon = (ascSignStart + i * 30) % 360
      const angle = ecliptoSVG(cuspLon, ascLon)
      const p1 = polar(R_ZODIAC_INNER, angle)
      const p2 = polar(R_ASPECT, angle)
      cusps.push({ num: i + 1, p1, p2, angle, cuspLon })
    }
    return cusps
  }, [ascLon])

  // Place planets — detect collisions (within 6° of each other) and nudge.
  const planetPlacements = useMemo(() => {
    if (!chart) return []
    const sorted = [...chart.planets].sort((a, b) => a.longitude - b.longitude)
    const placed = []
    const threshold = 6
    for (const p of sorted) {
      let r = R_PLANET
      const clash = placed.find((q) => Math.abs(q.longitude - p.longitude) < threshold && Math.abs(q.r - r) < 12)
      if (clash) r -= 22
      placed.push({ ...p, r })
    }
    return placed.map((p) => {
      const angle = ecliptoSVG(p.longitude, ascLon)
      return { ...p, pos: polar(p.r, angle), angle }
    })
  }, [chart, ascLon])

  // Aspect lines
  const aspectLines = useMemo(() => {
    if (!chart) return []
    return chart.aspects.map((asp, idx) => {
      const a = chart.planets.find((p) => p.key === asp.a)
      const b = chart.planets.find((p) => p.key === asp.b)
      const aAngle = ecliptoSVG(a.longitude, ascLon)
      const bAngle = ecliptoSVG(b.longitude, ascLon)
      const p1 = polar(R_ASPECT, aAngle)
      const p2 = polar(R_ASPECT, bAngle)
      return { asp, p1, p2, key: idx, color: ASPECT_COLOR[asp.name] || 'var(--gold)' }
    })
  }, [chart, ascLon])

  if (!chart) return null

  return (
    <div className="natal-wheel-wrap">
      <svg className="natal-wheel" viewBox={`0 0 ${SIZE} ${SIZE}`} xmlns="http://www.w3.org/2000/svg">
        {/* Outer ring background */}
        <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="var(--line)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_ZODIAC_INNER} fill="none" stroke="var(--line-soft)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_HOUSE_INNER} fill="none" stroke="var(--line-soft)" strokeWidth="0.5" />
        <circle cx={CX} cy={CY} r={R_ASPECT} fill="none" stroke="var(--line-soft)" strokeWidth="0.5" />

        {/* Sign segments (dividers only; no fills to keep it airy) */}
        {signSegments.map(({ i, startAngle, sign, glyphPos }) => {
          const p1 = polar(R_OUTER, startAngle)
          const p2 = polar(R_ZODIAC_INNER, startAngle)
          return (
            <g key={i}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--line-soft)" strokeWidth="0.5" />
              <text
                x={glyphPos.x}
                y={glyphPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--gold)"
                fontSize="18"
                fontFamily="'Cormorant Garamond', serif"
              >
                {sign.glyph}
              </text>
            </g>
          )
        })}

        {/* House cusp lines + numbers */}
        {houseCusps.map((hc, i) => {
          const mid = polar((R_ZODIAC_INNER + R_ASPECT) / 2,
            (hc.angle + ecliptoSVG(hc.cuspLon + 30, ascLon)) / 2)
          const isAxis = i === 0 || i === 3 || i === 6 || i === 9
          return (
            <g key={i}>
              <line
                x1={hc.p1.x} y1={hc.p1.y}
                x2={hc.p2.x} y2={hc.p2.y}
                stroke={isAxis ? 'var(--gold-soft)' : 'var(--line-soft)'}
                strokeWidth={isAxis ? 1 : 0.5}
                strokeDasharray={isAxis ? '' : '2 3'}
              />
              <text
                x={mid.x} y={mid.y}
                textAnchor="middle" dominantBaseline="central"
                fill="var(--ink-faint)" fontSize="10"
                fontFamily="'Space Mono', monospace"
              >
                {hc.num}
              </text>
            </g>
          )
        })}

        {/* Aspect lines */}
        {aspectLines.map(({ asp, p1, p2, key, color }) => (
          <line
            key={key}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={color}
            strokeWidth={asp.name === 'Conjunction' ? 1.2 : 0.7}
            strokeOpacity={0.55}
          />
        ))}

        {/* Planet glyphs */}
        {planetPlacements.map((p) => (
          <g key={p.key}>
            <circle cx={p.pos.x} cy={p.pos.y} r="13" fill="var(--bg-card)" stroke="var(--gold-soft)" strokeWidth="0.8" />
            <text
              x={p.pos.x} y={p.pos.y}
              textAnchor="middle" dominantBaseline="central"
              fill="var(--gold)" fontSize="16"
              fontFamily="'Cormorant Garamond', serif"
            >
              {p.glyph}
            </text>
          </g>
        ))}

        {/* Ascendant marker */}
        <g>
          {(() => {
            const a = ecliptoSVG(ascLon, ascLon)
            const p1 = polar(R_OUTER + 4, a)
            const p2 = polar(R_OUTER + 16, a)
            return (
              <>
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--gold)" strokeWidth="1.2" />
                <text x={p2.x - 12} y={p2.y + 4} fill="var(--gold)" fontSize="10" fontFamily="'Space Mono', monospace">
                  ASC
                </text>
              </>
            )
          })()}
        </g>
      </svg>

      <div className="natal-legend">
        <div className="natal-legend-group">
          {chart.planets.map((p) => (
            <div key={p.key} className="natal-legend-row">
              <span className="natal-legend-glyph">{p.glyph}</span>
              <span className="natal-legend-name">{p.key}</span>
              <span className="natal-legend-placement">
                {p.glyph === p.glyph && p.name}
              </span>
              <span className="natal-legend-degree">{Math.floor(p.degree)}°{String(Math.floor((p.degree % 1) * 60)).padStart(2, '0')}'</span>
              <span className="natal-legend-house">H{p.house}</span>
            </div>
          ))}
        </div>
        <div className="natal-legend-group angles">
          <div className="natal-legend-row">
            <span className="natal-legend-glyph">↑</span>
            <span className="natal-legend-name">Ascendant</span>
            <span className="natal-legend-placement">{chart.ascendant.name}</span>
            <span className="natal-legend-degree">{Math.floor(chart.ascendant.degree)}°</span>
            <span className="natal-legend-house">H1</span>
          </div>
          <div className="natal-legend-row">
            <span className="natal-legend-glyph">MC</span>
            <span className="natal-legend-name">Midheaven</span>
            <span className="natal-legend-placement">{chart.midheaven.name}</span>
            <span className="natal-legend-degree">{Math.floor(chart.midheaven.degree)}°</span>
            <span className="natal-legend-house">—</span>
          </div>
        </div>
      </div>

      {chart.aspects.length > 0 && (
        <div className="natal-aspects">
          <div className="natal-aspects-label">Major aspects ({chart.aspects.length})</div>
          <div className="natal-aspects-grid">
            {chart.aspects.map((asp, i) => (
              <div key={i} className="natal-aspect-row">
                <span style={{ color: ASPECT_COLOR[asp.name] }}>{asp.symbol}</span>
                <span className="natal-aspect-bodies">{asp.a} {asp.symbol} {asp.b}</span>
                <span className="natal-aspect-detail">
                  {asp.name} · orb {asp.orb.toFixed(1)}°
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
