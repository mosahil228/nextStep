import { motion } from 'framer-motion';
import JobsExplorer from '../components/JobsExplorer';

export default function Jobs() {
  return (
    <div className="page">
      <div className="page-hero">
        <div className="container">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            All jobs
          </motion.h1>
          <p className="muted">Search by company, role or years of experience</p>
        </div>
      </div>
      <div className="container"><JobsExplorer title="All jobs" /></div>
    </div>
  );
}
