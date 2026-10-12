-- One log of every decision on a removed client: "Move to inactive" and
-- "Keep active" are now recorded in client_admin_actions alongside deletes and
-- merges, so /dashboard/removed-clients can show a single history. Decisions
-- made before this migration are copied in from the clients table.

BEGIN;

ALTER TABLE public.client_admin_actions DROP CONSTRAINT IF EXISTS client_admin_actions_action_check;
ALTER TABLE public.client_admin_actions ADD CONSTRAINT client_admin_actions_action_check
  CHECK (action IN ('inactive', 'keep', 'deleted', 'merged'));

CREATE OR REPLACE FUNCTION public.review_removed_client(p_client_id uuid, p_decision text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client clients%ROWTYPE;
  v_user uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can review removed clients' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('inactive', 'keep') THEN
    RAISE EXCEPTION 'Decision must be inactive or keep' USING ERRCODE = '22023';
  END IF;

  v_user := (SELECT id FROM users WHERE email = public.auth_email());

  UPDATE clients SET
    removal_decision = p_decision,
    removal_reviewed_at = now(),
    removal_reviewed_by = v_user,
    is_active = CASE WHEN p_decision = 'inactive' THEN false ELSE is_active END
  WHERE id = p_client_id AND monday_removed_at IS NOT NULL
  RETURNING * INTO v_client;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client is not flagged as removed from Monday' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO client_admin_actions (action, client_id, client_name, region, performed_by)
  VALUES (p_decision, v_client.id, v_client.name, v_client.region, v_user);
END;
$function$;

-- Earlier decisions (once only)
INSERT INTO public.client_admin_actions (action, client_id, client_name, region, performed_by, performed_at)
SELECT c.removal_decision, c.id, c.name, c.region, c.removal_reviewed_by, c.removal_reviewed_at
FROM public.clients c
WHERE c.removal_reviewed_at IS NOT NULL AND c.removal_decision IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.client_admin_actions a
    WHERE a.client_id = c.id AND a.action = c.removal_decision
  );

REVOKE EXECUTE ON FUNCTION public.review_removed_client(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_removed_client(uuid, text) TO authenticated, service_role;

COMMIT;
