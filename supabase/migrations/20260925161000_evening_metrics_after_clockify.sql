-- Run the evening metrics calculation 15 minutes after the Clockify sync.
--
-- Both used to start at 18:00 UTC. The metrics run takes ~3 s and the Clockify
-- sync ~90 s, so the evening metrics were calculated before that day's hours
-- arrived (the 06:00 run caught up the next morning).

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'calculate-all-metrics-evening'),
  schedule := '15 18 * * *'
);

SELECT jobname, schedule FROM cron.job ORDER BY schedule;
