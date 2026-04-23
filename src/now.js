// "Now" — temporal read of today, across traditions.
// Pure computation; imported by NowPanel.

import { mayan } from './traditions/mayan.js'
import { chinese } from './traditions/chinese.js'
import { celtic } from './traditions/celtic.js'
import { western } from './traditions/western.js'
import { tarot } from './traditions/tarot.js'

const isoToday = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Moon phase — astronomical approximation (±1 day over a century).
// Reference new moon: 2000-01-06 18:14 UTC, synodic month 29.530588853 days.
const SYNODIC = 29.530588853
const REF_NEW_MOON_JD = 2451550.09765

const julianDay = (date) => (date.getTime() / 86400000) + 2440587.5

const PHASES = [
  { t: 0.00, name: 'New Moon',        glyph: '○', essence: 'seed, intention, the dark fertile' },
  { t: 0.03, name: 'Waxing Crescent', glyph: '☽', essence: 'emerging, first light, faith' },
  { t: 0.22, name: 'First Quarter',   glyph: '◐', essence: 'decision, action, friction' },
  { t: 0.28, name: 'Waxing Gibbous',  glyph: '◔', essence: 'refinement, pressure of growth' },
  { t: 0.47, name: 'Full Moon',       glyph: '●', essence: 'illumination, revelation, fullness' },
  { t: 0.53, name: 'Waning Gibbous',  glyph: '◕', essence: 'gratitude, sharing, digesting' },
  { t: 0.72, name: 'Last Quarter',    glyph: '◑', essence: 'release, forgiveness, reckoning' },
  { t: 0.78, name: 'Waning Crescent', glyph: '☾', essence: 'rest, surrender, the inner hush' }
]

export const moonPhase = (date = new Date()) => {
  const daysSinceRef = julianDay(date) - REF_NEW_MOON_JD
  const phase = ((daysSinceRef % SYNODIC) + SYNODIC) % SYNODIC
  const t = phase / SYNODIC   // 0 at new, 0.5 at full
  let current = PHASES[0]
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (t >= PHASES[i].t) { current = PHASES[i]; break }
  }
  // Illumination: 0 at new, 1 at full, using cosine approximation.
  const illumination = (1 - Math.cos(t * 2 * Math.PI)) / 2
  return {
    ...current,
    age: phase,                     // days since last new moon
    illumination: Math.round(illumination * 100)
  }
}

// Compute today's signatures across date-only traditions.
export const computeNow = () => {
  const date = isoToday()
  const now = {
    date,
    dateLabel: new Date().toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }),
    moon: moonPhase(),
    mayan:   mayan.compute({ birthdate: date }),
    chinese: chinese.compute({ birthdate: date }),
    celtic:  celtic.compute({ birthdate: date }),
    western: western.compute({ birthdate: date }),
    tarot:   tarot.compute({ birthdate: date })
  }
  return now
}

// Numerology reduction (mirrors App.jsx's dailyNumber for consistency).
export const todaysNumerologyDigitSum = () => {
  const d = new Date()
  const sumDigits = (n) => {
    let s = 0, x = Math.abs(Math.floor(n))
    while (x > 0) { s += x % 10; x = Math.floor(x / 10) }
    return s
  }
  return sumDigits(d.getDate()) + sumDigits(d.getMonth() + 1) + sumDigits(d.getFullYear())
}

// Personal Now — requires a computed numerology profile.
// Returns the per-user view of "today" layered on top of the universal view.
export const computePersonalNow = (profile) => {
  if (!profile) return null
  return {
    personalYear: profile.personalYear,
    // If the user has a Tarot year card in their profile, surface it;
    // the tarot tradition module already computes it from birthdate + current year.
    tarotYearCard: tarot.compute({
      birthdate: profile.inputs.birthdate,
      currentYear: new Date().getFullYear()
    }).year,
    // Days until the user's next birthday as a "cycle phase" indicator
    cycleDaysUntilBirthday: daysUntilNextBirthday(profile.inputs.birthdate)
  }
}

const daysUntilNextBirthday = (birthdate) => {
  const [, m, d] = birthdate.split('-').map(Number)
  const today = new Date()
  const y = today.getFullYear()
  const next = new Date(y, m - 1, d)
  if (next < today) next.setFullYear(y + 1)
  return Math.round((next - today) / 86400000)
}
