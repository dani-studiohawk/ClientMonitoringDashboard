-- sprints had two identical BEFORE INSERT/UPDATE triggers running
-- auto_set_sprint_status(). Keep one.
DROP TRIGGER IF EXISTS set_sprint_status_on_insert_update ON public.sprints;
