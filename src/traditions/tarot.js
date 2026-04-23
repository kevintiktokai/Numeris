// Personal Tarot — Life Path, Soul, and Year cards.
// Method from Mary K. Greer and Angeles Arrien — sum birth date digits,
// reduce while > 22, map to Major Arcana (0–21).

const MAJOR_ARCANA = [
  { n: 0,  name: 'The Fool',             meaning: 'beginner\'s mind, the leap, trust' },
  { n: 1,  name: 'The Magician',         meaning: 'focused will, tools in hand, activation' },
  { n: 2,  name: 'The High Priestess',   meaning: 'inner knowing, the veil, receptive wisdom' },
  { n: 3,  name: 'The Empress',          meaning: 'fertility, abundance, sensual creativity' },
  { n: 4,  name: 'The Emperor',          meaning: 'structure, authority, sovereign law' },
  { n: 5,  name: 'The Hierophant',       meaning: 'tradition, teaching, the bridge to the sacred' },
  { n: 6,  name: 'The Lovers',           meaning: 'union, meaningful choice, integration' },
  { n: 7,  name: 'The Chariot',          meaning: 'willful direction, opposing forces harnessed' },
  { n: 8,  name: 'Strength',             meaning: 'inner courage, gentle mastery of the beast' },
  { n: 9,  name: 'The Hermit',           meaning: 'solitary search, inner lantern, the wise elder' },
  { n: 10, name: 'Wheel of Fortune',     meaning: 'cycles, sudden turns, destiny\'s revolution' },
  { n: 11, name: 'Justice',              meaning: 'karmic balance, clear discernment, truth' },
  { n: 12, name: 'The Hanged Man',       meaning: 'surrender, inverted perspective, sacred pause' },
  { n: 13, name: 'Death',                meaning: 'ending that transforms, necessary release' },
  { n: 14, name: 'Temperance',           meaning: 'alchemical blending, the middle way' },
  { n: 15, name: 'The Devil',            meaning: 'bondage chosen, shadow contracts, confronting shadow' },
  { n: 16, name: 'The Tower',            meaning: 'sudden liberation through rupture, false structures fall' },
  { n: 17, name: 'The Star',             meaning: 'hope after storm, guidance, soul replenished' },
  { n: 18, name: 'The Moon',             meaning: 'illusion and intuition, the dreamtime, hidden work' },
  { n: 19, name: 'The Sun',              meaning: 'joy, clarity, the radiant child' },
  { n: 20, name: 'Judgement',            meaning: 'calling, awakening, the trumpet heard' },
  { n: 21, name: 'The World',            meaning: 'completion, integration, cosmic dance' }
]

const reduceTo22 = (n) => {
  let x = Math.abs(n)
  while (x > 22) {
    let s = 0, y = x
    while (y > 0) { s += y % 10; y = Math.floor(y / 10) }
    x = s
  }
  return x === 22 ? 0 : x  // 22 reduces to The Fool (0)
}

export const tarot = {
  id: 'tarot',
  label: 'Personal Tarot',
  tagline: 'Life Path · Soul · Year cards from the Major Arcana',
  requires: ['birthdate'],

  compute({ birthdate, currentYear }) {
    const [y, m, d] = birthdate.split('-').map(Number)
    const yr = currentYear ?? new Date().getFullYear()
    const digitSum = (n) => {
      let s = 0, x = Math.abs(n)
      while (x > 0) { s += x % 10; x = Math.floor(x / 10) }
      return s
    }
    // Life Path: sum all birth date digits
    const lifeRaw = digitSum(y) + digitSum(m) + digitSum(d)
    const lifeCardN = reduceTo22(lifeRaw)
    // Soul Card: further reduction of Life Path if > 9
    const soulCardN = lifeCardN > 9 ? reduceTo22(digitSum(lifeCardN)) : lifeCardN
    // Year Card: birth month + day + current year
    const yearRaw = digitSum(m) + digitSum(d) + digitSum(yr)
    const yearCardN = reduceTo22(yearRaw)

    const life = MAJOR_ARCANA[lifeCardN]
    const soul = MAJOR_ARCANA[soulCardN]
    const year = MAJOR_ARCANA[yearCardN]

    return {
      signature: life.name,
      english: `${life.name} (life) · ${soul.name} (soul) · ${year.name} (${yr})`,
      breakdown: `Birth digits sum ${lifeRaw} → ${lifeCardN} = ${life.name}. Soul lineage card ${soul.name}. ${yr}'s year card ${year.name}.`,
      essence: life.meaning,
      keyNumbers: [lifeCardN, soulCardN, yearCardN],
      life,
      soul,
      year
    }
  },

  sourceNote: 'Mary K. Greer / Angeles Arrien method. Reduces birthdate digits to 0–21 (Major Arcana). 22 returns to The Fool.'
}
