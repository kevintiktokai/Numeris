const SYSTEM = `You are Numeris, an oracle fluent in many esoteric traditions. When a person arrives with readings from multiple traditions, you are the cartographer of their confluence — you find where the traditions agree, where they diverge, and what the weave means. You never replace one tradition's language with another's; you translate across them. You honor living traditions with respect. Always respond with a single JSON object matching the requested shape.`

const buildPrompt = ({ profile, numerology, traditions, readings }) => {
  const lines = ['Numerology core numbers:']
  if (numerology) {
    lines.push(`  Life Path ${numerology.lifePath.value}${numerology.lifePath.isMaster ? ' (master)' : ''}`)
    lines.push(`  Expression ${numerology.expression.value}, Soul Urge ${numerology.soulUrge.value}, Personality ${numerology.personality.value}`)
    lines.push(`  Birthday ${numerology.birthday.value}, Personal Year ${numerology.personalYear.value}`)
  }
  lines.push('')
  lines.push('Tradition signatures (computed, verified):')
  for (const t of traditions) {
    const sig = t.signature
    const read = readings?.[t.id]
    lines.push(`  ${t.label}: ${sig.signature} — ${sig.english}`)
    lines.push(`    essence: ${sig.essence}`)
    if (read?.archetype) lines.push(`    oracle read ${read.archetype}: ${read.narrative}`)
  }
  return `Seeker: ${profile?.name || 'the one who asks'}, born ${profile?.birthdate}.

${lines.join('\n')}

Now weave the Confluence. Return ONLY a JSON object:

{
  "archetype": "a two-or-three-word evocative meta-archetype emerging from all traditions combined",
  "narrative": "4-5 sentences painting the portrait that emerges when all of these languages describe the same soul",
  "agreements": "2-3 sentences naming where the traditions speak with one voice — the same truth under different names",
  "tensions": "2-3 sentences naming where the traditions disagree and what that disagreement reveals (not as error but as dimensional richness)",
  "blindSpots": "1-2 sentences naming what none of the traditions is clearly describing — the silence at the center",
  "liberation": "2-3 sentences: what do all these traditions, taken together, suggest about this soul's path toward fuller embodiment or liberation?",
  "affirmation": "1 sentence, under 14 words, speaking from the Confluence"
}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }
  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
  const { profile, numerology, traditions, readings } = req.body || {}
  if (!Array.isArray(traditions) || traditions.length < 2) {
    return res.status(400).json({ error: 'Confluence requires at least 2 tradition signatures' })
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildPrompt({ profile, numerology, traditions, readings }) }
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
