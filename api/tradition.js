const GUIDANCE = {
  mayan:       `Speak from the Mayan Tzolkin tradition. Honor the Day Sign and Galactic Tone specifically. The 260-day count is sacred; do not reduce it to generic horoscope-speak. 3-4 sentences.`,
  chinese:     `Speak from Chinese astrological tradition (Bazi year pillar). Honor the five-element interplay and the Yin/Yang polarity of the stem. Name the specific stem-branch combination. 3-4 sentences.`,
  celtic:      `Speak from the Celtic Tree Calendar (Robert Graves synthesis). Name the tree, its ogham glyph, and its specific symbolic resonance. Acknowledge this is a modern reconstruction. 3-4 sentences.`,
  western:     `Speak from Western tropical astrology. This is Sun-sign only — acknowledge that the full picture requires Moon, Rising, and houses. 3-4 sentences.`,
  tarot:       `Speak from the Tarot Major Arcana tradition. Interpret the Life Path card as the soul's central arc, Soul card as underlying lineage, Year card as the current chapter. 3-4 sentences.`,
  nineStarKi:  `Speak from the Nine Star Ki tradition (Japanese feng-shui, Lo Shu square). Honor the element, direction, and aspect of the principal star. 3-4 sentences.`
}

const SYSTEM = `You are Numeris, an oracle fluent in multiple traditions. When asked to speak from a specific tradition, you stay within its vocabulary and symbolism — you do not cross-pollinate mid-reading. You honor living traditions with respect: you offer archetypal reflection, not claims of authority. Always respond with a single JSON object matching the requested shape.`

const buildPrompt = ({ tradition, signature, profile }) => `Tradition: ${tradition.label}
Tagline: ${tradition.tagline}
Source note: ${tradition.sourceNote}

Person: ${profile?.name || 'the seeker'}, born ${profile?.birthdate}

Computed signature for this tradition (verified client-side, DO NOT recalculate):
  Signature: ${signature.signature} (${signature.english})
  Breakdown: ${signature.breakdown}
  Essence cue: ${signature.essence}
  ${signature.partial ? 'NOTE: this is a PARTIAL reading (Sun sign only). Acknowledge that a full natal chart requires time and location.' : ''}

${GUIDANCE[tradition.id]}

Return ONLY a JSON object:
{
  "archetype": "a two-or-three-word evocative title specific to this tradition",
  "narrative": "3-4 sentences grounded in the tradition's specific symbolic vocabulary",
  "gift": "1-2 sentences naming the core gift of this signature",
  "shadow": "1-2 sentences naming the shadow / challenge of this signature",
  "affirmation": "1 sentence, under 14 words, in the voice of this tradition"
}`

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }
  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
  const { tradition, signature, profile } = req.body || {}
  if (!tradition?.id || !GUIDANCE[tradition.id]) return res.status(400).json({ error: 'Unknown tradition' })
  if (!signature) return res.status(400).json({ error: 'Missing signature' })

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
          { role: 'user', content: buildPrompt({ tradition, signature, profile }) }
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
