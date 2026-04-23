// Western Sun Sign — tropical zodiac, date-only.
// This is Sun position only; a full natal chart (Moon, Rising, houses,
// aspects) requires exact birth time + location and belongs in Phase 3.

const SIGNS = [
  { name: 'Capricorn',   glyph: '♑', element: 'Earth', modality: 'Cardinal', ruler: 'Saturn',   start: [12, 22], end: [1, 19],  meaning: 'the ambitious builder, the mountain climbed slowly' },
  { name: 'Aquarius',    glyph: '♒', element: 'Air',   modality: 'Fixed',    ruler: 'Uranus',   start: [1, 20],  end: [2, 18],  meaning: 'the visionary outsider, the current of change' },
  { name: 'Pisces',      glyph: '♓', element: 'Water', modality: 'Mutable',  ruler: 'Neptune',  start: [2, 19],  end: [3, 20],  meaning: 'the oceanic mystic, empathy without shore' },
  { name: 'Aries',       glyph: '♈', element: 'Fire',  modality: 'Cardinal', ruler: 'Mars',     start: [3, 21],  end: [4, 19],  meaning: 'the initiator, the first spark, the charge' },
  { name: 'Taurus',      glyph: '♉', element: 'Earth', modality: 'Fixed',    ruler: 'Venus',    start: [4, 20],  end: [5, 20],  meaning: 'the sensualist, the slow ripening, the root' },
  { name: 'Gemini',      glyph: '♊', element: 'Air',   modality: 'Mutable',  ruler: 'Mercury',  start: [5, 21],  end: [6, 20],  meaning: 'the messenger, dual-minded, the connector' },
  { name: 'Cancer',      glyph: '♋', element: 'Water', modality: 'Cardinal', ruler: 'Moon',     start: [6, 21],  end: [7, 22],  meaning: 'the tender protector, home as a sacred geometry' },
  { name: 'Leo',         glyph: '♌', element: 'Fire',  modality: 'Fixed',    ruler: 'Sun',      start: [7, 23],  end: [8, 22],  meaning: 'the sovereign heart, radiance as gift' },
  { name: 'Virgo',       glyph: '♍', element: 'Earth', modality: 'Mutable',  ruler: 'Mercury',  start: [8, 23],  end: [9, 22],  meaning: 'the servant craftsman, the refined discernment' },
  { name: 'Libra',       glyph: '♎', element: 'Air',   modality: 'Cardinal', ruler: 'Venus',    start: [9, 23],  end: [10, 22], meaning: 'the harmonizer, the balance-scale, the relator' },
  { name: 'Scorpio',     glyph: '♏', element: 'Water', modality: 'Fixed',    ruler: 'Pluto',    start: [10, 23], end: [11, 21], meaning: 'the alchemist, transformation by descent, the depth-seer' },
  { name: 'Sagittarius', glyph: '♐', element: 'Fire',  modality: 'Mutable',  ruler: 'Jupiter',  start: [11, 22], end: [12, 21], meaning: 'the seeker-archer, vision flung toward horizon' }
]

const inRange = (m, d, start, end) => {
  const [sM, sD] = start, [eM, eD] = end
  if (sM > eM) return (m === sM && d >= sD) || (m === eM && d <= eD) || m === 1 && sM === 12 && d <= eD
  return (m === sM && d >= sD) || (m === eM && d <= eD) || (m > sM && m < eM)
}

export const western = {
  id: 'western',
  label: 'Western Sun',
  tagline: 'Tropical Sun sign (partial — full chart needs birth time + place)',
  requires: ['birthdate'],

  compute({ birthdate }) {
    const [, m, d] = birthdate.split('-').map(Number)
    let sign = SIGNS[0]
    let idx = 0
    for (let i = 0; i < SIGNS.length; i++) {
      if (inRange(m, d, SIGNS[i].start, SIGNS[i].end)) { sign = SIGNS[i]; idx = i; break }
    }
    return {
      signature: `${sign.glyph} ${sign.name}`,
      english: `Sun in ${sign.name}`,
      breakdown: `Date ${m}/${d} · Sun in ${sign.name} · ${sign.element} · ${sign.modality} · ruled by ${sign.ruler}`,
      essence: sign.meaning,
      keyNumbers: [idx + 1],
      sign,
      partial: true
    }
  },

  sourceNote: 'Sun sign only. Moon, Rising (Ascendant), houses, and aspects require exact birth time and location — handled in a future Natal Chart module.'
}
