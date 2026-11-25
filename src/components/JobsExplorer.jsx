import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Search, SlidersHorizontal, X, RotateCcw, Briefcase, MapPin, Clock } from 'lucide-react';
import { useApp } from '../lib/store';
import JobCard from './JobCard';
import { isFresher, trendScore } from '../lib/utils';

const LEVELS = [
  { v: '', l: 'All' },
  { v: 'fresher', l: 'Fresher' },
  { v: 'experienced', l: 'Experienced' },
];
const EXP = [
  { v: '', l: 'Any experience' },
  { v: '0', l: '0 yrs (Fresher)' },
  { v: '1', l: '1 yr' }, { v: '2', l: '2 yrs' }, { v: '3', l: '3 yrs' },
  { v: '5', l: '5 yrs' }, { v: '8', l: '8+ yrs' },
];

export default function JobsExplorer({ limit, title = 'Explore jobs', compact = false }) {
  const { jobs, loading, error } = useApp();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(!compact);

  const f = {
    q: params.get('q') || '',
    company: params.get('company') || '',
    role: params.get('role') || '',
    level: params.get('level') || '',
    exp: params.get('exp') || '',
    type: params.get('type') || '',
    mode: params.get('mode') || '',
    loc: params.get('loc') || '',
    sort: params.get('sort') || 'latest',
  };
  const set = (k, v) => {
    const p = new URLSearchParams(params);
    v ? p.set(k, v) : p.delete(k);
    setParams(p, { replace: true, preventScrollReset: true });
  };
  const reset = () => setParams({}, { replace: true, preventScrollReset: true });

  const companies = useMemo(() => [...new Set(jobs.map((j) => j.company))].sort(), [jobs]);
  const types = useMemo(() => [...new Set(jobs.map((j) => j.job_type).filter(Boolean))], [jobs]);
  const hotIds = useMemo(
    () => new Set([...jobs].sort((a, b) => trendScore(b) - trendScore(a)).slice(0, 3).map((j) => j.id)),
    [jobs]
  );

  const filtered = useMemo(() => {
    const q = f.q.toLowerCase().trim();
    let list = jobs.filter((j) => {
      if (q) {
        const hay = `${j.role} ${j.company} ${j.location} ${(j.skills || []).join(' ')} ${j.job_type}`.toLowerCase();
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      if (f.company && j.company !== f.company) return false;
      if (f.role && !j.role.toLowerCase().includes(f.role.toLowerCase())) return false;
      if (f.level === 'fresher' && !isFresher(j)) return false;
      if (f.level === 'experienced' && isFresher(j)) return false;
      if (f.exp !== '') {
        const e = Number(f.exp);
        const min = Number(j.exp_min || 0);
        const max = Math.max(Number(j.exp_max || 0), min);
        if (e === 8 ? max < 8 : e < min || e > max) return false;
      }
      if (f.type && j.job_type !== f.type) return false;
      if (f.mode && j.work_mode !== f.mode) return false;
      if (f.loc && !j.location.toLowerCase().includes(f.loc.toLowerCase())) return false;
      return true;
    });
    if (f.sort === 'trending') list = [...list].sort((a, b) => trendScore(b) - trendScore(a));
    return limit ? list.slice(0, limit) : list;
  }, [jobs, params, limit]);

  const activeCount = ['company', 'role', 'level', 'exp', 'type', 'mode', 'loc'].filter((k) => f[k]).length;

  return (
    <section className="explorer" id="jobs">
      <div className="explorer-head">
        <div>
          <span className="eyebrow">{f.sort === 'trending' ? 'Most applied first' : 'Newest first'}</span>
          <h2>{title} <span className="count-pill">{filtered.length}</span></h2>
        </div>
        <div className="sort-toggle">
          {['latest', 'trending'].map((s) => (
            <button key={s} className={f.sort === s ? 'on' : ''} onClick={() => set('sort', s === 'latest' ? '' : s)}>
              {f.sort === s && <motion.span layoutId="sort-pill" className="sort-pill" />}
              <span>{s === 'latest' ? 'Latest' : 'Trending'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="search-row">
        <label className="search-box">
          <Search size={16} strokeWidth={1.5} />
          <input value={f.q} onChange={(e) => set('q', e.target.value)} placeholder="Search role, company, skill, location…" />
          {f.q && <button onClick={() => set('q', '')} aria-label="Clear"><X size={16} strokeWidth={1.5} /></button>}
        </label>
        <button className={`btn btn-ghost filter-toggle ${showFilters ? 'on' : ''}`} onClick={() => setShowFilters((s) => !s)}>
          <SlidersHorizontal size={16} strokeWidth={1.5} /> Filters {activeCount > 0 && <span className="badge-dot static">{activeCount}</span>}
        </button>
      </div>

      <div className="level-chips">
        {LEVELS.map((l) => (
          <button key={l.v} className={`chip ${f.level === l.v ? 'on' : ''}`} onClick={() => set('level', l.v)}>{l.l}</button>
        ))}
        {types.map((t) => (
          <button key={t} className={`chip ${f.type === t ? 'on' : ''}`} onClick={() => set('type', f.type === t ? '' : t)}>{t}</button>
        ))}
        {['Remote', 'Hybrid'].map((m) => (
          <button key={m} className={`chip ${f.mode === m ? 'on' : ''}`} onClick={() => set('mode', f.mode === m ? '' : m)}>{m}</button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div className="filters" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="filters-grid">
              <label className="field">
                <span><Building2 size={14} strokeWidth={1.5} /> Company</span>
                <select value={f.company} onChange={(e) => set('company', e.target.value)}>
                  <option value="">All companies</option>
                  {companies.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="field">
                <span><Briefcase size={14} strokeWidth={1.5} /> Role</span>
                <input value={f.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Developer, Analyst" />
              </label>
              <label className="field">
                <span><Clock size={14} strokeWidth={1.5} /> Your experience</span>
                <select value={f.exp} onChange={(e) => set('exp', e.target.value)}>
                  {EXP.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
                </select>
              </label>
              <label className="field">
                <span><MapPin size={14} strokeWidth={1.5} /> Location</span>
                <input value={f.loc} onChange={(e) => set('loc', e.target.value)} placeholder="e.g. Bengaluru, Remote" />
              </label>
            </div>
            {activeCount > 0 && <button className="link-btn" onClick={reset}><RotateCcw size={14} strokeWidth={1.5} /> Reset all filters</button>}
          </motion.div>
        )}
      </AnimatePresence>

      {error && <div className="empty">⚠ {error}</div>}
      {loading ? (
        <div className="job-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="job-card skeleton" />)}</div>
      ) : filtered.length === 0 ? (
        <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="empty-title">No jobs match these filters</p>
          <p>Try removing one or two of them.</p>
          <button className="btn btn-ghost" onClick={reset}>Reset filters</button>
        </motion.div>
      ) : (
        <motion.div layout className="job-grid">
          <AnimatePresence mode="popLayout">
            {filtered.map((j, i) => <JobCard key={j.id} job={j} index={i} />)}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
