import { supabase, persistenceEnabled } from '../lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!persistenceEnabled()) {
    return res.status(503).json({
      error: 'Persistence not configured',
      detail: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Vercel project to enable saving.'
    })
  }

  const { kind, tradition_id, inputs, payload, pattern, palette, profile } = req.body || {}
  if (!kind || !payload) return res.status(400).json({ error: 'Missing kind or payload' })

  const db = supabase()

  try {
    // Upsert a profile if the reading came with one
    let profile_id = null
    if (profile?.name && profile?.birthdate) {
      const { data: prof, error: profErr } = await db
        .from('profiles')
        .insert({
          name: profile.name,
          birthdate: profile.birthdate,
          system: profile.system || 'pythagorean'
        })
        .select('id')
        .single()
      if (profErr) return res.status(500).json({ error: 'Failed to save profile', detail: profErr.message })
      profile_id = prof.id
    }

    const { data: reading, error } = await db
      .from('readings')
      .insert({
        kind,
        tradition_id: tradition_id || null,
        inputs: inputs || {},
        payload,
        pattern: pattern || null,
        palette: palette || null,
        profile_id
      })
      .select('id, created_at')
      .single()

    if (error) return res.status(500).json({ error: 'Failed to save reading', detail: error.message })

    return res.status(200).json({ id: reading.id, created_at: reading.created_at })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown server error' })
  }
}
