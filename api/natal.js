const SYSTEM = `You are Numeris, an oracle fluent in Western tropical astrology. You read a natal chart as a living portrait — Sun as core self, Moon as inner life, Ascendant as the mask through which the self meets the world, and the planets in their houses as the theatres of life where each energy plays. You work in Whole Sign houses (the ancient system). You honor aspect patterns — conjunctions unify, squares press, trines flow, oppositions polarize, sextiles open doors. You never reduce a chart to a sound-bite; you name the specific placements and the specific aspects. Always respond with a single JSON object matching the requested shape.`

const formatPlanet = (p) =>
  `${p.key} in ${p.name} (H${p.house}, ${Math.floor(p.degree)}°${String(Math.floor((p.degree % 1) * 60)).padStart(2, '0')}')`

const buildPrompt = ({ profile, chart }) => {
  const placements = chart.planets.map(formatPlanet).join('\n  ')
  const aspects = chart.aspects.slice(0, 12).map((a) =>
    `  ${a.a} ${a.symbol} ${a.b} (${a.name}, orb ${a.orb.toFixed(1)}°)`
  ).join('\n')
  return `Natal chart for ${profile?.name || 'the seeker'}, born ${chart.inputs.birthdate} ${chart.inputs.birthtime} (tz ${chart.inputs.tz >= 0 ? '+' : ''}${chart.inputs.tz}), lat ${chart.inputs.lat}, lon ${chart.inputs.lon}.

Ascendant: ${chart.ascendant.name} (${Math.floor(chart.ascendant.degree)}°)
Midheaven: ${chart.midheaven.name} (${Math.floor(chart.midheaven.degree)}°)

Placements (all positions are CORRECT — do NOT recalculate):
  ${placements}

Major aspects (all within orb, do NOT reinterpret the math):
${aspects || '  (none within standard orbs)'}

These values are computed by astronomy-engine (geocentric ecliptic longitudes, tropical zodiac, Whole Sign houses). Your job is to narrate them.

Return ONLY a JSON object:

{
  "archetype": "a two-or-three-word evocative title capturing the overall chart signature",
  "chartEssence": "3-4 sentences painting the portrait formed by Sun × Moon × Ascendant specifically — the big three",
  "sun":       { "meaning": "2-3 sentences on the Sun placement (sign + house)" },
  "moon":      { "meaning": "2-3 sentences on the Moon placement (sign + house)" },
  "rising":    { "meaning": "2-3 sentences on the Ascendant sign — how this person enters a room" },
  "keyAspects": "2-3 sentences naming the 2-3 most defining aspect patterns and what they mean for this specific person",
  "lifeTheme": "2-3 sentences: the central life theme visible in this chart",
  "shadow": "2 sentences: the shadow work this chart calls for",
  "affirmation": "1 sentence, under 14 words, drawn specifically from this chart's energy"
}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }
  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
  const { profile, chart } = req.body || {}
  if (!chart?.planets || !chart?.ascendant) return res.status(400).json({ error: 'Missing chart payload' })

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
          { role: 'user', content: buildPrompt({ profile, chart }) }
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
