// Natal chart — Tier-2 tradition.
// Requires: birthdate + birth time + latitude + longitude + timezone offset (hours).
// Uses astronomy-engine for planetary positions.
// Houses: Whole Sign (simplest + ancient — rising sign is 1st house, each next
// sign is next house). Can add Placidus later.

import * as Astronomy from 'astronomy-engine'

// ───────────────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────────────

export const SIGNS = [
  { name: 'Aries',       glyph: '♈', element: 'Fire',  modality: 'Cardinal', ruler: 'Mars' },
  { name: 'Taurus',      glyph: '♉', element: 'Earth', modality: 'Fixed',    ruler: 'Venus' },
  { name: 'Gemini',      glyph: '♊', element: 'Air',   modality: 'Mutable',  ruler: 'Mercury' },
  { name: 'Cancer',      glyph: '♋', element: 'Water', modality: 'Cardinal', ruler: 'Moon' },
  { name: 'Leo',         glyph: '♌', element: 'Fire',  modality: 'Fixed',    ruler: 'Sun' },
  { name: 'Virgo',       glyph: '♍', element: 'Earth', modality: 'Mutable',  ruler: 'Mercury' },
  { name: 'Libra',       glyph: '♎', element: 'Air',   modality: 'Cardinal', ruler: 'Venus' },
  { name: 'Scorpio',     glyph: '♏', element: 'Water', modality: 'Fixed',    ruler: 'Pluto' },
  { name: 'Sagittarius', glyph: '♐', element: 'Fire',  modality: 'Mutable',  ruler: 'Jupiter' },
  { name: 'Capricorn',   glyph: '♑', element: 'Earth', modality: 'Cardinal', ruler: 'Saturn' },
  { name: 'Aquarius',    glyph: '♒', element: 'Air',   modality: 'Fixed',    ruler: 'Uranus' },
  { name: 'Pisces',      glyph: '♓', element: 'Water', modality: 'Mutable',  ruler: 'Neptune' }
]

export const PLANETS = [
  { key: 'Sun',     glyph: '☉', body: Astronomy.Body.Sun,     meaning: 'core self, vitality, ego' },
  { key: 'Moon',    glyph: '☽', body: Astronomy.Body.Moon,    meaning: 'emotions, inner self, needs' },
  { key: 'Mercury', glyph: '☿', body: Astronomy.Body.Mercury, meaning: 'mind, speech, learning' },
  { key: 'Venus',   glyph: '♀', body: Astronomy.Body.Venus,   meaning: 'love, values, beauty, attraction' },
  { key: 'Mars',    glyph: '♂', body: Astronomy.Body.Mars,    meaning: 'will, drive, assertion' },
  { key: 'Jupiter', glyph: '♃', body: Astronomy.Body.Jupiter, meaning: 'expansion, faith, philosophy' },
  { key: 'Saturn',  glyph: '♄', body: Astronomy.Body.Saturn,  meaning: 'discipline, structure, karma' },
  { key: 'Uranus',  glyph: '♅', body: Astronomy.Body.Uranus,  meaning: 'awakening, rebellion, liberation' },
  { key: 'Neptune', glyph: '♆', body: Astronomy.Body.Neptune, meaning: 'dreams, mystery, dissolution' },
  { key: 'Pluto',   glyph: '♇', body: Astronomy.Body.Pluto,   meaning: 'depths, transformation, shadow' }
]

export const ASPECTS = [
  { name: 'Conjunction', angle:   0, orb: 8, symbol: '☌', nature: 'unifying' },
  { name: 'Sextile',     angle:  60, orb: 5, symbol: '⚹', nature: 'opportunity' },
  { name: 'Square',      angle:  90, orb: 7, symbol: '□', nature: 'tension' },
  { name: 'Trine',       angle: 120, orb: 7, symbol: '△', nature: 'flowing' },
  { name: 'Opposition',  angle: 180, orb: 8, symbol: '☍', nature: 'polarizing' }
]

const OBLIQUITY_DEG = 23.4392911

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

const norm360 = (d) => ((d % 360) + 360) % 360
const toRad = (d) => d * Math.PI / 180
const toDeg = (r) => r * 180 / Math.PI

export const signFromLongitude = (lon) => {
  const l = norm360(lon)
  const i = Math.floor(l / 30)
  const deg = l - i * 30
  return { ...SIGNS[i], index: i, degree: deg, longitude: l }
}

export const formatDegree = (deg) => {
  const d = Math.floor(deg)
  const m = Math.floor((deg - d) * 60)
  return `${d}°${String(m).padStart(2, '0')}'`
}

// Ascendant from apparent sidereal time + geographic latitude.
// Classical formula: tan λ = -cos(RAMC) / (sin ε · tan φ + cos ε · sin RAMC)
const computeAscendant = (ramcDeg, latDeg) => {
  const ramc = toRad(ramcDeg)
  const lat = toRad(latDeg)
  const obl = toRad(OBLIQUITY_DEG)
  const y = -Math.cos(ramc)
  const x = Math.sin(obl) * Math.tan(lat) + Math.cos(obl) * Math.sin(ramc)
  return norm360(toDeg(Math.atan2(y, x)))
}

// Midheaven (the ecliptic longitude of the meridian).
const computeMidheaven = (ramcDeg) => {
  const ramc = toRad(ramcDeg)
  const obl = toRad(OBLIQUITY_DEG)
  return norm360(toDeg(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(obl))))
}

// Geocentric ecliptic longitude of a body at a given instant.
const bodyLongitude = (body, date) => {
  const vec = Astronomy.GeoVector(body, date, true)
  return norm360(Astronomy.Ecliptic(vec).elon)
}

// Angular difference on a ring (0–180 degrees).
const angularDiff = (a, b) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// ───────────────────────────────────────────────────────────────────────
// Main compute
// Inputs: { birthdate: 'YYYY-MM-DD', birthtime: 'HH:MM', lat, lon, tz }
//   tz is hours east of UTC (e.g. -8 for PST, +5.5 for IST)
// Returns: { datetimeUTC, planets[], ascendant, midheaven, houses[], aspects[] }
// ───────────────────────────────────────────────────────────────────────

export const computeNatalChart = ({ birthdate, birthtime, lat, lon, tz }) => {
  if (!birthdate || !birthtime || lat == null || lon == null || tz == null) {
    throw new Error('Natal chart requires birthdate, birthtime, lat, lon, and tz')
  }
  const [y, m, d] = birthdate.split('-').map(Number)
  const [hh, mm] = birthtime.split(':').map(Number)
  // Local time → UTC
  const localMinutes = hh * 60 + mm
  const utcMinutes = localMinutes - tz * 60
  const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  date.setUTCMinutes(utcMinutes)

  // Sidereal time
  const gstHours = Astronomy.SiderealTime(date)           // hours
  const lstHours = ((gstHours + lon / 15) % 24 + 24) % 24 // local sidereal time in hours
  const ramcDeg  = lstHours * 15

  const ascendant = computeAscendant(ramcDeg, lat)
  const midheaven = computeMidheaven(ramcDeg)

  const planets = PLANETS.map((p) => {
    const longitude = bodyLongitude(p.body, date)
    return { ...p, ...signFromLongitude(longitude) }
  })

  // Whole Sign houses: house I starts at 0° of the sign of the ascendant,
  // then each next sign is the next house.
  const asc = signFromLongitude(ascendant)
  const houses = Array.from({ length: 12 }, (_, i) => {
    const signIndex = (asc.index + i) % 12
    return {
      number: i + 1,
      ...SIGNS[signIndex],
      cuspLongitude: signIndex * 30
    }
  })

  // Assign each planet to a house (which house "contains" its longitude)
  planets.forEach((p) => {
    const housePos = ((p.index - asc.index) % 12 + 12) % 12
    p.house = housePos + 1
  })

  // Aspects — between every pair of planets
  const aspects = []
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const diff = angularDiff(planets[i].longitude, planets[j].longitude)
      for (const a of ASPECTS) {
        if (Math.abs(diff - a.angle) <= a.orb) {
          aspects.push({
            a: planets[i].key,
            b: planets[j].key,
            angle: diff,
            ...a,
            orb: Math.abs(diff - a.angle)
          })
          break
        }
      }
    }
  }

  return {
    datetimeUTC: date.toISOString(),
    ascendant: { ...asc, label: `${asc.glyph} ${asc.name}` },
    midheaven: { ...signFromLongitude(midheaven), label: 'MC' },
    planets,
    houses,
    aspects,
    inputs: { birthdate, birthtime, lat, lon, tz }
  }
}

// Summary sentence used in the deck and passed to the LLM.
export const natalSignature = (chart) => {
  const sun = chart.planets.find((p) => p.key === 'Sun')
  const moon = chart.planets.find((p) => p.key === 'Moon')
  const asc = chart.ascendant
  return `${sun.glyph} ${sun.name} · ${moon.glyph} ${moon.name} · ${asc.glyph} rising`
}

// ───────────────────────────────────────────────────────────────────────
// Tradition-module wrapper (fits the same shape as the Tier-1 traditions).
// ───────────────────────────────────────────────────────────────────────

export const natal = {
  id: 'natal',
  label: 'Natal Chart',
  tagline: 'Western astrology · Sun × Moon × Rising × all planets in houses',
  requires: ['birthdate', 'birthtime', 'lat', 'lon', 'tz'],
  canCompute(inputs) {
    return Boolean(inputs?.birthdate && inputs?.birthtime && inputs?.lat != null && inputs?.lon != null && inputs?.tz != null)
  },
  compute(inputs) {
    const chart = computeNatalChart(inputs)
    const sun = chart.planets.find((p) => p.key === 'Sun')
    const moon = chart.planets.find((p) => p.key === 'Moon')
    return {
      signature: natalSignature(chart),
      english: `Sun in ${sun.name}, Moon in ${moon.name}, ${chart.ascendant.name} rising`,
      breakdown: `Computed for ${inputs.birthdate} ${inputs.birthtime} (tz ${inputs.tz >= 0 ? '+' : ''}${inputs.tz}), lat ${inputs.lat}, lon ${inputs.lon}. ${chart.planets.length} placements, ${chart.aspects.length} major aspects.`,
      essence: `${sun.meaning.split(',')[0]} shaped by ${moon.meaning.split(',')[0]}, presented through ${chart.ascendant.name}`,
      keyNumbers: [sun.index + 1, moon.index + 1, chart.ascendant.index + 1],
      chart
    }
  },
  sourceNote: 'Tropical zodiac, Whole Sign houses (ancient system: rising sign is 1st house, each next sign is next house). Planetary positions via astronomy-engine; geocentric ecliptic longitudes.'
}
