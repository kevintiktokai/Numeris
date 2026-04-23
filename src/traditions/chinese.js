// Chinese Zodiac — year pillar of Bazi.
// Uses the solar boundary Li Chun (~Feb 4) rather than Lunar New Year —
// this matches the Bazi / Four Pillars astrological convention.
// Year determines: Animal (earthly branch), Element (heavenly stem), Yin/Yang.

const ANIMALS = [
  { name: 'Rat',     branch: 'Zi',   meaning: 'quick-witted, resourceful, adaptable' },
  { name: 'Ox',      branch: 'Chou', meaning: 'steadfast, patient, dependable' },
  { name: 'Tiger',   branch: 'Yin',  meaning: 'courageous, charismatic, impulsive' },
  { name: 'Rabbit',  branch: 'Mao',  meaning: 'gentle, elegant, diplomatic' },
  { name: 'Dragon',  branch: 'Chen', meaning: 'visionary, commanding, unstoppable' },
  { name: 'Snake',   branch: 'Si',   meaning: 'insightful, refined, mysterious' },
  { name: 'Horse',   branch: 'Wu',   meaning: 'free-spirited, energetic, forthright' },
  { name: 'Goat',    branch: 'Wei',  meaning: 'artistic, tender-hearted, contemplative' },
  { name: 'Monkey',  branch: 'Shen', meaning: 'clever, playful, inventive' },
  { name: 'Rooster', branch: 'You',  meaning: 'observant, proud, precise' },
  { name: 'Dog',     branch: 'Xu',   meaning: 'loyal, principled, watchful' },
  { name: 'Pig',     branch: 'Hai',  meaning: 'generous, sincere, pleasure-loving' }
]

const STEMS = [
  { name: 'Jia',  element: 'Wood',  polarity: 'yang', aspect: 'tall tree, pioneer' },
  { name: 'Yi',   element: 'Wood',  polarity: 'yin',  aspect: 'soft plant, adaptive grower' },
  { name: 'Bing', element: 'Fire',  polarity: 'yang', aspect: 'sun fire, radiant passion' },
  { name: 'Ding', element: 'Fire',  polarity: 'yin',  aspect: 'candle fire, focused warmth' },
  { name: 'Wu',   element: 'Earth', polarity: 'yang', aspect: 'mountain earth, immovable' },
  { name: 'Ji',   element: 'Earth', polarity: 'yin',  aspect: 'field earth, nurturing soil' },
  { name: 'Geng', element: 'Metal', polarity: 'yang', aspect: 'sword metal, decisive edge' },
  { name: 'Xin',  element: 'Metal', polarity: 'yin',  aspect: 'jewel metal, refined beauty' },
  { name: 'Ren',  element: 'Water', polarity: 'yang', aspect: 'ocean water, vast depth' },
  { name: 'Gui',  element: 'Water', polarity: 'yin',  aspect: 'rain water, quiet seeping' }
]

// Effective year for Bazi: before Feb 4 → previous year.
const effectiveYear = (birthdate) => {
  const [y, m, d] = birthdate.split('-').map(Number)
  if (m < 2 || (m === 2 && d < 4)) return y - 1
  return y
}

export const chinese = {
  id: 'chinese',
  label: 'Chinese Zodiac',
  tagline: 'Year Pillar · Animal × Element × Polarity',
  requires: ['birthdate'],

  compute({ birthdate }) {
    const yr = effectiveYear(birthdate)
    // 1984 is Jia Zi — Yang Wood Rat — start of the 60-year sexagenary cycle.
    const stemIndex = ((yr - 1984) % 10 + 10) % 10
    const branchIndex = ((yr - 1984) % 12 + 12) % 12
    const animal = ANIMALS[branchIndex]
    const stem = STEMS[stemIndex]
    return {
      signature: `${stem.polarity === 'yang' ? 'Yang' : 'Yin'} ${stem.element} ${animal.name}`,
      english: `${stem.element} ${animal.name}`,
      breakdown: `Effective year ${yr} (Li Chun Feb 4 boundary) · stem ${stem.name} (${stem.element}, ${stem.polarity}) · branch ${animal.branch} (${animal.name})`,
      essence: `${stem.aspect} meeting the ${animal.name.toLowerCase()} — ${animal.meaning}`,
      keyNumbers: [branchIndex + 1, stemIndex + 1],
      animal,
      stem,
      yearPillar: `${stem.name} ${animal.branch}`
    }
  },

  sourceNote: 'Bazi solar convention: year pillar changes at Li Chun (~Feb 4), not Lunar New Year. Five-element stem pairs from the 10 Heavenly Stems.'
}
