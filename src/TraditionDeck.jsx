import { useState } from 'react'
import { TRADITIONS } from './traditions/index.js'

const postJSON = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    let detail = ''
    try { const b = await res.json(); detail = b?.error || b?.detail || '' } catch { detail = await res.text() }
    throw new Error(detail || `Request failed (${res.status})`)
  }
  return res.json()
}

const TraditionCard = ({ tradition, signature, profile, reading, loading, error, onRead }) => {
  const [showBreakdown, setShowBreakdown] = useState(false)
  return (
    <div className="tradition-card">
      <div className="tradition-head">
        <div>
          <p className="tradition-label">{tradition.label}</p>
          <p className="tradition-tagline">{tradition.tagline}</p>
        </div>
        <div className="tradition-signature">
          <div className="tradition-signature-main">{signature.signature}</div>
          {signature.english && signature.english !== signature.signature && (
            <div className="tradition-signature-sub">{signature.english}</div>
          )}
        </div>
      </div>

      <div className="tradition-essence">{signature.essence}</div>

      {reading && (
        <div className="tradition-reading">
          <div className="tradition-archetype">{reading.archetype}</div>
          <p className="tradition-narrative">{reading.narrative}</p>
          <div className="tradition-pair">
            <div>
              <div className="tradition-pair-label">Gift</div>
              <p className="tradition-pair-text">{reading.gift}</p>
            </div>
            <div>
              <div className="tradition-pair-label">Shadow</div>
              <p className="tradition-pair-text">{reading.shadow}</p>
            </div>
          </div>
          <div className="tradition-affirmation">"{reading.affirmation}"</div>
        </div>
      )}

      <div className="tradition-actions">
        {!reading && (
          <button className="tradition-read-btn" onClick={onRead} disabled={loading}>
            {loading ? 'listening…' : 'read this tradition ↓'}
          </button>
        )}
        <button className="tradition-breakdown-btn" onClick={() => setShowBreakdown((s) => !s)}>
          {showBreakdown ? 'hide how' : 'how this is derived'}
        </button>
      </div>

      {showBreakdown && (
        <div className="tradition-breakdown">
          <p><strong>Calculation:</strong> {signature.breakdown}</p>
          <p className="tradition-source"><strong>Source:</strong> {tradition.sourceNote}</p>
        </div>
      )}

      {error && <div className="tradition-error">{error}</div>}
    </div>
  )
}

export default function TraditionDeck({ profile, numerology, signatures }) {
  const [readings, setReadings] = useState({})       // { traditionId → reading }
  const [loading, setLoading] = useState({})         // { traditionId → bool }
  const [errors, setErrors] = useState({})           // { traditionId → msg }
  const [confluence, setConfluence] = useState(null)
  const [confluenceLoading, setConfluenceLoading] = useState(false)
  const [confluenceError, setConfluenceError] = useState(null)

  const readTradition = async (tradition) => {
    const sig = signatures[tradition.id]
    if (!sig) return
    setLoading((s) => ({ ...s, [tradition.id]: true }))
    setErrors((s) => ({ ...s, [tradition.id]: null }))
    try {
      const result = await postJSON('/api/tradition', {
        tradition: { id: tradition.id, label: tradition.label, tagline: tradition.tagline, sourceNote: tradition.sourceNote },
        signature: sig,
        profile
      })
      setReadings((s) => ({ ...s, [tradition.id]: result }))
    } catch (e) {
      setErrors((s) => ({ ...s, [tradition.id]: e.message }))
    } finally {
      setLoading((s) => ({ ...s, [tradition.id]: false }))
    }
  }

  const weaveConfluence = async () => {
    const active = TRADITIONS.filter((t) => signatures[t.id] && !signatures[t.id].error)
    if (active.length < 2) return
    setConfluenceLoading(true); setConfluenceError(null)
    try {
      const result = await postJSON('/api/confluence', {
        profile,
        numerology,
        traditions: active.map((t) => ({
          id: t.id,
          label: t.label,
          signature: signatures[t.id]
        })),
        readings
      })
      setConfluence(result)
    } catch (e) {
      setConfluenceError(e.message)
    } finally {
      setConfluenceLoading(false)
    }
  }

  const readCount = Object.keys(readings).length

  return (
    <div className="tradition-deck">
      <div className="tradition-deck-head">
        <p className="section-label">✦ The · Many · Traditions</p>
        <p className="tradition-deck-sub">
          Seven languages. One soul. Click any card to hear that tradition speak — or weave the Confluence to hear them all at once.
        </p>
      </div>

      <div className="tradition-grid">
        {TRADITIONS.map((t) => {
          const sig = signatures[t.id]
          if (!sig || sig.error) return null
          return (
            <TraditionCard
              key={t.id}
              tradition={t}
              signature={sig}
              profile={profile}
              reading={readings[t.id]}
              loading={loading[t.id]}
              error={errors[t.id]}
              onRead={() => readTradition(t)}
            />
          )
        })}
      </div>

      <div className="confluence-zone">
        {!confluence && (
          <button
            className="confluence-btn"
            onClick={weaveConfluence}
            disabled={confluenceLoading || readCount < 1}
          >
            {confluenceLoading ? 'weaving…' : '✦ Weave the Confluence ✦'}
          </button>
        )}
        {confluenceError && <div className="error">{confluenceError}</div>}

        {confluence && (
          <div className="confluence">
            <div className="confluence-mark">✦ The Confluence ✦</div>
            <h3 className="confluence-archetype">{confluence.archetype}</h3>
            <p className="confluence-narrative">{confluence.narrative}</p>

            <div className="confluence-grid">
              <div className="confluence-block">
                <div className="confluence-block-label">Where they agree</div>
                <p>{confluence.agreements}</p>
              </div>
              <div className="confluence-block">
                <div className="confluence-block-label">Where they differ</div>
                <p>{confluence.tensions}</p>
              </div>
              <div className="confluence-block">
                <div className="confluence-block-label">Blind spots</div>
                <p>{confluence.blindSpots}</p>
              </div>
              <div className="confluence-block">
                <div className="confluence-block-label">Path of liberation</div>
                <p>{confluence.liberation}</p>
              </div>
            </div>

            <div className="confluence-affirmation">"{confluence.affirmation}"</div>
          </div>
        )}
      </div>
    </div>
  )
}
