// ============================================================
//  NextStep Career — daily-import (Supabase Edge Function)
//  Runs every morning (Supabase Cron) or from the admin "Run now" button.
//  1. Fetches new jobs (Adzuna + company career pages)
//  2. Removes duplicates and low-quality posts, flags scam-looking ones
//  3. Tags Fresher / Experienced and IT / Non-IT, finds the company logo
//  4. Saves them in job_queue (review) — or publishes clean ones (auto-publish)
//  It never edits or deletes jobs that are already on your site.
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ADZUNA_SEARCHES, GREENHOUSE, INDIA_RE, KNOWN_DOMAINS, LEVER } from './sources.ts';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const IMPORT_SECRET = Deno.env.get('IMPORT_SECRET') ?? '';
const ADZ_ID = Deno.env.get('ADZUNA_APP_ID') ?? '';
const ADZ_KEY = Deno.env.get('ADZUNA_APP_KEY') ?? '';
const LOGO_TOKEN = Deno.env.get('LOGO_DEV_TOKEN') ?? ''; // optional (logo.dev publishable key)

const db = createClient(SB_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-import-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Raw = {
  source: 'adzuna' | 'greenhouse' | 'lever';
  source_id: string;
  company: string;
  role: string;
  location: string;
  description: string;
  apply_link: string;
  posted_at: string | null;
  salary?: string | null;
  domain?: string;
  hint?: 'IT' | 'Non-IT';
  contract?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Allowed: the daily cron (secret header) or a logged-in admin.
  let allowed = !!IMPORT_SECRET && req.headers.get('x-import-secret') === IMPORT_SECRET;
  if (!allowed) {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (token) {
      const { data } = await db.auth.getUser(token);
      allowed = !!data?.user;
    }
  }
  if (!allowed) return json({ error: 'Not allowed' }, 401);

  try {
    return json(await runImport());
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

// ---------------- main ----------------
async function runImport() {
  const { data: settings } = await db.from('import_settings').select('*').eq('id', 1).maybeSingle();
  const s = settings ?? { auto_publish: false, daily_it: 12, daily_non_it: 5 };
  const stats = { fetched: 0, duplicates: 0, low_quality: 0, flagged: 0, queued: 0, published: 0, it: 0, non_it: 0, errors: [] as string[], sources: {} as Record<string, number> };

  // 1) fetch
  const raw: Raw[] = [];
  const tasks: Promise<Raw[]>[] = [fetchAdzuna(stats.errors), ...GREENHOUSE.map(fetchGreenhouse), ...LEVER.map(fetchLever)];
  for (const r of await Promise.allSettled(tasks)) {
    if (r.status === 'fulfilled') raw.push(...r.value);
    else stats.errors.push(String(r.reason?.message || r.reason));
  }
  stats.fetched = raw.length;
  for (const j of raw) stats.sources[j.source] = (stats.sources[j.source] || 0) + 1;

  // 2) duplicates: already queued, already on the site, or repeated in this batch
  const seenIds = new Set<string>();
  const ids = [...new Set(raw.map((j) => j.source_id))];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('job_queue').select('source, source_id').in('source_id', ids.slice(i, i + 200));
    for (const q of data || []) seenIds.add(`${q.source}:${q.source_id}`);
  }
  const since = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);
  const seenKeys = new Set<string>();
  const { data: siteJobs } = await db.from('jobs').select('company, role').gte('posted_at', since);
  for (const j of siteJobs || []) seenKeys.add(key(j.company, j.role));
  const { data: recentQ } = await db.from('job_queue').select('company, role').gte('fetched_at', since);
  for (const j of recentQ || []) seenKeys.add(key(j.company, j.role));

  const fresh: Raw[] = [];
  for (const j of raw) {
    const k = key(j.company, j.role);
    if (seenIds.has(`${j.source}:${j.source_id}`) || seenKeys.has(k)) { stats.duplicates++; continue; }
    seenKeys.add(k);
    fresh.push(j);
  }

  // 3) quality
  const maxAge = Date.now() - 5 * 864e5;
  const good = fresh.filter((j) => {
    const ok = /^https?:\/\//i.test(j.apply_link) && j.company.length > 1 && j.role.length > 2 &&
      j.description.length >= 120 && (!j.posted_at || new Date(j.posted_at).getTime() >= maxAge);
    if (!ok) stats.low_quality++;
    return ok;
  });

  // 4) tag + pick today's mix (career pages first, newest first, fresher/experienced mixed)
  const tagged = good.map(classify).sort((a, b) =>
    (a.source === 'adzuna' ? 1 : 0) - (b.source === 'adzuna' ? 1 : 0) ||
    (new Date(b.source_posted_at || 0).getTime() - new Date(a.source_posted_at || 0).getTime()));
  const flagged = tagged.filter((j) => j.flag_reason).slice(0, 3);
  const clean = tagged.filter((j) => !j.flag_reason);
  const pick = (cat: string, n: number) => {
    const pool = clean.filter((j) => j.category === cat);
    const fr = pool.filter((j) => j.exp_min === 0), ex = pool.filter((j) => j.exp_min > 0);
    const out: typeof pool = [];
    while (out.length < n && (fr.length || ex.length)) {
      if (fr.length) out.push(fr.shift()!);
      if (out.length < n && ex.length) out.push(ex.shift()!);
    }
    return out;
  };
  const chosen = [...pick('IT', s.daily_it ?? 12), ...pick('Non-IT', s.daily_non_it ?? 5)];
  stats.flagged = flagged.length;

  // 5) logos (only for the jobs we keep)
  const all = [...chosen, ...flagged];
  await Promise.all(all.map(async (j) => {
    const logo = await findLogo(j.company, j._domain, j.apply_link);
    j.logo_url = logo.url; j.logo_source = logo.source; j.company_domain = logo.domain;
  }));

  // 6) save
  const rows = all.map(({ _domain, ...r }) => r);
  if (rows.length) {
    const { data: saved, error } = await db.from('job_queue')
      .upsert(rows, { onConflict: 'source,source_id', ignoreDuplicates: true })
      .select('id, flag_reason, category');
    if (error) throw error;
    stats.queued = saved?.length || 0;
    stats.it = (saved || []).filter((r) => r.category === 'IT').length;
    stats.non_it = stats.queued - stats.it;
    if (s.auto_publish) {
      const okIds = (saved || []).filter((r) => !r.flag_reason).map((r) => r.id);
      if (okIds.length) {
        const { data: n, error: e2 } = await db.rpc('approve_queued_jobs', { ids: okIds });
        if (e2) stats.errors.push('auto-publish: ' + e2.message); else stats.published = n || 0;
      }
    }
  }

  // 7) tidy old reviewed rows (keeps the table small; never touches your jobs)
  await db.from('job_queue').delete().neq('status', 'pending').lt('fetched_at', new Date(Date.now() - 90 * 864e5).toISOString());
  await db.from('job_queue').delete().eq('status', 'pending').lt('fetched_at', new Date(Date.now() - 21 * 864e5).toISOString());

  await db.from('import_settings').update({ last_run_at: new Date().toISOString(), last_run: stats }).eq('id', 1);
  return stats;
}

// ---------------- sources ----------------
async function fetchAdzuna(errors: string[]): Promise<Raw[]> {
  if (!ADZ_ID || !ADZ_KEY) { errors.push('Adzuna keys not set (skipped)'); return []; }
  const out: Raw[] = [];
  for (const q of ADZUNA_SEARCHES) {
    const p = new URLSearchParams({
      app_id: ADZ_ID, app_key: ADZ_KEY, results_per_page: '40', what: q.what,
      max_days_old: '3', sort_by: 'date', 'content-type': 'application/json',
    });
    const r = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/1?${p}`);
    if (!r.ok) { errors.push(`Adzuna "${q.what}": HTTP ${r.status}`); await r.body?.cancel(); continue; }
    const d = await r.json();
    for (const j of d.results || []) {
      out.push({
        source: 'adzuna', source_id: String(j.id),
        company: text(j.company?.display_name || ''), role: text(j.title || ''),
        location: text(j.location?.display_name || 'India'), description: text(j.description || ''),
        apply_link: j.redirect_url || '', posted_at: j.created || null,
        salary: salaryText(j), contract: [j.contract_time, j.contract_type].filter(Boolean).join(' '),
        hint: j.category?.tag === 'it-jobs' ? 'IT' : q.group,
      });
    }
  }
  return out;
}

async function fetchGreenhouse(c: { token: string; company: string; domain?: string }): Promise<Raw[]> {
  const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(c.token)}/jobs?content=true`);
  if (!r.ok) { await r.body?.cancel(); throw new Error(`Greenhouse ${c.token}: HTTP ${r.status}`); }
  const d = await r.json();
  return (d.jobs || [])
    .filter((j: any) => INDIA_RE.test(j.location?.name || ''))
    .map((j: any) => ({
      source: 'greenhouse' as const, source_id: `${c.token}-${j.id}`, company: c.company, role: text(j.title),
      location: text(j.location?.name || 'India'), description: htmlToText(decodeEntities(j.content || '')),
      apply_link: j.absolute_url, posted_at: j.first_published || j.updated_at || null, domain: c.domain,
    }));
}

async function fetchLever(c: { site: string; company: string; domain?: string }): Promise<Raw[]> {
  const r = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(c.site)}?mode=json`);
  if (!r.ok) { await r.body?.cancel(); throw new Error(`Lever ${c.site}: HTTP ${r.status}`); }
  const d = await r.json();
  return (d || [])
    .filter((j: any) => INDIA_RE.test(`${j.categories?.location || ''} ${(j.categories?.allLocations || []).join(' ')}`))
    .map((j: any) => {
      const lists = (j.lists || []).map((l: any) => `${text(l.text)}\n${htmlToText(l.content || '')}`).join('\n\n');
      return {
        source: 'lever' as const, source_id: `${c.site}-${j.id}`, company: c.company, role: text(j.text),
        location: text(j.categories?.location || 'India'),
        description: [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join('\n\n').trim(),
        apply_link: j.hostedUrl || j.applyUrl, posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : null,
        domain: c.domain, contract: j.categories?.commitment || '',
      };
    });
}

// ---------------- tagging ----------------
const FRESH_RE = /\b(freshers?|fresh graduates?|graduate trainee|trainee|interns?|internship|entry[\s-]level|apprentice(ship)?|campus hiring|20(2[4-7])\s*batch|batch\s*(of\s*)?20(2[4-7])|0\s*(-|–|to)\s*[12]\s*(years?|yrs))\b/i;
const RANGE_RE = /(\d{1,2})\s*\+?\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs)/i;
const PLUS_RE = /(\d{1,2})\s*\+\s*(?:years?|yrs)|(?:minimum|min\.?|at least)\s*(\d{1,2})\s*(?:years?|yrs)/i;
const SENIOR_RE = /\b(senior|sr\.?|lead|principal|staff|architect|manager|head|director|vp)\b/i;
const NON_IT_RE = /\b(civil|mechanical|electrical|chemical|production|maintenance|site engineer|sales|marketing|business development|bde|hr\b|human resources|recruit|accountant|accounts|finance executive|customer (support|service|care)|telecaller|tele[\s-]?sales|bpo|voice process|back office|data entry|operations executive|field|retail|store|nurse|pharma|teacher|driver|delivery|warehouse)\b/i;
const IT_RE = /\b(software|developer|programmer|sde|full[\s-]?stack|front[\s-]?end|back[\s-]?end|web|mobile|android|ios|flutter|react|angular|vue|node|java|python|golang|\.net|dotnet|php|ruby|devops|sre|cloud|aws|azure|gcp|data (analyst|engineer|scientist)|analytics|machine learning|ml|ai|cyber|security analyst|network engineer|qa|tester|testing|automation|sap|salesforce|servicenow|database|dba|sql|it support|technical support|system administrator|sysadmin|ui|ux|product (manager|designer)|scrum|engineer)\b/i;

const SKILLS: [string, RegExp][] = [
  ['React', /\breact(\.js|js)?\b/i], ['JavaScript', /\bjavascript\b/i], ['TypeScript', /\btypescript\b/i], ['Node.js', /\bnode(\.js|js)?\b/i],
  ['Java', /\bjava\b(?!script)/i], ['Spring Boot', /\bspring boot\b/i], ['Python', /\bpython\b/i], ['Django', /\bdjango\b/i],
  ['SQL', /\bsql\b/i], ['MongoDB', /\bmongo(db)?\b/i], ['PostgreSQL', /\bpostgres(ql)?\b/i], ['AWS', /\baws\b/i],
  ['Azure', /\bazure\b/i], ['GCP', /\bgcp\b|google cloud/i], ['Docker', /\bdocker\b/i], ['Kubernetes', /\bkubernetes|k8s\b/i],
  ['Linux', /\blinux\b/i], ['Git', /\bgit\b/i], ['HTML', /\bhtml5?\b/i], ['CSS', /\bcss3?\b/i], ['Angular', /\bangular\b/i],
  ['Flutter', /\bflutter\b/i], ['Kotlin', /\bkotlin\b/i], ['Swift', /\bswift\b/i], ['C++', /\bc\+\+/i], ['C#', /\bc#/i],
  ['.NET', /\.net\b/i], ['Golang', /\bgolang\b/i], ['PHP', /\bphp\b/i], ['Power BI', /\bpower ?bi\b/i], ['Tableau', /\btableau\b/i],
  ['Excel', /\b(ms )?excel\b/i], ['Machine Learning', /\bmachine learning\b/i], ['Selenium', /\bselenium\b/i],
  ['REST APIs', /\brest(ful)? api/i], ['Microservices', /\bmicroservices?\b/i], ['Salesforce', /\bsalesforce\b/i], ['SAP', /\bsap\b/i],
  ['Communication', /\bcommunication skills?\b/i], ['Customer service', /\bcustomer (service|support)\b/i], ['Sales', /\bsales\b/i],
];

const SCAM: [RegExp, string][] = [
  [/registration fee|security deposit|processing fee|training fee|refundable (fee|deposit)|pay\s*(rs\.?|₹|inr)\s*\d+/i, 'Asks candidates to pay a fee'],
  [/wa\.me\/|whatsapp\s*(on|at|no\.?|number|:|\+?\d)/i, 'Asks to apply on WhatsApp'],
  [/earn\s*(rs\.?|₹|inr)?\s*\d[\d,]*\s*(per|\/|a)\s*(day|week)/i, 'Promises fixed daily earnings'],
  [/\b(data entry|typing|copy[\s-]paste|form filling)\b[\s\S]{0,60}\b(home|online|part[\s-]time)\b/i, 'Work-from-home typing / data-entry offer'],
  [/@(gmail|yahoo|outlook|hotmail|rediffmail)\.com/i, 'Uses a personal email address'],
  [/telegram\s*(@|channel|group|id)|t\.me\//i, 'Asks to contact on Telegram'],
  [/no interview|direct joining|100% (job|placement) guarantee/i, 'Promises a job without an interview'],
];

function classify(j: Raw) {
  const title = j.role, all = `${j.role}\n${j.description}`;
  let exp_min = 0, exp_max = 0, tag_reason = '';
  const fr = title.match(FRESH_RE) || j.description.match(FRESH_RE);
  const range = all.match(RANGE_RE), plus = all.match(PLUS_RE);
  if (fr && !(range && Number(range[1]) >= 2) && !SENIOR_RE.test(title)) {
    exp_min = 0; exp_max = range && Number(range[1]) === 0 ? Number(range[2]) : 1;
    tag_reason = `says “${fr[0].trim()}”`;
  } else if (range) {
    exp_min = Number(range[1]); exp_max = Math.max(exp_min, Number(range[2]));
    tag_reason = `says “${range[0].trim()}”`;
  } else if (plus) {
    exp_min = Number(plus[1] || plus[2]); exp_max = exp_min + 3;
    tag_reason = `says “${plus[0].trim()}”`;
  } else if (SENIOR_RE.test(title)) {
    exp_min = 5; exp_max = 10; tag_reason = 'senior title, no years mentioned — please check';
  } else {
    exp_min = 1; exp_max = 3; tag_reason = 'no experience mentioned — please check';
  }
  if (exp_min > 25) { exp_min = 1; exp_max = 3; }

  const category = NON_IT_RE.test(title) ? 'Non-IT' : IT_RE.test(title) ? 'IT' : (j.hint || 'Non-IT');
  const blob = `${all}\n${j.apply_link}`;
  const flag = SCAM.find(([re]) => re.test(blob));
  const lc = `${j.role} ${j.contract || ''} ${j.description.slice(0, 600)}`.toLowerCase();
  const job_type = /\bintern(ship)?\b/.test(j.role.toLowerCase()) ? 'Internship'
    : /contract/.test(lc) ? 'Contract' : /part[\s_-]?time/.test(lc) ? 'Part-time' : 'Full-time';
  const work_mode = /\bremote\b|work from home|wfh/.test(`${j.location} ${lc}`.toLowerCase()) ? 'Remote' : /\bhybrid\b/.test(lc) ? 'Hybrid' : 'On-site';

  return {
    source: j.source, source_id: j.source_id, company: j.company.slice(0, 120), role: j.role.slice(0, 160),
    location: j.location.replace(/,?\s*India$/i, '') || 'India', job_type, work_mode, exp_min, exp_max,
    salary: j.salary || null,
    skills: SKILLS.filter(([, re]) => re.test(all)).map(([n]) => n).slice(0, 6),
    description: j.description.slice(0, 8000), apply_link: j.apply_link, category, tag_reason,
    flag_reason: flag ? flag[1] : null, source_posted_at: j.posted_at, status: 'pending',
    logo_url: null as string | null, logo_source: null as string | null, company_domain: null as string | null,
    _domain: j.domain,
  };
}

// ---------------- logos ----------------
const AGGREGATOR_RE = /adzuna|greenhouse\.io|lever\.co|linkedin|naukri|indeed|glassdoor|monster|foundit|shine\.com|instahyre|cutshort|wellfound|myworkdayjobs|workday|smartrecruiters|icims|taleo|successfactors|oraclecloud|zohorecruit|freshteam|keka|darwinbox|ripplehire|google\.|bit\.ly|forms\.|wa\.me|t\.me/i;
const SUFFIX_RE = /\b(pvt|private|ltd|limited|llp|inc|corp|corporation|co|company|technologies|technology|tech|solutions|services|software|systems|global|india|labs?|group|the)\b/g;
const normName = (s: string) => s.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(SUFFIX_RE, ' ').replace(/\s+/g, ' ').trim();

async function findLogo(company: string, hint: string | undefined, applyLink: string) {
  const cands: { domain: string; source: string }[] = [];
  if (hint) cands.push({ domain: hint, source: 'known' });
  const n = normName(company);
  const known = KNOWN_DOMAINS[n] || KNOWN_DOMAINS[n.split(' ').slice(0, 2).join(' ')] || KNOWN_DOMAINS[n.split(' ')[0]];
  if (known) cands.push({ domain: known, source: 'known' });
  try {
    const host = new URL(applyLink).hostname.replace(/^(www|careers?|jobs|apply|hiring)\./, '');
    if (!AGGREGATOR_RE.test(host)) cands.push({ domain: host, source: 'apply-link' });
  } catch { /* ignore */ }
  const slug = n.replace(/\s+/g, '');
  if (slug.length >= 3) for (const tld of ['com', 'in', 'co.in']) cands.push({ domain: `${slug}.${tld}`, source: 'guess' });

  const tried = new Set<string>();
  for (const c of cands) {
    if (tried.has(c.domain) || tried.size >= 5) continue;
    tried.add(c.domain);
    const url = await tryLogo(c.domain);
    if (url) return { url, domain: c.domain, source: c.source };
  }
  return { url: null, domain: null, source: null };
}

async function tryLogo(domain: string): Promise<string | null> {
  try {
    if (LOGO_TOKEN) {
      const u = `https://img.logo.dev/${domain}?token=${LOGO_TOKEN}&size=128&format=png&fallback=404`;
      const r = await fetch(u, { signal: AbortSignal.timeout(5000) });
      await r.body?.cancel();
      if (r.ok) return u;
    }
    const u = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
    const r = await fetch(u, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) { await r.body?.cancel(); return null; }
    const buf = new Uint8Array(await r.arrayBuffer());
    return pngWidth(buf) >= 64 ? u : null; // skip tiny/blurry icons and the default globe
  } catch { return null; }
}

function pngWidth(b: Uint8Array) {
  if (b.length < 24 || b[0] !== 0x89 || b[1] !== 0x50) return 0;
  return (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
}

// ---------------- helpers ----------------
function key(company: string, role: string) {
  return `${normName(company || '')}|${(role || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
}
function decodeEntities(s: string) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).replace(/&amp;/g, '&');
}
function text(s: string) {
  return decodeEntities(String(s).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}
function htmlToText(html: string) {
  return decodeEntities(
    html.replace(/<li[^>]*>/gi, '\n• ').replace(/<\/(p|div|h\d|ul|ol|li)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  ).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function salaryText(j: any) {
  if (!j.salary_min || String(j.salary_is_predicted) === '1') return null;
  const lpa = (v: number) => (v / 100000).toFixed(v >= 1000000 ? 0 : 1).replace(/\.0$/, '');
  return j.salary_max && j.salary_max !== j.salary_min ? `₹${lpa(j.salary_min)}–${lpa(j.salary_max)} LPA` : `₹${lpa(j.salary_min)} LPA`;
}
