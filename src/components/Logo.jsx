import { motion } from 'framer-motion';

// NextStep Career mark: a flat navy tile with the orange </> from the original logo
export function LogoMark({ size = 40, animate = true }) {
  return (
    <motion.svg
      width={size} height={size} viewBox="0 0 64 64" aria-hidden
    >
      <rect x="2" y="2" width="60" height="60" rx="15" fill="#1B2A6B" />
      <g fill="none" stroke="#FF8A1F" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 22 L12 30 L21 38" />
        <path d="M43 22 L52 30 L43 38" />
        <path d="M35 17 L29 43" />
      </g>
    </motion.svg>
  );
}

export default function Logo({ size = 38, compact = false }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      {!compact && (
        <span className="logo-word">NextStep <span className="logo-career">Career</span></span>
      )}
    </span>
  );
}
