// Server-side Supabase helper. Import only from serverless functions.
// Returns null when env vars are absent — callers must handle that so the
// app still works without persistence configured.

import { createClient } from '@supabase/supabase-js'

let cached = null

export const supabase = () => {
  if (cached !== null) return cached
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    cached = false // negative cache
    return null
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  return cached
}

export const persistenceEnabled = () => {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}
