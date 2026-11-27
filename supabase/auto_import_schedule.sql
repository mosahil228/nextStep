-- ============================================================
--  NextStep Career — run the auto-import every day at 9:00 AM IST
--  Do this LAST (after the function is deployed and tested).
--  Before running:
--   1. Database → Extensions: turn ON  pg_cron  and  pg_net
--   2. Replace the two values below:
--        YOUR-PROJECT-REF  → from your Supabase URL  https://YOUR-PROJECT-REF.supabase.co
--        YOUR-IMPORT-SECRET → the same IMPORT_SECRET you set for the function
-- ============================================================

-- Store the two values safely in Supabase Vault (run once)
select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'nsc_project_url');
select vault.create_secret('YOUR-IMPORT-SECRET', 'nsc_import_secret');

-- 9:00 AM IST = 03:30 UTC
select cron.schedule(
  'nextstep-daily-import',
  '30 3 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'nsc_project_url') || '/functions/v1/daily-import',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-import-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'nsc_import_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Useful later:
--   See runs:      select * from cron.job_run_details order by start_time desc limit 10;
--   Change time:   run cron.schedule again with the same name and a new time
--   Turn it off:   select cron.unschedule('nextstep-daily-import');
