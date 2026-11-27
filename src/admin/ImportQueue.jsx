// Admin → Auto-import tab: review jobs fetched by the daily import.
// Approving copies a job into the normal jobs table (same as "Post new job").
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, ExternalLink, Loader2, Pencil, RefreshCw, ShieldAlert, Sparkles, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEMO_MODE } from '../config';
import { expLabel } from '../lib/utils';
import './importQueue.css';

const FILTERS = [
  ['all', 'All'], ['fresher', 'Fresher'], ['exp', 'Experienced'], ['IT', 'IT'], ['Non-IT', 'Non-IT'], ['flagged', 'Flagged'],
];
const SOURCE = { adzuna: 'Adzuna', greenhouse: 'Company careers', lever: 'Company careers' };

function ago(iso) {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function Logo({ job, size = 44 }) {
  const [bad, setBad] = useState(false);
  if (job.logo_url && !bad) {
    return <img src={job.logo_url} alt="" className="iq-logo" style={{ width: size, height: size }} onError={() => setBad(true)} />;
  }
  return <span className="iq-logo iq-letter" style={{ width: size, height: size }}>{job.company?.[0]?.toUpperCase()}</span>;
}

export default function ImportQueue({ onPublished, notify }) {
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState({});
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [setupNeeded, setSetupNeeded] = useState(false);

  const load = async () => {
    if (DEMO_MODE) { setLoading(false); return; }
    setLoading(true);
    const [q, s] = await Promise.all([
      supabase.from('job_queue').select('*').eq('status', 'pending').order('fetched_at', { ascending: false }).limit(200),
      supabase.from('import_settings').select('*').eq('id', 1).maybeSingle(),
    ]);
    if (q.error) {
      setSetupNeeded(/job_queue|relation|schema cache/i.test(q.error.message));
      if (!/job_queue|relation|schema cache/i.test(q.error.message)) notify?.('⚠ ' + q.error.message);
    } else {
      setSetupNeeded(false);
      setRows(q.data || []);
    }
    if (s.data) setSettings(s.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const isFresh = (j) => Number(j.exp_min || 0) === 0;
  const counts = useMemo(() => ({
    all: rows.length,
    fresher: rows.filter((j) => isFresh(j) && !j.flag_reason).length,
    exp: rows.filter((j) => !isFresh(j)).length,
    IT: rows.filter((j) => j.category === 'IT').length,
    'Non-IT': rows.filter((j) => j.category !== 'IT').length,
    flagged: rows.filter((j) => j.flag_reason).length,
  }), [rows]);

  const visible = rows.filter((j) =>
    filter === 'all' ? true
      : filter === 'fresher' ? isFresh(j) && !j.flag_reason
        : filter === 'exp' ? !isFresh(j)
          : filter === 'flagged' ? !!j.flag_reason
            : j.category === filter);

  const approve = async (ids) => {
    if (!ids.length) return;
    setBusy((b) => ({ ...b, ...Object.fromEntries(ids.map((i) => [i, 'ok'])) }));
    const { data, error } = await supabase.rpc('approve_queued_jobs', { ids });
    setBusy({});
    if (error) { notify?.('⚠ ' + error.message); return; }
    setRows((r) => r.filter((j) => !ids.includes(j.id)));
    onPublished?.(data === 1 ? 'Job published on the site' : `${data} jobs published on the site`);
  };

  const reject = async (job) => {
    setBusy((b) => ({ ...b, [job.id]: 'no' }));
    const { error } = await supabase.from('job_queue').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', job.id);
    setBusy({});
    if (error) { notify?.('⚠ ' + error.message); return; }
    setRows((r) => r.filter((j) => j.id !== job.id));
    notify?.('Rejected · it won’t be imported again');
  };

  const saveAndApprove = async (job) => {
    const { id, ...rest } = job;
    const patch = {
      company: rest.company, role: rest.role, location: rest.location, job_type: rest.job_type, work_mode: rest.work_mode,
      exp_min: Number(rest.exp_min) || 0, exp_max: Number(rest.exp_max) || 0, salary: rest.salary || null,
      skills: rest.skills, description: rest.description, apply_link: rest.apply_link, logo_url: rest.logo_url || null,
      category: rest.category,
    };
    const { error } = await supabase.from('job_queue').update(patch).eq('id', id);
    if (error) { notify?.('⚠ ' + error.message); return; }
    setEditing(null);
    await approve([id]);
  };

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke('daily-import', { body: {} });
    setRunning(false);
    if (error) {
      notify?.('⚠ Import function not reachable. Deploy it first (see AUTO_IMPORT_GUIDE.md).');
      return;
    }
    if (data?.error) { notify?.('⚠ ' + data.error); return; }
    notify?.(`Import done · ${data.queued} new${data.published ? ` · ${data.published} auto-published` : ''}`);
    await load();
    if (data.published) onPublished?.();
  };

  const updateSettings = async (patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    const { error } = await supabase.from('import_settings').update(patch).eq('id', 1);
    if (error) notify?.('⚠ ' + error.message);
  };

  if (DEMO_MODE) {
    return <div className="panel iq-empty"><b>Auto-import needs Supabase</b><p className="muted">Connect your database first, then follow AUTO_IMPORT_GUIDE.md.</p></div>;
  }
  if (setupNeeded) {
    return (
      <div className="panel iq-empty">
        <b>One-time setup needed</b>
        <p className="muted">Run <code>supabase/auto_import.sql</code> in Supabase → SQL Editor, then deploy the import function. Steps are in <code>AUTO_IMPORT_GUIDE.md</code>.</p>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> Check again</button>
      </div>
    );
  }

  const last = settings?.last_run;
  const cleanIds = rows.filter((j) => !j.flag_reason).map((j) => j.id);
  const freshIds = rows.filter((j) => isFresh(j) && !j.flag_reason).map((j) => j.id);

  return (
    <div className="iq">
      {/* status + settings */}
      <div className="iq-top">
        <div className="panel iq-run">
          <div className="iq-run-head">
            <div>
              <small className="muted">Last import</small>
              <b>{ago(settings?.last_run_at)}</b>
            </div>
            <button className="btn btn-primary btn-sm" onClick={runNow} disabled={running}>
              {running ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} {running ? 'Importing…' : 'Run import now'}
            </button>
          </div>
          {last ? (
            <div className="iq-stats">
              <div><b>{last.fetched}</b><small>Fetched</small></div>
              <div><b>{last.duplicates}</b><small>Duplicates</small></div>
              <div><b>{last.low_quality}</b><small>Low quality</small></div>
              <div className="good"><b>{last.queued}</b><small>{settings?.auto_publish ? 'Added' : 'Queued'}</small></div>
            </div>
          ) : <p className="muted small">No import has run yet. It runs every day at 9:00 AM, or press “Run import now”.</p>}
          {last?.errors?.length > 0 && <p className="iq-err small">{last.errors.join(' · ')}</p>}
        </div>

        <div className="panel iq-settings">
          <small className="muted">Publishing</small>
          <div className="iq-seg" role="group" aria-label="Publishing mode">
            <button className={!settings?.auto_publish ? 'on' : ''} onClick={() => updateSettings({ auto_publish: false })}>Review first</button>
            <button className={settings?.auto_publish ? 'on' : ''} onClick={() => updateSettings({ auto_publish: true })}>Auto-publish</button>
          </div>
          <p className="muted small">{settings?.auto_publish ? 'Clean jobs go live by themselves. Flagged ones still wait here.' : 'Every imported job waits here until you approve it.'}</p>
          <div className="iq-nums">
            <label className="field"><span>IT jobs / day</span>
              <input type="number" min="0" max="40" value={settings?.daily_it ?? 12} onChange={(e) => updateSettings({ daily_it: Math.max(0, Math.min(40, Number(e.target.value) || 0)) })} />
            </label>
            <label className="field"><span>Non-IT / day</span>
              <input type="number" min="0" max="40" value={settings?.daily_non_it ?? 5} onChange={(e) => updateSettings({ daily_non_it: Math.max(0, Math.min(40, Number(e.target.value) || 0)) })} />
            </label>
          </div>
        </div>
      </div>

      {/* toolbar */}
      <div className="iq-bar">
        <h3>Waiting for review <span className="iq-count">{rows.length}</span></h3>
        <div className="iq-bulk">
          <button className="btn btn-ghost btn-sm" disabled={!freshIds.length} onClick={() => approve(freshIds)}><Check size={14} /> Approve all fresher ({freshIds.length})</button>
          <button className="btn btn-ghost btn-sm" disabled={!cleanIds.length} onClick={() => approve(cleanIds)}><Check size={14} /> Approve all clean ({cleanIds.length})</button>
        </div>
      </div>
      <div className="iq-filters">
        {FILTERS.map(([k, l]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l} <span>{counts[k]}</span></button>
        ))}
      </div>

      {loading ? (
        <div className="iq-list">{[0, 1, 2].map((i) => <div key={i} className="iq-card skel" />)}</div>
      ) : visible.length === 0 ? (
        <div className="panel iq-empty">
          <b>{rows.length ? 'Nothing in this filter' : 'All caught up'}</b>
          <p className="muted">{rows.length ? 'Try another filter.' : 'New jobs arrive with the next import (9:00 AM daily).'}</p>
        </div>
      ) : (
        <div className="iq-list">
          <AnimatePresence initial={false}>
            {visible.map((j) => (
              <motion.article
                key={j.id}
                layout
                className={`iq-card ${j.flag_reason ? 'flag' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={busy[j.id] === 'no' ? { opacity: 0, x: -40 } : { opacity: 0, x: 60, scale: 0.97 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="iq-head">
                  <Logo job={j} />
                  <div className="iq-title">
                    <b>{j.role}</b>
                    <span>{j.company} · {j.location}</span>
                  </div>
                  <span className="iq-src">{SOURCE[j.source] || j.source}</span>
                </div>

                <div className="iq-tags">
                  <span className={`iq-tag ${isFresh(j) ? 'fr' : 'ex'}`}>{isFresh(j) ? 'Fresher' : `Experienced · ${expLabel(j)}`}</span>
                  <span className={`iq-tag ${j.category === 'IT' ? 'it' : 'nit'}`}>{j.category}</span>
                  <span className="iq-tag">{j.job_type}</span>
                  {j.work_mode !== 'On-site' && <span className="iq-tag">{j.work_mode}</span>}
                  {j.salary && <span className="iq-tag">{j.salary}</span>}
                </div>

                {j.tag_reason && <p className="iq-why">{j.tag_reason.startsWith('says') ? `Tagged because the post ${j.tag_reason}` : `Experience: ${j.tag_reason}`}</p>}
                {j.flag_reason && <p className="iq-flag"><ShieldAlert size={14} /> {j.flag_reason} — likely a scam</p>}
                {!j.logo_url && <p className="iq-note">No logo found · letter icon will be used (add one with Edit)</p>}
                {j.logo_url && j.logo_source === 'guess' && <p className="iq-note">Logo matched from the company name · check it’s the right company</p>}
                {j.skills?.length > 0 && <div className="iq-skills">{j.skills.map((s) => <span key={s}>{s}</span>)}</div>}

                <div className="iq-acts">
                  {j.flag_reason ? (
                    <>
                      <button className="btn btn-danger btn-sm iq-grow" disabled={!!busy[j.id]} onClick={() => reject(j)}><X size={14} /> Reject (recommended)</button>
                      <button className="btn btn-ghost btn-sm" disabled={!!busy[j.id]} onClick={() => setEditing({ ...j })}>Review anyway</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-primary btn-sm iq-grow" disabled={!!busy[j.id]} onClick={() => approve([j.id])}>
                        {busy[j.id] === 'ok' ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Approve &amp; publish
                      </button>
                      <button className="btn btn-ghost btn-sm" disabled={!!busy[j.id]} onClick={() => setEditing({ ...j })}><Pencil size={14} /> Edit</button>
                      <button className="btn btn-ghost btn-sm" disabled={!!busy[j.id]} onClick={() => reject(j)}><X size={14} /> Reject</button>
                    </>
                  )}
                  <a className="btn btn-ghost btn-sm" href={j.apply_link} target="_blank" rel="noreferrer" aria-label="Open original post"><ExternalLink size={14} /></a>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {editing && <EditSheet job={editing} onClose={() => setEditing(null)} onSave={saveAndApprove} />}
      </AnimatePresence>
    </div>
  );
}

function EditSheet({ job, onClose, onSave }) {
  const [j, setJ] = useState(job);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setJ((x) => ({ ...x, [k]: e.target.value }));
  return (
    <motion.div className="iq-sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.form
        className="panel iq-form"
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(j); setSaving(false); }}
      >
        <div className="iq-form-head">
          <Logo job={j} size={48} />
          <div><b>Edit before publishing</b><small className="muted">Changes apply to this job only</small></div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={14} /></button>
        </div>
        <div className="iq-grid">
          <label className="field"><span>Role</span><input value={j.role} onChange={set('role')} required /></label>
          <label className="field"><span>Company</span><input value={j.company} onChange={set('company')} required /></label>
          <label className="field"><span>Location</span><input value={j.location || ''} onChange={set('location')} /></label>
          <label className="field"><span>Category</span>
            <select value={j.category} onChange={set('category')}><option>IT</option><option>Non-IT</option></select>
          </label>
          <label className="field"><span>Experience from (yrs) · 0 = fresher</span><input type="number" min="0" max="30" value={j.exp_min} onChange={set('exp_min')} /></label>
          <label className="field"><span>Experience to (yrs)</span><input type="number" min="0" max="40" value={j.exp_max} onChange={set('exp_max')} /></label>
          <label className="field"><span>Job type</span>
            <select value={j.job_type} onChange={set('job_type')}>{['Full-time', 'Internship', 'Contract', 'Part-time'].map((o) => <option key={o}>{o}</option>)}</select>
          </label>
          <label className="field"><span>Work mode</span>
            <select value={j.work_mode} onChange={set('work_mode')}>{['On-site', 'Remote', 'Hybrid'].map((o) => <option key={o}>{o}</option>)}</select>
          </label>
          <label className="field iq-wide"><span>Logo URL (leave empty for a letter icon)</span><input value={j.logo_url || ''} onChange={set('logo_url')} placeholder="https://…" /></label>
          <label className="field iq-wide"><span>Apply link</span><input value={j.apply_link} onChange={set('apply_link')} required /></label>
          <label className="field iq-wide"><span>Job description</span><textarea rows={8} value={j.description} onChange={set('description')} required /></label>
        </div>
        <div className="iq-acts">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary iq-grow" disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />} Save &amp; publish</button>
        </div>
      </motion.form>
    </motion.div>
  );
}
