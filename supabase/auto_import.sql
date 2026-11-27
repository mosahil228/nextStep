-- ============================================================
--  NextStep Career — AUTO-IMPORT (daily job feed)
--  Paste this whole file in Supabase → SQL Editor → Run.
--  Safe to run again.
--
--  This file does NOT change your existing "jobs" table or the
--  jobs you already posted. Imported jobs wait in a separate
--  table (job_queue). A job is copied into "jobs" only when you
--  approve it (or when auto-publish is on).
-- ============================================================

-- 1) Waiting room for imported jobs
create table if not exists public.job_queue (
  id                uuid primary key default gen_random_uuid(),
  source            text not null,                 -- adzuna / greenhouse / lever
  source_id         text not null,                 -- the job's id at the source
  company           text not null,
  role              text not null,
  location          text default 'India',
  job_type          text default 'Full-time',
  work_mode         text default 'On-site',
  exp_min           int  default 0,
  exp_max           int  default 0,
  salary            text,
  skills            text[] default '{}',
  description       text not null,
  apply_link        text not null,
  logo_url          text,
  logo_source       text,                          -- known / apply-link / guess / null
  company_domain    text,
  category          text default 'IT',             -- IT / Non-IT
  tag_reason        text,                          -- why it was tagged fresher/experienced
  flag_reason       text,                          -- set when it looks like a scam
  status            text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  job_id            uuid,                          -- the row created in jobs on approve
  source_posted_at  timestamptz,
  fetched_at        timestamptz default now(),
  reviewed_at       timestamptz,
  unique (source, source_id)
);

create index if not exists job_queue_status_idx on public.job_queue (status, fetched_at desc);

alter table public.job_queue enable row level security;

-- Only the logged-in admin can see or change the queue. Visitors see nothing.
drop policy if exists "admin manage queue" on public.job_queue;
create policy "admin manage queue" on public.job_queue
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.job_queue to authenticated;
grant all on public.job_queue to service_role;
revoke all on public.job_queue from anon;

-- 2) Settings (one row)
create table if not exists public.import_settings (
  id            int primary key default 1 check (id = 1),
  auto_publish  boolean default false,   -- false = review queue (recommended)
  daily_it      int default 12,          -- how many IT jobs to queue per day
  daily_non_it  int default 5,           -- how many non-IT jobs to queue per day
  last_run_at   timestamptz,
  last_run      jsonb
);
insert into public.import_settings (id) values (1) on conflict (id) do nothing;

alter table public.import_settings enable row level security;
drop policy if exists "admin manage import settings" on public.import_settings;
create policy "admin manage import settings" on public.import_settings
  for all to authenticated using (true) with check (true);

grant select, insert, update on public.import_settings to authenticated;
grant all on public.import_settings to service_role;
revoke all on public.import_settings from anon;

-- 3) Approve = copy the queued job into your normal jobs table
create or replace function public.approve_queued_jobs(ids uuid[])
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
  new_id uuid;
  n int := 0;
begin
  for r in
    select * from job_queue where id = any(ids) and status = 'pending' for update
  loop
    insert into jobs (company, role, location, job_type, work_mode, exp_min, exp_max,
                      salary, skills, description, apply_link, logo_url, posted_at, is_active)
    values (r.company, r.role, r.location, r.job_type, r.work_mode, r.exp_min, r.exp_max,
            r.salary, r.skills, r.description, r.apply_link, r.logo_url, current_date, true)
    returning id into new_id;

    update job_queue set status = 'approved', job_id = new_id, reviewed_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.approve_queued_jobs(uuid[]) from public, anon;
grant execute on function public.approve_queued_jobs(uuid[]) to authenticated, service_role;
