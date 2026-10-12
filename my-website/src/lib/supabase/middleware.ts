import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')

  // Only StudioHawk accounts count as signed in. The auth callback already
  // enforces this, but a session could still be created another way
  // (e.g. if email sign-up is enabled on the Supabase project).
  const isAllowedUser = !!user?.email?.toLowerCase().endsWith('@studiohawk.com.au')

  if (isProtectedRoute && !isAllowedUser) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    if (user) {
      await supabase.auth.signOut()
      url.searchParams.set('error', 'unauthorized')
    }
    const redirect = NextResponse.redirect(url)
    // Carry over any auth cookie changes (e.g. cleared session)
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  // If user is logged in and tries to access login page, redirect to dashboard
  if (isAuthRoute && isAllowedUser) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
