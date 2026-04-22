const SECTION_GUIDANCE = {
  narrative: `Deepen the mystical narrative. Do NOT repeat existing prose — build on it, reveal a further layer of meaning these numbers together carry. Stay poetic, measured, oracular. 3-4 sentences.`,
  math: `Deepen the mathematical analysis. Give a rigorous, verifiable property of these numbers that has NOT been stated yet (prime factorization, modular relationships, convergents, reciprocal sums, appearance in known sequences, algebraic identities, etc.). Be precise — no decorative filler. 3-4 sentences.`,
  numerology: `Deepen the numerological/symbolic meaning. Draw on traditions (Pythagorean, Kabbalistic, Chaldean, Vedic, Chinese) — name the tradition you invoke. Do not repeat prior symbolic claims. 3-4 sentences.`,
  history: `Deepen the historical/cultural significance. Give a concrete, verifiable historical appearance of these numbers (dates, figures, cultures, texts). No speculation — if a number has no striking history, acknowledge that and find a related pattern. 3-4 sentences.`,
  pattern: `Deepen the geometric/pattern description. Describe a specific geometric property these numbers produce together — angle, ratio, named shape, symmetry group, tiling. 3-4 sentences.`
}

const buildDeepenPrompt = ({ numbers, section, previousLayers, reading }) => {
  const existing = [reading[section], ...previousLayers].filter(Boolean).map((t, i) => `Layer ${i + 1}: ${t}`).join('\n\n')
  const depth = previousLayers.length + 2
  return `The seeker presented these numbers: ${numbers.join(', ')}.
Archetype: ${reading.archetype}
Energy: ${reading.energy}

The section being deepened: "${section}"

${SECTION_GUIDANCE[section]}

Previous layers (do NOT repeat these):
${existing}

Now reveal layer ${depth}. Return ONLY a JSON object: { "text": "..." }`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  const { numbers, section, previousLayers = [], reading } = req.body || {}

  if (!Array.isArray(numbers) || numbers.length === 0 || numbers.length > 24) {
    return res.status(400).json({ error: 'Provide 1–24 numbers' })
  }
  if (!SECTION_GUIDANCE[section]) {
    return res.status(400).json({ error: `Unknown section: ${section}` })
  }
  if (!reading || typeof reading !== 'object') {
    return res.status(400).json({ error: 'Missing current reading context' })
  }
  if (previousLayers.length >= 3) {
    return res.status(400).json({ error: 'Maximum depth reached for this section' })
  }
  const clean = numbers.map(Number).filter(Number.isFinite)
  if (clean.length === 0) return res.status(400).json({ error: 'No valid numbers' })

  const systemPrompt = section === 'math' || section === 'history'
    ? `You are Numeris, an oracle of numbers. For this task, rigor matters more than mysticism — you surface verifiable facts and real history, never invent. If you cannot verify something, say so plainly within the oracle's voice.`
    : `You are Numeris, an oracle of numbers. Your prose is poetic, measured, and always reveals something new — you never restate what has already been said.`

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.9,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildDeepenPrompt({ numbers: clean, section, previousLayers, reading }) }
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

    const parsed = JSON.parse(match[0])
    const text = typeof parsed === 'string' ? parsed : parsed.text || parsed.content || ''
    if (!text) return res.status(502).json({ error: 'Empty deepening text' })

    return res.status(200).json({ text, depth: previousLayers.length + 2 })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown server error' })
  }
}
