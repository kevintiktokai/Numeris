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
// Grounded in mainstream Pythagorean tradition (Decoz / Millman / Goodwin
// consensus). The 9×9 matrix encodes each pair's traditional dynamic —
// not a modular heuristic. Axes compared: Life Path, Expression, Soul
// Urge, Birthday. Master numbers are tracked and given intensity bonuses.
// ───────────────────────────────────────────────────────────────────────

// Character capsules for each single-digit number, used in narrative
// pairing descriptions and passed to the oracle for grounded interpretation.
export const NUMBER_CHARACTER = {
  1: 'the leader',
  2: 'the partner',
  3: 'the creative',
  4: 'the builder',
  5: 'the freedom-seeker',
  6: 'the nurturer',
  7: 'the seeker',
  8: 'the authority',
  9: 'the humanitarian'
}

// Symmetric 9×9 compatibility matrix. Values 0–1.
// Rationale (diagonals): identical numbers share vibration but also
// amplify the number's shadow (two 1s both want to lead, two 8s both
// want to command). So same-number is rarely a perfect 1.0.
const COMPATIBILITY_MATRIX = {
  1: { 1: 0.50, 2: 0.55, 3: 0.85, 4: 0.40, 5: 0.85, 6: 0.80, 7: 0.55, 8: 0.40, 9: 0.85 },
  2: { 1: 0.55, 2: 0.90, 3: 0.60, 4: 0.85, 5: 0.35, 6: 0.90, 7: 0.55, 8: 0.85, 9: 0.80 },
  3: { 1: 0.85, 2: 0.60, 3: 0.80, 4: 0.35, 5: 0.85, 6: 0.85, 7: 0.50, 8: 0.55, 9: 0.85 },
  4: { 1: 0.40, 2: 0.85, 3: 0.35, 4: 0.85, 5: 0.30, 6: 0.85, 7: 0.75, 8: 0.85, 9: 0.55 },
  5: { 1: 0.85, 2: 0.35, 3: 0.85, 4: 0.30, 5: 0.70, 6: 0.40, 7: 0.80, 8: 0.50, 9: 0.85 },
  6: { 1: 0.80, 2: 0.90, 3: 0.85, 4: 0.85, 5: 0.40, 6: 0.85, 7: 0.50, 8: 0.75, 9: 0.90 },
  7: { 1: 0.55, 2: 0.55, 3: 0.50, 4: 0.75, 5: 0.80, 6: 0.50, 7: 0.85, 8: 0.40, 9: 0.60 },
  8: { 1: 0.40, 2: 0.85, 3: 0.55, 4: 0.85, 5: 0.50, 6: 0.75, 7: 0.40, 8: 0.50, 9: 0.55 },
  9: { 1: 0.85, 2: 0.80, 3: 0.85, 4: 0.55, 5: 0.85, 6: 0.90, 7: 0.60, 8: 0.55, 9: 0.85 }
}

const labelFor = (h) => {
  if (h >= 0.85) return 'highly compatible'
  if (h >= 0.75) return 'compatible'
  if (h >= 0.55) return 'neutral'
  if (h >= 0.40) return 'challenging'
  return 'very challenging'
}

// Reduce a number to its 1–9 "matrix root", flagging master numbers
// (11, 22, 33) separately so they can be scored with their intensity bonus.
const toMatrixRoot = (n) => {
  if (n === 11) return { root: 2, master: 11 }
  if (n === 22) return { root: 4, master: 22 }
  if (n === 33) return { root: 6, master: 33 }
  let x = n
  while (x > 9) {
    let s = 0
    while (x > 0) { s += x % 10; x = Math.floor(x / 10) }
    x = s
  }
  return { root: x, master: null }
}

// Master-number intensity bonus:
//   master + its root (11↔2, 22↔4, 33↔6): +0.05, "shared master current"
//   master × master:                      +0.05, "compounded master intensity"
const masterBonus = (a, b) => {
  if (!a.master && !b.master) return { bonus: 0, note: null }
  const pairs = [[11, 2], [22, 4], [33, 6]]
  for (const [m, r] of pairs) {
    if ((a.master === m && !b.master && b.root === r) ||
        (b.master === m && !a.master && a.root === r)) {
      return { bonus: 0.05, note: 'shared master current' }
    }
  }
  if (a.master && b.master) return { bonus: 0.05, note: 'compounded master intensity' }
  // One master, one non-root single digit: modest intensity note, no bonus
  return { bonus: 0, note: 'master intensity carried by one partner' }
}

// Score one axis between two raw numbers (may be master).
// Returns: { a, b, rootA, rootB, master, harmony, label, note, characters }
const scoreAxis = (rawA, rawB) => {
  const A = toMatrixRoot(rawA)
  const B = toMatrixRoot(rawB)
  let base = COMPATIBILITY_MATRIX[A.root]?.[B.root] ?? 0.5
  const { bonus, note } = masterBonus(A, B)
  const harmony = Math.max(0, Math.min(1, base + bonus))
  return {
    a: rawA,
    b: rawB,
    rootA: A.root,
    rootB: B.root,
    masterA: A.master,
    masterB: B.master,
    harmony,
    verdict: labelFor(harmony),
    note,
    characters: `${NUMBER_CHARACTER[A.root]} × ${NUMBER_CHARACTER[B.root]}`
  }
}

// Weighted overall: Life Path 0.50, Expression 0.25, Soul Urge 0.15, Birthday 0.10.
const AXIS_WEIGHTS = { lifePath: 0.50, expression: 0.25, soulUrge: 0.15, birthday: 0.10 }

export const computeCompatibility = (profileA, profileB) => {
  const axisDefs = [
    { key: 'lifePath',   label: 'Life Path',   a: profileA.lifePath.value,   b: profileB.lifePath.value },
    { key: 'expression', label: 'Expression', a: profileA.expression.value, b: profileB.expression.value },
    { key: 'soulUrge',   label: 'Soul Urge',  a: profileA.soulUrge.value,   b: profileB.soulUrge.value },
    { key: 'birthday',   label: 'Birthday',   a: profileA.birthday.value,   b: profileB.birthday.value }
  ]

  const axes = axisDefs.map((ax) => ({ ...ax, ...scoreAxis(ax.a, ax.b) }))

  const weighted = axes.reduce((sum, ax) => sum + ax.harmony * AXIS_WEIGHTS[ax.key], 0)
  const score = Math.round(weighted * 100)

  const mergedVector = [...profileA.vector, ...profileB.vector]

  // Surface master-number intensity if any axis involves one
  const masterIntensity = axes.some((ax) => ax.masterA || ax.masterB)

  return { axes, score, mergedVector, masterIntensity, weights: AXIS_WEIGHTS }
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
