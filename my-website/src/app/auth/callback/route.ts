import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_EMAIL_DOMAIN = '@studiohawk.com.au'

// Only allow same-origin relative paths. Rejects values like "@evil.com" or
// "//evil.com" that would otherwise redirect off-site when appended to origin.
function safeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/dashboard'
  }
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[Auth Callback] Code exchange failed:', error.message)
      return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('[Auth Callback] Get user failed:', userError.message)
      return NextResponse.redirect(`${origin}/login?error=user_failed`)
    }

    if (user?.email?.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    // Sign out anyone outside the StudioHawk domain
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=unauthorized`)
  } catch (err) {
    console.error('[Auth Callback] Unexpected error:', err instanceof Error ? err.message : err)
    return NextResponse.redirect(`${origin}/login?error=server_error`)
  }
}
