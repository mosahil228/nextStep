import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Briefcase, Copy, Eye, EyeOff, Loader2, Lock, LogOut, Mail, MousePointerClick, Pencil, Plus, Search, Sparkles, Trash2, TrendingUp, X, ExternalLink,
} from 'lucide-react';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import Analytics from './Analytics';
import ImportQueue from './ImportQueue';
import { markAsAdmin } from '../lib/analytics';
import { adminLogin, adminLogout, adminSession, deleteJob, fetchJobs, saveJob } from '../lib/jobsApi';
import { extractKeywords } from '../lib/resumeMatcher';
import { useApp } from '../lib/store';
import { DEMO_MODE } from '../config';
import { expLabel, timeAgo } from '../lib/utils';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = {
  company: '', role: '', location: '', job_type: 'Full-time', work_mode: 'On-site', exp_min: 0, exp_max: 0,
  salary: '', skills: [], description: '', apply_link: '', logo_url: '', posted_at: today(), is_active: true,
};

function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await adminLogin(email, password); onDone(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="admin-login">
      <motion.form className="panel login-card" onSubmit={submit} initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Logo /><ThemeToggle /></div>
        <h2>Admin dashboard</h2>
        <p className="muted small">Sign in to post and manage jobs.</p>
        {DEMO_MODE && <div className="demo-note">Demo mode (no database connected yet). Login is pre-filled.</div>}
        <label className="field"><span><Mail size={14} /> Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field"><span><Lock size={14} /> Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <div className="form-err">{err}</div>}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : 'Sign in'}</button>
        <Link to="/" className="link-btn center">← Back to website</Link>
      </motion.form>
    </div>
  );
}

function JobForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState({ ...EMPTY, ...initial, skills: initial?.skills || [] });
  const [skillsText, setSkillsText] = useState((initial?.skills || []).join(', '));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const up = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const autoSkills = () => {
    const kws = extractKeywords(f.description).slice(0, 10);
    const merged = [...new Set([...skillsText.split(',').map((s) => s.trim()).filter(Boolean), ...kws])];
    setSkillsText(merged.join(', '));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const exp_min = Number(f.exp_min) || 0;
      const exp_max = Math.max(Number(f.exp_max) || 0, exp_min);
      let link = f.apply_link.trim();
      if (link && !/^https?:\/\//i.test(link) && !link.startsWith('mailto:')) link = 'https://' + link;
      await saveJob({
        ...f, exp_min, exp_max, apply_link: link,
        skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
        logo_url: f.logo_url || null, salary: f.salary || null,
      });
      onSaved(initial?.id ? 'Job updated' : 'Job posted');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form className="drawer" onSubmit={submit} onClick={(e) => e.stopPropagation()}
        initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <div className="drawer-head">
          <h2>{initial?.id ? 'Edit job' : 'Post a new job'}</h2>
          <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <label className="field"><span>Company name *</span><input required value={f.company} onChange={up('company')} placeholder="e.g. Google" /></label>
          <label className="field"><span>Role / Job title *</span><input required value={f.role} onChange={up('role')} placeholder="e.g. Software Engineer" /></label>
          <label className="field"><span>Min experience (yrs) *</span><input type="number" min="0" max="40" value={f.exp_min} onChange={up('exp_min')} /></label>
          <label className="field"><span>Max experience (yrs)</span><input type="number" min="0" max="40" value={f.exp_max} onChange={up('exp_max')} /></label>
          <label className="field"><span>Location *</span><input required value={f.location} onChange={up('location')} placeholder="e.g. Bengaluru / Pan India" /></label>
          <label className="field"><span>Post date *</span><input type="date" required value={f.posted_at} onChange={up('posted_at')} /></label>
          <label className="field"><span>Job type</span>
            <select value={f.job_type} onChange={up('job_type')}>{['Full-time', 'Internship', 'Contract', 'Part-time'].map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <label className="field"><span>Work mode</span>
            <select value={f.work_mode} onChange={up('work_mode')}>{['On-site', 'Remote', 'Hybrid'].map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <label className="field"><span>Salary (optional)</span><input value={f.salary || ''} onChange={up('salary')} placeholder="e.g. ₹6–10 LPA" /></label>
          <label className="field"><span>Company logo URL (optional)</span><input value={f.logo_url || ''} onChange={up('logo_url')} placeholder="https://…/logo.png" /></label>
          <label className="field full"><span>Apply link *</span><input required value={f.apply_link} onChange={up('apply_link')} placeholder="https://careers.company.com/job/123" /></label>
          <label className="field full"><span>Job description (JD) *</span>
            <textarea required rows={10} value={f.description} onChange={up('description')} placeholder={'Paste the full JD here.\nTip: start lines with "-" to show bullet points.'} />
          </label>
          <label className="field full">
            <span>Skills (comma separated) <button type="button" className="link-btn inline" onClick={autoSkills}><Sparkles size={13} /> Auto-detect from JD</button></span>
            <input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="React, Node.js, SQL" />
          </label>
          <label className="switch full">
            <input type="checkbox" checked={f.is_active} onChange={up('is_active')} />
            <span className="slider" /> Visible on website
          </label>
        </div>
        {err && <div className="form-err">{err}</div>}
        <div className="drawer-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : initial?.id ? 'Save changes' : 'Publish job'}</button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function Dashboard({ onLogout }) {
  const { reload: reloadPublic, notify } = useApp();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [tab, setTab] = useState('jobs');
  useEffect(() => { markAsAdmin(); }, []); // don't count your own visits

  const load = async () => {
    setLoading(true);
    try { setJobs(await fetchJobs({ includeInactive: true })); } catch (e) { notify('⚠ ' + e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const refresh = (msg) => { setEditing(null); load(); reloadPublic(); if (msg) notify(msg); };

  const stats = useMemo(() => ({
    total: jobs.length,
    active: jobs.filter((j) => j.is_active).length,
    clicks: jobs.reduce((a, j) => a + (j.apply_clicks || 0), 0),
    views: jobs.reduce((a, j) => a + (j.views || 0), 0),
  }), [jobs]);

  const list = jobs.filter((j) => `${j.company} ${j.role} ${j.location}`.toLowerCase().includes(q.toLowerCase()));

  const toggle = async (j) => { await saveJob({ id: j.id, is_active: !j.is_active }); refresh(j.is_active ? 'Job hidden' : 'Job is live'); };
  const remove = async (j) => { await deleteJob(j.id); setConfirmDel(null); refresh('Job deleted'); };

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container admin-top-inner">
          <Link to="/"><Logo /></Link>
          <span className="admin-tag">Dashboard</span>
          <div className="spacer" />
          <ThemeToggle />
          <Link to="/" className="btn btn-ghost btn-sm" target="_blank"><ExternalLink size={14} /> View site</Link>
          <button className="btn btn-ghost btn-sm" onClick={async () => { await adminLogout(); onLogout(); }}><LogOut size={14} /> Logout</button>
        </div>
      </header>

      <div className="container">
        {DEMO_MODE && <div className="demo-note">Demo mode: jobs are saved only in this browser. Connect Supabase (see README) to make them live for everyone.</div>}
        <div className="admin-hero">
          <div><h1>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} <span className="muted">{new Date().getFullYear()}</span></h1><p className="muted">A new job shows on the site right away, and as the latest-job popup for visitors.</p></div>
          <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary btn-lg" onClick={() => setEditing({})}>
            <Plus size={18} /> Post new job
          </motion.button>
        </div>

        <div className="admin-tabs">
          {[['jobs', 'Jobs'], ['import', 'Auto-import'], ['analytics', 'Visitors']].map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {tab === k && <motion.span layoutId="admin-tab" className="admin-tab-pill" />}
              <span>{l}</span>
            </button>
          ))}
        </div>

        {tab === 'import' ? <ImportQueue onPublished={(m) => refresh(m)} notify={notify} /> : tab === 'analytics' ? <Analytics jobs={jobs} /> : (<>
        <div className="stats">
          {[
            { i: Briefcase, l: 'Total jobs', v: stats.total },
            { i: TrendingUp, l: 'Live jobs', v: stats.active },
            { i: MousePointerClick, l: 'Apply clicks', v: stats.clicks },
            { i: Eye, l: 'Job views', v: stats.views },
          ].map((s, i) => (
            <motion.div key={s.l} className="stat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}>
              <div className="kpi-top"><small>{s.l}</small><s.i size={16} strokeWidth={1.5} className="muted" /></div><b>{s.v}</b>
            </motion.div>
          ))}
        </div>

        <div className="panel">
          <div className="table-head">
            <h3>All jobs</h3>
            <label className="search-box sm"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs…" /></label>
          </div>
          {loading ? <div className="center"><Loader2 className="spin" /></div> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Role / Company</th><th>Exp</th><th>Posted</th><th>Clicks</th><th>Status</th><th /></tr></thead>
                <tbody>
                  <AnimatePresence>
                    {list.map((j) => (
                      <motion.tr key={j.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }}>
                        <td><b>{j.role}</b><small className="muted block">{j.company} · {j.location}</small></td>
                        <td>{expLabel(j)}</td>
                        <td>{timeAgo(j.posted_at)}</td>
                        <td>{j.apply_clicks || 0}</td>
                        <td><button className={`status ${j.is_active ? 'on' : ''}`} onClick={() => toggle(j)}>{j.is_active ? <><Eye size={13} /> Live</> : <><EyeOff size={13} /> Hidden</>}</button></td>
                        <td className="row-actions">
                          <button className="icon-btn" title="Edit" onClick={() => setEditing(j)}><Pencil size={15} /></button>
                          <button className="icon-btn" title="Duplicate" onClick={() => setEditing({ ...j, id: undefined, posted_at: today() })}><Copy size={15} /></button>
                          <button className="icon-btn danger" title="Delete" onClick={() => setConfirmDel(j)}><Trash2 size={15} /></button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {list.length === 0 && <p className="muted center">No jobs yet — click “Post new job”.</p>}
            </div>
          )}
        </div>
        </>)}
      </div>

      <AnimatePresence>
        {editing && <JobForm initial={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
        {confirmDel && (
          <motion.div className="popup-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDel(null)}>
            <motion.div className="popup small-pop" initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}>
              <h3>Delete this job?</h3>
              <p className="muted">“{confirmDel.role}” at {confirmDel.company} will be permanently removed. Tip: use Hide instead if you may need it later.</p>
              <div className="popup-actions">
                <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => remove(confirmDel)}><Trash2 size={16} /> Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Admin() {
  const [state, setState] = useState('loading');
  useEffect(() => { adminSession().then((ok) => setState(ok ? 'in' : 'out')); }, []);
  if (state === 'loading') return <div className="admin-login"><Loader2 className="spin" /></div>;
  return state === 'in' ? <Dashboard onLogout={() => setState('out')} /> : <Login onDone={() => setState('in')} />;
}
