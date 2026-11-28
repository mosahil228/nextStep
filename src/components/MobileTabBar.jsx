import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, Briefcase, Building2, House, ScanSearch } from 'lucide-react';
import { useApp } from '../lib/store';

// App-style navigation for phones (hidden on laptops and on job pages, which show an Apply bar)
const TABS = [
  { to: '/', label: 'Home', icon: House, match: (p, s) => p === '/' },
  { to: '/jobs', label: 'Jobs', icon: Briefcase, match: (p, s) => p === '/jobs' && !s.includes('trending') },
    { to: '/companies', label: 'Companies', icon: Building2, match: (p) => p === '/companies' },
  { to: '/ats', label: 'ATS check', icon: ScanSearch, match: (p) => p === '/ats' },
  { to: '/saved', label: 'Saved', icon: Bookmark, match: (p) => p === '/saved' },
];

export default function MobileTabBar() {
  const { pathname, search } = useLocation();
  const { saved } = useApp();
  if (pathname.startsWith('/job/')) return null;
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => {
        const on = t.match(pathname, search);
        return (
          <Link key={t.label} to={t.to} className={`tab ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined}>
            {on && <motion.span layoutId="tabbar-pill" className="tab-pill" transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} />}
            <span className="tab-icon">
              <t.icon size={20} strokeWidth={on ? 2 : 1.5} />
              {t.label === 'Saved' && saved.length > 0 && <span className="tab-count">{saved.length}</span>}
            </span>
            <span className="tab-label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
