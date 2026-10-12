// Shared auth helpers for the scheduled edge functions.
//
// These functions are deployed with verify_jwt = false, so the gateway no
// longer checks the caller. Instead each function calls requireCronSecret()
// first: the pg_cron jobs send `Authorization: Bearer <CRON_SECRET>` (read
// from Vault), and anything else gets a 401. A signed-in dashboard user's JWT
// is not enough to trigger a sync.

const encoder = new TextEncoder()

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

/** Returns a 401/500 Response if the caller isn't the cron job, otherwise null. */
export function requireCronSecret(req: Request): Response | null {
  const expected = Deno.env.get('CRON_SECRET')
  if (!expected) {
    console.error('CRON_SECRET is not set; refusing all requests')
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const header = req.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token || !timingSafeEqual(token, expected)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}

/**
 * Key for the functions' own database access: the new secret API key
 * (SUPABASE_SECRET_KEYS is a JSON map injected by the platform). The legacy
 * service_role JWT was revoked on 2026-09-25 and is deliberately not used.
 */
export function getServiceKey(): string | undefined {
  const explicit = Deno.env.get('SUPABASE_SECRET_KEY')
  if (explicit) return explicit

  const keys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>
      const key = parsed.default ?? Object.values(parsed)[0]
      if (key) return key
    } catch {
      console.error('Could not parse SUPABASE_SECRET_KEYS')
    }
  }

  return undefined
}
