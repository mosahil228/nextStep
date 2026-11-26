// ============================================================
//  ATS resume checker — runs 100% in the browser.
//  Finds the problems applicant-tracking systems and recruiters
//  trip over, points to the exact line, and says how to fix it.
// ============================================================
import { extractKeywords } from './resumeMatcher.js';

// ---------- word lists ----------
const ACTION_VERBS = `achieved accelerated analysed analyzed architected automated boosted built centralized championed
coached collaborated completed conducted configured consolidated contributed converted coordinated created cut debugged
decreased defined delivered deployed designed developed diagnosed directed drove eliminated enabled engineered enhanced
established evaluated executed expanded facilitated generated grew guided handled identified implemented improved
increased initiated integrated introduced launched led maintained managed mentored migrated modernized monitored
negotiated optimized orchestrated organized owned partnered pioneered planned prepared presented produced programmed
published reduced redesigned refactored resolved restructured revamped saved scaled secured shipped simplified solved
spearheaded standardized streamlined strengthened supervised supported tested trained transformed tripled upgraded won
wrote analysed researched documented prototyped validated visualized`.split(/\s+/);

const WEAK_PHRASES = [
  'responsible for', 'worked on', 'helped with', 'helped to', 'duties included', 'duties include', 'involved in',
  'assisted in', 'assisted with', 'tasked with', 'participated in', 'was part of', 'in charge of', 'took part in',
];

const BUZZWORDS = [
  'hard-working', 'team player', 'go-getter', 'self-motivated',
  'detail-oriented', 'results-driven', 'result-oriented', 'dynamic',
  'synergy', 'think outside the box', 'go-to person', 'passionate', 'quick learner', 'fast learner',
  'best of breed', 'proactive', 'dedicated', 'motivated individual', 'strategic thinker', 'excellent communication skills',
];

const MISSPELLINGS = {
  responsibilites: 'responsibilities', responsiblities: 'responsibilities', experiance: 'experience', expirience: 'experience',
  managment: 'management', acheived: 'achieved', acheive: 'achieve', recieved: 'received', recieve: 'receive',
  seperate: 'separate', teh: 'the', occured: 'occurred', succesful: 'successful', successfull: 'successful',
  enviroment: 'environment', knowlege: 'knowledge', langauge: 'language', devlopment: 'development',
  developement: 'development', maintainance: 'maintenance', begining: 'beginning', commited: 'committed',
  comunication: 'communication', communcation: 'communication', proficent: 'proficient', profficient: 'proficient',
  analyse: null, analys: 'analysis', databse: 'database', programing: 'programming', implemention: 'implementation',
  aplication: 'application', applicaton: 'application', perfomance: 'performance', performace: 'performance',
  javscript: 'JavaScript', pyhton: 'Python', pythn: 'Python', reactjs: null, recomend: 'recommend', accomodate: 'accommodate',
  independant: 'independent', relevent: 'relevant', excercise: 'exercise', grammer: 'grammar', untill: 'until',
  goverment: 'government', bussiness: 'business', buisness: 'business', calender: 'calendar', definately: 'definitely',
};

const CITIES = `mumbai delhi new delhi bengaluru bangalore hyderabad chennai kolkata pune ahmedabad jaipur lucknow kanpur
noida gurugram gurgaon chandigarh indore bhopal nagpur kochi coimbatore surat vadodara patna bhubaneswar visakhapatnam
thiruvananthapuram mysuru mysore dehradun ranchi raipur guwahati agra varanasi prayagraj allahabad meerut ghaziabad
faridabad nashik aurangabad madurai trichy vijayawada india remote`.split(/\s+/);

const SECTIONS = [
  { id: 'summary', name: 'Summary', re: /^(professional\s+|career\s+)?(summary|profile|objective|about\s*me|career objective)$/i },
  { id: 'experience', name: 'Experience', re: /^((work|professional|relevant)\s+)?(experience|employment|employment history|work history|internships?|internship experience)$/i },
  { id: 'education', name: 'Education', re: /^(education|academics?|academic (details|background|qualifications?)|qualifications?|educational qualifications?)$/i },
  { id: 'skills', name: 'Skills', re: /^((technical|key|core|professional)\s+)?(skills|skill set|technologies|tech stack|competencies|tools( and technologies)?|technical proficiency)$/i },
  { id: 'projects', name: 'Projects', re: /^((academic|personal|key|major|selected)\s+)?projects?$/i },
  { id: 'certifications', name: 'Certifications', re: /^(certifications?|certificates|courses|licenses( and certifications)?|trainings?)$/i },
  { id: 'achievements', name: 'Achievements', re: /^(achievements|awards|accomplishments|honou?rs( and awards)?|extra[- ]?curricular( activities)?|activities|positions of responsibility)$/i },
];

const MONTH = '(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)';
const DATE_FORMATS = [
  { id: 'Mon YYYY', re: new RegExp(`\\b${MONTH}\\.?\\s*'?\\d{2,4}\\b`, 'i') },
  { id: 'MM/YYYY', re: /\b(0?[1-9]|1[0-2])[/.-](19|20)\d{2}\b/ },
  { id: 'YYYY', re: /\b(19|20)\d{2}\b/ },
];

const BULLET_RE = /^\s*([-•*●▪◦‣–—►▸✓✔➢➤>]|\d+[.)])\s+/;
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const FANCY_SYMBOLS_RE = /[★☆✪✦✧❖◆◇■□☐☑✗✘⇒→⟶☎✉📞📧]/u;

// ---------- helpers ----------
const words = (s) => (s.match(/[A-Za-z][A-Za-z'+#.-]*/g) || []);
const clip = (s, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const plain = (s) => s.replace(BULLET_RE, '').trim();
const normHeading = (s) => s.replace(/[:|_*#=~•\-–—]+/g, ' ').replace(/\s+/g, ' ').trim();

function detectSections(lines) {
  const found = {};
  const map = new Array(lines.length).fill(null);
  let current = null;
  lines.forEach((l, i) => {
    const h = normHeading(l.text);
    if (h && h.length <= 45 && words(h).length <= 5) {
      const s = SECTIONS.find((x) => x.re.test(h));
      if (s) { current = s.id; if (!(s.id in found)) found[s.id] = i; map[i] = 'heading'; return; }
    }
    map[i] = current;
  });
  return { found, map };
}

// ---------- main ----------
/**
 * @param {string} text  resume text
 * @param {object} opts  { job?: {role, description, skills}, meta?: {type, pages, columns, tables, images} }
 */
export function runAtsCheck(text, opts = {}) {
  const { job = null, meta = {} } = opts;
  const raw = (text || '').replace(/\r/g, '');
  const lines = raw.split('\n').map((t, i) => ({ i, text: t })).filter((l) => l.text.trim() !== '' || true);
  const nonEmpty = lines.filter((l) => l.text.trim());
  const allWords = words(raw);
  const wordCount = allWords.length;
  const issues = [];
  const passed = [];
  let nid = 0;
  const add = (cat, severity, title, detail, fix, opt = {}) =>
    issues.push({ id: `i${nid++}`, cat, severity, title, detail, fix, lines: opt.lines || [], match: opt.match || null, snippet: opt.snippet || null, deduct: opt.deduct ?? (severity === 'critical' ? 6 : severity === 'warning' ? 3 : 1) });
  const pass = (cat, text) => passed.push({ cat, text });

  // ---------- 0. could we read it at all? ----------
  const garbled = (raw.match(/�|\(cid:\d+\)/g) || []).length;
  if (wordCount < 60) {
    add('format', 'critical', 'Very little text could be read',
      `Only ${wordCount} words were found. ATS software reads text, not pictures, so a scanned or image-only resume looks almost empty to it.`,
      'Export your resume as a text-based PDF or DOCX from Word or Google Docs instead of scanning or using an image.',
      { deduct: 15 });
  }
  if (garbled > 3) {
    add('format', 'critical', 'Some characters turn into gibberish',
      `${garbled} characters couldn't be decoded. That usually comes from unusual fonts or symbols, and the ATS sees garbage in their place.`,
      'Use a standard font such as Calibri, Arial or Georgia and re-export the PDF.',
      { deduct: 8 });
  }

  const { found, map } = detectSections(lines);

  // ---------- 1. contact ----------
  const top = nonEmpty.slice(0, 12);
  const findLine = (re) => lines.find((l) => re.test(l.text));
  const emailLine = findLine(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const phoneLine = findLine(/(\+?\d[\d\s().-]{8,}\d)/);
  const linkedinLine = findLine(/linkedin\.com\/in\/|linkedin\.com\/|\blinkedin\b/i);
  const portfolioLine = findLine(/github\.com|gitlab\.com|behance\.net|dribbble\.com|portfolio|\.dev\b|\.me\b|\.io\b|leetcode\.com|kaggle\.com/i);
  const cityLine = top.find((l) => CITIES.some((c) => new RegExp(`\\b${c}\\b`, 'i').test(l.text)));
  if (emailLine) pass('contact', 'Email address found'); else add('contact', 'critical', 'No email address', 'Recruiters and the ATS need an email to contact you.', 'Add a professional email (e.g. firstname.lastname@gmail.com) at the top.', { deduct: 4 });
  if (phoneLine) pass('contact', 'Phone number found'); else add('contact', 'critical', 'No phone number', 'Most Indian recruiters call first. Without a number, you may be skipped.', 'Add your mobile number with country code, e.g. +91 98765 43210.', { deduct: 3 });
  if (linkedinLine) pass('contact', 'LinkedIn profile linked'); else add('contact', 'warning', 'No LinkedIn profile', 'Recruiters usually check LinkedIn before calling.', 'Add your LinkedIn URL, e.g. linkedin.com/in/your-name.', { deduct: 2 });
  if (cityLine) pass('contact', 'Location listed'); else add('contact', 'tip', 'No city or location near the top', 'Many ATS filters search candidates by location.', 'Add your city, e.g. "Pune, India" or "Open to relocation".', { deduct: 1 });
  if (emailLine && /^(.*\d{3,}.*|.*(cool|king|queen|rockstar|sexy|baby|angel|lover|hot|420|007).*)@/i.test((emailLine.text.match(/[\w.+-]+@/) || [''])[0])) {
    add('contact', 'tip', 'Email looks informal', 'Nicknames or long numbers in an email look less professional.', 'Use a simple address based on your name.', { lines: [emailLine.i], match: (emailLine.text.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [null])[0], deduct: 1 });
  }

  // ---------- 2. sections ----------
  const isFresher = !found.experience || /fresher|graduate|student|intern/i.test(raw.slice(0, 600));
  const need = [
    ['experience', isFresher ? 'warning' : 'critical', 'No Experience or Internships section', 'ATS software looks for a clearly titled Experience section to read your work history.', 'Add a heading named exactly "Experience" (or "Internships") and list roles with company, title and dates.'],
    ['education', 'critical', 'No Education section', 'Education is a required field in almost every ATS.', 'Add a heading "Education" with degree, college, year and CGPA or percentage.'],
    ['skills', 'critical', 'No Skills section', 'Most ATS keyword matching starts from a Skills section.', 'Add a heading "Skills" listing tools and technologies, e.g. "Python, SQL, Excel, Power BI".'],
  ];
  need.forEach(([id, sev, title, detail, fix]) => {
    if (found[id] != null) pass('sections', `${SECTIONS.find((s) => s.id === id).name} section found`);
    else if (id === 'experience' && found.projects != null && isFresher) pass('sections', 'Projects section stands in for experience');
    else add('sections', sev, title, detail, fix, { deduct: sev === 'critical' ? 5 : 3 });
  });
  if (found.summary != null) pass('sections', 'Summary found'); else add('sections', 'tip', 'No summary at the top', 'A 2–3 line summary tells recruiters who you are in seconds.', 'Add "Summary": your role, years of experience and 2–3 key skills.', { deduct: 1 });
  if (found.projects != null) pass('sections', 'Projects section found'); else if (isFresher) add('sections', 'warning', 'No Projects section', 'For freshers, projects are the best proof of skill.', 'Add 2–3 projects with what you built, the tools used and the result.', { deduct: 2 });
  // headings that look like sections but aren't standard names
  nonEmpty.forEach((l) => {
    const h = normHeading(l.text);
    if (map[l.i] !== 'heading' && h.length >= 4 && h.length <= 28 && /^[A-Z][A-Z &/]+$/.test(h) && words(h).length <= 4 && /(journey|story|what i|my |toolbox|arsenal|stack i|where i)/i.test(h)) {
      add('sections', 'tip', 'Creative section heading', `"${h}" may not be recognised by ATS software.`, 'Use standard headings: Summary, Experience, Education, Skills, Projects, Certifications.', { lines: [l.i], snippet: l.text.trim(), deduct: 1 });
    }
  });

  // ---------- 3. bullets / impact ----------
  const bullets = nonEmpty.filter((l) => {
    const sec = map[l.i];
    if (sec === 'heading') return false;
    const t = l.text.trim();
    if (BULLET_RE.test(t)) return true;
    return (sec === 'experience' || sec === 'projects') && words(t).length >= 6 && !/^\S+@/.test(t);
  });
  const stripYears = (s) => s.replace(/\b(19|20)\d{2}\b/g, '').replace(new RegExp(`\\b${MONTH}\\b`, 'gi'), '');
  const quantified = bullets.filter((l) => /\d/.test(stripYears(l.text)));
  const actionStart = bullets.filter((l) => ACTION_VERBS.includes((words(plain(l.text))[0] || '').toLowerCase()));
  const qPct = bullets.length ? Math.round((quantified.length / bullets.length) * 100) : 0;
  const aPct = bullets.length ? Math.round((actionStart.length / bullets.length) * 100) : 0;

  if (bullets.length < 3) {
    add('impact', 'warning', 'Few bullet points', `Only ${bullets.length} bullet point${bullets.length === 1 ? '' : 's'} describe your work. Short, scannable bullets are easier for both ATS and recruiters.`, 'Describe each role or project in 3–5 bullets starting with "-" or "•".', { deduct: 5 });
  }
  if (bullets.length >= 3) {
    if (qPct >= 40) pass('impact', `${qPct}% of bullets include numbers`);
    else {
      const sample = bullets.filter((l) => !quantified.includes(l)).slice(0, 4);
      add('impact', qPct < 20 ? 'critical' : 'warning', 'Results are not measured',
        `Only ${qPct}% of your bullets include a number. Numbers make your impact believable and stand out.`,
        'Add a number to at least half your bullets: users, %, time saved, ₹, rank, team size. E.g. "Cut page load time by 40%".',
        { lines: sample.map((l) => l.i), snippet: sample[0] && plain(sample[0].text), deduct: qPct < 20 ? 8 : 4 });
    }
    if (aPct >= 60) pass('impact', `${aPct}% of bullets start with an action verb`);
    else {
      const sample = bullets.filter((l) => !actionStart.includes(l)).slice(0, 4);
      add('impact', 'warning', 'Bullets don\'t start with action verbs',
        `${100 - aPct}% of bullets start with something other than a strong verb.`,
        'Start each bullet with a past-tense verb: Built, Led, Improved, Automated, Designed, Reduced.',
        { lines: sample.map((l) => l.i), snippet: sample[0] && plain(sample[0].text), deduct: 4 });
    }
  }
  bullets.forEach((l) => {
    const n = words(l.text).length;
    if (n > 35) add('impact', 'tip', 'Bullet is too long', `This bullet has ${n} words. Recruiters skim; long bullets get skipped.`, 'Keep bullets to one or two lines (about 15–30 words). Split it into two.', { lines: [l.i], snippet: clip(plain(l.text)), deduct: 1 });
  });
  // repeated first verb
  const firstWords = {};
  actionStart.forEach((l) => { const w = words(plain(l.text))[0].toLowerCase(); (firstWords[w] ||= []).push(l.i); });
  Object.entries(firstWords).filter(([, v]) => v.length >= 3).forEach(([w, v]) =>
    add('language', 'tip', `"${w[0].toUpperCase() + w.slice(1)}" starts ${v.length} bullets`, 'Repeating the same verb makes your work sound the same.', `Vary it: e.g. instead of "${w}", try Built, Delivered, Created, Launched or Improved.`, { lines: v, match: w, deduct: 1 }));

  // ---------- 4. language ----------
  nonEmpty.forEach((l) => {
    const low = l.text.toLowerCase();
    WEAK_PHRASES.forEach((p) => {
      if (low.includes(p)) add('language', 'warning', `Weak phrase: "${p}"`, 'This describes a duty, not what you achieved.', `Replace "${p}" with an action verb and a result, e.g. "Built…", "Led…", "Improved… by 20%".`, { lines: [l.i], match: p, snippet: clip(plain(l.text)), deduct: 2 });
    });
    BUZZWORDS.forEach((b) => {
      if (issues.some((x) => x.match === b && x.lines[0] === l.i)) return;
      if (new RegExp(`\\b${b.replace(/[-\s]/g, '[-\\s]?')}\\b`, 'i').test(low)) add('language', 'tip', `Overused buzzword: "${b}"`, 'Recruiters read this on almost every resume; it adds no proof.', 'Remove it, or show it with an example: e.g. "Delivered 3 projects ahead of deadline" instead of "hard-working".', { lines: [l.i], match: b, snippet: clip(plain(l.text)), deduct: 1 });
    });
    const pron = l.text.match(/\b(I|me|my|myself)\b/);
    if (pron && map[l.i] !== 'summary' && l.i > 3) add('language', 'tip', 'Uses "I", "me" or "my"', 'Resumes are written without personal pronouns.', `Drop "${pron[0]}": e.g. "I built a dashboard" → "Built a dashboard".`, { lines: [l.i], match: pron[0], snippet: clip(plain(l.text)), deduct: 1 });
    (l.text.match(/[A-Za-z]+/g) || []).forEach((w) => {
      const fix = MISSPELLINGS[w.toLowerCase()];
      if (fix) add('language', 'warning', `Spelling: "${w}"`, 'Spelling mistakes are an easy reason to reject a resume.', `Change "${w}" to "${fix}".`, { lines: [l.i], match: w, snippet: clip(plain(l.text)), deduct: 2 });
    });
    const dup = l.text.match(/\b(\w{2,})\s+\1\b/i);
    if (dup && !/^\d+$/.test(dup[1])) add('language', 'warning', `Repeated word: "${dup[0]}"`, 'A doubled word reads like a typo.', `Remove the extra "${dup[1]}".`, { lines: [l.i], match: dup[0], snippet: clip(plain(l.text)), deduct: 2 });
  });
  if (!issues.some((x) => x.cat === 'language' && x.severity !== 'tip')) pass('language', 'No weak phrases or spelling mistakes found');

  // ---------- 5. formatting ----------
  if (meta.columns) add('format', 'critical', 'Two columns or a table layout', 'Many ATS read left-to-right across the whole page, so two columns get mixed together and text ends up in the wrong place.', 'Use a single-column layout. Put skills in a simple list instead of a side column.', { deduct: 8 });
  if (meta.tables) add('format', 'warning', 'Tables found', 'Text inside tables is often skipped or scrambled by ATS software.', 'Replace tables with plain lines of text.', { deduct: 4 });
  if (meta.images) add('format', 'tip', 'Images or icons in the file', 'Photos, logos and icon graphics are ignored by ATS and can confuse parsing.', 'Remove your photo and icon graphics; write "Email:", "Phone:" as text instead.', { deduct: 1 });
  const emojiLines = nonEmpty.filter((l) => EMOJI_RE.test(l.text) || FANCY_SYMBOLS_RE.test(l.text));
  if (emojiLines.length) add('format', 'warning', 'Emoji or special symbols', `${emojiLines.length} line${emojiLines.length > 1 ? 's use' : ' uses'} emoji or decorative symbols, which many ATS can't read.`, 'Replace them with plain words or a simple "-" bullet.', { lines: emojiLines.slice(0, 6).map((l) => l.i), snippet: clip(emojiLines[0].text.trim()), deduct: 3 });
  const capsLines = nonEmpty.filter((l) => map[l.i] !== 'heading' && words(l.text).length >= 7 && l.text === l.text.toUpperCase() && /[A-Z]/.test(l.text));
  if (capsLines.length) add('format', 'tip', 'Long lines in ALL CAPS', 'Whole sentences in capitals are hard to read.', 'Use normal sentence case; keep capitals for headings only.', { lines: capsLines.map((l) => l.i), snippet: clip(capsLines[0].text.trim()), deduct: 1 });
  const gapLines = nonEmpty.filter((l) => /\S\s{6,}\S/.test(l.text) || /\t.*\t/.test(l.text));
  if (!meta.columns && gapLines.length >= 4) add('format', 'warning', 'Text laid out with big gaps', 'Large gaps between pieces of text usually mean columns or tabs. ATS may join them in the wrong order.', 'Put each piece of information on its own line.', { lines: gapLines.slice(0, 6).map((l) => l.i), snippet: clip(gapLines[0].text.trim()), deduct: 3 });
  if (meta.type === 'image') add('format', 'critical', 'Resume is an image', 'ATS cannot read images at all.', 'Upload a PDF or DOCX exported from a word processor.', { deduct: 15 });
  if (!issues.some((x) => x.cat === 'format')) pass('format', 'Simple, ATS-friendly layout');
  if (meta.type === 'pdf' || meta.type === 'docx') pass('format', `${meta.type.toUpperCase()} file with readable text`);

  // ---------- 6. length ----------
  const pages = meta.pages || Math.max(1, Math.ceil(wordCount / 550));
  if (wordCount >= 60) {
    if (wordCount < 180) add('length', 'warning', 'Resume is too short', `About ${wordCount} words. It probably leaves out projects, skills or results.`, 'Aim for 350–700 words: add projects, skills and measurable results.', { deduct: 5 });
    else if (wordCount < 280) add('length', 'tip', 'Resume is a little short', `About ${wordCount} words. There's room to show more.`, 'Add another project or 1–2 more results with numbers. Aim for 350–700 words.', { deduct: 2 });
    else if (isFresher && (wordCount > 850 || pages > 1)) add('length', 'warning', 'Too long for a fresher', `About ${wordCount} words${meta.pages ? ` on ${meta.pages} pages` : ''}. Freshers should fit on one page.`, 'Cut older or less relevant items and keep it to one page.', { deduct: 4 });
    else if (wordCount > 1300 || pages > 2) add('length', 'warning', 'Resume is very long', `About ${wordCount} words${meta.pages ? ` on ${meta.pages} pages` : ''}. Recruiters spend under a minute on the first read.`, 'Keep it to 1–2 pages; trim older roles to 1–2 bullets each.', { deduct: 4 });
    else pass('length', `Good length (${wordCount} words${meta.pages ? `, ${meta.pages} page${meta.pages > 1 ? 's' : ''}` : ''})`);
  }

  // ---------- 7. dates ----------
  const used = new Set();
  nonEmpty.forEach((l) => {
    if (DATE_FORMATS[0].re.test(l.text)) used.add('Mon YYYY');
    if (DATE_FORMATS[1].re.test(l.text)) used.add('MM/YYYY');
  });
  const expLines = nonEmpty.filter((l) => map[l.i] === 'experience');
  const expHasDates = expLines.some((l) => /\b(19|20)\d{2}\b|present|current/i.test(l.text));
  if (found.experience != null && !expHasDates) add('dates', 'warning', 'Experience has no dates', 'ATS calculate your years of experience from dates. Without them you may be filtered out.', 'Add start and end dates to each role, e.g. "Jun 2024 – Present".', { lines: found.experience != null ? [found.experience] : [], deduct: 3 });
  if (used.size > 1) {
    const mixed = nonEmpty.filter((l) => DATE_FORMATS[1].re.test(l.text));
    add('dates', 'warning', 'Mixed date formats', `You use both "${[...used].join('" and "')}" styles.`, 'Pick one format everywhere, e.g. "Jun 2024 – Aug 2024".', { lines: mixed.slice(0, 4).map((l) => l.i), snippet: mixed[0] && clip(plain(mixed[0].text)), match: mixed[0] && (mixed[0].text.match(DATE_FORMATS[1].re) || [null])[0], deduct: 2 });
  }
  if (!issues.some((x) => x.cat === 'dates')) pass('dates', 'Dates look consistent');

  // ---------- 8. keywords (only with a job) ----------
  let keywords = null;
  if (job && (job.description || '').trim().length > 40) {
    const kws = extractKeywords(`${job.role || ''}\n${job.description}`, job.skills || []);
    const lowRaw = ' ' + raw.toLowerCase().replace(/[^\w+#./\s-]/g, ' ') + ' ';
    const has = (k) => new RegExp(`(^|[\\s,(/])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[\\s,)/.:;])`, 'i').test(lowRaw);
    const matched = kws.filter(has);
    const missing = kws.filter((k) => !has(k));
    keywords = { matched, missing, total: kws.length, pct: kws.length ? Math.round((matched.length / kws.length) * 100) : 0 };
    if (!kws.length) { /* nothing to compare */ }
    else if (keywords.pct >= 70) pass('keywords', `${matched.length} of ${kws.length} job keywords found`);
    else add('keywords', keywords.pct < 40 ? 'critical' : 'warning', `Missing ${missing.length} keywords from the job`,
      `Your resume contains ${matched.length} of ${kws.length} keywords from this job description. ATS rank resumes by keyword match.`,
      `Add the ones you genuinely have, especially: ${missing.slice(0, 6).join(', ')}. Put them in Skills and in your bullets.`,
      { deduct: Math.round((1 - keywords.pct / 100) * 10) });
    if (job.role && !new RegExp(job.role.split(/[\s–-]+/).filter((w) => w.length > 3).slice(0, 2).join('|'), 'i').test(raw.slice(0, 500))) {
      add('keywords', 'tip', 'Job title not near the top', `The words from "${job.role}" don't appear in your headline or summary.`, `Add a headline like "${job.role}" under your name.`, { deduct: 1 });
    }
  }

  // ---------- scoring ----------
  const CATS = [
    { id: 'contact', name: 'Contact details', max: 10 },
    { id: 'sections', name: 'Sections', max: 15 },
    { id: 'format', name: 'ATS formatting', max: 15 },
    { id: 'impact', name: 'Impact & results', max: 25 },
    { id: 'language', name: 'Wording & spelling', max: 10 },
    { id: 'length', name: 'Length', max: 10 },
    { id: 'dates', name: 'Dates', max: 5 },
  ];
  if (keywords) CATS.push({ id: 'keywords', name: 'Job keywords', max: 10 });
  const totalMax = CATS.reduce((a, c) => a + c.max, 0);
  const categories = CATS.map((c) => {
    const list = issues.filter((x) => x.cat === c.id);
    const lost = Math.min(c.max, list.reduce((a, x) => a + x.deduct, 0));
    const pts = c.max - lost;
    return { ...c, score: pts, pct: Math.round((pts / c.max) * 100), issues: list.length, critical: list.filter((x) => x.severity === 'critical').length };
  });
  let score = Math.round((categories.reduce((a, c) => a + c.score, 0) / totalMax) * 100);
  if (wordCount < 60) score = Math.min(score, 25);

  const order = { critical: 0, warning: 1, tip: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  const grade = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs work' : 'Poor';
  return {
    score, grade, categories, issues, passed, keywords, lines,
    sections: Object.keys(found),
    stats: { words: wordCount, bullets: bullets.length, quantifiedPct: qPct, actionPct: aPct, pages, fresher: isFresher },
    counts: { critical: issues.filter((x) => x.severity === 'critical').length, warning: issues.filter((x) => x.severity === 'warning').length, tip: issues.filter((x) => x.severity === 'tip').length },
  };
}

// ---------- file reading with layout hints ----------
export async function readResumeDetailed(file) {
  const name = file.name.toLowerCase();
  if (/\.(png|jpe?g|webp|gif|heic)$/.test(name)) return { text: '', meta: { type: 'image' } };
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = '';
    let wideGapRows = 0, rows = 0, images = false;
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const width = page.getViewport({ scale: 1 }).width;
      const tc = await page.getTextContent();
      // group text pieces into rows by their y position
      const byRow = new Map();
      tc.items.forEach((it) => {
        if (!it.str || !it.str.trim()) return;
        const y = Math.round(it.transform[5] / 3) * 3;
        if (!byRow.has(y)) byRow.set(y, []);
        byRow.get(y).push({ x: it.transform[4], w: it.width || 0, s: it.str });
      });
      const ys = [...byRow.keys()].sort((a, b) => b - a);
      ys.forEach((y) => {
        const items = byRow.get(y).sort((a, b) => a.x - b.x);
        rows++;
        let line = '';
        let gapBig = false;
        items.forEach((it, k) => {
          if (k > 0) {
            const prev = items[k - 1];
            const gap = it.x - (prev.x + prev.w);
            if (gap > width * 0.18) gapBig = true;
            line += gap > 2 ? ' ' : '';
          }
          line += it.s;
        });
        if (gapBig && items.length >= 2) wideGapRows++;
        text += line.replace(/\s+/g, ' ').trim() + '\n';
      });
      try {
        const ops = await page.getOperatorList();
        if (ops.fnArray.some((fn) => fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintJpegXObject)) images = true;
      } catch {}
    }
    // many rows with two far-apart pieces of text → two-column layout
    const columns = rows > 10 && wideGapRows / rows > 0.22;
    return { text, meta: { type: 'pdf', pages: pdf.numPages, columns, images } };
  }
  if (name.endsWith('.docx')) {
    const mod = await import('mammoth/mammoth.browser.js');
    const mammoth = mod.default || mod;
    const buf = await file.arrayBuffer();
    const [{ value: text }, { value: html }] = await Promise.all([
      mammoth.extractRawText({ arrayBuffer: buf }),
      mammoth.convertToHtml({ arrayBuffer: buf.slice(0) }),
    ]);
    return { text, meta: { type: 'docx', tables: /<table/i.test(html), images: /<img/i.test(html) } };
  }
  if (name.endsWith('.doc')) return { text: '', meta: { type: 'doc' } };
  return { text: await file.text(), meta: { type: 'txt' } };
}

// A sample resume with typical mistakes, so visitors can try the checker
export const SAMPLE_RESUME = `Rahul Sharma
rahulcool1999@gmail.com | +91 98765 43210

CAREER OBJECTIVE
I am a hard-working and passionate fresher looking for a challenging role in a dynamic company.

EDUCATION
B.Tech in Computer Science, ABC Institute of Technology, 2025 - CGPA 7.8

SKILLS
Java, Python, HTML, CSS, MySQL, communication skills

PROJECTS
Online Food Ordering Website
- Responsible for making the frontend of the website using HTML and CSS
- Worked on the database part using MySQL and and Java
- I helped with testing the website before submission

College Event App
- Developed an Android app for college events used by students
- Developed login and notification features
- Developed admin panel for event managment

INTERNSHIP
Web Development Intern, XYZ Solutions — 06/2024 to Aug 2024
- Worked on fixing bugs in company website
- Assisted in creating new pages for clients
`;
