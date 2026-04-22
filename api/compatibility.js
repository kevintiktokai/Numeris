const buildPrompt = ({ profileA, profileB, compatibility }) => {
  const axesSummary = compatibility.axes.map((ax) =>
    `- ${ax.label}: ${profileA.inputs.name} = ${ax.a}, ${profileB.inputs.name} = ${ax.b}, harmony ${(ax.harmony * 100).toFixed(0)}/100`
  ).join('\n')

  return `Two seekers request a compatibility reading.

PERSON A: "${profileA.inputs.name}" born ${profileA.inputs.birthdate}
  Life Path ${profileA.lifePath.value}, Expression ${profileA.expression.value}, Soul Urge ${profileA.soulUrge.value}, Personality ${profileA.personality.value}, Birthday ${profileA.birthday.value}, Personal Year ${profileA.personalYear.value}

PERSON B: "${profileB.inputs.name}" born ${profileB.inputs.birthdate}
  Life Path ${profileB.lifePath.value}, Expression ${profileB.expression.value}, Soul Urge ${profileB.soulUrge.value}, Personality ${profileB.personality.value}, Birthday ${profileB.birthday.value}, Personal Year ${profileB.personalYear.value}

Computed compatibility (${profileA.inputs.system} system):
${axesSummary}
Weighted overall score: ${compatibility.score}/100

These numbers are CORRECT — interpret, do not recalculate.

Return ONLY a JSON object:

{
  "archetype": "two-or-three-word evocative title for this pairing",
  "energy": "one of: Expansion, Dissolution, Mastery, Chaos, Harmony, Transformation, Mystery",
  "verdict": "one-line essence of the pairing (under 14 words)",
  "narrative": "4-5 sentences interpreting the relationship as a whole. Honest about both gifts and tensions.",
  "lifePath":   { "meaning": "How their Life Paths meet. 2-3 sentences." },
  "expression": { "meaning": "How their Expression numbers collaborate or collide. 2-3 sentences." },
  "soulUrge":   { "meaning": "How their Soul Urges align or diverge. 2-3 sentences." },
  "strengths":  "2 sentences on the natural gifts of this pairing",
  "tensions":   "2 sentences on the friction points to be conscious of",
  "practice":   "1-2 sentences of a concrete practice they can do together",
  "symmetry": integer 3-12,
  "layers": integer 3-9,
  "phi_ratio": float 0.5-2.0
}`
}

const SYSTEM_PROMPT = `You are Numeris, an oracle of numbers who interprets numerological compatibility with honesty and nuance. You do not pretend every pairing is harmonious — you read the numbers truthfully, acknowledging both resonance and friction. You draw on Pythagorean harmonic tradition. Always respond with a single JSON object matching the requested shape exactly.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  const { profileA, profileB, compatibility } = req.body || {}
  if (!profileA || !profileB || !compatibility) {
    return res.status(400).json({ error: 'Missing profileA, profileB, or compatibility payload' })
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildPrompt({ profileA, profileB, compatibility }) }
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
    if (!match) return res.status(502).json({ error: 'No JSON in OpenAI response' })
    return res.status(200).json(JSON.parse(match[0]))
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown server error' })
  }
}
