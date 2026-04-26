/* ===== 定数 ===== */
const HIRAGANA = [
  'あ','い','う','え','お','か','き','く','け','こ',
  'さ','し','す','せ','そ','た','ち','つ','て','と',
  'な','に','ぬ','ね','の','は','ひ','ふ','へ','ほ',
  'ま','み','む','め','も','や','ゆ','よ',
  'ら','り','る','れ','ろ','わ','を','ん',
];

/* かんたん: 8匹・fontSize はピクセル単位 */
const FISH_DEFS_EASY = [
  { emoji:'🐠', speed:0.38, fontSize:48 },
  { emoji:'🐟', speed:0.28, fontSize:42 },
  { emoji:'🐡', speed:0.23, fontSize:54 },
  { emoji:'🐠', speed:0.45, fontSize:45 },
  { emoji:'🐟', speed:0.33, fontSize:50 },
  { emoji:'🦑', speed:0.18, fontSize:38 },
  { emoji:'🐡', speed:0.28, fontSize:43 },
  { emoji:'🐠', speed:0.35, fontSize:51 },
];

/* むずかしい: 15匹 */
const FISH_DEFS_HARD = [
  { emoji:'🐠', speed:0.75, fontSize:48 },
  { emoji:'🐟', speed:0.55, fontSize:42 },
  { emoji:'🐡', speed:0.45, fontSize:54 },
  { emoji:'🐠', speed:0.90, fontSize:45 },
  { emoji:'🐟', speed:0.65, fontSize:50 },
  { emoji:'🦑', speed:0.35, fontSize:38 },
  { emoji:'🐠', speed:0.80, fontSize:46 },
  { emoji:'🐟', speed:0.70, fontSize:44 },
  { emoji:'🐡', speed:0.50, fontSize:52 },
  { emoji:'🐟', speed:0.85, fontSize:40 },
  { emoji:'🐠', speed:0.60, fontSize:49 },
  { emoji:'🦑', speed:0.40, fontSize:36 },
  { emoji:'🐟', speed:0.78, fontSize:43 },
  { emoji:'🐡', speed:0.58, fontSize:47 },
  { emoji:'🐠', speed:0.95, fontSize:44 },
];

/* 単語リストは words.js で定義（WORD_DICT / WORD_DICT_100） */

const DINO_STORY = [
  'すごーい！！','やったね！🎉','どんどんつれてる！',
  'かっこいい！！','じょうずだね！','さいこう！🌟','めいじんだ！','むてきだよ！',
];
const DINO_POOL = [
  'またつれた！','どんどんいこう！','はやいね〜！','りょうしみたい！',
  'すばらしい！','もっともっと！','さかなくんだ！','うわー！すごい！',
  'てがはやい！','チャンピオン！🏆','きらきら！✨','なんびきつれるの？',
  'とまらないね！','かみわざだ！','ぼくもやりたい！','おしえてほしい！',
  'うみのおうじゃ！','そんなに！？','たのしそう！','ぜんぶつれちゃえ！',
];
const MILESTONES = {
  10:'10ぴき！すごい！🎊', 20:'20ぴき！でんせつだ！🌟',
  30:'30ぴき！かみわざ！👑', 50:'50ぴき！うちゅういち！🚀',
  100:'100ぴき！！もはやかみ！💥',
};

const SAVE_KEY        = 'sakana-game-easy-v1';
const SAVE_KEY_100    = 'sakana-game-easy100-v1';
const COLLECTION_KEY  = 'sakana-collection-v1';

const TIMER_INITIAL = 30;
const TIMER_MAX     = 45;

/* ===== Canvas ===== */
let canvas, ctx;
let canvasW = 0, canvasH = 0;

/* ===== ゲーム状態 ===== */
let difficulty   = null;
let speedMode    = 'normal';
let pendingDiff  = null;
let gameState    = 'menu';

let score         = 0;
let collectedKana = [];
let fishes        = [];
let lastTime      = 0;
let chipCount     = 0;

let timeLeft      = TIMER_INITIAL;
let timerInterval = null;

let currentTarget     = null;
let hintFishIndex     = -1;
let checkedKanaLength = 0;

let activeWordDict = [];
let collection     = {};

/* ===== コレクション ===== */
function loadCollection() {
  try { collection = JSON.parse(localStorage.getItem(COLLECTION_KEY)) || {}; }
  catch(e) { collection = {}; }
}
function saveCollection() {
  try { localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection)); } catch(e) {}
}
function addToCollection(entry) {
  if (!collection[entry.word]) {
    collection[entry.word] = { word: entry.word, emoji: entry.emoji, bonus: entry.bonus, count: 0 };
  }
  collection[entry.word].count++;
  saveCollection();
}

function showCollectionModal() {
  const statsEl = document.getElementById('col-stats');
  const listEl  = document.getElementById('col-list');

  const obtained = Object.keys(collection).length;
  statsEl.textContent = `${obtained} しゅるいゲット！`;

  listEl.innerHTML = '';
  document.getElementById('col-confirm').classList.add('hidden');
  document.getElementById('col-reset').classList.remove('hidden');

  const dict = activeWordDict.length > 0 ? activeWordDict : [];
  if (dict.length === 0) {
    listEl.textContent = 'ゲームをはじめてからみてね！';
    document.getElementById('col-modal').classList.remove('hidden');
    return;
  }

  const groups = {};
  dict.forEach(e => { (groups[e.bonus] ??= []).push(e); });

  Object.entries(groups).sort(([a],[b]) => b - a).forEach(([bonus, words]) => {
    const grp = document.createElement('div');
    grp.className = 'hint-bonus-group';

    const lbl = document.createElement('div');
    lbl.className = 'hint-bonus-label' + bonusTierClass(Number(bonus));
    lbl.textContent = `＋${bonus}ぼーなす`;
    grp.appendChild(lbl);

    const row = document.createElement('div');
    row.className = 'col-word-row';
    words.forEach(w => {
      const col = collection[w.word];
      const chip = document.createElement('div');
      chip.className = 'col-chip' + (col ? ' got' : '');
      if (col) {
        chip.innerHTML =
          `<span class="col-emoji">${w.emoji}</span>` +
          `<span class="col-word">${w.word}</span>` +
          `<span class="col-cnt">×${col.count}</span>`;
      } else {
        chip.innerHTML =
          `<span class="col-emoji">？</span>` +
          `<span class="col-word col-unknown">${w.word}</span>`;
      }
      row.appendChild(chip);
    });
    grp.appendChild(row);
    listEl.appendChild(grp);
  });

  document.getElementById('col-modal').classList.remove('hidden');
}

/* ===== ターゲットワード管理 ===== */
function pickNewTarget() {
  currentTarget = activeWordDict[Math.floor(Math.random() * activeWordDict.length)];
  hintFishIndex = -1;
  ensureHintFishVisible();
  updateHintStyling();
}

function getTargetProgress() {
  if (!currentTarget) return 0;
  const word = currentTarget.word;
  const maxLen = Math.min(word.length - 1, collectedKana.length);
  for (let len = maxLen; len >= 1; len--) {
    if (collectedKana.slice(-len).join('') === word.slice(0, len)) return len;
  }
  return 0;
}

function ensureHintFishVisible() {
  if (!currentTarget) return;
  const progress = getTargetProgress();
  if (progress >= currentTarget.word.length) return;

  const needed  = currentTarget.word[progress];
  const uncaught = fishes.filter(f => !f.caught);
  if (!uncaught.length) return;

  if (hintFishIndex >= 0 && hintFishIndex < fishes.length) {
    const hf = fishes[hintFishIndex];
    if (!hf.caught && hf.kana === needed) return;
  }

  const existing = uncaught.find(f => f.kana === needed);
  const hintFish = existing ?? uncaught[Math.floor(Math.random() * uncaught.length)];
  if (!existing) hintFish.kana = needed;
  hintFishIndex = fishes.indexOf(hintFish);
}

function updateHintStyling() {
  fishes.forEach(f => f.isHint = false);
  if (difficulty === 'hard') return;
  if (hintFishIndex >= 0 && hintFishIndex < fishes.length) {
    const hf = fishes[hintFishIndex];
    if (!hf.caught) hf.isHint = true;
  }
}

/* ===== タイマー ===== */
function startTimer() {
  timeLeft = TIMER_INITIAL;
  updateTimerUI();
  timerInterval = setInterval(tickTimer, 1000);
}
function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}
function tickTimer() {
  timeLeft = Math.max(0, timeLeft - 1);
  updateTimerUI();
  if (timeLeft <= 0) { stopTimer(); showGameOver(); }
}
function updateTimerUI() {
  const fill = document.getElementById('timer-fill');
  const text = document.getElementById('timer-text');
  const pct  = Math.min(100, (timeLeft / TIMER_MAX) * 100);
  fill.style.width = pct + '%';
  fill.style.backgroundColor =
    timeLeft <= 10 ? '#ef5350' : timeLeft <= 20 ? '#ffa726' : '#66bb6a';
  text.textContent = timeLeft + 'びょう';
  text.classList.toggle('danger', timeLeft <= 10);
}

/* ===== localStorage ===== */
function currentSaveKey() {
  return difficulty === 'easy100' ? SAVE_KEY_100 : SAVE_KEY;
}
function saveState() {
  if (difficulty !== 'easy' && difficulty !== 'easy100') return;
  try { localStorage.setItem(currentSaveKey(), JSON.stringify({ score, collectedKana })); } catch(e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(currentSaveKey());
    if (!raw) return;
    const s = JSON.parse(raw);
    score         = typeof s.score === 'number' ? s.score : 0;
    collectedKana = Array.isArray(s.collectedKana) ? s.collectedKana : [];
  } catch(e) {}
}

/* ===== メニューナビゲーション ===== */
function showStep(n) {
  [1, 2, 3].forEach(i => {
    document.getElementById(`menu-step${i}`)?.classList.toggle('hidden', i !== n);
  });
}

/* ===== ゲームフロー ===== */
function startGame(diff, speed = 'normal') {
  difficulty = diff;
  speedMode  = speed;
  gameState  = 'playing';

  showStep(1);
  activeWordDict = (diff === 'easy100' || diff === 'hard') ? WORD_DICT_100 : WORD_DICT;

  score = 0; collectedKana = []; chipCount = 0;
  hintFishIndex = -1; currentTarget = null; lastTime = 0; checkedKanaLength = 0;
  document.getElementById('kana-list').innerHTML = '';
  document.getElementById('score').textContent   = '0';
  document.getElementById('dino').textContent    = '🦕';
  document.getElementById('dino-text').textContent = 'がんばれー！';

  if (diff === 'easy' || diff === 'easy100') {
    loadState();
    document.getElementById('score').textContent = score;
    collectedKana.forEach(k => renderKanaChip(k));
    const dinoEl = document.getElementById('dino');
    if      (score >= 30) dinoEl.textContent = '🐉';
    else if (score >= 10) dinoEl.textContent = '🦖';
    if (score > 0) {
      const t = document.getElementById('dino-text');
      if      (MILESTONES[score])           t.textContent = MILESTONES[score];
      else if (score <= DINO_STORY.length)  t.textContent = DINO_STORY[score - 1];
      else                                  t.textContent = DINO_POOL[Math.floor(Math.random() * DINO_POOL.length)];
    }
    requestAnimationFrame(() => {
      const list = document.getElementById('kana-list');
      list.scrollLeft = list.scrollWidth;
    });
  }

  stopTimer();
  const timerBar = document.getElementById('timer-bar');
  if (diff === 'hard') { timerBar.classList.remove('hidden'); startTimer(); }
  else                 { timerBar.classList.add('hidden'); }

  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');

  resizeCanvas();
  initFishes(diff);
}

function showGameOver() {
  gameState = 'gameover';
  document.getElementById('final-score').textContent = score;
  document.getElementById('gameover-screen').classList.remove('hidden');
}
function retryGame() {
  document.getElementById('gameover-screen').classList.add('hidden');
  startGame('hard', 'normal');
}
function goToMenu() {
  stopTimer();
  gameState = 'menu';
  fishes = [];
  if (ctx) ctx.clearRect(0, 0, canvasW, canvasH);
  document.getElementById('gameover-screen').classList.add('hidden');
  document.getElementById('confirm-modal').classList.add('hidden');
  showStep(1);
  document.getElementById('menu-screen').classList.remove('hidden');
}

/* ===== Canvas セットアップ ===== */
function resizeCanvas() {
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvasW = rect.width;
  canvasH = rect.height;
  canvas.width  = Math.round(canvasW * dpr);
  canvas.height = Math.round(canvasH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ===== Canvas 描画 ===== */
function drawFishLayer() {
  if (!ctx || canvasW === 0 || canvasH === 0) return;
  ctx.clearRect(0, 0, canvasW, canvasH);

  const t = performance.now();

  fishes.forEach(fish => {
    if (fish.caught) return;

    const px = fish.x * canvasW / 100;
    const py = fish.y * canvasH / 100;
    const fs = fish.fontSize;

    ctx.save();
    ctx.translate(px, py);

    /* 絵文字（方向に合わせてフリップ） */
    ctx.save();
    if (fish.dir > 0) ctx.scale(-1, 1);
    ctx.font = `${fs}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fish.emoji, 0, 0);
    ctx.restore();

    /* かな文字 */
    const ks     = Math.max(14, Math.round(fs * 0.50));
    const kanaY  = fs * 0.55 + 2;
    const isHint = fish.isHint;

    ctx.font = `900 ${ks}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (isHint) {
      const glow = (Math.sin(t / 280) * 0.5 + 0.5) * 8 + 2;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = glow;
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.78)';
    ctx.lineWidth   = Math.max(3, ks * 0.18);
    ctx.lineJoin    = 'round';
    ctx.strokeText(fish.kana, 0, kanaY);

    ctx.fillStyle  = isHint ? '#ffd700' : '#fff';
    ctx.fillText(fish.kana, 0, kanaY);

    ctx.shadowBlur = 0;
    ctx.restore();

    fish.screenX = px;
    fish.screenY = py;
  });
}

function hitTestFish(tapX, tapY) {
  if (gameState !== 'playing') return;
  for (const fish of fishes) {
    if (fish.caught) continue;
    const dx = tapX - fish.screenX;
    const dy = tapY - fish.screenY;
    if (dx * dx + dy * dy < fish.fontSize * fish.fontSize * 0.81) {
      catchFish(fish);
      return;
    }
  }
}

/* ===== 魚の生成 ===== */
function initFishes(diff) {
  fishes = [];
  const defs   = diff === 'hard' ? FISH_DEFS_HARD : FISH_DEFS_EASY;
  const factor = diff === 'hard' ? 1.0
               : speedMode === 'slow' ? 0.5
               : speedMode === 'fast' ? 2.0
               : 1.0;

  defs.forEach((def, i) => {
    fishes.push({
      emoji:    def.emoji,
      fontSize: def.fontSize,
      x:        Math.random() * 75,
      y:        8 + (i / defs.length) * 68,
      speed:    def.speed * factor,
      dir:      Math.random() > 0.5 ? 1 : -1,
      caught:   false,
      kana:     randomKana(),
      isHint:   false,
      screenX:  0,
      screenY:  0,
    });
  });

  pickNewTarget();
}

/* ===== アニメーションループ ===== */
function loop(timestamp) {
  if (lastTime === 0) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 16, 3);
  lastTime = timestamp;

  fishes.forEach(fish => {
    if (fish.caught) return;
    fish.x += fish.speed * fish.dir * 0.18 * dt;
    if      (fish.x >= 82) { fish.x = 82; fish.dir = -1; }
    else if (fish.x <=  0) { fish.x =  0; fish.dir =  1; }
  });

  drawFishLayer();
  requestAnimationFrame(loop);
}

/* ===== 魚をキャッチ ===== */
function catchFish(fish) {
  if (fish.caught || gameState !== 'playing') return;

  const caughtKana = fish.kana;
  fish.caught = true;
  score++;

  collectedKana.push(caughtKana);
  checkedKanaLength = 0;
  renderKanaChip(caughtKana);
  ensureHintFishVisible();
  updateHintStyling();
  updateScore();
  showCatchPopup(caughtKana);
  cheerDino();
  saveState();

  setTimeout(() => checkWordBonus(), 1550);

  setTimeout(() => {
    fish.x      = Math.random() * 75;
    fish.y      = 8 + Math.random() * 68;
    fish.dir    = Math.random() > 0.5 ? 1 : -1;
    fish.kana   = randomKana();
    fish.isHint = false;
    fish.caught = false;
    ensureHintFishVisible();
    updateHintStyling();
  }, 1300);
}

/* ===== ひらがなチップ ===== */
function renderKanaChip(kana) {
  const list = document.getElementById('kana-list');
  const chip = document.createElement('span');
  chip.className = `kana-chip chip-${chipCount % 10}`;
  chip.textContent = kana;
  chipCount++;
  list.appendChild(chip);
  requestAnimationFrame(() => { list.scrollLeft = list.scrollWidth; });
}

/* ===== ワードボーナス ===== */
function checkWordBonus() {
  if (collectedKana.length === checkedKanaLength) return;
  checkedKanaLength = collectedKana.length;
  for (const entry of activeWordDict) {
    const len = entry.word.length;
    if (collectedKana.length >= len &&
        collectedKana.slice(-len).join('') === entry.word) {
      triggerWordBonus(entry, len);
      return;
    }
  }
}

function triggerWordBonus(entry, len) {
  score += entry.bonus;
  updateScore();
  saveState();
  addToCollection(entry);
  pickNewTarget();

  if (difficulty === 'hard') {
    timeLeft = Math.min(timeLeft + entry.word.length * 2, TIMER_MAX);
    updateTimerUI();
  }

  const popup = document.getElementById('popup');
  popup.className = 'word-bonus';
  popup.innerHTML =
    `${entry.emoji}「${entry.word}」ができたよ！` +
    `<span class="popup-bonus-label">+${entry.bonus}ぼーなす！🎊</span>`;
  void popup.offsetWidth;
  popup.classList.add('show');
  setTimeout(() => { popup.className = ''; }, 2100);

  highlightLastChips(len);
}

function highlightLastChips(n) {
  const chips = document.getElementById('kana-list').querySelectorAll('.kana-chip');
  const start = chips.length - n;
  for (let i = start; i < chips.length; i++) {
    if (chips[i]) chips[i].classList.add('bonus-chip');
  }
}

/* ===== スコア ===== */
function updateScore() {
  const el = document.getElementById('score');
  el.textContent = score;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  setTimeout(() => el.classList.remove('pop'), 350);
}

/* ===== ポップアップ ===== */
function showCatchPopup(kana) {
  const popup = document.getElementById('popup');
  popup.className = '';
  popup.innerHTML = `🎉 つれた！<span class="popup-kana">${kana}</span>`;
  void popup.offsetWidth;
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), 1400);
}

/* ===== 恐竜の応援 ===== */
function cheerDino() {
  const textEl = document.getElementById('dino-text');
  const dinoEl = document.getElementById('dino');

  let msg;
  if      (MILESTONES[score])           msg = MILESTONES[score];
  else if (score <= DINO_STORY.length)  msg = DINO_STORY[score - 1];
  else                                  msg = DINO_POOL[Math.floor(Math.random() * DINO_POOL.length)];
  textEl.textContent = msg;

  if      (score >= 30) dinoEl.textContent = '🐉';
  else if (score >= 10) dinoEl.textContent = '🦖';
  else                  dinoEl.textContent = '🦕';

  dinoEl.classList.remove('bounce');
  void dinoEl.offsetWidth;
  dinoEl.classList.add('bounce');
  setTimeout(() => dinoEl.classList.remove('bounce'), 900);
}

/* ===== ヒントモーダル ===== */
function showHintModal() {
  const progress = getTargetProgress();
  const labelEl  = document.getElementById('hint-target-label');
  const charsEl  = document.getElementById('hint-target-chars');

  if (currentTarget) {
    labelEl.innerHTML = `ねらえ！ ${currentTarget.emoji} <strong>+${currentTarget.bonus}ぼーなす</strong>`;
    charsEl.innerHTML = '';
    [...currentTarget.word].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'hint-char';
      span.textContent = ch;
      if      (i < progress)  span.classList.add('done');
      else if (i === progress) span.classList.add('next');
      else                    span.classList.add('todo');
      charsEl.appendChild(span);
    });
  }

  const listEl = document.getElementById('hint-word-list');
  listEl.innerHTML = '';
  const groups = {};
  activeWordDict.forEach(e => { (groups[e.bonus] ??= []).push(e); });
  Object.entries(groups).sort(([a],[b]) => b - a).forEach(([bonus, words]) => {
    const group = document.createElement('div');
    group.className = 'hint-bonus-group';
    const lbl = document.createElement('div');
    lbl.className = 'hint-bonus-label' + bonusTierClass(Number(bonus));
    lbl.textContent = `＋${bonus}ぼーなす`;
    group.appendChild(lbl);
    const row = document.createElement('div');
    row.className = 'hint-word-row';
    words.forEach(e => {
      const chip = document.createElement('span');
      chip.className = 'hint-word-chip';
      chip.textContent = `${e.emoji}${e.word}`;
      row.appendChild(chip);
    });
    group.appendChild(row);
    listEl.appendChild(group);
  });

  document.getElementById('hint-modal').classList.remove('hidden');
}

/* ===== ユーティリティ ===== */
function bonusTierClass(bonus) {
  if (bonus >= 40) return ' tier8';
  if (bonus >= 35) return ' tier7';
  if (bonus >= 30) return ' tier6';
  if (bonus >= 25) return ' tier5';
  if (bonus >= 20) return ' tier4';
  if (bonus >= 15) return ' high';
  if (bonus >= 10) return ' medium';
  return '';
}
function randomKana() {
  return HIRAGANA[Math.floor(Math.random() * HIRAGANA.length)];
}

/* ===== 起動 ===== */
window.addEventListener('load', () => {
  /* Canvas 初期化 */
  canvas = document.getElementById('fish-canvas');
  ctx    = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  /* Canvas タップ */
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect  = canvas.getBoundingClientRect();
    hitTestFish(touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: false });
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    hitTestFish(e.clientX - rect.left, e.clientY - rect.top);
  });

  loadCollection();
  requestAnimationFrame(loop);

  /* メニューナビゲーション */
  document.getElementById('btn-easy').addEventListener('click', () => showStep(2));
  document.getElementById('btn-hard').addEventListener('click', () => startGame('hard', 'normal'));
  document.getElementById('btn-30').addEventListener('click',  () => { pendingDiff = 'easy';    showStep(3); });
  document.getElementById('btn-100').addEventListener('click', () => { pendingDiff = 'easy100'; showStep(3); });
  document.getElementById('btn-back1').addEventListener('click', () => showStep(1));
  document.getElementById('btn-slow').addEventListener('click',   () => startGame(pendingDiff, 'slow'));
  document.getElementById('btn-normal').addEventListener('click', () => startGame(pendingDiff, 'normal'));
  document.getElementById('btn-fast').addEventListener('click',   () => startGame(pendingDiff, 'fast'));
  document.getElementById('btn-back2').addEventListener('click',  () => showStep(2));

  /* ヒント */
  document.getElementById('hint-btn').addEventListener('click', showHintModal);
  document.getElementById('hint-close').addEventListener('click', () =>
    document.getElementById('hint-modal').classList.add('hidden'));
  document.getElementById('hint-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) document.getElementById('hint-modal').classList.add('hidden');
  });

  /* コレクション */
  document.getElementById('col-btn').addEventListener('click', showCollectionModal);
  document.getElementById('col-close').addEventListener('click', () =>
    document.getElementById('col-modal').classList.add('hidden'));
  document.getElementById('col-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) document.getElementById('col-modal').classList.add('hidden');
  });
  document.getElementById('col-reset').addEventListener('click', () => {
    document.getElementById('col-confirm').classList.remove('hidden');
    document.getElementById('col-reset').classList.add('hidden');
  });
  document.getElementById('col-reset-yes').addEventListener('click', () => {
    collection = {};
    saveCollection();
    showCollectionModal();
  });
  document.getElementById('col-reset-no').addEventListener('click', () => {
    document.getElementById('col-confirm').classList.add('hidden');
    document.getElementById('col-reset').classList.remove('hidden');
  });

  /* メニューへ戻る */
  document.getElementById('reset-btn').addEventListener('click', () =>
    document.getElementById('confirm-modal').classList.remove('hidden'));
  document.getElementById('confirm-yes').addEventListener('click', () => {
    if (difficulty === 'easy')    localStorage.removeItem(SAVE_KEY);
    if (difficulty === 'easy100') localStorage.removeItem(SAVE_KEY_100);
    goToMenu();
  });
  document.getElementById('confirm-no').addEventListener('click', () =>
    document.getElementById('confirm-modal').classList.add('hidden'));

  document.getElementById('gameover-retry').addEventListener('click', retryGame);
  document.getElementById('gameover-menu').addEventListener('click', goToMenu);
});
