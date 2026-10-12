-- Reports > Time Tracking: only count a sprint towards a person's averages when
-- they logged more than 5 hours on it. Small contributions to other people's
-- campaigns (covering a meeting, reviewing a release) were each counting as a
-- whole sprint and pulling the averages down. Hours on those sprints are left
-- out too, so every category is still averaged over the same sprints.

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
    counted_sprints AS (
        SELECT e.user_id, e.sprint_id
        FROM eligible e
        GROUP BY e.user_id, e.sprint_id
        HAVING SUM(e.hours) > 5
    ),
    counted AS (
        SELECT e.*
        FROM eligible e
        JOIN counted_sprints cs ON cs.user_id = e.user_id AND cs.sprint_id = e.sprint_id
    ),
    person_sprints AS (
        SELECT cs.user_id, COUNT(*) AS sprint_count
        FROM counted_sprints cs
        GROUP BY cs.user_id
    )
    SELECT
        e.user_id,
        INITCAP(COALESCE(e.task_category, 'Uncategorized')) AS task_category,
        ps.sprint_count,
        SUM(e.hours) AS total_hours,
        ROUND(SUM(e.hours)::numeric / ps.sprint_count, 1) AS avg_hours
    FROM counted e
    JOIN person_sprints ps ON ps.user_id = e.user_id
    GROUP BY e.user_id, INITCAP(COALESCE(e.task_category, 'Uncategorized')), ps.sprint_count
    ORDER BY e.user_id, task_category;
$function$;

COMMIT;
