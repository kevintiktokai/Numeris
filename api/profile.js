const CORE_GUIDANCE = {
  lifePath: `Narrate the Life Path number — the central arc of the person's life. Honor master numbers (11, 22, 33) with extra gravitas if present. 3-4 sentences, poetic yet specific.`,
  expression: `Narrate the Expression (Destiny) number — what the person is here to build with their full birth name. 3-4 sentences.`,
  soulUrge: `Narrate the Soul Urge — the inner motivation, what the heart wants. 3-4 sentences.`,
  personality: `Narrate the Personality number — how others perceive them on first meeting. 3-4 sentences.`,
  birthday: `Narrate the Birthday number — a specific gift carried. 3-4 sentences.`,
  personalYear: `Narrate the Personal Year — the theme of the current calendar year for this person. Be concrete about the kind of energy ${new Date().getFullYear()} carries for them. 3-4 sentences.`,
  maturity: `Narrate the Maturity number — the deeper identity that emerges typically after age 35. 3-4 sentences.`
}

const buildPrompt = (profile) => {
  const { inputs, lifePath, expression, soulUrge, personality, birthday, personalYear, maturity } = profile
  return `The seeker's name is "${inputs.name}" and they were born on ${inputs.birthdate}.
Using the ${inputs.system} numerology system, their core numbers have been calculated:

- Life Path: ${lifePath.value}${lifePath.isMaster ? ' (master)' : ''}${lifePath.karmicDebt ? ' [karmic debt from raw ' + lifePath.raw + ']' : ''} — ${lifePath.breakdown}
- Expression: ${expression.value}${expression.isMaster ? ' (master)' : ''} — ${expression.breakdown}
- Soul Urge: ${soulUrge.value}${soulUrge.isMaster ? ' (master)' : ''} — ${soulUrge.breakdown}
- Personality: ${personality.value}${personality.isMaster ? ' (master)' : ''} — ${personality.breakdown}
- Birthday: ${birthday.value}${birthday.isMaster ? ' (master)' : ''} — ${birthday.breakdown}
- Personal Year (${inputs.currentYear}): ${personalYear.value}${personalYear.isMaster ? ' (master)' : ''} — ${personalYear.breakdown}
- Maturity: ${maturity.value}${maturity.isMaster ? ' (master)' : ''} — ${maturity.breakdown}

These numbers are CORRECT — do not recalculate or dispute them. Narrate each.

Return ONLY a JSON object with this exact shape:

{
  "archetype": "two-or-three-word evocative title for this whole profile",
  "energy": "one of: Expansion, Dissolution, Mastery, Chaos, Harmony, Transformation, Mystery",
  "narrative": "3-4 sentences weaving the core numbers together into a single portrait",
  "lifePath":    { "meaning": "..." },
  "expression":  { "meaning": "..." },
  "soulUrge":    { "meaning": "..." },
  "personality": { "meaning": "..." },
  "birthday":    { "meaning": "..." },
  "personalYear":{ "meaning": "..." },
  "maturity":    { "meaning": "..." },
  "affirmation": "a short, present-tense affirmation under 14 words for this person specifically",
  "symmetry": integer 3-12 for dominant geometric symmetry,
  "layers": integer 3-9 for layer count,
  "phi_ratio": float 0.5-2.0 for how strongly the golden ratio resonates
}

For each core number's "meaning": ${'follow the per-number guidance:'}
${Object.entries(CORE_GUIDANCE).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`
}

const SYSTEM_PROMPT = `You are Numeris, an oracle of numbers trained in both Pythagorean and Chaldean numerology. You speak in poetic, measured prose grounded in real numerological tradition. When a person presents their name and birth date, you interpret the six core numbers that emerge. You do not flatter and you do not mystify hollowly — you honor the specific number that appears for each axis. Always respond with a single JSON object matching the requested shape exactly.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  const { profile } = req.body || {}
  if (!profile || !profile.inputs || !profile.lifePath) {
    return res.status(400).json({ error: 'Missing precomputed profile' })
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
          { role: 'user', content: buildPrompt(profile) }
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
