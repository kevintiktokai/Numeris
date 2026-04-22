// Numerology engine — Pythagorean + Chaldean systems.
// Pure calculation; no UI, no API calls. Deterministic and verifiable.

export const SYSTEMS = ['pythagorean', 'chaldean']

// Pythagorean: A=1, B=2, ..., I=9, J=1, K=2, ..., S=1, T=2, ..., Z=8
const PYTHAGOREAN = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8
}

// Chaldean: 1–8 only (9 is sacred and appears only as a final sum).
// Mapping derived from ancient tradition.
const CHALDEAN = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8
}

// Modern numerology treats Y as a vowel. We use that convention.
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y'])

export const MASTER_NUMBERS = new Set([11, 22, 33])
export const KARMIC_DEBT = new Set([13, 14, 16, 19])

// Reduce to single digit, preserving master numbers (11, 22, 33).
export const reduce = (n, allowMaster = true) => {
  let num = Math.abs(Math.floor(n))
  const trail = [num]
  while (num > 9 && !(allowMaster && MASTER_NUMBERS.has(num))) {
    let sum = 0
    while (num > 0) { sum += num % 10; num = Math.floor(num / 10) }
    num = sum
    trail.push(num)
  }
  return { value: num, isMaster: MASTER_NUMBERS.has(num), trail }
}

const sumDigits = (n) => {
  let s = 0, x = Math.abs(Math.floor(n))
  while (x > 0) { s += x % 10; x = Math.floor(x / 10) }
  return s
}

const letterValue = (ch, system) => {
  const table = system === 'chaldean' ? CHALDEAN : PYTHAGOREAN
  return table[ch.toUpperCase()] ?? 0
}

const lettersOnly = (name) => (name || '').toUpperCase().replace(/[^A-Z]/g, '')

// ───────────────────────────────────────────────────────────────────────
// Core number calculations
// Each returns: { value, reduced, isMaster, trail, breakdown }
// - value: the raw sum before any reduction
// - reduced: final reduced digit (or master number preserved)
// - trail: [raw, intermediate, ..., reduced] for transparency
// - breakdown: a human-readable explanation of the calculation
// ───────────────────────────────────────────────────────────────────────

const pack = (raw, reducedObj, breakdown) => ({
  raw,
  value: reducedObj.value,
  isMaster: reducedObj.isMaster,
  trail: reducedObj.trail,
  karmicDebt: KARMIC_DEBT.has(raw),
  breakdown
})

export const lifePathFromDate = (dateStr) => {
  // dateStr = "YYYY-MM-DD"
  const [y, m, d] = dateStr.split('-').map(Number)
  const monthR = reduce(m)
  const dayR = reduce(d)
  const yearR = reduce(y)
  const raw = monthR.value + dayR.value + yearR.value
  const final = reduce(raw)
  const breakdown = `Month ${m} → ${monthR.value}, Day ${d} → ${dayR.value}, Year ${y} → ${yearR.value}. Sum ${raw} → ${final.value}${final.isMaster ? ' (master)' : ''}.`
  return pack(raw, final, breakdown)
}

export const birthdayNumber = (dateStr) => {
  const d = Number(dateStr.split('-')[2])
  const final = reduce(d)
  return pack(d, final, `Day of month: ${d} → ${final.value}${final.isMaster ? ' (master)' : ''}.`)
}

export const expressionFromName = (name, system) => {
  const letters = lettersOnly(name)
  const values = [...letters].map((c) => letterValue(c, system))
  const raw = values.reduce((a, b) => a + b, 0)
  const final = reduce(raw)
  const breakdown = `${letters.length} letters → sum ${raw} → ${final.value}${final.isMaster ? ' (master)' : ''} [${system}].`
  return pack(raw, final, breakdown)
}

export const soulUrgeFromName = (name, system) => {
  const letters = lettersOnly(name)
  const vowelLetters = [...letters].filter((c) => VOWELS.has(c))
  const values = vowelLetters.map((c) => letterValue(c, system))
  const raw = values.reduce((a, b) => a + b, 0)
  const final = reduce(raw)
  const breakdown = `Vowels (${vowelLetters.length}): sum ${raw} → ${final.value}${final.isMaster ? ' (master)' : ''} [${system}].`
  return pack(raw, final, breakdown)
}

export const personalityFromName = (name, system) => {
  const letters = lettersOnly(name)
  const consonantLetters = [...letters].filter((c) => !VOWELS.has(c))
  const values = consonantLetters.map((c) => letterValue(c, system))
  const raw = values.reduce((a, b) => a + b, 0)
  const final = reduce(raw)
  const breakdown = `Consonants (${consonantLetters.length}): sum ${raw} → ${final.value}${final.isMaster ? ' (master)' : ''} [${system}].`
  return pack(raw, final, breakdown)
}

export const personalYear = (dateStr, currentYear) => {
  const [, m, d] = dateStr.split('-').map(Number)
  const raw = sumDigits(m) + sumDigits(d) + sumDigits(currentYear)
  const final = reduce(raw)
  return pack(raw, final, `Month ${m} + Day ${d} + Year ${currentYear}: ${sumDigits(m)} + ${sumDigits(d)} + ${sumDigits(currentYear)} = ${raw} → ${final.value}${final.isMaster ? ' (master)' : ''}.`)
}

// Maturity = Life Path + Expression, reduced.
export const maturityNumber = (lifePath, expression) => {
  const raw = lifePath.value + expression.value
  const final = reduce(raw)
  return pack(raw, final, `Life Path ${lifePath.value} + Expression ${expression.value} = ${raw} → ${final.value}${final.isMaster ? ' (master)' : ''}.`)
}

// Compute the full profile.
// Returns: { inputs, system, lifePath, birthday, expression, soulUrge, personality, personalYear, maturity, vector }
export const computeProfile = ({ name, birthdate, system = 'pythagorean', currentYear }) => {
  if (!name || !birthdate) throw new Error('Both name and birthdate are required')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) throw new Error('Birthdate must be YYYY-MM-DD')
  const yr = currentYear ?? new Date().getFullYear()

  const lifePath = lifePathFromDate(birthdate)
  const birthday = birthdayNumber(birthdate)
  const expression = expressionFromName(name, system)
  const soulUrge = soulUrgeFromName(name, system)
  const personality = personalityFromName(name, system)
  const py = personalYear(birthdate, yr)
  const maturity = maturityNumber(lifePath, expression)

  const vector = [
    lifePath.value,
    expression.value,
    soulUrge.value,
    personality.value,
    birthday.value,
    py.value
  ]

  return {
    inputs: { name, birthdate, system, currentYear: yr },
    lifePath,
    birthday,
    expression,
    soulUrge,
    personality,
    personalYear: py,
    maturity,
    vector
  }
}

// ───────────────────────────────────────────────────────────────────────
// Compatibility
// Traditional compatibility axes: Life Path, Expression, Soul Urge.
// Score uses cyclic distance on 1–9 (master numbers reduced for scoring).
// ───────────────────────────────────────────────────────────────────────

// Classical Pythagorean compatibility groupings (condensed tradition):
// Naturally harmonious triads: 1-5-7, 2-4-8, 3-6-9
// 1 also resonates with 3, 9. 5 with 1, 7. Etc.
const HARMONIC_GROUPS = [
  new Set([1, 5, 7]),
  new Set([2, 4, 8]),
  new Set([3, 6, 9])
]

const toSingleDigit = (n) => {
  let x = n
  while (x > 9) x = sumDigits(x)
  return x
}

const pairHarmony = (a, b) => {
  const ra = toSingleDigit(a)
  const rb = toSingleDigit(b)
  if (ra === rb) return 1.0
  for (const g of HARMONIC_GROUPS) {
    if (g.has(ra) && g.has(rb)) return 0.85
  }
  // soft neighbors: 1-2, 2-3, etc. get a modest score
  const diff = Math.min(Math.abs(ra - rb), 9 - Math.abs(ra - rb))
  return Math.max(0.25, 1 - diff / 5) * 0.7
}

export const computeCompatibility = (profileA, profileB) => {
  const axes = [
    { key: 'lifePath', label: 'Life Path', a: profileA.lifePath.value, b: profileB.lifePath.value },
    { key: 'expression', label: 'Expression', a: profileA.expression.value, b: profileB.expression.value },
    { key: 'soulUrge', label: 'Soul Urge', a: profileA.soulUrge.value, b: profileB.soulUrge.value }
  ].map((ax) => ({ ...ax, harmony: pairHarmony(ax.a, ax.b) }))

  // Weighted: Life Path 0.5, Expression 0.3, Soul Urge 0.2
  const weighted = axes[0].harmony * 0.5 + axes[1].harmony * 0.3 + axes[2].harmony * 0.2
  const score = Math.round(weighted * 100)

  const mergedVector = [...profileA.vector, ...profileB.vector]

  return { axes, score, mergedVector }
}

// ───────────────────────────────────────────────────────────────────────
// Display helpers
// ───────────────────────────────────────────────────────────────────────

export const CORE_LABELS = {
  lifePath: { label: 'Life Path', blurb: 'The central arc of your life' },
  expression: { label: 'Expression', blurb: 'What you are here to build' },
  soulUrge: { label: 'Soul Urge', blurb: 'Inner motivation, what you want' },
  personality: { label: 'Personality', blurb: 'How others experience you' },
  birthday: { label: 'Birthday', blurb: 'A specific gift you carry' },
  personalYear: { label: 'Personal Year', blurb: "This year's energy for you" },
  maturity: { label: 'Maturity', blurb: 'What emerges after 35' }
}

export const CORE_KEYS = ['lifePath', 'expression', 'soulUrge', 'personality', 'birthday', 'personalYear']
