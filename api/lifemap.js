const SYSTEM = `You are Numeris, an oracle who reads a life as a temporal arc — not a snapshot. You see the chapters: the early pinnacle that forged the foundation, the middle pinnacle where the soul is tested, the planetary returns that mark structural passages (Saturn at 29 and 59 — reckonings; Jupiter every 12 — expansions). You synthesize numerology and astronomy without making either inferior. You speak with measured gravity. Always respond with a single JSON object matching the requested shape.`

const formatAge = (a) => {
  const yrs = Math.floor(a)
  const mo = Math.round((a - yrs) * 12)
  return mo === 0 ? `${yrs}` : `${yrs}y ${mo}m`
}

const buildPrompt = ({ profile, map }) => {
  const pin = map.pinnacles.map((p) =>
    `  P${p.number}: ${p.value}${p.isMaster ? ' (master)' : ''}, ages ${formatAge(p.startAge)}–${formatAge(p.endAge)}`
  ).join('\n')
  const chl = map.challenges.map((c) =>
    `  C${c.number}: ${c.value}, ages ${formatAge(c.startAge)}–${formatAge(c.endAge)}`
  ).join('\n')
  const sat = map.saturnReturns.map((s) =>
    `  Saturn return ${s.ordinal}: age ${formatAge(s.age)}`
  ).join('\n')

  return `Life Map for ${profile?.name || 'the seeker'}, born ${profile?.birthdate}.
Life Path: ${map.lifePath}
Current age: ${formatAge(map.currentAge)}

PINNACLE PERIODS (Decoz numerology — 4 chapters of life):
${pin}

CHALLENGES (the lesson within each pinnacle):
${chl}

SATURN RETURNS (astronomical, ~29.46-year orbit — structural reckonings):
${sat}

CURRENT MOMENT:
  In Pinnacle ${map.currentPinnacle.number} (value ${map.currentPinnacle.value}${map.currentPinnacle.isMaster ? ', master' : ''})
  Working with Challenge ${map.currentChallenge.number} (value ${map.currentChallenge.value})
  Personal Year ${map.currentPersonalYear.value} (calendar ${map.currentPersonalYear.calendarYear})
  ${map.lastSaturn ? `Most recent Saturn return: age ${formatAge(map.lastSaturn.age)}` : 'First Saturn return not yet reached'}
  ${map.nextSaturn ? `Next Saturn return: age ${formatAge(map.nextSaturn.age)}` : 'Saturn returns complete'}
  ${map.nextJupiter ? `Next Jupiter return: age ${formatAge(map.nextJupiter.age)}` : 'Jupiter returns complete'}

These values are CORRECT — narrate, do not recalculate.

Return ONLY a JSON object:

{
  "archetype": "two-or-three-word title for this life's arc as a whole",
  "lifeArc": "4-5 sentences describing the trajectory of this life — past chapters, present, future. Honor the master numbers, the planetary returns, the central life path number.",
  "pastChapter": "2-3 sentences interpreting the pinnacle/s already lived. What did they forge?",
  "presentChapter": "3-4 sentences specifically about the current pinnacle + challenge + personal year combined. What is being asked right now?",
  "nextThreshold": "2-3 sentences naming the next major passage (next Saturn return, next pinnacle shift, or significant Jupiter return) and what it likely brings",
  "liberationPath": "2-3 sentences: looking across the entire arc, what is this soul's path toward liberation/integration? Speak from the convergence of the numbers and the planetary cycles.",
  "affirmation": "1 sentence, under 14 words, that fits the present chapter specifically"
}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }
  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
  const { profile, map } = req.body || {}
  if (!map?.pinnacles || !map?.currentPinnacle) return res.status(400).json({ error: 'Missing life map payload' })

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.95,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildPrompt({ profile, map }) }
        ]
      })
    })
    if (!upstream.ok) {
      const text = await upstream.text()
      return res.status(upstream.status).json({ error: `OpenAI ${upstream.status}`, detail: text.slice(0, 300) })
    }
    const data = await upstream.json()
    const raw = data?.choices?.[0]?.message?.content || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return res.status(502).json({ error: 'No JSON in response' })
    return res.status(200).json(JSON.parse(match[0]))
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown server error' })
  }
}
