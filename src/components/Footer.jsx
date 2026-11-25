import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from './Logo';
import { TelegramIcon, WhatsAppIcon } from './Icons';
import { SITE } from '../config';

export function ChannelCTA() {
  return (
    <section className="container">
      <motion.div className="cta-band"
        initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <div>
          <span className="eyebrow">Job alerts</span>
          <h2>Get new openings on your phone the day they're posted</h2>
          <p className="muted">Fresher and experienced roles, shared in the Telegram and WhatsApp channels.</p>
        </div>
        <div className="cta-buttons">
          <a href={SITE.telegramChannel} target="_blank" rel="noreferrer" className="btn btn-primary btn-lg"><TelegramIcon size={16} /> Join on Telegram</a>
          <a href={SITE.whatsappChannel} target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg"><WhatsAppIcon size={16} /> Join on WhatsApp</a>
        </div>
      </motion.div>
    </section>
  );
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p className="muted small" style={{ marginTop: 14, maxWidth: 360 }}>{SITE.tagline}. Daily curated job updates for freshers and experienced professionals.</p>
        </div>
        <div className="footer-links">
          <Link to="/jobs">All jobs</Link>
          <Link to="/jobs?level=fresher">Fresher jobs</Link>
          <Link to="/jobs?sort=trending">Trending</Link>
          <Link to="/resume-check">Resume check</Link>
          <Link to="/saved">Saved jobs</Link>
        </div>
        <div className="footer-links">
          <a href={SITE.telegramChannel} target="_blank" rel="noreferrer"><TelegramIcon size={14} /> Telegram</a>
          <a href={SITE.whatsappChannel} target="_blank" rel="noreferrer"><WhatsAppIcon size={14} /> WhatsApp</a>
          <a href={`https://t.me/${SITE.telegramUsername}`} target="_blank" rel="noreferrer">@{SITE.telegramUsername}</a>
        </div>
      </div>
      <div className="container footer-disc">
        <b>Disclaimer:</b> {SITE.disclaimer} All company names and trademarks belong to their respective owners.
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} NextStep Career</div>
    </footer>
  );
}
