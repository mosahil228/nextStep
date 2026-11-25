import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { useApp } from '../lib/store';
import JobCard from '../components/JobCard';

export default function Saved() {
  const { jobs, saved } = useApp();
  const list = saved.map((id) => jobs.find((j) => j.id === id)).filter(Boolean);
  return (
    <div className="page">
      <div className="page-hero">
        <div className="container">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            Saved jobs
          </motion.h1>
          <p className="muted">Saved on this device. Use the bookmark on any job to add it here</p>
        </div>
      </div>
      <div className="container">
        {list.length === 0 ? (
          <div className="empty">
            <Bookmark size={20} strokeWidth={1.5} className="muted" />
            <p>No saved jobs yet.</p>
            <Link className="btn btn-primary" to="/jobs">Browse jobs</Link>
          </div>
        ) : (
          <motion.div layout className="job-grid">
            <AnimatePresence mode="popLayout">{list.map((j, i) => <JobCard key={j.id} job={j} index={i} />)}</AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
