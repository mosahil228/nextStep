import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, GraduationCap, Laptop, Rocket, ScanSearch, Search, Send } from 'lucide-react';
import JobsExplorer from '../components/JobsExplorer';
import JobCard, { CompanyAvatar } from '../components/JobCard';
import { ChannelCTA } from '../components/Footer';
import { useApp } from '../lib/store';
import { expLabel, isNew, timeAgo, trendScore } from '../lib/utils';
import { isFresher } from '../lib/utils';

const EASE = [0.22, 1, 0.36, 1];

// The signature: the orange text cursor from the logo marks anything posted today
export const Caret = () => <span className="caret" aria-hidden="true" />;

// One solid product view instead of floating cards: what the board looks like today
function HeroPreview({ jobs }) {
  const latest = jobs.slice(0, 3);
  // a real score from this visitor's own last check (stored only in their browser)
  const last = (() => {
    try {
      const m = JSON.parse(localStorage.getItem('nsc_last_match'));
      return m && jobs.some((j) => j.id === m.jobId) ? m : null;
    } catch { return null; }
  })();
  if (!latest.length) return null;
  return (
    <motion.div className="hero-preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1, ease: EASE }}>
      <div className="hp-head">
        <span>Latest openings</span>
        <span className="mono muted small">{jobs.length} open</span>
      </div>
      {latest.map((j) => (
        <Link key={j.id} to={`/job/${j.id}`} className="hp-row">
          <CompanyAvatar job={j} size={36} />
          <div className="hp-text">
            <b>{j.role}</b>
            <small>{j.company} · {j.location}</small>
          </div>
          <span className="hp-meta mono">
            {isNew(j) && <Caret />}{timeAgo(j.posted_at)}
          </span>
        </Link>
      ))}
      {last ? (
        <Link to={`/job/${last.jobId}#resume`} className="hp-match">
          <small className="muted">Your last resume check · {last.role}</small>
          <div className="hp-score"><b>{last.score}</b><span className="muted"> / 100</span></div>
          <div className="hp-bar"><i style={{ width: `${last.score}%` }} /></div>
        </Link>
      ) : (
        <Link to={`/job/${latest[0].id}#resume`} className="hp-match hp-cta">
          <span>
            <b>Check your resume for this job</b>
            <small className="muted">See your match score and missing skills for {latest[0].role}</small>
          </span>
          <ArrowRight size={16} strokeWidth={1.5} />
        </Link>
      )}
    </motion.div>
  );
}

export default function Home() {
  const { jobs } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const trending = useMemo(() => [...jobs].sort((a, b) => trendScore(b) - trendScore(a)).slice(0, 6), [jobs]);
  const companies = useMemo(() => [...new Set(jobs.map((j) => j.company))], [jobs]);
  const freshers = jobs.filter(isFresher).length;
  const today = jobs.filter(isNew).length;

  const go = (e) => { e.preventDefault(); navigate(`/jobs${q ? `?q=${encodeURIComponent(q)}` : ''}`); };

  const cats = [
    { icon: GraduationCap, label: 'Fresher jobs', to: '/jobs?level=fresher', n: freshers },
    { icon: Briefcase, label: 'Experienced', to: '/jobs?level=experienced', n: jobs.length - freshers },
    { icon: Laptop, label: 'Remote', to: '/jobs?mode=Remote', n: jobs.filter((j) => j.work_mode === 'Remote').length },
    { icon: Rocket, label: 'Internships', to: '/jobs?type=Internship', n: jobs.filter((j) => j.job_type === 'Internship').length },
  ];

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
            <span className="eyebrow">{jobs.length} open roles · {today} posted today</span>
            <h1>Hand-picked jobs for freshers and experienced people</h1>
            <p className="hero-sub">
              Search by company, role or years of experience, check your resume against the job description,
              and apply on the company's own site.
            </p>
            <form className="hero-search" onSubmit={go}>
              <Search size={18} />
              <Caret />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Role, company or skill" aria-label="Search jobs" />
              <button className="btn btn-primary">Search</button>
            </form>
            <div className="hero-quick">
              {[
                ['Fresher', '/jobs?level=fresher'], ['Remote', '/jobs?mode=Remote'], ['Java', '/jobs?q=Java'],
                ['Data Analyst', '/jobs?q=Data%20Analyst'], ['Internship', '/jobs?type=Internship'],
              ].map(([t, url]) => (
                <button key={t} className="chip" onClick={() => navigate(url)}>{t}</button>
              ))}
            </div>
            <dl className="hero-stats">
              <div><dt>Open roles</dt><dd>{jobs.length}</dd></div>
              <div><dt>Companies</dt><dd>{companies.length}</dd></div>
              <div><dt>Fresher roles</dt><dd>{freshers}</dd></div>
            </dl>
          </motion.div>
          <HeroPreview jobs={jobs} />
        </div>
      </section>

      {companies.length > 0 && (
        <div className="companies" aria-label="Companies hiring">
          <div className="container companies-inner">
            <span className="muted small">Hiring now</span>
            {companies.slice(0, 10).map((c) => (
              <Link key={c} to={`/jobs?company=${encodeURIComponent(c)}`} className="company-name">{c}</Link>
            ))}
          </div>
        </div>
      )}

      <section className="container section">
        <div className="cats">
          {cats.map((c) => (
            <Link key={c.label} to={c.to} className="cat">
              <span className="cat-icon"><c.icon size={18} strokeWidth={1.5} /></span>
              <span className="cat-text">
                <b>{c.label}</b>
                <small>{c.n} openings</small>
              </span>
              <ArrowRight className="cat-arrow" size={16} strokeWidth={1.5} />
            </Link>
          ))}
        </div>
      </section>

      {trending.length > 0 && (
        <section className="container section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Most applied this week</span>
              <h2>Trending jobs</h2>
            </div>
            <Link to="/jobs?sort=trending" className="link-btn">See all <ArrowRight size={16} strokeWidth={1.5} /></Link>
          </div>
          <div className="h-scroll">
            {trending.map((j, i) => <JobCard key={j.id} job={j} index={i} />)}
          </div>
        </section>
      )}

      <section className="container section">
        <JobsExplorer limit={9} title="Latest jobs" compact />
        <div className="center"><Link to="/jobs" className="btn btn-ghost">View all {jobs.length} jobs <ArrowRight size={16} strokeWidth={1.5} /></Link></div>
      </section>

      <section className="container section">
        <div className="section-head"><div><span className="eyebrow">How it works</span><h2>Find, check, apply</h2></div></div>
        <div className="steps">
          {[
            { icon: Search, t: 'Find', d: 'Filter by company, role and years of experience, fresher or experienced.' },
            { icon: ScanSearch, t: 'Check', d: 'Upload your resume and see how it matches the exact job description.' },
            { icon: Send, t: 'Apply', d: 'Apply on the official link in one click, or save the job for later.' },
          ].map((s, i) => (
            <div key={s.t} className="step">
              <span className="step-num mono">0{i + 1}</span>
              <s.icon size={18} strokeWidth={1.5} className="step-icon" />
              <h3>{s.t}</h3>
              <p className="muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <ChannelCTA />
    </>
  );
}