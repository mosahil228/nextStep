// ============================================================
//  Visitor analytics — anonymous, no cookies, no personal data.
//  Each browser gets a random id so we can count unique visitors per day.
// ============================================================
import { supabase } from './supabase';
import { DEMO_MODE } from '../config';

const VID_KEY = 'nsc_vid';
const SRC_KEY = 'nsc_src';
const DEMO_KEY = 'nsc_demo_visits_v1';
const ADMIN_KEY = 'nsc_is_admin'; // set on your own browser after admin login → your visits are not counted

const rid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

function visitorId() {
  let id = localStorage.getItem(VID_KEY);
  if (!id) { id = rid(); localStorage.setItem(VID_KEY, id); }
  return id;
}

const isApp = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true ||
  new URLSearchParams(location.search).get('source') === 'app';

// Where did this visitor come from? (decided once per browsing session)
function detectSource() {
  const cached = sessionStorage.getItem(SRC_KEY);
  if (cached) return cached;
  const q = new URLSearchParams(location.search);
  const tag = (q.get('ref') || q.get('utm_source') || q.get('source') || '').toLowerCase();
  const ref = (document.referrer || '').toLowerCase();
  const sameSite = ref && new URL(document.referrer).host === location.host;
  let src = 'Direct';
  const test = (s) => tag.includes(s) || (!sameSite && ref.includes(s));
  if (isApp()) src = 'Installed app';
  else if (test('telegram') || test('t.me') || tag === 'tg') src = 'Telegram';
  else if (test('whatsapp') || test('wa.me') || tag === 'wa') src = 'WhatsApp';
  else if (test('instagram')) src = 'Instagram';
  else if (test('linkedin') || test('lnkd')) src = 'LinkedIn';
  else if (test('facebook') || test('fb.')) src = 'Facebook';
  else if (test('youtube')) src = 'YouTube';
  else if (test('twitter') || test('x.com') || test('t.co')) src = 'X / Twitter';
  else if (test('google')) src = 'Google';
  else if (test('bing') || test('duckduckgo') || test('yahoo')) src = 'Other search';
  else if (tag) src = tag.charAt(0).toUpperCase() + tag.slice(1);
  else if (ref && !sameSite) src = 'Other website';
  sessionStorage.setItem(SRC_KEY, src);
  return src;
}

function device() {
  const ua = navigator.userAgent;
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'Tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

let lastPath = '', lastAt = 0;

export function markAsAdmin() { localStorage.setItem(ADMIN_KEY, '1'); }

export async function trackPageView(path) {
  try {
    if (path.startsWith('/admin') || localStorage.getItem(ADMIN_KEY) === '1') return;
    if (/bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent)) return;
    const now = Date.now();
    if (path === lastPath && now - lastAt < 3000) return; // ignore double-fires
    lastPath = path; lastAt = now;

    const row = { visitor_id: visitorId(), path, source: detectSource(), device: device(), is_app: isApp() };
    if (DEMO_MODE) {
      const all = demoRows();
      all.push({ ...row, created_at: new Date().toISOString() });
      localStorage.setItem(DEMO_KEY, JSON.stringify(all.slice(-15000)));
      return;
    }
    await supabase.from('visits').insert(row);
  } catch {}
}

// ---------------- Dashboard data ----------------
export async function fetchVisitStats(days = 30) {
  if (!DEMO_MODE) {
    const { data, error } = await supabase.rpc('visit_stats', { days_back: days });
    if (error) throw error;
    return data;
  }
  return computeStats(demoRows(), days);
}

const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// Same numbers as the SQL function, computed in the browser (demo mode)
function computeStats(rows, days) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - (days - 1));
  const v = rows.filter((r) => new Date(r.created_at) >= start).map((r) => ({ ...r, d: dayKey(r.created_at) }));
  const uniq = (arr) => new Set(arr.map((r) => r.visitor_id)).size;
  const group = (key) => {
    const m = {};
    v.forEach((r) => { (m[r[key] || 'Unknown'] ||= new Set()).add(r.visitor_id); });
    return Object.entries(m).map(([name, s]) => ({ name, visitors: s.size })).sort((a, b) => b.visitors - a.visitors);
  };
  const daily = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const k = dayKey(d);
    const rs = v.filter((r) => r.d === k);
    daily.push({ day: k, visitors: uniq(rs), views: rs.length });
  }
  const tk = dayKey(today);
  const pages = {};
  v.forEach((r) => { pages[r.path] = (pages[r.path] || 0) + 1; });
  return {
    daily,
    today_visitors: uniq(v.filter((r) => r.d === tk)),
    today_views: v.filter((r) => r.d === tk).length,
    period_visitors: uniq(v),
    period_views: v.length,
    app_visitors: uniq(v.filter((r) => r.is_app)),
    online_now: uniq(rows.filter((r) => Date.now() - new Date(r.created_at) < 5 * 60000)),
    all_time_visitors: uniq(rows),
    sources: group('source'),
    devices: group('device'),
    top_pages: Object.entries(pages).map(([name, views]) => ({ name, views })).sort((a, b) => b.views - a.views).slice(0, 8),
  };
}

// Demo mode: fake 90 days of history so the dashboard shows how it will look
function demoRows() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const sources = ['Telegram', 'Telegram', 'Telegram', 'WhatsApp', 'WhatsApp', 'Google', 'Direct', 'Direct', 'Instagram', 'Installed app', 'LinkedIn'];
  const paths = ['/', '/', '/', '/jobs', '/jobs', '/jobs?level=fresher', '/job/demo-1', '/job/demo-2', '/job/demo-3', '/ats', '/saved', '/job/demo-7'];
  const rows = [];
  for (let day = 89; day >= 0; day--) {
    const base = 14 + (89 - day) * 0.55;
    const dow = new Date(Date.now() - day * 86400000).getDay();
    const n = Math.round(base * (dow === 0 || dow === 6 ? 0.7 : 1) * (0.75 + rnd() * 0.5));
    for (let i = 0; i < n; i++) {
      const vid = `demo-v${day}-${i}`;
      const src = pick(sources);
      const dev = rnd() < 0.78 ? 'Mobile' : rnd() < 0.9 ? 'Desktop' : 'Tablet';
      const views = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < views; k++) {
        const t = new Date(Date.now() - day * 86400000);
        t.setHours(Math.floor(rnd() * 24), Math.floor(rnd() * 60));
        if (t > new Date()) t.setTime(Date.now() - rnd() * 3600000);
        rows.push({ visitor_id: vid, path: pick(paths), source: src, device: dev, is_app: src === 'Installed app', created_at: t.toISOString() });
      }
    }
  }
  localStorage.setItem(DEMO_KEY, JSON.stringify(rows));
  return rows;
}
