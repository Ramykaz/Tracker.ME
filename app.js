/* Tracker.ME — zero-dependency habit, weight, Quran & journal tracker.
   All data lives in localStorage on this device. Export a backup from Settings. */
(() => {
'use strict';

/* ================= constants ================= */
const KEY = 'trackerme:v1';
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
const COLORS = ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c', '#22d3ee', '#f87171'];
const ACCENTS = [['Emerald', '#34d399'], ['Gold', '#e8b04a'], ['Violet', '#a78bfa'], ['Sky', '#38bdf8'], ['Rose', '#fb7185'], ['Ember', '#fb923c']];
const MOODS = ['Rough', 'Low', 'Okay', 'Good', 'Great'];
const MOOD_C = ['#f87171', '#fb923c', '#a1a1aa', '#60a5fa', '#34d399'];
const QPAGES = 604;
const TEMPLATES = [
  { name: 'Pray on time', kind: 'check', freq: { type: 'daily' } },
  { name: 'Workout', kind: 'check', freq: { type: 'interval', n: 2 } },
  { name: 'Gym', kind: 'check', freq: { type: 'weekly', times: 3 } },
  { name: 'Read a book', kind: 'count', target: 10, unit: 'pages', freq: { type: 'daily' } },
  { name: 'Drink water', kind: 'count', target: 8, unit: 'glasses', freq: { type: 'daily' } },
  { name: 'Morning adhkar', kind: 'check', freq: { type: 'daily' } },
  { name: 'Fast (Mon & Thu)', kind: 'check', freq: { type: 'weekdays', days: [1, 4] } },
  { name: 'No social media scrolling', kind: 'avoid' },
  { name: 'No sugar', kind: 'avoid' },
  { name: 'No junk food', kind: 'avoid' },
];

/* ================= dates (timezone-safe day keys) ================= */
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const T = () => keyOf(new Date());
const dayNum = k => { const [y, m, d] = k.split('-'); return Date.UTC(+y, m - 1, +d) / 864e5; };
const keyFromNum = n => { const d = new Date(n * 864e5); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const addDays = (k, n) => keyFromNum(dayNum(k) + n);
const weekday = k => (dayNum(k) + 4) % 7; // 1970-01-01 was a Thursday
const weekStart = k => addDays(k, -((weekday(k) + 6) % 7)); // Monday
const isKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
const fmtCache = {};
const fd = (k, o) => {
  const id = JSON.stringify(o);
  const f = fmtCache[id] || (fmtCache[id] = new Intl.DateTimeFormat(undefined, { ...o, timeZone: 'UTC' }));
  return f.format(new Date(dayNum(k) * 864e5));
};
const relDay = k => {
  const d = dayNum(T()) - dayNum(k);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d === -1) return 'Tomorrow';
  return fd(k, { weekday: 'short', month: 'short', day: 'numeric' });
};
const short = k => fd(k, { month: 'short', day: 'numeric' });

/* ================= utils ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString(undefined, { maximumFractionDigits: d });
const signed = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '±') + num(Math.abs(v), d);
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const buzz = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} };

const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chevL: '<path d="M15 18l-6-6 6-6"/>',
  chevR: '<path d="M9 18l6-6-6-6"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  flame: '<path d="M12 22c4 0 7-2.8 7-6.8 0-4-3-6.2-4.2-10.2C13 7 12 8.8 12 10.8 11 9.8 10 8.6 10 6.6 7 9.4 5 11.6 5 15.2 5 19.2 8 22 12 22z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M12 20h8.5"/><path d="M16.5 3.8a2.1 2.1 0 013 3L7.5 18.8l-4 1 1-4z"/>',
  gear: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8 10.5a5.5 5.5 0 018 0"/><path d="M12 12.5l1.6-2.6"/>',
  book: '<path d="M2.5 5h6a3.5 3.5 0 013.5 3.5V20a2.5 2.5 0 00-2.5-2.5h-7z"/><path d="M21.5 5h-6A3.5 3.5 0 0012 8.5V20a2.5 2.5 0 012.5-2.5h7z"/>',
  pen: '<path d="M12 20h8.5"/><path d="M16.5 3.8a2.1 2.1 0 013 3L7.5 18.8l-4 1 1-4z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  down: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
  up: '<path d="M12 20V8M7 13l5-5 5 5M5 4h14"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10h14V9M10 13h4"/>',
};
const icon = (n, s = 20, w = 2) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

/* ================= state & storage ================= */
const DEFAULTS = () => ({
  v: 1,
  settings: { theme: 'dark', accent: '#34d399', unit: 'kg', weightGoal: null, height: null, quranGoal: 5, quranStart: 1 },
  habits: [], logs: {}, weight: {}, quran: {}, journal: {},
});
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);

function normalize(raw) {
  const d = DEFAULTS();
  if (!isObj(raw)) return d;
  const out = {
    v: 1,
    settings: { ...d.settings, ...(isObj(raw.settings) ? raw.settings : {}) },
    habits: Array.isArray(raw.habits) ? raw.habits.filter(h => isObj(h) && h.id && h.name).map(fixHabit) : [],
    logs: isObj(raw.logs) ? raw.logs : {},
    weight: isObj(raw.weight) ? raw.weight : {},
    quran: isObj(raw.quran) ? raw.quran : {},
    journal: isObj(raw.journal) ? raw.journal : {},
  };
  for (const id in out.logs) if (!isObj(out.logs[id])) delete out.logs[id];
  for (const k in out.weight) if (!isKey(k) || !(+out.weight[k] > 0)) delete out.weight[k];
  for (const k in out.quran) if (!isKey(k) || !(+out.quran[k] > 0)) delete out.quran[k];
  for (const k in out.journal) if (!isKey(k) || !isObj(out.journal[k])) delete out.journal[k];
  return out;
}
function fixHabit(h) {
  const kind = ['check', 'count', 'avoid'].includes(h.kind) ? h.kind : 'check';
  const f = isObj(h.freq) ? h.freq : {};
  const type = ['daily', 'interval', 'weekdays', 'weekly'].includes(f.type) ? f.type : 'daily';
  const freq = { type };
  if (type === 'interval') freq.n = clamp(Math.round(+f.n || 2), 2, 365);
  if (type === 'weekdays') { freq.days = Array.isArray(f.days) ? [...new Set(f.days.map(Number).filter(x => x >= 0 && x <= 6))] : []; if (!freq.days.length) freq.days = [1]; }
  if (type === 'weekly') freq.times = clamp(Math.round(+f.times || 3), 1, 7);
  return {
    id: String(h.id), name: String(h.name).slice(0, 80), kind,
    target: kind === 'count' ? Math.max(1, +h.target || 1) : undefined,
    unit: kind === 'count' ? String(h.unit || '').slice(0, 20) : undefined,
    freq: kind === 'avoid' ? { type: 'daily' } : freq,
    start: isKey(h.start) ? h.start : T(),
    color: typeof h.color === 'string' && /^#[0-9a-f]{6}$/i.test(h.color) ? h.color : COLORS[0],
    archived: !!h.archived,
  };
}

let S;
function load() {
  try { S = normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); }
  catch (e) { S = DEFAULTS(); }
}
let saveTimer = 0, dirty = false;
function save() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(flush, 150); if (typeof scheduleSync === 'function') scheduleSync(); }
function flush() {
  clearTimeout(saveTimer); saveTimer = 0;
  if (!dirty) return;
  dirty = false;
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Could not save — storage is full or blocked'); }
}
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flush();
  else if (lastToday !== T()) { if (D === lastToday) D = T(); lastToday = T(); render(); }
});
addEventListener('storage', e => { if (e.key === KEY && !dirty) { load(); render(); } });

/* ================= view state ================= */
let D = T();             // selected day (shared by Today / Weight / Quran / Journal)
let lastToday = T();
let wRange = '90';
let jShow = 30;
const memo = new Map();
const cached = (k, fn) => memo.has(k) ? memo.get(k) : (memo.set(k, fn()), memo.get(k));

/* ================= habit logic ================= */
const hById = id => S.habits.find(h => h.id === id);
const logOf = (h, k) => S.logs[h.id] && S.logs[h.id][k];
function setLog(h, k, v) {
  const L = S.logs[h.id] || (S.logs[h.id] = {});
  if (!v) delete L[k]; else L[k] = v;
  save();
}
const started = (h, k) => k >= h.start;
function isDue(h, k) {
  if (!started(h, k)) return false;
  const f = h.freq;
  if (f.type === 'interval') return (dayNum(k) - dayNum(h.start)) % f.n === 0;
  if (f.type === 'weekdays') return f.days.includes(weekday(k));
  return true; // daily, weekly (flexible), avoid
}
function isDone(h, k) {
  const v = logOf(h, k);
  if (h.kind === 'avoid') return started(h, k) && !v;
  if (h.kind === 'count') return (+v || 0) >= h.target;
  return !!v;
}
const frac = (h, k) => h.kind === 'count' ? clamp((+logOf(h, k) || 0) / h.target, 0, 1) : (isDone(h, k) ? 1 : 0);
function weekCount(h, k) {
  const w = weekStart(k); let c = 0;
  for (let i = 0; i < 7; i++) { const d = addDays(w, i); if (started(h, d) && d <= T() && isDone(h, d)) c++; }
  return c;
}
function nextDue(h, k) {
  for (let i = 1; i <= 400; i++) { const d = addDays(k, i); if (isDue(h, d)) return d; }
  return null;
}
function freqLabel(h) {
  if (h.kind === 'avoid') return 'Quit';
  const f = h.freq;
  if (f.type === 'interval') return f.n === 2 ? 'Every other day' : `Every ${f.n} days`;
  if (f.type === 'weekdays') return f.days.length === 7 ? 'Every day' : WD_ORDER.filter(d => f.days.includes(d)).map(d => WD[d]).join(' · ');
  if (f.type === 'weekly') return `${f.times}× a week`;
  return 'Every day';
}

/* Streaks & rate. Units are scheduled days (or weeks for "X times a week").
   A unit is 1 (done), 0 (missed) or null (still open: today / this week). */
function stats(h) {
  return cached('st:' + h.id, () => {
    const t = T(), units = [];
    if (h.start > t) return { cur: 0, best: 0, rate: null, total: 0, units };
    if (h.kind !== 'avoid' && h.freq.type === 'weekly') {
      const tw = weekStart(t);
      for (let n = dayNum(weekStart(h.start)), e = dayNum(tw); n <= e; n += 7) {
        const w = keyFromNum(n), met = weekCount(h, w) >= h.freq.times;
        units.push({ k: w, s: met ? 1 : (w === tw ? null : 0) });
      }
    } else {
      for (let n = dayNum(h.start), e = dayNum(t); n <= e; n++) {
        const k = keyFromNum(n);
        if (!isDue(h, k)) continue;
        units.push({ k, s: isDone(h, k) ? 1 : (k === t ? null : 0) });
      }
    }
    let best = 0, run = 0;
    for (const u of units) { if (u.s === 1) { run++; if (run > best) best = run; } else if (u.s === 0) run = 0; }
    let cur = 0;
    for (let i = units.length - 1; i >= 0; i--) { const s = units[i].s; if (s === null) continue; if (s === 1) cur++; else break; }
    const since = h.freq.type === 'weekly' && h.kind !== 'avoid' ? addDays(t, -55) : addDays(t, -29);
    let ok = 0, res = 0;
    for (const u of units) if (u.k >= since && u.s !== null) { res++; ok += u.s; }
    let total = 0; const L = S.logs[h.id] || {};
    if (h.kind === 'avoid') total = units.filter(u => u.s === 1).length;
    else for (const k in L) if (k <= t && isDone(h, k)) total++;
    return { cur, best, rate: res ? ok / res : null, total, units };
  });
}
const wkSpan = h => clamp(Math.floor((dayNum(weekStart(T())) - dayNum(weekStart(h.start))) / 7) + 1, 4, 12);
const streakUnit = h => h.kind !== 'avoid' && h.freq.type === 'weekly' ? 'wk' : 'd';

/* ================= weight & quran helpers ================= */
const weightList = () => cached('wl', () => Object.keys(S.weight).sort().map(k => ({ k, v: +S.weight[k] })));
function prevWeight(k) { const L = weightList(); for (let i = L.length - 1; i >= 0; i--) if (L[i].k < k) return L[i]; return null; }
function quranInfo() {
  return cached('q', () => {
    let total = 0; for (const k in S.quran) total += +S.quran[k] || 0;
    const abs = Math.max(0, (+S.settings.quranStart || 1) - 1 + total);
    const into = abs % QPAGES, page = into + 1;
    const juz = page < 22 ? 1 : Math.min(30, Math.floor((page - 2) / 20) + 1);
    return { total, khatm: Math.floor(abs / QPAGES), page, juz, frac: into / QPAGES };
  });
}
function quranStreak() {
  let k = T(); if (!(+S.quran[k] > 0)) k = addDays(k, -1);
  let n = 0; while (+S.quran[k] > 0) { n++; k = addDays(k, -1); }
  return n;
}

/* ================= small components ================= */
function dateBar() {
  const t = T();
  return `<div class="datebar">
    <button class="icon-btn" data-act="day" data-d="-1" data-fk="dprev" aria-label="Previous day">${icon('chevL')}</button>
    <div class="dlabel"><div class="dmain">${relDay(D)}</div><div class="dsub">${fd(D, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div></div>
    ${D !== t ? '<button class="pill" data-act="today" data-fk="dtoday">Today</button>' : ''}
    <button class="icon-btn" data-act="day" data-d="1" data-fk="dnext" aria-label="Next day" ${D >= t ? 'disabled' : ''}>${icon('chevR')}</button>
  </div>`;
}
function ring(f, size = 76, sw = 8, label = '') {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle class="trk" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${sw}"/>
    <circle class="val" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${sw}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(f, 0, 1))}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    ${label ? `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central">${label}</text>` : ''}
  </svg>`;
}
const streakTag = h => {
  const s = stats(h), hot = s.cur >= 3;
  return `<span class="streak ${hot ? 'hot' : ''}">${icon('flame', 13, 2.2)}${s.cur}${streakUnit(h)}</span>`;
};
const tile = (label, value, cls = '') => `<div class="tile"><span>${label}</span><b class="${cls}">${value}</b></div>`;

function habitRow(h, k, later = false) {
  const done = isDone(h, k), v = +logOf(h, k) || 0;
  if (h.kind === 'avoid') {
    const slip = !!logOf(h, k);
    return `<div class="row quit ${slip ? 'slip' : 'done'}" style="--c:${h.color}">
      <span class="tick" aria-hidden="true">${slip ? icon('x', 22, 2.6) : icon('shield', 20, 2.2)}</span>
      <a class="meta" href="#habit/${h.id}"><div class="name">${esc(h.name)}</div>
        <div class="sub"><span>${slip ? 'Slipped — fresh start tomorrow' : `Clean ${plural(stats(h).cur, 'day')}`}</span></div></a>
      <button class="slip-btn" data-act="toggle" data-id="${h.id}" data-fk="t${h.id}" aria-pressed="${slip}">${slip ? 'Undo slip' : 'I slipped'}</button>
    </div>`;
  }
  let sub = [freqLabel(h)];
  if (h.freq.type === 'weekly') sub = [`${weekCount(h, k)}/${h.freq.times} this week`];
  if (later) { const n = nextDue(h, k); if (n) sub.push('next: ' + relDay(n)); }
  const right = h.kind === 'count' ? `<div class="stepper">
      <button data-act="dec" data-id="${h.id}" data-fk="d${h.id}" aria-label="Decrease">${icon('minus', 18)}</button>
      <input type="number" inputmode="decimal" min="0" step="any" value="${v || ''}" placeholder="0" data-change="count" data-id="${h.id}" data-fk="n${h.id}" aria-label="${esc(h.name)} amount">
      <span class="of">/ ${num(h.target, 2)}${h.unit ? ' ' + esc(h.unit) : ''}</span>
      <button data-act="inc" data-id="${h.id}" data-fk="i${h.id}" aria-label="Increase">${icon('plus', 18)}</button>
    </div>` : '';
  return `<div class="row ${done ? 'done' : ''} ${later ? 'later' : ''}" style="--c:${h.color}">
    <button class="tick" data-act="toggle" data-id="${h.id}" data-fk="t${h.id}" aria-pressed="${done}" aria-label="Mark ${esc(h.name)} ${done ? 'not done' : 'done'}">${icon('check')}</button>
    <a class="meta" href="#habit/${h.id}"><div class="name">${esc(h.name)}</div>
      <div class="sub"><span>${sub.map(esc).join(' · ')}</span>${streakTag(h)}</div></a>
    ${right}
  </div>`;
}

function weightCard(k, compact = true) {
  const v = S.weight[k], prev = prevWeight(k), u = esc(S.settings.unit);
  const delta = v && prev ? +v - prev.v : null;
  const L = weightList().slice(-30);
  return `<section class="card">
    <div class="card-h">${compact ? `<a class="card-t" href="#weight">${icon('scale', 17)} Weight</a>` : `<span class="card-t">${icon('scale', 17)} Log weight</span>`}
      ${delta !== null ? `<span class="delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${signed(delta)} ${u}</span>` : ''}</div>
    <div class="wrow"><input class="big-in" type="number" inputmode="decimal" step="0.1" min="0" value="${v ?? ''}" placeholder="${prev ? num(prev.v) : '0.0'}" data-change="weight" data-fk="win" aria-label="Weight for ${relDay(k)} in ${u}"><span class="unit">${u}</span></div>
    ${compact && L.length > 1 ? chartSlot({ type: 'line', points: L.map(p => ({ x: dayNum(p.k), y: p.v, k: p.k })), spark: true, fmt: y => num(y) + ' ' + S.settings.unit }, 'spark') : ''}
    ${!compact ? `<p class="tiny" style="margin:10px 0 0">${prev ? `Last: ${num(prev.v)} ${u} · ${relDay(prev.k)}` : 'Your first entry starts the chart.'}</p>` : ''}
  </section>`;
}
function quranStepper(k) {
  const p = +S.quran[k] || 0;
  return `<div class="stepper big">
    <button data-act="qdec" data-fk="qd" aria-label="One page less">${icon('minus', 20)}</button>
    <input type="number" inputmode="numeric" min="0" step="1" value="${p || ''}" placeholder="0" data-change="quran" data-fk="qn" aria-label="Pages read ${relDay(k)}">
    <button data-act="qinc" data-fk="qi" aria-label="One page more">${icon('plus', 20)}</button>
  </div>`;
}
function quranCard(k) {
  const q = quranInfo(), g = +S.settings.quranGoal || 0, p = +S.quran[k] || 0;
  return `<section class="card">
    <div class="card-h"><a class="card-t" href="#quran">${icon('book', 17)} Quran</a><span class="sp"></span><span class="tiny">Juz ${q.juz} · p.${q.page}</span></div>
    <div class="qrow">${quranStepper(k)}<span class="muted">pages${g ? ` · ${p >= g ? 'goal met' : `goal ${g}`}` : ''}</span></div>
    <div class="bar" title="Khatm progress"><i style="width:${(q.frac * 100).toFixed(1)}%"></i></div>
    <div class="tiny" style="margin-top:6px">Khatm ${q.khatm + 1} · ${Math.floor(q.frac * 100)}% · ${QPAGES - q.page + 1} pages to go</div>
  </section>`;
}
function journalCard(k, compact) {
  const j = S.journal[k] || {};
  return `<section class="card jcard ${compact ? 'small' : ''}">
    <div class="card-h">${compact ? `<a class="card-t" href="#journal">${icon('pen', 17)} Journal</a>` : `<span class="card-t">How was ${D === T() ? 'today' : 'this day'}?</span>`}
      <span class="sp"></span><span class="tiny" id="wc">${wordCount(j.text)}</span></div>
    <div class="moods" role="group" aria-label="Mood">${MOODS.map((m, i) => `<button class="mood ${j.mood === i + 1 ? 'on' : ''}" style="--m:${MOOD_C[i]}" data-act="mood" data-m="${i + 1}" data-fk="m${i}" aria-pressed="${j.mood === i + 1}"><i></i>${m}</button>`).join('')}</div>
    <textarea class="jt" data-input="jtext" data-fk="jt" placeholder="${compact ? 'A line about your day…' : 'Write freely. Wins, struggles, what you’re grateful for…'}" aria-label="Journal entry">${esc(j.text || '')}</textarea>
  </section>`;
}
const wordCount = t => { const n = (t || '').trim() ? t.trim().split(/\s+/).length : 0; return n ? plural(n, 'word') : ''; };

/* ================= views ================= */
const VIEWS = {};

VIEWS.today = () => {
  const k = D, hr = new Date().getHours();
  const greet = hr < 5 ? 'Late night' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const act = S.habits.filter(h => !h.archived && started(h, k));
  const build = act.filter(h => h.kind !== 'avoid');
  const due = build.filter(h => isDue(h, k)), later = build.filter(h => !isDue(h, k)), quit = act.filter(h => h.kind === 'avoid');
  const all = due.concat(quit), done = all.filter(h => isDone(h, k)).length;
  const f = all.length ? done / all.length : 0;
  const msg = !all.length ? 'Nothing scheduled.' : done === all.length ? 'Everything done. Beautiful.' : `${all.length - done} left${k === T() ? ' today' : ''}.`;
  return `
    <header class="top"><div><h1>${k === T() ? greet : 'Looking back'}</h1></div><span class="sp"></span>
      ${signedIn() ? `<button class="icon-btn" data-act="settings" aria-label="${esc(syncLabel())}" title="${esc(syncLabel())}"><span class="sync-ind" data-s="${syncState}"></span></button>` : ''}
      <button class="icon-btn" data-act="settings" aria-label="Settings">${icon('gear')}</button></header>
    ${dateBar()}
    ${S.habits.length ? `<section class="card hero">${ring(f, 76, 8, all.length ? Math.round(f * 100) + '%' : '–')}
      <div><div class="big">${done}<small> / ${all.length}</small></div><div class="muted" style="margin-top:6px">${msg}</div></div></section>` : ''}
    <div class="grid2">${weightCard(k)}${quranCard(k)}</div>
    ${S.habits.length ? '' : emptyHabits()}
    ${due.length ? `<h2>Habits <span class="cnt">${due.length}</span><span class="sp"></span><a class="link" href="#habits" style="text-transform:none;letter-spacing:0">Manage</a></h2>
      <div class="list">${due.map(h => habitRow(h, k)).join('')}</div>` : ''}
    ${quit.length ? `<h2>Staying clean <span class="cnt">${quit.length}</span></h2><div class="list">${quit.map(h => habitRow(h, k)).join('')}</div>` : ''}
    ${later.length ? `<details class="more"><summary><h2>Not scheduled ${k === T() ? 'today' : 'this day'} <span class="cnt">${later.length}</span></h2></summary>
      <div class="list">${later.map(h => habitRow(h, k, true)).join('')}</div></details>` : ''}
    ${S.habits.length && !due.length && !quit.length ? `<div class="card empty" style="margin-top:12px"><p style="margin:0">No habits scheduled ${k === T() ? 'today' : 'on this day'}.</p></div>` : ''}
    <h2>Journal</h2>
    ${journalCard(k, true)}
  `;
};

function emptyHabits() {
  return `<section class="card empty" style="margin-top:12px">
    <h3>Build your first habit</h3>
    <p>Daily, every few days, certain weekdays or a few times a week. Track things to quit too.</p>
    <div class="chips">${TEMPLATES.slice(0, 6).map((t, i) => `<button class="chip" data-act="tpl" data-i="${i}">${icon('plus', 14)}${esc(t.name)}</button>`).join('')}
      <button class="chip" data-act="new-habit" style="border-color:var(--acc)">${icon('plus', 14)}Custom…</button></div>
  </section>`;
}

VIEWS.habits = () => {
  const act = S.habits.filter(h => !h.archived), arch = S.habits.filter(h => h.archived);
  const build = act.filter(h => h.kind !== 'avoid'), quit = act.filter(h => h.kind === 'avoid');
  const card = h => {
    const s = stats(h), t = T(); let cells = '';
    for (let i = 13; i >= 0; i--) {
      const k = addDays(t, -i);
      let c = 'off';
      if (started(h, k)) {
        if (h.kind === 'avoid') c = logOf(h, k) ? '' : 'on';
        else if (isDone(h, k)) c = 'on';
        else if (h.kind === 'count' && frac(h, k) > 0) c = 'part';
        else if (isDue(h, k) && h.freq.type !== 'weekly' && k !== t) c = '';
        else c = 'off';
      }
      cells += `<i class="${c}" title="${short(k)}"></i>`;
    }
    return `<a class="hcard" href="#habit/${h.id}" style="--c:${h.color}">
      <span class="dot"></span>
      <div class="meta"><div class="name">${esc(h.name)}</div><div class="sub"><span>${esc(freqLabel(h))}${h.kind === 'count' ? ` · ${num(h.target, 2)} ${esc(h.unit || '')}` : ''}</span></div></div>
      <div class="mini" aria-hidden="true">${cells}</div>
      <div class="hstat"><b>${s.cur}<small class="faint">${streakUnit(h)}</small></b><span>streak</span></div>
      <div class="hstat"><b>${s.rate === null ? '–' : Math.round(s.rate * 100) + '%'}</b><span>30-day</span></div>
    </a>`;
  };
  return `
    <header class="top"><div><h1>Habits</h1><div class="sub">${plural(act.length, 'active habit')}</div></div><span class="sp"></span>
      <button class="btn pri" data-act="new-habit">${icon('plus', 18)}New habit</button></header>
    ${!S.habits.length ? emptyHabits() : ''}
    ${build.length ? `<h2>Building <span class="cnt">${build.length}</span></h2><div class="list">${build.map(card).join('')}</div>` : ''}
    ${quit.length ? `<h2>Quitting <span class="cnt">${quit.length}</span></h2><div class="list">${quit.map(card).join('')}</div>` : ''}
    ${arch.length ? `<details class="more"><summary><h2>Archived <span class="cnt">${arch.length}</span></h2></summary><div class="list">${arch.map(card).join('')}</div></details>` : ''}
  `;
};

VIEWS.habit = id => {
  const h = hById(id);
  if (!h) return `<header class="top"><a class="icon-btn back" href="#habits" aria-label="Back">${icon('chevL')}</a><h1>Not found</h1></header>`;
  const s = stats(h), u = streakUnit(h) === 'wk' ? 'week' : 'day';
  let chart = '', chartTitle = '';
  const t = T();
  if (h.kind === 'count') {
    chartTitle = 'Last 30 days';
    const bars = [];
    for (let i = 29; i >= 0; i--) { const k = addDays(t, -i); bars.push({ k, label: short(k), v: +logOf(h, k) || 0, dim: !isDue(h, k) }); }
    chart = chartSlot({ type: 'bar', bars, goal: h.target, color: h.color, fmt: v => `${num(v, 2)} ${h.unit || ''}` });
  } else if (h.kind === 'avoid') {
    chartTitle = 'Slips per week';
    const bars = [];
    for (let i = wkSpan(h) - 1; i >= 0; i--) {
      const w = addDays(weekStart(t), -7 * i); let c = 0;
      for (let d = 0; d < 7; d++) { const k = addDays(w, d); if (k <= t && logOf(h, k)) c++; }
      bars.push({ k: w, label: 'Wk of ' + short(w), v: c, dim: addDays(w, 6) < h.start });
    }
    chart = chartSlot({ type: 'bar', bars, color: 'var(--bad)', fmt: v => plural(v, 'slip'), int: true });
  } else {
    chartTitle = 'Weekly completion';
    const bars = [];
    for (let i = wkSpan(h) - 1; i >= 0; i--) {
      const w = addDays(weekStart(t), -7 * i); let due = 0, ok = 0;
      if (h.freq.type === 'weekly') { due = h.freq.times; ok = Math.min(due, weekCount(h, w)); }
      else for (let d = 0; d < 7; d++) { const k = addDays(w, d); if (k > t || !isDue(h, k)) continue; due++; if (isDone(h, k)) ok++; }
      bars.push({ k: w, label: 'Wk of ' + short(w), v: due ? Math.round(ok / due * 100) : 0, dim: !due || addDays(w, 6) < h.start });
    }
    chart = chartSlot({ type: 'bar', bars, max: 100, color: h.color, fmt: v => v + '%' });
  }
  return `
    <header class="top"><a class="icon-btn back" href="#habits" aria-label="Back to habits">${icon('chevL')}</a>
      <span class="dot" style="--c:${h.color};width:12px;height:12px"></span>
      <div style="min-width:0"><h1 style="overflow:hidden;text-overflow:ellipsis">${esc(h.name)}</h1><div class="sub">${esc(freqLabel(h))}${h.kind === 'count' ? ` · target ${num(h.target, 2)} ${esc(h.unit || '')}` : ''} · since ${fd(h.start, { month: 'short', day: 'numeric', year: 'numeric' })}${h.archived ? ' · archived' : ''}</div></div>
      <span class="sp"></span><button class="btn sm" data-act="edit-habit" data-id="${h.id}">${icon('edit', 16)}Edit</button></header>
    <div class="tiles">
      ${tile(h.kind === 'avoid' ? 'Clean streak' : 'Current streak', `${s.cur}<small>${u}${s.cur === 1 ? '' : 's'}</small>`)}
      ${tile('Best streak', `${s.best}<small>${u}${s.best === 1 ? '' : 's'}</small>`)}
      ${tile(h.freq.type === 'weekly' && h.kind !== 'avoid' ? 'Last 8 weeks' : 'Last 30 days', s.rate === null ? '–' : Math.round(s.rate * 100) + '%')}
      ${tile(h.kind === 'avoid' ? 'Clean days' : 'Times done', s.total)}
    </div>
    <section class="card" style="margin-top:12px"><div class="card-h"><span class="card-t">History</span><span class="sp"></span><span class="tiny">Tap a day to ${h.kind === 'count' ? 'open it' : h.kind === 'avoid' ? 'mark a slip' : 'toggle it'}</span></div>
      ${chartSlot({ type: 'heat', h }, 'heat')}</section>
    <section class="card"><div class="card-h"><span class="card-t">${chartTitle}</span></div>${chart}</section>
  `;
};

VIEWS.weight = () => {
  const L = weightList(), t = T(), u = S.settings.unit, goal = +S.settings.weightGoal || null;
  const from = wRange === 'all' ? (L[0] ? L[0].k : t) : addDays(t, -(+wRange - 1));
  const pts = L.filter(p => p.k >= from);
  const cur = L[L.length - 1], first = pts[0];
  const ch = cur && first && pts.length > 1 ? cur.v - first.v : null;
  const lo = pts.length ? Math.min(...pts.map(p => p.v)) : null;
  const toGoal = cur && goal ? cur.v - goal : null;
  const H = +S.settings.height;
  const bmi = cur && H > 0 ? (u === 'kg' ? cur.v / ((H / 100) ** 2) : 703 * cur.v / (H ** 2)) : null;
  const list = L.slice().reverse();
  return `
    <header class="top"><div><h1>Weight</h1><div class="sub">${cur ? `${num(cur.v)} ${u} · ${relDay(cur.k)}` : 'No entries yet'}</div></div><span class="sp"></span>
      <button class="icon-btn" data-act="settings" aria-label="Settings">${icon('gear')}</button></header>
    ${dateBar()}
    ${weightCard(D, false)}
    <div class="tiles">
      ${tile('Current', cur ? `${num(cur.v)}<small>${u}</small>` : '–')}
      ${tile(wRange === 'all' ? 'Change (all)' : `Change (${wRange}d)`, ch === null ? '–' : `${signed(ch)}<small>${u}</small>`, ch > 0 ? 'up' : ch < 0 ? 'down' : '')}
      ${tile('Lowest', lo === null ? '–' : `${num(lo)}<small>${u}</small>`)}
      ${goal ? tile('To goal', toGoal === null ? '–' : Math.abs(toGoal) < 0.05 ? 'Reached' : `${num(Math.abs(toGoal))}<small>${u} ${toGoal > 0 ? 'to lose' : 'to gain'}</small>`) : bmi ? tile('BMI', num(bmi)) : tile('Entries', L.length)}
    </div>
    <section class="card" style="margin-top:12px">
      <div class="card-h"><span class="card-t">Trend</span><span class="sp"></span>
        <div class="seg" role="group" aria-label="Range">${[['30', '30D'], ['90', '90D'], ['365', '1Y'], ['all', 'All']].map(([v, l]) => `<button class="${wRange === v ? 'on' : ''}" data-act="wrange" data-v="${v}" aria-pressed="${wRange === v}">${l}</button>`).join('')}</div></div>
      ${chartSlot({ type: 'line', points: pts.map(p => ({ x: dayNum(p.k), y: p.v, k: p.k })), avg: true, goal, fmt: y => num(y) + ' ' + u, empty: 'Log your weight for a few days to see the trend.' }, '', 240)}
      <div class="legend"><span><i></i>Daily</span><span><i class="a"></i>7-day average</span>${goal ? '<span><i class="g"></i>Goal</span>' : ''}</div>
    </section>
    ${list.length ? `<h2>Entries <span class="cnt">${list.length}</span></h2><section class="card" style="padding:6px 16px"><div class="rows">
      ${list.slice(0, 60).map((p, i) => { const pr = list[i + 1]; const d = pr ? p.v - pr.v : null;
        return `<div class="r"><span class="sp">${relDay(p.k)}${p.k.slice(0, 4) !== t.slice(0, 4) ? ' ' + p.k.slice(0, 4) : ''}</span>
          <span class="d ${d > 0 ? 'up' : d < 0 ? 'down' : 'faint'}">${d === null ? '' : signed(d)}</span>
          <span class="v">${num(p.v)} ${u}</span>
          <button class="icon-btn" data-act="wdel" data-k="${p.k}" aria-label="Delete entry for ${relDay(p.k)}">${icon('trash', 17)}</button></div>`; }).join('')}
    </div></section>` : ''}
  `;
};

VIEWS.quran = () => {
  const q = quranInfo(), t = T(), g = +S.settings.quranGoal || 0;
  let wk = 0, m30 = 0, days30 = 0;
  for (let i = 0; i < 30; i++) { const k = addDays(t, -i), p = +S.quran[k] || 0; m30 += p; if (p) days30++; if (k >= weekStart(t)) wk += p; }
  const bars = [];
  for (let i = 29; i >= 0; i--) { const k = addDays(t, -i); bars.push({ k, label: short(k), v: +S.quran[k] || 0 }); }
  const hist = Object.keys(S.quran).sort().reverse().slice(0, 10);
  return `
    <header class="top"><div><h1>Quran</h1><div class="sub">Khatm ${q.khatm + 1}${q.khatm ? ` · ${plural(q.khatm, 'khatm')} completed` : ''}</div></div><span class="sp"></span></header>
    <section class="card hero">${ring(q.frac, 96, 9, Math.floor(q.frac * 100) + '%')}
      <div><div class="big">Page ${q.page}<small> / ${QPAGES}</small></div><div class="muted" style="margin-top:6px">Juz ${q.juz} · ${QPAGES - q.page + 1} pages left in this khatm</div></div></section>
    <div style="margin-top:12px">${dateBar()}</div>
    <section class="card"><div class="card-h"><span class="card-t">Pages read ${D === t ? 'today' : relDay(D).toLowerCase() === 'yesterday' ? 'yesterday' : 'on ' + short(D)}</span><span class="sp"></span>${g ? `<span class="tiny">Daily goal ${g}</span>` : ''}</div>
      <div class="qrow">${quranStepper(D)}${g ? `<div class="sp" style="min-width:140px"><div class="bar" style="margin:0"><i style="width:${Math.min(100, (+S.quran[D] || 0) / g * 100)}%"></i></div></div>` : ''}</div></section>
    <div class="tiles">
      ${tile('Streak', `${quranStreak()}<small>days</small>`)}
      ${tile('This week', `${wk}<small>pages</small>`)}
      ${tile('30-day avg', `${num(m30 / 30)}<small>/day</small>`)}
      ${tile('Total logged', `${q.total}<small>pages</small>`)}
    </div>
    <section class="card" style="margin-top:12px"><div class="card-h"><span class="card-t">Last 30 days</span><span class="sp"></span><span class="tiny">${days30}/30 days read</span></div>
      ${chartSlot({ type: 'bar', bars, goal: g || null, int: true, fmt: v => plural(v, 'page') })}</section>
    <section class="card"><div class="card-h"><span class="card-t">Settings</span></div>
      <div class="frow">
        <label class="fld"><span>Daily goal (pages)</span><input class="in" type="number" min="0" max="604" inputmode="numeric" value="${g || ''}" data-change="qgoal"></label>
        <label class="fld"><span>I'm currently on page</span><input class="in" type="number" min="1" max="604" inputmode="numeric" value="${q.page}" data-change="qpage"></label>
        <label class="fld"><span>Khatms completed</span><input class="in" type="number" min="0" inputmode="numeric" value="${q.khatm}" data-change="qkhatm"></label>
      </div><p class="hint" style="margin:8px 0 0">Set your page once; logging pages moves it forward automatically.</p></section>
    ${hist.length ? `<h2>Recent</h2><section class="card" style="padding:6px 16px"><div class="rows">${hist.map(k => `<div class="r"><span class="sp">${relDay(k)}</span><span class="v">${plural(+S.quran[k], 'page')}</span></div>`).join('')}</div></section>` : ''}
  `;
};

VIEWS.journal = () => {
  const t = T(), pts = [];
  for (let i = 59; i >= 0; i--) { const k = addDays(t, -i), m = S.journal[k] && S.journal[k].mood; if (m) pts.push({ x: dayNum(k), y: m, k }); }
  const n = Object.keys(S.journal).length;
  return `
    <header class="top"><div><h1>Journal</h1><div class="sub">${plural(n, 'entry').replace('entrys', 'entries')}</div></div></header>
    ${dateBar()}
    ${journalCard(D, false)}
    <section class="card"><div class="card-h"><span class="card-t">Mood · last 60 days</span></div>
      ${chartSlot({ type: 'line', points: pts, yMin: 1, yMax: 5, yLabels: MOODS, avg: pts.length > 6, fmt: y => MOODS[Math.round(y) - 1] || num(y), empty: 'Pick a mood on a few days to see how you’re trending.' }, '', 200)}</section>
    <h2>Entries</h2>
    <input class="search" type="search" placeholder="Search entries…" data-input="jsearch" aria-label="Search journal">
    <div class="list" id="jlist">${journalList('')}</div>
  `;
};
function journalList(q) {
  q = q.trim().toLowerCase();
  let ks = Object.keys(S.journal).sort().reverse();
  if (q) ks = ks.filter(k => (S.journal[k].text || '').toLowerCase().includes(q));
  if (!ks.length) return `<div class="card empty"><p style="margin:0">${q ? 'No entries match.' : 'Your entries will show up here.'}</p></div>`;
  return ks.slice(0, jShow).map(k => { const j = S.journal[k];
    return `<button class="entry" data-act="goto" data-k="${k}"><span class="dot" style="--c:${j.mood ? MOOD_C[j.mood - 1] : 'var(--s3)'}"></span>
      <span style="min-width:0;flex:1"><b>${relDay(k)}</b>${k.slice(0, 4) !== T().slice(0, 4) ? ' ' + k.slice(0, 4) : ''}${j.mood ? ` <span class="faint">· ${MOODS[j.mood - 1]}</span>` : ''}
      <span class="txt">${esc(j.text || '—')}</span></span></button>`; }).join('') +
    (ks.length > jShow ? `<button class="btn" data-act="jmore">Show more</button>` : '');
}

/* ================= charts (hand-rolled SVG, sized to container) ================= */
const charts = new Map();
let chartSeq = 0;
function chartSlot(spec, cls = '', h) {
  const id = 'c' + (++chartSeq); charts.set(id, spec);
  const height = h || (cls === 'spark' ? 44 : cls === 'heat' ? null : 200);
  return `<div class="chart ${cls}" data-chart="${id}" ${height ? `style="height:${height}px"` : ''}></div>`;
}
function drawCharts() { document.querySelectorAll('[data-chart]').forEach(drawChart); }
function drawChart(el) {
  const spec = charts.get(el.dataset.chart); if (!spec) return;
  const w = Math.max(120, el.clientWidth), h = el.clientHeight;
  if (spec.type === 'heat') { el.innerHTML = heatSVG(spec.h, w); return; }
  const out = spec.type === 'line' ? lineSVG(spec, w, h) : barSVG(spec, w, h);
  el.innerHTML = out.svg + (out.pts ? '<div class="tip"></div>' : '');
  el._pts = out.pts; el._fmt = spec.fmt;
}
function niceStep(range, count) {
  const raw = range / count, p = 10 ** Math.floor(Math.log10(raw)), n = raw / p;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
}
const fmtTick = v => Math.abs(v) >= 1000 ? num(v / 1000, 1) + 'k' : num(v, Math.abs(v) < 10 ? 1 : 0);
let gradSeq = 0;

function lineSVG(spec, w, h) {
  const P = spec.points;
  if (!P.length || (spec.spark && P.length < 2)) return { svg: spec.empty ? `<div class="empty-chart">${spec.empty}</div>` : '' };
  const sp = !!spec.spark;
  const M = sp ? { l: 2, r: 2, t: 4, b: 4 } : { l: 38, r: 14, t: 14, b: 24 };
  let x0 = P[0].x, x1 = P[P.length - 1].x; if (x0 === x1) { x0 -= 1; x1 += 1; }
  let ys = P.map(p => p.y); if (spec.goal) ys.push(spec.goal);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  let step;
  if (spec.yMin != null) { y0 = spec.yMin; y1 = spec.yMax; step = 1; }
  else {
    if (y1 - y0 < 1e-9) { y0 -= 1; y1 += 1; }
    const padv = (y1 - y0) * 0.12; y0 -= padv; y1 += padv;
    if (!sp) { step = niceStep(y1 - y0, 4); y0 = Math.floor(y0 / step) * step; y1 = Math.ceil(y1 / step) * step; }
  }
  const iw = w - M.l - M.r, ih = h - M.t - M.b;
  const sx = x => M.l + (x - x0) / (x1 - x0) * iw;
  const sy = y => M.t + (1 - (y - y0) / (y1 - y0)) * ih;
  const color = spec.color || 'var(--acc)';
  const pts = P.map(p => ({ sx: sx(p.x), sy: sy(p.y), label: relDay(p.k), v: p.y, color }));
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p.sx.toFixed(1) + ' ' + p.sy.toFixed(1)).join('');
  const gid = 'g' + (++gradSeq);
  let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Line chart"><defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
  if (!sp) {
    if (spec.yLabels) spec.yLabels.forEach((l, i) => { const y = sy(i + 1); s += `<line class="grid" x1="${M.l}" x2="${w - M.r}" y1="${y}" y2="${y}"/><text class="lbl" x="${M.l - 6}" y="${y + 4}" text-anchor="end">${l[0]}</text>`; });
    else for (let v = y0; v <= y1 + step / 2; v += step) { const y = sy(v); s += `<line class="grid" x1="${M.l}" x2="${w - M.r}" y1="${y}" y2="${y}"/><text class="lbl" x="${M.l - 6}" y="${y + 4}" text-anchor="end">${fmtTick(v)}</text>`; }
    const xl = P.length > 1 ? [P[0], P[P.length - 1]] : [P[0]];
    if (P.length > 6 && iw > 360) xl.splice(1, 0, P[Math.floor(P.length / 2)]);
    xl.forEach((p, i) => s += `<text class="lbl" x="${sx(p.x)}" y="${h - 6}" text-anchor="${xl.length === 1 ? 'middle' : i === 0 ? 'start' : i === xl.length - 1 ? 'end' : 'middle'}">${short(p.k)}</text>`);
    if (spec.goal) { const y = sy(spec.goal); s += `<line class="goal" x1="${M.l}" x2="${w - M.r}" y1="${y}" y2="${y}"/><text class="goal-l" x="${w - M.r}" y="${y - 5}" text-anchor="end">Goal ${fmtTick(spec.goal)}</text>`; }
  }
  if (pts.length > 1) s += `<path d="${d}L${pts[pts.length - 1].sx} ${M.t + ih}L${pts[0].sx} ${M.t + ih}Z" fill="url(#${gid})"/>`;
  s += `<path class="ln" d="${d}" stroke="${color}"/>`;
  if (spec.avg && P.length > 2) {
    const a = P.map((p, i) => { let sum = 0, n = 0; for (let j = i; j >= 0 && P[j].x > p.x - 7; j--) { sum += P[j].y; n++; } return (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(sum / n).toFixed(1); }).join('');
    s += `<path class="avg" d="${a}"/>`;
  }
  if (!sp && pts.length <= 45) pts.forEach(p => s += `<circle cx="${p.sx}" cy="${p.sy}" r="2.6" fill="${color}"/>`);
  const last = pts[pts.length - 1];
  s += `<circle cx="${last.sx}" cy="${last.sy}" r="${sp ? 3 : 4}" fill="${color}" stroke="var(--s1)" stroke-width="2"/>`;
  if (!sp) s += `<g class="hov"><line y1="${M.t}" y2="${M.t + ih}"/><circle r="5" fill="${color}"/></g>`;
  s += '</svg>';
  return { svg: s, pts: sp ? null : pts };
}

function barSVG(spec, w, h) {
  const B = spec.bars;
  const M = { l: 32, r: 10, t: 14, b: 22 };
  const iw = w - M.l - M.r, ih = h - M.t - M.b;
  let max = spec.max || Math.max(1, ...B.map(b => b.v), spec.goal || 0);
  let step = niceStep(max, 3); if (spec.int) step = Math.max(1, Math.round(step));
  if (!spec.max) max = Math.ceil(max / step) * step;
  const sy = v => M.t + (1 - v / max) * ih;
  const bw = iw / B.length, gap = Math.min(6, bw * 0.28);
  const color = spec.color || 'var(--acc)';
  let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Bar chart">`;
  for (let v = 0; v <= max + 1e-9; v += step) { const y = sy(v); s += `<line class="${v ? 'grid' : 'ax'}" x1="${M.l}" x2="${w - M.r}" y1="${y}" y2="${y}"/><text class="lbl" x="${M.l - 6}" y="${y + 4}" text-anchor="end">${fmtTick(v)}</text>`; }
  const pts = [];
  B.forEach((b, i) => {
    const x = M.l + i * bw + gap / 2, bh = Math.max(b.v > 0 ? 2 : 0, ih - (sy(b.v) - M.t)), y = M.t + ih - bh;
    const met = spec.goal ? b.v >= spec.goal : true;
    if (bh > 0) s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, bw - gap).toFixed(1)}" height="${bh.toFixed(1)}" rx="${Math.min(4, (bw - gap) / 3)}" fill="${color}" opacity="${b.dim ? .3 : met ? 1 : .55}"/>`;
    pts.push({ sx: x + (bw - gap) / 2, sy: y, label: b.label, v: b.v, bar: true });
  });
  const lab = [0, Math.floor(B.length / 2), B.length - 1];
  [...new Set(lab)].forEach((i, n, arr) => s += `<text class="lbl" x="${M.l + i * bw + bw / 2}" y="${h - 5}" text-anchor="${n === 0 && arr.length > 1 ? 'start' : n === arr.length - 1 && arr.length > 1 ? 'end' : 'middle'}">${esc(B[i].label.replace('Wk of ', ''))}</text>`);
  if (spec.goal) { const y = sy(spec.goal); s += `<line class="goal" x1="${M.l}" x2="${w - M.r}" y1="${y}" y2="${y}"/>`; }
  s += `<g class="hov"><line y1="${M.t}" y2="${M.t + ih}"/></g></svg>`;
  return { svg: s, pts };
}

function heatSVG(h, w) {
  const cell = 14, gap = 3, step = cell + gap, top = 16, left = 0;
  const t = T(), end = weekStart(t);
  const sinceStart = Math.floor((dayNum(end) - dayNum(weekStart(h.start))) / 7) + 1;
  const weeks = clamp(Math.min(Math.floor((w - left + gap) / step), Math.max(12, sinceStart)), 6, 53);
  const startW = addDays(end, -7 * (weeks - 1));
  let s = `<svg viewBox="0 0 ${weeks * step - gap + left} ${top + 7 * step}" width="${weeks * step - gap + left}" style="max-width:100%" role="img" aria-label="Calendar of the last ${weeks} weeks">`;
  let lastM = '', lastC = -9;
  for (let c = 0; c < weeks; c++) {
    const wk = addDays(startW, 7 * c), m = wk.slice(5, 7);
    if (m !== lastM && c < weeks - 1) { if (c - lastC >= 3) { s += `<text class="lbl" x="${left + c * step}" y="11">${fd(wk, { month: 'short' })}</text>`; lastC = c; } lastM = m; }
    for (let r = 0; r < 7; r++) {
      const k = addDays(wk, r); if (k > t) continue;
      let fill = 'var(--miss)', op = 1, act = '';
      const st = started(h, k);
      if (!st) { fill = 'transparent'; }
      else if (h.kind === 'avoid') { fill = logOf(h, k) ? 'var(--bad)' : h.color; op = logOf(h, k) ? .85 : .9; act = 'heat'; }
      else {
        act = 'heat';
        const f = frac(h, k);
        if (f >= 1) fill = h.color;
        else if (f > 0) { fill = h.color; op = .25 + f * .5; }
        else if (!isDue(h, k) || h.freq.type === 'weekly') { fill = 'var(--s2)'; }
      }
      const tip = `${fd(k, { weekday: 'short', month: 'short', day: 'numeric' })}${h.kind === 'count' && logOf(h, k) ? ' · ' + num(+logOf(h, k), 2) : ''}`;
      s += `<rect x="${left + c * step}" y="${top + r * step}" width="${cell}" height="${cell}" rx="3" fill="${fill}" opacity="${op}" ${!st ? 'stroke="var(--line)" stroke-width="1"' : ''} ${act ? `data-act="${act}" data-id="${h.id}" data-k="${k}"` : ''}><title>${tip}</title></rect>`;
    }
  }
  return s + '</svg>';
}

// Hover tooltips (one delegated listener)
function chartHover(e) {
  const el = e.target.closest && e.target.closest('.chart');
  if (!el || !el._pts || !el._pts.length) return;
  const r = el.getBoundingClientRect(), x = e.clientX - r.left;
  let best = el._pts[0], bd = Infinity;
  for (const p of el._pts) { const d = Math.abs(p.sx - x); if (d < bd) { bd = d; best = p; } }
  const g = el.querySelector('.hov'), tip = el.querySelector('.tip');
  if (!g || !tip) return;
  const ln = g.querySelector('line'), c = g.querySelector('circle');
  ln.setAttribute('x1', best.sx); ln.setAttribute('x2', best.sx);
  if (c) { c.setAttribute('cx', best.sx); c.setAttribute('cy', best.sy); }
  tip.textContent = `${best.label} · ${el._fmt ? el._fmt(best.v) : best.v}`;
  tip.style.left = clamp(best.sx, 60, r.width - 60) + 'px';
  tip.style.top = Math.max(0, best.sy - 10) + 'px';
  el.classList.add('hovering');
}
document.addEventListener('pointermove', chartHover, { passive: true });
document.addEventListener('pointerdown', chartHover, { passive: true });
document.addEventListener('pointerout', e => {
  const el = e.target.closest && e.target.closest('.chart');
  if (el && !el.contains(e.relatedTarget)) el.classList.remove('hovering');
});

/* ================= render ================= */
const view = $('#view');
function route() { const [name, arg] = (location.hash.slice(1) || 'today').split('/'); return { name: VIEWS[name] ? name : 'today', arg }; }
function render() {
  memo.clear(); charts.clear();
  if (D > T()) D = T();
  const fk = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.fk;
  const r = route();
  view.innerHTML = VIEWS[r.name](r.arg && decodeURIComponent(r.arg));
  const tab = r.name === 'habit' ? 'habits' : r.name;
  document.querySelectorAll('.tab').forEach(a => { const on = a.dataset.tab === tab; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  drawCharts();
  if (fk) { const el = view.querySelector(`[data-fk="${fk}"]`); if (el && !el.disabled) el.focus({ preventScroll: true }); }
}
addEventListener('hashchange', () => { jShow = 30; render(); scrollTo(0, 0); });
let rzRaf = 0, lastW = 0;
new ResizeObserver(() => {
  const w = view.clientWidth; if (w === lastW) return; lastW = w;
  cancelAnimationFrame(rzRaf); rzRaf = requestAnimationFrame(drawCharts);
}).observe(view);

/* An input commits on blur; if that blur came from tapping a button, re-rendering
   mid-tap would swallow the tap. So wait until the pointer is released. */
let ptrDown = false, pendingRender = false;
addEventListener('pointerdown', () => { ptrDown = true; }, true);
const release = () => { ptrDown = false; if (pendingRender) { pendingRender = false; setTimeout(render, 0); } };
addEventListener('pointerup', release, true);
addEventListener('pointercancel', release, true);
function softRender() { if (ptrDown) pendingRender = true; else render(); }

/* ================= toast ================= */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.style.pointerEvents = ''; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ================= dialog ================= */
const sheet = $('#sheet'), sheetBody = $('#sheetBody');
function openSheet(html, label) {
  sheetBody.innerHTML = html; sheet.setAttribute('aria-label', label || 'Dialog');
  if (!sheet.open) sheet.showModal();
  const f = sheetBody.querySelector('[autofocus]'); if (f) f.focus();
}
function closeSheet() { if (sheet.open) sheet.close(); }
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
sheet.addEventListener('close', () => { sheetBody.innerHTML = ''; });

function habitForm(h, tpl) {
  const x = h || { kind: 'check', freq: { type: 'daily' }, start: T(), color: COLORS[S.habits.length % COLORS.length], ...(tpl || {}) };
  const f = x.freq || { type: 'daily' };
  const radio = (name, val, label, cur) => `<label><input type="radio" name="${name}" value="${val}" ${cur === val ? 'checked' : ''}><span>${label}</span></label>`;
  return `<form class="form" data-form="habit" data-id="${h ? h.id : ''}" data-kind="${x.kind}" data-freq="${f.type}" novalidate>
    <div class="form-h"><h3>${h ? 'Edit habit' : 'New habit'}</h3><button type="button" class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>
    ${!h ? `<div class="chips left">${TEMPLATES.map((t, i) => `<button type="button" class="chip" data-act="tpl" data-i="${i}">${esc(t.name)}</button>`).join('')}</div>` : ''}
    <label class="fld"><span>Name</span><input class="in" name="name" maxlength="80" value="${esc(x.name || '')}" placeholder="e.g. Morning run" ${h ? '' : 'autofocus'} required></label>
    <div class="fld"><span class="lab">Type</span><div class="seg" role="radiogroup" aria-label="Type">
      ${radio('kind', 'check', 'Build (yes/no)', x.kind)}${radio('kind', 'count', 'Build (amount)', x.kind)}${radio('kind', 'avoid', 'Quit', x.kind)}</div></div>
    <div class="cond c-count frow">
      <label class="fld"><span>Daily target</span><input class="in" name="target" type="number" min="0" step="any" inputmode="decimal" value="${x.target || ''}" placeholder="10"></label>
      <label class="fld"><span>Unit</span><input class="in" name="unit" maxlength="20" value="${esc(x.unit || '')}" placeholder="pages, glasses, min…"></label>
    </div>
    <div class="cond c-build"><div class="fld"><span class="lab">How often</span><div class="seg" role="radiogroup" aria-label="Frequency">
      ${radio('freq', 'daily', 'Every day', f.type)}${radio('freq', 'interval', 'Every N days', f.type)}${radio('freq', 'weekdays', 'Certain days', f.type)}${radio('freq', 'weekly', 'X per week', f.type)}</div></div>
      <label class="fld cond f-interval"><span>Every how many days?</span><input class="in" name="n" type="number" min="2" max="365" inputmode="numeric" value="${f.n || 2}"></label>
      <div class="fld cond f-weekdays"><span class="lab">On</span><div class="days">${WD_ORDER.map(d => `<label><input type="checkbox" name="days" value="${d}" ${(f.days || [1, 3, 5]).includes(d) ? 'checked' : ''}><span>${WD[d]}</span></label>`).join('')}</div></div>
      <label class="fld cond f-weekly"><span>Times per week (any days)</span><input class="in" name="times" type="number" min="1" max="7" inputmode="numeric" value="${f.times || 3}"></label>
    </div>
    <label class="fld"><span>Start date</span><input class="in" name="start" type="date" value="${x.start || T()}" required></label>
    <p class="hint">“Every N days” counts from the start date.</p>
    <div class="fld"><span class="lab">Color</span><div class="swatches">${COLORS.map(c => `<label><input type="radio" name="color" value="${c}" ${x.color === c ? 'checked' : ''} aria-label="Color ${c}"><span style="--c:${c}"></span></label>`).join('')}</div></div>
    <div class="actions">
      ${h ? `<button type="button" class="btn sm danger" data-act="del-habit" data-id="${h.id}">${icon('trash', 16)}Delete</button>
        <button type="button" class="btn sm" data-act="archive-habit" data-id="${h.id}">${icon('archive', 16)}${h.archived ? 'Unarchive' : 'Archive'}</button>` : ''}
      <span class="sp"></span>
      <button type="button" class="btn" data-act="close">Cancel</button><button type="submit" class="btn pri">${h ? 'Save' : 'Add habit'}</button>
    </div>
  </form>`;
}
function fillTemplate(form, t) {
  form.elements.name.value = t.name;
  form.querySelector(`[name=kind][value=${t.kind}]`).checked = true;
  if (t.kind === 'count') { form.elements.target.value = t.target; form.elements.unit.value = t.unit || ''; }
  const f = t.freq || { type: 'daily' };
  form.querySelector(`[name=freq][value=${f.type}]`).checked = true;
  if (f.n) form.elements.n.value = f.n;
  if (f.times) form.elements.times.value = f.times;
  if (f.days) form.querySelectorAll('[name=days]').forEach(c => c.checked = f.days.includes(+c.value));
  syncForm(form);
}
function syncForm(form) {
  form.dataset.kind = (form.querySelector('[name=kind]:checked') || {}).value || 'check';
  form.dataset.freq = (form.querySelector('[name=freq]:checked') || {}).value || 'daily';
}
function submitHabit(form) {
  const fdta = new FormData(form);
  const name = String(fdta.get('name') || '').trim();
  if (!name) { form.elements.name.focus(); return toast('Give your habit a name'); }
  const kind = fdta.get('kind'), type = fdta.get('freq');
  const target = +fdta.get('target');
  if (kind === 'count' && !(target > 0)) { form.elements.target.focus(); return toast('Set a target above 0'); }
  const freq = { type: kind === 'avoid' ? 'daily' : type };
  if (freq.type === 'interval') { freq.n = Math.round(+fdta.get('n')); if (!(freq.n >= 2 && freq.n <= 365)) { form.elements.n.focus(); return toast('Pick between 2 and 365 days'); } }
  if (freq.type === 'weekdays') { freq.days = fdta.getAll('days').map(Number); if (!freq.days.length) return toast('Pick at least one day'); }
  if (freq.type === 'weekly') { freq.times = Math.round(+fdta.get('times')); if (!(freq.times >= 1 && freq.times <= 7)) { form.elements.times.focus(); return toast('Pick 1 to 7 times'); } }
  const start = fdta.get('start'); if (!isKey(start)) return toast('Pick a start date');
  const id = form.dataset.id;
  const data = fixHabit({ id: id || uid(), name, kind, target, unit: String(fdta.get('unit') || '').trim(), freq, start, color: fdta.get('color') || COLORS[0], archived: id ? hById(id).archived : false });
  if (id) S.habits[S.habits.findIndex(h => h.id === id)] = data; else S.habits.push(data);
  save(); closeSheet(); render(); toast(id ? 'Saved' : 'Habit added');
}

function settingsSheet() {
  const s = S.settings;
  return `<form class="form" data-form="settings" onsubmit="return false">
    <div class="form-h"><h3>Settings</h3><button type="button" class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <div class="fld"><span class="lab">Theme</span><div class="seg" role="radiogroup" aria-label="Theme">${[['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']].map(([v, l]) => `<label><input type="radio" name="theme" value="${v}" ${s.theme === v ? 'checked' : ''} data-change="theme"><span>${l}</span></label>`).join('')}</div></div>
    <div class="fld"><span class="lab">Accent — make it yours</span><div class="swatches">
      ${ACCENTS.map(([n, c]) => `<button type="button" class="swatch ${s.accent === c ? 'on' : ''}" style="--c:${c}" data-act="accent" data-c="${c}" aria-label="${n}" aria-pressed="${s.accent === c}"></button>`).join('')}
      <input class="custom-c" type="color" value="${esc(s.accent)}" data-change="accent" aria-label="Custom accent color"></div></div>
    <div class="sect frow">
      <label class="fld"><span>Weight unit</span><select class="in" data-change="unit"><option value="kg" ${s.unit === 'kg' ? 'selected' : ''}>kg</option><option value="lb" ${s.unit === 'lb' ? 'selected' : ''}>lb</option></select></label>
      <label class="fld"><span>Goal weight</span><input class="in" type="number" step="0.1" min="0" inputmode="decimal" value="${s.weightGoal || ''}" placeholder="optional" data-change="wgoal"></label>
      <label class="fld"><span>Height (${s.unit === 'kg' ? 'cm' : 'in'})</span><input class="in" type="number" step="0.1" min="0" inputmode="decimal" value="${s.height || ''}" placeholder="for BMI" data-change="height"></label>
    </div>
    <div class="sect fld"><span class="lab">Sync &amp; backup across devices</span><div id="syncBox" class="fld">${syncBoxHTML()}</div></div>
    <div class="sect fld"><span class="lab">Backup file</span>
      <div class="actions" style="justify-content:flex-start">
        <button type="button" class="btn sm" data-act="export">${icon('down', 16)}Export backup</button>
        <label class="btn sm" style="cursor:pointer">${icon('up', 16)}Import backup<input type="file" accept="application/json,.json" data-change="import" hidden></label>
        <span class="sp"></span>
        <button type="button" class="btn sm danger" data-act="reset">Erase everything</button>
      </div></div>
  </form>`;
}

function applyTheme() {
  let t = S.settings.theme;
  if (t === 'auto') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  const a = /^#[0-9a-f]{6}$/i.test(S.settings.accent) ? S.settings.accent : '#34d399';
  document.documentElement.style.setProperty('--acc', a);
  const lum = [1, 3, 5].map(i => { const c = parseInt(a.slice(i, i + 2), 16) / 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
  const L = .2126 * lum[0] + .7152 * lum[1] + .0722 * lum[2];
  document.documentElement.style.setProperty('--on-acc', L > .18 ? '#06120d' : '#ffffff');
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'light' ? '#f5f5f2' : '#0a0b0d';
}
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => S.settings.theme === 'auto' && applyTheme());

/* ================= actions ================= */
const ACT = {
  day: el => { D = addDays(D, +el.dataset.d); if (D > T()) D = T(); render(); },
  today: () => { D = T(); render(); },
  goto: el => { D = el.dataset.k; render(); scrollTo({ top: 0, behavior: 'smooth' }); },
  toggle: el => {
    const h = hById(el.dataset.id); if (!h) return;
    if (h.kind === 'count') setLog(h, D, isDone(h, D) ? 0 : h.target);
    else setLog(h, D, logOf(h, D) ? 0 : 1);
    buzz(); render();
  },
  inc: el => stepCount(el, 1),
  dec: el => stepCount(el, -1),
  qinc: () => setQuran(D, (+S.quran[D] || 0) + 1),
  qdec: () => setQuran(D, (+S.quran[D] || 0) - 1),
  mood: el => {
    const m = +el.dataset.m, j = S.journal[D] || {};
    j.mood = j.mood === m ? undefined : m;
    putJournal(D, j); render();
  },
  heat: el => {
    const h = hById(el.dataset.id), k = el.dataset.k; if (!h || !isKey(k) || k > T()) return;
    if (h.kind === 'count') { D = k; location.hash = '#today'; return; }
    setLog(h, k, logOf(h, k) ? 0 : 1); buzz(); render();
  },
  'new-habit': () => openSheet(habitForm(), 'New habit'),
  tpl: el => {
    const t = TEMPLATES[+el.dataset.i]; if (!t) return;
    const form = sheetBody.querySelector('[data-form=habit]');
    if (form && sheet.open) fillTemplate(form, t);
    else openSheet(habitForm(null, { ...t, color: COLORS[S.habits.length % COLORS.length], start: T() }), 'New habit');
  },
  'edit-habit': el => { const h = hById(el.dataset.id); if (h) openSheet(habitForm(h), 'Edit habit'); },
  'del-habit': el => {
    const h = hById(el.dataset.id); if (!h) return;
    if (!confirm(`Delete “${h.name}” and all its history? This can’t be undone.`)) return;
    S.habits = S.habits.filter(x => x.id !== h.id); delete S.logs[h.id];
    save(); closeSheet(); if (location.hash.startsWith('#habit/')) location.hash = '#habits'; else render(); toast('Habit deleted');
  },
  'archive-habit': el => {
    const h = hById(el.dataset.id); if (!h) return;
    h.archived = !h.archived; save(); closeSheet(); render(); toast(h.archived ? 'Archived — history kept' : 'Back in action');
  },
  close: () => closeSheet(),
  settings: () => openSheet(settingsSheet(), 'Settings'),
  accent: el => { S.settings.accent = el.dataset.c; save(); applyTheme(); openSheet(settingsSheet(), 'Settings'); },
  wrange: el => { wRange = el.dataset.v; render(); },
  wdel: el => { const k = el.dataset.k; const v = S.weight[k]; delete S.weight[k]; save(); render(); toastUndo(`Deleted ${num(v)} ${S.settings.unit}`, () => { S.weight[k] = v; save(); render(); }); },
  jmore: () => { jShow += 30; const q = ($('.search') || {}).value || ''; $('#jlist').innerHTML = journalList(q); },
  export: () => {
    flush();
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tracker-me-backup-${T()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup downloaded');
  },
  reset: () => {
    if (!confirm('Erase ALL habits, weight, Quran and journal data on this device?')) return;
    if (!confirm('Really? Export a backup first if you might want it back.')) return;
    S = DEFAULTS(); dirty = true; flush(); applyTheme(); closeSheet(); D = T(); location.hash = '#today'; render(); toast('Fresh start');
  },
};
function toastUndo(msg, undo) {
  const t = $('#toast');
  t.innerHTML = `${esc(msg)} <button style="margin-left:10px;text-decoration:underline;font-weight:700;pointer-events:auto" id="undoBtn">Undo</button>`;
  t.style.pointerEvents = 'auto'; t.classList.add('show');
  $('#undoBtn').onclick = () => { undo(); t.classList.remove('show'); };
  clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove('show'); t.style.pointerEvents = ''; }, 4000);
}
function stepCount(el, dir) {
  const h = hById(el.dataset.id); if (!h) return;
  const step = h.target >= 1000 ? 100 : h.target >= 100 ? 10 : 1;
  const v = Math.max(0, Math.round(((+logOf(h, D) || 0) + dir * step) * 100) / 100);
  const was = isDone(h, D); setLog(h, D, v);
  if (!was && isDone(h, D)) buzz();
  render();
}
function setQuran(k, p, soft) {
  p = Math.max(0, Math.min(QPAGES * 2, Math.round(+p || 0)));
  if (p) S.quran[k] = p; else delete S.quran[k];
  save(); soft ? softRender() : render();
}
function putJournal(k, j) {
  const empty = !j.mood && !(j.text || '').trim();
  if (empty) delete S.journal[k]; else S.journal[k] = { mood: j.mood || undefined, text: j.text || '' };
  save();
}

const CHG = {
  weight: el => {
    const raw = el.value.trim();
    if (!raw) { delete S.weight[D]; save(); softRender(); return; }
    const v = +raw;
    if (!(v > 0 && v < 1000)) { toast('Enter a valid weight'); el.value = S.weight[D] ?? ''; return; }
    S.weight[D] = Math.round(v * 100) / 100; save(); softRender(); toast('Weight logged');
  },
  count: el => {
    const h = hById(el.dataset.id); if (!h) return;
    const v = Math.max(0, +el.value || 0); setLog(h, D, Math.round(v * 100) / 100); softRender();
  },
  quran: el => setQuran(D, el.value, true),
  qgoal: el => { S.settings.quranGoal = Math.max(0, Math.round(+el.value || 0)); save(); softRender(); },
  qpage: el => setQuranPos(+el.value, quranInfo().khatm),
  qkhatm: el => setQuranPos(quranInfo().page, Math.max(0, Math.round(+el.value || 0))),
  theme: el => { S.settings.theme = el.value; save(); applyTheme(); },
  accent: el => { S.settings.accent = el.value; save(); applyTheme(); sheetBody.querySelectorAll('.swatch').forEach(b => b.classList.remove('on')); },
  unit: el => { S.settings.unit = el.value; save(); render(); openSheet(settingsSheet(), 'Settings'); },
  wgoal: el => { const v = +el.value; S.settings.weightGoal = v > 0 ? v : null; save(); render(); },
  height: el => { const v = +el.value; S.settings.height = v > 0 ? v : null; save(); render(); },
  import: el => {
    const file = el.files && el.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!isObj(data) || !('habits' in data || 'weight' in data || 'journal' in data)) throw new Error('bad');
        if (!confirm('Replace everything on this device with this backup?')) return;
        S = normalize(data); dirty = true; flush(); applyTheme(); closeSheet(); render(); toast('Backup restored');
      } catch (e) { toast('That file isn’t a Tracker.ME backup'); }
    };
    r.readAsText(file);
  },
};
function setQuranPos(page, khatm) {
  page = clamp(Math.round(page || 1), 1, QPAGES);
  const total = quranInfo().total;
  S.settings.quranStart = khatm * QPAGES + page - total;
  save(); softRender(); toast(`Now on page ${page}`);
}

const INP = {
  jtext: el => {
    const j = S.journal[D] || {};
    putJournal(D, { mood: j.mood, text: el.value });
    const wc = $('#wc'); if (wc) wc.textContent = wordCount(el.value);
  },
  jsearch: el => { jShow = 30; $('#jlist').innerHTML = journalList(el.value); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  e.preventDefault();
  fn(el, e);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el) { CHG[el.dataset.change] && CHG[el.dataset.change](el); return; }
  const form = e.target.closest('[data-form=habit]'); if (form) syncForm(form);
});
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INP[el.dataset.input]) INP[el.dataset.input](el); });
document.addEventListener('submit', e => {
  const form = e.target.closest('[data-form=habit]'); if (!form) return;
  e.preventDefault(); submitHabit(form);
});
// Enter in a number input commits it (blur triggers change).
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('input[type=number][data-change]')) { e.preventDefault(); e.target.blur(); }
});

/* ================= cloud sync (Supabase) =================
   Every piece of data is one record ("w:2026-11-15", "l:<habit>:<day>", "h:<habit>", "j:<day>", "s" …).
   We keep a snapshot ("base") of what the server last had, so we know exactly what changed
   locally and what changed remotely, and merge per record. Deletions are synced as null. */
const CFG = window.TRACKER_CONFIG || {};
const SKEY = 'trackerme:sync';
let Y = loadSync();
function loadSync() { try { const y = JSON.parse(localStorage.getItem(SKEY) || 'null'); return isObj(y) ? y : {}; } catch (e) { return {}; } }
function saveSync() { try { localStorage.setItem(SKEY, JSON.stringify(Y)); } catch (e) {} }
const syncUrl = () => String(CFG.supabaseUrl || Y.url || '').trim().replace(/\/+$/, '');
const syncKey = () => String(CFG.supabaseKey || Y.key || '').trim();
const signedIn = () => !!(syncUrl() && Y.session && Y.session.refresh_token);
let syncState = 'idle', syncErr = '', syncRun = null, syncAgain = false, syncTimer = 0, pendingRemote = false;

function canon(v) {
  if (v === undefined || v === null) return 'null';
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function toRecords(st) {
  const r = { s: st.settings };
  st.habits.forEach((h, i) => { r['h:' + h.id] = { ...h, o: i }; });
  for (const id in st.logs) for (const k in st.logs[id]) r[`l:${id}:${k}`] = st.logs[id][k];
  for (const k in st.weight) r['w:' + k] = st.weight[k];
  for (const k in st.quran) r['q:' + k] = st.quran[k];
  for (const k in st.journal) r['j:' + k] = st.journal[k];
  return r;
}
function fromRecords(r) {
  const st = { settings: r.s || {}, habits: [], logs: {}, weight: {}, quran: {}, journal: {} };
  for (const key in r) {
    const v = r[key]; if (v === null || v === undefined || key === 's') continue;
    const t = key[0], rest = key.slice(2);
    if (t === 'h') st.habits.push(v);
    else if (t === 'l') { const i = rest.lastIndexOf(':'); const id = rest.slice(0, i); (st.logs[id] || (st.logs[id] = {}))[rest.slice(i + 1)] = v; }
    else if (t === 'w') st.weight[rest] = v;
    else if (t === 'q') st.quran[rest] = v;
    else if (t === 'j') st.journal[rest] = v;
  }
  st.habits.sort((a, b) => (+a.o || 0) - (+b.o || 0));
  return normalize(st);
}

async function api(path, opts = {}, auth = true, retried = false) {
  // Publishable keys (sb_publishable_…) go only in `apikey`; the user's JWT goes in Authorization.
  const headers = { apikey: syncKey(), 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (auth && Y.session && Y.session.access_token) headers.Authorization = 'Bearer ' + Y.session.access_token;
  else if (/^eyJ/.test(syncKey())) headers.Authorization = 'Bearer ' + syncKey(); // legacy anon JWT key
  let res;
  try { res = await fetch(syncUrl() + path, { ...opts, headers }); }
  catch (e) { const err = new Error(navigator.onLine === false ? 'Offline — will sync when you’re back online' : 'Can’t reach the sync server'); err.offline = true; throw err; }
  const text = await res.text();
  let body = null; try { body = text ? JSON.parse(text) : null; } catch (e) {}
  if (res.status === 401 && auth && Y.session && !retried && !path.startsWith('/auth/v1/token')) {
    Y.session.expires_at = 0; await ensureToken(); return api(path, opts, auth, true); // token expired early: refresh once
  }
  if (!res.ok) {
    const err = new Error((body && (body.msg || body.message || body.error_description || body.error)) || 'Sync error ' + res.status);
    err.status = res.status; throw err;
  }
  return body;
}
function takeSession(b) {
  if (!b || !b.access_token) throw new Error('Login failed');
  Y.session = {
    access_token: b.access_token, refresh_token: b.refresh_token,
    expires_at: +b.expires_at || Math.floor(Date.now() / 1000) + (+b.expires_in || 3600),
    user: b.user ? { id: b.user.id, email: b.user.email } : (Y.session && Y.session.user) || null,
  };
  saveSync();
}
async function ensureToken() {
  const s = Y.session;
  if (s.expires_at * 1000 - 60e3 > Date.now()) return;
  try { takeSession(await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: s.refresh_token }) }, false)); }
  catch (e) { if (e.status === 400 || e.status === 401) { signOut(true); throw new Error('Signed out — please log in again'); } throw e; }
}
function signOut(silent) {
  Y.session = null; Y.base = {}; Y.lastPull = ''; saveSync();
  setSyncState('idle'); if (!silent) toast('Signed out — data stays on this device');
}

function scheduleSync(ms = 1500) { if (!signedIn()) return; clearTimeout(syncTimer); syncTimer = setTimeout(sync, ms); }
function setSyncState(st, err = '') {
  syncState = st; syncErr = err;
  document.querySelectorAll('.sync-ind').forEach(el => { el.dataset.s = st; el.title = syncLabel(); el.setAttribute('aria-label', syncLabel()); });
  const box = $('#syncBox'); if (box) box.innerHTML = syncBoxHTML();
}
function syncLabel() {
  if (!signedIn()) return 'Not syncing';
  if (syncState === 'syncing') return 'Syncing…';
  if (syncState === 'error') return syncErr || 'Sync failed';
  return Y.lastSyncAt ? 'Synced ' + ago(Y.lastSyncAt) : 'Ready to sync';
}
function ago(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago';
}
function remoteRender() {
  const a = document.activeElement;
  if (a && view.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) pendingRemote = true; // don't yank the field you're typing in
  else render();
}
view.addEventListener('focusout', () => { if (pendingRemote) { pendingRemote = false; setTimeout(remoteRender, 0); } });

function sync() {
  if (!signedIn()) return Promise.resolve();
  if (syncRun) { syncAgain = true; return syncRun; }
  syncRun = (async () => {
    setSyncState('syncing');
    try {
      await ensureToken();
      flush();
      const uid = Y.session.user && Y.session.user.id;
      if (!uid) { const u = await api('/auth/v1/user'); Y.session.user = { id: u.id, email: u.email }; saveSync(); }
      const initial = !Y.lastPull;
      const base = isObj(Y.base) ? Y.base : {};
      // 1) pull everything changed since last time (5 s overlap; re-applying is harmless)
      const since = Y.lastPull ? new Date(Date.parse(Y.lastPull) - 5000).toISOString() : '';
      const rows = [];
      for (let off = 0; ; off += 1000) {
        const page = await api(`/rest/v1/entries?select=k,v,updated_at&order=updated_at.asc,k.asc&limit=1000&offset=${off}` + (since ? `&updated_at=gt.${encodeURIComponent(since)}` : ''));
        rows.push(...(page || [])); if (!page || page.length < 1000) break;
      }
      const cur = toRecords(S);
      let changed = false, maxT = Y.lastPull || '';
      for (const row of rows) {
        if (row.updated_at > maxT) maxT = row.updated_at;
        const rv = canon(row.v), lv = canon(cur[row.k]), bv = base[row.k] === undefined ? 'null' : base[row.k];
        const localEdit = lv !== bv;
        // Remote wins unless this device has its own unsynced edit (on first sign-in, remote wins).
        if ((!localEdit || initial) && lv !== rv) { if (row.v === null) delete cur[row.k]; else cur[row.k] = row.v; changed = true; }
        base[row.k] = rv;
      }
      if (changed) { S = fromRecords(cur); dirty = true; flush(); applyTheme(); remoteRender(); }
      // 2) push local edits
      const now = toRecords(S), ups = [];
      for (const k in now) { const c = canon(now[k]); if (base[k] !== c) ups.push({ k, v: now[k], c }); }
      for (const k in base) if (!(k in now) && base[k] !== 'null') ups.push({ k, v: null, c: 'null' });
      const me = Y.session.user.id;
      for (let i = 0; i < ups.length; i += 500) {
        const chunk = ups.slice(i, i + 500);
        await api('/rest/v1/entries?on_conflict=user_id,k', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(chunk.map(u => ({ user_id: me, k: u.k, v: u.v === undefined ? null : u.v }))),
        });
        chunk.forEach(u => { base[u.k] = u.c; });
        Y.base = base; saveSync();
      }
      Y.base = base; Y.lastPull = maxT || '1970-01-01T00:00:00.000Z'; Y.lastSyncAt = Date.now(); saveSync();
      setSyncState('ok');
    } catch (e) {
      setSyncState(signedIn() ? 'error' : 'idle', e.message);
      if (!e.offline && signedIn()) toast(e.message);
    } finally {
      syncRun = null;
      if (syncAgain) { syncAgain = false; scheduleSync(300); }
    }
  })();
  return syncRun;
}

function syncBoxHTML() {
  if (!syncUrl()) return `
    <p class="tiny" style="margin:0">Connect your free Supabase project once (steps in the README), then log in with your email on every device.</p>
    <div class="frow"><label class="fld"><span>Project URL</span><input class="in" id="sbUrl" placeholder="https://xxxx.supabase.co" autocomplete="off"></label>
      <label class="fld"><span>Anon (public) key</span><input class="in" id="sbKey" placeholder="eyJhbGciOi…" autocomplete="off"></label></div>
    <div class="actions" style="justify-content:flex-start"><button type="button" class="btn sm pri" data-act="sync-config">Connect</button></div>`;
  if (!signedIn()) {
    if (Y.pendingEmail) return `
      <p class="tiny" style="margin:0">We emailed <b>${esc(Y.pendingEmail)}</b>. Tap the link in it, or type the 6-digit code here — the code is best on an installed phone app.</p>
      <div class="frow"><label class="fld"><span>Code</span><input class="in" id="sbCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456"></label>
        <button type="button" class="btn sm pri" data-act="sync-verify" style="height:44px">Verify</button></div>
      <div class="actions" style="justify-content:flex-start"><button type="button" class="btn sm" data-act="sync-restart">Use another email</button>
        ${CFG.supabaseUrl ? '' : '<button type="button" class="btn sm" data-act="sync-disconnect">Disconnect project</button>'}</div>`;
    return `
      <p class="tiny" style="margin:0">Log in with your email to back up and sync across your phone and laptop.</p>
      <div class="frow"><label class="fld"><span>Email</span><input class="in" id="sbEmail" type="email" autocomplete="email" placeholder="you@example.com"></label>
        <button type="button" class="btn sm pri" data-act="sync-send" style="height:44px">Send login code</button></div>
      ${CFG.supabaseUrl ? '' : '<div class="actions" style="justify-content:flex-start"><button type="button" class="btn sm" data-act="sync-disconnect">Disconnect project</button></div>'}`;
  }
  return `
    <div class="sync-row"><span class="sync-ind" data-s="${syncState}" aria-hidden="true"></span>
      <div style="min-width:0;flex:1"><b>${esc((Y.session.user && Y.session.user.email) || 'Signed in')}</b><div class="tiny">${esc(syncLabel())}</div></div></div>
    <div class="actions" style="justify-content:flex-start"><button type="button" class="btn sm" data-act="sync-now">Sync now</button>
      <button type="button" class="btn sm" data-act="sync-out">Sign out</button></div>`;
}

Object.assign(ACT, {
  'sync-config': async () => {
    let url = ($('#sbUrl') || {}).value || '', key = ($('#sbKey') || {}).value || '';
    url = url.trim().replace(/\/+$/, ''); key = key.trim();
    if (!/^https:\/\/[^/\s]+$/.test(url)) return toast('Paste the project URL, like https://xxxx.supabase.co');
    if (key.length < 20) return toast('Paste the publishable (anon) key');
    Y.url = url; Y.key = key; saveSync(); setSyncState('idle');
  },
  'sync-disconnect': () => { Y = {}; saveSync(); setSyncState('idle'); },
  'sync-send': async el => {
    const email = (($('#sbEmail') || {}).value || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Enter a valid email');
    el.disabled = true;
    try {
      const back = location.origin + location.pathname;
      await api('/auth/v1/otp?redirect_to=' + encodeURIComponent(back), { method: 'POST', body: JSON.stringify({ email, create_user: true }) }, false);
      Y.pendingEmail = email; saveSync(); setSyncState('idle'); toast('Check your email');
    } catch (e) { toast(e.message); el.disabled = false; }
  },
  'sync-verify': async el => {
    const token = (($('#sbCode') || {}).value || '').replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(token)) return toast('Enter the code from the email');
    el.disabled = true;
    try {
      takeSession(await api('/auth/v1/verify', { method: 'POST', body: JSON.stringify({ type: 'email', email: Y.pendingEmail, token }) }, false));
      Y.pendingEmail = ''; Y.base = {}; Y.lastPull = ''; saveSync();
      toast('Logged in — syncing'); await sync();
    } catch (e) { toast(e.message); el.disabled = false; }
  },
  'sync-restart': () => { Y.pendingEmail = ''; saveSync(); setSyncState('idle'); },
  'sync-now': () => sync(),
  'sync-out': () => { if (confirm('Sign out? Your data stays on this device and in the cloud.')) signOut(); },
});

// Magic-link landing: the token arrives in the URL hash.
async function handleAuthRedirect() {
  const h = location.hash;
  if (!/access_token=|error_description=/.test(h)) return;
  const p = new URLSearchParams(h.slice(1));
  history.replaceState(null, '', location.pathname + location.search + '#today');
  if (p.get('error_description')) { toast(p.get('error_description').replace(/\+/g, ' ')); return; }
  try {
    takeSession({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in'), expires_at: p.get('expires_at') });
    Y.pendingEmail = ''; Y.base = {}; Y.lastPull = ''; Y.session.user = null; saveSync();
    const u = await api('/auth/v1/user'); Y.session.user = { id: u.id, email: u.email }; saveSync();
    toast('Logged in — syncing');
  } catch (e) { toast(e.message); }
}

addEventListener('online', () => scheduleSync(200));
document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleSync(200); });
setInterval(() => { if (!document.hidden) sync(); }, 60e3);
addEventListener('storage', e => { if (e.key === SKEY) Y = loadSync(); });

/* ================= boot ================= */
load();
applyTheme();
render();
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
handleAuthRedirect().then(() => { if (signedIn()) { render(); sync(); } });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();
