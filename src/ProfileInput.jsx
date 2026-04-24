import { useMemo, useState } from 'react'
import { computeProfile, CORE_KEYS, CORE_LABELS } from './numerology.js'

const ProfileInput = ({ value, onChange, label, system, onSystemChange }) => {
  const { name, birthdate, birthtime = '', lat = '', lon = '', tz = '' } = value
  const [showNatalFields, setShowNatalFields] = useState(false)

  const profile = useMemo(() => {
    if (!name || name.trim().length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) return null
    try {
      return computeProfile({ name, birthdate, system })
    } catch {
      return null
    }
  }, [name, birthdate, system])

  const natalReady = Boolean(
    birthdate &&
    /^\d{2}:\d{2}$/.test(birthtime) &&
    lat !== '' && !isNaN(Number(lat)) &&
    lon !== '' && !isNaN(Number(lon)) &&
    tz !== '' && !isNaN(Number(tz))
  )

  const detectTz = () => {
    const offsetMin = -new Date().getTimezoneOffset()
    onChange({ ...value, tz: (offsetMin / 60).toString() })
  }

  return (
    <div className="profile-input">
      {label && <div className="profile-input-label">{label}</div>}
      <div className="profile-fields">
        <label className="field">
          <span className="field-label">full birth name</span>
          <input
            className="field-input"
            value={name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="e.g. Alice Jane Rivera"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span className="field-label">birth date</span>
          <input
            className="field-input"
            type="date"
            value={birthdate}
            onChange={(e) => onChange({ ...value, birthdate: e.target.value })}
          />
        </label>
      </div>

      {onSystemChange && (
        <div className="system-toggle">
          <span className="system-label">system</span>
          <button
            className={`system-btn ${system === 'pythagorean' ? 'active' : ''}`}
            onClick={() => onSystemChange('pythagorean')}
            type="button"
          >Pythagorean</button>
          <button
            className={`system-btn ${system === 'chaldean' ? 'active' : ''}`}
            onClick={() => onSystemChange('chaldean')}
            type="button"
          >Chaldean</button>
        </div>
      )}

      {/* Natal chart fields — optional, collapsed by default */}
      <button
        className="natal-toggle"
        type="button"
        onClick={() => setShowNatalFields((s) => !s)}
      >
        {showNatalFields ? '− hide' : '+ add'} birth time &amp; place {natalReady && !showNatalFields ? '· natal ready' : ''}
      </button>

      {showNatalFields && (
        <div className="natal-fields">
          <p className="natal-fields-hint">
            Adding birth time + location unlocks your full Western natal chart — Sun, Moon, Rising, all planets in houses, aspects.
            Without these, the app still runs everything else.
          </p>
          <div className="natal-fields-grid">
            <label className="field">
              <span className="field-label">birth time (24h)</span>
              <input
                className="field-input"
                type="time"
                value={birthtime}
                onChange={(e) => onChange({ ...value, birthtime: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">tz offset (hours from UTC)</span>
              <div className="field-inline">
                <input
                  className="field-input"
                  type="number"
                  step="0.5"
                  value={tz}
                  onChange={(e) => onChange({ ...value, tz: e.target.value })}
                  placeholder="e.g. -8"
                />
                <button
                  type="button"
                  className="field-inline-btn"
                  onClick={detectTz}
                  title="Use your browser's current timezone offset"
                >use mine</button>
              </div>
            </label>
          </div>
          <div className="natal-fields-grid">
            <label className="field">
              <span className="field-label">latitude (decimal)</span>
              <input
                className="field-input"
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => onChange({ ...value, lat: e.target.value })}
                placeholder="e.g. 40.7128"
              />
            </label>
            <label className="field">
              <span className="field-label">longitude (decimal)</span>
              <input
                className="field-input"
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => onChange({ ...value, lon: e.target.value })}
                placeholder="e.g. -74.0060"
              />
            </label>
          </div>
          <p className="natal-fields-tip">
            Tip: Google your birth city and copy lat/lon from the URL (decimals like <code>40.7128</code>, <code>-74.0060</code>). Timezone is hours ahead of UTC (negative for the Americas, positive for Europe/Asia).
          </p>
        </div>
      )}

      {profile && (
        <div className="core-numbers">
          {CORE_KEYS.map((k) => {
            const n = profile[k]
            return (
              <div key={k} className="core-pill">
                <span className="core-pill-label">{CORE_LABELS[k].label}</span>
                <span className="core-pill-value">
                  {n.value}
                  {n.isMaster && <em className="master-tag">master</em>}
                  {n.karmicDebt && <em className="karmic-tag">karmic</em>}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const ProfileExplainer = () => {
  const [open, setOpen] = useState(false)
  return (
    <div className={`explainer ${open ? 'open' : ''}`}>
      <button className="explainer-toggle" onClick={() => setOpen((o) => !o)}>
        ✦ how this is calculated {open ? '−' : '+'}
      </button>
      {open && (
        <div className="explainer-body">
          <p><strong>Life Path</strong> sums every digit of your birth date (MM/DD/YYYY) and reduces to a single digit. This is the spine of the reading — the arc of your life.</p>
          <p><strong>Expression</strong> sums the numerical value of every letter in your full birth name. The name on your birth certificate, not a nickname — the original vibration matters.</p>
          <p><strong>Soul Urge</strong> sums only the vowels; <strong>Personality</strong> sums only the consonants. Inner motivation vs outer mask.</p>
          <p><strong>Birthday</strong> is the day of the month itself (1–31). <strong>Personal Year</strong> adds your birth month + day + the current year — the energy specific to you this year.</p>
          <p><strong>Master numbers</strong> (11, 22, 33) are never reduced — their doubled resonance is the point. <strong>Karmic debt</strong> numbers (13, 14, 16, 19) appearing in the sum are flagged: they mark lessons carried in.</p>
          <p><strong>Pythagorean vs Chaldean</strong>: Pythagorean is modern Western (A=1, B=2, …, I=9, then J=1 again). Chaldean is older, uses 1–8 only (9 is sacred, only as a final sum), with a different letter mapping. Both systems are supported; Pythagorean is the default.</p>
          <p><strong>Compatibility</strong> uses a 9×9 Pythagorean matrix grounded in each number's character — not a modular shortcut. Four axes are weighted: <em>Life Path</em> (50%), <em>Expression</em> (25%), <em>Soul Urge</em> (15%), <em>Birthday</em> (10%). Master numbers (11, 22, 33) score against their root with a small intensity bonus, and the narrative honors the traditional verdict for each pair — <em>highly compatible</em>, <em>compatible</em>, <em>neutral</em>, <em>challenging</em>, or <em>very challenging</em> — rather than smoothing results. Two identical numbers are not automatically perfect: two 1s often clash (both want to lead), and two 8s compete for command.</p>
          <p>All arithmetic happens in your browser before any reading is requested — the numbers shown are verifiable. The oracle only narrates; it never recalculates.</p>
        </div>
      )}
    </div>
  )
}

export default ProfileInput
