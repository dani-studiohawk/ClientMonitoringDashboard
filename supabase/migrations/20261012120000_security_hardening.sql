-- Security hardening from the October 2026 audit.
--
-- 1. Table privileges: the web app only reads tables (all writes go through the
--    edge functions as service_role, or SECURITY DEFINER admin functions), so
--    anon gets nothing and authenticated gets SELECT only. RLS stays on; this
--    removes TRUNCATE/TRIGGER/etc., which RLS does not cover.
-- 2. clients/sprints: "any signed-in user" now means a StudioHawk address, so
--    the data no longer depends solely on the auth.users domain trigger.
-- 3. get_sprint_hours bypasses time_entries RLS, so apply the same domain check.

BEGIN;

REVOKE ALL ON public.clients, public.sprints, public.sync_logs,
              public.time_entries, public.users, public.client_admin_actions
  FROM anon, authenticated;
GRANT SELECT ON public.clients, public.sprints, public.sync_logs,
                public.time_entries, public.users, public.client_admin_actions
  TO authenticated;

DROP POLICY IF EXISTS "clients_select_all_authenticated" ON public.clients;
CREATE POLICY "clients_select_all_authenticated" ON public.clients
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (lower((SELECT public.auth_email())) LIKE '%@studiohawk.com.au');

DROP POLICY IF EXISTS "sprints_select_all_authenticated" ON public.sprints;
CREATE POLICY "sprints_select_all_authenticated" ON public.sprints
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (lower((SELECT public.auth_email())) LIKE '%@studiohawk.com.au');

CREATE OR REPLACE FUNCTION public.get_sprint_hours(sprint_ids uuid[])
 RETURNS TABLE(sprint_id uuid, total_hours numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    te.sprint_id,
    COALESCE(SUM(te.hours), 0) as total_hours
  FROM time_entries te
  WHERE te.sprint_id = ANY(sprint_ids)
    AND (
      lower((SELECT public.auth_email())) LIKE '%@studiohawk.com.au'
      OR (SELECT auth.role()) = 'service_role'
    )
  GROUP BY te.sprint_id;
$function$;

COMMIT;
