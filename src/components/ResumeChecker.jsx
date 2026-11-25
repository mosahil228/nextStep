import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, animate } from 'framer-motion';
import { CircleCheck, CircleX, FileText, Loader2, ScanSearch, Upload, Lightbulb } from 'lucide-react';
import { analyzeResume, readResumeFile } from '../lib/resumeMatcher';

function ScoreRing({ score }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, score, { duration: 0.9, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [score]);
  const R = 54, C = 2 * Math.PI * R;
  const color = 'var(--accent)';
  return (
    <div className="ring">
      <svg viewBox="0 0 128 128" width="150" height="150">
        <circle cx="64" cy="64" r={R} stroke="var(--raised)" strokeWidth="8" fill="none" />
        <motion.circle cx="64" cy="64" r={R} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C - (C * score) / 100 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} transform="rotate(-90 64 64)" />
      </svg>
      <div className="ring-num"><b>{n}</b><small>of 100</small></div>
    </div>
  );
}

export default function ResumeChecker({ job }) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  useEffect(() => { setResult(null); }, [job?.id]);

  const loadFile = async (file) => {
    if (!file) return;
    setErr(''); setBusy(true); setFileName(file.name);
    try {
      const t = await readResumeFile(file);
      if (!t.trim()) throw new Error('Could not read text from this file (scanned image PDF?). Paste the text instead.');
      setText(t);
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  };

  const run = () => {
    if (!job) return setErr('Select a job first.');
    if (text.trim().length < 80) return setErr('Upload your resume or paste at least a few lines of it.');
    setErr('');
    setBusy(true);
    setTimeout(() => {
      const r = analyzeResume(text, job);
      setResult(r);
      setBusy(false);
      // remember the real score on this device so the home page can show it
      try {
        if (job.id !== 'custom') {
          localStorage.setItem('nsc_last_match', JSON.stringify({ jobId: job.id, role: job.role, company: job.company, score: r.score, at: Date.now() }));
        }
      } catch {}
    }, 600);
  };

  return (
    <div className="resume-checker">
      <div className="rc-grid">
        <div>
          <div
            className={`dropzone ${drag ? 'drag' : ''}`}
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); loadFile(e.dataTransfer.files[0]); }}
          >
            <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={(e) => loadFile(e.target.files[0])} />
            <div>
              {fileName ? <FileText size={20} strokeWidth={1.5} /> : <Upload size={20} strokeWidth={1.5} />}
            </div>
            <b>{fileName || 'Drop your resume here'}</b>
            <small>PDF, DOCX or TXT · it stays on your device</small>
          </div>
          <div className="or">or paste text</div>
          <textarea className="rc-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your resume text here…" />
          {err && <div className="form-err">{err}</div>}
          <button className="btn btn-primary btn-block btn-lg" onClick={run} disabled={busy}>
            {busy ? <><Loader2 className="spin" size={16} /> Checking…</> : <><ScanSearch size={16} strokeWidth={1.5} /> Check against this job</>}
          </button>
        </div>

        <div className="rc-result">
          <AnimatePresence mode="wait">
            {busy && !result ? (
              <motion.div key="scan" className="scan-anim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="scan-doc"><span className="scan-line" />{Array.from({ length: 8 }).map((_, i) => <i key={i} style={{ width: `${50 + ((i * 37) % 45)}%` }} />)}</div>
                <p className="muted small">Matching skills…</p>
              </motion.div>
            ) : result ? (
              <motion.div key={result.score + job.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rc-score">
                  <ScoreRing score={result.score} />
                  <div>
                    <h3>{result.verdict}</h3>
                    <p className="muted small">{result.matched.length} of {result.keywords.length} JD keywords found</p>
                    <p className="small">{result.expNote}</p>
                  </div>
                </div>

                <h4>Matched keywords</h4>
                <div className="kw">{result.matched.length ? result.matched.map((k) => <span key={k} className="kw-ok">{k}</span>) : <small className="muted">None yet</small>}</div>
                <h4>Missing keywords</h4>
                <div className="kw">{result.missing.length ? result.missing.map((k) => <span key={k} className="kw-miss">{k}</span>) : <small className="muted">Nothing missing</small>}</div>

                <h4>Resume checklist</h4>
                <ul className="checks">
                  {result.checks.map((c) => (
                    <li key={c.label} className={c.ok ? 'ok' : 'no'}>{c.ok ? <CircleCheck size={16} strokeWidth={1.5} /> : <CircleX size={16} strokeWidth={1.5} />} {c.label}</li>
                  ))}
                </ul>

                <h4>How to improve it</h4>
                <ul className="tips">{result.tips.slice(0, 6).map((t) => <li key={t}>{t}</li>)}</ul>
              </motion.div>
            ) : (
              <motion.div key="idle" className="rc-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="rc-idle-title">No resume checked yet</p>
                <p className="muted">Upload your resume to see your match score, missing keywords and an ATS checklist for <b>{job ? `${job.role} @ ${job.company}` : 'this job'}</b>.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}