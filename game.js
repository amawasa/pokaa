// --- ゲーム設定・定数 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const MAP_SIZE = 10000; 
const BOSS_HP_BAR = document.getElementById('boss-hp-bar');
const BOSS_HP_FILL = document.getElementById('boss-hp-fill');
const BULLET_QUEEN_COOLDOWN = 1.5; // BulletQueenBossの弾発射間隔 (1.5秒)   
const TELEPORT_COOLDOWN = 3; // TeleportHunterBossのテレポート間隔 (3秒)   
const TELEPORT_WARNING_FRAMES = 1; // テレポート警告線を表示する時間 (1秒)
const SLIDE_INERTIA = 0.97; // 慣性力（スライディング時の減速の弱さ）
const SLIDE_INPUT_CORRECTION = 0.015; // 慣性力への入力補正の割合
// ゲーム状態フラグ
let isGameOver = false;
//ゲームモード設定
let gameState = 'title'; // 'title' | 'playing'
let selectedMode = null; // 'easy' | 'normal'
// --- 3. イベント管理変数 ---
let currentEventIndex = -2;   // 現在のイベントID
let currentEventRemaining = 0; // 現在のイベント残り時間
// ゲームオーバー情報保存用
let gameOverData = {};


function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

// ユーティリティ
const rnd = (n) => Math.floor(Math.random() * n);
const rad = (d) => d * Math.PI / 180;

// World座標をScreen座標に変換する関数
const getScreenX = (x) => x - player.x + canvas.width / 2;
const getScreenY = (y) => y - player.y + canvas.height / 2;

// 最も近い敵を取得する関数
function getNearestEnemy() {
  let nearest = null;
  let minD = Infinity;
  enemies.forEach(e => {
    let d = Math.hypot(e.x - player.x, e.y - player.y);
    if(d < minD) { minD = d; nearest = e; }
  });
  return { enemy: nearest, dist: minD };
}

// 武器IDからUPGRADESのアイテムオブジェクトを取得
function getWeaponItem(wepId) {
  const base = UPGRADES.find(u => u.type === 'wep' && u.wepId === wepId);
  const p = player.Pgot[`wep_${wepId}`];

  if (!p) return base;

  return {
    ...base,
    name: p.display?.name ?? base.name,
    icon: p.display?.icon ?? base.icon
  };
}

function getSwepItem(swepId) {
  const base = UPGRADES.find(u => u.type === 'swep' && u.swepId === swepId);
  const p = player.Pgot[`swep_${swepId}`];

  if (!p) return base;

  return {
    ...base,
    name: p.display?.name ?? base.name,
    icon: p.display?.icon ?? base.icon
  };
}


// --- データ定義 ---

/// 1. 強化アイテムリスト
const UPGRADES = [
  // 武器 (ID 0-14)
 
    
  { id: 'wand', type: 'wep', name: '魔法の杖', icon: '🪄', maxLv: 8,
    wepId: 0, range: 400,
    desc: '魔法の光を放ち的に攻撃', 
    stat: 'magic', power: 8 },


  { id: 'knife', type: 'wep', name: '投げナイフ', icon: '🔪', maxLv: 8,
    wepId: 1, range: 300,
    desc: '取り扱いやすい小型ナイフ', 
    stat: 'strength', power: 13 },

  { id: 'axe', type: 'wep', name: '鉄の斧', icon: '🪓', maxLv: 8, 
    wepId: 2, range: 600,
    desc: '一撃が強い重い斧', 
    stat: 'strength', power: 20 },

  { id: 'cross', type: 'wep', name: '十字架', icon: '✝️', maxLv: 8,
    wepId: 3, range: 450,
    desc: '敵を浄化する小型の十字架', 
    stat: 'magic', power: 7 },

  { id: 'garlic', type: 'wep', name: 'ニンニク', icon: '🧄', maxLv: 8,
    wepId: 4, range: 120,
    desc: '独特な匂いで敵を混乱', 
    stat: 'intelligence', power: 5 },

  { id: 'SMG', type: 'wep', name: 'サブマシンガン', icon: '1', maxLv: 8,
    wepId: 5, range: 150,
    desc: 'MP5,広範囲に弾をばらまく', 
    stat: 'intelligence', power: 15 },

  { id: 'fireWand', type: 'wep', name: '炎の杖', icon: '🔥', maxLv: 8,
    wepId: 6, range: 500,
    desc: '複数を巻き込む爆発を起こす魔法', 
    stat: 'magic', power: 15 },

  { id: 'holyWater', type: 'wep', name: '聖水', icon: '💧', maxLv: 8,
    wepId: 7, range: 250,
    desc: '床に撒き、悪を浄化する', 
    stat: 'magic', power: 15 },

  { id: 'lightning', type: 'wep', name: '雷の指輪', icon: '⚡', maxLv: 8,
    wepId: 8, range: 9999,
    desc: '敵同士をつなぐ高火力な魔法', 
    stat: 'magic', power: 20 },

  { id: 'pentagram', type: 'wep', name: '五芒星', icon: '⭐', maxLv: 8,
    wepId: 9, range: 9999,
    desc: '神の威光', 
    stat: 'magic', power: 10 },

  { id: 'sword', type: 'wep', name: '大剣', icon: '⚔️', maxLv: 8,
    wepId: 10, range: 210,
    desc: '大きく振り回し前方へ攻撃', 
    stat: 'strength', power: 20 },

  { id: 'boomerang', type: 'wep', name: 'ブーメラン', icon: '↩️', maxLv: 8,
    wepId: 11, range: 300,
    desc: '投げたら必ず戻ってくる自動追尾型', 
    stat: 'strength', power: 8 },

  // ★ 新しく確定した wepId（12〜14）
  { id: 'drone', type: 'wep', name: 'ドローン', icon: '🚁', maxLv: 8,
    wepId: 12, range: 300,
    desc: '自動攻撃する頼もしいお供', 
    stat: 'intelligence', power: 13 },

  { id: 'mine', type: 'wep', name: '地雷', icon: '💣', maxLv: 8,
    wepId: 13, range: 9999,
    desc: '踏み抜いた敵を中心に爆発', 
    stat: 'intelligence', power: 15 },

  { id: 'icicle', type: 'wep', name: '氷柱', icon: '❄️', maxLv: 8,
    wepId: 14, range: 700,
    desc: '敵をにぶつかると跳ね返る不思議な氷柱', 
    stat: 'magic', power: 15 },
  // パッシブ能力 (MaxLv: 20)
      { id: 'bible', type: 'swep', name: '聖書', icon: '📕', maxLv: 8,
    swepId: 0, range: 0,
    desc: '自身を守ってくれる神の書物' },



  // 魔力・筋力・知力だけ +1
  { id: 'magic', type: 'stat', name: '魔力の水晶', icon: '🔮', maxLv: 20, baseDesc: '魔力up', unit: '', apply: (p) => p.magic += 1, val: 1 },
  { id: 'strength', type: 'stat', name: '筋力のチーズ', icon: '🧀', maxLv: 20, baseDesc: '筋力up', unit: '', apply: (p) => p.strength += 1, val: 1 },
  { id: 'intelligence', type: 'stat', name: '知力の書', icon: '📖', maxLv: 20, baseDesc: '知力up', unit: '', apply: (p) => p.intelligence += 1, val: 1 },

  // 以下は初期値維持で倍率や固定値を適用
  { id: 'cd', type: 'stat', name: '古びた砂時計', icon: '⌛️', maxLv: 20, baseDesc: 'クールタイム削減', unit: '%', apply: (p) => p.cdMult *= 0.9, val: -10 },
  { id: 'area', type: 'stat', name: 'ロウソク', icon: '🕯️', maxLv: 20, baseDesc: '攻撃範囲', unit: '%', apply: (p) => p.areaMult += 0.15, val: 15 },
  { id: 'projSpeed', type: 'stat', name: '磨かれた水晶', icon: '🔮', maxLv: 20, baseDesc: '弾速', unit: '%', apply: (p) => p.projSpeedMult += 0.1, val: 10 },
  { id: 'speed', type: 'stat', name: '天使の翼', icon: '🪽', maxLv: 20, baseDesc: '移動速度', unit: '%', apply: (p) => p.speed *= 1.1, val: 10 },
  { id: 'maxhp', type: 'stat', name: '蠢く心臓', icon: '❤️', maxLv: 20, baseDesc: '最大HP', unit: '', apply: (p) => { p.maxHp += 20; p.hp += 20; }, val: 20 },
  { id: 'armor', type: 'stat', name: '錆びた鎧', icon: '🛡️', maxLv: 20, baseDesc: '被ダメージ軽減', unit: '', apply: (p) => p.armor += 1, val: 1 },
  { id: 'luck', type: 'stat', name: 'クローバー', icon: '🍀', maxLv: 20, baseDesc: '運気', unit: '%', apply: (p) => p.luck = Math.min(1.0, p.luck + 0.01), val: 1 },
  { id: 'magnet', type: 'stat', name: '磁石', icon: '🧲', maxLv: 20, baseDesc: '回収範囲', unit: 'px', apply: (p) => p.magnet += 30, val: 30 },
  { id: 'amount', type: 'stat', name: '複写の輪', icon: '💍', maxLv: 20, baseDesc: '発射数', unit: '発', apply: (p) => p.amount += 1, val: 1 },
  { id: 'range', type: 'stat', name: 'スコープ', icon: '🔭', maxLv: 20, baseDesc: '攻撃射程', unit: '%', apply: (p) => p.rangeMult += 0.1, val: 10 },
  { id: 'evasion', type: 'stat', name: 'マント', icon: '🥼', maxLv: 20, baseDesc: '回避率 (最大60%)', unit: '%', apply: (p) => p.evasion = Math.min(0.6, p.evasion + 0.03), val: 3 },
  { id: 'regen', type: 'stat', name: '生命の珠', icon: '💚', maxLv: 10, baseDesc: 'HP自動回復', unit: '/秒', apply: (p) => p.regen += 1, val: 1 },




];
// 2. 敵の設定 (変更なし)
// 2. 敵の設定
const ENEMY_TYPES = [
  { time: 0,  name: 'Bat',      hp: 10, speed: 120, size: 10, color: '#aa55ff', exp: 1, type: 'normal' },
  { time: 30, name: 'Skeleton', hp: 20, speed: 70, size: 12, color: '#dddddd', exp: 2, type: 'normal' },
  { time: 60, name: 'Zombie',   hp: 40, speed: 50, size: 14, color: '#4caf50', exp: 3, type: 'normal' },
  { time: 90, name: 'RangedShooter', hp: 30, speed: 40, size: 12, color: '#f44336', exp: 4, type: 'shooter' }, 
  { time: 120,name: 'Charger',  hp: 50, speed: 120, size: 16, color: '#ff9800', exp: 6, type: 'charger' }, 
  { time: 180,name: 'Exploder', hp: 30, speed: 150, size: 12, color: '#000000', exp: 4, type: 'exploder' }, 
  { time: 240,name: 'Splitter', hp: 60, speed: 60, size: 20, color: '#2196f3', exp: 8, type: 'splitter' }, 
  { time: 300,name: 'Mage',     hp: 100,speed: 70, size: 18, color: '#9c27b0', exp: 10, type: 'mage' }, 
  { time: 36000,name: 'Reaper',   hp: 9999,speed: 350,size: 30, color: '#000000', exp: 100, type: 'boss' },
  { time: 42000, name: 'BulletQueen', hp: 25000, speed: 50, size: 40, color: '#ff69b4', exp: 1000, type: 'BulletQueenBoss' },
  { time: 54000, name: 'TeleportHunter', hp: 28000, speed: 250, size: 35, color: '#ffff00', exp: 800, type: 'TeleportHunterBoss' },
  { time: 66000, name: 'ArcMage', hp: 40000, speed: 300, size: 45, color: '#00ccff', exp: 1200, type: 'ArcMageBoss' }
];
const bossTypes = ['BulletQueenBoss', 'ArcMageBoss', 'TeleportHunterBoss'];
// 3. 特別ドロップ
const DROPS = [
  { type: 'coin', color: 'gold', size: 6, icon: '💰', effect: (p) => { score += 100; showFloat(p.x, p.y, "+100G", "gold"); } },
  { type: 'food', color: 'pink', size: 8, icon: '🍕', effect: (p) => { p.hp = Math.min(p.hp+30, p.maxHp); showFloat(p.x, p.y, "Heal!", "pink"); } },
  { type: 'bomb', color: 'black', size: 8, icon: '💣', effect: (p) => { enemies.forEach(e=>takeDamage(e, e.maxHp / 3)); showFloat(p.x, p.y, "BOOM! (-33%)", "red"); } },
  { type: 'freeze', color: 'cyan', size: 8, icon: '❄️', effect: (p) => { freezeTimer = 8; showFloat(p.x, p.y, "Freeze!", "cyan"); } },
  { type: 'meat', color: 'red', size: 8, icon: '🥩', effect: (p) => { p.hp = Math.min(p.hp + p.maxHp * 0.1, p.maxHp); showFloat(p.x, p.y, "Small Heal!", "lightpink"); } },
  { type: 'light', color: 'yellow', size: 8, icon: '✨', effect: (p) => { slowEnemyTimer = 1; showFloat(p.x, p.y, "Slow Field!", "yellow"); } },
  { type: 'fullMagnet', color: 'blue', size: 8, icon: '🧲', effect: (p) => { 
    items.filter(i => i.kind === 'exp').forEach(i => { i.x = p.x; i.y = p.y; }); 
    showFloat(p.x, p.y, "Exp Collect!", "lightblue"); 
  } },
  { type: 'chest', color: 'gold', size: 10, icon: '🎁', effect: (p) => { showLevelUpScreen(true); showFloat(p.x, p.y, "Chest!", "gold"); } }
];

// --- ゲーム変数 (変更なし) ---
function initPlayer(mode = 'normal') {
  player = {
    x: 0, y: 0, size: 15, color: '#00d2ff',
    hp: 100,
    maxHp: 100,
    exp: 0,
    nextExp: 10,
    lv: 1,

    speed: 180,
    armor: 0,
    regen: 0,
    luck: 0.01,
    magnet: 80,
    greed: 1,

    dmgMult: 1.0,
    areaMult: 1.0,
    cdMult: 1.0,
    amount: 0,
    projSpeedMult: 1.0,
    rangeMult: 1.0,
    evasion: 0.0,

    invincibleTimer: 0.1,
    weapons: [{ id: 0, lv: 1, cd: 0 }],
    sweapons: [],
    statLv: {},

    lastMove: { x: 0, y: 0, angle: 0 },
    postPauseTimer: 0,
    isSliding: false,
    levelUpDamageBoost: 1.0,
    Pgot: {},

    bibleBarrier: {
      active: false,
      canBlock: false,
      alpha: 0,
      radius: 40,
      starType: 'pent'
    }
  };

  // ===== EASY補正 =====
  if (mode === 'easy') {
    player.hp = 200;
    player.maxHp = 200;
    player.dmgMult = 1.5;
    exp: 10,
    // 聖書を確実に1つ
    addSpecialWeapon(0);
  }
}

let player = { 
  x: 0, y: 0, size: 15, color: '#00d2ff', 
  hp: 100, maxHp: 100, exp: 0, nextExp: 10, lv: 1, 
  speed: 180, armor: 0, regen: 0, luck: 0.01, magnet: 80, greed: 1,
  dmgMult: 1.0, areaMult: 1.0, cdMult: 1.0, amount: 0, projSpeedMult: 1.0,
  rangeMult: 1.0, evasion: 0.0, 
  invincibleTimer: 0.1, 
  weapons: [ {id:5, lv:1, cd:0}],
   sweapons: [
    // 例:
    
  ],
  statLv: {},
  lastMove: {x:0, y:0, angle: 0}, 
  postPauseTimer: 0,
  isSliding: false,
  levelUpDamageBoost: 1.0,
  Pgot: {},

  // --- 聖書バリア追加 ---
  bibleBarrier: {
    active: false,      // バリアが発動中か
    canBlock: false,    // ダメージを一度だけ防げるか
    alpha: 0,           // フェードイン用透明度
    radius: 40,         // 基本半径（武器Lvで変化させる）
    starType: 'pent',   // 五芒星
  }
  

};
let bullets = [];
let enemyBullets = [];
let enemies = [];
let items = [];
let floaters = []; 
let score = 0;
let killCount = 0;
let frame = 0;// 描画用のみ（ロジックには使わない）
let gameTime = 0;
let isPaused = false;
let freezeTimer = 0;
let slowEnemyTimer = 0; 
let joystick = { active: false, sx:0, sy:0, cx:0, cy:0, dx:0, dy:0, lastMoveAngle: 0 }; 
let bossActive = false;
let bossHp = 0;
let bossMaxHp = 0;
let currentEvent = 'None';
let eventModifiers = { enemyDmgMult: 1.0, speedDamp: 1.0, expMult: 1.0, cdMult: 1.0 };
let meteorWarning = [];
let minEnemySpawnRate = 0.4; 
let meteorSpawnTimer = 0;
let enemySpawnTimer = 0;
let fogActive = false; // 濃い霧が有効かどうか
let bossArrowAlpha = 0; // 透明度（0〜1）
const bossArrowFadeSpeed = 0.05; // フェード速度
const barrier = 0;


const GAME_EVENTS = [
      {id:1,time: 100, name: '', effect: () => {  }, color: 'rgba(0, 0, 0, 0)' },
    {id: 2,time: 60, name: '赤い月', effect: () => { eventModifiers.enemyDmgMult = 1.5; }, color: 'rgba(255, 0, 0, 0.9)' },
    { id: 3,time: 60, name: '濃い霧', effect: () => { fogActive = true; console.log('fog ON');  }, color: 'rgba(50, 50, 50, 0.9)' },
    { id: 4,time: 1, name: '濃い霧', effect: () => { fogActive = false; }, color: 'rgba(0, 0, 0, 0)' },
    { id: 5,time: 60, name: '隕石の雨', effect: () => { /* updateで対応 */ }, color: 'rgba(150, 50, 0, 0.9)' },
    {  id: 6,time: 60, name: '氷河の海', effect: () => { player.isSliding = true; }, color: 'rgba(0, 100, 255, 0.9)' },
    {  id: 7,time: 1, name: '氷河の海', effect: () => { player.isSliding = false; }, color: 'rgba(0, 0, 0, 0)' },
    { id : 8,time: 60, name: '鉛の雨', effect: () => { /* スポーンで対応 */ }, color: 'rgba(100, 100, 100, 0.9)' },
    { id : 9,time: 10, name: '開戦', effect: () => { enemies = []; spawnBoss('BulletQueen'); bossActive = true; }, color: 'rgba(255, 100, 100, 0.9)' },
    { id : 10,time: 60, name: '四面楚歌', effect: () => { spawnAmbush(150); }, color: 'rgba(50, 50, 50, 0.9)' },
    { id : 11,time: 10, name: '高速襲撃', effect: () => { enemies = []; spawnBoss('TeleportHunter'); bossActive = true; }, color: 'rgba(255, 255, 0, 0.8)' },
    {id : 12, time: 60, name: '時の歪み', effect: () => { eventModifiers.cdMult = 0.5; }, color: 'rgba(100, 255, 100, 0.9)' },
    {id : 13,time: 10, name: '魔導の嵐', effect: () => { enemies = []; spawnBoss('ArcMage'); bossActive = true; }, color: 'rgba(0, 150, 255, 0.9)' },
    {id : 14,time: 70, name: '闇の侵攻', effect: () => { ENEMY_TYPES.forEach(t => t.speed *= 1.1); }, color: 'rgba(0, 0, 0, 0.9)' },
    {id : 15, time: 80, name: '天上の祝福', effect: () => { eventModifiers.expMult = 2.0; }, color: 'rgba(255, 255, 255, 0.9)' },
];
//ゲームスタート関数
function startGame(mode) {
  selectedMode = mode;
  gameState = 'playing';
  isPaused = false;
  isGameOver = false;

  enemies.length = 0;
  bullets.length = 0;
  enemyBullets.length = 0;
  items.length = 0;
  floaters.length = 0;

  killCount = 0;
  gameTime = 0;
  score = 0;
  bossActive = false;

  initPlayer(mode);
}

function drawTitleScreen() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';

  ctx.font = '48px Arial';
  ctx.fillText('EAZYMORD', canvas.width / 2, 180);

  ctx.font = '28px Arial';
  ctx.fillText('NORMAL MODE', canvas.width / 2, 300);
  ctx.fillText('EASY MODE', canvas.width / 2, 360);

  ctx.font = '18px Arial';
  ctx.fillText('Click to select', canvas.width / 2, 440);
};

function handleMenuInput(e) {
  if (gameState !== 'title' && !isGameOver) return;

  const rect = canvas.getBoundingClientRect();
  let y;

  if (e.touches) {
    y = e.touches[0].clientY - rect.top;
  } else {
    y = e.clientY - rect.top;
  }

  // ---- タイトル画面 ----
  if (gameState === 'title') {
    if (y > 270 && y < 320) {
      startGame('normal');
    } else if (y > 330 && y < 380) {
      startGame('easy');
    }
  }

  // ---- ゲームオーバー ----
  if (isGameOver) {
    location.reload();
  }
}


// --- ロジック関数群 ---
function addToPgot(key, data) {
  if (!player.Pgot[key]) {
    player.Pgot[key] = {
      lv: 1,
      evolve: 0,
      display: {},
      stats: {}
    };
  }

  const p = player.Pgot[key];

  if (data.display) Object.assign(p.display, data.display);
  if (data.stats) Object.assign(p.stats, data.stats);
}

function getWeaponBaseCD(id) {
  const cds = [0.6, 0.3, 1, 1.65, 1, 0.08, 1.3, 3, 5, 100, 3, 0.74, 2, 5, 0.6]; 
  return cds[id] || 60;
}

function getsWeaponBaseCD(id) {
  const cds = [60]; 
  return cds[id] || 60;
}

function addSpecialWeapon(swepId) {
  const exist = player.sweapons.find(w => w.swepId === swepId);
  if (exist) {
    exist.lv++;
    return;
  }

  player.sweapons.push({
    swepId,
    lv: 1,
    cd: 0
  });
}


function getWeaponRange(wepId) {
    const wepData = UPGRADES.find(u => u.wepId === wepId);
    return wepData ? wepData.range : 0;
}

function showFloat(x, y, txt, col) {
  floaters.push({ x: x, y: y, txt: txt, col: col, life: 1 });
}

function gameOver(win = false) {
    isGameOver = true;
    isPaused = true;
console.log(player.Pgot);

    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    const timeStr =
        String(minutes).padStart(2, '0') +
        ':' +
        String(seconds).padStart(2, '0');

    // ★ Pgot + マスタ統合
    const collectedItems = Object.values(player.Pgot).map(got => {
        const master = UPGRADES.find(u => u.id === got.id);
        return {
            id: got.id,
            lv: got.lv,
            name: master ? master.name : '不明なアイテム',
            icon: master ? master.icon : '？'
        };
    });

    gameOverData = {
        win,
        time: timeStr,
        kills: killCount,
        items: collectedItems
    };

    enemies.length = 0;
    enemyBullets.length = 0;
    bullets.length = 0;
    items.length = 0;
}





function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = '36px Arial';
    ctx.fillText(
        gameOverData.win ? 'GAME CLEAR' : 'GAME OVER',
        canvas.width / 2,
        200
    );

    ctx.font = '24px Arial';
    ctx.fillText(`生存時間: ${gameOverData.time}`, canvas.width / 2, 260);
    ctx.fillText(`撃破数: ${gameOverData.kills}`, canvas.width / 2, 310);

    ctx.fillText('取得アイテム:', canvas.width / 2, 360);

    ctx.font = '20px Arial';

    if (Array.isArray(gameOverData.items)) {
        gameOverData.items.forEach((it, i) => {
            ctx.fillText(
                `- ${it.name ?? '不明なアイテム'}`,
                canvas.width / 2,
                390 + i * 24
            );
        });
    }

    ctx.font = '24px Arial';
    ctx.fillStyle = 'yellow';
    ctx.fillText(
        'クリックで再スタート',
        canvas.width / 2,
        canvas.height - 50
    );
}




let lastEventTime = null; // 前回発火したイベントの time を記憶

function updateHUD() {
  document.getElementById('lv-text').innerText = player.lv;

  // ==== 修正点：時間表示（秒 → mm:ss に正規変換）====
  const totalSec = Math.floor(gameTime);   // ★ 秒を整数化
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;

  document.getElementById('time-text').innerText =
    `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  document.getElementById('kill-text').innerText = killCount;
  document.getElementById('luck-text').innerText = Math.floor(player.luck * 100) + "%";
  document.getElementById('evasion-text').innerText = Math.floor(player.evasion * 100) + "%";

  document.getElementById('hp-bar').style.width =
    (player.hp / player.maxHp * 100) + "%";

  document.getElementById('exp-bar').style.width =
    (player.exp / player.nextExp * 100) + "%";

  if (bossActive) {
    BOSS_HP_BAR.style.display = 'block';
    BOSS_HP_FILL.style.width =
      (bossHp / bossMaxHp * 100) + "%";
  } else {
    BOSS_HP_BAR.style.display = 'none';
  }






}




function getNextEvent() {
    // id の昇順でソート（初回だけやると効率的）
    const sortedEvents = GAME_EVENTS.slice().sort((a,b) => a.id - b.id);

    // currentEventIndex より大きい id の中で最小のものを探す
    return sortedEvents.find(e => e.id > currentEventIndex);
}

function updateEvents(deltaTime, gameTime) {
  if (!isPaused) {

    const bossAlive = enemies.some(e => bossTypes.includes(e.type));

    // 現在イベントがない、または残り時間ゼロでボスもいなければ次のイベント
    if ((currentEventIndex === -1 || currentEventRemaining <= 0) && !bossAlive) {
        const nextEvent = getNextEvent(); // id 小さい順に取得
        if (nextEvent) {
            currentEventIndex = nextEvent.id;
            currentEventRemaining = nextEvent.time;
            currentEvent = nextEvent.name;

            console.log(`[EVENT START] ${currentEvent} | Duration: ${currentEventRemaining.toFixed(2)}s`);

            // 発動演出
            const overlay = document.getElementById('event-animation-overlay');
            document.getElementById('event-message').innerText = `EVENT: ${currentEvent}`;
            overlay.style.backgroundColor = nextEvent.color;
            overlay.classList.add('event-flash');
            nextEvent.effect();

            setTimeout(() => {
                overlay.classList.remove('event-flash');
                overlay.style.backgroundColor = 'transparent';
            }, 500);
        }
    }

    // 残り時間を減らす（ボスが生きていなければ）
    if (!bossAlive && currentEventRemaining > 0) {
        currentEventRemaining -= deltaTime;

        // 毎フレーム残り時間を表示
        console.log(`[EVENT RUNNING] ${currentEvent} | Remaining: ${currentEventRemaining.toFixed(2)}s`);

        if (currentEventRemaining <= 0) {
            // イベント終了時のリセット
            console.log(`[EVENT END] ${currentEvent}`);
            switch (currentEvent) {
                case '赤い月': eventModifiers.enemyDmgMult = 1.0; break;
                case '時の歪み': eventModifiers.cdMult = 1.0; break;
                case '天上の祝福': eventModifiers.expMult = 1.0; break;
                case '氷河の海': player.isSliding = false; break;
                case '濃い霧': fogActive = false; break;
            }
            document.getElementById('event-message').innerText = '';
            eventModifiers.speedDamp = 1.0;
            currentEvent = 'None';
        }
    }
}  }


function dropItem(x, y, expVal) {
  items.push({ kind: 'exp', x: x, y: y, val: expVal });
  if (Math.random() < player.luck) {
    let rare = DROPS[rnd(DROPS.length)];
    items.push({ kind: 'drop', x: x, y: y, data: rare });
  }
}

function takeDamage(e, amount) {
  e.hp -= amount;
  showFloat(e.x, e.y, Math.floor(amount), "white");
  
  if (e.hp <= 0) {
    enemies = enemies.filter(x => x !== e);
    killCount++;
    
    // 特殊な敵の死亡時処理
    if(e.type === 'exploder') {
        let size = 100 * player.areaMult;
        showFloat(e.x, e.y, "BOOM!", "red");
        enemies.forEach(other => {
            if(Math.hypot(e.x-other.x, e.y-other.y) < size) takeDamage(other, 30 * player.dmgMult);
        });
    } 
    else if(e.type === 'splitter') {
        spawnEnemy('Bat', e.x + 10, e.y + 10);
        spawnEnemy('Bat', e.x - 10, e.y - 10);
    } 
    else if (e.type.includes('Boss')) {
        bossActive = false;
        dropItem(e.x, e.y, e.exp); 
        
        if (gameTime >= 660 && !enemies.some(boss => boss.type.includes('Boss'))) {
            gameOver(true);
        }
        return;
    }
    
    // 通常敵のドロップ
    dropItem(e.x, e.y, e.exp);
  }
}



// 雷演出＆ロジック
function lightningEffect(target, baseDmg, maxChains) {

  let currentTarget = target;
  const targetsHit = new Set();
  targetsHit.add(currentTarget);

  let chainCount = 0;
  let dmg = baseDmg;

  while (currentTarget && chainCount <= maxChains) {

    // ✅ ダメージ（減衰あり）
    takeDamage(currentTarget, dmg);
    dmg *= 0.85; // 連鎖ごとに15%減衰

    // ✅ 雷エフェクト（即時）
    for (let i = 0; i < 3; i++) {
      floaters.push({
        x: currentTarget.x + rnd(currentTarget.size * 2) - currentTarget.size,
        y: currentTarget.y + rnd(currentTarget.size * 2) - currentTarget.size,
        txt: '⚡',
        col: 'yellow',
        life: 0.7
      });
    }

    if (chainCount >= maxChains) break;

    // ✅ 次のターゲット探索（レンジ依存）
    let nextTarget = null;
    let minD = Infinity;

    const chainRange =
      200 * player.rangeMult * player.areaMult;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];

      if (!targetsHit.has(e)) {
        const d = Math.hypot(
          currentTarget.x - e.x,
          currentTarget.y - e.y
        );

        if (d < minD && d < chainRange) {
          minD = d;
          nextTarget = e;
        }
      }
    }

    if (!nextTarget) break;

    // ✅ 視覚用の稲妻ライン（0.15秒）
    bullets.push({
      type: 'lightningChain',
      x: currentTarget.x,
      y: currentTarget.y,
      targetX: nextTarget.x,
      targetY: nextTarget.y,
      life: 0.15,
      size: 2
    });

    targetsHit.add(nextTarget);
    currentTarget = nextTarget;
    chainCount++;
  }
}

function fireSpecialWeapon(w) {
  switch (w.swepId) {

    case 0: { // 聖書
      if (!player.bibleBarrier) {
        player.bibleBarrier = {
          x: player.x,
          y: player.y,
          alpha: 0.5,
          active: true,
          canBlock: true,
          radius: 40 + w.lv * 5 * player.areaMult,
          starType: 'pent'
        };
      } else {
        const b = player.bibleBarrier;
        b.active = true;
        b.canBlock = true;
        b.alpha = 0.5;
        b.radius = 40 + w.lv * 5 * player.areaMult;
      }
      break;
    }

  }
}

// ⭐ 武器の発射ロジック（全武器ロジック統合）
function fireWeapon(w) {
  const count = 1 + player.amount;
  const baseDmg = 10;
  const dmg = baseDmg * player.dmgMult * (1 + (w.lv - 1) * 0.1);
  const baseProjSpeed = 420;
  const projSpeed = baseProjSpeed * player.projSpeedMult;

  const getDir = () => joystick.active ? Math.atan2(joystick.cy-joystick.sy, joystick.cx-joystick.sx) : player.lastMove.angle;

  let { enemy: target, dist: targetDist } = getNearestEnemy();
  let wepRange = getWeaponRange(w.id) * player.rangeMult * player.areaMult;

  // ターゲットがいない、または射程外の場合は発射をキャンセルする武器
  if (targetDist > wepRange && w.id !== 4 && w.id !== 9 && w.id !== 13 && w.id !== 12 && w.id !== 8 && w.id !== 5 && w.id !== 7) return;

  
  switch(w.id) {
    case 0: // 魔法の杖 (Wand)
      for(let i=0; i<count; i++) {
        if(target) {
          let angle = Math.atan2(target.y - player.y, target.x - player.x);
          angle += (i - count/2) * 0.2;
          bullets.push({ type: 'normal', x: player.x, y: player.y, vx: Math.cos(angle)*projSpeed, vy: Math.sin(angle)*projSpeed, life: 1, dmg: dmg, size: 5 + w.lv, pierce: 1 });
        }
      }
      break;
    case 1: // 投げナイフ (Knife)
        for(let i=0; i<count; i++) {
            if(target) {
                let angle = Math.atan2(target.y - player.y, target.x - player.x);
                angle += (i - count/2) * rad(10);
                bullets.push({ type: 'knife', x: player.x, y: player.y, vx: Math.cos(angle)*projSpeed*1.5, vy: Math.sin(angle)*projSpeed*1.5, life: 0.66, dmg: dmg, size: 4, pierce: 1 });
            }
        }
        break;
case 2: { // 斧 (Axe)
    const currentMoveAngle = getDir(); 
    const initialSpeed = projSpeed * 1.5;

    const gravityDirection = Math.random() < 0.5 ? 1 : -1;
    const gravity = gravityDirection * (200 + 200 * Math.random()); // px/sec²

    bullets.push({ 
        type: 'axe', 
        x: player.x, y: player.y, 
        vx: Math.cos(currentMoveAngle) * initialSpeed, 
        vy: Math.sin(currentMoveAngle) * initialSpeed, 
        life: 1, 
        dmg: dmg * 1.5, 
        size: 16 * player.areaMult,
        pierce: 2, 
        rot: 0,
        gravity: gravity
    });
    break;
}

case 3: // 十字架 (Cross)
    if (target) {
        let angle = Math.atan2(target.y - player.y, target.x - player.x);
        let crossSpeed = projSpeed * 0.7;

        bullets.push({
            type: 'cross',
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * crossSpeed,
            vy: Math.sin(angle) * crossSpeed,
            life: 1.32,  // 秒
            dmg: dmg * 0.3,
            size: 6,
            pierce: 99,
            target: target
        });
    }
    break;

    case 4: // ニンニク (Garlic)
        // ニンニクは一度取得すると、永続的なオーラ弾として `bullets` に存在する。
        // ここではまだニンニク弾が存在しない場合のみ生成する。
        if (!bullets.some(b => b.type === 'garlic')) {
            let garlicSize = 50 + w.lv * 15 * player.areaMult;
            bullets.push({ type: 'garlic', x: player.x, y: player.y, dmg: dmg, size: garlicSize, life: Infinity, pierce: 99 });
        } else {
             // すでに存在する場合は範囲と威力を更新（クールダウンは単なるインターバルとして機能）
            let garlic = bullets.find(b => b.type === 'garlic');
            garlic.size = 50 + w.lv * 15 * player.areaMult;
            garlic.dmg = dmg;
        }
        break;
// case 5: smg
case 5: { // SMG
  if (!target) break;

  const baseAngle = Math.atan2(
    target.y - player.y,
    target.x - player.x
  );

  const spread = rad(25); // ブレ幅（大きいほど下手）
  
  for (let i = 0; i < count; i++) {
    // ランダムブレ
    const angle =
      baseAngle +
      (Math.random() - 0.5) * spread;

    bullets.push({
      type: 'SMG',
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * projSpeed * 1.2,
      vy: Math.sin(angle) * projSpeed * 1.2,
      life: 0.6,
      dmg: dmg*0.7,
      size: 3,
      pierce: 0,
    });
  }
  break;
}




    case 6: // 炎の杖 (FireWand)
        if(target) {
            let angle = Math.atan2(target.y - player.y, target.x - player.x);
            let fireSpeed = projSpeed * 1.2;
            let explosionSize = 50 + w.lv * 10 * player.areaMult;
            bullets.push({ type: 'fire', x: player.x, y: player.y, vx: Math.cos(angle)*fireSpeed, vy: Math.sin(angle)*fireSpeed, life: 0.66, dmg: dmg, size: 6, pierce: 1, explosionSize: explosionSize });
        }
        break;
case 7: { // Holy Water Bottle

    const nearest = getNearestEnemy();
    let target = nearest ? nearest.enemy : null;

    let angle;

    if (target) {
        // 敵がいる時
        angle = Math.atan2(target.y - player.y, target.x - player.x);
    } else {
        // 敵がいない時 → ランダム方向に投げる（安全）
        angle = Math.random() * Math.PI * 2;
    }

    const speed = 350 * player.projSpeedMult;

    const bottle = createHolyWaterBottle(
        player.x,
        player.y,
        angle,
        speed,
        dmg
    );

    bullets.push(bottle);
    break;
}


    case 8: // 雷の指輪 (Lightning)
        if (target) {
            // 雷の連鎖の起点
            lightningEffect(target, dmg * (1 + w.lv * 0.5), w.lv); 
        }
        break;
case 9: // 五芒星 (Pentagram)
    enemies.forEach(e => {
        if (bossTypes.includes(e.type)) {
            // ボスは1割ダメージ
            takeDamage(e, e.maxHp * 0.1);
        } else {
            // 一般敵は50% + w.lv*5% のダメージ
            const damageRate = 0.45 + 0.05 * w.lv;
            takeDamage(e, e.maxHp * damageRate);
        }
    });
    showFloat(player.x, player.y, "PURGE!", "red");
    break;


    case 10: // 剣 (Sword)
        if(target) {
             let swordAngle = Math.atan2(target.y - player.y, target.x - player.x);
             let swingRange = wepRange;
             // 持続時間10フレームの剣エフェクトを追加
             bullets.push({ 
                 type: 'sword', 
                 x: player.x, y: player.y, 
                 dmg: dmg * 3, 
                 size: swingRange, 
                 angle: swordAngle, 
                 life: 0.17, 
                 pierce: 99, 
                 hitEnemies: new Set() 
             });
        }
        break;
    case 11: // ブーメラン (Boomerang)
        if(target) {
            let angle = Math.atan2(target.y - player.y, target.x - player.x);
            bullets.push({ 
                type: 'boomerang', 
                x: player.x, y: player.y, 
                vx: Math.cos(angle)*projSpeed, vy: Math.sin(angle)*projSpeed, 
                life: 3, dmg: dmg, size: 8, pierce: 1 + w.lv, 
                originX: player.x, originY: player.y, 
                return: false 
            });
        }
        break;
case 12: // ドローン (Drone)
    // ドローンが未作成なら作成
    if (!bullets.some(b => b.type === 'drone')) {
        bullets.push({
            type: 'drone',
            x: player.x,
            y: player.y,
            dmg: dmg,
            size: 10,
            life: Infinity,
            pierce: 99,
            cdTimer: 0
        });
    } else {
        // 既にあるなら威力だけ更新
        let drone = bullets.find(b => b.type === 'drone');
        drone.dmg = dmg;
    }
    break;
    case 13: // 地雷 (Mine)
        // 移動した直後に地雷を設置
        const mineLifetime = 6 + w.lv * 1;
        const explosionSize = 50 * player.areaMult;
        bullets.push({ 
            type: 'mine', 
            x: player.x, y: player.y, 
            dmg: dmg * 5, 
            size: 8, 
            life: mineLifetime, 
            pierce: 99, 
            isTriggered: false,
            explosionSize: explosionSize
        });
        break;
    case 14: // 氷柱 (Icicle)
        if (target) {
            let angle = Math.atan2(target.y - player.y, target.x - player.x);
            bullets.push({ 
                type: 'icicle', 
                x: player.x, y: player.y, 
                vx: Math.cos(angle)*projSpeed, vy: Math.sin(angle)*projSpeed, 
                life: 1, dmg: dmg, size: 5, 
                pierce: 1 + w.lv, // 反射回数も兼ねる
                lastHit: new Map(), 
                reflectionCount: 0 
            });
        }
        break;
  }
}


function spawnEnemy(typeOverride, startX, startY) {
  let type;
  if (typeOverride) {
    type = ENEMY_TYPES.find(t => t.name === typeOverride);
  } else {
    let availableTypes = ENEMY_TYPES.filter(t => t.time <= gameTime && t.type !== 'boss' && t.name !== 'Reaper' && !t.type.includes('Boss'));
    
    if (currentEvent === '鉛の雨') {
        availableTypes = availableTypes.filter(t => t.type === 'shooter' || t.type === 'mage');
    }

    let idx = rnd(availableTypes.length);
    type = availableTypes[idx];
  }
  
  if (!type) return;

  let angle = Math.random() * Math.PI * 2;
  let dist = Math.max(canvas.width, canvas.height) / 2 + 100;
  
  let baseHp = type.hp * (1 + gameTime * 0.01);


  enemies.push({ 
    x: startX !== undefined ? startX : player.x + Math.cos(angle) * dist, 
    y: startY !== undefined ? startY : player.y + Math.sin(angle) * dist, 
    hp: baseHp,
    maxHp: baseHp,
    speed: type.speed, 
    color: type.color, 
    exp: type.exp,
    type: type.type,
    size: type.size, 
    state: 'move', // move, idle, charge
    cd: 0,
    chargeTimer: 0,
    chargeAngle: 0
  });
}

function spawnBoss(name) {
    const bossData = ENEMY_TYPES.find(t => t.name === name);
    if (!bossData) return;

    const angle = rnd(360) * rad(1);
    const radius = Math.max(canvas.width, canvas.height) / 2 + 100;
    const bossX = player.x + Math.cos(angle) * radius;
    const bossY = player.y + Math.sin(angle) * radius;

    const newBoss = {
        x: bossX, y: bossY, 
        hp: bossData.hp, maxHp: bossData.hp, 
        speed: bossData.speed, 
        size: bossData.size, 
        color: bossData.color, 
        exp: bossData.exp, 
        type: bossData.type,
        typeData: bossData,
        cd: 0,
        state: 'move', // move, idle, charge
        patternTimer: 0, 
        attackPhase: 0,
        tempAngle: 0,
        vx: 0, vy: 0 
    };
    enemies.push(newBoss);
    bossHp = newBoss.hp;
    bossMaxHp = newBoss.maxHp;
    bossActive = true;
}

function fireEnemyBullet(e, isBoss=false, angle=0, type='normal', speedMult=1.0) {
    let targetAngle = angle || Math.atan2(player.y - e.y, player.x - e.x);
    let speed = (isBoss ? 5 : 4) * speedMult;
    let dmg = isBoss ? 15 : 5;
    
    enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(targetAngle)*speed, vy: Math.sin(targetAngle)*speed, size: 5, dmg: dmg, type: type, life: 5 });
}

// 雑魚敵をプレイヤーの周囲に大量に召喚
function spawnAmbush(count, self) {
    const radius = 500; // 円の半径
    const center = self ?? player; // selfが渡されなければplayer中心

    // --- 1. 最初の雑魚召喚 ---
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(angle) * radius;
        spawnEnemy('Bat', x, y);
    }
    showFloat(center.x, center.y, "Ambush!", "red");

    // --- 2. 10秒後にSkeleton召喚 ---
    setTimeout(() => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            spawnEnemy('Skeleton', x, y);
        }
        showFloat(center.x, center.y, "Skeleton Incoming!", "orange");
    }, 10000); // 10秒後

    // --- 3. さらに15秒後（合計25秒）にZombie召喚 ---
    setTimeout(() => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            spawnEnemy('Zombie', x, y);
        }
        showFloat(center.x, center.y, "Zombie Incoming!", "green");
    }, 25000); // 15秒後

        setTimeout(() => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            spawnEnemy('Zombie', x, y);
        }
        showFloat(center.x, center.y, "Zombie Incoming!", "green");
    }, 35000);setTimeout(() => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            spawnEnemy('Zombie', x, y);
        }
        showFloat(center.x, center.y, "Zombie Incoming!", "green");
    }, 37000);setTimeout(() => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            spawnEnemy('Zombie', x, y);
        }
        showFloat(center.x, center.y, "Zombie Incoming!", "green");
    }, 39000);setTimeout(() => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            spawnEnemy('Zombie', x, y);
        }
        showFloat(center.x, center.y, "Zombie Incoming!", "green");
    }, 2000);

}



function getUpgradeDescription(upgrade) {

  // --- 通常武器 ---
  if (upgrade.type === 'wep') {
    return upgrade.desc ?? '';
  }

  // --- 特殊武器（swep） ---
  if (upgrade.type === 'swep') {
    return upgrade.desc ?? '';
  }

  // --- ステータス ---
  if (upgrade.type === 'stat') {
    const cur = player.statLv[upgrade.id] || 0;
    return `${upgrade.baseDesc} +${upgrade.val}（Lv ${cur + 1} / ${upgrade.maxLv}）`;
  }

  return '';
}

function selectUpgrade(upgrade) {
    isPaused = false;
    document.getElementById('levelup-screen').style.display = 'none';

    // ===== Pgot 初期化保険 =====
    if (!player.Pgot) player.Pgot = {};

    // ===== 通常武器 =====
    if (upgrade.type === 'wep') {

        let w = player.weapons.find(w => w.id === upgrade.wepId);
        if (w) {
            if (w.lv < upgrade.maxLv) w.lv++;
        } else {
            player.weapons.push({ id: upgrade.wepId, lv: 1, cd: 0 });
        }

    // ===== サブ武器（SWEＰ）=====
    } else if (upgrade.type === 'swep') {

        let sw = player.sweapons.find(w => w.id === upgrade.swepId);
        if (sw) {
            if (sw.lv < upgrade.maxLv) sw.lv++;
        } else {
            player.sweapons.push({ id: upgrade.swepId, lv: 1, cd: 0 });
        }

    // ===== ステータス =====
    } else if (upgrade.type === 'stat') {

        let currentLv = player.statLv[upgrade.id] || 0;
        if (currentLv < upgrade.maxLv) {
            if (typeof upgrade.apply === 'function') {
                upgrade.apply(player);
            }
            player.statLv[upgrade.id] = currentLv + 1;
        }

    } else {
        // 想定外 type の保険
        console.warn('Unknown upgrade type:', upgrade);
        return;
    }

    // ===== Pgot 共通処理 =====
    if (!player.Pgot[upgrade.id]) {
        player.Pgot[upgrade.id] = { id: upgrade.id, lv: 1 };
    } else {
        player.Pgot[upgrade.id].lv++;
    }
}




function checkLevelUp() {
    while (player.exp >= player.nextExp) {
        player.exp -= player.nextExp;
        player.lv++;
        player.nextExp = Math.floor(player.nextExp * 1.2) + 5;
        showLevelUpScreen();
        return;
    }
}

function showLevelUpScreen() {
  isPaused = true;
  document.getElementById('levelup-screen').style.display = 'flex';

  const cardList = document.getElementById('card-list');
  cardList.innerHTML = '';

  const availableUpgrades = getAvailableUpgrades();
  const chosen = [];

  while (chosen.length < 3 && availableUpgrades.length > 0) {
    const index = rnd(availableUpgrades.length);
    chosen.push(availableUpgrades[index]);
    availableUpgrades.splice(index, 1);
  }

  chosen.forEach(upgrade => {
    const card = document.createElement('div');
    card.className = 'card';

    // アイコン部分を自作描画対応
    let iconHTML = '';
    if (upgrade.icon === '1') {
      // canvas で描く場合は <canvas> を挿入
      iconHTML = `<canvas class="card-canvas-icon" width="40" height="40"></canvas>`;
    } else {
      iconHTML = upgrade.icon;
    }

    card.innerHTML = `
      <div class="card-icon">${iconHTML}</div>
      <div class="card-info">
        <h3>${upgrade.name}</h3>
        <p>${getUpgradeDescription(upgrade)}</p>
      </div>
    `;

    card.onclick = () => selectUpgrade(upgrade);
    cardList.appendChild(card);
if (upgrade.icon === '1') {
const canvas = card.querySelector('.card-canvas-icon');
const ctx = canvas.getContext('2d');
ctx.clearRect(0, 0, canvas.width, canvas.height);

// ====== 基準 ======
const baseY = 14;          // ノズル・銃身・ストック共通の高さ
const bodyStartX = 12;
const bodyWidth = 14;
const bodyHeight = 4;

// ====== 銃身 ======
ctx.fillStyle = '#1a1a1a'; // 少し黒寄りの灰色
ctx.fillRect(bodyStartX, baseY, bodyWidth, bodyHeight);

// ====== ノズル ======
ctx.fillRect(bodyStartX + bodyWidth, baseY + 1, 3, bodyHeight - 2);

// ====== ストック（一直線）=====
ctx.fillRect(bodyStartX - 8, baseY + 1, 8, bodyHeight - 2);

// ====== グリップ（銃身右端とX揃え）=====
const gripWidth = 4;
const gripHeight = 6;
const gripRightX = bodyStartX + bodyWidth; // ★ここが重要

ctx.fillRect(
  gripRightX - gripWidth,
  baseY + bodyHeight,
  gripWidth,
  gripHeight
);

// ====== マガジン（任意・中央下）=====
ctx.beginPath();
ctx.moveTo(bodyStartX + 6, baseY + bodyHeight);
ctx.quadraticCurveTo(
  bodyStartX + 8,
  baseY + bodyHeight + 12,
  bodyStartX + 10,
  baseY + bodyHeight
);
ctx.fill();

}



  });

  // --- 装備表示（Pgot名対応・未進化でも壊れない） ---
// 装備表示（安全版）
const invDiv = document.getElementById('current-inventory');
invDiv.innerHTML = '装備: ';

player.weapons.forEach(w => {
    const item = getWeaponItem(w.id);
    if (item) {
        invDiv.innerHTML += `<span class="inv-list-item">${item.icon} ${item.name} Lv${w.lv}</span>`;
    } else {
        invDiv.innerHTML += `<span class="inv-list-item">?? Lv${w.lv}</span>`;
    }
});

player.sweapons.forEach(w => {
    const item = getSwepItem(w.swepId);
    if (item) {
        invDiv.innerHTML += `<span class="inv-list-item">${item.icon} ${item.name} Lv${w.lv}</span>`;
    } else {
        invDiv.innerHTML += `<span class="inv-list-item">?? Lv${w.lv}</span>`;
    }
});

}

function getAvailableUpgrades() {
  const list = [];

  UPGRADES.forEach(u => {
    let lv = 0;

    if (u.type === 'wep') {
      lv = player.weapons.find(w => w.id === u.wepId)?.lv || 0;
    }
    else if (u.type === 'swep') {
      lv = player.sweapons.find(w => w.swepId === u.swepId)?.lv || 0;
    }
    else {
      lv = player.statLv[u.id] || 0;
    }

    if (lv < u.maxLv) list.push(u);
  });

  return list;
}




// --- メインループ ---
function init() {
  player.x = 0;
  player.y = 0;
  lastTime = performance.now();
  requestAnimationFrame(loop);
  getNextEvent()
}

let lastTime = performance.now();

function loop(now) {

  // ===== タイトル画面 =====
  if (gameState === 'title') {
    lastTime = now;           // ★ 時間リセット
    drawTitleScreen();        // タイトル描画のみ
    requestAnimationFrame(loop);
    return;
  }

  // ===== ゲーム中 =====
  const deltaTime = (now - lastTime) / 1000;
  lastTime = now;
  //無敵設定計測
if (player.invincibleTime > 0) {
  player.invincibleTime -= deltaTime;
  if (player.invincibleTime < 0) player.invincibleTime = 0;
}

  if (!isPaused) {
    update(deltaTime);
  }

  draw();
  updateHUD();
updateEvents(deltaTime, gameTime)
  frame++;
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);


function update(deltaTime) {
 if (deltaTime <= 0) return;
  if (freezeTimer > 0) freezeTimer -= deltaTime;
  if (slowEnemyTimer > 0) slowEnemyTimer -= deltaTime;

  // 0. イベント '隕石の雨' の処理
meteorSpawnTimer = (meteorSpawnTimer || 0) - deltaTime;

if (currentEvent === '隕石の雨' && meteorSpawnTimer <= 0) {
  meteorSpawnTimer = 0.25; // 秒

  for (let i = 0; i < 3; i++) {
    let offsetX = (Math.random() - 0.5) * 600;
    let offsetY = (Math.random() - 0.5) * 600;

    meteorWarning.push({
      x: player.x + offsetX,
      y: player.y + offsetY,
      radius: 50,
      timer: 1.0   // 1秒後に着弾
    });
  }
}


  // 1. 移動 (慣性/スライディング実装)
  // 慣性移動（スライディング）のロジックが特徴的
  let inputDx = 0, inputDy = 0;
  let moveX = 0, moveY = 0;

  if (joystick.active) {

    if (player.isSliding) {
      inputDx = joystick.cx - joystick.sx;
      inputDy = joystick.cy - joystick.sy;

      let angle = Math.atan2(inputDy, inputDx);
      let dist = Math.min(50, Math.hypot(inputDx, inputDy));

      // 慣性力 (SLIDE_INERTIA: 98%) + 入力補正力 (SLIDE_INPUT_CORRECTION: 2%)
      joystick.dx = joystick.dx * SLIDE_INERTIA + Math.cos(angle) * dist * SLIDE_INPUT_CORRECTION;
      joystick.dy = joystick.dy * SLIDE_INERTIA + Math.sin(angle) * dist * SLIDE_INPUT_CORRECTION;

    } else {
      joystick.dx = joystick.cx - joystick.sx;
      joystick.dy = joystick.cy - joystick.sy;
    }

    if (joystick.dx !== 0 || joystick.dy !== 0) {
      player.lastMove.angle = Math.atan2(joystick.dy, joystick.dx);
    }
  } else if (player.isSliding) {
    // 慣性のみ: 減速を弱く (強化)
    joystick.dx *= SLIDE_INERTIA;
    joystick.dy *= SLIDE_INERTIA;
  } else {
    // 通常停止: 即座に停止
    joystick.dx = 0;
    joystick.dy = 0;
  }

  let currentSpeed = Math.hypot(joystick.dx, joystick.dy);
  let maxSpeed = 50;
  if (currentSpeed > maxSpeed) {
    let ratio = maxSpeed / currentSpeed;
    joystick.dx *= ratio;
    joystick.dy *= ratio;
  }

let finalSpeed = player.speed; // 秒速
let nextX = player.x + (joystick.dx / maxSpeed) * finalSpeed * deltaTime;
let nextY = player.y + (joystick.dy / maxSpeed) * finalSpeed * deltaTime;


  player.x = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2, nextX));
  player.y = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2, nextY));

// --- 前: プレイヤー移動やスキル更新など ---


// --- 後: 敵や弾丸との衝突判定に続く ---
//スペシャル武器

  // 2. 武器の発射制御
// 2. 特殊武器（swep）のクールダウン制御
player.sweapons.forEach(w => {
  if (w.cd > 0) {
    w.cd -= deltaTime;
    return;
  }

  // 発動条件チェック
  if (canActivateSwep(w)) {
    fireSpecialWeapon(w);
    w.cd = getsWeaponBaseCD(w.swepId) * player.cdMult * eventModifiers.cdMult;
  }
});



  // 2. 武器の発射制御
player.weapons.forEach(w => {
  if (w.cd > 0) {
    w.cd -= deltaTime;
  } else {
    fireWeapon(w);
    w.cd = getWeaponBaseCD(w.id) * player.cdMult * eventModifiers.cdMult;
  }
});


  // 3. 弾の移動 & 寿命 (味方)
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];

    const baseProjSpeed = 7;
    const projSpeed = baseProjSpeed * player.projSpeedMult;

if (b.type === 'boomerang') {

  if (b.flyTime === undefined) b.flyTime = 0;
  b.flyTime += deltaTime;

  // ✅ 最初の 0.35 秒は必ず前進
  if (!b.return && b.flyTime > 1) {
    b.return = true;
  }

  if (b.return) {
    let angle = Math.atan2(player.y - b.y, player.x - b.x);
    let speed = Math.hypot(b.vx, b.vy);
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
  }

  b.x += b.vx * deltaTime;
  b.y += b.vy * deltaTime;

  // ✅ プレイヤーに戻ったら消滅
  if (
    b.return &&
    Math.hypot(b.x - player.x, b.y - player.y) < player.size
  ) {
    bullets.splice(i, 1);
    continue;
  }
}

else if (b.type === 'drone') {

  const { enemy: target, dist: targetDist } = getNearestEnemy();

  // ドローンはプレイヤーに常に追従
  b.x = player.x;
  b.y = player.y;

  if (b.cdTimer === undefined) b.cdTimer = 0;
  b.cdTimer -= deltaTime;

  const droneRange =
    getWeaponRange(12) * player.rangeMult * player.areaMult;

  if (target && targetDist < droneRange && b.cdTimer <= 0) {

    b.cdTimer = 0.5;  // 0.5秒クールダウン

    const angle = Math.atan2(target.y - b.y, target.x - b.x);

    bullets.push({
      type: 'normal',
      x: b.x,   // ← ❗絶対にこれ（deltaTime を掛けない）
      y: b.y,   // ← ❗絶対にこれ
      vx: Math.cos(angle) * projSpeed*60,
      vy: Math.sin(angle) * projSpeed*60,
      life: 1.5,
      dmg: b.dmg,
      size: 3,
      pierce: 1
    });
  }
}



    else if (b.type === 'mine') {
      if (!b.isTriggered) {
        enemies.forEach(e => {
          if (Math.hypot(b.x - e.x, b.y - e.y) < b.size + e.size) {
            b.isTriggered = true;
            showFloat(b.x, b.y, "MINE!", "orange");
            enemies.forEach(other => {
              if (Math.hypot(b.x - other.x, b.y - other.y) < b.explosionSize) takeDamage(other, b.dmg);
            });
            bullets.splice(i, 1);
          }

        });
      }
    }
    else if (b.type === 'sword') {
      // 剣はプレイヤーに追従
      b.x = player.x;
      b.y = player.y;
    }
    else if (b.type === 'garlic') {
      b.x = player.x; b.y = player.y;
    }
    // --- 聖水瓶（holyWaterBottle）専用処理 ---
else if (b.type === 'holyWaterBottle') {

    // 移動
    b.x += b.vx * deltaTime;
    b.y += b.vy * deltaTime;

    // 寿命減少
    b.life -= deltaTime;

    // 敵に衝突したか確認
    let hitEnemy = null;
    for (let e of enemies) {
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.size + e.size) {
            hitEnemy = e;
            break;
        }
    }

    // （1）敵に当たった → 破裂
    // （2）寿命切れ → 破裂
    if (hitEnemy || b.life <= 0) {
        createHolyWater(b.x, b.y, b.dmg); // 聖水生成
        b.remove = true;
    }

}

    else if (
    b.type !== 'holyWater' &&
    b.type !== 'holyWaterBottle' &&
    b.type !== 'lightningChain'
) {

      b.x += b.vx * player.projSpeedMult * deltaTime;
      b.y += b.vy * player.projSpeedMult * deltaTime;


      if (b.type === 'axe') { b.vy += 0.3; b.rot = (b.rot || 0) + 0.05; }




      if (b.type === 'cross' && b.target) {
        // ターゲットが死んでいたら最も近い敵に切り替え
        if (enemies.includes(b.target)) {
          let angle = Math.atan2(b.target.y - b.y, b.target.x - b.x);
          b.vx = Math.cos(angle) * projSpeed * 70;
          b.vy = Math.sin(angle) * projSpeed * 70;
        } else {
          let { enemy: newTarget } = getNearestEnemy();
          b.target = newTarget;
          if (!newTarget) b.life = 0; // ターゲットがいなければ消滅
        }
      }
    }

b.life -= deltaTime;
    if (b.life <= 0) {
      if (b.type === 'fire' && !b.isExploded) {
        // 火の玉が寿命を迎えたときに爆発
        enemies.forEach(e => {
          if (Math.hypot(b.x - e.x, b.y - e.y) < b.explosionSize) takeDamage(e, b.dmg * 2);
        });
        showFloat(b.x, b.y, "🔥Explode", "red");
      }

      bullets.splice(i, 1);
    }
  }


// 4. 敵の生成 & 移動
enemySpawnTimer = (enemySpawnTimer || 0) - deltaTime;

// 移動倍率の再初期化（累積バグ防止）
enemySpeedMult = 1.0;
if (freezeTimer > 0) enemySpeedMult = 0;
if (slowEnemyTimer > 0) enemySpeedMult *= (2 / 3);

// スポーンレート（秒）
let baseSpawnRate = Math.max(minEnemySpawnRate, 2.5 - gameTime * 0.01);


if (currentEvent === '闇の侵攻') baseSpawnRate /= 2;

if (enemySpeedMult > 0) {

  // --- 敵スポーン ---
  if (!bossActive && gameTime < 420 && enemySpawnTimer <= 0) {
    enemySpawnTimer = baseSpawnRate;
    spawnEnemy();
  }

  // --- 敵移動 ---
  enemies.forEach(e => {

    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    const angle = Math.atan2(player.y - e.y, player.x - e.x);

    e.cd = (e.cd || 0) - deltaTime;
    const moveSpeed = e.speed * enemySpeedMult * deltaTime;

    // === ボス共通 ===
    if (e.type.includes('Boss') || e.name === 'Reaper') {

      bossHp = e.hp;
      bossMaxHp = e.maxHp;

      e.patternTimer = (e.patternTimer || 0) + deltaTime;
// --- BulletQueenBoss 専用ロジック (秒基準) ---
if (e.type === 'BulletQueenBoss') {
    e.patternTimer = (e.patternTimer || 0) + deltaTime;

    // プレイヤーへの角度
    const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
    const moveSpeedSec = moveSpeed; // moveSpeed は px/秒

    // フェーズごとの挙動
    switch (e.attackPhase) {
        case 0: // 接近フェーズ
            e.x += Math.cos(angleToPlayer) * moveSpeedSec * deltaTime;
            e.y += Math.sin(angleToPlayer) * moveSpeedSec * deltaTime;

            if (dist < 400 || e.patternTimer > 3) { // 3秒経過でフェーズ移行
                e.attackPhase = rnd(4) + 1; // 1～4のランダム攻撃
                e.patternTimer = 0;
                e.tempAngle = Math.random() * Math.PI * 2;

                // 接近後ランダムTP（自身を中心に半径500px円上）
                const tpRadius = 300;
                const tpAngle = Math.random() * Math.PI * 2;
                e.x = e.x + Math.cos(tpAngle) * tpRadius;
                e.y = e.y + Math.sin(tpAngle) * tpRadius;
            }
            break;

case 1: // 回転弾フェーズ
    e.x += Math.cos(angleToPlayer) * moveSpeedSec * 0.1 * deltaTime;

    if (e.patternTimer < 3) {
        const fireInterval = 0.2; // 0.2秒ごとに発射
        if (Math.floor(e.patternTimer / fireInterval) !== Math.floor((e.patternTimer - deltaTime) / fireInterval)) {
            const numBullets = 8;
            if (e.rotationAngle === undefined) e.rotationAngle = 0; // 初回だけ初期化

            for (let i = 0; i < numBullets; i++) {
                const angle = e.rotationAngle + (i * 2 * Math.PI / numBullets);
                fireEnemyBullet(e, true, angle, 'normal', 80);
            }

            e.rotationAngle += rad(10); // 発射ごとに回転
        }
    } else if (e.patternTimer >= 3) {
        e.attackPhase = 0;
        e.patternTimer = 0;
    }

    e.patternTimer += deltaTime;
    break;


        case 2: // 扇状弾フェーズ (プレイヤー狙い)
            e.x += Math.cos(angleToPlayer) * moveSpeedSec * 0.1 * deltaTime;

            if (e.patternTimer < 3) { // 0～3秒
                const fireInterval = 0.8; // 0.5秒ごとに発射
                if (Math.floor(e.patternTimer / fireInterval) !== Math.floor((e.patternTimer - deltaTime) / fireInterval)) {
                    const numFan = 5;
                    const spread = rad(30);
                    for (let i = 0; i < numFan; i++) {
                        const fanAngle = angleToPlayer + (i - (numFan - 1) / 2) * (spread / (numFan - 1));
                        fireEnemyBullet(e, true, fanAngle,'normal',50);
                    }
                }
            } else if (e.patternTimer >= 4) {
                e.attackPhase = 0;
                e.patternTimer = 0;
            }
            break;

        case 3: // ランダム連射
            if (e.patternTimer < 3) {
                const fireInterval = 0.05; // 0.05秒ごとに発射
                if (Math.floor(e.patternTimer / fireInterval) !== Math.floor((e.patternTimer - deltaTime) / fireInterval)) {
                    const randomDir = Math.random() * Math.PI * 2;
                    fireEnemyBullet(e, true, randomDir, 'normal', 40);
                }
            } else if (e.patternTimer >= 4) {
                e.attackPhase = 0;
                e.patternTimer = 0;
            }
            break;

        case 4: // 追尾弾＋ザコ召喚
            if (e.patternTimer < 0.05) { // 初回1フレーム程度
                for (let i = 0; i < 4; i++) {
                    const spawnAngle = (Math.PI * 2 / 4) * i;
                    spawnEnemy('Bat', e.x + Math.cos(spawnAngle) * e.size * 2, e.y + Math.sin(spawnAngle) * e.size * 2);
                }
                showFloat(e.x, e.y, "Minion Summon!", "yellow");
            }

            if (e.patternTimer < 3) {
                const fireInterval = 0.75; // 0.75秒ごとに追尾弾
                if (Math.floor(e.patternTimer / fireInterval) !== Math.floor((e.patternTimer - deltaTime) / fireInterval)) {
                    fireEnemyBullet(e, true, angleToPlayer, 'homing', 30);
                    fireEnemyBullet(e, true, angleToPlayer + rad(15), 'homing', 30);
                    fireEnemyBullet(e, true, angleToPlayer - rad(15), 'homing', 30);
                }
            } else if (e.patternTimer >= 4) {
                e.attackPhase = 0;
                e.patternTimer = 0;
            }
            break;
    }
}

if (e.type === 'TeleportHunterBoss') {
    // --- 共通初期化 ---
    e.patternTimer ??= 0;      // サイクル全体タイマー
    e.fireTimer ??= 0;         // 連射・発射タイマー
    e.hasTeleported ??= false; // TP済みフラグ
    e.waitTimer ??= 0;         // 待機タイマー
    e.loopCount ??= 0;         // ループカウンター
    e.patternCase ??= 1;       // デフォルト行動

    const tpRadius = 300;

    // --- 待機中は何もしない ---
    if (e.waitTimer > 0) {
        e.waitTimer -= deltaTime;
        return;
    }

    // プレイヤー方向
    const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);

    switch (e.patternCase) {
        case 1:
            // TP → 乱射 ワンセット x4
            if (!e.hasTeleported) {
                const angle = Math.random() * Math.PI * 2;
                e.x = player.x + Math.cos(angle) * tpRadius;
                e.y = player.y + Math.sin(angle) * tpRadius;
                showFloat(e.x, e.y, "Teleport!", "cyan");
                e.hasTeleported = true;
                e.fireTimer = 0;
            }

            // 乱射
            e.fireTimer -= deltaTime;
            const shotsPerSecond = 15;
            const interval = 1 / shotsPerSecond;
            while (e.fireTimer <= 0 && e.hasTeleported) {
                const randomAngle = angleToPlayer + (Math.random() - 0.5) * Math.PI / 2;
                fireEnemyBullet(e, true, randomAngle, 'normal', 40);
                e.fireTimer += interval;
            }

            // 1回セット終了
            if (e.patternTimer >= 0.3) {
                e.patternTimer = 0;
                e.hasTeleported = false;
                e.loopCount++;
            }

            // 4回ループ終了
            if (e.loopCount >= 6) {
                e.loopCount = 0;
                e.waitTimer = 1.0; // 1秒待機
                e.patternCase = Math.floor(Math.random() * 3) + 1; // case1 or 2 ランダム
            }

            e.patternTimer += deltaTime;
            break;

case 2:
    const setsPerCase2 = 7;
    const intervalBig = 0.1;

    e.bigShotFired ??= false;

    // 7セットが終わるまでループ
    if (e.loopCount < setsPerCase2) {

        // TPがまだなら実行
        if (!e.hasTeleported) {
            const angle = Math.random() * Math.PI * 2;
            e.x = player.x + Math.cos(angle) * tpRadius;
            e.y = player.y + Math.sin(angle) * tpRadius;
            showFloat(e.x, e.y, "Teleport!", "cyan");
            e.hasTeleported = true;
            e.fireTimer = intervalBig; // TP後0.1秒待機
            e.bigShotFired = false;
        }

        // 0.1秒経ったら big弾発射
        e.fireTimer -= deltaTime;
        if (e.fireTimer <= 0 && e.hasTeleported && !e.bigShotFired) {
            const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
            fireEnemyBullet(e, true, angleToPlayer, 'big', 60);
            e.bigShotFired = true;
            e.fireTimer = intervalBig; // big弾後も0.1秒待機
        }

        // big弾後、次のTPセット準備
        if (e.bigShotFired && e.fireTimer <= 0) {
            e.hasTeleported = false;
            e.loopCount++;
        }

    } else {
        // 7セット終了後
        e.waitTimer = 3.0;
        e.hasTeleported = false;
        e.loopCount = 0;
        e.bigShotFired = false;
        e.patternCase = Math.floor(Math.random() * 3) + 1; // 次の行動をランダム
    }
    break;




        case 3:
            // TP + 乱射 サイクル型
            const cycleTime = 3.0;
            const waitTime = 1.0;

            if (!e.hasTeleported) {
                const angle = Math.random() * Math.PI * 2;
                e.x = player.x + Math.cos(angle) * tpRadius;
                e.y = player.y + Math.sin(angle) * tpRadius;
                showFloat(e.x, e.y, "Teleport!", "cyan");
                e.hasTeleported = true;
                e.fireTimer = 0;
            }

            e.fireTimer -= deltaTime;
            const shotsPerSec = 10;
            const intervalCycle = 1 / shotsPerSec;
            while (e.fireTimer <= 0 && e.hasTeleported) {
                const randomAngle = angleToPlayer + (Math.random() - 0.5) * Math.PI / 2;
                fireEnemyBullet(e, true, randomAngle, 'normal', 30);
                e.fireTimer += intervalCycle;
            }

            e.patternTimer += deltaTime;

            if (e.patternTimer >= cycleTime) {
                e.patternTimer = 0;
                e.hasTeleported = false;
                e.fireTimer = 0;
                e.waitTimer = waitTime;
                e.patternCase = Math.floor(Math.random() * 3) + 1; // 次の行動ランダム
            }
            break;
    }

    return; // 他の移動や処理に行かない
}



      // --- ArcMageBoss ---
if (e.type === 'ArcMageBoss') {

    // 初期化
    e.fireTimer ??= 0;
    e.patternTimer ??= 0;
    e.tempAngle ??= 0;
    e.patternCase ??= 0;
    e.tpTimer ??= 0;
    e.fireCount ??= 0;
    e.firePhase ??= 0;

    const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);

    // --- 攻撃パターン ---
    switch (e.patternCase) {
        case 0: // ビッグ弾＋扇状弾 交互10回
            e.fireTimer -= deltaTime;
            e.patternTimer += deltaTime;
e.tpTimer ??= 0;  // これで未定義なら 0 に初期化

            if (e.fireCount < 10 && e.fireTimer <= 0) {
                if (e.firePhase === 0) {
                    fireEnemyBullet(e, true, angleToPlayer, 'big', 80);
                    e.firePhase = 1;
                } else {
                    const numFan = 4;
                    const spread = rad(35);
                    for (let i = 0; i < numFan; i++) {
                        const fanAngle = angleToPlayer + (i - (numFan - 1)/2) * (spread / (numFan - 1));
                        fireEnemyBullet(e, true, fanAngle, 'normal', 70);
                    }
                    e.firePhase = 0;
                }
                e.fireCount++;
                e.fireTimer = 0.4;
            }

            if (e.fireCount >= 10) {
                e.patternCase = 1;
                e.fireCount = 0;
                e.firePhase = 0;
                e.fireTimer = 0;
                e.patternTimer = 0;
            }
            break;

        case 1: // 回転4方向
            e.fireTimer -= deltaTime;
            e.patternTimer += deltaTime;

            if (e.fireTimer <= 0) {
                e.fireTimer = 0.17;
                e.tempAngle += rad(5);
                for (let i = 0; i < 4; i++) {
                    fireEnemyBullet(e, true, e.tempAngle + Math.PI / 2 * i, 'normal', 40);
                }
            }

            if (e.patternTimer >= 4.0) {
                e.patternCase = 2;
                e.patternTimer = 0;
            }
            break;

        case 2: // 放射状連射（8方向）
            e.fireTimer -= deltaTime;
            e.patternTimer += deltaTime;

            if (e.fireTimer <= 0) {
                e.fireTimer = 0.25;
                for (let i = 0; i < 8; i++) {
                    const angleOffset = (Math.PI * 2 / 8) * i;
                    fireEnemyBullet(e, true, angleOffset, 'normal', 40);
                }
            }

            if (e.patternTimer >= 4.0) {
                e.patternCase = 0;
                e.patternTimer = 0;
                e.tempAngle = 0;
            }
            break;
    }


      // 特殊な敵の動作
      if (e.type === 'shooter' || e.type === 'mage') {
        const SHOOT_RANGE = 300;
        const PADDING = 50;

        if (dist > SHOOT_RANGE) {
          e.x += Math.cos(angle) * moveSpeed;
          e.y += Math.sin(angle) * moveSpeed;
          e.state = 'move';
        } else if (dist < SHOOT_RANGE - PADDING) {
          let awayAngle = angle + Math.PI;
          e.x += Math.cos(awayAngle) * moveSpeed * 0.5;
          e.y += Math.sin(awayAngle) * moveSpeed * 0.5;
          e.state = 'retreat';
        } else {
          e.state = 'idle';
          let shootCD = e.type === 'shooter' ? 90 : 60;
          if (e.cd % shootCD === 0) { fireEnemyBullet(e); }
        }
        return;
      }

      if (e.type === 'charger') {
        const CHARGE_DELAY = 90;
        const CHARGE_SPEED = moveSpeed * 4;

        if (e.state === 'move' && e.cd > CHARGE_DELAY) {
          e.chargeAngle = angle;
          e.state = 'charge';
          e.cd = 0;
        } else if (e.state === 'charge' && e.cd < 60) {
          e.x += Math.cos(e.chargeAngle) * CHARGE_SPEED;
          e.y += Math.sin(e.chargeAngle) * CHARGE_SPEED;
        } else if (e.state === 'charge' && e.cd >= 60) {
          e.state = 'move';
          e.cd = 0;
        } else {
          e.x += Math.cos(angle) * moveSpeed;
          e.y += Math.sin(angle) * moveSpeed;
        }
        return;
      }

    // --- TP処理 ---
    const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
    if (distToPlayer >= 12) {
        e.tpTimer += deltaTime;
        if (e.tpTimer >= 10) {
            const tpRadius = 3;
            const tpAngle = Math.random() * Math.PI * 2;
            e.x += Math.cos(tpAngle) * tpRadius;
            e.y += Math.sin(tpAngle) * tpRadius;
            e.tpTimer = 0;
        }
    } else {
        e.tpTimer = 0;
    }
    return;
  }


    }

    // --- 通常敵 ---
// --- 通常敵 ---
e.x += Math.cos(angle) * moveSpeed;
e.y += Math.sin(angle) * moveSpeed;

if (dist < player.size + e.size) {


      e.contactCD = (e.contactCD || 0) - deltaTime;

      if (e.contactCD <= 0) {
        takePlayerDamage(10 * eventModifiers.enemyDmgMult);
        e.contactCD = 0.5;
      }
    }

  }); // ✅ forEach 正常終了
} // ✅ enemySpeedMult > 0 正常終了

// 4.5. 敵弾の移動と判定（完全安全版）
for (let i = enemyBullets.length - 1; i >= 0; i--) {
  const eb = enemyBullets[i];

  // --- 完全防御 ---
  if (
    !eb ||
    typeof eb !== 'object' ||
    typeof eb.x !== 'number' ||
    typeof eb.y !== 'number'
  ) {
    enemyBullets.splice(i, 1);
    continue;
  }

  // --- 初期値保証 ---
  if (typeof eb.vx !== 'number') eb.vx = 0;
  if (typeof eb.vy !== 'number') eb.vy = 0;
  if (typeof eb.life !== 'number') eb.life = 3;
  if (typeof eb.size !== 'number') eb.size = 4;

  const type = eb.type ?? 'normal';

  // --- 追尾弾 ---
  if (type === 'homing') {
    const dx = player.x - eb.x;
    const dy = player.y - eb.y;

    let speed = Math.hypot(eb.vx, eb.vy);
    if (!Number.isFinite(speed) || speed <= 0) speed = 200;

    let currentAngle = Math.atan2(eb.vy, eb.vx);
    let targetAngle = Math.atan2(dy, dx);

    let diff = targetAngle - currentAngle;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;

    const turnRate = 0.05;
    currentAngle += Math.min(Math.max(diff, -turnRate), turnRate);

    eb.vx = Math.cos(currentAngle) * speed;
    eb.vy = Math.sin(currentAngle) * speed;
  }

  eb.x += eb.vx * deltaTime;
  eb.y += eb.vy * deltaTime;
  eb.life -= deltaTime;

  // --- 衝突判定 ---
  const dist = Math.hypot(eb.x - player.x, eb.y - player.y);
  if (Number.isFinite(dist) && dist < eb.size + player.size) {
    takePlayerDamage(eb.dmg ?? 5);
    enemyBullets.splice(i, 1);
    continue;
  }

  if (eb.life <= 0) {
    enemyBullets.splice(i, 1);
  }
}



  // 4.7. Garlic/HolyWater の常時ダメージ処理
  const garlicBullet = bullets.find(b => b.type === 'garlic');
  const holyWaterBullets = bullets.filter(b => b.type === 'holyWater');

  if (garlicBullet) {
    enemies.forEach(e => {
      let dist = Math.hypot(garlicBullet.x - e.x, garlicBullet.y - e.y);
      if (dist < garlicBullet.size + e.size) {
  takeDamage(e, garlicBullet.dmg * deltaTime);
      }
    });
  }

holyWaterBullets.forEach(b => {

  if (b.hitTimer === undefined) b.hitTimer = 0;

  b.hitTimer -= deltaTime;

  if (b.hitTimer <= 0) {
    enemies.forEach(e => {
      let dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < b.size + e.size) {
        takeDamage(e, b.dmg);
      }
    });

    b.hitTimer = 0.25; // 4回/秒
  }
});



    drawFog(ctx, player, canvas);

  // 4.8. 隕石の着弾処理
  for (let i = meteorWarning.length - 1; i >= 0; i--) {
    let m = meteorWarning[i];
    m.timer -= deltaTime;

    if (m.timer <= 0) {
      // 隕石着弾！
      enemies.forEach(e => {
        let dist = Math.hypot(m.x - e.x, m.y - e.y);
        if (dist < m.radius * 2) {
          takeDamage(e, 50 * player.dmgMult);
        }
      });

      let playerDist = Math.hypot(m.x - player.x, m.y - player.y);
      if (playerDist < m.radius) {
        takePlayerDamage(20);
      }

      showFloat(m.x, m.y, "METEOR!", "red");
      meteorWarning.splice(i, 1);
    }
  }






  // 5. 当たり判定（味方弾 -> 敵）
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    let hit = false;

    // 常時効果の弾はスキップ
    if (b.type === 'garlic' || b.type === 'holyWater' || b.type === 'mine' || b.type === 'drone' || b.type === 'lightningChain') continue;

    for (let j = enemies.length - 1; j >= 0; j--) {
      let e = enemies[j];
      let dist = Math.hypot(b.x - e.x, b.y - e.y);

      // 共通のヒット判定
      if (dist < b.size + e.size || b.type === 'sword') {

        if (b.type === 'sword') {
          // 剣の当たり判定: 扇形の範囲内判定
          let dx = e.x - b.x;
          let dy = e.y - b.y;
          let enemyAngle = Math.atan2(dy, dx);

          let startAngle = b.angle - rad(20);
          let endAngle = b.angle + rad(20);

          // 角度の正規化 (複雑な角度処理を回避するため、ここでは簡易判定)
          let isNearAngle = Math.abs(enemyAngle - b.angle) < rad(30);

          if (Math.hypot(dx, dy) < b.size + e.size && isNearAngle) {
            if (b.hitEnemies.has(e)) continue;

            takeDamage(e, b.dmg);
            b.hitEnemies.add(e);
          }
          continue;
        }





        if (b.type === 'icicle') {
          if (b.lastHit.has(e) && frame - b.lastHit.get(e) < 5) continue;
          b.lastHit.set(e, frame);

          b.pierce--;
          if (b.pierce >= 0) {
            const baseProjSpeed = 420;
            const projSpeed = baseProjSpeed * player.projSpeedMult;

            const nextTarget = enemies.find(other => other !== e && !b.lastHit.has(other));
            if (nextTarget) {
              let angle = Math.atan2(nextTarget.y - b.y, nextTarget.x - b.x);
              b.vx = Math.cos(angle) * projSpeed;
              b.vy = Math.sin(angle) * projSpeed;
              b.reflectionCount++;
            } else {
              b.pierce = 0;
            }
          }
        }

        takeDamage(e, b.dmg);
        b.pierce = (b.pierce || 1) - 1;

        if (b.pierce <= 0) {
          hit = true;
          break;
        }
      }
    }

    if (hit && b.type !== 'axe' && b.type !== 'cross' &&  b.type !== 'boomerang' && b.type !== 'icicle') {
      bullets.splice(i, 1);
    }
  }

  // 6. 経験値・アイテム回収 (変更なし)
  for (let i = items.length - 1; i >= 0; i--) {
    let it = items[i];
    let dist = Math.hypot(it.x - player.x, it.y - player.y);

    let isVisible = getScreenX(it.x) > -500 && getScreenX(it.x) < canvas.width + 500 &&
      getScreenY(it.y) > -500 && getScreenY(it.y) < canvas.height + 500;

    let isMagnetized = dist < player.magnet || !isVisible;

    if (isMagnetized) {
      let angle = Math.atan2(player.y - it.y, player.x - it.x);
      it.x += Math.cos(angle) * 8;
      it.y += Math.sin(angle) * 8;
    }

    if (dist < player.size + 5) {
      if (it.kind === 'exp') {
        player.exp += it.val * eventModifiers.expMult;
        checkLevelUp();
      } else if (it.kind === 'drop') {
        it.data.effect(player);
      }
      items.splice(i, 1);
    }
  }

// 7. 定期回復と時間更新 & イベント処理
gameTime += deltaTime;
updateHUD();

if (player.regen > 0) {
  player.hp = Math.min(
    player.maxHp,
    player.hp + player.regen * deltaTime
  );
}
// 8. フローティングテキストの更新
for (let i = floaters.length - 1; i >= 0; i--) {
  floaters[i].life -= deltaTime;
  floaters[i].y -= 50 * deltaTime;

  if (floaters[i].life <= 0) {
    floaters.splice(i, 1);
  }
}

}

//============================================================
// --- 描画処理 (プレイヤー描画強化、ニンニク初期オーラ描画抑止) ---ここまで秒変換
function draw() {
    if (isGameOver) {
        drawGameOverScreen();
        return; // 通常のゲーム描画をスキップ
    }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  





  // 1. 背景グリッド (変更なし)
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  const gridSize = 100;
  const offsetX = (player.x % gridSize) - canvas.width / 2;
  const offsetY = (player.y % gridSize) - canvas.height / 2;
  
  for (let i = -canvas.width / gridSize / 2 - 1; i < canvas.width / gridSize / 2 + 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * gridSize - offsetX, 0);
    ctx.lineTo(i * gridSize - offsetX, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * gridSize - offsetY);
    ctx.lineTo(canvas.width, i * gridSize - offsetY);
    ctx.stroke();
  }
  
  // 2. 敵 (四角形) (変更なし)
  enemies.forEach(e => {
    let screenX = getScreenX(e.x);
    let screenY = getScreenY(e.y);
    let size = e.size * 1.5; 
    
    ctx.fillStyle = e.color;
    ctx.fillRect(screenX - size/2, screenY - size/2, size, size);
    
    // HP Bar
    ctx.fillStyle = '#444';
    ctx.fillRect(screenX - size/2, screenY - size/2 - 8, size, 3);
    ctx.fillStyle = 'red';
    ctx.fillRect(screenX - size/2, screenY - size/2 - 8, (e.hp / e.maxHp) * size, 3);
  });
  
  // 3. 経験値・アイテム (変更なし)
  items.forEach(it => {
    let screenX = getScreenX(it.x);
    let screenY = getScreenY(it.y);
    
    ctx.beginPath();
    ctx.arc(screenX, screenY, it.size || 5, 0, Math.PI * 2);
    ctx.fillStyle = it.kind === 'exp' ? '#00d2ff' : it.data.color;
    ctx.fill();
    
    if (it.kind === 'drop') {
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(it.data.icon, screenX, screenY + 4);
    }
  });

  // 4. 味方弾・武器エフェクト 
  bullets.forEach(b => {
    let screenX = getScreenX(b.x);
    let screenY = getScreenY(b.y);
    
    ctx.save();
    ctx.translate(screenX, screenY);
    
    switch(b.type) {
      case 'normal':
        ctx.fillStyle = 'white';
        ctx.fillRect(-b.size/2, -b.size/2, b.size, b.size);
        break;
      case 'knife':
        ctx.fillStyle = '#ccc';
        ctx.rotate(Math.atan2(b.vy, b.vx));
        ctx.fillRect(0, -1, b.size * 2, 2);
        break;
case 'SMG': {
    ctx.rotate(Math.atan2(b.vy, b.vx));

    // 弾芯
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, -1, b.size * 2, 2);

    // 発光トレーサー
    ctx.strokeStyle = 'rgba(255,220,120,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-b.size * 1.5, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();
}
break;


case 'axe':
    ctx.save();
    ctx.rotate(b.rot);

    // 柄（持ち手）
    const handleWidth = b.size / 5;
    const handleLength = b.size;
    ctx.fillStyle = '#8b4513'; // 茶色
    ctx.fillRect(-handleWidth/2, 0, handleWidth, handleLength);

    // 刃
    const bladeWidth = b.size * 0.6;
    const bladeHeight = b.size * 0.4;
    ctx.fillStyle = '#cccccc'; // 金属色
    ctx.beginPath();
    ctx.moveTo(-bladeWidth/2, 0);             // 左下
    ctx.lineTo(bladeWidth/2, 0);              // 右下
    ctx.lineTo(0, -bladeHeight);              // 上中央
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    break;

case 'cross':
    const 十字色 = 'yellow';
    const 中央模様色 = 'darkorange';
    const 横棒長さ = 8;      // 上棒と左右棒の長さ
    const 下棒長さ = 12;     // 下棒だけ少し長め
    const 棒幅 = 3;           // 棒の太さ
    const 中央模様半径 = 1.5; // 中央のオレンジ模様

    ctx.fillStyle = 十字色;

    // 上棒
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-棒幅/2, -横棒長さ);
    ctx.lineTo(棒幅/2, -横棒長さ);
    ctx.closePath();
    ctx.fill();

    // 下棒
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-棒幅/2, 下棒長さ);
    ctx.lineTo(棒幅/2, 下棒長さ);
    ctx.closePath();
    ctx.fill();

    // 左棒
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-横棒長さ, -棒幅/2);
    ctx.lineTo(-横棒長さ, 棒幅/2);
    ctx.closePath();
    ctx.fill();

    // 右棒
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(横棒長さ, -棒幅/2);
    ctx.lineTo(横棒長さ, 棒幅/2);
    ctx.closePath();
    ctx.fill();

    // 中央模様
    ctx.fillStyle = 中央模様色;
    ctx.beginPath();
    ctx.arc(0, 0, 中央模様半径, 0, Math.PI*2);
    ctx.fill();

    break;




      case 'garlic':
        // ★ ニンニクオーラの描画: 存在する場合のみ描画
        if (player.weapons.some(w => w.id === 4)) {
            ctx.strokeStyle = 'purple';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3 + (Math.sin(frame * 0.1) * 0.1);
            ctx.beginPath();
            ctx.arc(0, 0, b.size, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        break;



      case 'fire':
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(0, 0, b.size, 0, Math.PI * 2);
        ctx.fill();
        break;
case 'holyWaterBottle':
    // 全体を薄い緑色で塗る
    ctx.fillStyle = 'rgba(0, 180, 0, 0.85)';

    const w = (b.size || 6) * 1.2;   // 幅
    const h = (b.size || 6) * 3.2;   // 高さ（細長く）
    const neckW = w * 0.6;           // 瓶の首の幅
    const neckH = h * 0.3;           // 首の高さ

    // 首（上の細い部分）
    ctx.fillRect(-neckW / 2, -h / 2, neckW, neckH);

    // 本体（太い部分）
    ctx.fillRect(-w / 2, -h / 2 + neckH, w, h - neckH);
    break;



      case 'holyWater':
        ctx.fillStyle = 'rgba(0, 150, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, b.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'blue';
        ctx.stroke();
        break;
      case 'sword': 
        ctx.fillStyle = `rgba(255, 255, 255, ${b.life / 10})`;
        ctx.rotate(b.angle);
        ctx.beginPath();
        ctx.arc(0, 0, b.size, -rad(20), rad(20)); 
        ctx.lineTo(0,0);
        ctx.fill();
        ctx.strokeStyle = 'silver';
        ctx.lineWidth = 3;
        ctx.stroke();
        break;
      case 'boomerang':
        ctx.fillStyle = 'lime';
        ctx.fillRect(-b.size/2, -b.size/2, b.size, b.size); 
        break;
      case 'drone':
        ctx.fillStyle = 'green';
        ctx.font = '12px Arial';
        ctx.fillText('🚁', -6, 5);
        break;
      case 'mine':
        ctx.fillStyle = b.isTriggered ? 'red' : 'gray';
        ctx.beginPath();
        ctx.arc(0, 0, b.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.fillText('💣', 0, 4);
        break;
      case 'icicle':
        ctx.fillStyle = 'cyan';
        ctx.fillRect(-b.size/2, -b.size/2, b.size, b.size); 
        break;
      case 'lightningChain':
        ctx.strokeStyle = `rgba(255, 255, 0, ${b.life / 5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0); 
        ctx.lineTo(getScreenX(b.targetX) - screenX, getScreenY(b.targetY) - screenY);
        ctx.stroke();
        break;
    }
    ctx.restore();
  });
  
// ----------------------
// 濃い霧（プレイヤー視界制限、イベント中のみ）

    // プレイヤー周辺だけ見える霧を描画
// ----------------------
// draw() の最後あたり（UI系として）
if (player.bibleBarrier && player.bibleBarrier.active) {

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = player.bibleBarrier.radius;

    ctx.save();

    ctx.strokeStyle = `rgba(150, 255, 255, ${player.bibleBarrier.alpha})`;
    ctx.lineWidth = 2;

    // 円
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 五芒星（簡易）
    const points = 5;
    const starR = radius * 0.8;

    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
        const angle = i * (2 * Math.PI / points) - Math.PI / 2;
        const x = cx + Math.cos(angle) * starR;
        const y = cy + Math.sin(angle) * starR;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
}

//BOSSへの矢印

const boss = enemies.find(e => bossTypes.includes(e.type));

if (boss) {
    const screenX = getScreenX(boss.x);
    const screenY = getScreenY(boss.y);

    const onScreen = screenX >= 0 && screenX <= canvas.width && screenY >= 0 && screenY <= canvas.height;

    if (!onScreen) {
        bossArrowAlpha += bossArrowFadeSpeed;
        if (bossArrowAlpha > 1) bossArrowAlpha = 1;
    } else {
        bossArrowAlpha -= bossArrowFadeSpeed;
        if (bossArrowAlpha < 0) bossArrowAlpha = 0;
    }

    if (bossArrowAlpha > 0) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const dx = boss.x - player.x;
        const dy = boss.y - player.y;
        const angle = Math.atan2(dy, dx); // プレイヤー方向
        const edgeDistance = Math.min(canvas.width, canvas.height) / 2 - 20;
        const arrowX = centerX + Math.cos(angle) * edgeDistance;
        const arrowY = centerY + Math.sin(angle) * edgeDistance;

        ctx.save();
        ctx.translate(arrowX, arrowY);

        // 画面中央に向かって辺が正対するように回転
        ctx.rotate(angle + Math.PI / 2); // +90度

        ctx.globalAlpha = bossArrowAlpha;
        ctx.fillStyle = 'red';
        ctx.beginPath();

        const size = 12;
        // 底辺を上向きにして辺を中心に正対させる
        ctx.moveTo(0, -size / 2); // 頂点
        ctx.lineTo(-size / 2, size / 2);
        ctx.lineTo(size / 2, size / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        ctx.globalAlpha = 1.0;
    }
} else {
    bossArrowAlpha = 0;
}




  // 5. プレイヤー (視認性向上パッチ適用 & 画質改善)
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  // 輪郭線 (黒い縁取りで背景色と区別 - 先に描画して内側を塗りつぶす)
  ctx.beginPath();
  ctx.arc(0, 0, player.size, 0, Math.PI * 2);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.stroke();

  // プレイヤー本体 (ネオンカラーで強調)
  ctx.fillStyle = player.color; // #00d2ff
  ctx.beginPath();
  ctx.arc(0, 0, player.size, 0, Math.PI * 2);
  ctx.fill();


  // 回収範囲 (マグネット)
  ctx.strokeStyle = 'rgba(0, 255, 0, 0)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, player.magnet, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
  
  // 6. 敵弾 (四角形)
  enemyBullets.forEach(eb => {
    let screenX = getScreenX(eb.x);
    let screenY = getScreenY(eb.y);
    let size = eb.size * (eb.type === 'big' ? 3 : 1);
    
    ctx.fillStyle = eb.type === 'homing' ? 'purple' : 'red';
    ctx.fillRect(screenX - size/2, screenY - size/2, size, size);
  });
  
  // 7. 隕石の警告円
  meteorWarning.forEach(m => {
    let screenX = getScreenX(m.x);
    let screenY = getScreenY(m.y);
    
    ctx.strokeStyle = `rgba(255, 0, 0, ${Math.min(m.timer / 1.0, 1)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screenX, screenY, m.radius, 0, Math.PI * 2);
    ctx.stroke();
  });


  // 8. フローティングテキスト
  floaters.forEach(f => {
    ctx.fillStyle = f.col;
    ctx.globalAlpha = Math.min(f.life, 1);
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(f.txt, getScreenX(f.x), getScreenY(f.y));
  });
  ctx.globalAlpha = 1.0;
  
  // 9. ジョイスティック (変更なし)
  if (joystick.active) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(joystick.sx, joystick.sy, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(joystick.cx, joystick.cy, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- 入力処理 (変更なし) ---
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isPaused) return;
    const touch = e.touches[0];
    joystick.active = true;
    joystick.sx = touch.clientX;
    joystick.sy = touch.clientY;
    joystick.cx = touch.clientX;
    joystick.cy = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!joystick.active || isPaused) return;
    const touch = e.touches[0];
    let dx = touch.clientX - joystick.sx;
    let dy = touch.clientY - joystick.sy;
    const dist = Math.hypot(dx, dy);
    const maxDist = 50;

    if (dist > maxDist) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * maxDist;
        dy = Math.sin(angle) * maxDist;
    }
    joystick.cx = joystick.sx + dx;
    joystick.cy = joystick.sy + dy;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
        joystick.active = false;
    }
});

let keys = {};

document.addEventListener('keydown', (e) => {
    if (isPaused) return;
    keys[e.key] = true;

    joystick.active = true;
    
    let newDx = 0, newDy = 0;
    const speed = 50; 

    if (keys['ArrowUp'] || keys['w']) newDy -= speed;
    if (keys['ArrowDown'] || keys['s']) newDy += speed;
    if (keys['ArrowLeft'] || keys['a']) newDx -= speed;
    if (keys['ArrowRight'] || keys['d']) newDx += speed;

    if (newDx !== 0 || newDy !== 0) {
        joystick.cx = joystick.sx + newDx;
        joystick.cy = joystick.sy + newDy;
        
        if (!player.isSliding) {
            joystick.dx = newDx;
            joystick.dy = newDy;
            player.lastMove.angle = Math.atan2(newDy, newDx);
        }
    }
});

document.addEventListener('keyup', (e) => {
    delete keys[e.key];

    if (Object.keys(keys).length === 0) {
        joystick.active = false;
    }
});

function createHolyWaterBottle(x, y, angle, speed, dmg) {
  return {
    type: 'holyWaterBottle',
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 6,      // ← radius の代わりに size を持たせる
    dmg,
    life: 1.2
  };
}

function createHolyWater(x, y, baseDmg) {
  const waterSize = 60 * Math.max(0.5, player.areaMult);
  const waterLife = 3.0;
  const dmg = Math.max(0.1, baseDmg);

  bullets.push({
    type: 'holyWater',
    x,
    y,
    size: waterSize,
    life: waterLife,
    dmg,
    hitTimer: 0,
    remove: false
  });
}

canvas.addEventListener('mousedown', handleMenuInput);
canvas.addEventListener('touchstart', handleMenuInput, { passive: false });

function takePlayerDamage(damage) {
  if (isGameOver) return;

  // ★ 被弾後無敵
  if (player.invincibleTime > 0) return;

  // 回避
  if (Math.random() < player.evasion) {
    showFloat(player.x, player.y, "MISS!", "yellow");
    return;
  }

  // バリア
  const barrier = player.bibleBarrier;
  if (barrier && barrier.active && barrier.canBlock) {
    barrier.active = false;
    barrier.canBlock = false;

    const w = player.sweapons.find(s => s.swepId === 0);
    if (w) {
      w.cd = getsWeaponBaseCD(w.swepId) * player.cdMult;
    }

    showFloat(player.x, player.y, "BARRIER!", "aqua");
    return;
  }

  // ダメージ確定
  let dmg = Math.max(1, damage - player.armor);
  player.hp -= dmg;

  // ★ 無敵開始
  player.invincibleTime = 0.1;

  showFloat(player.x, player.y, -dmg, "red");

  if (player.hp <= 0) gameOver();
}




function updateSpecialWeapons(deltaTime) {
  console.log("updateSpecialWeapons called", deltaTime);
  player.sweapons.forEach(w => {

    if (w.cd > 0) {
      w.cd -= deltaTime;
      return;
    }

    if (canActivateSwep(w)) {
      fireSpecialWeapon(w);
      w.cd = getsWeaponBaseCD(w.swepId);
    }

  });
}

function canActivateSwep(w) {
  if (w.swepId === 0) {
    return !player.bibleBarrier.active;
  }
  return true;
}

// fogActive = true のとき、プレイヤー周辺だけ見えるようにする
function drawFog(ctx, canvas) {
    if (!fogActive) return;

    console.log('drawFog called, fogActive =', fogActive);

    const fogAlpha = 0.7;
    const visibleRadius = 150;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // 1. 画面全体を黒で覆う
    ctx.fillStyle = `rgba(0,0,0,${fogAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 画面中央をくり抜く
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, visibleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. 他の描画に影響を与えないように戻す
    ctx.globalCompositeOperation = 'source-over';
}





init();

