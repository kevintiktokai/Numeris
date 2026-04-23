// Nine Star Ki — Japanese feng-shui system, derived from the Lo Shu magic square.
// Principal star from birth year (solar — Feb 4 boundary like Bazi).
// Formula: for years before 2000, sum last two digits of year, reduce to
// one digit, subtract from 11 (with 11-1=10 wrapping to 1). After 2000
// use 10 - (sum of last two digits reduced).

const STARS = [
  { n: 1, name: 'Water',         element: 'Water', direction: 'North',      aspect: 'adaptive, deep, philosophical' },
  { n: 2, name: 'Soil',          element: 'Earth', direction: 'Southwest',  aspect: 'nurturing, social, receptive' },
  { n: 3, name: 'Tree',          element: 'Wood',  direction: 'East',       aspect: 'energetic, pioneering, expressive' },
  { n: 4, name: 'Wind',          element: 'Wood',  direction: 'Southeast',  aspect: 'communicative, harmonizing, travel-oriented' },
  { n: 5, name: 'Center Earth',  element: 'Earth', direction: 'Center',     aspect: 'magnetic, destined, fated axis' },
  { n: 6, name: 'Heaven',        element: 'Metal', direction: 'Northwest',  aspect: 'authoritative, principled, leader' },
  { n: 7, name: 'Lake',          element: 'Metal', direction: 'West',       aspect: 'joyful, eloquent, delighting' },
  { n: 8, name: 'Mountain',      element: 'Earth', direction: 'Northeast',  aspect: 'still, wise, reflective' },
  { n: 9, name: 'Fire',          element: 'Fire',  direction: 'South',      aspect: 'brilliant, visible, inspiring' }
]

const MONTH_STARS = {
  // Principal star → month-star offset table (simplified: for each principal
  // star, the month ruler cycles through the Lo Shu in reverse).
  // Months here use Chinese solar month boundaries (~4th-8th of each Gregorian month).
  // This is the traditional Character star.
}

const reduceToSingle = (n) => {
  let x = n
  while (x > 9) {
    let s = 0, y = x
    while (y > 0) { s += y % 10; y = Math.floor(y / 10) }
    x = s
  }
  return x
}

const principalFromYear = (yr) => {
  const lastTwo = yr % 100
  const s = reduceToSingle(Math.floor(lastTwo / 10) + (lastTwo % 10))
  // Pre-2000 Gregorian: 10 - s (1-9 range); 2000+: 9 - s (with 0 → 9)
  let principal
  if (yr < 2000) {
    principal = 11 - s
    if (principal > 9) principal -= 9
  } else {
    principal = 10 - s
    if (principal < 1) principal += 9
  }
  return principal
}

export const nineStarKi = {
  id: 'nineStarKi',
  label: 'Nine Star Ki',
  tagline: 'Japanese feng-shui star from the Lo Shu square',
  requires: ['birthdate'],

  compute({ birthdate }) {
    const [y, m, d] = birthdate.split('-').map(Number)
    const effectiveYr = (m < 2 || (m === 2 && d < 4)) ? y - 1 : y
    const principalN = principalFromYear(effectiveYr)
    const star = STARS[principalN - 1]
    // Character star: a simplified monthly offset (approximate, for symbolic use)
    const monthStar = STARS[((principalN + m) % 9)] // heuristic; traditional tables vary
    return {
      signature: `${star.n} ${star.name}`,
      english: `${star.n} ${star.name} (${star.element})`,
      breakdown: `Effective year ${effectiveYr} → principal star ${star.n} ${star.name}, seated in ${star.direction}`,
      essence: star.aspect,
      keyNumbers: [star.n, monthStar.n],
      principal: star,
      character: monthStar
    }
  },

  sourceNote: 'Principal (birth) star derived from the Lo Shu magic square. The character/monthly star shown is a simplified approximation — full Nine Star Ki uses traditional month tables based on solar terms.'
}
