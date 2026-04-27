import { useMemo, useState } from 'react'
import { PINNACLE_MEANINGS, CHALLENGE_MEANINGS } from './lifemap.js'

// Horizontal life timeline. Layered bands: pinnacles, challenges,
// personal year cycle, planetary returns. Vertical "now" line at current age.

const W = 720
const H = 280
const PAD_L = 36
const PAD_R = 24
const PAD_T = 28
const PAD_B = 36
const innerW = W - PAD_L - PAD_R
const innerH = H - PAD_T - PAD_B
const MAX_AGE = 96

const ageToX = (age) => PAD_L + (age / MAX_AGE) * innerW

const BANDS = [
  { key: 'pinnacle',  label: 'Pinnacles',     y: PAD_T,           h: 38 },
  { key: 'challenge', label: 'Challenges',    y: PAD_T + 46,      h: 28 },
  { key: 'personal',  label: 'Personal Year', y: PAD_T + 82,      h: 22 },
  { key: 'planetary', label: 'Returns',       y: PAD_T + 112,     h: 60 }
]

const PY_COLOR = (n) => {
  // 1-9: subtle distinct hues; 11/22/33 emphasized.
  const map = {
    1: '#d4b87a', 2: '#a9c8a9', 3: '#c8a9d4', 4: '#a9c8d4', 5: '#d4a9a9',
    6: '#a9d4b8', 7: '#a8a8d4', 8: '#d4c2a9', 9: '#c8d4a9',
    11: '#e6d49a', 22: '#e6b39a', 33: '#e69ad4'
  }
  return map[n] || '#d4b87a'
}

const formatAge = (a) => {
  const yrs = Math.floor(a)
  const mo = Math.round((a - yrs) * 12)
  return mo === 0 ? `${yrs}` : `${yrs}y ${mo}m`
}

export default function LifeMap({ map }) {
  const [tooltip, setTooltip] = useState(null) // { x, y, label, body }

  if (!map) return null
  const nowX = ageToX(map.currentAge)

  const showTip = (e, label, body) => {
    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setTooltip({ x, y, label, body })
  }
  const hideTip = () => setTooltip(null)

  // Pinnacle segments
  const pinnacleSegments = map.pinnacles.map((p, i) => {
    const x1 = ageToX(p.startAge)
    const x2 = ageToX(Math.min(p.endAge, MAX_AGE))
    return {
      ...p,
      x1, x2, w: x2 - x1,
      meaning: PINNACLE_MEANINGS[p.value] || 'transformation',
      isCurrent: map.currentAge >= p.startAge && map.currentAge < p.endAge,
      key: `p${i}`
    }
  })

  // Challenge segments
  const challengeSegments = map.challenges.map((c, i) => {
    const x1 = ageToX(c.startAge)
    const x2 = ageToX(Math.min(c.endAge, MAX_AGE))
    return {
      ...c,
      x1, x2, w: x2 - x1,
      meaning: CHALLENGE_MEANINGS[c.value] || 'discernment',
      isCurrent: map.currentAge >= c.startAge && map.currentAge < c.endAge,
      key: `c${i}`
    }
  })

  // Personal year as small vertical bars
  const pyBand = BANDS[2]

  return (
    <div className="lifemap-wrap">
      <svg className="lifemap" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
        {/* Decade gridlines */}
        {Array.from({ length: 10 }).map((_, i) => {
          const age = i * 10
          const x = ageToX(age)
          return (
            <g key={`grid-${i}`}>
              <line
                x1={x} y1={PAD_T - 4}
                x2={x} y2={H - PAD_B + 4}
                stroke="var(--line-soft)" strokeWidth="0.5"
              />
              <text
                x={x} y={H - PAD_B + 18}
                textAnchor="middle" fill="var(--ink-faint)"
                fontFamily="'Space Mono', monospace" fontSize="9"
                letterSpacing="0.1em"
              >
                {age}
              </text>
            </g>
          )
        })}
        {/* Final decade label */}
        <text x={ageToX(MAX_AGE)} y={H - PAD_B + 18}
          textAnchor="middle" fill="var(--ink-faint)"
          fontFamily="'Space Mono', monospace" fontSize="9">
          {MAX_AGE}
        </text>

        {/* Band labels */}
        {BANDS.map((b) => (
          <text
            key={b.key}
            x={PAD_L - 6} y={b.y + b.h / 2 + 3}
            textAnchor="end" fill="var(--gold-soft)"
            fontFamily="'Space Mono', monospace" fontSize="8"
            letterSpacing="0.18em" textTransform="uppercase"
          >
            {b.label.toUpperCase()}
          </text>
        ))}

        {/* Pinnacle segments */}
        {pinnacleSegments.map((p) => (
          <g key={p.key}
            onMouseEnter={(e) => showTip(e, `Pinnacle ${p.number} · ${p.value}${p.isMaster ? ' (master)' : ''}`,
              `Ages ${formatAge(p.startAge)}–${formatAge(p.endAge)} · ${p.meaning}`)}
            onMouseLeave={hideTip}
          >
            <rect
              x={p.x1} y={BANDS[0].y} width={p.w} height={BANDS[0].h}
              fill={p.isCurrent ? 'var(--tint-2)' : 'var(--tint-1)'}
              stroke={p.isCurrent ? 'var(--gold)' : 'var(--line-soft)'}
              strokeWidth={p.isCurrent ? 1.4 : 0.5}
            />
            <text
              x={p.x1 + p.w / 2} y={BANDS[0].y + BANDS[0].h / 2 + 2}
              textAnchor="middle" dominantBaseline="middle"
              fill="var(--gold)"
              fontFamily="'Cormorant Garamond', serif" fontSize="20"
              fontStyle="italic" fontWeight="500"
            >
              {p.value}
              {p.isMaster && <tspan fontSize="8" dx="3" dy="-6"> ✦</tspan>}
            </text>
          </g>
        ))}

        {/* Challenge segments */}
        {challengeSegments.map((c) => (
          <g key={c.key}
            onMouseEnter={(e) => showTip(e, `Challenge ${c.number} · ${c.value}`,
              `Ages ${formatAge(c.startAge)}–${formatAge(c.endAge)} · ${c.meaning}`)}
            onMouseLeave={hideTip}
          >
            <rect
              x={c.x1} y={BANDS[1].y} width={c.w} height={BANDS[1].h}
              fill={c.isCurrent ? 'var(--tint-2)' : 'transparent'}
              stroke={c.isCurrent ? 'var(--gold)' : 'var(--line-soft)'}
              strokeWidth={c.isCurrent ? 1.2 : 0.5}
              strokeDasharray={c.isCurrent ? '' : '3 2'}
            />
            <text
              x={c.x1 + c.w / 2} y={BANDS[1].y + BANDS[1].h / 2 + 2}
              textAnchor="middle" dominantBaseline="middle"
              fill="var(--ink)"
              fontFamily="'Space Mono', monospace" fontSize="11"
              letterSpacing="0.12em"
            >
              {c.value}
            </text>
          </g>
        ))}

        {/* Personal year cycle: thin bars per year */}
        {map.personalYears.map((py) => {
          const x = ageToX(py.age)
          const w = innerW / MAX_AGE
          return (
            <rect
              key={py.age}
              x={x} y={pyBand.y}
              width={Math.max(w * 0.95, 1)}
              height={pyBand.h}
              fill={PY_COLOR(py.value)}
              opacity={py.isMaster ? 0.85 : 0.55}
              onMouseEnter={(e) => showTip(e, `Personal Year ${py.value}${py.isMaster ? ' (master)' : ''}`,
                `Calendar year ${py.calendarYear} · age ${py.age}`)}
              onMouseLeave={hideTip}
            />
          )
        })}

        {/* Saturn returns — long markers */}
        {map.saturnReturns.map((s) => (
          <g key={`sat-${s.ordinal}`}
            onMouseEnter={(e) => showTip(e, `Saturn Return ${['1st','2nd','3rd'][s.ordinal-1] || `${s.ordinal}th`}`,
              `Age ${formatAge(s.age)} · structural reckoning, maturation passage`)}
            onMouseLeave={hideTip}
          >
            <line
              x1={ageToX(s.age)} y1={BANDS[3].y}
              x2={ageToX(s.age)} y2={BANDS[3].y + BANDS[3].h}
              stroke="#a9c8d4" strokeWidth="2.5"
              opacity="0.9"
            />
            <text
              x={ageToX(s.age)} y={BANDS[3].y + 12}
              textAnchor="middle" fill="#a9c8d4"
              fontFamily="'Space Mono', monospace" fontSize="8"
              letterSpacing="0.15em"
            >
              ♄
            </text>
          </g>
        ))}

        {/* Jupiter returns — shorter markers */}
        {map.jupiterReturns.map((j) => (
          <g key={`jup-${j.ordinal}`}
            onMouseEnter={(e) => showTip(e, `Jupiter Return ${j.ordinal}`,
              `Age ${formatAge(j.age)} · expansion, growth opportunity, faith renewed`)}
            onMouseLeave={hideTip}
          >
            <line
              x1={ageToX(j.age)} y1={BANDS[3].y + BANDS[3].h - 24}
              x2={ageToX(j.age)} y2={BANDS[3].y + BANDS[3].h}
              stroke="#d4c2a9" strokeWidth="1.4"
              opacity="0.7"
            />
            <text
              x={ageToX(j.age)} y={BANDS[3].y + BANDS[3].h - 28}
              textAnchor="middle" fill="#d4c2a9"
              fontFamily="'Space Mono', monospace" fontSize="7"
              letterSpacing="0.1em"
              opacity="0.7"
            >
              ♃
            </text>
          </g>
        ))}

        {/* "Now" marker */}
        <g>
          <line
            x1={nowX} y1={PAD_T - 8}
            x2={nowX} y2={H - PAD_B + 4}
            stroke="var(--gold)" strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={nowX} y={PAD_T - 12}
            textAnchor="middle" fill="var(--gold)"
            fontFamily="'Space Mono', monospace" fontSize="9"
            letterSpacing="0.3em"
          >
            NOW · {formatAge(map.currentAge)}
          </text>
        </g>
      </svg>

      {tooltip && (
        <div
          className="lifemap-tooltip"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          <div className="lifemap-tooltip-label">{tooltip.label}</div>
          <div className="lifemap-tooltip-body">{tooltip.body}</div>
        </div>
      )}

      {/* Below-graph: snapshot of the current moment */}
      <div className="lifemap-snapshot">
        <div className="lifemap-snapshot-cell">
          <div className="lifemap-snapshot-label">Current Pinnacle</div>
          <div className="lifemap-snapshot-value">
            {map.currentPinnacle.value}
            {map.currentPinnacle.isMaster && <em className="master-tag">master</em>}
          </div>
          <div className="lifemap-snapshot-meaning">
            {PINNACLE_MEANINGS[map.currentPinnacle.value] || ''}
          </div>
        </div>
        <div className="lifemap-snapshot-cell">
          <div className="lifemap-snapshot-label">Current Challenge</div>
          <div className="lifemap-snapshot-value">{map.currentChallenge.value}</div>
          <div className="lifemap-snapshot-meaning">
            {CHALLENGE_MEANINGS[map.currentChallenge.value] || ''}
          </div>
        </div>
        <div className="lifemap-snapshot-cell">
          <div className="lifemap-snapshot-label">Personal Year</div>
          <div className="lifemap-snapshot-value">
            {map.currentPersonalYear.value}
            {map.currentPersonalYear.isMaster && <em className="master-tag">master</em>}
          </div>
          <div className="lifemap-snapshot-meaning">
            {map.currentPersonalYear.calendarYear} · {PINNACLE_MEANINGS[map.currentPersonalYear.value] || ''}
          </div>
        </div>
        <div className="lifemap-snapshot-cell">
          <div className="lifemap-snapshot-label">Next Saturn / Jupiter</div>
          <div className="lifemap-snapshot-value">
            {map.nextSaturn ? `♄ ${formatAge(map.nextSaturn.age)}` : '♄ —'}
          </div>
          <div className="lifemap-snapshot-meaning">
            {map.nextJupiter ? `♃ ${formatAge(map.nextJupiter.age)}` : '♃ —'}
          </div>
        </div>
      </div>
    </div>
  )
}
