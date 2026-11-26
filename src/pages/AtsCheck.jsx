import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, animate, motion } from 'framer-motion';
import {
  ArrowRight, Check, CircleAlert, CircleCheck, FileText, FileUp, History, Lightbulb, ListChecks, Loader2,
  Pencil, RotateCcw, ScanSearch, Target, TriangleAlert, Upload, X,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { readResumeDetailed, runAtsCheck, SAMPLE_RESUME } from '../lib/atsEngine';
import { jobPath } from '../lib/utils';

const EASE = [0.22, 1, 0.36, 1];
const KEY = 'nsc_ats_session_v1';
const SEV = {
  critical: { label: 'Critical', icon: CircleAlert, cls: 'sev-critical' },
  warning: { label: 'Warning', icon: TriangleAlert, cls: 'sev-warning' },
  tip: { label: 'Tip', icon: Lightbulb, cls: 'sev-tip' },
};
const statusOf = (pct) => (pct >= 80 ? 'good' : pct >= 55 ? 'warn' : 'bad');
const issueKey = (i) => `${i.cat}|${i.title}|${i.lines.join(',')}`;

function loadSession() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}

// Highlight the exact words that caused an issue
function Marked({ text, match }) {
  if (!match) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(match.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return <>{text.slice(0, idx)}<mark>{text.slice(idx, idx + match.length)}</mark>{text.slice(idx + match.length)}</>;
}

// ---------------- Score card (the page's moment) ----------------
function ScoreCard({ result, prev, history, onRecheck, onEdit, busy }) {
  const [n, setN] = useState(prev ?? 0);
  useEffect(() => {
    const c = animate(prev ?? 0, result.score, { duration: 1.1, ease: EASE, onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [result]);
  const R = 52, C = 2 * Math.PI * R;
  const st = statusOf(result.score);
  const delta = prev != null ? result.score - prev : null;

  return (
    <motion.section className={`score-card st-${st}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      <div className="sc-top">
        <div className="sc-ring" role="img" aria-label={`ATS score ${result.score} out of 100, ${result.grade}`}>
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} className="sc-track" />
            <motion.circle
              cx="60" cy="60" r={R} className="sc-fill" strokeDasharray={C}
              initial={{ strokeDashoffset: C - (C * (prev ?? 0)) / 100 }}
              animate={{ strokeDashoffset: C - (C * result.score) / 100 }}
              transition={{ duration: 1.1, ease: EASE }}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="sc-num"><b>{n}</b><small>of 100</small></div>
        </div>
        <div className="sc-text">
          <span className="sc-label">ATS score</span>
          <h2 className="sc-grade">{result.grade}</h2>
          <AnimatePresence>
            {delta != null && delta !== 0 && (
              <motion.span key={result.score} className={`sc-delta ${delta > 0 ? 'up' : 'down'}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.3 }}>
                {delta > 0 ? '+' : ''}{delta} since last check
              </motion.span>
            )}
          </AnimatePresence>
          <div className="sc-counts">
            <span className="c-critical"><CircleAlert size={14} strokeWidth={1.75} /> {result.counts.critical} critical</span>
            <span className="c-warning"><TriangleAlert size={14} strokeWidth={1.75} /> {result.counts.warning} {result.counts.warning === 1 ? 'warning' : 'warnings'}</span>
            <span className="c-tip"><Lightbulb size={14} strokeWidth={1.75} /> {result.counts.tip} {result.counts.tip === 1 ? 'tip' : 'tips'}</span>
          </div>
        </div>
      </div>

      <ul className="sc-cats">
        {result.categories.map((c, i) => (
          <li key={c.id}>
            <div className="sc-cat-row">
              <span>{c.name}</span>
              <span className="mono">{c.score}/{c.max}</span>
            </div>
            <div className="sc-bar"><motion.i className={`st-${statusOf(c.pct)}`} initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ duration: 0.7, delay: 0.15 + i * 0.05, ease: EASE }} /></div>
          </li>
        ))}
      </ul>

      {history.length > 1 && (
        <div className="sc-history">
          <span className="sc-history-label"><History size={14} strokeWidth={1.5} /> Your checks</span>
          <ol>
            {history.slice(-6).map((h, i, arr) => (
              <li key={h.at} className={i === arr.length - 1 ? 'now' : ''}>
                <b>{h.score}</b>
                {i < arr.length - 1 && <ArrowRight size={12} strokeWidth={1.5} />}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="sc-actions">
        <button className="btn btn-primary" onClick={onRecheck} disabled={busy}>
          {busy ? <Loader2 className="spin" size={16} /> : <RotateCcw size={16} strokeWidth={1.75} />} Check again
        </button>
        <button className="btn btn-ghost" onClick={onEdit}><Pencil size={16} strokeWidth={1.5} /> Fix in editor</button>
      </div>
    </motion.section>
  );
}

// ---------------- One issue ----------------
function IssueCard({ issue, lines, onShow, catName }) {
  const S = SEV[issue.severity];
  const line = issue.lines.length ? lines[issue.lines[0]]?.text.trim() : issue.snippet;
  return (
    <motion.article layout="position" className={`issue ${S.cls}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <div className="issue-head">
        <span className="issue-icon"><S.icon size={16} strokeWidth={1.75} /></span>
        <div className="issue-title">
          <h4>{issue.title}</h4>
          <span className="issue-meta">{S.label} · {catName}{issue.lines.length > 1 ? ` · ${issue.lines.length} lines` : ''}</span>
        </div>
      </div>
      <p className="issue-detail">{issue.detail}</p>
      {line && (
        <button className="issue-quote" onClick={() => issue.lines.length && onShow(issue)} disabled={!issue.lines.length} title={issue.lines.length ? 'Show in your resume' : undefined}>
          {issue.lines.length > 0 && <span className="mono ln">L{issue.lines[0] + 1}</span>}
          <span className="q"><Marked text={line.length > 160 ? line.slice(0, 159) + '…' : line} match={issue.match} /></span>
        </button>
      )}
      <div className="issue-fix"><Check size={16} strokeWidth={2} /> <span>{issue.fix}</span></div>
    </motion.article>
  );
}

// ---------------- Page ----------------
export default function AtsCheck() {
  const { jobs } = useApp();
  const [params, setParams] = useSearchParams();
  const saved = useMemo(loadSession, []);

  const [text, setText] = useState(saved?.text || '');
  const [meta, setMeta] = useState(saved?.meta || {});
  const [fileName, setFileName] = useState(saved?.fileName || '');
  const [mode, setMode] = useState(params.get('job') ? 'job' : saved?.mode || 'general');
  const [jobId, setJobId] = useState(params.get('job') || saved?.jobId || '');
  const [customJD, setCustomJD] = useState(saved?.customJD || '');
  const [history, setHistory] = useState(saved?.history || []);
  const [result, setResult] = useState(null);
  const [prevResult, setPrevResult] = useState(null);
  const [stage, setStage] = useState('input'); // input | checking | result
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('issues');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();
  const reuploadRef = useRef();
  const resultsRef = useRef();

  const job = useMemo(() => {
    if (mode !== 'job') return null;
    if (jobId === 'custom') return customJD.trim().length > 40 ? { role: '', description: customJD, skills: [] } : null;
    return jobs.find((j) => j.id === jobId) || null;
  }, [mode, jobId, customJD, jobs]);

  useEffect(() => { if (mode === 'job' && !jobId && jobs[0]) setJobId(jobs[0].id); }, [mode, jobs]);

  // remember everything on this device, so people can come back after fixing
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ text, meta, fileName, mode, jobId, customJD, history: history.slice(-12) })); } catch {}
  }, [text, meta, fileName, mode, jobId, customJD, history]);

  // re-open the last result when returning to the page
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !saved?.text || !saved?.history?.length) return;
    if (saved.mode === 'job' && !jobs.length) return; // wait for jobs so keywords can be matched
    restored.current = true;
    setResult(runAtsCheck(saved.text, { job, meta: saved.meta }));
    setStage('result');
  }, [jobs.length, job]);

  const readFile = async (file, thenCheck = false) => {
    if (!file) return;
    setErr(''); setBusy(true);
    try {
      const r = await readResumeDetailed(file);
      if (r.meta.type === 'doc') throw new Error('Old .doc files can\'t be read. Save it as .docx or PDF and try again.');
      if (r.meta.type !== 'image' && !r.text.trim()) throw new Error('No text could be read from this file. If it\'s a scanned PDF, export a text-based PDF from Word or Google Docs.');
      setText(r.text); setMeta(r.meta); setFileName(file.name);
      if (thenCheck) check(r.text, r.meta);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const check = (t = text, m = meta) => {
    if (!t.trim() && m.type !== 'image') { setErr('Upload your resume or paste its text first.'); return; }
    if (mode === 'job' && !job) { setErr(jobId === 'custom' ? 'Paste a job description of a few lines first.' : 'Pick a job to match against.'); return; }
    restored.current = true;
    setErr(''); setEditing(false); setBusy(true);
    const before = result;
    if (stage !== 'result') setStage('checking');
    setTimeout(() => {
      const r = runAtsCheck(t, { job, meta: m });
      setPrevResult(before);
      setResult(r);
      setHistory((h) => [...h, { score: r.score, at: Date.now() }]);
      setStage('result'); setBusy(false); setTab('issues'); setFilter('all');
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }, stage === 'result' ? 500 : 1400);
  };

  const fixedSinceLast = useMemo(() => {
    if (!prevResult || !result) return [];
    const now = new Set(result.issues.map((i) => `${i.cat}|${i.title}`));
    return prevResult.issues.filter((i) => !now.has(`${i.cat}|${i.title}`));
  }, [prevResult, result]);

  const catName = (id) => result?.categories.find((c) => c.id === id)?.name || id;
  const shown = result ? result.issues.filter((i) => filter === 'all' || i.severity === filter) : [];
  const flagged = useMemo(() => {
    const m = {};
    const rank = { critical: 0, warning: 1, tip: 2 };
    result?.issues.forEach((i) => i.lines.forEach((ln) => {
      const cur = m[ln];
      if (!cur) m[ln] = { ...i, more: 0 };
      else if (rank[i.severity] < rank[cur.severity]) m[ln] = { ...i, more: cur.more + 1 };
      else cur.more += 1;
    }));
    return m;
  }, [result]);

  const showInResume = (issue) => {
    setTab('resume'); setEditing(false); setFlash(issue.lines[0]);
    setTimeout(() => document.getElementById(`ln-${issue.lines[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    setTimeout(() => setFlash(null), 2200);
  };

  const startOver = () => {
    setResult(null); setPrevResult(null); setHistory([]); setText(''); setMeta({}); setFileName(''); setStage('input'); setEditing(false);
  };

  // ---------------- render ----------------
  return (
    <div className="page ats-page">
      <div className="page-hero">
        <div className="container">
          <span className="eyebrow">Free · your resume never leaves your device</span>
          <h1>ATS resume checker</h1>
          <p className="muted">See your resume the way hiring software does. Find every mistake, fix it, and check again until your score is green.</p>
        </div>
      </div>

      <div className="container">
        {/* ---------- input ---------- */}
        {stage !== 'result' && (
          <section className="ats-input">
            <div className="ats-step">
              <span className="step-badge">1</span>
              <div className="ats-step-body">
                <h3>Add your resume</h3>
                <div
                  className={`dropzone big ${drag ? 'drag' : ''} ${fileName ? 'has-file' : ''}`}
                  onClick={() => fileRef.current.click()}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files[0]); }}
                  role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fileRef.current.click()}
                >
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.doc,image/*" hidden onChange={(e) => readFile(e.target.files[0])} />
                  <span className="dz-icon">{busy ? <Loader2 className="spin" size={20} /> : fileName ? <FileText size={20} strokeWidth={1.5} /> : <Upload size={20} strokeWidth={1.5} />}</span>
                  <b>{fileName || 'Drop your resume here or browse'}</b>
                  <small>{fileName ? `${(text.match(/\S+/g) || []).length} words read · click to choose another file` : 'PDF or DOCX works best · TXT also works'}</small>
                </div>
                <div className="ats-alt">
                  <details>
                    <summary>Or paste the text</summary>
                    <textarea className="rc-text" rows={8} value={text} onChange={(e) => { setText(e.target.value); setMeta({ type: 'txt' }); setFileName(''); }} placeholder="Paste your resume text here" />
                  </details>
                  <button className="link-btn" onClick={() => { setText(SAMPLE_RESUME); setMeta({ type: 'txt' }); setFileName('sample-resume.txt'); }}>
                    Try a sample resume
                  </button>
                </div>
              </div>
            </div>

            <div className="ats-step">
              <span className="step-badge">2</span>
              <div className="ats-step-body">
                <h3>What should we check against?</h3>
                <div className="seg" role="tablist">
                  <button role="tab" aria-selected={mode === 'general'} className={mode === 'general' ? 'on' : ''} onClick={() => setMode('general')}>
                    <ListChecks size={16} strokeWidth={1.5} /> General ATS check
                  </button>
                  <button role="tab" aria-selected={mode === 'job'} className={mode === 'job' ? 'on' : ''} onClick={() => setMode('job')}>
                    <Target size={16} strokeWidth={1.5} /> Match a job
                  </button>
                </div>
                {mode === 'job' && (
                  <div className="ats-job">
                    <label className="field">
                      <span>Job</span>
                      <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                        {jobs.map((j) => <option key={j.id} value={j.id}>{j.role} · {j.company}</option>)}
                        <option value="custom">Paste a job description</option>
                      </select>
                    </label>
                    {jobId === 'custom' && (
                      <textarea className="rc-text" rows={6} value={customJD} onChange={(e) => setCustomJD(e.target.value)} placeholder="Paste the job description from any site" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {err && <div className="form-err">{err}</div>}
            <button className="btn btn-primary btn-lg ats-go" onClick={() => check()} disabled={busy || stage === 'checking'}>
              {stage === 'checking' ? <><Loader2 className="spin" size={16} /> Checking…</> : <><ScanSearch size={16} strokeWidth={1.75} /> Check my resume</>}
            </button>

            <AnimatePresence>
              {stage === 'checking' && (
                <motion.div className="ats-scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="scan-doc"><span className="scan-line" />{Array.from({ length: 9 }).map((_, i) => <i key={i} style={{ width: `${48 + ((i * 37) % 46)}%` }} />)}</div>
                  <ol className="scan-steps">
                    {['Reading your resume', 'Finding sections', 'Checking formatting', 'Reviewing every bullet', 'Scoring'].map((s, i) => (
                      <motion.li key={s} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.25, duration: 0.2 }}>
                        <Check size={14} strokeWidth={2} /> {s}
                      </motion.li>
                    ))}
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* ---------- results ---------- */}
        {stage === 'result' && result && (
          <div className="ats-results" ref={resultsRef}>
            <aside className="ats-side">
              <ScoreCard
                result={result}
                prev={prevResult?.score}
                history={history}
                busy={busy}
                onRecheck={() => check()}
                onEdit={() => { setTab('resume'); setEditing(true); }}
              />
              <div className="ats-side-links">
                <button className="link-btn" onClick={() => reuploadRef.current.click()}><FileUp size={16} strokeWidth={1.5} /> Upload a fixed file</button>
                <input ref={reuploadRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={(e) => readFile(e.target.files[0], true)} />
                <button className="link-btn" onClick={startOver}><X size={16} strokeWidth={1.5} /> Start over</button>
              </div>
              {job && job.role && (
                <Link to={jobPath(jobs.find((j) => j.id === jobId) || job)} className="ats-job-chip">
                  <Target size={16} strokeWidth={1.5} /> <span>Matched with <b>{job.role}</b>{job.company ? ` · ${job.company}` : ''}</span>
                </Link>
              )}
            </aside>

            <section className="ats-main">
              <div className="ats-tabs" role="tablist">
                {[
                  ['issues', `Issues`, result.issues.length],
                  ['resume', 'Your resume', null],
                  ...(result.keywords ? [['keywords', 'Keywords', `${result.keywords.matched.length}/${result.keywords.total}`]] : []),
                  ['passed', "What's working", result.passed.length],
                ].map(([id, label, n]) => (
                  <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => { setTab(id); if (id !== 'resume') setEditing(false); }}>
                    {tab === id && <motion.span layoutId="ats-tab" className="ats-tab-pill" transition={{ duration: 0.2, ease: EASE }} />}
                    <span className="t">{label}{n != null && <em>{n}</em>}</span>
                  </button>
                ))}
              </div>

              {/* Issues */}
              {tab === 'issues' && (
                <div className="ats-panel">
                  {fixedSinceLast.length > 0 && (
                    <div className="fixed-box">
                      <b><CircleCheck size={16} strokeWidth={1.75} /> Fixed since your last check</b>
                      <ul>{fixedSinceLast.slice(0, 8).map((i) => <li key={issueKey(i)}>{i.title}</li>)}</ul>
                    </div>
                  )}
                  <div className="sev-filter">
                    {[['all', 'All', result.issues.length], ['critical', 'Critical', result.counts.critical], ['warning', 'Warnings', result.counts.warning], ['tip', 'Tips', result.counts.tip]].map(([id, l, n]) => (
                      <button key={id} className={`chip ${filter === id ? 'on' : ''} ${id !== 'all' ? 'chip-' + id : ''}`} onClick={() => setFilter(id)} disabled={!n && id !== 'all'}>
                        {l} <span className="mono">{n}</span>
                      </button>
                    ))}
                  </div>
                  {shown.length === 0 ? (
                    <div className="empty">
                      <p className="empty-title">{result.issues.length ? 'Nothing in this group' : 'No issues found'}</p>
                      <p>{result.issues.length ? 'Pick another filter.' : 'Your resume passes every check. Apply with confidence.'}</p>
                    </div>
                  ) : (
                    <div className="issue-list">
                      <AnimatePresence mode="popLayout">
                        {shown.map((i) => <IssueCard key={i.id} issue={i} lines={result.lines} onShow={showInResume} catName={catName(i.cat)} />)}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}

              {/* Resume with highlights / editor */}
              {tab === 'resume' && (
                <div className="ats-panel">
                  <div className="resume-toolbar">
                    <span className="muted small">{editing ? 'Edit the text, then check again. Copy your fixes back into your Word or Docs file afterwards.' : 'Lines with problems are marked. Click a marked line to see what\'s wrong.'}</span>
                    {editing
                      ? <button className="btn btn-primary btn-sm" onClick={() => check()} disabled={busy}><RotateCcw size={14} strokeWidth={1.75} /> Check again</button>
                      : <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil size={14} strokeWidth={1.5} /> Edit text</button>}
                  </div>
                  {editing ? (
                    <textarea className="resume-editor" value={text} onChange={(e) => setText(e.target.value)} spellCheck autoFocus />
                  ) : (
                    <ol className="resume-view">
                      {result.lines.map((l) => {
                        const iss = flagged[l.i];
                        if (!l.text.trim()) return <li key={l.i} className="blank" />;
                        return (
                          <li key={l.i} id={`ln-${l.i}`} className={`${iss ? 'flag ' + SEV[iss.severity].cls : ''} ${flash === l.i ? 'flash' : ''}`}
                            onClick={() => { if (iss) { setTab('issues'); setFilter(iss.severity); } }}
                            title={iss ? iss.title : undefined}>
                            <span className="ln mono">{l.i + 1}</span>
                            <span className="lt"><Marked text={l.text} match={iss?.match} /></span>
                            {iss && <span className="lt-tag">{iss.title}{iss.more > 0 ? ` · +${iss.more} more` : ''}</span>}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              )}

              {/* Keywords */}
              {tab === 'keywords' && result.keywords && (
                <div className="ats-panel">
                  <div className="kw-meter">
                    <div><b>{result.keywords.pct}%</b> <span className="muted">of job keywords found</span></div>
                    <div className="sc-bar"><motion.i className={`st-${statusOf(result.keywords.pct)}`} initial={{ width: 0 }} animate={{ width: `${result.keywords.pct}%` }} transition={{ duration: 0.6, ease: EASE }} /></div>
                  </div>
                  <h4>Missing from your resume</h4>
                  <div className="kw">{result.keywords.missing.length ? result.keywords.missing.map((k) => <span key={k} className="kw-miss">{k}</span>) : <small className="muted">Nothing missing</small>}</div>
                  <p className="muted small" style={{ marginTop: 8 }}>Add only the ones you really have, in your Skills section and inside your bullets.</p>
                  <h4>Already in your resume</h4>
                  <div className="kw">{result.keywords.matched.map((k) => <span key={k} className="kw-ok">{k}</span>)}</div>
                </div>
              )}

              {/* Passed */}
              {tab === 'passed' && (
                <div className="ats-panel">
                  <ul className="passed-list">
                    {result.passed.map((p, i) => (
                      <motion.li key={p.text} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.04 }}>
                        <CircleCheck size={16} strokeWidth={1.75} /> <span>{p.text}</span> <small className="muted">{catName(p.cat)}</small>
                      </motion.li>
                    ))}
                  </ul>
                  <dl className="ats-stats">
                    <div><dt>Words</dt><dd>{result.stats.words}</dd></div>
                    <div><dt>Bullets</dt><dd>{result.stats.bullets}</dd></div>
                    <div><dt>With numbers</dt><dd>{result.stats.quantifiedPct}%</dd></div>
                    <div><dt>Action verbs</dt><dd>{result.stats.actionPct}%</dd></div>
                  </dl>
                </div>
              )}
            </section>

            {/* phone: quick actions always in reach */}
            <div className="ats-mobile-bar">
              <button className="btn btn-ghost" onClick={() => { setTab('resume'); setEditing(true); window.scrollTo({ top: resultsRef.current.offsetTop + 300, behavior: 'smooth' }); }}><Pencil size={16} strokeWidth={1.5} /> Fix</button>
              <button className="btn btn-primary" onClick={() => check()} disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <RotateCcw size={16} strokeWidth={1.75} />} Check again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
