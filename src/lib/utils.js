export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.length <= 10 ? dateStr + 'T00:00:00' : dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((today - day) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isNew(job) {
  if (!job?.posted_at) return false;
  const d = new Date(job.posted_at + 'T00:00:00');
  return Date.now() - d.getTime() < 3 * 86400000;
}

export const isFresher = (job) => Number(job.exp_min || 0) === 0;

export function expLabel(job) {
  const a = Number(job.exp_min || 0), b = Number(job.exp_max || 0);
  if (a === 0 && b === 0) return 'Fresher';
  if (a === 0) return `0–${b} yrs`;
  if (b && b !== a) return `${a}–${b} yrs`;
  return `${a}+ yrs`;
}

// Trending = apply clicks weighted by freshness
export function trendScore(job) {
  const ageDays = Math.max(0, (Date.now() - new Date((job.posted_at || '') + 'T00:00:00')) / 86400000);
  return ((job.apply_clicks || 0) * 3 + (job.views || 0)) / Math.pow(ageDays + 2, 0.8);
}

export function companyColor(name = '') {
  const palette = ['#FF8A1F', '#3B82F6', '#22C55E', '#A855F7', '#EF4444', '#14B8A6', '#EAB308', '#EC4899'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

// ---------- Readable job links ----------
// /job/associate-consultant-iqvia-bengaluru-441bc9f4
//      └── role, company, city ─────────────┘ └ short id (first part of the job id)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugify(text = '') {
  return text
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const shortId = (id = '') => (UUID.test(id) ? id.slice(0, 8) : id.replace(/[^a-z0-9]/gi, '')).toLowerCase();

export function jobSlug(job) {
  const city = (job.location || '').split(/[,·/]/)[0];
  const words = slugify(`${job.role} ${job.company} ${city}`).split('-').slice(0, 10).join('-');
  return `${words}-${shortId(job.id)}`;
}

export const jobPath = (job) => `/job/${jobSlug(job)}`;

// Works with new links (…-441bc9f4), old links (full id) and demo ids
export function findJobByParam(jobs, param = '') {
  if (UUID.test(param)) return jobs.find((j) => j.id === param);
  const tail = param.split('-').pop().toLowerCase();
  return jobs.find((j) => j.id === param || shortId(j.id) === tail);
}
export const isFullId = (param = '') => UUID.test(param);

export function shareJob(job) {
  const url = `${location.origin}${jobPath(job)}`;
  const text = `${job.role} at ${job.company} – apply via NextStep Career`;
  if (navigator.share) return navigator.share({ title: text, url }).catch(() => {});
  navigator.clipboard?.writeText(url);
  return Promise.resolve('copied');
}