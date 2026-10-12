import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { buildContentSecurityPolicy, generateNonce } from '@/lib/csp'

export async function middleware(request: NextRequest) {
  // Next.js reads the nonce from the request's CSP header and applies it to
  // the scripts it renders, so set it on the request as well as the response.
  const nonce = generateNonce()
  const csp = buildContentSecurityPolicy(nonce)
  request.headers.set('x-nonce', nonce)
  request.headers.set('Content-Security-Policy', csp)

  const response = await updateSession(request)
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
