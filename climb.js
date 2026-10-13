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
  // Where each ledge sits on the drawn mountain (viewBox 360 × 230): switchbacks up the face, each
  // camp in its own band of colour. check.js holds every climb to this layout of camps.
  const LEDGE_AT = [[64, 216], [112, 204], [160, 192], [210, 170], [170, 153], [134, 140], [168, 118], [204, 104], [236, 90], [212, 72], [190, 56], [196, 30]];
  const BASE = [34, 226];
  const PEAK = [196, 24];
  const MOUNTAIN = 'M8 230 L40 208 L62 197 L86 172 L108 162 L126 134 L146 120 L160 94 L172 80 L182 54 L196 24 L212 48 L226 58 L244 86 L262 100 L282 128 L302 146 L324 180 L352 230 Z';
  // The camps' bands, bottom to top, each running down to a wavy line across the mountain.
  const BANDS = [['treeline', 181, 3], ['scree', 127, 3], ['ridge', 80, 3], ['summit', 45, 5]];
  // Merit badges for the end of a climb: the camp you finished in.
  const BADGE_FILL = { Foothills: '#9ed27a', Treeline: '#4fa36f', Scree: '#a79cc0', Ridge: '#8fc6e6', Summit: '#ffc845' };
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

  /* ---------- The scene: sky, mountain, trail, ledges, flag and climber ---------- */

  // A wavy line across the mountain at height y, with everything above it filled.
  function above(y, amp) {
    let d = `M-10 -10 H370 V${y}`;
    for (let x = 370, k = 0; x > -20; x -= 30, k++) d += ` Q${x - 15} ${y + (k % 2 ? amp : -amp)} ${x - 30} ${y}`;
    return d + ' Z';
  }

  function cloud(x, y, s) {
    const g = svg('g', { class: 'cloud' });
    for (const [dx, dy, r] of [[0, 0, 9], [11, -5, 11], [24, 0, 9], [12, 4, 8]]) g.append(svg('circle', { cx: x + dx * s, cy: y + dy * s, r: r * s }));
    return g;
  }

  function buildClimber() {
    const climber = svg('g', { class: 'climber' });
    const bob = svg('g', { class: 'bob' });
    const scout = svg('g', { transform: 'scale(1.15)' });
    scout.append(
      svg('rect', { class: 'scout-pack', x: -9.6, y: -15.5, width: 6, height: 10, rx: 2 }),
      svg('ellipse', { class: 'scout-body', cx: 0, cy: -9.5, rx: 6.5, ry: 8.5 }),
      svg('path', { class: 'scout-sash', d: 'M-5.8 -9 L4.8 -2.6' }),
      svg('ellipse', { class: 'scout-eye', cx: -2.2, cy: -11.6, rx: 1.7, ry: 2.1 }),
      svg('ellipse', { class: 'scout-eye', cx: 2.4, cy: -11.6, rx: 1.7, ry: 2.1 }),
      svg('circle', { class: 'scout-pupil', cx: -1.8, cy: -11.3, r: .85 }),
      svg('circle', { class: 'scout-pupil', cx: 2.8, cy: -11.3, r: .85 }),
      svg('path', { class: 'scout-hat', d: 'M-4.2 -16.6 C-4.2 -22.4 4.2 -22.4 4.2 -16.6 Z' }),
      svg('ellipse', { class: 'scout-hat', cx: 0, cy: -16.6, rx: 8.4, ry: 2.1 }),
      svg('ellipse', { class: 'scout-foot', cx: -2.8, cy: -.9, rx: 2.4, ry: 1.4 }),
      svg('ellipse', { class: 'scout-foot', cx: 2.8, cy: -.9, rx: 2.4, ry: 1.4 }));
    bob.append(scout);
    climber.append(bob);
    return climber;
  }

  function buildScene() {
    const root = $('#mountain');
    const defs = svg('defs');
    // Hatching marks a ledge where a rope was cut; haze softens the foot of the mountain.
    const hatch = svg('pattern', { id: 'hatch-wrong', width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    hatch.append(svg('rect', { class: 'hatch-bg', width: 4, height: 4 }), svg('rect', { class: 'hatch-fg', width: 1.6, height: 4 }));
    const haze = svg('linearGradient', { id: 'haze', x1: 0, y1: 0, x2: 0, y2: 1 });
    haze.append(svg('stop', { class: 'haze-stop', offset: 0, 'stop-opacity': 0 }), svg('stop', { class: 'haze-stop', offset: 1, 'stop-opacity': .55 }));
    const clip = svg('clipPath', { id: 'mountain-clip' });
    clip.append(svg('path', { d: MOUNTAIN }));
    defs.append(hatch, haze, clip);

    const sky = svg('g');
    for (const [x, y] of [[30, 30], [70, 16], [118, 44], [150, 12], [252, 18], [282, 50], [334, 24], [344, 76], [18, 84], [96, 74], [-40, 40], [-90, 70], [400, 30], [450, 64]]) {
      sky.append(svg('circle', { class: 'star', cx: x, cy: y, r: .9 }));
    }
    sky.append(svg('circle', { class: 'sky-sun', cx: 306, cy: 76, r: 15 }));

    // Far ranges run past both edges, so a wide screen shows more of them, not a gap.
    const far1 = svg('path', { class: 'far-1', d: 'M-240 230 V150 L-190 128 L-150 146 L-100 116 L-60 140 L-20 124 L24 140 L48 152 L78 122 L108 146 L140 128 L180 140 L230 120 L262 132 L298 96 L326 120 L360 104 L392 126 L430 100 L470 130 L520 112 L600 136 V230 Z' });
    const far2 = svg('path', { class: 'far-2', d: 'M-240 230 V190 L-200 172 L-160 186 L-120 164 L-80 182 L-40 170 L0 192 L34 172 L62 186 L96 160 L124 182 L230 176 L268 150 L300 168 L332 140 L360 158 L400 170 L440 150 L490 176 L540 160 L600 180 V230 Z' });
    const backClouds = svg('g', { class: 'drift slow' });
    backClouds.append(cloud(-6, 126, 1.3), cloud(318, 112, 1.1), cloud(-150, 100, 1.2), cloud(450, 92, 1.3));
    const ground = svg('path', { class: 'band-foothills', d: 'M-240 226 Q-150 218 -60 225 T120 224 T300 223 T480 225 T660 222 V240 H-240 Z' });

    // The mountain: bands of colour clipped to its shape, trees and rocks, the shaded east face.
    const body = svg('g', { 'clip-path': 'url(#mountain-clip)' });
    body.append(svg('rect', { class: 'band-foothills', x: -10, y: -10, width: 380, height: 250 }));
    for (const [name, y, amp] of BANDS) body.append(svg('path', { class: 'band-' + name, d: above(y, amp) }));
    for (const [x, y] of [[100, 177], [122, 171], [150, 177], [190, 137], [232, 151], [248, 173], [270, 157]]) {
      body.append(svg('path', { class: 'tree', d: `M${x} ${y - 15} L${x + 4.5} ${y - 8} H${x + 2.5} L${x + 6.5} ${y - 1} H${x - 6.5} L${x - 2.5} ${y - 8} H${x - 4.5} Z` }));
    }
    for (const [x, y] of [[150, 110], [226, 119], [186, 91], [256, 112], [214, 125]]) {
      body.append(svg('path', { class: 'rock', d: `M${x - 6} ${y} L${x - 4} ${y - 5} L${x + 1} ${y - 7} L${x + 6} ${y - 3} L${x + 6} ${y} Z` }));
    }
    body.append(svg('path', { class: 'shade', d: 'M196 24 L212 48 L226 58 L244 86 L262 100 L282 128 L302 146 L324 180 L352 230 L232 230 L222 196 L214 160 L208 120 L203 80 L199 50 Z' }));
    const outline = svg('path', { class: 'outline', d: MOUNTAIN });
    const mist = svg('rect', { class: 'haze', x: -240, y: 196, width: 840, height: 40 });

    // The route: a dotted trail to every ledge, and the rope you've fixed so far.
    const trail = svg('polyline', { class: 'trail', points: points([BASE, ...LEDGE_AT]) });
    const ropeUnder = svg('polyline', { class: 'rope-line rope-under' });
    const ropeOver = svg('polyline', { class: 'rope-line rope-over' });
    const markers = LEDGE_AT.map(([x, y]) => {
      const m = svg('g', { class: 'marker', transform: `translate(${x} ${y})` });
      m.append(svg('circle', { r: 6.5 }), svg('path', { class: 'glyph tick', d: 'M-3 .2 L-.8 2.6 L3.2 -2.4' }), svg('path', { class: 'glyph cross', d: 'M-2.4 -2.4 L2.4 2.4 M2.4 -2.4 L-2.4 2.4' }));
      return m;
    });
    const [px, py] = PEAK;
    const pole = svg('line', { class: 'pole', x1: px, y1: py, x2: px, y2: py - 19 });
    const flag = svg('path', { class: 'flag', d: `M${px} ${py - 19}l13 4.5l-13 4.5z` });
    const halo = svg('circle', { class: 'halo', r: 8 });
    const climber = buildClimber();
    const frontCloud = svg('g', { class: 'drift' });
    frontCloud.append(cloud(266, 44, .8));

    root.append(defs, sky, far1, far2, backClouds, ground, body, outline, mist, trail, ropeUnder, ropeOver, pole, flag, ...markers, halo, climber, frontCloud);
    return { markers, ropeUnder, ropeOver, halo, climber };
  }

  function ropeIcon() {
    const icon = svg('svg', { class: 'rope-icon', viewBox: '0 0 24 24', 'aria-hidden': 'true' });
    const coil = { fill: 'none', 'stroke-linecap': 'round' };
    icon.append(
      svg('ellipse', { ...coil, cx: 11, cy: 11, rx: 8, ry: 6.5, stroke: '#2a2140', 'stroke-width': 4.4 }),
      svg('ellipse', { ...coil, cx: 11, cy: 11, rx: 8, ry: 6.5, stroke: '#f0a95b', 'stroke-width': 2.4 }),
      svg('ellipse', { ...coil, cx: 11, cy: 11, rx: 4, ry: 3, stroke: '#2a2140', 'stroke-width': 4 }),
      svg('ellipse', { ...coil, cx: 11, cy: 11, rx: 4, ry: 3, stroke: '#f0a95b', 'stroke-width': 2 }),
      svg('path', { ...coil, d: 'M17.5 15c2 2 2.6 4.2 1.6 6.8', stroke: '#2a2140', 'stroke-width': 4 }),
      svg('path', { ...coil, d: 'M17.5 15c2 2 2.6 4.2 1.6 6.8', stroke: '#f0a95b', 'stroke-width': 2 }));
    return icon;
  }

  // An embroidered merit badge for the camp a climb finished in.
  function drawBadge(camp) {
    const root = $('#badge');
    const ink = { stroke: '#2a2140', 'stroke-width': 3, 'stroke-linejoin': 'round' };
    const parts = [
      svg('circle', { cx: 64, cy: 64, r: 58, fill: BADGE_FILL[camp], stroke: '#2a2140', 'stroke-width': 5 }),
      svg('circle', { cx: 64, cy: 64, r: 49, fill: 'none', stroke: '#fff', 'stroke-width': 2.5, 'stroke-dasharray': '5 4', opacity: .9 })
    ];
    if (camp === 'Summit') {
      parts.push(
        svg('path', { ...ink, fill: '#fff', d: 'M24 92 L54 40 L66 58 L76 46 L104 92 Z' }),
        svg('line', { ...ink, x1: 54, y1: 40, x2: 54, y2: 20 }),
        svg('path', { ...ink, 'stroke-width': 2.5, fill: '#ff7d3b', d: 'M54 20 l16 6 l-16 6 z' }));
    } else if (camp === 'Ridge') {
      for (const a of [0, 60, 120]) {
        parts.push(svg('line', { x1: 64, y1: 38, x2: 64, y2: 90, stroke: '#2a2140', 'stroke-width': 9, 'stroke-linecap': 'round', transform: `rotate(${a} 64 64)` }));
      }
      for (const a of [0, 60, 120]) {
        parts.push(svg('line', { x1: 64, y1: 38, x2: 64, y2: 90, stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round', transform: `rotate(${a} 64 64)` }));
      }
    } else if (camp === 'Scree') {
      parts.push(
        svg('path', { ...ink, fill: '#d9d2e6', d: 'M30 90 L36 70 L52 62 L62 74 L60 90 Z' }),
        svg('path', { ...ink, fill: '#c3b9d6', d: 'M58 90 L64 66 L82 58 L98 72 L98 90 Z' }),
        svg('path', { ...ink, fill: '#ece7f3', d: 'M48 90 L54 80 L66 78 L70 90 Z' }));
    } else if (camp === 'Treeline') {
      parts.push(
        svg('rect', { ...ink, fill: '#9b6a3e', x: 58, y: 84, width: 12, height: 12 }),
        svg('path', { ...ink, fill: '#2f7a52', d: 'M64 28 L80 54 H72 L88 86 H40 L56 54 H48 Z' }));
    } else {
      parts.push(
        svg('circle', { ...ink, fill: '#fff1a8', cx: 84, cy: 46, r: 10 }),
        svg('path', { ...ink, fill: '#6cbf5a', d: 'M22 92 C34 62 58 60 74 92 Z' }),
        svg('path', { ...ink, fill: '#8fd16f', d: 'M50 92 C64 68 92 66 106 92 Z' }));
    }
    root.replaceChildren(...parts);
    $('#badge-name').textContent = `${camp} badge`;
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
  // Before a pick the two cards differ only by side (the colour of the hold), never by which is real.
  function card(i, side, revealed, just) {
    const ledge = ledges[i];
    const isReal = ledge.realOn === side;
    const entry = isReal ? ledge.real : ledge.fake;
    const line = el('span', 'hw-line');
    line.append(el('span', 'hw', entry.word), el('span', 'pos', entry.pos));
    if (!revealed) {
      const button = el('button', 'card');
      button.type = 'button';
      const hold = svg('svg', { class: `hold hold-${side}`, viewBox: '0 0 30 24', 'aria-hidden': 'true' });
      hold.append(svg('path', { d: side === 'left' ? 'M4 14 C3 7 9 3 15 4 C22 5 27 9 26 15 C25 20 18 22 12 21 C7 20 5 18 4 14 Z' : 'M5 12 C5 6 11 3 16 3 C23 3 27 8 26 13 C25 19 19 21 14 21 C8 21 5 17 5 12 Z' }), svg('circle', { cx: 15, cy: 12.5, r: 2.2 }));
      button.append(hold, line, el('span', 'def', entry.def));
      button.addEventListener('click', () => pick(side));
      return button;
    }
    const node = el('div', `card ${isReal ? 'real' : 'forged'}${just ? ' just' : ''}`);
    if (state.picks[i] === side) {
      node.classList.add('picked');
      node.append(el('span', 'pick-tag', 'Your pick'));
    }
    node.append(el('span', 'stamp', isReal ? 'Real ✓' : 'Forged ✗'), line, el('span', 'def', entry.def), revealBody(entry, isReal));
    return node;
  }

  /* ---------- Drawing ---------- */

  function render(just = false, arrive = false) {
    const m = mode();
    const current = m === 'pick' ? state.picks.length : m === 'reveal' ? state.seen : null;
    renderStatus(m, current, just);
    renderScene(m === 'pick' ? current : null);
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

  function renderStatus(m, current, animate) {
    $('#where').textContent = m === 'end'
      ? (summit() ? `Summit · all ${ledges.length} ledges` : `Out of rope · ledge ${climbed()} of ${ledges.length}`)
      : `Ledge ${current + 1} of ${ledges.length} · ${ledges[current].camp}`;
    setAltitude(climbed() * 1000, animate);
    const left = ropesLeft();
    document.querySelectorAll('#ropes .rope-seg').forEach((r, k) => r.classList.toggle('cut', k >= left));
    $('#ropes').setAttribute('aria-label', `${plural(left, 'rope', 'ropes')} left`);
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

  // A camp's name in big letters over the mountain as you reach it.
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
    if (m === 'end' && summit()) { showTitle('Summit!', `${feet(ledges.length)} · all ${ledges.length} ledges`); return; }
    if (m !== 'pick') return;
    const i = state.picks.length;
    if (!campStarts(i)) return;
    const same = ledges.map((l, j) => l.camp === ledges[i].camp ? j : -1).filter(j => j >= 0);
    const span = same.length > 1 ? `Ledges ${same[0] + 1}–${same[same.length - 1] + 1}` : `Ledge ${same[0] + 1}`;
    showTitle(ledges[i].camp, same.length > 1 ? `${span} · up to ${feet(same[same.length - 1] + 1)}` : `${span} · ${feet(same[0] + 1)}`);
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
    drawBadge(top ? 'Summit' : ledges[Math.max(0, climbed() - 1)].camp);
    $('#verdict').textContent = top ? (wrongs() === 0 ? 'A clean ascent!' : 'Summit reached!') : `Out of rope at ${feet(climbed()).replace(' ', '\u00a0')}`;
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
    announceCamp();
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
    announceCamp();
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

    $('#issue').textContent = `Climb No. ${climb.number}`;
    const narrow = window.matchMedia('(max-width: 719px)').matches;
    $('#dateline').textContent = new Date().toLocaleDateString(undefined, narrow ?
      { weekday: 'short', month: 'short', day: 'numeric' } :
      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    $('#ropes').append(ropeIcon(), ...Array.from({ length: ROPES }, () => el('span', 'rope-seg')));
    scene = buildScene();

    let saved = data && data.state;
    if (!saved) { try { saved = JSON.parse(localStorage.getItem(saveKey)); } catch (_) { saved = null; } }
    state = valid(saved) ? saved : fresh();
    // The rules open for a first visit on a wide screen only; on a phone the deck says enough,
    // and the first ledge stays on the first screen.
    const rules = $('.rules');
    if (rules) rules.open = !narrow && !rulesSeen() && state.picks.length === 0;
    render();
    announceCamp();
    try { window.claude?.hot?.snapshot?.(() => ({ state })); } catch (_) { /* not in a viewer */ }
  }

  if (window.claude?.hot?.ready) window.claude.hot.ready(boot);
  else boot(window.claude?.hot?.data ?? {});
}
