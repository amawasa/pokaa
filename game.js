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
const SLIDE_INPUT_CORRECTION = 0.06// 慣性力への入力補正の割合
// ゲーム状態フラグ
let afterImages = [];//残像用
let isGameOver = false;
//ゲームモード設定
let gameState = 'title'; // 'title' | 'playing'
let selectedMode = null; // 'easy' | 'normal'
// --- 3. イベント管理変数 ---
let currentEventIndex = -2;   // 現在のイベントID
let currentEventRemaining = 0; // 現在のイベント残り時間
// ゲームオーバー情報保存用
let gameOverData = {};
let godPhase2Event = null;


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
    stat: 'strength', power: 0 },

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



 
  // 以下は初期値維持で倍率や固定値を適用
  { id: 'cd', type: 'stat', name: '古びた砂時計', icon: '⌛️', maxLv: 20, baseDesc: 'クールタイム削減', unit: '%', apply: (p) => p.cdMult *= 0.85, val: -10 },
  { id: 'projSpeed', type: 'stat', name: '磨かれた水晶', icon: '🔮', maxLv: 20, baseDesc: '弾速', unit: '%', apply: (p) => { p.projSpeedMult += 0.07; p.rangeMult += 0.3; },val: 10 },
  { id: 'speed', type: 'stat', name: '天使の翼', icon: '🪽', maxLv: 20, baseDesc: '移動速度', unit: '%', apply: (p) => p.speed *= 1.1, val: 10 },
  { id: 'maxhp', type: 'stat', name: '蠢く心臓', icon: '❤️', maxLv: 20, baseDesc: '最大HP', unit: '', apply: (p) => { p.maxHp += 20; p.hp += 20; }, val: 20 },
  { id: 'armor', type: 'stat', name: '錆びた鎧', icon: '🛡️', maxLv: 20, baseDesc: '被ダメージ軽減', unit: '', apply: (p) => p.armor += 1, val: 1 },
  { id: 'luck', type: 'stat', name: 'クローバー', icon: '🍀', maxLv: 20, baseDesc: '運気', unit: '%', apply: (p) => p.luck = Math.min(1.0, p.luck + 0.01), val: 1 },
  { id: 'magnet', type: 'stat', name: '磁石', icon: '🧲', maxLv: 20, baseDesc: '回収範囲', unit: 'px', apply: (p) => p.magnet += 100, val: 30 },
  { id: 'amount', type: 'stat', name: '複写の輪', icon: '💍', maxLv: 20, baseDesc: '発射数', unit: '発', apply: (p) => p.amount += 1, val: 1 },
  { id: 'evasion', type: 'stat', name: 'マント', icon: '🥼', maxLv: 20, baseDesc: '回避率 (最大60%)', unit: '%', apply: (p) => p.evasion = Math.min(0.6, p.evasion + 0.05), val: 3 },
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
  { time: 42000, name: 'BulletQueen', hp: 40000, speed: 50, size: 40, color: '#ff69b4', exp: 1200, type: 'BulletQueenBoss' },
  { time: 54000, name: 'TeleportHunter', hp: 44000, speed: 250, size: 35, color: '#ffff00', exp: 1400, type: 'TeleportHunterBoss' },
  { time: 66000, name: 'ArcMage', hp: 50000, speed: 300, size: 45, color: '#00ccff', exp: 1600, type: 'ArcMageBoss' },
  { time: 999990, name: 'god', hp: 80000, speed: 300, size: 30, color: '#f0f8ff', exp: 1200, type: 'godBoss' },
  { time: 999990, name: 'neo', hp: 100000, speed: 300, size: 30, color: '#f0f8ff', exp: 1200, type: 'neoBoss' }
];
const bossTypes = ['BulletQueenBoss', 'ArcMageBoss', 'TeleportHunterBoss','godBoss','neoBoss'
];
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
  weapons: [ ],
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
let sugaActive = false;

const GAME_EVENTS = [
    {id : 1 ,time: 100, name: '', effect: () => { }, color: 'rgba(0, 0, 0, 0)' },
    {id : 2 ,time: 60, name: '赤い月', effect: () => { eventModifiers.enemyDmgMult = 1.5; }, color: 'rgba(255, 0, 0, 0.9)' },
    {id : 3 ,time: 60, name: '濃い霧', effect: () => { fogActive = true; }, color: 'rgba(50, 50, 50, 0.9)' },
    {id : 4 ,time: 1, name: '濃い霧', effect: () => { fogActive = false; }, color: 'rgba(0, 0, 0, 0)' },
    {id : 5 ,time: 60, name: '隕石の雨', effect: () => { /* updateで対応 */ }, color: 'rgba(150, 50, 0, 0.9)' },
    {id : 6 ,time: 60, name: '氷河の海', effect: () => { player.isSliding = true; }, color: 'rgba(0, 100, 255, 0.9)' },
    {id : 7 ,time: 1, name: '氷河の海', effect: () => { player.isSliding = false; }, color: 'rgba(0, 0, 0, 0)' },
    {id : 8 ,time: 60, name: '鉛の雨', effect: () => { /* スポーンで対応 */ }, color: 'rgba(100, 100, 100, 0.9)' },
    {id : 9 ,time: 10, name: '開戦', effect: () => { enemies = []; spawnBoss('BulletQueen'); bossActive = true; }, color: 'rgba(255, 100, 100, 0.9)' },
    {id : 10,time: 60, name: '四面楚歌', effect: () => { spawnAmbush(150); }, color: 'rgba(50, 50, 50, 0.9)' },
    {id : 11,time: 10, name: '高速襲撃', effect: () => { enemies = []; spawnBoss('TeleportHunter'); bossActive = true; }, color: 'rgba(255, 255, 0, 0.8)' },
    {id : 12,time: 1, name: '時の歪み', effect: () => { eventModifiers.cdMult = 0.5; }, color: 'rgba(100, 255, 100, 0.9)' },
    {id : 13,time: 10, name: '魔導の嵐', effect: () => { enemies = []; spawnBoss('ArcMage'); bossActive = true; }, color: 'rgba(0, 150, 255, 0.9)' },
    {id : 14,time: 10, name: 'ボスラッシュ', effect: () => { enemies = []; spawnBoss('TeleportHunter'),spawnBoss('ArcMage');bossActive = true; }, color: 'rgba(255, 255, 0, 0.8)' },
    {id : 15,time: 10, name: 'ボスラッシュ2', effect: () => { enemies = []; spawnBoss('TeleportHunter'),spawnBoss('BulletQueen');bossActive = true; }, color: 'rgba(255, 255, 0, 0.8)' },
    
    {id : 16,time: 70, name: '闇の侵攻', effect: () => { sugaActive =true;ENEMY_TYPES.forEach(t => t.speed *= 0.8);　sugasyun(3)　 }, color: 'rgba(0, 0, 0, 0.9)' },
    {id : 17,time: 10, name: 'フィナーレ', effect: () => { sugaActive = false;enemies = []; spawnBoss('god') }, color: 'rgba(255, 255, 255, 0.9)' },
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

  ctx.font = '30px Arial';
  ctx.fillText('ローグライク・サバイバー', canvas.width / 2, 180);

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


        if (currentEventRemaining <= 0) {
            // イベント終了時のリセット
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

        // =========================
        // godBossだけ死亡演出関数を呼ぶ
        // =========================
        if (e.type === 'godBoss') {
            startGodBossPhase2(e);
            return;
        }

        // =========================
        // 通常ボス
        // =========================
        if (e.type.includes('Boss')) {
            enemies = enemies.filter(x => x !== e);
            bossActive = false;
            killCount++;

            dropItem(e.x, e.y, e.exp);
            return;
        }

        // =========================
        // 通常敵
        // =========================
        enemies = enemies.filter(x => x !== e);
        killCount++;

        if (e.type === 'exploder') {

            let size = 100 * player.areaMult;
            showFloat(e.x, e.y, "BOOM!", "red");

            enemies.forEach(other => {
                if (Math.hypot(e.x - other.x, e.y - other.y) < size) {
                    takeDamage(other, 30 * player.dmgMult);
                }
            });

        } 
        else if (e.type === 'splitter') {

            spawnEnemy('Bat', e.x + 10, e.y + 10);
            spawnEnemy('Bat', e.x - 10, e.y - 10);
        }

        dropItem(e.x, e.y, e.exp);
    }
}
//演出
// ======================================
// takeDamage 内で godBoss 死亡時に呼ぶ
// ======================================
// if (e.type === 'godBoss') {
//     startGodBossPhase2(e);
//     return;
// }


// ======================================
// 第二フェーズ演出開始
// ======================================
function startGodBossPhase2(e) {

    // 元ボス削除
    enemies = enemies.filter(x => x !== e);

    bossActive = true;
    enemyBullets = [];

    // 演出管理オブジェクト
    godPhase2Event = {
        active: true,

        state: 0,          // 0=残像上昇 1=粒収束 2=復活爆発
        timer: 0,

        // 元位置
        startX: e.x,
        startY: e.y,

        // プレイヤー上空
        targetX: player.x,
        targetY: player.y - 220,

        ghostX: e.x,
        ghostY: e.y,

        particles: []
    };

    showFloat(e.x, e.y, "...", "white");
}
// 雷演出＆ロジック
function lightningEffect(target, baseDmg, maxChains) {

  let currentTarget = target;
  const targetsHit = new Set();
  targetsHit.add(currentTarget);

  let chainCount = 0;
  let dmg = baseDmg;

  while (currentTarget && chainCount <= maxChains) {

    //ダメージ（減衰あり）
    takeDamage(currentTarget, dmg);
    dmg *= 0.85; // 連鎖ごとに15%減衰

    //雷エフェクト（即時）
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

    //次のターゲット探索（レンジ依存）
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

    //視覚用の稲妻ライン（0.15秒）
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

//武器の発射ロジック（全武器ロジック統合）
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
        dmg: dmg * 5, 
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
            garlic.size = 100 + w.lv * 30 * player.areaMult;
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
      dmg: dmg*0.55,
      size: 3,
      pierce: 0,
    });
  }
  break;
}




case 6: // 炎の杖 (FireWand)
    if (target) {
        let baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
        let fireSpeed = projSpeed * 1.2;
        let explosionSize = 50 + w.lv * 10 * player.areaMult;

        const spread = rad(2); // ±2度

        for (let i = -1; i <= 1; i++) {
            let angle = baseAngle + spread * i;

            bullets.push({
                type: 'fire',
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * fireSpeed,
                vy: Math.sin(angle) * fireSpeed,
                life: 0.66,
                dmg: dmg,
                size: 4.5,
                pierce: 1,
                explosionSize: explosionSize
            });
        }
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

function fireEnemyBullet(e, isBoss = false, angle = 0, type = 'normal', speedMult = 1.0) {
    let targetAngle = angle || Math.atan2(player.y - e.y, player.x - e.x);
    let speed = (isBoss ? 5 : 4) * speedMult;
    let dmg = isBoss ? 15 : 5;

    let size = 5;

    // -----------------------
    // ★ type別初期値
    // -----------------------
    if (type === 'Magic') {
        size = 30;
    }

    const bullet = {
        x: e.x,
        y: e.y,
        vx: Math.cos(targetAngle) * speed,
        vy: Math.sin(targetAngle) * speed,

        baseSize: size,
        size: size,
        dmg: dmg,
        type: type,
        life: 5,
        animTimer: 0,

        // ★ デフォルト状態
        state: 'move',

        // ★ knife用追加（他は無害）
        spinTimer: 0,
        spinAngle: 0
    };

    // -----------------------
    // ★ knifeだけ初期化
    // -----------------------
    if (type === 'knife') {
        bullet.state = 'spin';
        bullet.spinTimer = 0.3;
        bullet.spinAngle = 0;
    }

    enemyBullets.push(bullet);
}

// 雑魚敵をプレイヤーの周囲に大量に召喚
function spawnAmbush(count, self) {
  console.log("[spawnAmbush] ENTER", { count, self });
    const radius = 500; // 円の半径
    const center = self ?? player; // selfが渡されなければplayer中心
    console.log("[spawnAmbush] center resolved", {
        centerExists: !!center,
        x: center?.x,
        y: center?.y
    });
    console.log("[spawnAmbush] start loop (Bat)");
    // --- 1. 最初の雑魚召喚 ---
    for (let i = 0; i < count; i++) {
      
        const angle = Math.random() * Math.PI * 2;
        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(angle) * radius;
        console.warn("座標不正", { x, y });
        console.log("[spawnAmbush] Bat spawn", { i, x, y });
        spawnEnemy('Bat', x, y);
    }
    console.log("[spawnAmbush] Bat wave complete");
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

// ===============================
// 通常スポーン寄り Ambush版
// 3体召喚 → クールダウン → 繰り返し
// Exploder = 50%
// Bat + Zombie = 残り50%を半々
// ===============================
function sugasyun(count, self) {

    const radius = 500;
    const center = self ?? player;

    let spawned = 0;

    // =======================
    // 3体召喚 → cooldown
    // sugaActive が true の間だけ継続
    // =======================
    function spawnWave() {

        // 停止条件
        if (!sugaActive) {
            showFloat(center.x, center.y, "Suga End", "white");
            return;
        }

        // count到達でリセットして無限継続
        if (spawned >= count) {
            spawned = 0;
        }

        // -------------------
        // 3体召喚
        // -------------------
        for (let i = 0; i < 3; i++) {

            if (!sugaActive) return;

            const angle = Math.random() * Math.PI * 2;

            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;

            // -------------------
            // 敵抽選
            // Exploder 50%
            // Bat 25%
            // Zombie 25%
            // -------------------
            let enemyType;
            const r = Math.random();

            if (r < 0.50) {
                enemyType = "Exploder";
            } else if (r < 0.75) {
                enemyType = "Bat";
            } else {
                enemyType = "Zombie";
            }

            spawnEnemy(enemyType, x, y);
            spawned++;
        }

        showFloat(center.x, center.y, "Ambush!", "red");

        // -------------------
        // 次Wave
        // -------------------
        setTimeout(spawnWave, 600);
    }

    spawnWave();
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
        player.nextExp = Math.floor(player.nextExp * 1.2) +1;
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

for (let i = afterImages.length - 1; i >= 0; i--) {
    afterImages[i].life -= deltaTime;
    afterImages[i].alpha -= deltaTime * 2.5;

    if (afterImages[i].life <= 0 || afterImages[i].alpha <= 0) {
        afterImages.splice(i, 1);
    }
}


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

  //最初の 0.35 秒は必ず前進
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

  //プレイヤーに戻ったら消滅
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


const dx = player.x - e.x;
const dy = player.y - e.y;
// 特殊な敵の動作


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
    // --- 共通初期化 --
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



// --- god ---
if (e.type === 'godBoss') {

    // 初期化
    e.fireTimer ??= 0;
    e.patternCase ??= 4;
    e.patternTimer ??= 0;

    e.phaseCount ??= 0;
    e.subTimer ??= 0;
    e.subState ??= 0;
    e.caseStartDelay ??= 0;

    const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);

    switch (e.patternCase) {
      //周りから玉
case 0:

if (!e.initDone) {

    // =========================
    // ★ TP前座標保存
    // =========================
    const oldX = e.x;
    const oldY = e.y;

    // =========================
    // ★ 新位置へTP
    // =========================
    e.x = player.x;
    e.y = player.y - 400;

    // =========================
    // ★ 残像生成
    // =========================
    if (oldX !== undefined && oldY !== undefined) {
        spawnAfterImage(oldX, oldY, e.x, e.y, e.color);
    }

    e.baseX = player.x;
    e.baseY = player.y;

    e.shotCount = 0;
    e.subState = 0;
    e.fireTimer = 0.35;

    let indices = [0, 1, 2, 3];
    indices.sort(() => Math.random() - 0.5);
    e.selectedDirs = indices.slice(0, 2);

    e.initDone = true;
}

//
// =========================
// 発射地点設定
// =========================
e.magicPoints = [];

const baseAngles = [
    rad(45),
    rad(225),
    rad(135),
    rad(315)
];

const radius = 300;

e.selectedDirs.forEach(dirIndex => {
    const a = baseAngles[dirIndex];

    const mx = e.baseX + Math.cos(a) * radius;
    const my = e.baseY + Math.sin(a) * radius;

    e.magicPoints.push({ x: mx, y: my });
});

//
// =========================
// 発射タイマー
// =========================
e.fireTimer -= deltaTime;

if (e.fireTimer <= 0) {
    e.fireTimer = 0.35;

    e.selectedDirs.forEach(dirIndex => {
        const a = baseAngles[dirIndex];

        const spawnX = e.baseX + Math.cos(a) * radius;
        const spawnY = e.baseY + Math.sin(a) * radius;

        const bulletCount = Math.floor(Math.random() * 7) + 4;
        const step = (Math.PI * 2) / bulletCount;

        for (let i = 0; i < bulletCount; i++) {
            const ang = i * step + step / 2;

            fireEnemyBullet(
                { x: spawnX, y: spawnY },
                false,
                ang,
                'normal',
                30
            );
        }
    });

    e.shotCount++;

    // =========================
    // 3回撃ったら再抽選
    // =========================
    if (e.shotCount >= 3) {
        e.shotCount = 0;

        let indices = [0, 1, 2, 3];
        indices.sort(() => Math.random() - 0.5);
        e.selectedDirs = indices.slice(0, 2);
    }

    e.subState++;

    // =========================
    // 15回発射で終了
    // =========================
    if (e.subState >= 15) {
        e.subState = 0;
        e.phaseCount++;
        e.initDone = false;

        if (e.phaseCount >= 5) {
            e.patternCase = 1;
            e.phaseCount = 0;
            e.magicPoints = [];
        }
    }
}

break;

case 1:

    // 初期化
    if (!e.initDone) {
        e.timer = 0;          // 全体時間
        e.tpTimer = 0;        // TP用
        e.bigFireTimer = 0;   // 落下弾用

        e.burstTimer = 0;     // 連射用
        e.burstCount = 0;
        e.isBursting = false;

        e.initDone = true;
    }

    e.timer += deltaTime;
    e.tpTimer += deltaTime;
    e.bigFireTimer -= deltaTime;

    // =====================
    // ■ 常時：上から落下（20秒間）
    // =====================
    if (e.bigFireTimer <= 0 && e.timer <= 20) {
        e.bigFireTimer = 0.064;

        let rx = player.x + (Math.random() - 0.5) * 800; // ±200
        let ry = player.y - 300;

        fireEnemyBullet(
            { x: rx, y: ry },
            true,
            Math.PI / 2,
            'big',
            50
        );
    }

    // =====================
    // ■ 4秒ごと：TP → 溜め → バースト
    // =====================
    if (e.tpTimer >= 2) {
        e.tpTimer = 0;

        // ランダム位置にTP
const startX = e.x;
const startY = e.y;

const endX = player.x + (Math.random() - 0.5) * 50;
const endY = player.y - 300;

spawnAfterImage(startX, startY, endX, endY, e.color);

// ★ テレポート
e.x = endX;
e.y = endY;

        e.chargeTimer = 0.1; // 1秒溜め
        e.isCharging = true;
        e.isBursting = false;
    }

    // 溜め
    if (e.isCharging) {
        e.chargeTimer -= deltaTime;

        if (e.chargeTimer <= 0) {
            e.isCharging = false;
            e.isBursting = true;

            e.burstTimer = 0;
            e.burstCount = 0;
        }
    }

    // バースト（真下に1発）
    if (e.isBursting) {
        e.burstTimer -= deltaTime;

        if (e.burstTimer <= 0) {
            e.burstTimer = 0.03;

            fireEnemyBullet(
                { x: e.x, y: e.y },
                true,
                Math.PI / 2,
                'Magic',
                95 // さらにデカい弾（速度も強め）
            );

            e.burstCount++;

            if (e.burstCount >= 1) {
                e.isBursting = false;
            }
        }
    }

    // =====================
    // ■ フェーズ終了（20秒）
    // =====================
    if (e.timer >= 20) {
        e.initDone = false;
        e.patternCase = 2;
    }

    break;

case 2:

if (e.caseStartDelay > 0) {
    e.caseStartDelay -= deltaTime;
    break;
}
e.caseStartDelay ??= 0;

// =====================
// 初期化（TP出現）
// =====================
if (!e.initDone) {

    const startX = e.x;
    const startY = e.y;

    const a = Math.random() * Math.PI * 2;
    const r = 200;

    const endX = player.x + Math.cos(a) * r;
    const endY = player.y + Math.sin(a) * r;

    // ★ TP残像
    if (startX !== undefined && startY !== undefined) {
        spawnAfterImage(startX, startY, endX, endY, e.color);
    }

    e.x = endX;
    e.y = endY;

    e.targetX = player.x;
    e.targetY = player.y;

    const dx = e.targetX - e.x;
    const dy = e.targetY - e.y;
    const len = Math.hypot(dx, dy) || 1;

    e.dashVX = dx / len * 8;
    e.dashVY = dy / len * 8;

    e.chargeTimer = 0.65;
    e.isCharging = true;
    e.isDashing = false;
    e.isCooldown = false;

    e.afterImageTimer = 0;

    e.initDone = true;
}

e.fireTimer -= deltaTime;

// =====================
// ★ 溜め
// =====================
if (e.isCharging) {
    e.chargeTimer -= deltaTime;

    if (e.chargeTimer <= 0) {
        e.isCharging = false;
        e.isDashing = true;
    }
}

// =====================
// ★ 突進＋弾幕＋残像
// =====================
if (e.isDashing) {

    const oldX = e.x;
    const oldY = e.y;

    e.x += e.dashVX;
    e.y += e.dashVY;

    // ★ 突進残像（0.03秒ごと）
    e.afterImageTimer -= deltaTime;

    if (e.afterImageTimer <= 0) {
        e.afterImageTimer = 0.03;
        spawnAfterImage(oldX, oldY, e.x, e.y, e.color);
    }

    // 弾幕
    if (e.fireTimer <= 0) {
        e.fireTimer = 0.1;

        const bulletCount = 7;
        const step = (Math.PI * 2) / bulletCount;

        for (let i = 0; i < bulletCount; i++) {
            const ang = i * step;

            fireEnemyBullet(
                { x: e.x, y: e.y },
                true,
                ang,
                'normal',
                30
            );
        }
    }

    e.subState++;

    // 突進終了
    if (e.subState >= 120) {
        e.subState = 0;
        e.isDashing = false;
        e.isCooldown = true;

        e.cooldownTimer = 0.6;
    }
}

// =====================
// ★ クールダウン
// =====================
if (e.isCooldown) {
    e.cooldownTimer -= deltaTime;

    if (e.cooldownTimer <= 0) {
        e.isCooldown = false;
        e.initDone = false;
        e.phaseCount++;

        if (e.phaseCount >= 5) {
            e.patternCase = 3;
            e.phaseCount = 0;
        }
    }
}

break;

case 3:

if (!e.initDone) {

    // =====================
    // ★ TP前座標保存
    // =====================
    const startX = e.x;
    const startY = e.y;

    // =====================
    // ★ ボス初期TP
    // =====================
    const endX = player.x;
    const endY = player.y - 300;

    // ★ 残像TP
    if (startX !== undefined && startY !== undefined) {
        spawnAfterImage(startX, startY, endX, endY, e.color);
    }

    e.x = endX;
    e.y = endY;

    e.wallCenterX = e.x;
    e.wallCenterY = e.y;

    e.attackTimer = 0;
    e.attackCount = 0;

    e.wallPattern = 1;

    // =====================
    // ★ 壁位置固定
    // =====================
    e.fixedWallY = e.wallCenterY - 200;

    e.fixedWallStartRight = e.wallCenterX + 80;
    e.fixedWallStartLeft  = e.wallCenterX - 80;

    e.initDone = true;
}

e.attackTimer += deltaTime;

// =========================
// ★ 1.5秒ごと攻撃
// =========================
if (e.attackTimer >= 1.5) {
    e.attackTimer = 0;

    const spacing = 6;
    const count = 800;

    const y = e.fixedWallY;

    let startX;
    let dir;

    // =========================
    // ★ 左右交互壁
    // =========================
    if (e.wallPattern === 1) {
        startX = e.fixedWallStartRight;
        dir = -1;
    } else {
        startX = e.fixedWallStartLeft;
        dir = 1;
    }

    for (let i = 0; i < count; i++) {

        const x = startX + i * spacing * dir;

        fireEnemyBullet(
            { x, y },
            true,
            Math.PI / 2,
            'wall',
            33
        );
    }

    // =========================
    // ★ Magic弾
    // =========================
    const magicCount = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < magicCount; i++) {

        let offset = 0;

        if (magicCount === 2) {
            offset = (i === 0 ? -15 : 15);
        } else {
            offset = (i - 1) * 15;
        }

        const ang = angleToPlayer + offset * (Math.PI / 180);

        fireEnemyBullet(
            { x: e.x, y: e.y },
            true,
            ang,
            'big',
            75
        );
    }

    // =========================
    // ★ 左右切替
    // =========================
    e.wallPattern = (e.wallPattern === 1) ? 2 : 1;

    e.attackCount++;

    if (e.attackCount >= 6) {
        e.attackCount = 0;
        e.phaseCount++;

        if (e.phaseCount >= 3) {

            // ★ wall弾消去
            enemyBullets = enemyBullets.filter(b => b.type !== 'wall');

            e.patternCase = 4;
            e.phaseCount = 0;
            e.initDone = false;
        }
    }
}

break;
    // =====================
    // 5: 突進 + 円形弾
    // =====================
case 4: {

    e.throwTasks ??= [];
    e.case4Started ??= false;

    const COUNT = 50;
    const RADIUS = 300;

    // =====================
    // ★ 初回のみ開始（TP＋残像）
    // =====================
    if (!e.case4Started) {

        // TP前位置
        const startX = e.x;
        const startY = e.y;

        // プレイヤー周囲ランダム位置へTP
        const a = Math.random() * Math.PI * 2;
        const endX = player.x + Math.cos(a) * 220;
        const endY = player.y + Math.sin(a) * 220;

        // ★ 残像TP
        if (startX !== undefined && startY !== undefined) {
            spawnAfterImage(startX, startY, endX, endY, e.color);
        }

        e.x = endX;
        e.y = endY;

        // 投擲開始
        e.throwTasks.push({
            index: 0,
            nextTime: 0.1,
            count: COUNT,
            radius: RADIUS
        });

        e.case4Started = true;
    }

    // =====================
    // ★ ナイフ投擲更新
    // =====================
    for (let t of e.throwTasks) {

        t.nextTime -= deltaTime;
        if (t.nextTime > 0) continue;

        const randAngle = Math.random() * Math.PI * 2;

        const sx = player.x + Math.cos(randAngle) * t.radius;
        const sy = player.y + Math.sin(randAngle) * t.radius;

        const angle = Math.atan2(player.y - sy, player.x - sx);

        const spread = (t.index - (t.count / 2)) * 0.25;

        fireEnemyBullet(
            { x: sx, y: sy },
            true,
            angle + spread,
            "knife",
            70
        );

        t.index++;
        t.nextTime = 0.15 + Math.random() * 0.08;

        if (t.index >= t.count) {
            t.done = true;
        }
    }

    // =====================
    // ★ 終了処理
    // =====================
    e.throwTasks = e.throwTasks.filter(t => !t.done);

    if (e.throwTasks.length === 0) {

        e.case4Started = false;

        // 次ループ前に少し待機したいなら
        e.caseStartDelay = 0.5;

        e.patternCase = 0;
        e.initDone = false;
    }

    break;
}
// ★ switch終了はここで閉じる
}

    return;
}

// --- god ---
if (e.type === 'neoBoss') {

    // 初期化
    e.fireTimer ??= 0;
    e.patternCase ??= 0;
    e.patternTimer ??= 0;

    e.phaseCount ??= 0;
    e.subTimer ??= 0;
    e.subState ??= 0;
    e.caseStartDelay ??= 0;

    const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);

    switch (e.patternCase) {
      //周りから玉
case 0:

if (!e.initDone) {

    // =========================
    // ★ 氷河の海
    // falseならtrue化＋青フラッシュ
    // trueならそのまま
    // =========================
    if (player.isSliding === false) {

        player.isSliding = true;

        const overlay = document.getElementById('event-animation-overlay');

        if (overlay) {
            overlay.style.backgroundColor = 'rgba(0, 100, 255, 0.9)';
            overlay.classList.add('event-flash');

            setTimeout(() => {
                overlay.classList.remove('event-flash');
                overlay.style.backgroundColor = 'transparent';
            }, 500);
        }
    }

    // =========================
    // ★ TP前座標保存
    // =========================
    const oldX = e.x;
    const oldY = e.y;

    // =========================
    // ★ 新位置へTP
    // =========================
    e.x = player.x;
    e.y = player.y - 400;

    // =========================
    // ★ 残像生成
    // =========================
    if (oldX !== undefined && oldY !== undefined) {
        spawnAfterImage(oldX, oldY, e.x, e.y, e.color);
    }

    // =========================
    // ★ 基準位置
    // =========================
    e.baseX = player.x;
    e.baseY = player.y;

    e.shotCount = 0;
    e.subState = 0;
    e.fireTimer = 0.35;

    // =========================
    // ★ 最初の2地点抽選
    // =========================
    let indices = [0, 1, 2, 3];
    indices.sort(() => Math.random() - 0.5);
    e.selectedDirs = indices.slice(0, 3);

    e.initDone = true;
}

// =========================
// ★ 発射地点設定
// =========================
e.magicPoints = [];

const baseAngles = [
    rad(45),
    rad(225),
    rad(135),
    rad(315)
];

const radius = 300;

e.selectedDirs.forEach(dirIndex => {

    const a = baseAngles[dirIndex];

    const mx = e.baseX + Math.cos(a) * radius;
    const my = e.baseY + Math.sin(a) * radius;

    e.magicPoints.push({
        x: mx,
        y: my
    });
});

// =========================
// ★ 発射タイマー
// =========================
e.fireTimer -= deltaTime;

if (e.fireTimer <= 0) {

    e.fireTimer = 0.4;

    e.selectedDirs.forEach(dirIndex => {

        const a = baseAngles[dirIndex];

        const spawnX = e.baseX + Math.cos(a) * radius;
        const spawnY = e.baseY + Math.sin(a) * radius;

        const bulletCount = Math.floor(Math.random() * 7) + 4;
        const step = (Math.PI * 2) / bulletCount;

        for (let i = 0; i < bulletCount; i++) {

            const ang = i * step + step / 2;

            fireEnemyBullet(
                { x: spawnX, y: spawnY },
                true,
                ang,
                'normal',
                30
            );
        }
    });

    e.shotCount++;

    // =========================
    // ★ 3回撃ったら再抽選
    // =========================
    if (e.shotCount >= 3) {

        e.shotCount = 0;

        let indices = [0, 1, 2, 3];
        indices.sort(() => Math.random() - 0.5);
        e.selectedDirs = indices.slice(0, 2);
    }

    e.subState++;

    // =========================
    // ★ 15回発射で1セット終了
    // =========================
    if (e.subState >= 15) {

        e.subState = 0;
        e.phaseCount++;
        e.initDone = false;

        // =====================
        // ★ 5セットで次フェーズ
        // =====================
        if (e.phaseCount >= 5) {

            e.patternCase = 1;
            e.phaseCount = 0;

            // 魔法陣消去
            e.magicPoints = [];
        }
    }
}

break;
case 1:

// =====================
// 初期化
// =====================
if (!e.initDone) {

    e.timer = 0;          // 全体時間（雨用）
    e.tpTimer = 0;        // TP周期
    e.bigFireTimer = 0;   // 雨弾

    // 突進用
    e.burstTimer = 0;
    e.burstCount = 0;
    e.isBursting = false;

    e.chargeTimer = 0;
    e.isCharging = false;
    e.isDashing = false;
    e.isCooldown = false;

    e.subState = 0;

    e.afterImageTimer = 0;

    e.initDone = true;
}

e.timer += deltaTime;
e.tpTimer += deltaTime;
e.bigFireTimer -= deltaTime;
e.fireTimer = (e.fireTimer ?? 0) - deltaTime;

// =====================
// ★ 雨（常時攻撃）
// =====================
if (e.bigFireTimer <= 0 && e.timer <= 20) {
    e.bigFireTimer = 0.15;

    let rx = player.x + (Math.random() - 0.5) * 800;
    let ry = player.y - 300;

    fireEnemyBullet(
        { x: rx, y: ry },
        true,
        Math.PI / 2,
        'big',
        50
    );
}

// =====================
// ★ TP → 突進サイクル
// =====================
if (e.tpTimer >= 2) {
    e.tpTimer = 0;

    const startX = e.x;
    const startY = e.y;

    const a = Math.random() * Math.PI * 2;
    const r = 200;

    const endX = player.x + Math.cos(a) * r;
    const endY = player.y + Math.sin(a) * r;

    spawnAfterImage(startX, startY, endX, endY, e.color);

    e.x = endX;
    e.y = endY;

    // =====================
    // ★ 突進準備
    // =====================
    e.targetX = player.x;
    e.targetY = player.y;

    const dx = e.targetX - e.x;
    const dy = e.targetY - e.y;
    const len = Math.hypot(dx, dy) || 1;

    e.dashVX = dx / len * 8;
    e.dashVY = dy / len * 8;

    e.chargeTimer = 0.9;
    e.isCharging = true;
    e.isDashing = false;
    e.isCooldown = false;

    e.subState = 0;
}

// =====================
// ★ 溜め
// =====================
if (e.isCharging) {
    e.chargeTimer -= deltaTime;

    if (e.chargeTimer <= 0) {
        e.isCharging = false;
        e.isDashing = true;
    }
}

// =====================
// ★ 突進（case2統合）
// =====================
if (e.isDashing) {

    const oldX = e.x;
    const oldY = e.y;

    e.x += e.dashVX;
    e.y += e.dashVY;

    // 残像
    e.afterImageTimer -= deltaTime;

    if (e.afterImageTimer <= 0) {
        e.afterImageTimer = 0.03;
        spawnAfterImage(oldX, oldY, e.x, e.y, e.color);
    }

    // 弾幕
    if (e.fireTimer <= 0) {
        e.fireTimer = 0.2;

        const bulletCount = 5;
        const step = (Math.PI * 2) / bulletCount;

        for (let i = 0; i < bulletCount; i++) {

            const ang = i * step;

            fireEnemyBullet(
                { x: e.x, y: e.y },
                true,
                ang,
                'normal',
                30
            );
        }
    }

    e.subState++;

    if (e.subState >= 120) {
        e.subState = 0;
        e.isDashing = false;
        e.isCooldown = true;
        e.cooldownTimer = 0.6;
    }
}

// =====================
// ★ クールダウン
// =====================
if (e.isCooldown) {
    e.cooldownTimer -= deltaTime;

    if (e.cooldownTimer <= 0) {
        e.isCooldown = false;
        e.phaseCount++;

        if (e.phaseCount >= 5) {
            e.patternCase = 2;
            e.phaseCount = 0;
        }

        e.initDone = false;
    }
}

// =====================
// ★ フェーズ終了
// =====================
if (e.timer >= 20) {
    e.initDone = false;
    e.patternCase = 2;
}

break;

case 2: {

    e.throwTasks ??= [];
    e.case4Started ??= false;

    const COUNT = 100;
    const RADIUS = 300;

    // =====================
    // 初期化
    // =====================
    if (!e.case4Started) {

        e.timer = 0;

        e.rotateAngle = 0;
        e.magicTimer = 0;

        const startX = e.x;
        const startY = e.y;

        const a = Math.random() * Math.PI * 2;
        const endX = player.x + Math.cos(a) * 220;
        const endY = player.y + Math.sin(a) * 220;

        spawnAfterImage(startX, startY, endX, endY, e.color);

        e.x = endX;
        e.y = endY;

        e.throwTasks.push({
            index: 0,
            nextTime: 0.9,
            count: COUNT,
            radius: RADIUS
        });

        e.case4Started = true;
    }

    // =====================
    // 時間進行
    // =====================
    e.timer += deltaTime;

    const phase1 = 1 / 3;
    const phase2 = 2 / 3;

    // =====================
    // ★ 移動停止判定（ここが核心）
    // =====================
    let freeze = false;

    if (
        (e.timer >= phase1 && e.timer < phase1 + 1) ||
        (e.timer >= phase2 && e.timer < phase2 + 1)
    ) {
        freeze = true;
    }

    // =====================
    // ★ 回転移動（停止中はスキップ）
    // =====================
    if (!freeze) {

e.rotateAngle += (0.008 + Math.sin(Date.now() * 0.001) * 0.003) * 0.5;

        const oldX = e.x;
        const oldY = e.y;

        e.x = player.x + Math.cos(e.rotateAngle) * RADIUS;
        e.y = player.y + Math.sin(e.rotateAngle) * RADIUS;

        spawnAfterImage(oldX, oldY, e.x, e.y, e.color);
    }

    // =====================
    // ★ 弾幕（常時）
    // =====================
    for (let t of e.throwTasks) {

        t.nextTime -= deltaTime;
        if (t.nextTime > 0) continue;

        const randAngle = Math.random() * Math.PI * 2;

        const sx = player.x + Math.cos(randAngle) * t.radius;
        const sy = player.y + Math.sin(randAngle) * t.radius;

        const angle = Math.atan2(player.y - sy, player.x - sx);
        const spread = (t.index - (t.count / 2)) * 0.25;

        fireEnemyBullet(
            { x: sx, y: sy },
            true,
            angle + spread,
            "knife",
            70
        );

        t.index++;
        t.nextTime = 0.2 + Math.random() * 0.01;

        if (t.index >= t.count) {
            t.done = true;
        }
    }

    e.throwTasks = e.throwTasks.filter(t => !t.done);

    // =====================
    // ★ 魔法弾（2秒）
    // =====================
    e.magicTimer += deltaTime;

    if (e.magicTimer >= 1) {
        e.magicTimer = 0;

        const base = Math.random() * Math.PI * 2;

        for (let i = 0; i < 5; i++) {
            const ang = base + (i * (Math.PI * 2 / 5));

            fireEnemyBullet(
                { x: e.x, y: e.y },
                true,
                ang,
                "magic",
                30
            );
        }
    }

    // =====================
    // 終了
    // =====================
    if (e.throwTasks.length === 0) {

        e.case4Started = false;
        e.patternCase = 3;
        e.initDone = false;
    }

    break;
}
    // =====================
    // 5: 突進 + 円形弾
    // =====================
case 3: {

    // =====================================
    // 初期化
    // =====================================

    e.caseStarted ??= false;

    // ★ パターン実行回数（4回で case 0へ）
    e.patternCount ??= 0;

    // -1 = 抽選可能
    // 0~3 = 実行中
    // 999 = 待機中
    e.patternType ??= -1;

    e.waitTimer ??= 0;
    e.phaseDone ??= false;

    // 常時4方向弾
    e.baseShotTimer ??= 0;
    e.crossAngle ??= 0;

    // knife系
    e.attackTimer ??= 0;
    e.lifeTimer ??= 0;

    // fan系
    e.fanTimer ??= 0;
    e.fanPhase ??= 0;

    // big系
    e.bigInit ??= false;
    e.bigTimer ??= 0;
    e.bigList ??= [];

    const BIG_RADIUS = 600;

    // =====================================
    // 初回だけプレイヤー上へTP
    // =====================================

    if (!e.caseStarted) {

        const sx = e.x;
        const sy = e.y;

        const ex = player.x;
        const ey = player.y - 140;

        spawnAfterImage(sx, sy, ex, ey, e.color);

        e.x = ex;
        e.y = ey;

        e.caseStarted = true;
    }

    // =====================================
    // 常時：4方向基礎撃ち
    // =====================================

    e.baseShotTimer += deltaTime;
    e.crossAngle += 0.002;

    if (e.baseShotTimer >= 0.08) {

        e.baseShotTimer = 0;

        const dirs = [
            0,
            Math.PI / 2,
            Math.PI,
            Math.PI * 1.5
        ];

        for (let i = 0; i < 4; i++) {

            fireEnemyBullet(
                { x: e.x, y: e.y },
                true,
                e.crossAngle + dirs[i],
                "wall",
                30
            );
        }
    }

    // =====================================
    // パターン終了
    // =====================================

    if (e.phaseDone) {

        e.phaseDone = false;

        // ★ 実行回数加算
        e.patternCount++;

        // =================================
        // ★ 4回で case 0 に戻る
        // =================================
        if (e.patternCount >= 7) {

            enemies = enemies.filter(b =>
                b.type !== "wall" &&
                b.type !== "big"
            );

            e.patternCase = 0;   // ←ここ重要
            e.caseStarted = false;

            e.patternType = -1;
            e.patternCount = 0;

            e.waitTimer = 0;

            e.bigInit = false;
            e.bigTimer = 0;
            e.bigList = [];

            e.attackTimer = 0;
            e.lifeTimer = 0;

            e.fanTimer = 0;
            e.fanPhase = 0;

            break;
        }

        // =================================
        // 通常待機
        // =================================
        e.patternType = 999;
        e.waitTimer = 0.3;

        enemies = enemies.filter(b =>
            b.type !== "wall" &&
            b.type !== "big"
        );
    }

    // =====================================
    // 待機中
    // =====================================

    if (e.patternType === 999) {

        e.waitTimer -= deltaTime;

        if (e.waitTimer <= 0) {

            e.bigInit = false;
            e.bigTimer = 0;
            e.bigList = [];

            e.attackTimer = 0;
            e.lifeTimer = 0;

            e.fanTimer = 0;
            e.fanPhase = 0;

            e.patternType = -1;
        }
    }

    // =====================================
    // 抽選
    // =====================================

    if (e.patternType === -1) {
        e.patternType = Math.floor(Math.random() * 4);
    }

// =====================================
// パターン① 全方向弾（8発 → 9発 → 8発）
// =====================================

if (e.patternType === 0) {

    e.fanTimer -= deltaTime;

    if (e.fanPhase < 4 && e.fanTimer <= 0) {

        e.fanTimer = 0.7;

        // 発射数：1回目8発、2回目9発、3回目8発
        let count = 16;
        if (e.fanPhase === 1) count = 14;
        if (e.fanPhase === 2) count = 16;
        if (e.fanPhase === 3) count = 10;

        // 少し回転させたいなら毎回ランダム開始角
        const base = Math.random() * Math.PI * 2;

        for (let i = 0; i < count; i++) {

            const ang = base + (Math.PI * 2 / count) * i;

            fireEnemyBullet(
                { x: e.x, y: e.y },
                true,
                ang,
                "magic",
                30
            );
        }

        e.fanPhase++;
    }

    if (e.fanPhase >= 3) {
        e.phaseDone = true;
    }
}
    // =====================================
    // パターン② big囲い
    // =====================================

    else if (e.patternType === 1) {

        if (!e.bigInit) {

            const bullets = 14;

            for (let i = 0; i < bullets; i++) {

                const ang = (Math.PI * 2 / bullets) * i;

                const bx = e.x + Math.cos(ang) * BIG_RADIUS;
                const by = e.y + Math.sin(ang) * BIG_RADIUS;

                fireEnemyBullet(
                    { x: bx, y: by },
                    true,
                    Math.atan2(e.y - by, e.x - bx),
                    "big",
                    80
                );
            }

            e.bigInit = true;
            e.bigTimer = 3;
        }

        e.bigTimer -= deltaTime;

        if (e.bigTimer <= 0) {
            e.phaseDone = true;
        }
    }

    // =====================================
    // パターン③ ナイフ連射
    // =====================================

    else if (e.patternType === 2) {

        e.attackTimer += deltaTime;
        e.lifeTimer += deltaTime;

        if (e.attackTimer >= 0.2) {

            e.attackTimer = 0;

            fireEnemyBullet(
                { x: e.x, y: e.y },
                true,
                Math.atan2(player.y - e.y, player.x - e.x),
                "knife",
                70
            );
        }

        if (e.lifeTimer >= 3) {
            e.phaseDone = true;
        }
    }

    // =====================================
    // パターン④ 円周上にナイフ3本配置
    // =====================================

    else if (e.patternType === 3) {

        if (!e.bigInit) {

            const knives = 5;
            e.bigList = [];

            for (let i = 0; i < knives; i++) {

                const ang = (Math.PI * 2 / knives) * i;

                const bx = e.x + Math.cos(ang) * BIG_RADIUS;
                const by = e.y + Math.sin(ang) * BIG_RADIUS;

                const bullet = fireEnemyBullet(
                    { x: bx, y: by },
                    true,
                    Math.atan2(e.y - by, e.x - bx),
                    "knife",
                    30
                );

                e.bigList.push(bullet);
            }

            e.bigInit = true;
            e.bigTimer = 2;
        }

        e.bigTimer -= deltaTime;

        if (e.bigTimer <= 0) {

            e.bigList.forEach(b => {
                const index = enemies.indexOf(b);
                if (index !== -1) enemies.splice(index, 1);
            });

            e.bigList = [];
            e.phaseDone = true;
        }
    }

    break;
}

// ★ switch終了はここで閉じる
}

    return;
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


    return;
  }


}



if (e.type === 'shooter' || e.type === 'mage') {

  const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);

  const SHOOT_RANGE = 300;
  const PADDING = 50;

  e.shootTimer ??= 0;
  e.shootTimer += deltaTime;

  e.patternTimer ??= 0;
  e.patternTimer += deltaTime;

  const inRange = dist <= SHOOT_RANGE && dist >= SHOOT_RANGE - PADDING;

  const shootInterval =
    e.type === 'shooter'
      ? (inRange ? 1.4 : 2.8)
      : (inRange ? 3.0 : 4.0);

  // =========================
  // 移動AI
  // =========================
  if (dist > SHOOT_RANGE) {
    e.x += Math.cos(angle) * moveSpeed;
    e.y += Math.sin(angle) * moveSpeed;
    e.state = 'move';
  }

  else if (dist < SHOOT_RANGE - PADDING) {
    let awayAngle = angle + Math.PI;
    e.x += Math.cos(awayAngle) * moveSpeed * 0.5;
    e.y += Math.sin(awayAngle) * moveSpeed * 0.5;
    e.state = 'retreat';
  }

  else {
    e.state = 'idle';
  }

  // =========================
  // shooter
  // =========================
  if (e.type === 'shooter') {

    if (e.shootTimer >= shootInterval) {
      fireEnemyBullet(e, false, angleToPlayer, 'normal', 50);
      e.shootTimer = 0;
    }
  }

  // =========================
  // mage（固定3way）
  // =========================
  else if (e.type === 'mage') {

    if (e.shootTimer >= shootInterval) {

      fireEnemyBullet(e, false, angleToPlayer, 'normal', 50);
      fireEnemyBullet(e, false, angleToPlayer + rad(12), 'normal', 50);
      fireEnemyBullet(e, false, angleToPlayer - rad(12), 'normal', 50);

      e.shootTimer = 0;
    }

    e.patternTimer += deltaTime;
  }

  return;
}
 if (e.type === 'charger') {

  // 初期化
  e.state ??= 'move';
  e.cooldown ??= 0;
  e.chargeTimer ??= 0;
  e.lockAngle ??= 0;

  const DETECT_RANGE = 120;   // プレイヤーを検知する距離
  const PREP_TIME = 0.7;      // 停止時間（秒）
  const CHARGE_TIME = 0.5;    // 突進時間
  const CHARGE_SPEED = e.speed * 4;

  const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);

  // =====================
  // 通常状態
  // =====================
  if (e.state === 'move') {

    e.x += Math.cos(angleToPlayer) * e.speed * enemySpeedMult * deltaTime;
    e.y += Math.sin(angleToPlayer) * e.speed * enemySpeedMult * deltaTime;

    // プレイヤーが近い → チャージ準備
    if (dist < DETECT_RANGE) {
      e.state = 'prep';
      e.cooldown = 0;
    }
  }

  // =====================
  // 準備（停止）
  // =====================
  else if (e.state === 'prep') {

    e.cooldown += deltaTime;

    // 停止（動かない）

    if (e.cooldown === 0 || e.lockAngle === 0) {
      e.lockAngle = angleToPlayer; // ここで方向固定
    }

    if (e.cooldown >= PREP_TIME) {
      e.state = 'charge';
      e.chargeTimer = 0;
    }
  }

  // =====================
  // チャージ（突進）
  // =====================
  else if (e.state === 'charge') {

    e.chargeTimer += deltaTime;

    e.x += Math.cos(e.lockAngle) * CHARGE_SPEED * deltaTime;
    e.y += Math.sin(e.lockAngle) * CHARGE_SPEED * deltaTime;

    if (e.chargeTimer >= CHARGE_TIME) {
      e.state = 'move';
      e.cooldown = 0;
      e.chargeTimer = 0;
      e.lockAngle = 0;
    }
  }

  return;
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

  }); //forEach 正常終了
} //enemySpeedMult > 0 正常終了
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
  if (typeof eb.size !== 'number') eb.size = 4;

  // ★ Magic用の初期化（安全に）
  if (eb.type === 'Magic') {
    if (typeof eb.baseSize !== 'number') eb.baseSize = eb.size;
    if (typeof eb.animTimer !== 'number') eb.animTimer = 0;
  }

// ★ ここに入れる
if (typeof eb.life !== 'number') {
    if (eb.type === 'wall') {
        eb.life = 140; // 壁は消えない or ほぼ消えない
    } 
else if (eb.type === 'qwe') {
        eb.life = 0.2;   // 2秒で消える bigg
    }
    else {
        eb.life = 3;
    }
}
if (eb.type === 'knife') {

  // =========================
  // ① 初期化保険
  // =========================
  eb.spinTimer ??= 0.3;
  eb.spinAngle ??= 0;
  eb.renderAngle ??= 0;
  eb.renderAngleOffset ??= 0;
  eb.state ??= 'spin';

  // =========================
  // ② 回転フェーズ
  // =========================
  if (eb.state === 'spin') {

    eb.spinTimer -= deltaTime;

    // 見た目回転
    eb.spinAngle += 0.15;

    // ★ 回転中の表示角度
    eb.renderAngle = eb.spinAngle;

    // 完全停止
    eb.vx = 0;
    eb.vy = 0;

    // 発射
    if (eb.spinTimer <= 0) {

      eb.state = 'move';

      const angle = Math.atan2(player.y - eb.y, player.x - eb.x);
      const speed = 200;

      eb.vx = Math.cos(angle) * speed;
      eb.vy = Math.sin(angle) * speed;

      // ★ 発射角度固定
      eb.renderAngle = angle;

      // ★★★ ここだけいじれば見た目変わる
eb.renderAngleOffset = Math.PI / 2;   // 90°
    }

    continue;
  }

  // =========================
  // ③ 移動
  // =========================
  eb.x += eb.vx * deltaTime;
  eb.y += eb.vy * deltaTime;
}
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

  // =====================
  // ★ Magic弾のサイズ変化
  // =====================
  if (type === 'Magic') {
    eb.animTimer += deltaTime;

    // 0.6秒周期（0.3拡大→0.3縮小）
    const t = (eb.animTimer % 0.6) / 0.6;

    // なめらか変化
    const scale = Math.sin(t * Math.PI);

    eb.size = eb.baseSize + scale * 15;
  }

  // --- 移動 ---
  eb.x += eb.vx * deltaTime;
  eb.y += eb.vy * deltaTime;
if (eb.type === 'wall') {
    eb.life -= deltaTime * 0.05; // ★10倍長持ち
} else {
    eb.life -= deltaTime;
}

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
//
  // ======================================
// 毎フレーム update() の最後あたりで呼ぶ
// ======================================
updateGodBossPhase2(deltaTime);
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
// --- 描画処理 (プレイヤー描画強化、ニンニク初期オーラ描画抑止) ---
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
//魔法陣
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
    ctx.fillRect(
        screenX - size/2,
        screenY - size/2 - 8,
        (e.hp / e.maxHp) * size,
        3
    );

    // ★ 魔法陣描画
    if (e.magicPoints) {
        e.magicPoints.forEach(p => {
            drawMagic(
                ctx,
                getScreenX(p.x),
                getScreenY(p.y),
                40
            );
        });
    }
});
  //tp残像
  afterImages.forEach(a => {
    ctx.save();
    ctx.globalAlpha = a.alpha;
    ctx.fillStyle = a.color;

    const sx = getScreenX(a.x);
    const sy = getScreenY(a.y);

    ctx.fillRect(
        sx - a.size / 2,
        sy - a.size / 2,
        a.size,
        a.size
    );

    ctx.restore();
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
  

// 6. 敵弾 (描画)
enemyBullets.forEach(eb => {

  let screenX = getScreenX(eb.x);
  let screenY = getScreenY(eb.y);

  let size = eb.size * (eb.type === 'big' ? 3 : 1);
if (eb.type === 'knife') {

    ctx.save();
    ctx.translate(screenX, screenY);

    // =========================
    // ★ 向き（180度追加回転）
    // =========================
    const angle =
        (eb.renderAngle || 0) +
        (eb.renderAngleOffset || 0) +
        Math.PI * 2;

    ctx.rotate(angle);

    // =========================
    // ★ 軽い残像
    // =========================
    for (let i = 3; i >= 1; i--) {

        ctx.save();
        ctx.globalAlpha = 0.08 * i;
        ctx.translate(0, i * 8);

        ctx.fillStyle = "#cccccc";

        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(3, -8);
        ctx.lineTo(3, 18);
        ctx.lineTo(0, 22);
        ctx.lineTo(-3, 18);
        ctx.lineTo(-3, -8);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // =========================
    // ★ 本体（細身）
    // =========================
    const bladeGrad = ctx.createLinearGradient(0, -18, 0, 18);
    bladeGrad.addColorStop(0, "#ffffff");
    bladeGrad.addColorStop(0.4, "#dcdcdc");
    bladeGrad.addColorStop(0.75, "#999999");
    bladeGrad.addColorStop(1, "#555555");

    ctx.fillStyle = bladeGrad;

    // 刀身（細く）
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(3, -8);
    ctx.lineTo(3, 18);
    ctx.lineTo(0, 24);
    ctx.lineTo(-3, 18);
    ctx.lineTo(-3, -8);
    ctx.closePath();
    ctx.fill();

    // ハイライト
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.stroke();

    // 鍔
    ctx.fillStyle = "#b8860b";
    ctx.fillRect(-6, 16, 12, 3);

    // 柄
    ctx.fillStyle = "#222";
    ctx.fillRect(-2, 19, 4, 11);

    // 柄巻き
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 1;

    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-2, 21 + i * 3);
        ctx.lineTo(2, 23 + i * 3);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(2, 21 + i * 3);
        ctx.lineTo(-2, 23 + i * 3);
        ctx.stroke();
    }

    // 軽い発光
    ctx.shadowColor = "rgba(255,255,255,0.35)";
    ctx.shadowBlur = 5;

    ctx.restore();
    return;
}
  // =====================
  // ★ 既存弾
  // =====================
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

drawFog(ctx, canvas);
// ======================================
// draw() 内で enemies描画の後くらいで呼ぶ
// ======================================
drawGodBossPhase2(ctx);

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

function drawFog(ctx, canvas) {
    if (!fogActive) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = canvas.width;
    fogCanvas.height = canvas.height;
    const fogCtx = fogCanvas.getContext('2d');

    // ① 霧レイヤーだけに描く
    fogCtx.fillStyle = 'rgba(50,50,50,1)';
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

    // ② 霧だけをくり抜く
    fogCtx.globalCompositeOperation = 'destination-out';
    fogCtx.beginPath();
    fogCtx.arc(cx, cy, 120, 0, Math.PI * 2);
    fogCtx.fill();

    // ③ 最後に本canvasへ合成
    ctx.drawImage(fogCanvas, 0, 0);
}

function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
}

function spawnKnife(x, y, angle) {

    return {
        x: x,
        y: y,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        angle: angle,
        life: 120,
        type: "knife"
    };
}

function updateKnife(k) {
    k.x += k.vx;
    k.y += k.vy;

    k.rotation += 0.2;
    k.life--;
}
//魔法陣展開
function drawMagic(ctx, x, y, size) {
  console.log("drawMagic called", x, y, size);
    const magicCanvas = document.createElement("canvas");
    magicCanvas.width = size * 3;
    magicCanvas.height = size * 3;

    const mctx = magicCanvas.getContext("2d");

    const cx = magicCanvas.width / 2;
    const cy = magicCanvas.height / 2;

    // 回転
    const rot = performance.now() * 0.002;

    mctx.save();
    mctx.translate(cx, cy);
    mctx.rotate(rot);

    // 発光
    mctx.shadowColor = "rgba(180,100,255,1)";
    mctx.shadowBlur = 15;

    mctx.strokeStyle = "rgba(180,100,255,0.9)";
    mctx.lineWidth = 2;

    // 外円
    mctx.beginPath();
    mctx.arc(0, 0, size, 0, Math.PI * 2);
    mctx.stroke();

    // 中円
    mctx.beginPath();
    mctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
    mctx.stroke();

    // 内円
    mctx.beginPath();
    mctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    mctx.stroke();

    // 五芒星
    for (let i = 0; i < 5; i++) {
        const a1 = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const a2 = (Math.PI * 2 / 5) * ((i + 2) % 5) - Math.PI / 2;

        mctx.beginPath();
        mctx.moveTo(
            Math.cos(a1) * size * 0.8,
            Math.sin(a1) * size * 0.8
        );
        mctx.lineTo(
            Math.cos(a2) * size * 0.8,
            Math.sin(a2) * size * 0.8
        );
        mctx.stroke();
    }

    // 小円装飾
    for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 / 8) * i;
        const px = Math.cos(a) * size * 0.88;
        const py = Math.sin(a) * size * 0.88;

        mctx.beginPath();
        mctx.arc(px, py, size * 0.06, 0, Math.PI * 2);
        mctx.stroke();
    }

    mctx.restore();
console.log("drawImage実行直前", x, y, magicCanvas.width, magicCanvas.height);
    // 本canvasへ描画
    ctx.drawImage(
        magicCanvas,
        x - magicCanvas.width / 2,
        y - magicCanvas.height / 2
    );
}

function spawnAfterImage(x1, y1, x2, y2, color) {
    const dx = x2 - x1;
    const dy = y2 - y1;

    const count = 8;

    for (let i = 0; i < count; i++) {
        const t = i / count;

        afterImages.push({
            x: x1 + dx * t,
            y: y1 + dy * t,
            alpha: 0.6 - t * 0.6,
            size: 40 - t * 10,
            life: 0.25,
            color: color
        });
    }
}

function updateGodBossPhase2(deltaTime) {

    if (!godPhase2Event || !godPhase2Event.active) return;

    const g = godPhase2Event;
    g.timer += deltaTime;

    // ===============================
    // 0. 残像でプレイヤー上へ移動
    // ===============================
    if (g.state === 0) {

        const speed = 0.06;

        g.ghostX += (g.targetX - g.ghostX) * speed;
        g.ghostY += (g.targetY - g.ghostY) * speed;

        // 白粒 trail
        g.particles.push({
            x: g.ghostX,
            y: g.ghostY,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 25,
            size: 3
        });

        if (Math.hypot(g.targetX - g.ghostX, g.targetY - g.ghostY) < 15) {
            g.state = 1;
            g.timer = 0;

            // 周囲から粒生成
            for (let i = 0; i < 140; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = 220 + Math.random() * 120;

                g.particles.push({
                    x: g.targetX + Math.cos(a) * r,
                    y: g.targetY + Math.sin(a) * r,
                    vx: 0,
                    vy: 0,
                    life: 999,
                    gather: true,
                    size: 2 + Math.random() * 2
                });
            }
        }
    }

    // ===============================
    // 1. 粒が集まる
    // ===============================
    else if (g.state === 1) {

        g.particles.forEach(p => {

            if (!p.gather) return;

            p.x += (g.targetX - p.x) * 0.06;
            p.y += (g.targetY - p.y) * 0.06;
        });

        if (g.timer >= 2.2) {

            g.state = 2;
            g.timer = 0;

            // 爆散粒
            g.particles = [];

            for (let i = 0; i < 220; i++) {

                const a = Math.random() * Math.PI * 2;
                const sp = 2 + Math.random() * 6;

                g.particles.push({
                    x: g.targetX,
                    y: g.targetY,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp,
                    life: 40,
                    size: 2 + Math.random() * 3
                });
            }

            // 第二形態ボス出現
            spawnBoss('neo');

            // 出現位置補正
            const b = enemies[enemies.length - 1];
            b.x = g.targetX;
            b.y = g.targetY;
            b.phase2 = true;

            showFloat(g.targetX, g.targetY, "ASCENDED", "white");
        }
    }

    // ===============================
    // 2. 放出して終了
    // ===============================
    else if (g.state === 2) {

        if (g.timer >= 1.0) {
            g.active = false;
        }
    }

    // 粒共通更新
    g.particles.forEach(p => {
        p.x += p.vx || 0;
        p.y += p.vy || 0;
        p.life--;
    });

    g.particles = g.particles.filter(p => p.life > 0);
}
function drawGodBossPhase2(ctx) {

    if (!godPhase2Event || !godPhase2Event.active) return;

    const g = godPhase2Event;

    // 残像本体
    if (g.state === 0) {

        const sx = getScreenX(g.ghostX);
        const sy = getScreenY(g.ghostY);

        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(sx, sy, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 粒描画
    g.particles.forEach(p => {

        const sx = getScreenX(p.x);
        const sy = getScreenY(p.y);

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / 40);
        ctx.fillStyle = "white";

        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });

    // 集束中の塊
    if (g.state === 1) {

        const sx = getScreenX(g.targetX);
        const sy = getScreenY(g.targetY);

        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(sx, sy, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
init();
