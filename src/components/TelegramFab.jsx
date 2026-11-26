import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { TelegramIcon, WhatsAppIcon } from './Icons';
import { LogoMark } from './Logo';
import { SITE } from '../config';

export default function TelegramFab() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHint(true), 9000);
    const t2 = setTimeout(() => setHint(false), 16000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className={`fab-wrap ${pathname === '/ats' ? 'on-ats' : ''} ${pathname.startsWith('/job/') ? 'on-job' : ''}`}>
      <AnimatePresence>
        {open && (
          <motion.div
            className="chat-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="chat-head">
              <div className="chat-avatar"><LogoMark size={36} animate={false} /></div>
              <div>
                <b>NextStep Career</b>
                <small>@{SITE.telegramUsername} on Telegram</small>
              </div>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><X size={16} strokeWidth={1.5} /></button>
            </div>
            <div className="chat-body">
              <div className="bubble">Need help with your resume, exam preparation or interview guidance? Send me a message on Telegram</div>
            </div>
            <a className="btn btn-telegram btn-block" href={`https://t.me/${SITE.telegramUsername}`} target="_blank" rel="noreferrer">
              <TelegramIcon size={16} /> Message me on Telegram
            </a>
            <div className="chat-channels">
              <a href={SITE.telegramChannel} target="_blank" rel="noreferrer"><TelegramIcon size={14} /> Telegram channel</a>
              <a href={SITE.whatsappChannel} target="_blank" rel="noreferrer"><WhatsAppIcon size={14} /> WhatsApp channel</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hint && !open && (
          <motion.button className="fab-hint" onClick={() => setOpen(true)}
            initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            Help with resume, exams and interviews
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        className="fab"
        onClick={() => { setOpen((o) => !o); setHint(false); }}
        aria-label="Chat on Telegram"
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <AnimatePresence mode="wait">
          <motion.span key={open ? 'x' : 't'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            {open ? <X size={18} strokeWidth={1.5} /> : <TelegramIcon size={18} />}
          </motion.span>
          {!open && <span className="fab-label">Ask me</span>}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
