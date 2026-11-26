import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Eye, Loader2, RefreshCw, Smartphone, Table2, BarChart3, TrendingDown, TrendingUp, Users, Globe } from 'lucide-react';
import { fetchVisitStats } from '../lib/analytics';
import { DEMO_MODE } from '../config';
import { findJobByParam } from '../lib/utils';

const RANGES = [7, 30, 90];
const fmt = (n) => (n ?? 0).toLocaleString('en-IN');
const dayLabel = (d, long) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });

function Kpi({ icon: Icon, label, value, sub, live, delay }) {
  return (
    <motion.div className="stat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(delay, 0.25), ease: [0.22, 1, 0.36, 1] }}>
      <div className="kpi-top"><small>{label}</small>{live && <span className="live-dot" aria-label="Live" />}</div>
      <b>{fmt(value)}</b>
      {sub}
    </motion.div>
  );
}

function Change({ now, before }) {
  if (!before) return <span className="kpi-sub muted">no visitors yesterday</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <span className={`kpi-sub ${up ? 'up' : 'down'}`}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {up ? '+' : ''}{pct}% <span className="muted">vs yesterday</span>
    </span>
  );
}

// Single-series bar chart: unique visitors per day (page views shown in the tooltip)
function DailyChart({ data }) {
  const wrap = useRef(null);
  const [w, setW] = useState(800);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const H = 260, padL = 40, padR = 8, padT = 12, padB = 28;
  const max = Math.max(4, ...data.map((d) => d.visitors));
  // "nice" round axis steps: 1, 2, 5, 10, 20, 25, 50 …
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw && Number.isInteger(s)) || 10 * mag;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const innerW = w - padL - padR, innerH = H - padT - padB;
  const slot = innerW / data.length;
  const barW = Math.max(2, Math.min(44, slot * 0.72, slot - 2));
  const y = (v) => padT + innerH - (v / top) * innerH;
  const every = Math.ceil(data.length / Math.max(2, Math.floor(innerW / 70)));

  return (
    <div className="chart-wrap" ref={wrap} onMouseLeave={() => setHover(null)}>
      <svg width={w} height={H} role="img" aria-label="Unique visitors per day">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={padL - 8} y={y(t) + 4} className="axis-text" textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const h = Math.max(d.visitors ? 2 : 0, (d.visitors / top) * innerH);
          const r = Math.min(4, barW / 2);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
              <rect x={padL + i * slot} y={padT} width={slot} height={innerH} fill="transparent" />
              <motion.path
                className={`bar ${i === data.length - 1 ? 'today' : ''} ${hover === i ? 'on' : ''}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: Math.min(i, 6) * 0.04 }}
                style={{ originY: 1, transformBox: 'fill-box' }}
                d={h > 0
                  ? `M${x},${padT + innerH} V${padT + innerH - h + r} Q${x},${padT + innerH - h} ${x + r},${padT + innerH - h} H${x + barW - r} Q${x + barW},${padT + innerH - h} ${x + barW},${padT + innerH - h + r} V${padT + innerH} Z`
                  : ''}
              />
              {i % every === 0 && <text x={x + barW / 2} y={H - 8} className="axis-text" textAnchor="middle">{dayLabel(d.day)}</text>}
            </g>
          );
        })}
        <line x1={padL} x2={w - padR} y1={padT + innerH} y2={padT + innerH} className="base-line" />
      </svg>
      <AnimatePresence>
        {hover != null && data[hover] && (
          <motion.div className="chart-tip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ left: Math.min(Math.max(padL + hover * slot + slot / 2, 80), w - 80), top: y(data[hover].visitors) - 8 }}>
            <b>{dayLabel(data[hover].day, true)}</b>
            <span><i className="sw" /> {fmt(data[hover].visitors)} visitors</span>
            <span className="muted">{fmt(data[hover].views)} page views</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BarList({ title, icon: Icon, rows, valueKey, labelFn = (x) => x, unit }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  const total = rows.reduce((a, r) => a + r[valueKey], 0) || 1;
  return (
    <div className="panel">
      <h3 className="panel-title"><Icon size={16} strokeWidth={1.5} className="muted" /> {title}</h3>
      {rows.length === 0 ? <p className="muted small">No data yet.</p> : (
        <ul className="bar-list">
          {rows.map((r, i) => (
            <li key={r.name}>
              <div className="bl-row"><span className="bl-name">{labelFn(r.name)}</span><span className="bl-val">{fmt(r[valueKey])} <small className="muted">{unit} · {Math.round((r[valueKey] / total) * 100)}%</small></span></div>
              <div className="bl-track"><i className={i === 0 ? 'lead' : ''} style={{ width: `${(r[valueKey] / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Analytics({ jobs }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [asTable, setAsTable] = useState(false);

  const load = async () => {
    setBusy(true);
    try { setData(await fetchVisitStats(days)); setErr(''); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [days]);

  const pageName = useMemo(() => (p) => {
    if (!p) return 'Unknown';
    const path = p.split('?')[0];
    if (path === '/') return 'Home';
    if (path === '/jobs') return p.includes('?') ? `All jobs (${p.split('?')[1].replace(/=/g, ': ').replace(/&/g, ', ')})` : 'All jobs';
    if (path === '/saved') return 'Saved jobs';
    if (path === '/resume-check' || path === '/ats') return 'ATS checker';
    if (path.startsWith('/job/')) {
      const j = findJobByParam(jobs, decodeURIComponent(path.slice(5)));
      return j ? `${j.role} · ${j.company}` : 'Job (removed)';
    }
    return path;
  }, [jobs]);

  if (err) return (
    <div className="panel">
      <h3>Could not load analytics</h3>
      <p className="muted small">{err}</p>
      <p className="small">If it says the function or table doesn't exist, run the updated <code>supabase/schema.sql</code> in Supabase → SQL Editor once more.</p>
    </div>
  );
  if (!data) return <div className="center"><Loader2 className="spin" /></div>;

  const d = data.daily || [];
  const yesterday = d.length > 1 ? d[d.length - 2].visitors : 0;
  const avg = d.length ? Math.round(d.reduce((a, x) => a + x.visitors, 0) / d.length) : 0;

  return (
    <div className="analytics">
      {DEMO_MODE && <div className="demo-note">Demo mode: these are sample numbers. Real visitors are counted once Supabase is connected.</div>}

      <div className="an-head">
        <div className="sort-toggle">
          {RANGES.map((r) => (
            <button key={r} className={days === r ? 'on' : ''} onClick={() => setDays(r)}>
              {days === r && <motion.span layoutId="range-pill" className="sort-pill" />}
              <span>Last {r} days</span>
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={busy}><RefreshCw size={14} className={busy ? 'spin' : ''} /> Refresh</button>
      </div>

      <div className="stats kpis">
        <Kpi icon={Users} label="Visitors today" value={data.today_visitors} sub={<Change now={data.today_visitors} before={yesterday} />} delay={0} />
        <Kpi icon={Eye} label="Page views today" value={data.today_views} delay={0.05} />
        <Kpi icon={Activity} label="Online now (last 5 min)" value={data.online_now} live delay={0.1} />
        <Kpi icon={BarChart3} label={`Visitors · last ${days} days`} value={data.period_visitors} sub={<span className="kpi-sub muted">avg {fmt(avg)} / day · {fmt(data.period_views)} views</span>} delay={0.15} />
        <Kpi icon={Globe} label="All-time visitors" value={data.all_time_visitors} delay={0.2} />
        <Kpi icon={Smartphone} label={`App users · last ${days} days`} value={data.app_visitors} delay={0.25} />
      </div>

      <div className="panel">
        <div className="table-head">
          <div>
            <h3>Daily visitors</h3>
            <p className="muted small">Unique visitors per day, Indian time. Hover a bar for page views</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setAsTable((t) => !t)}>
            {asTable ? <><BarChart3 size={14} /> Chart</> : <><Table2 size={14} /> Table</>}
          </button>
        </div>
        {asTable ? (
          <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="table">
              <thead><tr><th>Date</th><th>Visitors</th><th>Page views</th></tr></thead>
              <tbody>{[...d].reverse().map((r) => <tr key={r.day}><td>{dayLabel(r.day, true)}</td><td>{fmt(r.visitors)}</td><td>{fmt(r.views)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <DailyChart data={d} />}
      </div>

      <div className="an-grid">
        <BarList title="Where visitors come from" icon={Globe} rows={data.sources || []} valueKey="visitors" unit="visitors" />
        <BarList title="Devices" icon={Smartphone} rows={data.devices || []} valueKey="visitors" unit="visitors" />
      </div>
      <BarList title="Most viewed pages" icon={Eye} rows={data.top_pages || []} valueKey="views" unit="views" labelFn={pageName} />

      <div className="panel tip-panel">
        <b>Track sources exactly</b>
        <p className="small muted">Telegram and WhatsApp often hide where a visitor came from. Add a tag to the links you share so each visit is counted under the right source</p>
        <code>{location.origin}/?ref=telegram</code>
        <code>{location.origin}/?ref=whatsapp</code>
        <code>{location.origin}/job/associate-consultant-iqvia-bengaluru-441bc9f4?ref=instagram</code>
      </div>
    </div>
  );
}
