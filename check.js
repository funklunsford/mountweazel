// Checks every climb in climbs.js. Run with `npm run check`; the deploy runs it too.
'use strict';
const CLIMBS = require('./climbs.js');

const CAMPS = ['Foothills', 'Treeline', 'Scree', 'Ridge', 'Summit'];
const LAYOUT = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4].map(k => CAMPS[k]);
let failed = false;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failed = true; };
const filled = s => typeof s === 'string' && s.trim().length > 0;
const senses = def => def.split(';').length;
const list = xs => xs.length ? ` (${xs.join(', ')})` : '';

for (const climb of CLIMBS) {
  const ledges = climb.ledges;
  console.log(`\nClimb ${climb.number}: ${ledges.length} ledges`);
  const at = (l, i) => `${i + 1} ${l.real.word}/${l.fake.word}`;
  const where = test => ledges.map((l, i) => test(l, i) ? at(l, i) : null).filter(Boolean);

  check(ledges.length === 12, 'twelve ledges, one per thousand feet');
  check(where(l => !['left', 'right'].includes(l.realOn)).length === 0, 'every ledge says which side the real word is on');
  check(where(l => !(filled(l.real.word) && filled(l.real.pos) && filled(l.real.def) && filled(l.real.history))).length === 0,
    'every real word has a part of speech, a definition and a history');
  check(where(l => l.real.quote && !(filled(l.real.quote.text) && filled(l.real.quote.cite))).length === 0,
    'every quotation has its source');
  check(where(l => !(filled(l.fake.word) && filled(l.fake.pos) && filled(l.fake.def) && filled(l.fake.anatomy))).length === 0,
    'every fake has a part of speech, a definition and an account of how it was made');
  check(where(l => 'history' in l.fake || 'quote' in l.fake || 'anatomy' in l.real).length === 0,
    'no fake has a history or a quotation, and no real word has an anatomy');

  const words = ledges.flatMap(l => [l.real.word, l.fake.word]).map(w => w.toLowerCase());
  const twice = words.filter((w, i) => words.indexOf(w) !== i);
  check(twice.length === 0, `no word appears twice${list(twice)}`);

  // Side by side, the two cards should differ only in whether the word is real.
  const pos = where(l => l.real.pos !== l.fake.pos);
  check(pos.length === 0, `both cards on a ledge have the same part of speech${list(pos)}`);
  const shape = where(l => senses(l.real.def) !== senses(l.fake.def));
  check(shape.length === 0, `both definitions on a ledge have the same number of senses${list(shape)}`);
  const length = where(l => {
    const [a, b] = [l.real.def.length, l.fake.def.length].sort((x, y) => x - y);
    return b > 2 * a;
  });
  check(length.length === 0, `neither definition on a ledge is more than twice as long as the other${list(length)}`);
  const leans = where(l => [l.fake.def, l.fake.anatomy].some(t => t.toLowerCase().includes(l.real.word.toLowerCase())));
  check(leans.length === 0, `no fake leans on the real word beside it${list(leans)}`);
  const stale = where(l => /this page|neighbour/i.test(l.fake.anatomy));
  check(stale.length === 0, `no fake's account mentions a page or a neighbour${list(stale)}`);

  const left = ledges.filter(l => l.realOn === 'left').length;
  check(Math.abs(left - (ledges.length - left)) <= 1, `the real word is on each side about equally often (${left} left, ${ledges.length - left} right)`);
  let run = 1, longest = 1;
  ledges.forEach((l, i) => { if (i > 0) { run = l.realOn === ledges[i - 1].realOn ? run + 1 : 1; longest = Math.max(longest, run); } });
  check(longest <= 3, `the real word is never on the same side more than three ledges running (longest run ${longest})`);

  // Altitude: the camps only go up, and common words (in SCOWL's lists) all come before rare ones.
  const ranks = ledges.map(l => CAMPS.indexOf(l.camp));
  check(ranks.every(r => r >= 0), 'every ledge is at a known camp');
  check(ranks.every((r, i) => i === 0 || r >= ranks[i - 1]), 'the camps never go down');
  // The page draws one mountain, with each camp's ledges in its own band.
  check(ledges.every((l, i) => l.camp === LAYOUT[i]), 'the camps match the drawn mountain: Foothills 1–3, Treeline 4–6, Scree 7–9, Ridge 10–11, Summit 12');
  const common = ledges.map(l => l.real.scowl != null);
  const lastCommon = common.lastIndexOf(true);
  const firstRare = common.indexOf(false);
  check(firstRare === -1 || lastCommon < firstRare, 'every real word in SCOWL’s common lists comes before every real word in none of them');
  check(ledges.every(l => l.real.scowl === null || [35, 40, 50].includes(l.real.scowl)), 'scowl is 35, 40, 50 or null');

  console.log(`  camps: ${ledges.map(l => l.camp).join(' · ')}`);
  console.log(`  real words: ${ledges.map(l => l.real.word + (l.real.scowl ? ` (${l.real.scowl})` : '')).join(', ')}`);
}

process.exit(failed ? 1 : 0);
