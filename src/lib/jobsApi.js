import { supabase } from './supabase';
import { DEMO_MODE } from '../config';
import { seedJobs } from './seed';

// ---------------- Demo (localStorage) store ----------------
const LS_KEY = 'nsc_demo_jobs_v1';
const LS_AUTH = 'nsc_demo_admin';

function demoRead() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seedJobs();
  demoWrite(seeded);
  return seeded;
}
function demoWrite(jobs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(jobs)); } catch {}
}
const uid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

const sortJobs = (a, b) =>
  (b.posted_at || '').localeCompare(a.posted_at || '') ||
  (b.created_at || '').localeCompare(a.created_at || '');

// ---------------- Public API ----------------
export async function fetchJobs({ includeInactive = false } = {}) {
  if (DEMO_MODE) {
    const jobs = demoRead();
    return (includeInactive ? jobs : jobs.filter((j) => j.is_active)).sort(sortJobs);
  }
  let q = supabase.from('jobs').select('*')
    .order('posted_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function fetchJob(id) {
  if (DEMO_MODE) return demoRead().find((j) => j.id === id) || null;
  const { data, error } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function trackJob(id, kind) {
  try {
    if (DEMO_MODE) {
      const jobs = demoRead();
      const j = jobs.find((x) => x.id === id);
      if (j) {
        if (kind === 'apply') j.apply_clicks = (j.apply_clicks || 0) + 1;
        if (kind === 'view') j.views = (j.views || 0) + 1;
        demoWrite(jobs);
      }
      return;
    }
    await supabase.rpc('track_job', { job_id: id, kind });
  } catch {}
}

// ---------------- Admin API ----------------
export async function saveJob(job) {
  const clean = { ...job };
  delete clean.created_at;
  if (!clean.id) { delete clean.id; delete clean.apply_clicks; delete clean.views; }
  if (DEMO_MODE) {
    const jobs = demoRead();
    if (clean.id) {
      const i = jobs.findIndex((j) => j.id === clean.id);
      if (i >= 0) jobs[i] = { ...jobs[i], ...clean };
    } else {
      jobs.unshift({ ...clean, id: uid(), created_at: new Date().toISOString(), apply_clicks: 0, views: 0 });
    }
    demoWrite(jobs);
    return;
  }
  if (clean.id) {
    const { error } = await supabase.from('jobs').update(clean).eq('id', clean.id);
    if (error) throw error;
  } else {
    delete clean.id;
    const { error } = await supabase.from('jobs').insert(clean);
    if (error) throw error;
  }
}

export async function deleteJob(id) {
  if (DEMO_MODE) return demoWrite(demoRead().filter((j) => j.id !== id));
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) throw error;
}

export async function adminLogin(email, password) {
  if (DEMO_MODE) throw new Error('Add your Supabase keys to the .env file first (see README)');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return true;
}

export async function adminSession() {
  if (DEMO_MODE) return localStorage.getItem(LS_AUTH) === '1';
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function adminLogout() {
  if (DEMO_MODE) return localStorage.removeItem(LS_AUTH);
  await supabase.auth.signOut();
}
