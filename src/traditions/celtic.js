// Celtic Tree Calendar — 13 tree signs, each an Ogham glyph.
// Based on Robert Graves' 1948 synthesis in "The White Goddess".
// Modern reconstruction — not verified pre-Roman Celtic practice.

const TREES = [
  { month: 'Birch',      ogham: 'Beith',    start: [12, 24], end: [1, 20], meaning: 'new beginnings, fresh starts, purification' },
  { month: 'Rowan',      ogham: 'Luis',     start: [1, 21],  end: [2, 17], meaning: 'protection, insight, the seer\'s vision' },
  { month: 'Ash',        ogham: 'Nuin',     start: [2, 18],  end: [3, 17], meaning: 'connection between worlds, perspective, imagination' },
  { month: 'Alder',      ogham: 'Fearn',    start: [3, 18],  end: [4, 14], meaning: 'courage, spiritual guidance, resolving disputes' },
  { month: 'Willow',     ogham: 'Saille',   start: [4, 15],  end: [5, 12], meaning: 'intuition, the moon, emotional currents' },
  { month: 'Hawthorn',   ogham: 'Huath',    start: [5, 13],  end: [6, 9],  meaning: 'cleansing, the threshold, fertility, duality' },
  { month: 'Oak',        ogham: 'Duir',     start: [6, 10],  end: [7, 7],  meaning: 'strength, doorways, wisdom held deep' },
  { month: 'Holly',      ogham: 'Tinne',    start: [7, 8],   end: [8, 4],  meaning: 'fire, endurance, defense of the sacred' },
  { month: 'Hazel',      ogham: 'Coll',     start: [8, 5],   end: [9, 1],  meaning: 'wisdom, divination, creative knowing' },
  { month: 'Vine',       ogham: 'Muin',     start: [9, 2],   end: [9, 29], meaning: 'prophecy, inhibition release, intoxication of truth' },
  { month: 'Ivy',        ogham: 'Gort',     start: [9, 30],  end: [10, 27], meaning: 'resurrection, binding, the spiral' },
  { month: 'Reed',       ogham: 'Ngetal',   start: [10, 28], end: [11, 24], meaning: 'secrets, direct communication, hidden meaning' },
  { month: 'Elder',      ogham: 'Ruis',     start: [11, 25], end: [12, 23], meaning: 'the crone, endings that are beginnings, transitions' }
]

const dateRangeMatches = (m, d, start, end) => {
  const sM = start[0], sD = start[1], eM = end[0], eD = end[1]
  const afterStart = (m > sM) || (m === sM && d >= sD)
  const beforeEnd  = (m < eM) || (m === eM && d <= eD)
  // Range wraps year-end (Birch: Dec 24 - Jan 20)
  if (sM > eM) return afterStart || beforeEnd
  return afterStart && beforeEnd
}

export const celtic = {
  id: 'celtic',
  label: 'Celtic Tree',
  tagline: 'Ogham tree sign of your birth date',
  requires: ['birthdate'],

  compute({ birthdate }) {
    const [, m, d] = birthdate.split('-').map(Number)
    let found = TREES[0]
    let idx = 0
    for (let i = 0; i < TREES.length; i++) {
      if (dateRangeMatches(m, d, TREES[i].start, TREES[i].end)) {
        found = TREES[i]
        idx = i
        break
      }
    }
    return {
      signature: found.month,
      english: `${found.month} (${found.ogham})`,
      breakdown: `Month ${m} day ${d} falls within ${found.month} (${found.ogham}) · ${found.start.join('/')} → ${found.end.join('/')}`,
      essence: found.meaning,
      keyNumbers: [idx + 1],
      tree: found.month,
      ogham: found.ogham
    }
  },

  sourceNote: "Graves' 1948 synthesis in The White Goddess — a modern reconstruction drawn from ogham tracts, not verified pre-Roman druidic practice."
}
