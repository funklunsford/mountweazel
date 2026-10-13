/* Mountweazel: the climb. One ledge at a time: pick the real word of the two, see both revealed,
   then climb on. You carry three ropes; a wrong pick cuts one, and losing the last ends the climb.
   The words are in climbs.js. */
'use strict';

if (typeof document !== 'undefined') {
  const ROPES = 3;
  const RULES_KEY = 'mountweazel-climb-rules-seen';
  const SVG = 'http://www.w3.org/2000/svg';
  // Where the last rope went, for the sentence that ends a climb.
  const AT_CAMP = { Foothills: 'in the Foothills', Treeline: 'at the Treeline', Scree: 'on the Scree', Ridge: 'on the Ridge', Summit: 'on the last ledge' };
  const $ = sel => document.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const climb = CLIMBS[CLIMBS.length - 1];
  const ledges = climb.ledges;
  const saveKey = 'mountweazel-climb-' + climb.number;

  // picks: the side picked on each ledge so far. seen: how many of those reveals you've climbed on from.
  let state = null;
  let mount = null;
  let resetArmed = null;
  let toastTimer = null;

  const fresh = () => ({ picks: [], seen: 0 });
  const feet = n => `${(n * 1000).toLocaleString('en-US')} ft`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const upper = w => w.toUpperCase();
  const rightAt = i => state.picks[i] === ledges[i].realOn;
  const wrongs = () => state.picks.filter((p, i) => p !== ledges[i].realOn).length;
  const ropesLeft = () => ROPES - wrongs();
  const summit = () => state.picks.length === ledges.length && wrongs() < ROPES;
  const over = () => wrongs() >= ROPES || state.picks.length === ledges.length;
  // Every pick climbs a ledge, except the one that cut the last rope.
  const climbed = () => wrongs() >= ROPES ? state.picks.length - 1 : state.picks.length;
  const mode = () => state.picks.length > state.seen ? 'reveal' : over() ? 'end' : 'pick';

  function valid(s) {
    if (!s || typeof s !== 'object' || !Array.isArray(s.picks) || !Number.isInteger(s.seen)) return false;
    if (s.picks.length > ledges.length || !s.picks.every(p => p === 'left' || p === 'right')) return false;
    if (s.seen < s.picks.length - 1 || s.seen > s.picks.length) return false;
    // Nothing may be picked after the last rope went.
    let cut = 0;
    for (let i = 0; i < s.picks.length; i++) {
      if (cut >= ROPES) return false;
      if (s.picks[i] !== ledges[i].realOn) cut++;
    }
    return true;
  }

  function save() {
    try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch (_) { /* storage blocked: climb on without saving */ }
  }

  function rulesSeen() {
    try { return localStorage.getItem(RULES_KEY) === '1'; } catch (_) { return false; }
  }

  function markRulesSeen() {
    try { localStorage.setItem(RULES_KEY, '1'); } catch (_) { /* fine */ }
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function svg(tag, attrs = {}) {
    const node = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  /* ---------- The mountain: one dot per ledge along the ridge, a flag on the summit ---------- */

  function buildMountain() {
    const n = ledges.length;
    const [sx, sy] = [262, 8];
    // The ledges climb the left face, gently at first and steeper toward the summit.
    const pts = ledges.map((_, i) => {
      const t = i / (n - 1);
      const wobble = i === 0 || i === n - 1 ? 0 : [3, -2, 2, -3][i % 4];
      return [Math.round(22 + (sx - 22) * t), Math.round(100 - (100 - sy) * Math.pow(t, 1.25) + wobble)];
    });
    const line = ps => ps.map(p => p.join(',')).join(' ');
    const pattern = svg('pattern', { id: 'hatch', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' });
    pattern.append(svg('line', { class: 'hatch-line', x1: 0, y1: 0, x2: 0, y2: 5 }));
    const defs = svg('defs');
    defs.append(pattern);
    // A farther peak behind, then the mountain: solid ground, hatching, and an inked ridgeline.
    const farRidge = [[200, 108], [300, 24], [322, 40], [346, 26], [360, 34]];
    const ridge = [[0, 104], ...pts, [286, 34], [304, 48], [330, 74], [360, 90]];
    const ground = ps => line([...ps, [360, 108], [0, 108]]);
    const scene = [
      svg('polygon', { class: 'ground', points: ground(farRidge) }),
      svg('polyline', { class: 'far', points: line(farRidge) }),
      svg('polygon', { class: 'ground', points: ground(ridge) }),
      svg('polygon', { class: 'hatched', points: ground(ridge) }),
      svg('polyline', { class: 'ridge', points: line(ridge) }),
      svg('line', { class: 'ridge', x1: 0, y1: 108, x2: 360, y2: 108 })
    ];
    const trail = svg('polyline', { class: 'trail' });
    const pole = svg('line', { class: 'pole', x1: sx, y1: sy, x2: sx, y2: sy - 17 });
    const flag = svg('path', { class: 'flag', d: `M${sx} ${sy - 17}l12 4.5l-12 4.5z` });
    const halo = svg('circle', { class: 'halo', r: 9 });
    const dots = pts.map(([x, y]) => svg('circle', { class: 'dot', cx: x, cy: y, r: 5 }));
    $('#mountain').append(defs, ...scene, trail, pole, flag, halo, ...dots);
    return { pts, dots, trail, halo };
  }

  function ropeIcon() {
    const icon = svg('svg', { class: 'rope', viewBox: '0 0 24 24', 'aria-hidden': 'true' });
    icon.append(
      svg('ellipse', { cx: 11, cy: 11, rx: 8, ry: 6.5 }),
      svg('ellipse', { cx: 11, cy: 11, rx: 4.5, ry: 3.4 }),
      svg('path', { d: 'M17.5 15c2 2 2.6 4.2 1.6 6.8' }),
      svg('line', { class: 'slash', x1: 3, y1: 21, x2: 21, y2: 3 }));
    return icon;
  }

  /* ---------- Cards ---------- */

  function revealBody(entry, isReal) {
    const box = el('div', 'reveal');
    if (isReal) {
      box.append(el('p', 'history', entry.history));
      if (entry.quote) {
        const q = el('blockquote', 'quote');
        q.append(el('span', 'q-text', `“${entry.quote.text}”`), el('cite', null, entry.quote.cite));
        box.append(q);
      }
    } else {
      const p = el('p', 'anatomy');
      p.append(el('span', 'tag', 'Mountweazel'), document.createTextNode(entry.anatomy));
      box.append(p);
    }
    return box;
  }

  // A card is a button until it's picked, then a revealed entry: stamped real or forged, with its story.
  function card(i, side, revealed, just) {
    const ledge = ledges[i];
    const isReal = ledge.realOn === side;
    const entry = isReal ? ledge.real : ledge.fake;
    const line = el('span', 'hw-line');
    line.append(el('span', 'hw', entry.word), el('span', 'pos', entry.pos));
    if (!revealed) {
      const button = el('button', 'card');
      button.type = 'button';
      button.append(line, el('span', 'def', entry.def));
      button.addEventListener('click', () => pick(side));
      return button;
    }
    const node = el('div', `card ${isReal ? 'real' : 'forged'}${just ? ' just' : ''}`);
    if (state.picks[i] === side) {
      node.classList.add('picked');
      node.append(el('span', 'pick-tag', 'Your pick'));
    }
    node.append(el('span', 'stamp', isReal ? 'real' : 'forged'), line, el('span', 'def', entry.def), revealBody(entry, isReal));
    return node;
  }

  /* ---------- Drawing ---------- */

  function render(just = false, arrive = false) {
    const m = mode();
    const current = m === 'pick' ? state.picks.length : m === 'reveal' ? state.seen : null;
    renderStatus(m, current);
    renderMountain(current);
    $('#ledge').hidden = m === 'end';
    $('#press').hidden = m !== 'end';
    $('#log-panel').hidden = m !== 'end';
    if (m === 'end') renderEnd();
    else renderLedge(m, current, just);
    if (arrive && !reduceMotion && m === 'pick') {
      const pair = $('#pair');
      pair.classList.remove('arrive');
      void pair.offsetWidth;
      pair.classList.add('arrive');
    }
  }

  function renderStatus(m, current) {
    $('#where').textContent = m === 'end'
      ? (summit() ? `Summit · ${feet(ledges.length)}` : `Out of rope · ${feet(climbed())}`)
      : `Ledge ${current + 1} of ${ledges.length} · ${ledges[current].camp} · ${feet(current + 1)}`;
    const left = ropesLeft();
    document.querySelectorAll('#ropes .rope').forEach((r, k) => r.classList.toggle('cut', k >= left));
    $('#ropes').setAttribute('aria-label', `${plural(left, 'rope', 'ropes')} left`);
  }

  function renderMountain(current) {
    const { pts, dots, trail, halo } = mount;
    dots.forEach((d, j) => {
      let cls = 'dot';
      if (j < state.picks.length) cls += rightAt(j) ? ' right' : ' wrong';
      else if (over()) cls += ' unreached';
      if (j === current) cls += ' now';
      d.setAttribute('class', cls);
    });
    trail.setAttribute('points', [[0, 104], ...pts.slice(0, climbed())].map(p => p.join(',')).join(' '));
    if (current == null) halo.setAttribute('display', 'none');
    else {
      halo.removeAttribute('display');
      halo.setAttribute('cx', pts[current][0]);
      halo.setAttribute('cy', pts[current][1]);
    }
    $('#mountain').setAttribute('aria-label',
      `Mount Weazel: ${climbed()} of ${ledges.length} ledges climbed, ${plural(ropesLeft(), 'rope', 'ropes')} left.`);
  }

  function renderLedge(m, i, just) {
    const ledge = ledges[i];
    const revealed = m === 'reveal';
    $('#prompt').hidden = revealed;
    $('#pair').replaceChildren(card(i, 'left', revealed, just), card(i, 'right', revealed, just));
    $('#next-bar').hidden = !revealed;
    if (!revealed) return;
    const right = rightAt(i);
    const verdict = $('#verdict-line');
    verdict.className = 'verdict-line ' + (right ? 'right' : 'wrong');
    if (right) verdict.textContent = summit()
      ? `Right: ${upper(ledge.real.word)} is real. You’re on the summit!`
      : `Right: ${upper(ledge.real.word)} is real. Up to ${feet(i + 1)}.`;
    else if (wrongs() >= ROPES) verdict.textContent = `${upper(ledge.fake.word)} was forged, and that was your last rope.`;
    else if (summit()) verdict.textContent = `${upper(ledge.fake.word)} was forged. A rope is cut, but you’re on the summit!`;
    else verdict.textContent = `${upper(ledge.fake.word)} was forged. A rope is cut: ${plural(ropesLeft(), 'rope', 'ropes')} left.`;
    $('#climb-on').textContent = over() ? 'See your climb' : 'Climb on';
  }

  function renderEnd() {
    const top = summit();
    const height = (climbed() * 1000).toLocaleString('en-US');
    $('#verdict').textContent = top ? (wrongs() === 0 ? 'A Clean Ascent' : 'On the Summit') : `Out of Rope at ${height} Feet`;
    $('#press-stats').textContent = top
      ? `All ${ledges.length} ledges climbed, with ${ropesLeft()} of ${ROPES} ropes left.`
      : `You climbed ${climbed()} of ${ledges.length} ledges. Your last rope went ${AT_CAMP[ledges[state.picks.length - 1].camp]}.`;
    $('#share-text').value = shareText();
    $('#log').replaceChildren(...ledges.map((l, i) => {
      const reached = i < state.picks.length;
      const result = reached ? (rightAt(i) ? 'right' : 'wrong') : 'unreached';
      const row = el('li', 'log-row ' + result);
      const details = el('details');
      const summary = el('summary');
      const mark = el('span', 'log-mark', { right: '✓', wrong: '✗', unreached: '·' }[result]);
      mark.setAttribute('aria-hidden', 'true');
      const words = el('span', 'log-words');
      words.append(el('span', 'log-real', l.real.word), el('span', 'log-fake', l.fake.word));
      summary.append(mark,
        el('span', 'sr-only', { right: 'Right: ', wrong: 'Wrong: ', unreached: 'Not reached: ' }[result]),
        el('span', 'log-alt', feet(i + 1)),
        words);
      const body = el('div', 'log-body');
      body.append(card(i, l.realOn, true, false), card(i, l.realOn === 'left' ? 'right' : 'left', true, false));
      details.append(summary, body);
      row.append(details);
      return row;
    }));
  }

  /* ---------- Playing ---------- */

  function pick(side) {
    if (mode() !== 'pick') return;
    state.picks.push(side);
    markRulesSeen();
    save();
    render(true);
    $('#live').textContent = $('#verdict-line').textContent;
    $('#climb-on').focus({ preventScroll: true });
  }

  function climbOn() {
    if (mode() !== 'reveal') return;
    state.seen = state.picks.length;
    save();
    render(false, true);
    const box = $('#ascent');
    if (box.getBoundingClientRect().top < 0) box.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (mode() === 'pick') $('#pair .card').focus({ preventScroll: true });
    else $('#verdict').focus({ preventScroll: true });
  }

  function reset() {
    if (!resetArmed) {
      resetArmed = setTimeout(() => { resetArmed = null; }, 4000);
      toast('Press Start over again to go back to the foot of the mountain.');
      return;
    }
    clearTimeout(resetArmed);
    resetArmed = null;
    state = fresh();
    save();
    render(false, true);
    $('#ascent').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    toast('Back at the foot of the mountain.');
  }

  function onKey(ev) {
    if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.target.closest && ev.target.closest('textarea, input, select, summary, [contenteditable]')) return;
    if (mode() !== 'pick') return;
    if (ev.key === 'ArrowLeft' || ev.key === '1') { ev.preventDefault(); pick('left'); }
    else if (ev.key === 'ArrowRight' || ev.key === '2') { ev.preventDefault(); pick('right'); }
  }

  function shareText() {
    const grid = ledges.map((_, i) => i < state.picks.length ? (rightAt(i) ? '🟩' : '🟥') : '⬜').join('');
    const line = summit()
      ? `Summit, ${feet(ledges.length)} · ${plural(ropesLeft(), 'rope', 'ropes')} left`
      : `Out of rope at ${feet(climbed())}`;
    return `Mountweazel · Climb No. ${climb.number}\n${grid}\n${line}`;
  }

  function copyShare() {
    const text = shareText();
    const box = $('#share-text');
    const fallback = () => { box.focus(); box.select(); toast('Select the text and copy it.'); };
    try {
      navigator.clipboard.writeText(text).then(() => toast('Copied.'), fallback);
    } catch (_) { fallback(); }
  }

  function toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
  }

  function boot(data) {
    $('#climb-on').addEventListener('click', climbOn);
    $('#copy').addEventListener('click', copyShare);
    $('#reset').addEventListener('click', reset);
    document.addEventListener('keydown', onKey);

    $('#issue').textContent = `Vol. I · Climb No. ${climb.number}`;
    $('#climb-no').textContent = `Climb No. ${climb.number}`;
    const narrow = window.matchMedia('(max-width: 719px)').matches;
    $('#dateline').textContent = new Date().toLocaleDateString(undefined, narrow ?
      { weekday: 'short', month: 'short', day: 'numeric' } :
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    $('#ropes').append(...Array.from({ length: ROPES }, ropeIcon));
    mount = buildMountain();

    let saved = data && data.state;
    if (!saved) { try { saved = JSON.parse(localStorage.getItem(saveKey)); } catch (_) { saved = null; } }
    state = valid(saved) ? saved : fresh();
    // The rules open for a first visit on a wide screen only; on a phone the deck says enough,
    // and the first ledge stays on the first screen.
    const rules = $('.rules');
    if (rules) rules.open = !narrow && !rulesSeen() && state.picks.length === 0;
    render();
    try { window.claude?.hot?.snapshot?.(() => ({ state })); } catch (_) { /* not in a viewer */ }
  }

  if (window.claude?.hot?.ready) window.claude.hot.ready(boot);
  else boot(window.claude?.hot?.data ?? {});
}
