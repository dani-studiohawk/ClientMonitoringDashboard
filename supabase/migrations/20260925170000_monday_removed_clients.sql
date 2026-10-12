-- Track clients that disappear from the Monday boards, and let admins review them.
--
-- sync-monday stamps monday_last_seen_at on every client it reads. After a
-- board is read completely, clients from that board's region that weren't seen
-- get monday_removed_at, and a Slack notification is sent once
-- (removal_notified_at). An admin then reviews each one on
-- /dashboard/removed-clients: "inactive" also sets is_active = false; "keep"
-- leaves it as is. If the item reappears in Monday, the sync clears all of this.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS monday_last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS monday_removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removal_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS removal_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removal_reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS removal_decision text CHECK (removal_decision IN ('inactive', 'keep'));

CREATE INDEX IF NOT EXISTS idx_clients_monday_removed ON public.clients (monday_removed_at)
  WHERE monday_removed_at IS NOT NULL;

-- Removed clients with the context an admin needs to decide (admins, and the
-- sync function via the service role for its Slack message).
CREATE OR REPLACE FUNCTION public.get_removed_clients()
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
  replacement_client_name text
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
    r.id, r.name
  FROM clients c
  LEFT JOIN users u ON u.id = c.dpr_lead_id
  LEFT JOIN LATERAL (
    SELECT
      ROUND(SUM(te.hours)::numeric, 1) AS hours_total,
      ROUND(SUM(te.hours) FILTER (WHERE te.entry_date >= CURRENT_DATE - 30)::numeric, 1) AS hours_last_30_days,
      MAX(te.entry_date) AS last_time_entry
    FROM time_entries te WHERE te.client_id = c.id
  ) t ON true
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

-- Record an admin's decision on a removed client (admins only).
CREATE OR REPLACE FUNCTION public.review_removed_client(p_client_id uuid, p_decision text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can review removed clients' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('inactive', 'keep') THEN
    RAISE EXCEPTION 'Decision must be inactive or keep' USING ERRCODE = '22023';
  END IF;

  UPDATE clients SET
    removal_decision = p_decision,
    removal_reviewed_at = now(),
    removal_reviewed_by = (SELECT id FROM users WHERE email = public.auth_email()),
    is_active = CASE WHEN p_decision = 'inactive' THEN false ELSE is_active END
  WHERE id = p_client_id AND monday_removed_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client is not flagged as removed from Monday' USING ERRCODE = 'P0002';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_removed_clients() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.review_removed_client(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_removed_clients() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_removed_client(uuid, text) TO authenticated, service_role;
