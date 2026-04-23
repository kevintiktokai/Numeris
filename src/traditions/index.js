import { mayan } from './mayan.js'
import { chinese } from './chinese.js'
import { celtic } from './celtic.js'
import { western } from './western.js'
import { tarot } from './tarot.js'
import { nineStarKi } from './nineStarKi.js'

// Ordered for display. First entries are the most universally recognizable.
export const TRADITIONS = [western, chinese, mayan, tarot, celtic, nineStarKi]

export const TRADITION_BY_ID = Object.fromEntries(TRADITIONS.map((t) => [t.id, t]))

// Compute every tradition's signature for a profile input.
// Returns a map { id → { signature, essence, keyNumbers, ... } }.
export const computeAllTraditions = (inputs) => {
  const out = {}
  for (const t of TRADITIONS) {
    try { out[t.id] = t.compute(inputs) }
    catch (e) { out[t.id] = { error: e.message } }
  }
  return out
}

// Aggregate all tradition keyNumbers into one vector for sigil feed.
export const traditionsSigilVector = (readings) => {
  const arr = []
  for (const t of TRADITIONS) {
    const r = readings[t.id]
    if (r?.keyNumbers) arr.push(...r.keyNumbers)
  }
  return arr
}
