import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Briefcase, GraduationCap, Search, X } from 'lucide-react';
import { COMPANIES, CATEGORIES } from '../data/companies';
import { useApp } from '../lib/store';
import './companies.css';

const simplify = (s = '') => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(ltd|limited|pvt|private|india|technologies|technology|services|inc)\b/g, '').trim();

function CompanyLogo({ c }) {
  const [bad, setBad] = useState(false);
  return bad
    ? <span className="co-logo co-letter">{c.name[0]}</span>
    : <img className="co-logo" src={c.logo} alt="" loading="lazy" onError={() => setBad(true)} />;
}

export default function Companies() {
  const { jobs } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [freshers, setFreshers] = useState(false);

  useEffect(() => { document.title = 'Top companies hiring in India · NextStep Career'; }, []);

  // How many jobs on NextStep belong to each company
  const jobCount = useMemo(() => {
    const m = {};
    for (const c of COMPANIES) {
      const key = simplify(c.name);
      m[c.name] = (jobs || []).filter((j) => {
        const jc = simplify(j.company);
        return jc && (jc === key || jc.startsWith(key + ' ') || key.startsWith(jc + ' '));
      }).length;
    }
    return m;
  }, [jobs]);

  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((k) => [k, k === 'All' ? COMPANIES.length : COMPANIES.filter((c) => c.category === k).length])), []);

  const list = COMPANIES.filter((c) =>
    (cat === 'All' || c.category === cat) &&
    (!freshers || c.freshers) &&
    (!q.trim() || `${c.name} ${c.category}`.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <div className="page">
      <div className="page-hero">
        <div className="container">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>Top companies hiring in India</motion.h1>
          <p className="muted">100 companies with a direct link to their official careers page. Apply on the company’s own site.</p>
        </div>
      </div>

      <div className="container co-wrap">
        <div className="search-row">
          <label className="search-box">
            <Search size={16} strokeWidth={1.5} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a company…" aria-label="Search companies" />
            {q && <button onClick={() => setQ('')} aria-label="Clear"><X size={16} strokeWidth={1.5} /></button>}
          </label>
        </div>

        <div className="co-chips">
          {CATEGORIES.map((k) => (
            <button key={k} className={`chip ${cat === k ? 'on' : ''}`} onClick={() => setCat(k)}>
              {k} <span className="co-chip-n">{counts[k]}</span>
            </button>
          ))}
          <button className={`chip co-fresh ${freshers ? 'on' : ''}`} onClick={() => setFreshers((f) => !f)} aria-pressed={freshers}>
            <GraduationCap size={14} strokeWidth={1.75} /> Hires freshers
          </button>
        </div>

        <p className="co-count muted">{list.length} {list.length === 1 ? 'company' : 'companies'}</p>

        {list.length === 0 ? (
          <div className="empty">No company matches “{q}”. Try another name.</div>
        ) : (
          <motion.div className="co-grid" layout>
            <AnimatePresence initial={false}>
              {list.map((c, i) => (
                <motion.article
                  key={c.name}
                  layout
                  className="co-card"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 20) * 0.02, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                >
                  <a className="co-main" href={c.careers} target="_blank" rel="noopener noreferrer" aria-label={`${c.name} careers page (opens in a new tab)`}>
                    <CompanyLogo c={c} />
                    <span className="co-text">
                      <b>{c.name}</b>
                      <small>{c.category}</small>
                    </span>
                    <ArrowUpRight className="co-arrow" size={18} strokeWidth={1.75} />
                  </a>
                  <div className="co-foot">
                    {c.freshers && <span className="co-tag"><GraduationCap size={13} strokeWidth={1.75} /> Hires freshers</span>}
                    {jobCount[c.name] > 0 && (
                      <Link className="co-tag co-jobs" to={`/jobs?company=${encodeURIComponent(c.name)}`}>
                        <Briefcase size={13} strokeWidth={1.75} /> {jobCount[c.name]} on NextStep
                      </Link>
                    )}
                    <a className="co-visit" href={c.careers} target="_blank" rel="noopener noreferrer">Careers page</a>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <p className="co-note muted">
          Links go to each company’s official careers page. NextStep is not linked with these companies. Never pay anyone to get a job.
        </p>
      </div>
    </div>
  );
}
