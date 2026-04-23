import { useMemo, useState } from 'react'
import { computeNow, computePersonalNow, todaysNumerologyDigitSum } from './now.js'

const NowPanel = ({ personalProfile, onLoadDailyNumber }) => {
  const [expanded, setExpanded] = useState(false)
  const now = useMemo(() => computeNow(), [])
  const personalNow = useMemo(() => computePersonalNow(personalProfile), [personalProfile])
  const dailyNum = todaysNumerologyDigitSum()

  return (
    <div className={`now-panel ${expanded ? 'expanded' : ''}`}>
      <div className="now-compact" onClick={() => setExpanded((e) => !e)} role="button" aria-expanded={expanded}>
        <div className="now-compact-main">
          <span className="now-compact-label">The Now</span>
          <span className="now-compact-date">{now.dateLabel}</span>
        </div>
        <div className="now-compact-signals">
          <span className="now-chip" title="Today's moon phase">
            <span className="now-chip-glyph">{now.moon.glyph}</span>
            {now.moon.name}
          </span>
          <span className="now-chip" title="Today's Mayan kin">{now.mayan.signature}</span>
          <span className="now-chip" title="Current Chinese year">{now.chinese.english}</span>
          <button
            className="now-chip daily-chip"
            onClick={(e) => { e.stopPropagation(); onLoadDailyNumber?.(dailyNum) }}
            title="Load today's number as a reading"
          >
            ☼ {dailyNum}
          </button>
          <span className="now-toggle">{expanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {expanded && (
        <div className="now-expanded">
          <p className="now-lede">Today read through six languages. Click any to start a reading at that seed.</p>

          <div className="now-grid">
            <NowCard
              label="Moon Phase"
              main={`${now.moon.glyph} ${now.moon.name}`}
              sub={`illumination ${now.moon.illumination}% · ${Math.round(now.moon.age * 10) / 10} days old`}
              essence={now.moon.essence}
            />

            <NowCard
              label="Mayan Kin"
              main={now.mayan.signature}
              sub={now.mayan.english}
              essence={now.mayan.essence}
            />

            <NowCard
              label="Chinese Year"
              main={now.chinese.english}
              sub={now.chinese.signature}
              essence={now.chinese.essence}
            />

            <NowCard
              label="Sun Transit"
              main={now.western.signature}
              sub={`${now.western.sign.element} · ${now.western.sign.modality}`}
              essence={now.western.sign.meaning}
            />

            <NowCard
              label="Celtic Tree"
              main={now.celtic.english}
              sub={now.celtic.ogham}
              essence={now.celtic.essence}
            />

            <NowCard
              label={`${new Date().getFullYear()} Tarot`}
              main={now.tarot.year.name}
              sub="this year's card"
              essence={now.tarot.year.meaning}
            />

            <NowCard
              label="Daily Number"
              main={String(dailyNum)}
              sub="numerological sum"
              essence="click any card's main to seed a full reading"
              onClick={() => onLoadDailyNumber?.(dailyNum)}
            />
          </div>

          {personalNow && (
            <div className="now-personal">
              <div className="now-personal-label">
                ✦ Personal Now · {personalProfile.inputs.name}
              </div>
              <div className="now-personal-grid">
                <div className="now-personal-pill">
                  <span className="now-personal-pill-label">Your Personal Year</span>
                  <span className="now-personal-pill-value">
                    {personalNow.personalYear.value}
                    {personalNow.personalYear.isMaster && <em className="master-tag">master</em>}
                  </span>
                </div>
                <div className="now-personal-pill">
                  <span className="now-personal-pill-label">Your Year Card</span>
                  <span className="now-personal-pill-value">{personalNow.tarotYearCard.name}</span>
                </div>
                <div className="now-personal-pill">
                  <span className="now-personal-pill-label">Next Birthday</span>
                  <span className="now-personal-pill-value">
                    {personalNow.cycleDaysUntilBirthday === 0
                      ? 'today ✦'
                      : `${personalNow.cycleDaysUntilBirthday} days`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const NowCard = ({ label, main, sub, essence, onClick }) => (
  <div className={`now-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
    <div className="now-card-label">{label}</div>
    <div className="now-card-main">{main}</div>
    {sub && <div className="now-card-sub">{sub}</div>}
    {essence && <div className="now-card-essence">{essence}</div>}
  </div>
)

export default NowPanel
