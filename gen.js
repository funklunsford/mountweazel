// Chooses one note per genuine entry, and the starting entry, so a page is hard but fair:
// most steps need two or three notes together, and none needs a guess. Writes them into pages.js.
// Usage: node gen.js [page index] [seed] [iterations] [restarts]
'use strict';
const fs = require('fs');
const path = require('path');
const PAGES = require('./pages.js');

const PAGE_INDEX = Number(process.argv[2] || 1);
const SEED = Number(process.argv[3] || 1);
const ITER = Number(process.argv[4] || 3000);
const RESTARTS = Number(process.argv[5] || 8);

let seed = SEED >>> 0;
function rand() { // mulberry32
  seed = (seed + 0x6D2B79F5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pickOne = arr => arr[Math.floor(rand() * arr.length)];

const page = PAGES[PAGE_INDEX];
const E = page.entries;
const N = E.length;
const idx = Object.fromEntries(E.map((e, i) => [e.id, i]));
const TRUTH = E.reduce((m, e, i) => (e.fake ? m | (1 << i) : m), 0);
const FULL = (1 << N) - 1;
const pop = x => { let c = 0; while (x) { x &= x - 1; c++; } return c; };

// Every possible answer as a bitmask of fakes, and bitsets over those answers.
const combos = [];
(function pick(from, mask, k) {
  if (!k) { combos.push(mask); return; }
  for (let i = from; i <= N - k; i++) pick(i + 1, mask | (1 << i), k - 1);
})(0, 0, page.fakes);
const M = combos.length;
const W = (M + 31) >>> 5;
function bits(pred) {
  const b = new Uint32Array(W);
  for (let j = 0; j < M; j++) if (pred(combos[j])) b[j >>> 5] |= 1 << (j & 31);
  return b;
}
const FAKE = E.map((_, i) => bits(c => (c >>> i) & 1));
const GEN = E.map((_, i) => bits(c => !((c >>> i) & 1)));

// Groups, from the entries' fields.
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];
const groups = [];
function group(key, kind, noun, members, fullName) {
  if (members.length < 2 || members.length >= N) return;
  groups.push({ key, kind, ids: members.map(e => e.id), mask: members.reduce((m, e) => m | (1 << idx[e.id]), 0), name: fullName || `the ${NUM[members.length]} ${noun}` });
}
for (const label of [...new Set(E.map(e => e.label).filter(Boolean))]) group('label:' + label, 'label', `entries labelled ${label}`, E.filter(e => e.label === label));
group('person', 'meaning', 'entries whose definitions name a person', E.filter(e => (e.kinds || []).includes('person')));
group('animal', 'meaning', 'entries whose definitions name an animal', E.filter(e => (e.kinds || []).includes('animal')));
group('verb', 'meaning', 'entries marked v.', E.filter(e => /\bv\./.test(e.pos)));
group('adj', 'meaning', 'entries marked adj.', E.filter(e => /\badj\./.test(e.pos)));
for (const p of [...new Set(E.map(e => e.word.slice(0, 2)))]) {
  const m = E.filter(e => e.word.startsWith(p));
  if (m.length >= 3) group('prefix:' + p, 'spelling', `entries that begin with ${p.toUpperCase()}`, m);
}
const half = Math.ceil(N / 2);
group('col:left', 'position', '', E.slice(0, half), `the first ${NUM[half]} entries on the page`);
group('col:right', 'position', '', E.slice(half), `the last ${NUM[N - half]} entries on the page`);

// Every true note we know how to write.
const notes = [];
const capital = s => s[0].toUpperCase() + s.slice(1);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
function addCount(g, allowed, text, near, template, owner = null, ids = g.ids, mask = g.mask, kind = g.kind) {
  notes.push({ owner, kind, near, template, groups: [g ? g.key : 'neighbours:' + owner], data: { set: ids, fakes: allowed }, text, bits: bits(c => allowed.includes(pop(c & mask))) });
}
for (const g of groups) {
  const K = g.ids.length;
  const c = pop(TRUTH & g.mask);
  let t;
  if (c === 0) t = `None of ${g.name} is a fake.`;
  else if (c === K) t = `All of ${g.name} are fakes.`;
  else if (c === 1) t = `Exactly one of ${g.name} is a fake.`;
  else if (K - c === 1) t = `All but one of ${g.name} are fakes.`;
  else t = `Exactly ${NUM[c]} of ${g.name} are fakes.`;
  if (!(c === 0 && K <= 2)) addCount(g, [c], t, c === 0, 'exact');
  for (const n of [1, 2]) if (n <= c && n < K) addCount(g, range(n, K), `At least ${NUM[n]} of ${g.name} ${n === 1 ? 'is a fake' : 'are fakes'}.`, false, 'atLeast');
  if (c <= 1 && K > 1) addCount(g, [0, 1], `At most one of ${g.name} is a fake.`, false, 'atMost');
}
const KIND_RANK = { spelling: 3, meaning: 2, label: 1, position: 0 };
for (const A of groups) for (const B of groups) {
  if (A === B || (A.mask & B.mask) === A.mask || (A.mask & B.mask) === B.mask) continue;
  if (A.ids.length > 6 || B.ids.length > 6) continue;
  const ca = pop(TRUTH & A.mask);
  const cb = pop(TRUTH & B.mask);
  const kind = KIND_RANK[A.kind] >= KIND_RANK[B.kind] ? A.kind : B.kind;
  const push = (rel, text) => notes.push({
    owner: null, kind, near: false, template: 'compare', groups: [A.key, B.key],
    data: { type: 'compare', a: A.ids, b: B.ids, rel }, text,
    bits: bits(c => { const a = pop(c & A.mask), b = pop(c & B.mask); return rel === 'more' ? a > b : a === b; })
  });
  if (ca > cb) push('more', `More of ${A.name} are fakes than of ${B.name}.`);
  else if (ca === cb && ca > 0 && A.key < B.key) push('same', `${capital(A.name)} hold as many fakes as ${B.name}.`);
}
E.forEach((e, i) => {
  if (e.fake || i === 0 || i === N - 1) return;
  const ids = [E[i - 1].id, E[i + 1].id];
  const mask = (1 << (i - 1)) | (1 << (i + 1));
  const c = pop(TRUTH & mask);
  if (c === 1) addCount(null, [1], 'Exactly one of my two neighbours is a fake.', false, 'neighbours', e.id, ids, mask, 'position');
  if (c === 2) addCount(null, [2], 'Both of my neighbours are fakes.', false, 'neighbours', e.id, ids, mask, 'position');
});

const genuineIds = E.filter(e => !e.fake).map(e => e.id);
const candidates = Object.fromEntries(genuineIds.map(id => [id, notes.map((n, k) => k).filter(k => notes[k].owner === null || notes[k].owner === id)]));
const WORDY = new Set(['meaning', 'spelling']);

// Settle what the fewest visible notes can, step by step, as check.js does.
const tmp = [new Uint32Array(W), new Uint32Array(W), new Uint32Array(W), new Uint32Array(W)];
function settledFrom(B, resolved) {
  let fake = 0, gen = 0, any = false;
  for (let w = 0; w < W; w++) if (B[w]) { any = true; break; }
  if (!any) return { fake: 0, gen: 0 };
  for (let i = 0; i < N; i++) {
    if ((resolved >>> i) & 1) continue;
    let f = false, g = false;
    const Fi = FAKE[i], Gi = GEN[i];
    for (let w = 0; w < W && !(f && g); w++) { if (B[w] & Fi[w]) f = true; if (B[w] & Gi[w]) g = true; }
    if (!g) fake |= 1 << i; else if (!f) gen |= 1 << i;
  }
  return { fake, gen };
}
function andInto(out, a, b) { for (let w = 0; w < W; w++) out[w] = a[w] & b[w]; return out; }

function profile(assign, start, drop) {
  const known = GEN[idx[start]].slice();
  let resolved = 1 << idx[start];
  const visible = [];
  const reveal = id => { const k = assign[id]; if (k != null && !(drop && drop.has(notes[k].kind))) visible.push(k); };
  reveal(start);
  const steps = [];
  while (resolved !== FULL) {
    let found = null;
    for (let k = 0; k <= Math.min(3, visible.length) && !found; k++) {
      let fake = 0, gen = 0;
      const sets = [];
      const sel = [];
      (function pick(from) {
        if (sel.length === k) {
          let B = known;
          sel.forEach((v, d) => { B = andInto(tmp[d], B, notes[visible[v]].bits); });
          const s = settledFrom(B, resolved);
          if (s.fake | s.gen) { fake |= s.fake; gen |= s.gen; sets.push(sel.map(v => visible[v])); }
          return;
        }
        for (let v = from; v <= visible.length - (k - sel.length); v++) { sel.push(v); pick(v + 1); sel.pop(); }
      })(0);
      if (sets.length) found = { k, fake, gen, sets };
    }
    if (!found) {
      let B = known;
      for (const v of visible) B = andInto(tmp[3], B, notes[v].bits);
      const s = settledFrom(B, resolved);
      if (!(s.fake | s.gen)) {
        let left = 0;
        for (let w = 0; w < W; w++) left += pop(B[w]);
        return { valid: false, resolved: pop(resolved), left, steps };
      }
      found = { k: 9, fake: s.fake, gen: s.gen, sets: [visible.slice()] };
    }
    if ((found.fake & ~TRUTH) || (found.gen & TRUTH)) throw new Error('a true note forced a wrong answer');
    steps.push({ k: found.k, n: pop(found.fake | found.gen), sets: found.sets });
    for (let i = 0; i < N; i++) {
      if ((found.fake >>> i) & 1) { andInto(known, known, FAKE[i]); resolved |= 1 << i; }
      if ((found.gen >>> i) & 1) { andInto(known, known, GEN[i]); resolved |= 1 << i; reveal(E[i].id); }
    }
  }
  return { valid: true, steps };
}

function score(assign, start) {
  const p = profile(assign, start);
  if (!p.valid) return { s: -100000 + 1000 * p.resolved - 20 * Math.log2(p.left + 1), p };
  let s = 0;
  const easy = page.level === 'easy';
  if (easy) {
    // A tad harder than one note per step: two or three steps that need two notes, none that need three.
    let twos = 0;
    p.steps.forEach(st => {
      if (st.k === 9 || st.k === 3) s -= 40;
      else if (st.k === 2) s += ++twos <= 3 ? 12 : -4;
      if (st.n >= 4) s -= 4 * (st.n - 3);
    });
    if (twos < 2) s -= 20;
  } else if (page.level === 'medium') {
    // Between the old easy and hard pages: most steps need two notes, at most one needs three.
    let twos = 0;
    let threes = 0;
    p.steps.forEach((st, i) => {
      if (st.k === 9) s -= 80;
      else if (st.k === 3) s += ++threes <= 1 ? 10 : -30;
      else if (st.k === 2) { twos++; s += 11; }
      else if (i > 0 && !(st.k === 0 && i === p.steps.length - 1)) s -= 3;
      if (st.n >= 3) s -= 5 * (st.n - 2);
    });
    if (twos < 4) s -= 10 * (4 - twos);
  } else {
    let threes = 0;
    p.steps.forEach((st, i) => {
      if (st.k === 9) s -= 80;
      else if (st.k === 3) s += ++threes <= 2 ? 16 : 3;
      else if (st.k === 2) s += 11;
      else if (i > 0 && !(st.k === 0 && i === p.steps.length - 1)) s -= 8;
      if (st.n >= 3) s -= 5 * (st.n - 2);
    });
  }
  const used = Object.values(assign);
  const near = used.filter(k => notes[k].near).length;
  if (near > (easy ? 3 : 2)) s -= 12 * (near - (easy ? 3 : 2));
  const groupUse = {};
  used.forEach(k => notes[k].groups.forEach(g => { groupUse[g] = (groupUse[g] || 0) + 1; }));
  for (const g in groupUse) if (groupUse[g] > 2) s -= 8 * (groupUse[g] - 2);
  const templateUse = {};
  used.forEach(k => { templateUse[notes[k].template] = (templateUse[notes[k].template] || 0) + 1; });
  for (const t in templateUse) if (templateUse[t] > 4) s -= 6 * (templateUse[t] - 4);
  if (!templateUse.compare && page.level === 'hard') s -= 10;
  if ((templateUse.compare || 0) > (easy ? 1 : 2)) s -= 10 * (templateUse.compare - (easy ? 1 : 2));
  const kindUse = {};
  used.forEach(k => { kindUse[notes[k].kind] = (kindUse[notes[k].kind] || 0) + 1; });
  if ((kindUse.spelling || 0) > 3) s -= 10 * (kindUse.spelling - 3);
  if ((kindUse.meaning || 0) < 3) s -= 10 * (3 - (kindUse.meaning || 0));
  if ((kindUse.position || 0) > 3) s -= 8 * (kindUse.position - 3);
  if (!templateUse.neighbours) s -= 6;
  const inSets = new Set();
  p.steps.forEach(st => st.sets.forEach(set => set.forEach(k => inSets.add(k))));
  used.forEach(k => { if (!inSets.has(k)) s -= 15; });
  if (profile(assign, start, WORDY).valid) s -= 60;
  if (!p.steps.some(st => st.k >= 2 && st.k !== 9 && st.sets.every(set => set.some(k => WORDY.has(notes[k].kind))))) s -= 30;
  return { s, p };
}

// The starting entry's note is the only one visible at first, so it must settle something by itself.
const openers = [];
for (const s of genuineIds) {
  for (const k of candidates[s]) {
    const B = andInto(new Uint32Array(W), GEN[idx[s]], notes[k].bits);
    const f = settledFrom(B, 1 << idx[s]);
    if (f.fake | f.gen) openers.push({ start: s, note: k });
  }
}
for (const n of notes) n.text = n.text.replace(/\.\.$/, '.');
console.log(`${notes.length} true notes, ${openers.length} possible openings`);

function randomAssign(opening) {
  const taken = new Set([opening.note]);
  const assign = { [opening.start]: opening.note };
  for (const id of genuineIds) {
    if (id === opening.start) continue;
    const free = candidates[id].filter(k => !taken.has(k));
    assign[id] = pickOne(free);
    taken.add(assign[id]);
  }
  return assign;
}

let best = null;
for (let r = 0; r < RESTARTS; r++) {
  let opening = pickOne(openers);
  let assign = randomAssign(opening);
  let start = opening.start;
  let cur = score(assign, start);
  for (let it = 0; it < ITER; it++) {
    const T = 12 * (1 - it / ITER) + 0.5;
    let next = { ...assign };
    let nextStart = start;
    const roll = rand();
    if (roll < 0.08) {
      const o = pickOne(openers);
      nextStart = o.start;
      const holder = Object.keys(next).find(id => next[id] === o.note);
      if (holder && holder !== o.start) next[holder] = next[o.start];
      next[o.start] = o.note;
    } else if (roll < 0.3) {
      const a = pickOne(genuineIds), b = pickOne(genuineIds);
      if (a !== start && b !== start && candidates[a].includes(next[b]) && candidates[b].includes(next[a])) [next[a], next[b]] = [next[b], next[a]];
    } else {
      const id = pickOne(genuineIds.filter(x => x !== start));
      const taken = new Set(Object.values(next));
      const free = candidates[id].filter(k => !taken.has(k));
      if (free.length) next[id] = pickOne(free);
    }
    if (Object.keys(next).some(id => !candidates[id].includes(next[id]))) continue;
    const sc = score(next, nextStart);
    if (sc.s >= cur.s || rand() < Math.exp((sc.s - cur.s) / T)) { assign = next; start = nextStart; cur = sc; }
    if (!best || cur.s > best.s) best = { s: cur.s, assign: { ...assign }, start, p: cur.p };
  }
  console.log(`restart ${r + 1}: best so far ${best.s}${best.p.valid ? ', profile ' + best.p.steps.map(st => st.k).join(' ') : ''}`);
}

if (!best.p.valid) { console.log('No valid page found; try more iterations or another seed.'); process.exit(1); }
console.log(`\nstart: ${best.start}`);
console.log(`profile: ${best.p.steps.map(st => st.k).join(' ')}  settled per step: ${best.p.steps.map(st => st.n).join(' ')}`);
for (const id of genuineIds) console.log(`  ${id.padEnd(12)} [${notes[best.assign[id]].kind}] ${notes[best.assign[id]].text}`);
best.p.steps.forEach((st, i) => {
  const owner = k => Object.keys(best.assign).find(id => best.assign[id] === k);
  console.log(`  step ${i + 1}: ${st.k} note(s), settles ${st.n}; e.g. ${st.sets[0].map(owner).join(' + ') || 'the count alone'}`);
});

page.start = best.start;
page.notes = Object.fromEntries(genuineIds.map(id => {
  const n = notes[best.assign[id]];
  return [id, { text: n.text, kind: n.kind, ...n.data }];
}));
const header = '/* Mountweazel pages. gen.js writes the notes and starting entry of generated pages. */\n\'use strict\';\n';
fs.writeFileSync(path.join(__dirname, 'pages.js'),
  `${header}const PAGES = ${JSON.stringify(PAGES, null, 2)};\nif (typeof module !== 'undefined' && module.exports) module.exports = PAGES;\n`);
console.log('\nWrote pages.js');
