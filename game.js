/* Mountweazel: a word puzzle in the newspaper, played as its editor. Every entry on today's word
   page reaches the desk as two proofs, one real and one forged. Send the real word to press; a forgery
   goes to press as an erratum, and the third erratum pulls the page. The words are in pages.js. */
'use strict';

if (typeof document !== 'undefined') {
  const ERRATA = 3;
  const RULES_KEY = 'mountweazel-page-rules-seen';
  const $ = sel => document.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const page = PAGES[PAGES.length - 1];
  const entries = page.entries;
  const saveKey = 'mountweazel-page-' + page.number;

  // picks: the proof picked for each entry so far. seen: how many of those reveals you've moved on from.
  let state = null;
  let resetArmed = null;
  let toastTimer = null;
  // The word page: one slot per entry and a heading per band, built once and updated in place.
  const slotEls = [];
  const bandHeads = {};
  let nextBar, nextBtn, verdictLine, slotList;

  const fresh = () => ({ picks: [], seen: 0 });
  const upper = w => w.toUpperCase();
  const errataText = n => n === 0 ? 'no errata' : n === 1 ? '1 erratum' : `${n} errata`;
  const rightAt = i => state.picks[i] === entries[i].realOn;
  const errata = () => state.picks.filter((p, i) => p !== entries[i].realOn).length;
  const pulled = () => errata() >= ERRATA;
  const complete = () => state.picks.length === entries.length && !pulled();
  const over = () => pulled() || state.picks.length === entries.length;
  const mode = () => state.picks.length > state.seen ? 'reveal' : over() ? 'end' : 'pick';
  const bandStarts = i => i === 0 || entries[i].band !== entries[i - 1].band;
  const bandSpan = band => {
    const js = entries.map((e, j) => e.band === band ? j + 1 : 0).filter(Boolean);
    return js.length > 1 ? `Entries ${js[0]}–${js[js.length - 1]}` : `Entry ${js[0]}`;
  };

  function valid(s) {
    if (!s || typeof s !== 'object' || !Array.isArray(s.picks) || !Number.isInteger(s.seen)) return false;
    if (s.picks.length > entries.length || !s.picks.every(p => p === 'left' || p === 'right')) return false;
    if (s.seen < s.picks.length - 1 || s.seen > s.picks.length) return false;
    // Nothing may be picked after the page was pulled.
    let wrong = 0;
    for (let i = 0; i < s.picks.length; i++) {
      if (wrong >= ERRATA) return false;
      if (s.picks[i] !== entries[i].realOn) wrong++;
    }
    return true;
  }

  function save() {
    try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch (_) { /* storage blocked: play on without saving */ }
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

  // A proof is a button until it's picked, then a revealed entry, marked real or forged.
  // Before a pick the two proofs differ only by side (A or B), never by which is real.
  function card(i, side, revealed, just) {
    const e = entries[i];
    const isReal = e.realOn === side;
    const entry = isReal ? e.real : e.fake;
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
    nextBtn = $('#next-proof');
    verdictLine = $('#verdict-line');
    entries.forEach((e, i) => {
      if (bandStarts(i)) {
        const head = el('li', 'band-head');
        head.append(el('span', 'bh-name', e.band), el('span', 'bh-sub', bandSpan(e.band)));
        bandHeads[e.band] = { el: head, first: i };
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
    const e = entries[i];
    slot.className = 'slot ' + kind;
    slot.replaceChildren();
    if (kind === 'unset') {
      slot.append(el('span', 'slot-n', `Entry ${i + 1}`), el('span', 'slot-note', 'To be set'));
      return;
    }
    if (kind === 'frontier' || kind === 'reveal') {
      const head = el('h3', 'slot-head', kind === 'frontier' ? 'Which goes to press?' : `Entry ${i + 1}, revealed`);
      head.append(el('span', 'sh-sub', kind === 'frontier' ? `Entry ${i + 1} of ${entries.length}` : e.band));
      if (kind === 'frontier') head.id = 'prompt';
      const pair = el('div', 'pair' + (arrive && !reduceMotion ? ' arrive' : ''));
      pair.id = 'pair';
      const revealed = kind === 'reveal';
      pair.append(card(i, 'left', revealed, just), card(i, 'right', revealed, just));
      slot.append(head, pair);
      return;
    }
    // Set (or, once the page is pulled, never set): the real entry in type, the forgery struck out.
    const result = kind === 'unreached' ? 'unreached' : (rightAt(i) ? 'right' : 'wrong');
    slot.classList.add(result);
    if (typeset && !reduceMotion) slot.classList.add('typeset');
    const mark = el('span', 'slot-mark', { right: '✓', wrong: '✗', unreached: '·' }[result]);
    mark.setAttribute('aria-hidden', 'true');
    const body = el('div', 'set-entries');
    const real = el('p', 'set-entry real');
    real.append(el('span', 'sr-only', { right: 'Right: ', wrong: 'Erratum: ', unreached: 'Not set: ' }[result]),
      el('b', 'hw', e.real.word), ' ', el('i', 'pos', e.real.pos), ' ', el('span', 'def', e.real.def), el('span', 'proof real', 'real'));
    const fake = el('p', 'set-entry forged');
    fake.append(el('b', 'hw', e.fake.word), ' ', el('i', 'pos', e.fake.pos), ' ', el('span', 'def', e.fake.def), el('span', 'proof forged', 'forged'));
    body.append(real, fake);
    if (result === 'wrong') body.append(el('p', 'erratum', `Erratum: ${upper(e.fake.word)} went to press in error.`));
    if (result === 'unreached') body.append(el('p', 'unset-note', 'Not set: the page was pulled.'));
    const more = el('details', 'more');
    more.append(el('summary', null, 'History'), revealBody(e.real, true), revealBody(e.fake, false));
    body.append(more);
    slot.append(mark, body);
  }

  // Redraws only the slots whose state changed, so an open History stays open.
  function renderPage(m, just, arrive) {
    for (let i = 0; i < entries.length; i++) {
      const kind = slotKind(i);
      const key = `${kind}:${state.picks[i] || ''}`;
      const slot = slotEls[i];
      if (slot.dataset.key === key) continue;
      const was = slot.dataset.key || '';
      slot.dataset.key = key;
      fillSlot(i, kind, { just: just && kind === 'reveal', typeset: arrive && kind === 'set' && was.startsWith('reveal'), arrive: arrive && kind === 'frontier' });
    }
    const reach = m === 'pick' ? state.picks.length : m === 'reveal' ? state.seen : state.picks.length - 1;
    for (const { el: head, first } of Object.values(bandHeads)) head.classList.toggle('ahead', first > reach);
    // The verdict and Next proof travel with the entry being revealed.
    if (m === 'reveal') {
      const slot = slotEls[state.seen];
      if (nextBar.parentNode !== slot) slot.append(nextBar);
      nextBar.hidden = false;
    } else {
      if (nextBar.previousElementSibling !== slotList) slotList.after(nextBar);
      nextBar.hidden = true;
    }
    $('#set-count').textContent = `${Math.min(state.seen, entries.length)} of ${entries.length} set`;
  }

  /* ---------- Drawing ---------- */

  function render(just = false, arrive = false) {
    const m = mode();
    const current = m === 'pick' ? state.picks.length : m === 'reveal' ? state.seen : null;
    renderStatus(m, current);
    renderPage(m, just, arrive);
    if (m === 'reveal') renderVerdict(state.seen);
    $('#press').hidden = m !== 'end';
    if (m === 'end') renderEnd();
  }

  function renderStatus(m, current) {
    // The band half drops out on phones, where every band has its own heading on the page.
    const [main, extra] = m === 'end'
      ? (complete() ? ['Page complete', ` · ${errataText(errata())}`] : ['Page pulled', ` · at entry ${state.picks.length}`])
      : [`Entry ${current + 1} of ${entries.length}`, ` · ${entries[current].band}`];
    $('#where').replaceChildren(el('span', 'w-main', main), el('span', 'w-extra', extra));
    const n = errata();
    document.querySelectorAll('#errata .erratum-box').forEach((b, k) => b.classList.toggle('struck', k < n));
    $('#errata').setAttribute('aria-label', `${n} of ${ERRATA} errata`);
  }

  // A band's heading lights up on the word page as you reach it.
  function announceBand() {
    if (mode() !== 'pick' || reduceMotion) return;
    const i = state.picks.length;
    if (!bandStarts(i)) return;
    const head = bandHeads[entries[i].band].el;
    head.classList.remove('arrived');
    void head.offsetWidth;
    head.classList.add('arrived');
  }

  function renderVerdict(i) {
    const e = entries[i];
    const right = rightAt(i);
    const n = errata();
    verdictLine.className = 'verdict-line ' + (right ? 'right' : 'wrong');
    if (right) verdictLine.textContent = complete()
      ? `Right: ${upper(e.real.word)} is real. Your page is ready for press.`
      : `Right: ${upper(e.real.word)} is real, and goes to press.`;
    else if (pulled()) verdictLine.textContent = `${upper(e.fake.word)} was the forgery: erratum ${n} of ${ERRATA}, and your page is pulled.`;
    else if (complete()) verdictLine.textContent = `${upper(e.fake.word)} was the forgery: erratum ${n} of ${ERRATA}, but your page is ready for press.`;
    else verdictLine.textContent = `${upper(e.fake.word)} was the forgery, and it went to press: erratum ${n} of ${ERRATA}.`;
    nextBtn.textContent = over() ? 'See the page' : 'Next proof';
  }

  function renderEnd() {
    const n = errata();
    const done = complete();
    const stamp = $('#press-stamp');
    stamp.textContent = done ? 'Passed for press' : 'Pulled';
    stamp.className = 'press-stamp ' + (done ? 'pass' : 'pulled');
    $('#verdict').textContent = done ? (n === 0 ? 'A Clean Page' : 'Your Page Goes to Press') : `Your Page Is Pulled at Entry ${state.picks.length}`;
    $('#press-stats').textContent = done
      ? `You set all ${entries.length} entries, with ${errataText(n)}.`
      : `You set ${state.picks.length > ERRATA ? `${state.picks.length - ERRATA} of ${entries.length} entries` : 'no entries'} clean before the third erratum, at entry ${state.picks.length}.`;
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
    nextBtn.focus({ preventScroll: true });
  }

  function nextProof() {
    if (mode() !== 'reveal') return;
    state.seen = state.picks.length;
    save();
    render(false, true);
    const behavior = reduceMotion ? 'auto' : 'smooth';
    if (mode() === 'pick') {
      // Show the entry just set, with the next entry's proofs beneath it, below the running head.
      const set = slotEls[state.picks.length - 1];
      const slot = slotEls[state.picks.length];
      const top = set.getBoundingClientRect().top;
      if (top < $('#runhead').offsetHeight || slot.getBoundingClientRect().bottom > innerHeight) set.scrollIntoView({ behavior, block: 'start' });
      announceBand();
      slot.querySelector('.card').focus({ preventScroll: true });
    } else {
      $('#press').scrollIntoView({ behavior, block: 'start' });
      $('#verdict').focus({ preventScroll: true });
    }
  }

  function reset() {
    if (!resetArmed) {
      resetArmed = setTimeout(() => { resetArmed = null; }, 4000);
      toast('Press Start over again to clear the page.');
      return;
    }
    clearTimeout(resetArmed);
    resetArmed = null;
    state = fresh();
    save();
    render(false, true);
    $('#page').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    announceBand();
    toast('A blank page.');
  }

  function onKey(ev) {
    if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.target.closest && ev.target.closest('textarea, input, select, summary, [contenteditable]')) return;
    if (mode() !== 'pick') return;
    if (ev.key === 'ArrowLeft' || ev.key === '1') { ev.preventDefault(); pick('left'); }
    else if (ev.key === 'ArrowRight' || ev.key === '2') { ev.preventDefault(); pick('right'); }
  }

  function shareText() {
    const grid = entries.map((_, i) => i < state.picks.length ? (rightAt(i) ? '🟩' : '🟥') : '⬜').join('');
    const n = errata();
    const line = complete() ? (n === 0 ? 'A clean page' : `To press with ${errataText(n)}`) : `Pulled at entry ${state.picks.length}`;
    return `Mountweazel · No. ${page.number}\n${grid}\n${line}`;
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
    nextBtn.addEventListener('click', nextProof);
    $('#copy').addEventListener('click', copyShare);
    $('#reset').addEventListener('click', reset);
    document.addEventListener('keydown', onKey);

    $('#issue').textContent = `Vol. I · No. ${page.number}`;
    const narrow = window.matchMedia('(max-width: 719px)').matches;
    $('#dateline').textContent = new Date().toLocaleDateString(undefined, narrow ?
      { weekday: 'short', month: 'short', day: 'numeric' } :
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    $('#errata').append(...Array.from({ length: ERRATA }, () => el('span', 'erratum-box')));
    measureRunhead();
    window.addEventListener('resize', measureRunhead);

    let saved = data && data.state;
    if (!saved) { try { saved = JSON.parse(localStorage.getItem(saveKey)); } catch (_) { saved = null; } }
    state = valid(saved) ? saved : fresh();
    // The rules open for a first visit on a wide screen only; on a phone the deck says enough,
    // and the first entry's proofs stay on the first screen.
    const rules = $('.rules');
    if (rules) rules.open = !narrow && !rulesSeen() && state.picks.length === 0;
    render();
    announceBand();
    try { window.claude?.hot?.snapshot?.(() => ({ state })); } catch (_) { /* not in a viewer */ }
  }

  if (window.claude?.hot?.ready) window.claude.hot.ready(boot);
  else boot(window.claude?.hot?.data ?? {});
}
