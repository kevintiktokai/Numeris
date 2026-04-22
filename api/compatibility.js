const buildPrompt = ({ profileA, profileB, compatibility }) => {
  const axesSummary = compatibility.axes.map((ax) => {
    const masterNote = ax.masterA || ax.masterB
      ? ` [master: ${ax.masterA ? `A=${ax.masterA}` : ''}${ax.masterA && ax.masterB ? ', ' : ''}${ax.masterB ? `B=${ax.masterB}` : ''}]`
      : ''
    const extra = ax.note ? ` — ${ax.note}` : ''
    return `- ${ax.label} (weight ${Math.round((compatibility.weights?.[ax.key] || 0) * 100)}%): ${profileA.inputs.name} ${ax.a}${ax.masterA ? '*' : ''} × ${profileB.inputs.name} ${ax.b}${ax.masterB ? '*' : ''} → ${ax.characters}, traditionally "${ax.verdict}" (${(ax.harmony * 100).toFixed(0)}/100)${masterNote}${extra}`
  }).join('\n')

  return `Two seekers request a compatibility reading, grounded in Pythagorean numerological tradition.

PERSON A: "${profileA.inputs.name}" born ${profileA.inputs.birthdate}
  Life Path ${profileA.lifePath.value}${profileA.lifePath.isMaster ? ' (master)' : ''}, Expression ${profileA.expression.value}${profileA.expression.isMaster ? ' (master)' : ''}, Soul Urge ${profileA.soulUrge.value}${profileA.soulUrge.isMaster ? ' (master)' : ''}, Personality ${profileA.personality.value}, Birthday ${profileA.birthday.value}, Personal Year ${profileA.personalYear.value}

PERSON B: "${profileB.inputs.name}" born ${profileB.inputs.birthdate}
  Life Path ${profileB.lifePath.value}${profileB.lifePath.isMaster ? ' (master)' : ''}, Expression ${profileB.expression.value}${profileB.expression.isMaster ? ' (master)' : ''}, Soul Urge ${profileB.soulUrge.value}${profileB.soulUrge.isMaster ? ' (master)' : ''}, Personality ${profileB.personality.value}, Birthday ${profileB.birthday.value}, Personal Year ${profileB.personalYear.value}

Compatibility analysis (${profileA.inputs.system} system, classical 9×9 Pythagorean matrix):
${axesSummary}
Weighted overall score: ${compatibility.score}/100

These numbers AND their traditional labels are CORRECT — your job is to narrate the labels honestly, grounded in the specific character of each pair (e.g., "Life Path 7 meets Life Path 1: the seeker meets the leader — one withdraws, one commands").

- If an axis is "highly compatible" or "compatible", speak to the resonance specifically — do not over-claim.
- If an axis is "challenging" or "very challenging", speak to the real friction honestly — name it. Do not euphemize.
- If master numbers are present, honor their intensity (11 = vision, 22 = master builder, 33 = master teacher).
- The "narrative", "strengths", and "tensions" sections must reflect the traditional labels above — not contradict them.

Return ONLY a JSON object:

{
  "archetype": "two-or-three-word evocative title for this pairing",
  "energy": "one of: Expansion, Dissolution, Mastery, Chaos, Harmony, Transformation, Mystery",
  "verdict": "one-line essence of the pairing (under 14 words) that matches the overall score honestly",
  "narrative": "4-5 sentences interpreting the relationship as a whole. Honest about both gifts and tensions. Reflect the traditional labels — do not contradict them.",
  "lifePath":   { "meaning": "How their Life Paths meet. Ground in the traditional label. 2-3 sentences." },
  "expression": { "meaning": "How their Expression numbers collaborate or collide. 2-3 sentences." },
  "soulUrge":   { "meaning": "How their Soul Urges align or diverge. 2-3 sentences." },
  "birthday":   { "meaning": "What their Birthday numbers add to the pairing. 2 sentences." },
  "strengths":  "2 sentences on the natural gifts of this pairing",
  "tensions":   "2 sentences on the friction points — name them specifically, do not euphemize",
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
