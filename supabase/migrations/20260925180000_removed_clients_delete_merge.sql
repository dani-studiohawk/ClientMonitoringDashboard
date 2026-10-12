-- Delete or merge clients removed from Monday (admins only), with a history.
--
-- Delete: only when nothing recorded would be lost, i.e. the client has no time
-- entries and no sprint with KPI results. Its sprints (Monday copies) go too.
-- Merge: for an item deleted and re-created in Monday. Moves every time entry to
-- the live copy with the same name, re-matches each to that copy's sprint by date
-- (same rule as sync-clockify), deletes the old copy, and starts a metrics run so
-- sprint totals catch up. Refused if the old copy has sprints with KPI results.
-- Both are recorded in client_admin_actions, shown on /dashboard/removed-clients.

BEGIN;

CREATE TABLE IF NOT EXISTS public.client_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('deleted', 'merged')),
  client_id uuid NOT NULL,
  client_name text NOT NULL,
  region text,
  merged_into_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  merged_into_client_name text,
  time_entries_moved integer NOT NULL DEFAULT 0,
  hours_moved numeric NOT NULL DEFAULT 0,
  sprints_deleted integer NOT NULL DEFAULT 0,
  performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_admin_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_admin_actions_select_admin" ON public.client_admin_actions;
CREATE POLICY "client_admin_actions_select_admin" ON public.client_admin_actions
  FOR SELECT TO authenticated USING ((SELECT public.is_current_user_admin()));
-- Written only by the functions below; nobody else needs anything but SELECT.
REVOKE ALL ON public.client_admin_actions FROM anon, authenticated;
GRANT SELECT ON public.client_admin_actions TO authenticated;

-- Same list as before, plus what decides whether delete is allowed.
DROP FUNCTION IF EXISTS public.get_removed_clients();
CREATE FUNCTION public.get_removed_clients()
RETURNS TABLE (
  id uuid,
  name text,
  region text,
  group_name text,
  is_active boolean,
  dpr_lead_name text,
  monday_removed_at timestamptz,
  removal_decision text,
  removal_reviewed_at timestamptz,
  hours_total numeric,
  hours_last_30_days numeric,
  last_time_entry date,
  replacement_client_id uuid,
  replacement_client_name text,
  time_entry_count integer,
  sprint_count integer,
  has_kpi_results boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id, c.name, c.region, c.group_name, c.is_active,
    u.name AS dpr_lead_name,
    c.monday_removed_at, c.removal_decision, c.removal_reviewed_at,
    COALESCE(t.hours_total, 0), COALESCE(t.hours_last_30_days, 0), t.last_time_entry,
    r.id, r.name,
    COALESCE(t.entry_count, 0), COALESCE(s.sprint_count, 0), COALESCE(s.has_kpi_results, false)
  FROM clients c
  LEFT JOIN users u ON u.id = c.dpr_lead_id
  LEFT JOIN LATERAL (
    SELECT
      ROUND(SUM(te.hours)::numeric, 1) AS hours_total,
      ROUND(SUM(te.hours) FILTER (WHERE te.entry_date >= CURRENT_DATE - 30)::numeric, 1) AS hours_last_30_days,
      MAX(te.entry_date) AS last_time_entry,
      COUNT(*)::integer AS entry_count
    FROM time_entries te WHERE te.client_id = c.id
  ) t ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS sprint_count, bool_or(COALESCE(sp.kpi_achieved, 0) > 0) AS has_kpi_results
    FROM sprints sp WHERE sp.client_id = c.id
  ) s ON true
  -- A live client with the same name: the item was probably re-created in Monday
  LEFT JOIN LATERAL (
    SELECT c2.id, c2.name FROM clients c2
    WHERE lower(c2.name) = lower(c.name) AND c2.id <> c.id AND c2.monday_removed_at IS NULL
    ORDER BY c2.monday_last_seen_at DESC NULLS LAST
    LIMIT 1
  ) r ON true
  WHERE c.monday_removed_at IS NOT NULL
    AND ((SELECT public.is_current_user_admin()) OR (SELECT auth.role()) = 'service_role')
  ORDER BY (c.removal_reviewed_at IS NOT NULL), c.monday_removed_at DESC;
$function$;

-- The sprint a time entry on this date belongs to, mirroring findSprintForDate in
-- sync-clockify: the sprint covering the date (on a boundary, the one ending
-- that day), else the first sprint when the entry is up to 14 days before it
-- (and not before the campaign start), else none.
CREATE OR REPLACE FUNCTION public.sprint_for_entry(p_client_id uuid, p_entry_date date)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT s.id FROM sprints s
      WHERE s.client_id = p_client_id AND s.start_date <= p_entry_date AND s.end_date >= p_entry_date
      ORDER BY (s.end_date = p_entry_date) DESC, s.start_date
      LIMIT 1),
    (SELECT f.id FROM (
        SELECT s.id, s.start_date FROM sprints s WHERE s.client_id = p_client_id ORDER BY s.start_date LIMIT 1
      ) f, clients c
      WHERE c.id = p_client_id
        AND p_entry_date < f.start_date
        AND p_entry_date >= GREATEST(f.start_date - 14, COALESCE(c.campaign_start_date, f.start_date - 14)))
  );
$function$;

CREATE OR REPLACE FUNCTION public.delete_removed_client(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client clients%ROWTYPE;
  v_sprints integer;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can delete clients' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_client FROM clients WHERE id = p_client_id AND monday_removed_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client is not flagged as removed from Monday' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM time_entries WHERE client_id = p_client_id) THEN
    RAISE EXCEPTION 'Client has time logged, so it can''t be deleted. Move it to inactive, or merge it.' USING ERRCODE = '23503';
  END IF;
  IF EXISTS (SELECT 1 FROM sprints WHERE client_id = p_client_id AND COALESCE(kpi_achieved, 0) > 0) THEN
    RAISE EXCEPTION 'Client has sprints with KPI results, so it can''t be deleted. Move it to inactive.' USING ERRCODE = '23503';
  END IF;

  SELECT COUNT(*) INTO v_sprints FROM sprints WHERE client_id = p_client_id;

  INSERT INTO client_admin_actions (action, client_id, client_name, region, sprints_deleted, performed_by)
  VALUES ('deleted', v_client.id, v_client.name, v_client.region, v_sprints,
          (SELECT id FROM users WHERE email = public.auth_email()));

  DELETE FROM clients WHERE id = p_client_id;  -- sprints cascade
END;
$function$;

CREATE OR REPLACE FUNCTION public.merge_removed_client(p_client_id uuid, p_into_client_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client clients%ROWTYPE;
  v_target clients%ROWTYPE;
  v_sprints integer;
  v_moved integer;
  v_hours numeric;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can merge clients' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_client FROM clients WHERE id = p_client_id AND monday_removed_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client is not flagged as removed from Monday' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_target FROM clients
    WHERE id = p_into_client_id AND id <> p_client_id AND monday_removed_at IS NULL
      AND lower(name) = lower(v_client.name)
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Can only merge into a live client with the same name' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM sprints WHERE client_id = p_client_id AND COALESCE(kpi_achieved, 0) > 0) THEN
    RAISE EXCEPTION 'Client has sprints with KPI results, so it can''t be merged. Move it to inactive.' USING ERRCODE = '23503';
  END IF;

  SELECT COUNT(*), COALESCE(ROUND(SUM(hours)::numeric, 2), 0) INTO v_moved, v_hours
    FROM time_entries WHERE client_id = p_client_id;
  SELECT COUNT(*) INTO v_sprints FROM sprints WHERE client_id = p_client_id;

  UPDATE time_entries SET
    client_id = p_into_client_id,
    sprint_id = public.sprint_for_entry(p_into_client_id, entry_date),
    updated_at = now()
  WHERE client_id = p_client_id;

  INSERT INTO client_admin_actions
    (action, client_id, client_name, region, merged_into_client_id, merged_into_client_name,
     time_entries_moved, hours_moved, sprints_deleted, performed_by)
  VALUES ('merged', v_client.id, v_client.name, v_client.region, v_target.id, v_target.name,
          v_moved, v_hours, v_sprints, (SELECT id FROM users WHERE email = public.auth_email()));

  DELETE FROM clients WHERE id = p_client_id;  -- sprints cascade

  -- Recalculate stored sprint hours now rather than at the next scheduled run.
  -- pg_net sends it after this transaction commits; it's skipped if it rolls back.
  IF v_moved > 0 THEN
    PERFORM net.http_post(
      url := 'https://ylnrkfpchrzvuhqrnwco.supabase.co/functions/v1/calculate-all-metrics',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret'),
        'Content-Type', 'application/json'),
      body := '{"trigger": "client_merge", "skipReports": true}'::jsonb);
  END IF;

  RETURN v_moved;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_removed_clients() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sprint_for_entry(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_removed_client(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.merge_removed_client(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_removed_clients() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sprint_for_entry(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_removed_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_removed_client(uuid, uuid) TO authenticated;

COMMIT;
