import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Share, SquarePlus, X, Smartphone, EllipsisVertical } from 'lucide-react';
import { LogoMark } from './Logo';
import { useInstall, isMobile } from '../lib/pwa';

// Small "Get App" button for the navbar
export function InstallButton({ className = '' }) {
  const { installed, install } = useInstall();
  const [guide, setGuide] = useState(null);
  if (installed) return null;
  const onClick = async () => {
    const r = await install();
    if (r === 'ios' || r === 'manual') setGuide(r);
  };
  return (
    <>
      <button className={`btn btn-ghost btn-sm ${className}`} onClick={onClick}>
        <Download size={16} strokeWidth={1.5} /><span className="nav-install-label">Get app</span>
      </button>
      <InstallGuide mode={guide} onClose={() => setGuide(null)} />
    </>
  );
}

// Step-by-step sheet for iPhone (and browsers without an install prompt)
export function InstallGuide({ mode, onClose }) {
  const steps = mode === 'ios'
    ? [
        { i: Share, t: <>Tap the <b>Share</b> button at the bottom of Safari</> },
        { i: SquarePlus, t: <>Scroll down and tap <b>Add to Home Screen</b></> },
        { i: Smartphone, t: <>Tap <b>Add</b>. NextStep now opens like an app from your home screen</> },
      ]
    : [
        { i: EllipsisVertical, t: <>Open your browser <b>menu (⋮)</b></> },
        { i: SquarePlus, t: <>Tap <b>Install app</b> or <b>Add to Home screen</b></> },
        { i: Smartphone, t: <>Confirm. NextStep appears on your home screen</> },
      ];
  return (
    <AnimatePresence>
      {mode && (
        <motion.div className="popup-backdrop sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="install-sheet" onClick={(e) => e.stopPropagation()}
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <button className="icon-btn popup-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
            <div className="install-head">
              <LogoMark size={56} animate={false} />
              <div><h3>Install NextStep Career</h3><p className="muted small">Free · opens full-screen · no app store needed</p></div>
            </div>
            <ol className="install-steps">
              {steps.map((s, k) => (
                <motion.li key={k} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + k * 0.1 }}>
                  <span className="install-num">{k + 1}</span><s.i size={20} className="accent" /><span>{s.t}</span>
                </motion.li>
              ))}
            </ol>
            <button className="btn btn-primary btn-block btn-lg" onClick={onClose}>Got it</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Bottom banner shown to mobile visitors after a few seconds
export default function InstallBanner() {
  const { installed, install, ios, canPrompt } = useInstall();
  const [show, setShow] = useState(false);
  const [guide, setGuide] = useState(null);

  useEffect(() => {
    if (installed || !isMobile()) return;
    const last = Number(localStorage.getItem('nsc_install_dismissed') || 0);
    if (Date.now() - last < 3 * 86400000) return; // ask again after 3 days
    const t = setTimeout(() => setShow(true), 12000);
    return () => clearTimeout(t);
  }, [installed]);

  const dismiss = () => { localStorage.setItem('nsc_install_dismissed', String(Date.now())); setShow(false); };
  const go = async () => {
    const r = await install();
    if (r === 'ios' || r === 'manual') setGuide(r);
    setShow(false);
  };

  return (
    <>
      <AnimatePresence>
        {show && !installed && (ios || canPrompt) && (
          <motion.div className="install-banner" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <LogoMark size={44} animate={false} />
            <div className="install-text"><b>Get the NextStep app</b><small>New jobs, one tap away</small></div>
            <button className="btn btn-primary btn-sm" onClick={go}>Install</button>
            <button className="icon-btn" onClick={dismiss} aria-label="Not now"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>
      <InstallGuide mode={guide} onClose={() => setGuide(null)} />
    </>
  );
}
