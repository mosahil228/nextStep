import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Briefcase, Calendar, Heart, MapPin, Share2, Wallet, Laptop, Clock, TriangleAlert } from 'lucide-react';
import { useApp } from '../lib/store';
import { fetchJob, trackJob } from '../lib/jobsApi';
import JobCard, { CompanyAvatar, applyTo } from '../components/JobCard';
import ResumeChecker from '../components/ResumeChecker';
import { TelegramIcon } from '../components/Icons';
import { expLabel, isFresher, shareJob, timeAgo } from '../lib/utils';
import { SITE } from '../config';

// Turns plain-text JD into nice paragraphs / bullet lists
function JDText({ text }) {
  const blocks = [];
  let list = null;
  text.split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line) { list = null; return; }
    if (/^[-•*●▪]\s?/.test(line)) {
      if (!list) { list = []; blocks.push({ t: 'ul', items: list }); }
      list.push(line.replace(/^[-•*●▪]\s?/, ''));
    } else {
      list = null;
      const isHead = line.length < 45 && !/[.,]$/.test(line) && /^[A-Z]/.test(line);
      blocks.push({ t: isHead ? 'h' : 'p', text: line });
    }
  });
  return (
    <div className="jd">
      {blocks.map((b, i) =>
        b.t === 'ul' ? <ul key={i}>{b.items.map((x, k) => <li key={k}>{x}</li>)}</ul>
          : b.t === 'h' ? <h4 key={i}>{b.text}</h4> : <p key={i}>{b.text}</p>
      )}
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const { hash } = useLocation();
  const { jobs, isSaved, toggleSave, notify } = useApp();
  const [job, setJob] = useState(() => jobs.find((j) => j.id === id));
  const [missing, setMissing] = useState(false);
  const resumeRef = useRef(null);

  useEffect(() => {
    const local = jobs.find((j) => j.id === id);
    if (local) setJob(local);
    else fetchJob(id).then((j) => (j ? setJob(j) : setMissing(true))).catch(() => setMissing(true));
  }, [id, jobs]);

  useEffect(() => { if (job) trackJob(job.id, 'view'); window.scrollTo(0, 0); }, [job?.id]);
  useEffect(() => {
    if (hash === '#resume' && job) setTimeout(() => resumeRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
  }, [hash, job]);

  const similar = useMemo(() => {
    if (!job) return [];
    const words = job.role.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    return jobs.filter((j) => j.id !== job.id)
      .map((j) => ({ j, s: words.filter((w) => j.role.toLowerCase().includes(w)).length + (isFresher(j) === isFresher(job) ? 0.5 : 0) + (j.company === job.company ? 1 : 0) }))
      .sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.j);
  }, [job, jobs]);

  if (missing) return (
    <div className="container page empty"><div className="empty-code">404</div><p>This job was removed or does not exist.</p><Link className="btn btn-primary" to="/jobs">Browse jobs</Link></div>
  );
  if (!job) return <div className="container page"><div className="job-card skeleton" style={{ height: 300 }} /></div>;

  const saved = isSaved(job.id);
  const facts = [
    { i: Briefcase, l: 'Experience', v: expLabel(job) },
    { i: MapPin, l: 'Location', v: job.location },
    { i: Laptop, l: 'Work mode', v: job.work_mode || 'On-site' },
    { i: Clock, l: 'Job type', v: job.job_type || 'Full-time' },
    job.salary && { i: Wallet, l: 'Salary', v: job.salary },
    { i: Calendar, l: 'Posted', v: timeAgo(job.posted_at) },
  ].filter(Boolean);

  return (
    <div className="page">
      <div className="container">
        <Link to="/jobs" className="link-btn back"><ArrowLeft size={16} /> All jobs</Link>

        <motion.div className="detail-head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <CompanyAvatar job={job} size={76} />
          <div className="detail-title">
            <div className="job-badges">
              <span className={`tag ${isFresher(job) ? 'tag-fresher' : 'tag-exp'}`}>{isFresher(job) ? 'Fresher' : 'Experienced'}</span>
              {job.job_type && <span className="tag">{job.job_type}</span>}
            </div>
            <h1>{job.role}</h1>
            <p className="muted">{job.company} · {job.location}</p>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-lg" onClick={() => applyTo(job)}>Apply now <ArrowUpRight size={18} /></button>
            <motion.button whileTap={{ scale: 0.85 }} className={`btn btn-ghost btn-lg ${saved ? 'saved-on' : ''}`} onClick={() => toggleSave(job.id)}>
              <Heart size={18} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
            </motion.button>
            <button className="icon-btn lg" onClick={() => shareJob(job).then((r) => r === 'copied' && notify('Link copied'))} aria-label="Share"><Share2 size={18} /></button>
          </div>
        </motion.div>

        <div className="detail-grid">
          <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 className="panel-title">Job description</h3>
            <JDText text={job.description} />
            {job.skills?.length > 0 && (<>
              <h4>Skills</h4>
              <div className="job-skills lg">{job.skills.map((s) => <span key={s}>{s}</span>)}</div>
            </>)}
          </motion.div>

          <aside className="detail-side">
            <motion.div className="panel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <ul className="facts">
                {facts.map((f) => <li key={f.l}><f.i size={16} /><span>{f.l}</span><b>{f.v}</b></li>)}
              </ul>
              <button className="btn btn-primary btn-block btn-lg" onClick={() => applyTo(job)}>Apply on company site <ArrowUpRight size={18} /></button>
            </motion.div>
            <div className="panel warn">
              <TriangleAlert size={18} />
              <p className="small">Apply at your own risk. This update is shared from public sources — always verify on the official site. Never pay for a job.</p>
            </div>
            <a className="panel tg-side" href={`https://t.me/${SITE.telegramUsername}`} target="_blank" rel="noreferrer">
              <TelegramIcon size={22} /> <div><b>Questions about this job?</b><small>Chat with me on Telegram</small></div>
            </a>
          </aside>
        </div>

        <section ref={resumeRef} id="resume" className="section">
          <div className="section-head"><div><span className="eyebrow">Resume match</span><h2>Check your resume for this job</h2></div></div>
          <ResumeChecker job={job} />
        </section>

        {similar.length > 0 && (
          <section className="section">
            <div className="section-head"><div><span className="eyebrow">Related</span><h2>Similar jobs</h2></div></div>
            <div className="job-grid">{similar.map((j, i) => <JobCard key={j.id} job={j} index={i} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
