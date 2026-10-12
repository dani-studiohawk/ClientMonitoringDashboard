import { createClient } from '@/lib/supabase/server'

/** The signed-in user's row in public.users, or null if signed out / unknown. */
export async function getCurrentUser() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return null
  }

  const { data: userProfile, error } = await supabase
    .from('users')
    .select('id, name, email, is_admin, is_dpr_lead')
    .eq('email', user.email ?? '')
    .single()

  if (error || !userProfile) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return userProfile
}
