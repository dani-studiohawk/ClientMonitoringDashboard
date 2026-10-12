// Content-Security-Policy, built per request so scripts can use a nonce
// instead of 'unsafe-inline'. Called from middleware.ts.
//
// style-src still allows 'unsafe-inline': React inline style props and the
// charts need it, and injected styles are a much smaller risk than scripts.

export function buildContentSecurityPolicy(nonce: string, isDev = process.env.NODE_ENV !== 'production'): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseWs = supabaseUrl.replace(/^https:/, 'wss:')

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseUrl} ${supabaseWs}`.trim(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    `form-action 'self' ${supabaseUrl}`.trim(),
    "object-src 'none'",
  ].join('; ')
}

export function generateNonce(): string {
  return btoa(crypto.randomUUID())
}
