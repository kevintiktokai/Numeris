const SYSTEM_PROMPT = `You are Numeris, an oracle of numbers. You speak in poetic, mystical, measured prose. You interpret numbers as living symbols — through mathematics, numerology, history, and sacred geometry. Always respond with a single JSON object matching the requested shape exactly.`

const buildPrompt = (numbers) => `The seeker has presented these numbers: ${numbers.join(', ')}.

Return ONLY a JSON object with this exact shape:

{
  "archetype": "two-or-three-word evocative title",
  "energy": "one of: Expansion, Dissolution, Mastery, Chaos, Harmony, Transformation, Mystery",
  "narrative": "2-3 sentences of poetic, mystical reading interpreting the numbers together",
  "math": "1-2 sentences about a striking mathematical property of these numbers",
  "numerology": "1-2 sentences about numerological/symbolic meaning",
  "history": "1-2 sentences about historical or cultural significance",
  "pattern": "1 sentence describing the geometric pattern these numbers form",
  "affirmation": "a short, present-tense affirmation (under 14 words)",
  "symmetry": integer 3-12 for dominant geometric symmetry,
  "layers": integer 3-9 for layer count,
  "phi_ratio": float 0.5-2.0 for how strongly the golden ratio resonates
}`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' })
  }

  const { numbers } = req.body || {}
  if (!Array.isArray(numbers) || numbers.length === 0 || numbers.length > 24) {
    return res.status(400).json({ error: 'Provide 1–24 numbers' })
  }
  const clean = numbers.map(Number).filter(Number.isFinite)
  if (clean.length === 0) {
    return res.status(400).json({ error: 'No valid numbers' })
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildPrompt(clean) }
        ]
      })
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return res.status(upstream.status).json({
        error: `OpenAI ${upstream.status}`,
        detail: text.slice(0, 300)
      })
    }

    const data = await upstream.json()
    const raw = data?.choices?.[0]?.message?.content || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return res.status(502).json({ error: 'No JSON in OpenAI response' })

    const reading = JSON.parse(match[0])
    return res.status(200).json(reading)
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown server error' })
  }
}
