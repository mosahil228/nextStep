// ============================================================
//  Resume ⇄ JD matcher (runs 100% in the browser, nothing uploaded)
// ============================================================

// Fragments of multi-word phrases that are not skills on their own
const SPLIT_NOISE = new Set(`machine learning deep computer vision google cloud data analysis science power bi generative
warehouse ui ux research design systems user native unit automation manual stakeholder management business gap
process mapping digital content writing analytics social media problem solving customer service structures object
oriented patterns financial boot a/b testing requirements presentation operations sales`.split(/\s+/));

// Known skills / keywords dictionary (lower-case). Multi-word allowed.
const SKILLS = `javascript typescript react react.js reactjs next.js nextjs angular vue redux html css sass tailwind bootstrap jquery
node.js nodejs express nestjs python django flask fastapi java spring spring boot hibernate jpa kotlin swift c c++ c# .net asp.net go golang rust php laravel ruby rails scala
sql mysql postgresql postgres mongodb redis cassandra oracle dynamodb firebase supabase elasticsearch kafka rabbitmq graphql rest rest api apis microservices
aws azure gcp google cloud docker kubernetes terraform jenkins ci/cd git github gitlab linux bash shell powershell ansible devops networking dns tcp/ip
machine learning deep learning nlp computer vision tensorflow pytorch keras scikit-learn pandas numpy statistics data analysis data science llm generative ai
excel power bi tableau looker quicksight etl data warehouse spark hadoop airflow snowflake databricks a/b testing
figma sketch adobe xd photoshop illustrator ui design ux research prototyping wireframing design systems user research
android ios flutter react native selenium cypress jest playwright testing unit testing automation testing manual testing qa
agile scrum jira confluence kanban sdlc requirements stakeholder management business analysis brd frd gap analysis process mapping
sap salesforce crm erp seo sem digital marketing content writing google analytics social media
communication problem solving leadership teamwork troubleshooting customer service presentation negotiation
dsa data structures algorithms system design oop object oriented design patterns
accounting tally gst finance financial analysis budgeting auditing recruitment hr payroll sales marketing operations`
  .split(/\s+/)
  .filter(Boolean)
  .filter((w) => !SPLIT_NOISE.has(w));

// Multi-word phrases — must be checked first
const PHRASES = [
  'spring boot', 'machine learning', 'deep learning', 'computer vision', 'google cloud', 'rest api', 'data analysis',
  'data science', 'power bi', 'generative ai', 'data warehouse', 'a/b testing', 'ui design', 'ux research', 'design systems',
  'user research', 'react native', 'unit testing', 'automation testing', 'manual testing', 'stakeholder management',
  'business analysis', 'gap analysis', 'process mapping', 'digital marketing', 'content writing', 'google analytics',
  'social media', 'problem solving', 'customer service', 'data structures', 'system design', 'object oriented',
  'design patterns', 'financial analysis', 'asp.net',
];

const ALIASES = {
  'react.js': 'react', reactjs: 'react', 'next.js': 'nextjs', nodejs: 'node.js', postgres: 'postgresql',
  golang: 'go', 'google cloud': 'gcp', 'rest api': 'rest', apis: 'rest', dsa: 'data structures', oop: 'object oriented',
};

const STOP = new Set(`a an the and or of to in on for with as at by from is are be will you your we our us this that
these those it its into using use used work working team role job candidate candidates experience years year
strong good excellent knowledge understanding ability skills skill must should plus preferred required requirements
responsibilities qualifications about who what you'll we're etc including such other least minimum new build
help across within well also any all more based like have has can make ensure able looking per`.split(/\s+/));

const norm = (s) => (ALIASES[s] || s);

function clean(text) {
  return ' ' + (text || '').toLowerCase().replace(/[^\w+#./\s-]/g, ' ').replace(/\s+/g, ' ') + ' ';
}

function containsTerm(cleanText, term) {
  const t = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[\\s,(/])${t}(?=$|[\\s,)/.:;])`, 'i').test(cleanText);
}

export function extractKeywords(jd, extraSkills = []) {
  const txt = clean(jd);
  const found = new Set();
  extraSkills.forEach((s) => s && found.add(norm(s.toLowerCase().trim())));
  PHRASES.forEach((p) => { if (containsTerm(txt, p)) found.add(norm(p)); });
  SKILLS.forEach((s) => { if (s.length > 1 && containsTerm(txt, s)) found.add(norm(s)); });
  // single-letter languages need context
  if (/\bc\s*\+\+|\bc\/c\+\+|\bin c\b/i.test(jd)) found.add('c++');

  // add a few frequent "important" words from the JD (not stop words)
  const freq = {};
  txt.split(' ').forEach((w) => {
    w = w.replace(/^[^\w]+|[^\w+#]+$/g, '');
    if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) return;
    freq[w] = (freq[w] || 0) + 1;
  });
  Object.entries(freq)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .forEach(([w]) => { if (![...found].some((f) => f.includes(w))) found.add(w); });

  return [...found];
}

function resumeHas(resumeClean, kw) {
  if (containsTerm(resumeClean, kw)) return true;
  // check aliases the other way round (resume says "ReactJS", keyword "react")
  return Object.entries(ALIASES).some(([alias, target]) => target === kw && containsTerm(resumeClean, alias));
}

export function analyzeResume(resumeText, job) {
  const r = clean(resumeText);
  const jd = `${job.role}\n${job.description}`;
  const keywords = extractKeywords(jd, job.skills || []);
  const matched = keywords.filter((k) => resumeHas(r, k));
  const missing = keywords.filter((k) => !matched.includes(k));
  const keywordScore = keywords.length ? matched.length / keywords.length : 0;

  // Structure checks (ATS style)
  const checks = [
    { label: 'Contact email', ok: /[\w.+-]+@[\w-]+\.[\w.]+/.test(resumeText) },
    { label: 'Phone number', ok: /(\+?\d[\d\s-]{8,}\d)/.test(resumeText) },
    { label: 'Experience / Internship section', ok: /experience|internship|employment|work history/i.test(resumeText) },
    { label: 'Education section', ok: /education|b\.?tech|b\.?e\b|degree|university|college|bachelor|master/i.test(resumeText) },
    { label: 'Skills section', ok: /skills|technologies|tech stack|tools/i.test(resumeText) },
    { label: 'Projects section', ok: /project/i.test(resumeText) },
    { label: 'Numbers / measurable results', ok: (resumeText.match(/\d+\s?%|\d+\+|\b\d{2,}\b/g) || []).length >= 3 },
    { label: 'Action verbs like built, led or improved', ok: /\b(built|developed|led|designed|improved|implemented|created|optimized|launched|managed|delivered|increased|reduced)\b/i.test(resumeText) },
  ];
  const words = resumeText.split(/\s+/).filter(Boolean).length;
  checks.push({ label: `Good length (${words} words)`, ok: words >= 250 && words <= 1100 });

  const structureScore = checks.filter((c) => c.ok).length / checks.length;

  // Experience match
  const yrs = [...resumeText.matchAll(/(\d{1,2})\+?\s*(?:years|yrs|year)/gi)].map((m) => +m[1]).filter((n) => n < 40);
  const resumeYears = yrs.length ? Math.max(...yrs) : null;
  const need = Number(job.exp_min || 0);
  let expNote, expScore;
  if (need === 0) { expScore = 1; expNote = 'Fresher-friendly role — experience is not a blocker.'; }
  else if (resumeYears == null) { expScore = 0.5; expNote = `Role needs ${need}+ yrs. Mention your total experience clearly (e.g. "${need}+ years").`; }
  else if (resumeYears >= need) { expScore = 1; expNote = `You mention ${resumeYears} yrs — meets the ${need}+ yrs requirement.`; }
  else { expScore = 0.3; expNote = `You mention ${resumeYears} yrs, role asks ${need}+ yrs. Highlight internships & projects.`; }

  // Title match
  const roleWords = job.role.toLowerCase().split(/[^a-z+#.]+/).filter((w) => w.length > 2 && !STOP.has(w));
  const titleHit = roleWords.filter((w) => r.includes(' ' + w)).length / (roleWords.length || 1);

  const score = Math.round((keywordScore * 0.6 + structureScore * 0.2 + expScore * 0.12 + titleHit * 0.08) * 100);

  const tips = [];
  if (missing.length) tips.push(`Add the missing skills you really have, especially ${missing.slice(0, 5).join(', ')}`);
  if (titleHit < 0.5) tips.push(`Use the job title "${job.role}", or something close, in your summary line`);
  const fix = {
    'Contact email': 'Add an email address at the top',
    'Phone number': 'Add a phone number at the top',
    'Experience / Internship section': 'Add an Experience or Internships section',
    'Education section': 'Add an Education section',
    'Skills section': 'Add a Skills section that lists your tools',
    'Projects section': 'Add two or three projects with what you built',
    'Numbers / measurable results': 'Add numbers to your results, like "cut load time by 40%"',
    'Action verbs like built, led or improved': 'Start points with verbs like built, led or improved',
  };
  checks.filter((c) => !c.ok).forEach((c) => tips.push(fix[c.label] || `Keep it between 250 and 1,100 words, it has ${words} now`));
  if (score >= 75) tips.unshift('Strong match. Tailor your summary to this company, then apply');

  const verdict =
    score >= 80 ? 'Excellent match' : score >= 65 ? 'Good match' : score >= 45 ? 'Average match' : 'Low match';

  return { score: Math.min(100, score), verdict, matched, missing, checks, expNote, tips, keywords };
}

// ---------- File reading ----------
export async function readResumeFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      out += tc.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('') + '\n';
    }
    return out;
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth/mammoth.browser.js');
    const res = await (mammoth.default || mammoth).extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return res.value;
  }
  return await file.text();
}
