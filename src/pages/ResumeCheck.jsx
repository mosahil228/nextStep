import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../lib/store';
import ResumeChecker from '../components/ResumeChecker';

export default function ResumeCheck() {
  const { jobs } = useApp();
  const [id, setId] = useState('');
  const [customJD, setCustomJD] = useState('');
  useEffect(() => { if (!id && jobs[0]) setId(jobs[0].id); }, [jobs]);

  const job = useMemo(() => {
    if (id === 'custom') return { id: 'custom', role: 'Custom role', company: 'your JD', description: customJD, skills: [], exp_min: 0 };
    return jobs.find((j) => j.id === id);
  }, [id, jobs, customJD]);

  return (
    <div className="page">
      <div className="page-hero">
        <div className="container">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            Resume check
          </motion.h1>
          <p className="muted">Pick a job and add your resume to see your match score and the skills you're missing</p>
        </div>
      </div>
      <div className="container">
        <div className="panel" style={{ marginBottom: 24 }}>
          <label className="field">
            <span>Choose a job</span>
            <select value={id} onChange={(e) => setId(e.target.value)}>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.role} — {j.company}</option>)}
              <option value="custom">Paste my own job description</option>
            </select>
          </label>
          {id === 'custom' && (
            <textarea className="rc-text" rows={6} style={{ marginTop: 12 }} value={customJD} onChange={(e) => setCustomJD(e.target.value)} placeholder="Paste any job description here…" />
          )}
        </div>
        {job && <ResumeChecker job={job} />}
      </div>
    </div>
  );
}
