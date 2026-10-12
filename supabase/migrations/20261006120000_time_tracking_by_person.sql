-- Hours by task category for each person's own time (Reports > Time Tracking
-- summary cards). get_time_tracking_analytics() groups by the client's DPR lead,
-- so a lead's card picked up everyone's time on their clients. This groups by
-- who logged the time, and averages every category over the same count: the
-- completed, fully tracked sprints that person logged time on.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_time_tracking_by_person()
 RETURNS TABLE(user_id uuid, task_category text, sprint_count bigint, total_hours numeric, avg_hours numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH eligible AS (
        SELECT te.user_id, te.sprint_id, te.task_category, te.hours
        FROM time_entries te
        JOIN sprints s ON te.sprint_id = s.id
        JOIN clients c ON s.client_id = c.id
        WHERE
            ((SELECT public.is_current_user_admin()) OR (SELECT auth.role()) = 'service_role')
            AND s.status = 'completed'
            AND s.tracking_status = 'fully_tracked'
            AND c.dpr_lead_id IS NOT NULL
    ),
    person_sprints AS (
        SELECT e.user_id, COUNT(DISTINCT e.sprint_id) AS sprint_count
        FROM eligible e
        GROUP BY e.user_id
    )
    SELECT
        e.user_id,
        INITCAP(COALESCE(e.task_category, 'Uncategorized')) AS task_category,
        ps.sprint_count,
        SUM(e.hours) AS total_hours,
        ROUND(SUM(e.hours)::numeric / ps.sprint_count, 1) AS avg_hours
    FROM eligible e
    JOIN person_sprints ps ON ps.user_id = e.user_id
    GROUP BY e.user_id, INITCAP(COALESCE(e.task_category, 'Uncategorized')), ps.sprint_count
    ORDER BY e.user_id, task_category;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_time_tracking_by_person() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_time_tracking_by_person() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_time_tracking_by_person() TO service_role;

COMMIT;
