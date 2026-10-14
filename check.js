// Checks every page with the same engine the page uses.
'use strict';
const PAGES = require('./pages.js');
const { makeEngine } = require('./game.js');

let failed = false;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failed = true; };
const WORDY = new Set(['meaning', 'spelling']);

for (const page of PAGES) {
  console.log(`\nPage ${page.number} (${page.letters}, ${page.level})`);
  const E = makeEngine(page);
  const fakes = new Set(page.entries.filter(e => e.fake).map(e => e.id));
  const notes = Object.values(page.notes);
  const genuine = page.entries.filter(e => !e.fake).map(e => e.id);

  check(fakes.size === page.fakes, `${fakes.size} fakes on the page, ${page.fakes} announced`);
  check(page.entries.every((e, i) => i === 0 || page.entries[i - 1].word < e.word), 'entries are in alphabetical order');
  check(Boolean(page.start) && !E.ENTRY[page.start].fake, `the starting entry (${page.start}) is genuine`);
  check(genuine.every(id => page.notes[id]) && Object.keys(page.notes).every(id => !E.ENTRY[id].fake),
    'every genuine entry has a note, and no fake has one');
  const bad = Object.entries(page.notes).filter(([, n]) => !E.holds(n, fakes)).map(([id]) => id);
  check(bad.length === 0, `every note is true${bad.length ? ' (false: ' + bad.join(', ') + ')' : ''}`);
  const named = Object.values(page.notes).flatMap(n => n.type === 'compare' ? [...n.a, ...n.b] : n.set);
  check(named.every(id => E.ENTRY[id]), 'notes name only entries on the page');

  const sols = E.solutions({ [page.start]: 'genuine' }, notes);
  check(sols.length === 1, `with the starting entry given, exactly one answer fits all the notes (found ${sols.length})`);

  const run = E.profile();
  check(!run.stalled, 'playing only provable calls from the starting entry finishes the page');
  check(run.steps.every(s => !s.over), 'no step needs more than three notes at once');
  const ks = run.steps.map(s => s.k);
  console.log(`  difficulty profile (notes needed per step): ${ks.join(' ')}  [${ks.filter(k => k >= 2).length} of ${ks.length} steps need two or more]`);
  console.log(`  entries settled per step: ${run.steps.map(s => s.ids.length).join(' ')}`);

  const known = { [page.start]: 'genuine' };
  const naive = [];
  for (const e of page.entries) {
    if (known[e.id]) continue;
    naive.push(E.judge(known, e.id, 'genuine'));
    known[e.id] = E.truth(e.id);
  }
  check(naive.some(m => m !== 'proven'), `calling every entry genuine is not a clean proof (${naive.filter(m => m === 'proven').length} proven, ${naive.filter(m => m === 'hunch').length} hunches, ${naive.filter(m => m === 'mistake').length} mistakes)`);

  const blind = E.profile(n => !WORDY.has(n.kind));
  check(blind.stalled, `without the notes about meanings and spellings, the solve stalls (after ${blind.steps.length} steps)`);
  if (page.level !== 'easy') {
    const wordStep = run.steps.some(s => s.k >= 2 && s.sets.every(set => set.some(n => WORDY.has(n.kind))));
    check(wordStep, 'some step that needs two or more notes can only be done with a note about meanings or spellings');
  }
}

process.exit(failed ? 1 : 0);
