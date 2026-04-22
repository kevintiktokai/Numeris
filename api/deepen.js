const SECTION_GUIDANCE = {
  // Numbers-mode sections
  narrative: `Deepen the mystical narrative. Do NOT repeat existing prose — build on it, reveal a further layer of meaning these numbers together carry. Stay poetic, measured, oracular. 3-4 sentences.`,
  math: `Deepen the mathematical analysis. Give a rigorous, verifiable property of these numbers that has NOT been stated yet (prime factorization, modular relationships, convergents, reciprocal sums, appearance in known sequences, algebraic identities, etc.). Be precise — no decorative filler. 3-4 sentences.`,
  numerology: `Deepen the numerological/symbolic meaning. Draw on traditions (Pythagorean, Kabbalistic, Chaldean, Vedic, Chinese) — name the tradition you invoke. Do not repeat prior symbolic claims. 3-4 sentences.`,
  history: `Deepen the historical/cultural significance. Give a concrete, verifiable historical appearance of these numbers (dates, figures, cultures, texts). No speculation — if a number has no striking history, acknowledge that and find a related pattern. 3-4 sentences.`,
  pattern: `Deepen the geometric/pattern description. Describe a specific geometric property these numbers produce together — angle, ratio, named shape, symmetry group, tiling. 3-4 sentences.`,
  // Profile-mode sections
  lifePath: `Deepen the Life Path narrative. Speak to the specific life arc this number carries — challenges, gifts, typical life themes. Honor master numbers. 3-4 sentences.`,
  expression: `Deepen the Expression/Destiny narrative. Speak to what this number is specifically designed to build in the world. 3-4 sentences.`,
  soulUrge: `Deepen the Soul Urge narrative. Speak to the deepest inner motivation this number reveals — what the heart truly wants. 3-4 sentences.`,
  personality: `Deepen the Personality narrative. Speak to first impressions, how others experience this person, the outer mask. 3-4 sentences.`,
  birthday: `Deepen the Birthday number narrative. Speak to the specific gift or talent this day confers. 3-4 sentences.`,
  personalYear: `Deepen the Personal Year narrative. Speak concretely to what this year will likely bring, month by theme if useful. 3-4 sentences.`,
  maturity: `Deepen the Maturity number narrative. Speak to what emerges after 35, the deeper identity. 3-4 sentences.`,
  // Compatibility-mode sections
  strengths: `Deepen the strengths of this pairing. Be specific about what they can build together that neither could alone. 3-4 sentences.`,
  tensions: `Deepen the tensions. Name specific patterns of friction — not abstractions. 3-4 sentences.`,
  practice: `Deepen the practice. Give a second concrete shared practice — ritual, habit, or weekly anchor — that metabolizes their tensions. 3-4 sentences.`
}

const baseTextFor = (section, reading) => {
  const raw = reading?.[section]
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object') return raw.meaning || raw.text || ''
  return ''
}

const buildDeepenPrompt = ({ numbers, section, previousLayers, reading, context }) => {
  const base = baseTextFor(section, reading)
  const existing = [base, ...previousLayers].filter(Boolean).map((t, i) => `Layer ${i + 1}: ${t}`).join('\n\n')
  const depth = previousLayers.length + 2
  const numberPart = numbers?.length ? `Numbers: ${numbers.join(', ')}.` : ''
  const contextPart = context || ''
  return `${numberPart}
${contextPart}
Archetype: ${reading.archetype || '—'}
Energy: ${reading.energy || '—'}

The section being deepened: "${section}"

${SECTION_GUIDANCE[section]}

Previous layers (do NOT repeat these):
${existing || '(none)'}

Now reveal layer ${depth}. Return ONLY a JSON object: { "text": "..." }`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  const { numbers = [], section, previousLayers = [], reading, context = '' } = req.body || {}

  if (!SECTION_GUIDANCE[section]) {
    return res.status(400).json({ error: `Unknown section: ${section}` })
  }
  if (!reading || typeof reading !== 'object') {
    return res.status(400).json({ error: 'Missing current reading context' })
  }
  if (previousLayers.length >= 3) {
    return res.status(400).json({ error: 'Maximum depth reached for this section' })
  }
  if (numbers.length > 24) {
    return res.status(400).json({ error: 'Too many numbers (max 24)' })
  }
  const clean = Array.isArray(numbers) ? numbers.map(Number).filter(Number.isFinite) : []

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
          { role: 'user', content: buildDeepenPrompt({ numbers: clean, section, previousLayers, reading, context }) }
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
