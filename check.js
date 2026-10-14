// Checks every page in pages.js. Run with `npm run check`; the deploy runs it too.
'use strict';
const PAGES = require('./pages.js');

const BANDS = ['Familiar', 'Uncommon', 'Rare', 'Obscure', 'All but lost'];
let failed = false;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failed = true; };
const filled = s => typeof s === 'string' && s.trim().length > 0;
const senses = def => def.split(';').length;
const list = xs => xs.length ? ` (${xs.join(', ')})` : '';

for (const page of PAGES) {
  const entries = page.entries;
  console.log(`\nPage ${page.number}: ${entries.length} entries`);
  const at = (e, i) => `${i + 1} ${e.real.word}/${e.fake.word}`;
  const where = test => entries.map((e, i) => test(e, i) ? at(e, i) : null).filter(Boolean);

  check(entries.length === 12, 'twelve entries on the page');
  check(where(e => !['left', 'right'].includes(e.realOn)).length === 0, 'every entry says which proof shows the real word');
  check(where(e => !(filled(e.real.word) && filled(e.real.pos) && filled(e.real.def) && filled(e.real.history))).length === 0,
    'every real word has a part of speech, a definition and a history');
  check(where(e => e.real.quote && !(filled(e.real.quote.text) && filled(e.real.quote.cite))).length === 0,
    'every quotation has its source');
  check(where(e => !(filled(e.fake.word) && filled(e.fake.pos) && filled(e.fake.def) && filled(e.fake.anatomy))).length === 0,
    'every fake has a part of speech, a definition and an account of how it was made');
  check(where(e => 'history' in e.fake || 'quote' in e.fake || 'anatomy' in e.real).length === 0,
    'no fake has a history or a quotation, and no real word has an anatomy');

  const words = entries.flatMap(e => [e.real.word, e.fake.word]).map(w => w.toLowerCase());
  const twice = words.filter((w, i) => words.indexOf(w) !== i);
  check(twice.length === 0, `no word appears twice${list(twice)}`);

  // Side by side, the two proofs should differ only in whether the word is real.
  const pos = where(e => e.real.pos !== e.fake.pos);
  check(pos.length === 0, `both proofs of an entry have the same part of speech${list(pos)}`);
  const shape = where(e => senses(e.real.def) !== senses(e.fake.def));
  check(shape.length === 0, `both definitions of an entry have the same number of senses${list(shape)}`);
  const length = where(e => {
    const [a, b] = [e.real.def.length, e.fake.def.length].sort((x, y) => x - y);
    return b > 2 * a;
  });
  check(length.length === 0, `neither definition of an entry is more than twice as long as the other${list(length)}`);
  const leans = where(e => [e.fake.def, e.fake.anatomy].some(t => t.toLowerCase().includes(e.real.word.toLowerCase())));
  check(leans.length === 0, `no fake leans on the real word beside it${list(leans)}`);
  const stale = where(e => /this page|neighbour/i.test(e.fake.anatomy));
  check(stale.length === 0, `no fake's account mentions "this page" or a neighbour${list(stale)}`);

  const left = entries.filter(e => e.realOn === 'left').length;
  check(Math.abs(left - (entries.length - left)) <= 1, `the real word is on each side about equally often (${left} left, ${entries.length - left} right)`);
  let run = 1, longest = 1;
  entries.forEach((e, i) => { if (i > 0) { run = e.realOn === entries[i - 1].realOn ? run + 1 : 1; longest = Math.max(longest, run); } });
  check(longest <= 3, `the real word is never on the same side more than three entries running (longest run ${longest})`);

  // Rarity: the bands only go down the page, and common words (in SCOWL's lists) all come first.
  const ranks = entries.map(e => BANDS.indexOf(e.band));
  check(ranks.every(r => r >= 0), 'every entry is in a known band');
  check(ranks.every((r, i) => i === 0 || r >= ranks[i - 1]), 'the bands never get commoner down the page');
  check(ranks[0] === 0 && ranks[ranks.length - 1] === BANDS.length - 1, 'the page starts with Familiar words and ends with All but lost');
  const common = entries.map(e => e.real.scowl != null);
  const lastCommon = common.lastIndexOf(true);
  const firstRare = common.indexOf(false);
  check(firstRare === -1 || lastCommon < firstRare, 'every real word in SCOWL’s common lists comes before every real word in none of them');
  check(entries.every(e => e.real.scowl === null || [35, 40, 50].includes(e.real.scowl)), 'scowl is 35, 40, 50 or null');

  console.log(`  bands: ${entries.map(e => e.band).join(' · ')}`);
  console.log(`  real words: ${entries.map(e => e.real.word + (e.real.scowl ? ` (${e.real.scowl})` : '')).join(', ')}`);
}

process.exit(failed ? 1 : 0);
