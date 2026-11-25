import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Bookmark, Briefcase, Clock, MapPin, ScanSearch, Wallet } from 'lucide-react';
import { useApp } from '../lib/store';
import { expLabel, isFresher, isNew, timeAgo } from '../lib/utils';
import { trackJob } from '../lib/jobsApi';

const EASE = [0.22, 1, 0.36, 1];

// Company initial on a quiet raised tile (or the real logo if one was added)
export function CompanyAvatar({ job, size = 44 }) {
  if (job.logo_url) {
    return <img src={job.logo_url} alt="" className="avatar avatar-img" style={{ width: size, height: size }} />;
  }
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden="true">
      {job.company?.[0]?.toUpperCase()}
    </span>
  );
}

export function applyTo(job) {
  trackJob(job.id, 'apply');
  window.open(job.apply_link, '_blank', 'noopener');
}

export default function JobCard({ job, index = 0 }) {
  const { isSaved, toggleSave } = useApp();
  const navigate = useNavigate();
  const saved = isSaved(job.id);
  const fresh = isNew(job);

  return (
    <motion.article
      layout="position"
      className="job-card"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 5) * 0.05, ease: EASE }}
    >
      <div className="job-card-top">
        <CompanyAvatar job={job} />
        <div className="job-head">
          <Link to={`/job/${job.id}`} className="job-role">{job.role}</Link>
          <div className="job-company">{job.company}</div>
        </div>
        <button
          className={`save-btn ${saved ? 'saved' : ''}`}
          onClick={() => toggleSave(job.id)}
          aria-label={saved ? 'Remove from saved' : 'Save job'}
          aria-pressed={saved}
        >
          <Bookmark size={16} strokeWidth={1.5} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <ul className="job-meta">
        <li><Briefcase size={16} strokeWidth={1.5} /> {isFresher(job) ? 'Fresher' : expLabel(job)}</li>
        <li><MapPin size={16} strokeWidth={1.5} /> {job.location}{job.work_mode && job.work_mode !== 'On-site' ? ` · ${job.work_mode}` : ''}</li>
        {job.salary && <li><Wallet size={16} strokeWidth={1.5} /> {job.salary}</li>}
      </ul>

      {job.skills?.length > 0 && (
        <div className="job-skills">
          {job.skills.slice(0, 4).map((s) => <span key={s}>{s}</span>)}
          {job.skills.length > 4 && <span>+{job.skills.length - 4}</span>}
        </div>
      )}

      <div className="job-foot">
        <span className={`job-time ${fresh ? 'is-new' : ''}`}>
          {fresh ? <span className="caret" aria-hidden="true" /> : <Clock size={14} strokeWidth={1.5} />}
          {timeAgo(job.posted_at)}
          {job.job_type && job.job_type !== 'Full-time' && <span className="job-type">· {job.job_type}</span>}
        </span>
        <div className="job-actions">
          <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/job/${job.id}#resume`)} title="Check your resume against this job">
            <ScanSearch size={14} strokeWidth={1.5} /> Match
          </button>
          <button className="btn btn-primary btn-xs" onClick={() => applyTo(job)}>
            Apply <ArrowUpRight size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
