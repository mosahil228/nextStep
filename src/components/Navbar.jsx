import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Menu, X } from 'lucide-react';
import Logo from './Logo';
import { TelegramIcon, WhatsAppIcon } from './Icons';
import { SITE } from '../config';
import { useApp } from '../lib/store';
import { InstallButton } from './InstallApp';
import ThemeToggle from './ThemeToggle';

const links = [
  { to: '/', label: 'Home' },
  { to: '/jobs', label: 'All Jobs' },
  { to: '/jobs?sort=trending', label: 'Trending' },
  { to: '/resume-check', label: 'Resume Check' },
];

export default function Navbar() {
  const { saved } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener('scroll', on);
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link to="/" aria-label="NextStep Career home"><Logo /></Link>

        <nav className="nav-links">
          {links.map((l) => {
            const here = loc.pathname + loc.search;
            const active = l.to === '/jobs'
              ? loc.pathname === '/jobs' && !loc.search.includes('trending')
              : l.to === here || (l.to !== '/' && here.startsWith(l.to));
            return (
              <Link key={l.label} to={l.to} className={`nav-link ${active ? 'active' : ''}`}>
                {l.label}
                {active && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} />}
              </Link>
            );
          })}
        </nav>

        <div className="nav-actions">
          <InstallButton className="nav-install" />
          <ThemeToggle />
          <Link to="/saved" className="icon-btn" aria-label="Saved jobs">
            <Bookmark size={16} strokeWidth={1.5} />
            {saved.length > 0 && <span className="badge-dot">{saved.length}</span>}
          </Link>
          <a href={SITE.whatsappChannel} target="_blank" rel="noreferrer" className="icon-btn wa" aria-label="WhatsApp channel"><WhatsAppIcon size={16} /></a>
          <a href={SITE.telegramChannel} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm hide-sm">
            <TelegramIcon size={16} /> Join channel
          </a>
          <button className="icon-btn show-sm" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X size={16} strokeWidth={1.5} /> : <Menu size={16} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav className="mobile-menu"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {links.map((l) => <Link key={l.label} to={l.to}>{l.label}</Link>)}
            <Link to="/saved">Saved jobs ({saved.length})</Link>
            <a href={SITE.telegramChannel} target="_blank" rel="noreferrer">Telegram channel</a>
            <a href={SITE.whatsappChannel} target="_blank" rel="noreferrer">WhatsApp channel</a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
