/* Mountweazel prototype: the deduction engine and the page UI.
   check.js and gen.js run the same engine under Node; the UI at the bottom only runs in a browser. */
'use strict';

function eachSubset(n, k, fn) {
  const sel = [];
  (function pick(from) {
    if (sel.length === k) { fn(sel); return; }
    for (let i = from; i <= n - (k - sel.length); i++) { sel.push(i); pick(i + 1); sel.pop(); }
  })(0);
}

function makeEngine(page) {
  const ENTRY = Object.fromEntries(page.entries.map(e => [e.id, e]));
  // Every possible answer: each way of choosing page.fakes entries to be the fakes.
  const ALL = [];
  eachSubset(page.entries.length, page.fakes, sel => ALL.push(new Set(sel.map(i => page.entries[i].id))));

  const count = (ids, fakeSet) => ids.reduce((n, id) => n + (fakeSet.has(id) ? 1 : 0), 0);

  // A note says how many fakes a set of entries holds, or compares two sets.
  function holds(note, fakeSet) {
    if (note.type === 'compare') {
      const a = count(note.a, fakeSet);
      const b = count(note.b, fakeSet);
      return note.rel === 'more' ? a > b : note.rel === 'fewer' ? a < b : a === b;
    }
    return note.fakes.includes(count(note.set, fakeSet));
  }

  function satisfies(fakeSet, known, notes) {
    for (const id in known) if (fakeSet.has(id) !== (known[id] === 'fake')) return false;
    return notes.every(n => holds(n, fakeSet));
  }

  const solutions = (known, notes) => ALL.filter(s => satisfies(s, known, notes));

  // Unresolved entries whose status is the same in every answer the notes still allow.
  function settled(known, notes) {
    const sols = solutions(known, notes);
    const out = {};
    if (!sols.length) return out;
    for (const e of page.entries) {
      if (known[e.id]) continue;
      const fakeIn = sols.reduce((n, s) => n + (s.has(e.id) ? 1 : 0), 0);
      if (fakeIn === sols.length) out[e.id] = 'fake';
      else if (fakeIn === 0) out[e.id] = 'genuine';
    }
    return out;
  }

  const truth = id => (ENTRY[id].fake ? 'fake' : 'genuine');

  // Only what the player can see: notes on entries already resolved as genuine.
  const visibleNotes = known => Object.keys(known)
    .filter(id => known[id] === 'genuine' && page.notes[id])
    .map(id => page.notes[id]);

  function judge(known, id, call) {
    if (call !== truth(id)) return 'mistake';
    return settled(known, visibleNotes(known))[id] === call ? 'proven' : 'hunch';
  }

  // The fewest of `notes` that settle some entry, with every smallest set that does.
  function minStep(known, notes, maxK = 3) {
    for (let k = 0; k <= Math.min(maxK, notes.length); k++) {
      const forced = {};
      const sets = [];
      eachSubset(notes.length, k, sel => {
        const s = settled(known, sel.map(i => notes[i]));
        if (Object.keys(s).length) { Object.assign(forced, s); sets.push(sel.slice()); }
      });
      if (sets.length) return { k, forced, sets };
    }
    return null;
  }

  // Solve from the starting entry; each step settles what the fewest notes can.
  // The profile of k values is the page's difficulty: 1 means one note at a time.
  function profile(keep = () => true) {
    const known = { [page.start]: 'genuine' };
    const steps = [];
    while (Object.keys(known).length < page.entries.length) {
      const notes = visibleNotes(known).filter(keep);
      let step = minStep(known, notes, 3);
      if (!step) {
        const all = settled(known, notes);
        if (!Object.keys(all).length) return { stalled: true, steps };
        step = { k: notes.length, forced: all, sets: [notes.map((_, i) => i)], over: true };
      }
      steps.push({ k: step.k, over: Boolean(step.over), ids: Object.keys(step.forced), sets: step.sets.map(sel => sel.map(i => notes[i])) });
      Object.assign(known, step.forced);
    }
    return { stalled: false, steps };
  }

  return { page, ENTRY, ALL, holds, satisfies, solutions, settled, truth, visibleNotes, judge, minStep, profile };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { eachSubset, makeEngine };

/* ---------- The page ---------- */

if (typeof document !== 'undefined') {
  const MARK = { proven: { glyph: '✓', name: 'Proven' }, hunch: { glyph: '?', name: 'Hunch' }, mistake: { glyph: '✗', name: 'Mistake' } };
  const SHARE = { proven: '✅', hunch: '🟨', mistake: '❌' };
  const CURRENT_KEY = 'mountweazel-current-page';
  const RULES_KEY = 'mountweazel-rules-seen';
  const $ = sel => document.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let E = null;
  let pageIndex = 0;
  let state = null;
  let openId = null;
  let hint = null;
  let resetArmed = null;
  let toastTimer = null;
  let els = {};

  const saveKey = () => 'mountweazel-page-' + E.page.number;
  const fresh = () => ({ known: { [E.page.start]: 'genuine' }, calls: [], suspects: {}, hints: 0, hardcore: false, started: null, finished: null });

  function valid(s) {
    if (!s || typeof s !== 'object' || !s.known || !Array.isArray(s.calls)) return false;
    if (s.known[E.page.start] !== 'genuine') return false;
    if (s.suspects != null && (typeof s.suspects !== 'object' || Object.keys(s.suspects).some(id => !E.ENTRY[id]))) return false;
    return Object.keys(s.known).every(id => E.ENTRY[id] && s.known[id] === E.truth(id)) &&
      s.calls.every(c => E.ENTRY[c.id] && MARK[c.mark]);
  }

  function save() {
    try { localStorage.setItem(saveKey(), JSON.stringify(state)); } catch (_) { /* storage blocked: play on without saving */ }
  }

  const done = () => Object.keys(state.known).length === E.page.entries.length;
  const revealOrder = () => [E.page.start, ...state.calls.map(c => c.id).filter(id => E.truth(id) === 'genuine')];
  const counts = () => state.calls.reduce((n, c) => (n[c.mark]++, n), { proven: 0, hunch: 0, mistake: 0 });
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const upper = id => E.ENTRY[id].word.toUpperCase();
  const signature = () => `${E.page.number}:${state.calls.length}`;
  const listNumbers = ns => ns.length === 1 ? String(ns[0]) : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildSwitcher() {
    const single = PAGES.length < 2;
    $('#editions').hidden = single;
    $('#forecast').hidden = !single;
    const nav = $('#pages');
    nav.replaceChildren(...PAGES.map((p, i) => {
      const b = el('button', 'page-tab', `Page ${p.number} · ${p.level[0].toUpperCase()}${p.level.slice(1)}`);
      b.type = 'button';
      b.addEventListener('click', () => { if (i !== pageIndex) showPage(i); });
      return b;
    }));
  }

  function build() {
    const cols = [$('#col-a'), $('#col-b')];
    cols.forEach(c => c.replaceChildren());
    els = {};
    const entries = E.page.entries;
    const half = Math.ceil(entries.length / 2);
    entries.forEach((e, i) => {
      const art = el('article', 'entry');
      art.id = 'e-' + e.id;

      const main = el('button', 'entry-main');
      main.type = 'button';
      main.id = 'b-' + e.id;
      const line = el('span', 'hw-line');
      line.append(el('span', 'hw', e.word), el('span', 'pos', e.pos));
      if (e.label) line.append(el('span', 'label', e.label));
      const mark = el('span', 'call');
      line.append(mark);
      main.append(line, el('span', 'def', e.def));
      main.addEventListener('click', () => toggle(e.id));

      const actions = el('div', 'actions');
      actions.hidden = true;
      const yes = el('button', 'act act-genuine', 'Genuine');
      const no = el('button', 'act act-fake', 'Fake');
      yes.type = no.type = 'button';
      yes.addEventListener('click', () => call(e.id, 'genuine'));
      no.addEventListener('click', () => call(e.id, 'fake'));
      actions.append(yes, no);

      const reveal = el('div', 'reveal');
      reveal.hidden = true;
      const proof = el('span', 'proofmark');
      proof.setAttribute('aria-hidden', 'true');
      const sus = el('button', 'suspect');
      sus.type = 'button';
      sus.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="6.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14.6 14.6 20.5 20.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
      sus.addEventListener('click', () => toggleSuspect(e.id));

      art.append(proof, sus, main, actions, reveal);
      cols[i < half ? 0 : 1].append(art);
      els[e.id] = { art, main, actions, reveal, mark, proof, yes, sus };
    });

    $('#head-first').textContent = entries[0].word;
    $('#head-last').textContent = entries[entries.length - 1].word;
    $('#head-mid').textContent = `${E.page.letters} · ${E.page.number}`;
    $('#issue').textContent = `Vol. I · No. ${E.page.number}`;
    $('#ear-count').textContent = `${entries.length} entries, ${E.page.fakes} of them forged`;
    const narrow = window.matchMedia('(max-width: 719px)').matches;
    $('#dateline').textContent = new Date().toLocaleDateString(undefined, narrow ?
      { weekday: 'short', month: 'short', day: 'numeric' } :
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    $('#howto-fakes').textContent = E.page.fakes;
    $('#howto-entries').textContent = entries.length;
    $('#start-word').textContent = E.ENTRY[E.page.start].word;
    document.querySelectorAll('.slots').forEach(box =>
      box.replaceChildren(...Array.from({ length: E.page.fakes }, () => el('span', 'slot'))));
  }

  function fillReveal(e) {
    const box = els[e.id].reveal;
    box.replaceChildren();
    if (e.fake) {
      const p = el('p', 'anatomy');
      p.append(el('span', 'tag', 'Mountweazel'), document.createTextNode(e.anatomy));
      box.append(p);
      return;
    }
    // The note comes first: it's what the puzzle needs. On a phone the history waits behind a button.
    const n = el('p', 'note');
    const tag = el('span', 'note-tag', 'Note');
    n.append(tag, document.createTextNode(E.page.notes[e.id].text));
    const more = el('div', 'history-block');
    more.append(el('p', 'history', e.history));
    if (e.quote) {
      const q = el('blockquote', 'quote');
      q.append(el('span', 'q-text', `“${e.quote.text}”`), el('cite', null, e.quote.cite));
      more.append(q);
    }
    const toggleHistory = el('button', 'history-toggle', 'History');
    toggleHistory.type = 'button';
    toggleHistory.addEventListener('click', () => { els[e.id].showHistory = !els[e.id].showHistory; render(); });
    box.append(n, toggleHistory, more);
    Object.assign(els[e.id], { note: n, noteTag: tag, toggleHistory });
  }

  function render() {
    if (hint && hint.sig !== signature()) hint = null;
    const byCall = Object.fromEntries(state.calls.map(c => [c.id, c]));
    for (const e of E.page.entries) {
      const x = els[e.id];
      const status = state.known[e.id];
      const isOpen = openId === e.id && !status;
      const hinted = hint && hint.stage === 2 && hint.target === e.id && !status;
      const suspected = !status && Boolean(state.suspects[e.id]);
      x.art.className = 'entry' + (status ? ' ' + status : '') + (e.id === E.page.start ? ' start' : '') +
        (isOpen ? ' open' : '') + (hinted ? ' hinted' : '') + (suspected ? ' suspected' : '') +
        (status && x.showHistory ? ' show-history' : '');
      if (x.toggleHistory) {
        x.toggleHistory.textContent = x.showHistory ? 'Hide history' : 'History';
        x.toggleHistory.setAttribute('aria-expanded', String(Boolean(x.showHistory)));
      }
      x.sus.hidden = Boolean(status);
      x.sus.setAttribute('aria-pressed', String(suspected));
      x.sus.setAttribute('aria-label', `${suspected ? 'Unmark' : 'Mark'} ${e.word} as a suspect`);
      x.sus.title = suspected ? 'Suspect (tap to unmark)' : 'Mark as a suspect';
      x.main.setAttribute('aria-expanded', String(isOpen));
      x.main.setAttribute('aria-disabled', String(Boolean(status)));
      x.actions.hidden = !isOpen;
      x.proof.textContent = status === 'genuine' ? 'stet' : status === 'fake' ? 'dele' : '';
      const c = byCall[e.id];
      x.mark.className = 'call' + (c ? ' ' + c.mark : '');
      x.mark.textContent = c ? MARK[c.mark].glyph : '';
      x.mark.title = c ? MARK[c.mark].name : '';
      if (c) x.mark.setAttribute('aria-label', MARK[c.mark].name); else x.mark.removeAttribute('aria-label');
      if (status && x.reveal.hidden) { fillReveal(e); x.reveal.hidden = false; }
      if (!status && !x.reveal.hidden) { x.reveal.hidden = true; x.reveal.replaceChildren(); }
    }

    // Notes, numbered in the order they were revealed.
    const order = revealOrder();
    const hintedNotes = new Set(hint ? hint.notes : []);
    $('#notes').replaceChildren(...order.map((id, i) => {
      const li = el('li', [i === order.length - 1 && order.length > 1 ? 'fresh' : '', hintedNotes.has(i + 1) ? 'hinted' : ''].join(' ').trim() || null);
      const a = el('a', 'src', E.ENTRY[id].word);
      a.href = '#e-' + id;
      li.append(a, document.createTextNode(' ' + E.page.notes[id].text));
      return li;
    }));
    $('#note-count').textContent = order.length;
    $('#dock-note-count').textContent = order.length;
    // The same numbers on the notes inside the entries, so a hint works without the list.
    order.forEach((id, i) => {
      const x = els[id];
      if (!x.noteTag) return;
      x.noteTag.textContent = `Note ${i + 1}`;
      x.note.classList.toggle('hinted', hintedNotes.has(i + 1));
    });

    // Progress.
    const struck = Object.values(state.known).filter(s => s === 'fake').length;
    document.querySelectorAll('.slots').forEach(box =>
      [...box.children].forEach((s, i) => s.classList.toggle('on', i < struck)));
    $('#struck').textContent = `${struck} of ${E.page.fakes} struck`;
    $('#dock-struck').textContent = `${struck} of ${E.page.fakes} struck`;
    const n = counts();
    $('#calls').replaceChildren(...state.calls.map(c => {
      const g = el('span', 'call ' + c.mark, MARK[c.mark].glyph);
      g.title = `${E.ENTRY[c.id].word}: ${MARK[c.mark].name}`;
      return g;
    }));
    $('#calls-empty').hidden = state.calls.length > 0;
    const nSus = Object.keys(state.suspects).filter(id => !state.known[id]).length;
    $('#tally').textContent = `${plural(n.hunch, 'hunch', 'hunches')} · ${plural(n.mistake, 'mistake', 'mistakes')} · ${plural(state.hints, 'hint', 'hints')} · ${plural(nSus, 'suspect', 'suspects')}`;
    $('#hardcore').checked = Boolean(state.hardcore);
    document.querySelectorAll('.page-tab').forEach((b, i) => b.setAttribute('aria-pressed', String(i === pageIndex)));

    const finished = done();
    $('#play-panel').hidden = finished;
    $('#press').hidden = !finished;
    $('#dock').hidden = finished;
    if (finished) {
      $('#verdict').textContent = n.hunch === 0 && n.mistake === 0 ? 'Clean proof.' : 'Ready for press.';
      const secs = state.started && state.finished ? Math.max(0, Math.round((state.finished - state.started) / 1000)) : null;
      $('#press-stats').textContent = `${n.proven} proven · ${plural(n.hunch, 'hunch', 'hunches')} · ${plural(n.mistake, 'mistake', 'mistakes')} · ${plural(state.hints, 'hint', 'hints')}` +
        (secs != null ? ` · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : '');
      $('#share-text').value = shareText();
    }
  }

  function startClock() {
    if (!state.started) state.started = Date.now();
  }

  function toggle(id) {
    if (state.known[id]) return;
    startClock();
    openId = openId === id ? null : id;
    render();
    if (openId) els[id].yes.focus({ preventScroll: true });
  }

  function call(id, verdict) {
    if (state.known[id]) return;
    startClock();
    const proof = E.settled(state.known, E.visibleNotes(state.known))[id];
    if (state.hardcore && !proof) {
      toast('Not proven yet. Hardcore only accepts calls your notes prove.');
      return;
    }
    const mark = E.judge(state.known, id, verdict);
    state.known[id] = E.truth(id);
    state.calls.push({ id, mark });
    delete state.suspects[id];
    markRulesSeen();
    openId = null;
    if (done()) state.finished = Date.now();
    save();
    render();
    els[id].art.classList.add('just');
    setTimeout(() => els[id].art.classList.remove('just'), 700);
    els[id].main.focus({ preventScroll: true });
    toast(message(id, verdict, mark));
    if (done()) $('#press').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }

  function toggleSuspect(id) {
    if (state.known[id]) return;
    startClock();
    if (state.suspects[id]) delete state.suspects[id];
    else state.suspects[id] = true;
    save();
    render();
  }

  function message(id, verdict, mark) {
    const w = upper(id);
    if (mark === 'proven') return verdict === 'genuine' ? `Stet. Your notes proved ${w} genuine.` : `Struck. Your notes proved ${w} a fake.`;
    if (mark === 'hunch') return `Right about ${w}, but it was a hunch: your notes didn’t prove it yet.`;
    return E.truth(id) === 'genuine' ? `Wrong: ${w} is genuine. Its note is yours anyway.` : `Wrong: ${w} is a fake.`;
  }

  // First press: which notes to read together. Second press: the entry they settle.
  function giveHint() {
    if (done()) return;
    startClock();
    if (!hint) {
      const notes = revealOrder().map(id => E.page.notes[id]);
      const step = E.minStep(state.known, notes, 3) || { sets: [notes.map((_, i) => i)] };
      const sel = step.sets[0];
      const settles = E.settled(state.known, sel.map(i => notes[i]));
      const target = E.page.entries.find(e => settles[e.id]);
      if (!target) { toast('Nothing is provable from your notes yet.'); return; }
      hint = { sig: signature(), stage: 1, notes: sel.map(i => i + 1), target: target.id };
      state.hints++;
      save();
      render();
      toast(sel.length === 0 ? 'The number of fakes left settles an entry by itself.' :
        sel.length === 1 ? `Note ${sel[0] + 1} settles an entry by itself.` :
        `Read notes ${listNumbers(hint.notes)} together.`);
      return;
    }
    if (hint.stage === 1) {
      hint.stage = 2;
      state.hints++;
      save();
      render();
      els[hint.target].art.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
    const which = hint.notes.length === 0 ? 'The number of fakes left settles' :
      hint.notes.length === 1 ? `Note ${hint.notes[0]} settles` : `Notes ${listNumbers(hint.notes)} settle`;
    toast(`${which} ${upper(hint.target)}.`);
  }

  function reset(ev) {
    const btn = ev.currentTarget;
    if (resetArmed !== btn) {
      resetArmed = btn;
      btn.dataset.label = btn.textContent;
      btn.textContent = 'Tap again to start over';
      setTimeout(() => {
        if (resetArmed === btn) { resetArmed = null; btn.textContent = btn.dataset.label; }
      }, 3000);
      return;
    }
    resetArmed = null;
    btn.textContent = btn.dataset.label;
    const hardcore = state.hardcore;
    state = fresh();
    state.hardcore = hardcore;
    openId = hint = null;
    for (const id in els) { els[id].reveal.hidden = true; els[id].reveal.replaceChildren(); els[id].showHistory = false; }
    save();
    render();
    toast(`Fresh proof. ${upper(E.page.start)} is verified for you to start.`);
  }

  function shareText() {
    const n = counts();
    const line = n.hunch === 0 && n.mistake === 0 ? 'Clean proof' :
      `${n.proven} proven · ${plural(n.hunch, 'hunch', 'hunches')} · ${plural(n.mistake, 'mistake', 'mistakes')}`;
    const hints = state.hints ? ` · ${plural(state.hints, 'hint', 'hints')}` : '';
    return `Mountweazel · Page ${E.page.number}\n${state.calls.map(c => SHARE[c.mark]).join('')}\n${line}${hints}`;
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

  function showPage(i, savedState) {
    if (state && E) save();
    pageIndex = Math.max(0, Math.min(PAGES.length - 1, i));
    E = makeEngine(PAGES[pageIndex]);
    openId = null;
    hint = null;
    let saved = savedState;
    if (!saved) { try { saved = JSON.parse(localStorage.getItem(saveKey())); } catch (_) { saved = null; } }
    state = valid(saved) ? saved : fresh();
    if (!state.suspects) state.suspects = {};
    // The rules open for a first visit only; once you've made a call they stay folded.
    const rules = document.querySelector('.rules');
    if (rules) rules.open = !rulesSeen() && state.calls.length === 0;
    try { localStorage.setItem(CURRENT_KEY, String(pageIndex)); } catch (_) { /* fine */ }
    build();
    render();
  }

  function rulesSeen() {
    try { return localStorage.getItem(RULES_KEY) === '1'; } catch (_) { return false; }
  }

  function markRulesSeen() {
    try { localStorage.setItem(RULES_KEY, '1'); } catch (_) { /* fine */ }
  }

  function boot(data) {
    buildSwitcher();
    $('#hint').addEventListener('click', giveHint);
    $('#dock-hint').addEventListener('click', giveHint);
    $('#dock-notes').addEventListener('click', () =>
      $('#notes-panel').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }));
    $('#reset').addEventListener('click', reset);
    $('#reset-2').addEventListener('click', reset);
    $('#hardcore').addEventListener('change', ev => { state.hardcore = ev.target.checked; save(); });
    $('#copy').addEventListener('click', copyShare);

    let start = data && Number.isInteger(data.page) ? data.page : null;
    if (start == null) { try { const v = localStorage.getItem(CURRENT_KEY); if (v != null) start = Number(v); } catch (_) { /* fine */ } }
    if (start == null || Number.isNaN(start)) start = PAGES.length - 1;
    showPage(start, data && data.page === start ? data.state : null);
    try { window.claude?.hot?.snapshot?.(() => ({ page: pageIndex, state })); } catch (_) { /* not in a viewer */ }
  }

  if (window.claude?.hot?.ready) window.claude.hot.ready(boot);
  else boot(window.claude?.hot?.data ?? {});
}
