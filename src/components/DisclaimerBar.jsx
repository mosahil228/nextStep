import { useState } from 'react';
import { TriangleAlert, X } from 'lucide-react';

// A calm, static notice at the very top of every page
export default function DisclaimerBar() {
  const [open, setOpen] = useState(() => sessionStorage.getItem('nsc_hide_disc') !== '1');
  if (!open) return null;
  return (
    <div className="disc-bar" role="note">
      <div className="container disc-inner">
        <TriangleAlert size={16} strokeWidth={1.5} aria-hidden="true" />
        <p>
          <span className="disc-strong">Apply at your own risk.</span>{' '}
          <span className="disc-full">We share openings from public sources and aren't the employer, so we can't guarantee any job or interview. Never pay anyone for a job.</span>
          <span className="disc-short">We're not the employer. Never pay for a job.</span>
        </p>
        <button className="disc-close" aria-label="Hide notice"
          onClick={() => { sessionStorage.setItem('nsc_hide_disc', '1'); setOpen(false); }}>
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
