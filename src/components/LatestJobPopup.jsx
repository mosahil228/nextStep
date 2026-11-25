import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Briefcase, MapPin, Wallet, X, Zap } from 'lucide-react';
import { useApp } from '../lib/store';
import { CompanyAvatar, applyTo } from './JobCard';
import { expLabel, jobPath, timeAgo } from '../lib/utils';

const KEY = 'nsc_popup_seen';

// Shows the most recently uploaded job once to every visitor (until a newer job is posted)
export default function LatestJobPopup() {
  const { jobs } = useApp();
  const [job, setJob] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!jobs.length || location.pathname.startsWith('/admin')) return;
    const latest = [...jobs].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
    if (localStorage.getItem(KEY) === latest.id) return;
    const t = setTimeout(() => setJob(latest), 2200);
    return () => clearTimeout(t);
  }, [jobs]);

  useEffect(() => {
    if (!job) return;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [job]);

  const close = () => {
    localStorage.setItem(KEY, job.id);
    setJob(null);
  };

  return (
    <AnimatePresence>
      {job && (
        <motion.div className="popup-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div
            className="popup"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="dialog" aria-label="Latest job"
          >
                        <button className="icon-btn popup-close" onClick={close} aria-label="Close"><X size={16} strokeWidth={1.5} /></button>
            <div className="popup-label"><span className="caret" aria-hidden="true" /> Just posted · {timeAgo(job.posted_at).toLowerCase()}</div>
            <div className="popup-main">
              <CompanyAvatar job={job} size={48} />
              <div>
                <h3>{job.role}</h3>
                <p className="muted">{job.company}</p>
              </div>
            </div>
            <ul className="job-meta">
              <li><Briefcase size={16} strokeWidth={1.5} /> {expLabel(job)}</li>
              <li><MapPin size={16} strokeWidth={1.5} /> {job.location}</li>
              {job.salary && <li><Wallet size={16} strokeWidth={1.5} /> {job.salary}</li>}
            </ul>
            <p className="popup-desc">{job.description.slice(0, 150).replace(/\s+/g, ' ')}…</p>
            <div className="popup-actions">
              <button className="btn btn-primary btn-lg" onClick={() => { applyTo(job); close(); }}>
                Apply now <ArrowUpRight size={16} strokeWidth={1.5} />
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => { const to = jobPath(job); close(); navigate(to); }}>
                View details
              </button>
            </div>
            <small className="popup-note">Apply at your own risk and check the details on the company's site</small>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}