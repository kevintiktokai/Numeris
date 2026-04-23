// Mayan Tzolkin — 260-day sacred calendar.
// 20 day signs × 13 galactic tones = 260 unique "kin".
// Correlation: GMT 584283 (the standard Goodman-Martínez-Thompson constant
// used by most Mayanist scholars for converting Gregorian to Long Count / Tzolkin).

const DAY_SIGNS = [
  { name: 'Imix',      english: 'Alligator / Primordial',   meaning: 'primal waters, origin, nurturance' },
  { name: "Ik'",       english: 'Wind / Breath',            meaning: 'spirit, communication, inspiration' },
  { name: "Ak'b'al",   english: 'Night / House',            meaning: 'inner sanctum, dreams, the hidden' },
  { name: "K'an",      english: 'Seed / Iguana',            meaning: 'potential, ripening, germination' },
  { name: 'Chikchan',  english: 'Serpent',                  meaning: 'vital force, kundalini, instinct' },
  { name: 'Kimi',      english: 'Death / Transformer',      meaning: 'surrender, release, transmutation' },
  { name: "Manik'",    english: 'Deer / Hand',              meaning: 'accomplishment, healing touch' },
  { name: 'Lamat',     english: 'Rabbit / Star',            meaning: 'harmony, abundance, fertility' },
  { name: 'Muluk',     english: 'Water / Moon',             meaning: 'emotion, purification, offering' },
  { name: 'Ok',        english: 'Dog',                      meaning: 'loyalty, heart, guidance of the dead' },
  { name: 'Chuwen',    english: 'Monkey / Artisan',         meaning: 'creativity, play, co-creation' },
  { name: "Eb'",       english: 'Road / Human',             meaning: 'the path walked, destiny laid' },
  { name: "B'en",      english: 'Reed / Corn Stalk',        meaning: 'growth upward, pillar, authority' },
  { name: 'Ix',        english: 'Jaguar',                   meaning: 'shamanic power, magic, night sight' },
  { name: 'Men',       english: 'Eagle',                    meaning: 'vision, flight, the clear view' },
  { name: "Kib'",      english: 'Vulture / Wisdom',         meaning: 'ancestral knowing, cleansing sight' },
  { name: "Kab'an",    english: 'Earth / Incense',          meaning: 'synchronicity, sacred rhythm' },
  { name: "Etz'nab'",  english: 'Flint / Mirror',           meaning: 'truth, reflection, the blade' },
  { name: 'Kawak',     english: 'Storm',                    meaning: 'cleansing, catalyst, thunder' },
  { name: 'Ajaw',      english: 'Lord / Sun',               meaning: 'solar self, enlightenment, sovereignty' }
]

const TONES = [
  { number: 1,  name: 'Magnetic',     meaning: 'unify — the purpose arrives' },
  { number: 2,  name: 'Lunar',        meaning: 'polarize — the challenge is faced' },
  { number: 3,  name: 'Electric',     meaning: 'activate — service is given' },
  { number: 4,  name: 'Self-Existing', meaning: 'define — form is measured' },
  { number: 5,  name: 'Overtone',     meaning: 'empower — radiance commands' },
  { number: 6,  name: 'Rhythmic',     meaning: 'organize — balance is kept' },
  { number: 7,  name: 'Resonant',     meaning: 'channel — inspiration attunes' },
  { number: 8,  name: 'Galactic',     meaning: 'harmonize — integrity models' },
  { number: 9,  name: 'Solar',        meaning: 'pulse — intention is realized' },
  { number: 10, name: 'Planetary',    meaning: 'perfect — the work manifests' },
  { number: 11, name: 'Spectral',     meaning: 'dissolve — release liberates' },
  { number: 12, name: 'Crystal',      meaning: 'dedicate — cooperation crystallizes' },
  { number: 13, name: 'Cosmic',       meaning: 'endure — presence transcends' }
]

// Julian Day Number for a Gregorian date (proleptic Gregorian)
const julianDay = (y, m, d) => {
  const a = Math.floor((14 - m) / 12)
  const year = y + 4800 - a
  const month = m + 12 * a - 3
  return d + Math.floor((153 * month + 2) / 5) + 365 * year +
    Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400) - 32045
}

const GMT_CORRELATION = 584283 // Julian day of Mayan epoch (4 Ajaw 8 Kumk'u)

export const mayan = {
  id: 'mayan',
  label: 'Mayan Tzolkin',
  tagline: 'Sacred 260-day calendar · Day Sign × Galactic Tone',
  requires: ['birthdate'],

  compute({ birthdate }) {
    const [y, m, d] = birthdate.split('-').map(Number)
    const jd = julianDay(y, m, d)
    const daysSinceEpoch = jd - GMT_CORRELATION
    // Offset such that JD 584283 == 4 Ajaw (day sign 19, tone 4)
    const daySignIndex = ((daysSinceEpoch + 19) % 20 + 20) % 20
    const toneIndex = ((daysSinceEpoch + 3) % 13 + 13) % 13 // tone 4 at epoch → idx 3
    const daySign = DAY_SIGNS[daySignIndex]
    const tone = TONES[toneIndex]
    // Kin number: 1–260 position in the cycle
    const kin = ((daysSinceEpoch % 260) + 260) % 260 + 1
    return {
      signature: `${tone.number} ${daySign.name}`,
      english: `${tone.name} ${daySign.english.split(' / ')[0]}`,
      breakdown: `JD ${jd}, kin ${kin} of 260 · tone ${tone.number} (${tone.name}) × day sign ${daySignIndex + 1} (${daySign.name})`,
      essence: `${tone.meaning}, through ${daySign.meaning}`,
      keyNumbers: [tone.number, daySignIndex + 1, kin],
      daySign,
      tone,
      kin
    }
  },

  sourceNote: 'Traditional Tzolkin count (GMT correlation 584283). Kept distinct from the modern Dreamspell variant.'
}
