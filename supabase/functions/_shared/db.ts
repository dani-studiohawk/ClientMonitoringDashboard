import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Untyped (any-schema) client, as the functions have always used. Newer
// supabase-js defaults the schema generics to `never` when they're omitted,
// which is what `ReturnType<typeof createClient>` / bare `SupabaseClient` gave.
// deno-lint-ignore no-explicit-any
export type DbClient = SupabaseClient<any, 'public', any>

export function createDbClient(url: string, key: string): DbClient {
  return createClient(url, key)
}

/** Message from anything thrown. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
