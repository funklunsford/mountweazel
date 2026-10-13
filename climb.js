/* Mountweazel: the climb. One ledge at a time: pick the real word of the two, see both revealed,
   then climb on, and the ledge is set on the word page. You carry three ropes; a wrong pick cuts
   one, and losing the last ends the climb. The words are in climbs.js. */
'use strict';

// The drawn mountain, in the scene's viewBox (360 × 230). The ledges climb its face in switchbacks,
// each camp in its own band of colour, and check.js holds every climb to that layout. SCENE.tree()
// describes the whole drawing as [tag, attributes, children]: the page builds it into SVG, and
// share/scene-svg.js turns it into markup for the share card.
const SCENE = {
  ledgeAt: [[64, 216], [112, 204], [160, 192], [210, 170], [170, 153], [134, 140], [168, 118], [204, 104], [236, 90], [212, 72], [190, 56], [196, 30]],
  base: [34, 226],
  peak: [196, 24],
  mountain: 'M8 230 L40 208 L62 197 L86 172 L108 162 L126 134 L146 120 L160 94 L172 80 L182 54 L196 24 L212 48 L226 58 L244 86 L262 100 L282 128 L302 146 L324 180 L352 230 Z',
  // The camps' bands above the foothills, each running down to a wavy line: [band, height, wave].
  bands: [['treeline', 181, 3], ['scree', 127, 3], ['ridge', 80, 3], ['summit', 45, 5]],

  tree() {
    const node = (tag, attrs = {}, kids = []) => [tag, attrs, kids];
    const points = ps => ps.map(p => p.join(',')).join(' ');
    const [px, py] = this.peak;
    // A wavy line across the mountain at height y, with everything above it filled.
    const above = (y, amp) => {
      let d = `M-10 -10 H370 V${y}`;
      for (let x = 370, k = 0; x > -20; x -= 30, k++) d += ` Q${x - 15} ${y + (k % 2 ? amp : -amp)} ${x - 30} ${y}`;
      return d + ' Z';
    };
    const cloud = (x, y, s) => node('g', { class: 'cloud' },
      [[0, 0, 9], [11, -5, 11], [24, 0, 9], [12, 4, 8]].map(([dx, dy, r]) => node('circle', { cx: x + dx * s, cy: y + dy * s, r: r * s })));
    const hatch = (id, size, angle, cls) => node('pattern', { id, width: size, height: size, patternUnits: 'userSpaceOnUse', patternTransform: `rotate(${angle})` },
      [node('line', { class: cls, x1: 0, y1: 0, x2: 0, y2: size })]);
    const defs = node('defs', {}, [
      // Hatching: the shaded face and the far ranges, engraved; a ledge where a rope was cut.
      hatch('ink-hatch', 3.2, 40, 'ink-line'),
      hatch('far-hatch', 4, -35, 'far-line'),
      node('pattern', { id: 'hatch-wrong', width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
        [node('rect', { class: 'hatch-bg', width: 4, height: 4 }), node('rect', { class: 'hatch-fg', width: 1.6, height: 4 })]),
      // Haze softens the foot of the mountain.
      node('linearGradient', { id: 'haze', x1: 0, y1: 0, x2: 0, y2: 1 },
        [node('stop', { class: 'haze-stop', offset: 0, 'stop-opacity': 0 }), node('stop', { class: 'haze-stop', offset: 1, 'stop-opacity': .55 })]),
      node('clipPath', { id: 'mountain-clip' }, [node('path', { d: this.mountain })])
    ]);
    const stars = [[30, 30], [70, 16], [118, 44], [150, 12], [252, 18], [282, 50], [334, 24], [344, 76], [18, 84], [96, 74], [-40, 40], [-90, 70], [400, 30], [450, 64]]
      .map(([x, y]) => node('circle', { class: 'star', cx: x, cy: y, r: .9 }));
    const trees = [[100, 177], [122, 171], [150, 177], [190, 137], [232, 151], [248, 173], [270, 157]]
      .map(([x, y]) => node('path', { class: 'tree', d: `M${x} ${y - 15} L${x + 4.5} ${y - 8} H${x + 2.5} L${x + 6.5} ${y - 1} H${x - 6.5} L${x - 2.5} ${y - 8} H${x - 4.5} Z` }));
    const rocks = [[150, 110], [226, 119], [186, 91], [256, 112], [214, 125]]
      .map(([x, y]) => node('path', { class: 'rock', d: `M${x - 6} ${y} L${x - 4} ${y - 5} L${x + 1} ${y - 7} L${x + 6} ${y - 3} L${x + 6} ${y} Z` }));
    const markers = this.ledgeAt.map(([x, y]) => node('g', { class: 'marker', transform: `translate(${x} ${y})` }, [
      node('circle', { r: 6.5 }),
      node('path', { class: 'glyph tick', d: 'M-3 .2 L-.8 2.6 L3.2 -2.4' }),
      node('path', { class: 'glyph cross', d: 'M-2.4 -2.4 L2.4 2.4 M2.4 -2.4 L-2.4 2.4' })]));
    // The scout: a bean in a ranger hat, with a pack and a sash, standing on its origin.
    const scout = node('g', { class: 'climber' }, [node('g', { class: 'bob' }, [node('g', { transform: 'scale(1.15)' }, [
      node('rect', { class: 'scout-pack', x: -9.6, y: -15.5, width: 6, height: 10, rx: 2 }),
      node('ellipse', { class: 'scout-body', cx: 0, cy: -9.5, rx: 6.5, ry: 8.5 }),
      node('path', { class: 'scout-sash', d: 'M-5.8 -9 L4.8 -2.6' }),
      node('ellipse', { class: 'scout-eye', cx: -2.2, cy: -11.6, rx: 1.7, ry: 2.1 }),
      node('ellipse', { class: 'scout-eye', cx: 2.4, cy: -11.6, rx: 1.7, ry: 2.1 }),
      node('circle', { class: 'scout-pupil', cx: -1.8, cy: -11.3, r: .85 }),
      node('circle', { class: 'scout-pupil', cx: 2.8, cy: -11.3, r: .85 }),
      node('path', { class: 'scout-hat', d: 'M-4.2 -16.6 C-4.2 -22.4 4.2 -22.4 4.2 -16.6 Z' }),
      node('ellipse', { class: 'scout-hat', cx: 0, cy: -16.6, rx: 8.4, ry: 2.1 }),
      node('ellipse', { class: 'scout-foot', cx: -2.8, cy: -.9, rx: 2.4, ry: 1.4 }),
      node('ellipse', { class: 'scout-foot', cx: 2.8, cy: -.9, rx: 2.4, ry: 1.4 })])])]);
    return [
      defs,
      node('g', {}, [...stars, node('circle', { class: 'sky-sun', cx: 306, cy: 76, r: 15 })]),
      // Far ranges run past both edges, so a wide screen shows more of them, not a gap.
      node('path', { class: 'far-1', d: 'M-240 230 V150 L-190 128 L-150 146 L-100 116 L-60 140 L-20 124 L24 140 L48 152 L78 122 L108 146 L140 128 L180 140 L230 120 L262 132 L298 96 L326 120 L360 104 L392 126 L430 100 L470 130 L520 112 L600 136 V230 Z' }),
      node('path', { class: 'far-2', d: 'M-240 230 V190 L-200 172 L-160 186 L-120 164 L-80 182 L-40 170 L0 192 L34 172 L62 186 L96 160 L124 182 L230 176 L268 150 L300 168 L332 140 L360 158 L400 170 L440 150 L490 176 L540 160 L600 180 V230 Z' }),
      node('g', { class: 'drift slow' }, [cloud(-6, 126, 1.3), cloud(318, 112, 1.1), cloud(-150, 100, 1.2), cloud(450, 92, 1.3)]),
      node('path', { class: 'band-foothills', d: 'M-240 226 Q-150 218 -60 225 T120 224 T300 223 T480 225 T660 222 V240 H-240 Z' }),
      // The mountain: bands of colour clipped to its shape, trees and rocks, the shaded east face.
      node('g', { 'clip-path': 'url(#mountain-clip)' }, [
        node('rect', { class: 'band-foothills', x: -10, y: -10, width: 380, height: 250 }),
        ...this.bands.map(([name, y, amp]) => node('path', { class: 'band-' + name, d: above(y, amp) })),
        ...trees,
        ...rocks,
        node('path', { class: 'shade', d: 'M196 24 L212 48 L226 58 L244 86 L262 100 L282 128 L302 146 L324 180 L352 230 L232 230 L222 196 L214 160 L208 120 L203 80 L199 50 Z' })
      ]),
      node('path', { class: 'outline', d: this.mountain }),
      node('rect', { class: 'haze', x: -240, y: 196, width: 840, height: 40 }),
      // The route: a dotted trail to every ledge, and the rope fixed so far.
      node('polyline', { class: 'trail', points: points([this.base, ...this.ledgeAt]) }),
      node('polyline', { class: 'rope-line rope-under' }),
      node('polyline', { class: 'rope-line rope-over' }),
      node('line', { class: 'pole', x1: px, y1: py, x2: px, y2: py - 19 }),
      node('path', { class: 'flag', d: `M${px} ${py - 19}l13 4.5l-13 4.5z` }),
      ...markers,
      node('circle', { class: 'halo', r: 8 }),
      scout,
      node('g', { class: 'drift' }, [cloud(266, 44, .8)])
    ];
  }
};
if (typeof module !== 'undefined' && module.exports) module.exports = { SCENE };

if (typeof document !== 'undefined') {
  const ROPES = 3;
  const RULES_KEY = 'mountweazel-climb-rules-seen';
  const SVG = 'http://www.w3.org/2000/svg';
  // Where someone is on the mountain, for the plate's caption and the sentence that ends a climb.
  const AT_CAMP = { Foothills: 'in the Foothills', Treeline: 'at the Treeline', Scree: 'on the Scree', Ridge: 'on the Ridge', Summit: 'on the last ledge' };
  const { ledgeAt: LEDGE_AT, base: BASE } = SCENE;
  // Badges for the end of a climb, like embroidered patches: the camp you finished in.
  const BADGE_FILL = { Foothills: '#c3cf8e', Treeline: '#93b583', Scree: '#c2b6a4', Ridge: '#b7cfd8', Summit: '#efc75a' };
  const $ = sel => document.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const climb = CLIMBS[CLIMBS.length - 1];
  const ledges = climb.ledges;
  const saveKey = 'mountweazel-climb-' + climb.number;

  // picks: the side picked on each ledge so far. seen: how many of those reveals you've climbed on from.
  let state = null;
  let scene = null;
  let shownAlt = null;
  let resetArmed = null;
  let toastTimer = null;
  // The word page: one slot per ledge and a heading per camp, built once and updated in place.
  const slotEls = [];
  const campHeads = {};
  let nextBar, climbOnBtn, verdictLine, slotList;

  const fresh = () => ({ picks: [], seen: 0 });
  const feet = n => `${(n * 1000).toLocaleString('en-US')} ft`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const upper = w => w.toUpperCase();
  const points = ps => ps.map(p => p.join(',')).join(' ');
  const rightAt = i => state.picks[i] === ledges[i].realOn;
  const wrongs = () => state.picks.filter((p, i) => p !== ledges[i].realOn).length;
  const ropesLeft = () => ROPES - wrongs();
  const summit = () => state.picks.length === ledges.length && wrongs() < ROPES;
  const over = () => wrongs() >= ROPES || state.picks.length === ledges.length;
  // Every pick climbs a ledge, except the one that cut the last rope.
  const climbed = () => wrongs() >= ROPES ? state.picks.length - 1 : state.picks.length;
  const mode = () => state.picks.length > state.seen ? 'reveal' : over() ? 'end' : 'pick';
  const campStarts = i => i === 0 || ledges[i].camp !== ledges[i - 1].camp;
  const campLedges = camp => ledges.map((l, j) => l.camp === camp ? j : -1).filter(j => j >= 0);
  const campSpan = camp => {
    const js = campLedges(camp);
    return js.length > 1 ? `Ledges ${js[0] + 1}–${js[js.length - 1] + 1} · up to ${feet(js[js.length - 1] + 1)}` : `Ledge ${js[0] + 1} · ${feet(js[0] + 1)}`;
  };

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

  /* ---------- The plate ---------- */

  // Builds SCENE's drawing into the page and returns the parts that change as you climb.
  function buildScene() {
    const root = $('#mountain');
    const build = ([tag, attrs, kids]) => {
      const node = svg(tag, attrs);
      for (const kid of kids) node.append(build(kid));
      return node;
    };
    root.append(...SCENE.tree().map(build));
    return {
      markers: [...root.querySelectorAll('.marker')],
      ropeUnder: root.querySelector('.rope-under'),
      ropeOver: root.querySelector('.rope-over'),
      halo: root.querySelector('.halo'),
      climber: root.querySelector('.climber')
    };
  }

  function ropeIcon() {
    const icon = svg('svg', { class: 'rope-icon', viewBox: '0 0 24 24', 'aria-hidden': 'true' });
    for (const cls of ['coil-under', 'coil-over']) {
      icon.append(
        svg('ellipse', { class: cls, cx: 11, cy: 11, rx: 8, ry: 6.5 }),
        svg('ellipse', { class: cls, cx: 11, cy: 11, rx: 4, ry: 3 }),
        svg('path', { class: cls, d: 'M17.5 15c2 2 2.6 4.2 1.6 6.8' }));
    }
    return icon;
  }

  // A badge for the camp a climb finished in, stitched like a patch.
  function drawBadge(camp) {
    const ink = { stroke: '#161514', 'stroke-width': 3, 'stroke-linejoin': 'round' };
    const parts = [
      svg('circle', { cx: 64, cy: 64, r: 58, fill: BADGE_FILL[camp], stroke: '#161514', 'stroke-width': 4 }),
      svg('circle', { cx: 64, cy: 64, r: 49, fill: 'none', stroke: '#fbfaf5', 'stroke-width': 2.5, 'stroke-dasharray': '5 4' })
    ];
    if (camp === 'Summit') {
      parts.push(
        svg('path', { ...ink, fill: '#fbfaf5', d: 'M24 92 L54 40 L66 58 L76 46 L104 92 Z' }),
        svg('line', { ...ink, x1: 54, y1: 40, x2: 54, y2: 20 }),
        svg('path', { ...ink, 'stroke-width': 2.5, fill: '#ae2a1f', d: 'M54 20 l16 6 l-16 6 z' }));
    } else if (camp === 'Ridge') {
      for (const [stroke, width] of [['#161514', 9], ['#fbfaf5', 4]]) {
        for (const a of [0, 60, 120]) {
          parts.push(svg('line', { x1: 64, y1: 38, x2: 64, y2: 90, stroke, 'stroke-width': width, 'stroke-linecap': 'round', transform: `rotate(${a} 64 64)` }));
        }
      }
    } else if (camp === 'Scree') {
      parts.push(
        svg('path', { ...ink, fill: '#e2dbcf', d: 'M30 90 L36 70 L52 62 L62 74 L60 90 Z' }),
        svg('path', { ...ink, fill: '#d2c8b8', d: 'M58 90 L64 66 L82 58 L98 72 L98 90 Z' }),
        svg('path', { ...ink, fill: '#f1ece3', d: 'M48 90 L54 80 L66 78 L70 90 Z' }));
    } else if (camp === 'Treeline') {
      parts.push(
        svg('rect', { ...ink, fill: '#7a5532', x: 58, y: 84, width: 12, height: 12 }),
        svg('path', { ...ink, fill: '#5c875b', d: 'M64 28 L80 54 H72 L88 86 H40 L56 54 H48 Z' }));
    } else {
      parts.push(
        svg('circle', { ...ink, fill: '#f0d98a', cx: 84, cy: 46, r: 10 }),
        svg('path', { ...ink, fill: '#a9c27d', d: 'M22 92 C34 62 58 60 74 92 Z' }),
        svg('path', { ...ink, fill: '#cfd8a3', d: 'M50 92 C64 68 92 66 106 92 Z' }));
    }
    $('#badge').replaceChildren(...parts);
    $('#badge-name').textContent = `${camp} badge`;
  }

  /* ---------- Entries ---------- */

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

  // A proof card is a button until it's picked, then a revealed entry, marked real or forged.
  // Before a pick the two cards differ only by side (Proof A or B), never by which is real.
  function card(i, side, revealed, just) {
    const ledge = ledges[i];
    const isReal = ledge.realOn === side;
    const entry = isReal ? ledge.real : ledge.fake;
    const line = el('span', 'hw-line');
    line.append(el('span', 'hw', entry.word), el('span', 'pos', entry.pos));
    if (!revealed) {
      const button = el('button', 'card');
      button.type = 'button';
      button.append(el('span', 'proof-label', side === 'left' ? 'Proof A' : 'Proof B'), line, el('span', 'def', entry.def));
      button.addEventListener('click', () => pick(side));
      return button;
    }
    const node = el('div', `card ${isReal ? 'real' : 'forged'}${just ? ' just' : ''}`);
    if (state.picks[i] === side) {
      node.classList.add('picked');
      node.append(el('span', 'pick-tag', 'Your pick'));
    }
    node.append(el('span', 'stamp', isReal ? 'real ✓' : 'forged ✗'), line, el('span', 'def', entry.def), revealBody(entry, isReal));
    return node;
  }

  /* ---------- The word page ---------- */

  function buildPage() {
    slotList = $('#slots');
    nextBar = $('#next-bar');
    climbOnBtn = $('#climb-on');
    verdictLine = $('#verdict-line');
    ledges.forEach((l, i) => {
      if (campStarts(i)) {
        const head = el('li', 'camp-head');
        head.append(el('span', 'ch-name', `The ${l.camp}`), el('span', 'ch-sub', campSpan(l.camp)));
        campHeads[l.camp] = { el: head, first: i };
        slotList.append(head);
      }
      const slot = el('li', 'slot');
      slotEls.push(slot);
      slotList.append(slot);
    });
  }

  function slotKind(i) {
    if (i < state.picks.length) return mode() === 'reveal' && i === state.seen ? 'reveal' : 'set';
    if (mode() === 'pick' && i === state.picks.length) return 'frontier';
    return over() ? 'unreached' : 'unset';
  }

  function fillSlot(i, kind, { just = false, typeset = false, arrive = false } = {}) {
    const slot = slotEls[i];
    const l = ledges[i];
    slot.className = 'slot ' + kind;
    slot.replaceChildren();
    if (kind === 'unset') {
      slot.append(el('span', 'slot-n', `Ledge ${i + 1}`), el('span', 'slot-alt', feet(i + 1)), el('span', 'slot-note', 'To be set'));
      return;
    }
    if (kind === 'frontier' || kind === 'reveal') {
      const head = el('h3', 'slot-head', kind === 'frontier' ? 'Which word is real?' : `Ledge ${i + 1}, revealed`);
      head.append(el('span', 'sh-alt', kind === 'frontier' ? `Ledge ${i + 1} · ${feet(i + 1)}` : `${feet(i + 1)} · ${l.camp}`));
      if (kind === 'frontier') head.id = 'prompt';
      const pair = el('div', 'pair' + (arrive && !reduceMotion ? ' arrive' : ''));
      pair.id = 'pair';
      const revealed = kind === 'reveal';
      pair.append(card(i, 'left', revealed, just), card(i, 'right', revealed, just));
      slot.append(head, pair);
      return;
    }
    // Set (or, after the climb, not reached): the real entry in type, the forgery struck out.
    const result = kind === 'unreached' ? 'unreached' : (rightAt(i) ? 'right' : 'wrong');
    slot.classList.add(result);
    if (typeset && !reduceMotion) slot.classList.add('typeset');
    const mark = el('span', 'slot-mark', { right: '✓', wrong: '✗', unreached: '·' }[result]);
    mark.setAttribute('aria-hidden', 'true');
    const body = el('div', 'set-entries');
    const real = el('p', 'set-entry real');
    real.append(el('span', 'sr-only', { right: 'Right: ', wrong: 'Wrong: ', unreached: 'Not reached: ' }[result]),
      el('b', 'hw', l.real.word), ' ', el('i', 'pos', l.real.pos), ' ', el('span', 'def', l.real.def),
      el('span', 'proof real', 'real'), el('span', 'set-alt', feet(i + 1)));
    const fake = el('p', 'set-entry forged');
    fake.append(el('b', 'hw', l.fake.word), ' ', el('i', 'pos', l.fake.pos), ' ', el('span', 'def', l.fake.def), el('span', 'proof forged', 'forged'));
    body.append(real, fake);
    if (result === 'wrong') body.append(el('p', 'erratum', `Erratum: ${upper(l.fake.word)} went to press in error, and a rope was cut.`));
    const more = el('details', 'more');
    more.append(el('summary', null, 'History'), revealBody(l.real, true), revealBody(l.fake, false));
    body.append(more);
    slot.append(mark, body);
  }

  // Redraws only the slots whose state changed, so an open History stays open.
  function renderPage(m, just, arrive) {
    for (let i = 0; i < ledges.length; i++) {
      const kind = slotKind(i);
      const key = `${kind}:${state.picks[i] || ''}`;
      const slot = slotEls[i];
      if (slot.dataset.key === key) continue;
      const was = slot.dataset.key || '';
      slot.dataset.key = key;
      fillSlot(i, kind, { just: just && kind === 'reveal', typeset: arrive && kind === 'set' && was.startsWith('reveal'), arrive: arrive && kind === 'frontier' });
    }
    const reach = m === 'pick' ? state.picks.length : m === 'reveal' ? state.seen : state.picks.length - 1;
    for (const { el: head, first } of Object.values(campHeads)) head.classList.toggle('ahead', first > reach);
    // The verdict and Climb on travel with the ledge being revealed.
    if (m === 'reveal') {
      const slot = slotEls[state.seen];
      if (nextBar.parentNode !== slot) slot.append(nextBar);
      nextBar.hidden = false;
    } else {
      if (nextBar.previousElementSibling !== slotList) slotList.after(nextBar);
      nextBar.hidden = true;
    }
    $('#set-count').textContent = `${Math.min(state.seen, ledges.length)} of ${ledges.length} set`;
  }

  /* ---------- Drawing ---------- */

  function render(just = false, arrive = false) {
    const m = mode();
    const current = m === 'pick' ? state.picks.length : m === 'reveal' ? state.seen : null;
    renderStatus(m, current, just);
    renderScene(m === 'pick' ? current : null);
    renderPage(m, just, arrive);
    if (m === 'reveal') renderVerdict(state.seen);
    $('#press').hidden = m !== 'end';
    if (m === 'end') renderEnd();
  }

  function renderStatus(m, current, animate) {
    // The camp half drops out on phones, where every camp has its own heading on the page.
    const [main, extra] = m === 'end'
      ? (summit() ? ['Summit', ` · all ${ledges.length} ledges`] : ['Out of rope', ` · ledge ${climbed()} of ${ledges.length}`])
      : [`Ledge ${current + 1} of ${ledges.length}`, ` · ${ledges[current].camp}`];
    $('#where').replaceChildren(el('span', 'w-main', main), el('span', 'w-extra', extra));
    setAltitude(climbed() * 1000, animate);
    const left = ropesLeft();
    document.querySelectorAll('#ropes .rope-seg').forEach((r, k) => r.classList.toggle('cut', k >= left));
    $('#ropes').setAttribute('aria-label', `${plural(left, 'rope', 'ropes')} left`);
    const up = climbed();
    $('#caption').textContent = summit() ? `Our correspondent on the summit, ${feet(ledges.length)}.`
      : m === 'end' ? `Our correspondent turned back ${AT_CAMP[ledges[state.picks.length - 1].camp]}, at ${feet(up)}.`
      : up === 0 ? 'Our correspondent at the foot of Mount Weazel.'
      : `Our correspondent ${AT_CAMP[ledges[up - 1].camp]}, ${feet(up)} up.`;
  }

  // The altitude counts up to its new value when you climb.
  function setAltitude(value, animate) {
    const out = $('#alt');
    const show = v => { out.textContent = `${Math.round(v).toLocaleString('en-US')} ft`; };
    const from = shownAlt;
    shownAlt = value;
    if (!animate || reduceMotion || from == null || from === value) { show(value); return; }
    const start = performance.now();
    const step = now => {
      if (shownAlt !== value) return;
      const t = Math.min(1, (now - start) / 700);
      show(from + (value - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderScene(target) {
    const { markers, ropeUnder, ropeOver, halo, climber } = scene;
    markers.forEach((mk, j) => {
      let cls = 'marker';
      if (j < state.picks.length) cls += rightAt(j) ? ' right' : ' wrong';
      else if (over()) cls += ' unreached';
      mk.setAttribute('class', cls);
    });
    const route = [BASE, ...LEDGE_AT.slice(0, climbed())];
    ropeUnder.setAttribute('points', points(route));
    ropeOver.setAttribute('points', points(route));
    const [cx, cy] = route[route.length - 1];
    climber.style.transform = `translate(${cx}px, ${cy - 6}px)`;
    if (target == null) halo.setAttribute('display', 'none');
    else {
      halo.removeAttribute('display');
      halo.setAttribute('cx', LEDGE_AT[target][0]);
      halo.setAttribute('cy', LEDGE_AT[target][1]);
    }
    $('#mountain').setAttribute('aria-label',
      `Mount Weazel: ${climbed()} of ${ledges.length} ledges climbed, ${plural(ropesLeft(), 'rope', 'ropes')} left.`);
  }

  // A camp's name, stamped across the plate and lit up on the word page, as you reach it.
  function showTitle(name, sub) {
    if (reduceMotion) return;
    const box = $('#title-card');
    $('#tc-name').textContent = name;
    $('#tc-sub').textContent = sub;
    box.classList.remove('show');
    void box.offsetWidth;
    box.classList.add('show');
  }

  function announceCamp() {
    const m = mode();
    if (m === 'end' && summit()) { showTitle('Summit', `${feet(ledges.length)} · all ${ledges.length} ledges`); return; }
    if (m !== 'pick') return;
    const i = state.picks.length;
    if (!campStarts(i)) return;
    const camp = ledges[i].camp;
    showTitle(camp, campSpan(camp));
    if (reduceMotion) return;
    const head = campHeads[camp].el;
    head.classList.remove('arrived');
    void head.offsetWidth;
    head.classList.add('arrived');
  }

  function renderVerdict(i) {
    const ledge = ledges[i];
    const right = rightAt(i);
    verdictLine.className = 'verdict-line ' + (right ? 'right' : 'wrong');
    if (right) verdictLine.textContent = summit()
      ? `Right: ${upper(ledge.real.word)} is real. You’re on the summit!`
      : `Right: ${upper(ledge.real.word)} is real. Up to ${feet(i + 1)}.`;
    else if (wrongs() >= ROPES) verdictLine.textContent = `${upper(ledge.fake.word)} was forged, and that was your last rope.`;
    else if (summit()) verdictLine.textContent = `${upper(ledge.fake.word)} was forged. A rope is cut, but you’re on the summit!`;
    else verdictLine.textContent = `${upper(ledge.fake.word)} was forged. A rope is cut: ${plural(ropesLeft(), 'rope', 'ropes')} left.`;
    climbOnBtn.textContent = over() ? 'See the page' : 'Climb on';
  }

  function renderEnd() {
    const top = summit();
    drawBadge(top ? 'Summit' : ledges[Math.max(0, climbed() - 1)].camp);
    $('#verdict').textContent = top ? (wrongs() === 0 ? 'A Clean Ascent' : 'Summit Reached') : `Out of Rope at ${feet(climbed()).replace(' ft', ' Feet')}`;
    $('#press-stats').textContent = top
      ? `All ${ledges.length} ledges climbed and set, with ${ropesLeft()} of ${ROPES} ropes left.`
      : `You climbed ${climbed()} of ${ledges.length} ledges. Your last rope went ${AT_CAMP[ledges[state.picks.length - 1].camp]}.`;
    $('#share-text').value = shareText();
  }

  /* ---------- Playing ---------- */

  function pick(side) {
    if (mode() !== 'pick') return;
    state.picks.push(side);
    markRulesSeen();
    save();
    render(true);
    $('#live').textContent = verdictLine.textContent;
    climbOnBtn.focus({ preventScroll: true });
  }

  function climbOn() {
    if (mode() !== 'reveal') return;
    state.seen = state.picks.length;
    save();
    render(false, true);
    const behavior = reduceMotion ? 'auto' : 'smooth';
    if (mode() === 'pick') {
      // Show the entry just set, with the next ledge's proofs beneath it, below the running head.
      const set = slotEls[state.picks.length - 1];
      const slot = slotEls[state.picks.length];
      const top = set.getBoundingClientRect().top;
      if (top < $('#runhead').offsetHeight || slot.getBoundingClientRect().bottom > innerHeight) set.scrollIntoView({ behavior, block: 'start' });
      announceCamp();
      slot.querySelector('.card').focus({ preventScroll: true });
    } else {
      $('#press').scrollIntoView({ behavior, block: 'start' });
      announceCamp();
      $('#verdict').focus({ preventScroll: true });
    }
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
    announceCamp();
    toast('Back at the foot of the mountain, with a blank page.');
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

  // Slots scroll into view below the running head, whatever its height.
  function measureRunhead() {
    document.documentElement.style.setProperty('--runhead-h', `${$('#runhead').offsetHeight}px`);
  }

  function boot(data) {
    buildPage();
    climbOnBtn.addEventListener('click', climbOn);
    $('#copy').addEventListener('click', copyShare);
    $('#reset').addEventListener('click', reset);
    document.addEventListener('keydown', onKey);

    $('#issue').textContent = `Vol. I · Climb No. ${climb.number}`;
    const narrow = window.matchMedia('(max-width: 719px)').matches;
    $('#dateline').textContent = new Date().toLocaleDateString(undefined, narrow ?
      { weekday: 'short', month: 'short', day: 'numeric' } :
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    $('#ropes').append(ropeIcon(), ...Array.from({ length: ROPES }, () => el('span', 'rope-seg')));
    scene = buildScene();
    measureRunhead();
    window.addEventListener('resize', measureRunhead);

    let saved = data && data.state;
    if (!saved) { try { saved = JSON.parse(localStorage.getItem(saveKey)); } catch (_) { saved = null; } }
    state = valid(saved) ? saved : fresh();
    // The rules open for a first visit only where the plate and the page sit side by side; on
    // narrower screens they'd push the first ledge off the first screen.
    const rules = $('.rules');
    if (rules) rules.open = window.matchMedia('(min-width: 900px)').matches && !rulesSeen() && state.picks.length === 0;
    render();
    announceCamp();
    try { window.claude?.hot?.snapshot?.(() => ({ state })); } catch (_) { /* not in a viewer */ }
  }

  if (window.claude?.hot?.ready) window.claude.hot.ready(boot);
  else boot(window.claude?.hot?.data ?? {});
}
