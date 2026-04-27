// Life Map — a temporal cross-tradition view of a life.
// Computes pinnacles + challenges (numerology), planetary returns
// (Saturn, Jupiter — astronomical), and the 9-year Personal Year cycle.
// Pure math from birthdate; no LLM, no network.

import { reduce } from './numerology.js'

// ─── helpers ──────────────────────────────────────────────────────

const sumDigits = (n) => {
  let s = 0, x = Math.abs(Math.floor(n))
  while (x > 0) { s += x % 10; x = Math.floor(x / 10) }
  return s
}

// Reduce while preserving master numbers (11, 22, 33).
const r = (n) => reduce(n, true)

const ageAt = (birthdate, target = new Date()) => {
  const [y, m, d] = birthdate.split('-').map(Number)
  const birth = new Date(y, m - 1, d)
  const ms = target - birth
  return ms / (365.2425 * 86400000)
}

// ─── Pinnacles (Decoz convention) ────────────────────────────────
// Four pinnacles, 9-year cycles after the first.
// First ends at: 36 - life_path (preserves master numbers in the lifepath sense
// but for the duration calc we use the reduced single digit).
// Months and days reduced individually before summing for masters preservation.

export const computePinnacles = (birthdate, lifePathValue) => {
  const [y, m, d] = birthdate.split('-').map(Number)
  const monthR = r(m)
  const dayR = r(d)
  const yearR = r(y)
  const lp = lifePathValue > 9 && lifePathValue !== 11 && lifePathValue !== 22 && lifePathValue !== 33
    ? sumDigits(lifePathValue)
    : (lifePathValue === 11 ? 2 : lifePathValue === 22 ? 4 : lifePathValue === 33 ? 6 : lifePathValue)
  const firstEndAge = 36 - lp

  const p1 = r(monthR.value + dayR.value)
  const p2 = r(dayR.value + yearR.value)
  const p3 = r(p1.value + p2.value)
  const p4 = r(monthR.value + yearR.value)

  return [
    { number: 1, value: p1.value, isMaster: p1.isMaster, startAge: 0, endAge: firstEndAge },
    { number: 2, value: p2.value, isMaster: p2.isMaster, startAge: firstEndAge, endAge: firstEndAge + 9 },
    { number: 3, value: p3.value, isMaster: p3.isMaster, startAge: firstEndAge + 9, endAge: firstEndAge + 18 },
    { number: 4, value: p4.value, isMaster: p4.isMaster, startAge: firstEndAge + 18, endAge: 96 }
  ]
}

// ─── Challenges (numerology) ─────────────────────────────────────
// Same time periods as pinnacles. Challenges are reductions of differences,
// representing the lesson in tension behind each pinnacle period.
// Master numbers do NOT apply to challenges (always reduced to single digit).

const reduceToSingleDigit = (n) => {
  let x = Math.abs(Math.floor(n))
  while (x > 9) {
    let s = 0
    while (x > 0) { s += x % 10; x = Math.floor(x / 10) }
    x = s
  }
  return x
}

export const computeChallenges = (birthdate, lifePathValue) => {
  const [y, m, d] = birthdate.split('-').map(Number)
  const monthR = reduceToSingleDigit(m)
  const dayR = reduceToSingleDigit(d)
  const yearR = reduceToSingleDigit(y)
  const lp = lifePathValue > 9 ? reduceToSingleDigit(lifePathValue) : lifePathValue
  const firstEndAge = 36 - lp
  const c1 = Math.abs(monthR - dayR)
  const c2 = Math.abs(dayR - yearR)
  const c3 = Math.abs(c1 - c2)
  const c4 = Math.abs(monthR - yearR)
  return [
    { number: 1, value: c1, startAge: 0, endAge: firstEndAge },
    { number: 2, value: c2, startAge: firstEndAge, endAge: firstEndAge + 9 },
    { number: 3, value: c3, startAge: firstEndAge + 9, endAge: firstEndAge + 18 },
    { number: 4, value: c4, startAge: firstEndAge + 18, endAge: 96 }
  ]
}

// ─── Personal Year cycle ─────────────────────────────────────────
// Personal year value = month + day + currentYear, reduced (masters allowed).
// Returns the 9-year cycle from birth → 96.

export const computePersonalYearCycle = (birthdate, maxAge = 96) => {
  const [y, m, d] = birthdate.split('-').map(Number)
  const monthR = r(m)
  const dayR = r(d)
  const out = []
  for (let age = 0; age <= maxAge; age++) {
    const calendarYear = y + age
    const yearR = r(calendarYear)
    const py = r(monthR.value + dayR.value + yearR.value)
    out.push({ age, calendarYear, value: py.value, isMaster: py.isMaster })
  }
  return out
}

// ─── Planetary returns ──────────────────────────────────────────
// Saturn return: ~29.4571 years per orbit (sidereal). Three classical returns.
// Jupiter return: 11.862 years per orbit. ~8 returns in 96 years.

export const SATURN_PERIOD = 29.4571
export const JUPITER_PERIOD = 11.862

export const computeSaturnReturns = (maxAge = 96) => {
  const out = []
  for (let i = 1; i * SATURN_PERIOD <= maxAge; i++) {
    out.push({ ordinal: i, age: i * SATURN_PERIOD })
  }
  return out
}

export const computeJupiterReturns = (maxAge = 96) => {
  const out = []
  for (let i = 1; i * JUPITER_PERIOD <= maxAge; i++) {
    out.push({ ordinal: i, age: i * JUPITER_PERIOD })
  }
  return out
}

// ─── Main compute ────────────────────────────────────────────────

export const computeLifeMap = (profile) => {
  if (!profile?.inputs?.birthdate) throw new Error('Life map requires a birthdate')
  const birthdate = profile.inputs.birthdate
  const lp = profile.lifePath?.value ?? 1

  const pinnacles = computePinnacles(birthdate, lp)
  const challenges = computeChallenges(birthdate, lp)
  const personalYears = computePersonalYearCycle(birthdate, 96)
  const saturnReturns = computeSaturnReturns(96)
  const jupiterReturns = computeJupiterReturns(96)

  const currentAge = ageAt(birthdate)
  const currentPinnacle = pinnacles.find((p) => currentAge >= p.startAge && currentAge < p.endAge) || pinnacles[3]
  const currentChallenge = challenges.find((c) => currentAge >= c.startAge && currentAge < c.endAge) || challenges[3]
  const currentPYIdx = Math.floor(currentAge)
  const currentPersonalYear = personalYears[Math.min(Math.max(currentPYIdx, 0), personalYears.length - 1)]

  // Find next planetary returns after current age
  const nextSaturn = saturnReturns.find((s) => s.age > currentAge)
  const nextJupiter = jupiterReturns.find((j) => j.age > currentAge)
  const lastSaturn = [...saturnReturns].reverse().find((s) => s.age <= currentAge)
  const lastJupiter = [...jupiterReturns].reverse().find((j) => j.age <= currentAge)

  return {
    birthdate,
    lifePath: lp,
    currentAge,
    pinnacles,
    challenges,
    personalYears,
    saturnReturns,
    jupiterReturns,
    currentPinnacle,
    currentChallenge,
    currentPersonalYear,
    nextSaturn,
    nextJupiter,
    lastSaturn,
    lastJupiter
  }
}

// ─── Symbolic meanings (for narrative + tooltips) ────────────────

export const PINNACLE_MEANINGS = {
  1: 'self-reliance, asserting your own direction',
  2: 'partnership, patience, learning to receive',
  3: 'creative expression, joy, communicating outward',
  4: 'foundation-building, discipline, structure',
  5: 'change, freedom, expansion through experience',
  6: 'responsibility, family, deepening love',
  7: 'inner work, study, spiritual unfoldment',
  8: 'mastery of resources, authority, material accomplishment',
  9: 'completion, wisdom, generosity to the world',
  11: 'illumination through inspiration, spiritual visibility',
  22: 'master building of something with collective scale',
  33: 'master teaching, healing the wider world'
}

export const CHALLENGE_MEANINGS = {
  0: 'all challenges available — no single dominant lesson',
  1: 'asserting yourself without overpowering others',
  2: 'standing alone without losing connection',
  3: 'speaking truth without scattering energy',
  4: 'discipline without rigidity',
  5: 'freedom without abandoning commitment',
  6: 'serving without sacrificing self',
  7: 'going inward without isolating',
  8: 'wielding power without losing soul'
}
