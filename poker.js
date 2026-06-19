/* Texas Hold'em — hand engine & interactive tools */

const RANK_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
const RANK_CHARS = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const SUITS = ['s', 'h', 'd', 'c'];
const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUIT_COLORS = { s: 'black', h: 'red', d: 'red', c: 'black' };

const HAND_NAMES = [
  'High Card', 'One Pair', 'Two Pair', 'Three of a Kind',
  'Straight', 'Flush', 'Full House', 'Four of a Kind',
  'Straight Flush', 'Royal Flush'
];

const ODDS_DATA = [
  { rank: 1, name: 'Royal Flush', prob: '0.0032%', odds: '1 in 30,940' },
  { rank: 2, name: 'Straight Flush', prob: '0.0279%', odds: '1 in 3,589' },
  { rank: 3, name: 'Four of a Kind', prob: '0.168%', odds: '1 in 595' },
  { rank: 4, name: 'Full House', prob: '2.60%', odds: '1 in 38.5' },
  { rank: 5, name: 'Flush', prob: '3.03%', odds: '1 in 33' },
  { rank: 6, name: 'Straight', prob: '4.62%', odds: '1 in 21.6' },
  { rank: 7, name: 'Three of a Kind', prob: '4.83%', odds: '1 in 20.7' },
  { rank: 8, name: 'Two Pair', prob: '23.5%', odds: '1 in 4.25' },
  { rank: 9, name: 'One Pair', prob: '43.8%', odds: '1 in 2.28' },
  { rank: 10, name: 'High Card', prob: '17.4%', odds: '1 in 5.74' }
];

const OUTS_DATA = [
  { draw: 'Flush draw (9 outs)', turn: '19.1%', river: '19.6%', both: '35.0%' },
  { draw: 'Open-ended straight (8 outs)', turn: '17.0%', river: '17.4%', both: '31.5%' },
  { draw: 'Gutshot straight (4 outs)', turn: '8.5%', river: '8.7%', both: '16.5%' },
  { draw: 'Two overcards (6 outs)', turn: '12.8%', river: '13.0%', both: '24.1%' },
  { draw: 'Set to full house (7 outs)', turn: '14.9%', river: '15.2%', both: '27.8%' }
];

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const [char, value] of Object.entries(RANK_VALUES)) {
      deck.push(createCard(char, suit, value));
    }
  }
  return deck;
}

function createCard(rankChar, suit, rankValue) {
  const label = rankChar === 'T' ? '10' : rankChar;
  return {
    id: rankChar + suit,
    rankChar,
    rank: rankValue,
    suit,
    label,
    color: SUIT_COLORS[suit]
  };
}

function parseCardInput(input) {
  const raw = input.trim().toUpperCase();
  if (!raw) return null;
  let rankChar, suit;
  if (raw.startsWith('10')) {
    rankChar = 'T';
    suit = raw.slice(2).toLowerCase();
  } else {
    rankChar = raw[0];
    suit = raw.slice(1).toLowerCase();
  }
  if (!RANK_VALUES[rankChar] || !SUITS.includes(suit)) return null;
  return createCard(rankChar, suit, RANK_VALUES[rankChar]);
}

function combinations(arr, k) {
  const result = [];
  function helper(start, combo) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i <= arr.length - (k - combo.length); i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return result;
}

function straightHigh(ranks) {
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  if (unique.length < 5) return null;
  for (let i = 0; i <= unique.length - 5; i++) {
    let ok = true;
    for (let j = 1; j < 5; j++) {
      if (unique[i + j] !== unique[i] - j) {
        ok = false;
        break;
      }
    }
    if (ok) return unique[i];
  }
  if ([14, 5, 4, 3, 2].every(v => unique.includes(v))) return 5;
  return null;
}

function evaluateFive(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const flush = cards.every(c => c.suit === cards[0].suit);
  const sh = straightHigh(ranks);

  const counts = new Map();
  ranks.forEach(r => counts.set(r, (counts.get(r) || 0) + 1));
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  const royal = flush && sh === 14 && [14, 13, 12, 11, 10].every(v => ranks.includes(v));
  if (royal) return { category: 9, name: 'Royal Flush', kickers: [14], cards };
  if (flush && sh) return { category: 8, name: 'Straight Flush', kickers: [sh], cards };
  if (groups[0][1] === 4) return { category: 7, name: 'Four of a Kind', kickers: [groups[0][0], groups[1][0]], cards };
  if (groups[0][1] === 3 && groups[1][1] === 2) return { category: 6, name: 'Full House', kickers: [groups[0][0], groups[1][0]], cards };
  if (flush) return { category: 5, name: 'Flush', kickers: ranks, cards };
  if (sh) return { category: 4, name: 'Straight', kickers: [sh], cards };
  if (groups[0][1] === 3) {
    const kickers = ranks.filter(r => r !== groups[0][0]).sort((a, b) => b - a);
    return { category: 3, name: 'Three of a Kind', kickers: [groups[0][0], ...kickers], cards };
  }
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const hi = Math.max(groups[0][0], groups[1][0]);
    const lo = Math.min(groups[0][0], groups[1][0]);
    const kicker = ranks.find(r => r !== hi && r !== lo);
    return { category: 2, name: 'Two Pair', kickers: [hi, lo, kicker], cards };
  }
  if (groups[0][1] === 2) {
    const kickers = ranks.filter(r => r !== groups[0][0]).sort((a, b) => b - a);
    return { category: 1, name: 'One Pair', kickers: [groups[0][0], ...kickers], cards };
  }
  return { category: 0, name: 'High Card', kickers: ranks, cards };
}

function compareEval(a, b) {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const diff = (a.kickers[i] || 0) - (b.kickers[i] || 0);
    if (diff) return diff;
  }
  return 0;
}

function bestHand(cards) {
  if (cards.length < 5) return null;
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const ev = evaluateFive(combo);
    if (!best || compareEval(ev, best) > 0) best = ev;
  }
  return best;
}

function rankLabel(value) {
  return RANK_CHARS[value] || String(value);
}

function describeTiebreak(ev) {
  const k = ev.kickers.map(rankLabel);
  switch (ev.category) {
    case 9: return 'Ace-high royal flush';
    case 8: return `${rankLabel(ev.kickers[0])}-high straight flush`;
    case 7: return `Quad ${k[0]}s with ${k[1]} kicker`;
    case 6: return `${k[0]}s full of ${k[1]}s`;
    case 5: return `${k[0]}-high flush`;
    case 4: return ev.kickers[0] === 5 ? 'Five-high straight (the wheel)' : `${rankLabel(ev.kickers[0])}-high straight`;
    case 3: return `Trip ${k[0]}s`;
    case 2: return `${k[0]}s and ${k[1]}s`;
    case 1: return `Pair of ${k[0]}s`;
    default: return `${k[0]}-high`;
  }
}

function comparePlayers(hole1, hole2, board) {
  const all1 = [...hole1, ...board];
  const all2 = [...hole2, ...board];
  const hand1 = bestHand(all1);
  const hand2 = bestHand(all2);
  if (!hand1 || !hand2) return null;

  const cmp = compareEval(hand1, hand2);
  let verdict, detail;

  if (cmp > 0) {
    verdict = 'Player 1 wins';
    detail = `${hand1.name} beats ${hand2.name.toLowerCase()}. ${describeTiebreak(hand1)} vs ${describeTiebreak(hand2)}.`;
  } else if (cmp < 0) {
    verdict = 'Player 2 wins';
    detail = `${hand2.name} beats ${hand1.name.toLowerCase()}. ${describeTiebreak(hand2)} vs ${describeTiebreak(hand1)}.`;
  } else {
    verdict = 'Split pot';
    detail = `Both players have ${hand1.name.toLowerCase()} — ${describeTiebreak(hand1)}.`;
  }

  return { hand1, hand2, cmp, verdict, detail, all1, all2 };
}

function cardDisplay(card, { highlight = false, mini = false } = {}) {
  const el = document.createElement('span');
  el.className = `card ${card.color}${highlight ? ' highlight' : ''}${mini ? ' mini' : ''}`;
  el.innerHTML = `
    <span class="card-rank ${card.color}">${card.label}</span>
    <span class="card-suit ${card.color}">${SUIT_SYMBOLS[card.suit]}</span>
    <span class="card-rank-bottom ${card.color}">${card.label}</span>
  `;
  return el;
}

function cardEl(card, { highlight = false, mini = false, picker = false, selected = false, used = false } = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `card ${card.color}${highlight ? ' highlight' : ''}${mini ? ' mini' : ''}${picker ? ' picker-card' : ''}${selected ? ' selected' : ''}${used ? ' used' : ''}`;
  el.dataset.id = card.id;
  el.innerHTML = `
    <span class="card-rank ${card.color}">${card.label}</span>
    <span class="card-suit ${card.color}">${SUIT_SYMBOLS[card.suit]}</span>
    <span class="card-rank-bottom ${card.color}">${card.label}</span>
  `;
  if (picker) el.setAttribute('aria-label', `${card.label} of ${SUIT_SYMBOLS[card.suit]}`);
  return el;
}

function renderCardRow(cards, bestIds, container, size = 'normal') {
  container.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'cards' + (size === 'large' ? ' cards-lg' : '');
  cards.forEach(card => {
    const node = cardDisplay(card, { highlight: bestIds.has(card.id), mini: size === 'mini' });
    row.appendChild(node);
  });
  container.appendChild(row);
}

function renderEmptySlots(count, container, filled = []) {
  container.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'slot-row';
  for (let i = 0; i < count; i++) {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.dataset.index = i;
    slot.setAttribute('role', 'button');
    slot.tabIndex = 0;
    if (filled[i]) {
      slot.appendChild(cardDisplay(filled[i], { mini: true }));
      slot.classList.add('filled');
    } else {
      slot.innerHTML = '<span class="slot-placeholder">+</span>';
    }
    row.appendChild(slot);
  }
  container.appendChild(row);
}

/* ── Card picker state ── */
const FULL_DECK = buildDeck();

function initCardPicker({ slotsEl, deckEl, onChange, slotCount }) {
  let slots = Array(slotCount).fill(null);
  let activeSlot = 0;

  function emit() {
    onChange(slots.filter(Boolean));
    render();
  }

  function render() {
    renderEmptySlots(slotCount, slotsEl, slots);
    slotsEl.querySelectorAll('.card-slot').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.index) === activeSlot);
      el.onclick = () => {
        activeSlot = Number(el.dataset.index);
        if (slots[activeSlot]) {
          slots[activeSlot] = null;
          emit();
        } else {
          render();
        }
      };
    });

    const used = new Set(slots.filter(Boolean).map(c => c.id));
    deckEl.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'deck-grid';
    FULL_DECK.forEach(card => {
      const btn = cardEl(card, { mini: true, picker: true, used: used.has(card.id) });
      btn.disabled = used.has(card.id);
      btn.onclick = () => {
        if (used.has(card.id)) return;
        while (activeSlot < slotCount && slots[activeSlot]) activeSlot++;
        if (activeSlot >= slotCount) activeSlot = slots.findIndex(s => !s);
        if (activeSlot === -1) return;
        slots[activeSlot] = card;
        activeSlot = slots.findIndex(s => !s);
        if (activeSlot === -1) activeSlot = slotCount - 1;
        emit();
      };
      grid.appendChild(btn);
    });
    deckEl.appendChild(grid);
  }

  return {
    clear() {
      slots = Array(slotCount).fill(null);
      activeSlot = 0;
      emit();
    },
    randomFill(count) {
      const pool = shuffle([...FULL_DECK]);
      slots = Array(slotCount).fill(null);
      for (let i = 0; i < Math.min(count, slotCount); i++) slots[i] = pool[i];
      activeSlot = 0;
      emit();
    },
    getSlots: () => [...slots]
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ── Quiz ── */
const QUIZ_SCENARIOS = [
  { cards: ['Ah','Kh','Qh','Jh','10h','2c','3d'], answer: 'Royal Flush' },
  { cards: ['9s','8s','7s','6s','5s','Ac','2d'], answer: 'Straight Flush' },
  { cards: ['Qh','Qd','Qs','Qc','7h','2s','3d'], answer: 'Four of a Kind' },
  { cards: ['Jh','Jd','Js','4c','4h','Ac','2d'], answer: 'Full House' },
  { cards: ['Ad','Jd','9d','6d','2d','Kc','3s'], answer: 'Flush' },
  { cards: ['10s','9h','8c','7d','6s','Ac','2d'], answer: 'Straight' },
  { cards: ['8h','8d','8s','Kc','2d','Ac','3s'], answer: 'Three of a Kind' },
  { cards: ['Ah','Ad','5c','5h','9s','Kc','2d'], answer: 'Two Pair' },
  { cards: ['Kh','Kd','Qc','7s','3d','Ac','2h'], answer: 'One Pair' },
  { cards: ['As','Jh','9c','6d','2s','Kc','3d'], answer: 'High Card' }
];

function generateQuizQuestion() {
  const scenario = QUIZ_SCENARIOS[Math.floor(Math.random() * QUIZ_SCENARIOS.length)];
  const cards = scenario.cards.map(c => parseCardInput(c));
  const correct = scenario.answer;
  const wrong = shuffle(HAND_NAMES.filter(n => n !== correct)).slice(0, 3);
  const options = shuffle([correct, ...wrong]);
  return { cards, correct, options };
}

/* ── Rankings carousel ── */
function initRankings() {
  const TOTAL = 10;
  let current = 0;
  const track = document.getElementById('carousel-track');
  if (!track) return;

  const tiles = document.querySelectorAll('.lookup-tile');
  const dotsContainer = document.getElementById('carousel-dots');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const currentNum = document.getElementById('current-num');
  const carouselSection = document.querySelector('.carousel-section');
  const carouselPanel = document.querySelector('.carousel-panel');
  const AUTO_MS = 6000;
  let autoTimer = null;

  for (let i = 0; i < TOTAL; i++) {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Go to hand ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  }

  const dots = dotsContainer.querySelectorAll('.carousel-dot');

  function renderSlide() {
    track.style.transform = `translateX(-${current * 100}%)`;
    currentNum.textContent = current + 1;
    tiles.forEach((tile, i) => tile.classList.toggle('active', i === current));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === TOTAL - 1;
  }

  function goTo(index) {
    current = Math.max(0, Math.min(TOTAL - 1, index));
    renderSlide();
    resetAutoTimer();
  }

  function advanceAuto() {
    if (document.getElementById('panel-rankings')?.classList.contains('active')) {
      current = (current + 1) % TOTAL;
      renderSlide();
    }
  }

  function resetAutoTimer() {
    clearInterval(autoTimer);
    autoTimer = setInterval(advanceAuto, AUTO_MS);
  }

  function pauseAutoTimer() {
    clearInterval(autoTimer);
    autoTimer = null;
  }

  tiles.forEach(tile => {
    tile.addEventListener('click', () => {
      goTo(Number(tile.dataset.index));
      carouselSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  const viewport = document.getElementById('carousel-viewport');
  let touchStartX = 0;
  viewport.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  viewport.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 50) goTo(diff > 0 ? current - 1 : current + 1);
  }, { passive: true });

  carouselPanel.addEventListener('mouseenter', pauseAutoTimer);
  carouselPanel.addEventListener('mouseleave', resetAutoTimer);

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('panel-rankings')?.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  goTo(0);
  window._rankingsGoTo = goTo;
}

/* ── Navigation ── */
function initNav() {
  const buttons = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('.panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.panel;
      buttons.forEach(b => b.classList.toggle('active', b === btn));
      panels.forEach(p => p.classList.toggle('active', p.id === `panel-${id}`));
      history.replaceState(null, '', `#${id}`);
    });
  });

  const hash = location.hash.slice(1);
  if (hash) {
    const btn = document.querySelector(`.nav-btn[data-panel="${hash}"]`);
    if (btn) btn.click();
  }
}

/* ── Evaluate ── */
function initEvaluate() {
  const slotsEl = document.getElementById('eval-slots');
  const deckEl = document.getElementById('eval-deck');
  const resultEl = document.getElementById('eval-result');
  const clearBtn = document.getElementById('eval-clear');
  const randomBtn = document.getElementById('eval-random');

  const picker = initCardPicker({
    slotsEl,
    deckEl,
    slotCount: 7,
    onChange(cards) {
      if (cards.length < 5) {
        resultEl.hidden = true;
        return;
      }
      const hole = cards.slice(0, 2);
      const board = cards.slice(2);
      const best = bestHand(cards);
      const bestIds = new Set(best.cards.map(c => c.id));

      resultEl.hidden = false;
      resultEl.querySelector('.result-hand-name').textContent = best.name;
      resultEl.querySelector('.result-detail').textContent = describeTiebreak(best);

      renderCardRow(hole, bestIds, resultEl.querySelector('.result-hole'), 'normal');
      renderCardRow(board, bestIds, resultEl.querySelector('.result-board'), 'normal');
      renderCardRow(best.cards, bestIds, resultEl.querySelector('.result-best'), 'large');
    }
  });

  clearBtn.onclick = () => picker.clear();
  randomBtn.onclick = () => picker.randomFill(7);
}

/* ── Compare ── */
function initCompare() {
  const p1El = document.getElementById('cmp-p1-slots');
  const p2El = document.getElementById('cmp-p2-slots');
  const boardEl = document.getElementById('cmp-board-slots');
  const deckEl = document.getElementById('cmp-deck');
  const resultEl = document.getElementById('cmp-result');
  const clearBtn = document.getElementById('cmp-clear');
  const randomBtn = document.getElementById('cmp-random');

  let p1 = [null, null], p2 = [null, null], board = [null, null, null, null, null];
  let target = { group: 'p1', index: 0 };

  function allCards() {
    return [...p1, ...p2, ...board].filter(Boolean);
  }

  function update() {
    renderEmptySlots(2, p1El, p1);
    renderEmptySlots(2, p2El, p2);
    renderEmptySlots(5, boardEl, board);
    bindSlots(p1El, 'p1', p1);
    bindSlots(p2El, 'p2', p2);
    bindSlots(boardEl, 'board', board);
    renderDeck();

    const filled = allCards();
    if (filled.length < 9) {
      resultEl.hidden = true;
      return;
    }

    const hole1 = p1.filter(Boolean);
    const hole2 = p2.filter(Boolean);
    const boardCards = board.filter(Boolean);
    const outcome = comparePlayers(hole1, hole2, boardCards);
    if (!outcome) return;

    resultEl.hidden = false;
    resultEl.querySelector('.cmp-verdict').textContent = outcome.verdict;
    resultEl.querySelector('.cmp-detail').textContent = outcome.detail;

    const ids1 = new Set(outcome.hand1.cards.map(c => c.id));
    const ids2 = new Set(outcome.hand2.cards.map(c => c.id));

    resultEl.querySelector('.cmp-p1-name').textContent = outcome.hand1.name;
    resultEl.querySelector('.cmp-p2-name').textContent = outcome.hand2.name;
    renderCardRow(outcome.all1, ids1, resultEl.querySelector('.cmp-p1-cards'), 'normal');
    renderCardRow(outcome.all2, ids2, resultEl.querySelector('.cmp-p2-cards'), 'normal');
  }

  function bindSlots(container, group, arr) {
    container.querySelectorAll('.card-slot').forEach(el => {
      const idx = Number(el.dataset.index);
      el.classList.toggle('active', target.group === group && target.index === idx);
      el.onclick = () => {
        target = { group, index: idx };
        if (arr[idx]) {
          arr[idx] = null;
          update();
        } else {
          update();
        }
      };
    });
  }

  function renderDeck() {
    const used = new Set(allCards().map(c => c.id));
    deckEl.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'deck-grid';
    FULL_DECK.forEach(card => {
      const btn = cardEl(card, { mini: true, picker: true, used: used.has(card.id) });
      btn.disabled = used.has(card.id);
      btn.onclick = () => {
        if (used.has(card.id)) return;
        const arr = target.group === 'p1' ? p1 : target.group === 'p2' ? p2 : board;
        if (!arr[target.index]) {
          arr[target.index] = card;
        } else {
          const empty = arr.findIndex(s => !s);
          if (empty !== -1) arr[empty] = card;
        }
        advanceTarget();
        update();
      };
      grid.appendChild(btn);
    });
    deckEl.appendChild(grid);
  }

  function advanceTarget() {
    const order = [
      ...p1.map((_, i) => ({ group: 'p1', index: i })),
      ...p2.map((_, i) => ({ group: 'p2', index: i })),
      ...board.map((_, i) => ({ group: 'board', index: i }))
    ];
    const arr = target.group === 'p1' ? p1 : target.group === 'p2' ? p2 : board;
    if (!arr[target.index]) return;
    const cur = order.findIndex(o => o.group === target.group && o.index === target.index);
    for (let i = cur + 1; i < order.length; i++) {
      const a = order[i].group === 'p1' ? p1 : order[i].group === 'p2' ? p2 : board;
      if (!a[order[i].index]) {
        target = order[i];
        return;
      }
    }
  }

  clearBtn.onclick = () => {
    p1 = [null, null]; p2 = [null, null]; board = [null, null, null, null, null];
    target = { group: 'p1', index: 0 };
    update();
  };

  randomBtn.onclick = () => {
    const pool = shuffle([...FULL_DECK]);
    p1 = [pool[0], pool[1]];
    p2 = [pool[2], pool[3]];
    board = pool.slice(4, 9);
    target = { group: 'p1', index: 0 };
    update();
  };

  update();
}

/* ── Quiz ── */
function initQuiz() {
  const cardsEl = document.getElementById('quiz-cards');
  const optionsEl = document.getElementById('quiz-options');
  const feedbackEl = document.getElementById('quiz-feedback');
  const scoreEl = document.getElementById('quiz-score');
  const streakEl = document.getElementById('quiz-streak');
  const bestEl = document.getElementById('quiz-best');
  const nextBtn = document.getElementById('quiz-next');

  let score = 0, total = 0, streak = 0, best = Number(localStorage.getItem('pokerQuizBest') || 0);
  let current = null, answered = false;

  bestEl.textContent = best;

  function renderScore() {
    scoreEl.textContent = `${score} / ${total}`;
    streakEl.textContent = streak;
    bestEl.textContent = best;
  }

  function loadQuestion() {
    answered = false;
    feedbackEl.hidden = true;
    nextBtn.hidden = true;
    current = generateQuizQuestion();

    cardsEl.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'cards cards-lg';
    current.cards.forEach(card => row.appendChild(cardDisplay(card)));
    cardsEl.appendChild(row);

    optionsEl.innerHTML = '';
    current.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.textContent = opt;
      btn.onclick = () => {
        if (answered) return;
        answered = true;
        total++;
        const correct = opt === current.correct;
        if (correct) {
          score++;
          streak++;
          if (streak > best) {
            best = streak;
            localStorage.setItem('pokerQuizBest', best);
          }
        } else {
          streak = 0;
        }
        renderScore();
        optionsEl.querySelectorAll('.quiz-option').forEach(b => {
          b.disabled = true;
          if (b.textContent === current.correct) b.classList.add('correct');
          if (b === btn && !correct) b.classList.add('wrong');
        });
        feedbackEl.hidden = false;
        feedbackEl.textContent = correct ? 'Correct!' : `Not quite — it's ${current.correct}.`;
        feedbackEl.className = 'quiz-feedback ' + (correct ? 'ok' : 'bad');
        nextBtn.hidden = false;
      };
      optionsEl.appendChild(btn);
    });
  }

  nextBtn.onclick = loadQuestion;
  loadQuestion();
  renderScore();
}

/* ── Odds table ── */
function initOdds() {
  const oddsBody = document.getElementById('odds-body');
  const outsBody = document.getElementById('outs-body');

  ODDS_DATA.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.rank}</td><td>${row.name}</td><td>${row.prob}</td><td>${row.odds}</td>`;
    oddsBody.appendChild(tr);
  });

  OUTS_DATA.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.draw}</td><td>${row.turn}</td><td>${row.river}</td><td>${row.both}</td>`;
    outsBody.appendChild(tr);
  });
}

/* ── PWA ── */
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initRankings();
  initEvaluate();
  initCompare();
  initQuiz();
  initOdds();
  initPWA();
});
