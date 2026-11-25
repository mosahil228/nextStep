-- ============================================================
--  NextStep Career — Supabase database setup
--  Paste this whole file in Supabase → SQL Editor → Run
-- ============================================================

create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  company       text not null,
  role          text not null,
  location      text default 'Remote',
  job_type      text default 'Full-time',      -- Full-time / Internship / Contract / Part-time
  work_mode     text default 'On-site',        -- On-site / Remote / Hybrid
  exp_min       int  default 0,                -- years
  exp_max       int  default 0,                -- years
  salary        text,
  skills        text[] default '{}',
  description   text not null,                 -- full JD
  apply_link    text not null,
  logo_url      text,
  posted_at     date default current_date,
  is_active     boolean default true,
  apply_clicks  int default 0,
  views         int default 0,
  created_at    timestamptz default now()
);

create index if not exists jobs_posted_idx on public.jobs (posted_at desc, created_at desc);

alter table public.jobs enable row level security;

-- Everyone (visitors) can read active jobs
drop policy if exists "public read active jobs" on public.jobs;
create policy "public read active jobs" on public.jobs
  for select using (is_active = true or auth.role() = 'authenticated');

-- Only logged-in admin can add / edit / delete
drop policy if exists "admin insert" on public.jobs;
create policy "admin insert" on public.jobs for insert to authenticated with check (true);
drop policy if exists "admin update" on public.jobs;
create policy "admin update" on public.jobs for update to authenticated using (true);
drop policy if exists "admin delete" on public.jobs;
create policy "admin delete" on public.jobs for delete to authenticated using (true);

-- Safe counters visitors are allowed to bump (used for "Trending")
create or replace function public.track_job(job_id uuid, kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if kind = 'apply' then
    update jobs set apply_clicks = apply_clicks + 1 where id = job_id;
  elsif kind = 'view' then
    update jobs set views = views + 1 where id = job_id;
  end if;
end; $$;

grant execute on function public.track_job(uuid, text) to anon, authenticated;

-- ============================================================
--  VISITOR ANALYTICS (daily visitors, page views, sources…)
--  Safe to run again. Visitors are anonymous random IDs.
-- ============================================================
create table if not exists public.visits (
  id          bigint generated always as identity primary key,
  visitor_id  text not null,           -- random anonymous id stored in the visitor's browser
  path        text,                    -- page visited, e.g. /job/123
  source      text,                    -- Telegram / WhatsApp / Google / Direct / App …
  device      text,                    -- Mobile / Desktop / Tablet
  is_app      boolean default false,   -- opened from the installed home-screen app
  created_at  timestamptz default now()
);
create index if not exists visits_created_idx on public.visits (created_at desc);

alter table public.visits enable row level security;

-- visitors can only ADD a visit row (they can't read anyone's data)
drop policy if exists "log a visit" on public.visits;
create policy "log a visit" on public.visits for insert to anon, authenticated
  with check (char_length(visitor_id) <= 64 and char_length(coalesce(path, '')) <= 300);

-- only you (logged-in admin) can read / clean up visits
drop policy if exists "admin read visits" on public.visits;
create policy "admin read visits" on public.visits for select to authenticated using (true);
drop policy if exists "admin delete visits" on public.visits;
create policy "admin delete visits" on public.visits for delete to authenticated using (true);

-- All numbers for the dashboard in one call (times in Indian time)
create or replace function public.visit_stats(days_back int default 30, tz text default 'Asia/Kolkata')
returns json language plpgsql security invoker set search_path = public as $$
declare
  today     date := (now() at time zone tz)::date;
  start_day date := (now() at time zone tz)::date - (days_back - 1);
  result    json;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Only the admin can see analytics';
  end if;

  with v as (
    select visitor_id, path, source, device, is_app, (created_at at time zone tz)::date as d
    from visits
    where created_at >= (start_day::timestamp at time zone tz)
  )
  select json_build_object(
    'daily', (
      select coalesce(json_agg(json_build_object('day', g.day::date, 'visitors', coalesce(c.visitors, 0), 'views', coalesce(c.views, 0)) order by g.day), '[]'::json)
      from generate_series(start_day, today, interval '1 day') as g(day)
      left join (select d, count(distinct visitor_id) as visitors, count(*) as views from v group by d) c on c.d = g.day::date
    ),
    'today_visitors',    (select count(distinct visitor_id) from v where d = today),
    'today_views',       (select count(*) from v where d = today),
    'period_visitors',   (select count(distinct visitor_id) from v),
    'period_views',      (select count(*) from v),
    'app_visitors',      (select count(distinct visitor_id) from v where is_app),
    'online_now',        (select count(distinct visitor_id) from visits where created_at > now() - interval '5 minutes'),
    'all_time_visitors', (select count(distinct visitor_id) from visits),
    'sources', (select coalesce(json_agg(x order by x.visitors desc), '[]'::json)
                from (select coalesce(source, 'Direct') as name, count(distinct visitor_id) as visitors from v group by 1) x),
    'devices', (select coalesce(json_agg(x order by x.visitors desc), '[]'::json)
                from (select coalesce(device, 'Unknown') as name, count(distinct visitor_id) as visitors from v group by 1) x),
    'top_pages', (select coalesce(json_agg(x order by x.views desc), '[]'::json)
                  from (select path as name, count(*) as views from v group by path order by count(*) desc limit 8) x)
  ) into result;

  return result;
end; $$;

grant execute on function public.visit_stats(int, text) to authenticated;

-- ============================================================
--  API ACCESS (needed when "Grant API access to new tables
--  automatically" was left unticked when creating the project).
--  Safe to run again. Row Level Security above still decides
--  which rows each person can see or change.
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;

grant insert on public.visits to anon, authenticated;
grant select, delete on public.visits to authenticated;
grant usage, select on sequence public.visits_id_seq to anon, authenticated;
