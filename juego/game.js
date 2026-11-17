'use strict';
// 🚬☕ Piti-Pause Rush · un run & gun infinito para Mai.
const W = 480, H = 270, GROUND = 236;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- Pantalla ----------
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', fit); fit();

// ---------- Guardado ----------
const SAVE_KEY = 'pitipause-rush-v1';
let save = { points: 0, best: 0, char: 'mai', up: {}, muted: false, runs: 0 };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = Object.assign(save, s); } catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const lvl = id => save.up[id] || 0;
Audio8.setMuted(save.muted);

// ---------- Datos ----------
const CHARS = {
  mai:    { name: 'Mai',    w: 22, h: 52, sh: 21, shot: 'bullet',   rate: 0.17, dmg: 1, vx: 430, special: 'burst', cd: 8, jump: 450,
            lines: ['Doble revólver', 'Especial:', 'Ráfaga gótica'] },
  aiden:  { name: 'Aiden',  w: 46, h: 36, sh: 14, shot: 'heart', rate: 0.32, dmg: 2, vx: 300, special: 'dash', cd: 6,
            lines: ['Corazones especiales', 'con poderes', 'Especial:', 'Embestida'] },
  nobodi: { name: 'Nobodi', w: 46, h: 36, sh: 14, shot: 'meow',     rate: 0.34, dmg: 2, vx: 300, range: 0.7, special: 'sonic', cd: 7, dj: true,
            lines: ['Maullido fuerte', 'Doble salto', 'Especial:', 'Maullido sónico'] },
};
const ORDER = ['mai', 'aiden', 'nobodi'];
const UPGRADES = [
  { id: 'hp',      name: 'Vida extra',     icon: 'heart',  desc: '+1 corazón',           costs: [50, 120, 250] },
  { id: 'dj',      name: 'Doble salto',    icon: 'coin',   desc: 'Salta en el aire',     costs: [150] },
  { id: 'magnet',  name: 'Imán',           icon: 'magnet', desc: 'Atrae monedas',        costs: [60, 120, 200] },
  { id: 'shield',  name: 'Escudo inicial', icon: 'shield', desc: 'Empiezas protegida',   costs: [100] },
  { id: 'fire',    name: 'Cadencia',       icon: 'double', desc: 'Disparas más rápido',  costs: [80, 160, 300] },
  { id: 'special', name: 'Especial rápido',icon: 'clock',  desc: 'El especial carga antes', costs: [80, 160, 300] },
  { id: 'coffee',  name: 'Café largo',     icon: 'coffee', desc: 'Power-ups duran más',  costs: [70, 150] },
];
const PUPS = ['coffee', 'heart', 'shield', 'double', 'magnet', 'clock'];
const PUP_NAMES = { coffee: '¡CAFÉ! Disparo rápido', heart: '+1 corazón', shield: 'Escudo', double: 'Disparo doble', magnet: 'Imán', clock: '+10 monedas' };

// ---------- Utilidades ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function text(s, x, y, size, col, align, shadow) {
  ctx.font = Math.round((size || 8) * 1.25) + 'px PIX, monospace';
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'top';
  if (shadow !== false) { ctx.fillStyle = shadow || '#000'; ctx.fillText(s, Math.round(x) + 1, Math.round(y) + 1); }
  ctx.fillStyle = col || '#fff'; ctx.fillText(s, Math.round(x), Math.round(y));
}
function box(x, y, w, h, fill, line) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  if (line) { ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
}

// ---------- Fondos (provisionales, por código) ----------
function makeLayer(draw) { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); draw(x); return c; }
const SKY = makeLayer(c => {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1b0f2e'); g.addColorStop(0.55, '#5a1f4a'); g.addColorStop(0.85, '#c2364a'); g.addColorStop(1, '#ff8a4c');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = '#ffd9a0'; c.beginPath(); c.arc(360, 150, 22, 0, 7); c.fill();
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  c.fillStyle = '#fff'; for (let i = 0; i < 45; i++) c.fillRect(Math.floor(r() * W), Math.floor(r() * 110), 1, 1);
});
const FAR = makeLayer(c => {
  c.fillStyle = '#3a1736';
  let x = 0; while (x < W) { const w = 14 + (x * 7) % 26, h = 30 + (x * 13) % 50; c.fillRect(x, 190 - h, w, h + 80); x += w; }
  c.fillRect(200, 110, 6, 80); c.beginPath(); c.arc(260, 165, 26, Math.PI, 0); c.fill(); // la Ciudad de las Artes, más o menos
});
const MID = makeLayer(c => {
  let x = 0, i = 0;
  while (x < W) {
    const w = 46 + (i * 17) % 30, h = 70 + (i * 29) % 60;
    c.fillStyle = i % 2 ? '#20142a' : '#271833'; c.fillRect(x, 230 - h, w - 4, h + 40);
    c.fillStyle = '#ffd36e';
    for (let wy = 236 - h; wy < 225; wy += 9) for (let wx = x + 4; wx < x + w - 10; wx += 8) if ((wx * 3 + wy * 7 + i) % 5 > 1) c.fillRect(wx, wy, 4, 5);
    x += w; i++;
  }
});
const FRONT = makeLayer(c => {
  c.fillStyle = '#2a2230'; for (let x = 0; x < W; x += 24) c.fillRect(x, GROUND - 22, 3, 22);
  c.fillRect(0, GROUND - 23, W, 3);
  c.fillStyle = '#4a4252'; c.fillRect(60, GROUND - 18, 34, 18); c.fillStyle = '#2a2230'; for (let y = 0; y < 14; y += 4) c.fillRect(64, GROUND - 16 + y, 26, 2);
  c.fillStyle = '#3d6b3a'; c.fillRect(300, GROUND - 16, 12, 8); c.fillStyle = '#7a4a2a'; c.fillRect(301, GROUND - 9, 10, 9);
  c.fillStyle = '#6b6f80'; c.fillRect(410, GROUND - 20, 3, 20); c.fillRect(405, GROUND - 22, 13, 3);
});
let scrollX = 0;
// Fondos de Gemini (si no cargan, se usan los provisionales de arriba)
const BG = {};
for (const [k, f] of [['sky', 'fondo-cielo'], ['mid', 'fondo-edificios'], ['front', 'fondo-azotea'], ['cover', 'portada']]) {
  const im = new Image(); im.src = 'assets/' + f + '.png'; BG[k] = im;
}
const ok = im => im && im.complete && im.naturalWidth > 0;
function tile(im, k, y) {
  const w = im.naturalWidth, o = -((scrollX * k) % w);
  for (let x = Math.floor(o); x < W; x += w) ctx.drawImage(im, x, y);
}
function drawWorld(dt, speed) {
  scrollX += speed * dt;
  if (ok(BG.sky) && ok(BG.mid) && ok(BG.front)) {
    tile(BG.sky, 0.08, 0); tile(BG.mid, 0.3, 0); tile(BG.front, 1, -12);
    return;
  }
  ctx.drawImage(SKY, 0, 0);
  for (const [img, k] of [[FAR, 0.1], [MID, 0.35], [FRONT, 1]]) {
    const o = -((scrollX * k) % W);
    ctx.drawImage(img, Math.floor(o), 0); ctx.drawImage(img, Math.floor(o) + W, 0);
  }
  box(0, GROUND, W, H - GROUND, '#3b3442');
  ctx.fillStyle = '#4c4455'; ctx.fillRect(0, GROUND, W, 2);
  ctx.fillStyle = '#2f2936';
  const o = -(scrollX % 32);
  for (let x = o; x < W; x += 32) ctx.fillRect(Math.floor(x), GROUND + 6, 16, 2);
}

// ---------- Entrada ----------
const keys = new Set();
const touch = { jump: false, shoot: false, special: false, slide: false };
let isTouch = false;
const inp = { jump: false, shoot: false, special: false, slide: false }, prev = Object.assign({}, inp), pressed = Object.assign({}, inp);
addEventListener('keydown', e => {
  keys.add(e.code); Audio8.init();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  onKey(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));
function readInput() {
  inp.jump = touch.jump || keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW');
  inp.shoot = touch.shoot || keys.has('KeyJ') || keys.has('KeyX') || keys.has('KeyZ');
  inp.special = touch.special || keys.has('KeyK') || keys.has('KeyC');
  inp.slide = touch.slide || keys.has('ArrowDown') || keys.has('KeyS');
  for (const k in inp) { pressed[k] = inp[k] && !prev[k]; prev[k] = inp[k]; }
}
const TBTN = {
  jump:    { x: 42,  y: 222, r: 28, label: 'SALTO' },
  slide:   { x: 104, y: 244, r: 18, label: '▼' },
  shoot:   { x: 438, y: 222, r: 28, label: 'FUEGO' },
  special: { x: 376, y: 244, r: 18, label: 'ESP' },
};
const ptrs = new Map();
function toGame(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); Audio8.init();
  if (e.pointerType === 'touch') isTouch = true;
  const p = toGame(e);
  if (state === 'play') {
    if (p.x > W - 30 && p.y < 28) { setState('pause'); return; }
    for (const k in TBTN) { const b = TBTN[k]; if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 10) { ptrs.set(e.pointerId, k); touch[k] = true; return; } }
    // toque libre: mitad izquierda salta, mitad derecha dispara
    const k = p.x < W / 2 ? 'jump' : 'shoot'; ptrs.set(e.pointerId, k); touch[k] = true;
    return;
  }
  click(p.x, p.y);
}, { passive: false });
function release(e) { const k = ptrs.get(e.pointerId); if (k) { touch[k] = false; ptrs.delete(e.pointerId); } }
cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release); cv.addEventListener('pointerleave', release);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (state === 'play') setState('pause'); Audio8.suspend(); } else Audio8.resume();
});
// Desde la app de Android: botón «atrás» y app en segundo plano.
window.onBack = () => {
  if (state === 'play') { setState('pause'); return 'ok'; }
  if (state === 'title') return 'exit';
  if (state === 'pause') Audio8.stop();
  setState('title'); return 'ok';
};
window.onAppPause = () => { if (state === 'play') setState('pause'); Audio8.suspend(); };
addEventListener('focus', () => Audio8.resume());

// ---------- Botones de las pantallas ----------
let ui = [];
function button(x, y, w, h, label, fn, opt) {
  opt = opt || {};
  ui.push({ x, y, w, h, fn });
  const on = opt.active;
  box(x, y, w, h, opt.disabled ? '#2a2430' : on ? '#c4142c' : '#1a1222', opt.disabled ? '#4a4052' : '#ff4d6d');
  box(x + 1, y + h - 3, w - 2, 2, 'rgba(0,0,0,0.35)');
  text(label, x + w / 2, y + h / 2 - (opt.size || 8) / 2, opt.size || 8, opt.disabled ? '#6a6070' : '#fff', 'center');
}
function click(x, y) { for (const b of ui) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { Audio8.sfx('click'); b.fn(); return; } }

// ---------- Estados ----------
let state = 'title', g = null, stateT = 0, overInfo = null, selIdx = Math.max(0, ORDER.indexOf(save.char)), shopMsg = '', shopMsgT = 0;
function setState(s) {
  state = s; stateT = 0;
  for (const k in touch) touch[k] = false; ptrs.clear();
  if (s === 'title' || s === 'select' || s === 'shop') Audio8.play('title');
}
function onKey(code) {
  const ok = code === 'Enter' || code === 'Space';
  if (state === 'title' && ok) setState('select');
  else if (state === 'select') {
    if (code === 'ArrowLeft') selIdx = (selIdx + 2) % 3;
    if (code === 'ArrowRight') selIdx = (selIdx + 1) % 3;
    if (ok) startRun();
    if (code === 'Escape') setState('title');
  } else if (state === 'shop' && code === 'Escape') setState('title');
  else if (state === 'play' && (code === 'Escape' || code === 'KeyP')) setState('pause');
  else if (state === 'pause' && (code === 'Escape' || code === 'KeyP' || ok)) setState('play');
  else if (state === 'over' && ok && stateT > 0.8) startRun();
}

// ---------- Partida ----------
function startRun() {
  save.char = ORDER[selIdx]; persist();
  const C = CHARS[save.char];
  const maxHp = 3 + lvl('hp');
  g = {
    t: 0, dist: 0, speed: 130, coins: 0, kills: 0, bosses: 0,
    p: { x: 70, y: GROUND - C.h, w: C.w, h: C.h, vy: 0, ground: true, jumps: 0, hp: maxHp, maxHp, inv: 0,
         shield: lvl('shield') > 0, fireT: 0, spT: 0, burst: 0, dash: 0, slide: false, shootAnim: 0, hurtT: 0 },
    shots: [], eshots: [], foes: [], pickups: [], parts: [], pops: [], plats: [],
    spawnT: 1.5, coinT: 1, platT: 3, pupT: 9, boss: null, nextBoss: 1500, buffs: { coffee: 0, double: 0, magnet: 0 },
    shake: 0, flash: 0, msg: '', msgT: 0,
  };
  setState('play'); Audio8.play('run');
}
function say(m, t) { g.msg = m; g.msgT = t || 2; }
function burst(x, y, col, n, sp) { for (let i = 0; i < (n || 8); i++) g.parts.push({ x, y, vx: rnd(-1, 1) * (sp || 90), vy: rnd(-1.2, 0.6) * (sp || 90), life: rnd(0.3, 0.7), col }); }
function pop(x, y, s, col) { g.pops.push({ x, y, s, col: col || '#ffcf3f', life: 0.8 }); }

function hurtPlayer() {
  const p = g.p;
  if (p.inv > 0 || p.dash > 0) return;
  if (p.shield) { p.shield = false; p.inv = 1; Audio8.sfx('enemy'); burst(p.x + p.w / 2, p.y + p.h / 2, '#7fb3ff', 12); return; }
  p.hp--; p.inv = 1.3; p.hurtT = 0.3; g.shake = 0.3; Audio8.sfx('hit');
  burst(p.x + p.w / 2, p.y + p.h / 2, '#e8193c', 10);
  if (p.hp <= 0) endRun();
}
function endRun() {
  const d = Math.floor(g.dist);
  const earned = g.coins + Math.floor(d / 50) + g.kills;
  const record = d > save.best;
  if (record) save.best = d;
  save.points += earned; save.runs++; persist();
  overInfo = { d, coins: g.coins, kills: g.kills, earned, record, bosses: g.bosses };
  Audio8.stop(); Audio8.sfx('over');
  setState('over');
}

function spawnFoe() {
  const diff = Math.min(1, g.dist / 3000);
  const r = Math.random();
  let f;
  if (r < 0.22) f = { type: 'printer', w: 40, h: 34, y: GROUND - 34, hp: 3, vx: 0, fireT: rnd(0.6, 1.4) };
  else if (r < 0.42) f = { type: 'mug', w: 24, h: 30, y: GROUND - 30, hp: 2, vx: -70 - 40 * diff };
  else if (r < 0.64) f = { type: 'stapler', w: 34, h: 22, y: rnd(110, 180), hp: 1, vx: -50, base: 0, wave: rnd(0, 6) };
  else if (r < 0.82 && g.dist > 250) f = { type: 'email', w: 30, h: 24, y: rnd(30, 60), hp: 1, vx: -90, dived: false };
  else f = { type: 'crate', w: 26, h: 26, y: GROUND - 26, hp: 2, vx: 0 };
  f.x = W + 10; f.t = 0; f.atk = 0; f.base = f.y; f.hitBy = new Set();
  g.foes.push(f);
}
function spawnCoins() {
  const n = 5, y0 = pick([GROUND - 20, GROUND - 70, GROUND - 100]);
  const arc = Math.random() < 0.5;
  for (let i = 0; i < n; i++) g.pickups.push({ type: 'coin', x: W + 10 + i * 20, y: y0 - (arc ? Math.sin(i / (n - 1) * Math.PI) * 34 : 0), w: 13, h: 13 });
}
function spawnPlat() {
  const w = Math.floor(rnd(64, 110)), y = Math.floor(rnd(164, 190));
  g.plats.push({ x: W + 10, y, w, h: 4 });
  for (let i = 0; i < 3; i++) g.pickups.push({ type: 'coin', x: W + 18 + i * (w - 24) / 2, y: y - 18, w: 13, h: 13 });
}
function spawnBoss() {
  const hp = 40 + g.bosses * 18;
  g.boss = { x: W + 20, y: GROUND - 150, w: 134, h: 150, atkAnim: 0, hp, maxHp: hp, t: 0, atkT: 2.5, hurt: 0, phase: 1, enter: true };
  say('¡LA FOTOCOPIADORA INFERNAL!', 2.5); Audio8.play('boss');
}

function fire() {
  const p = g.p, C = CHARS[save.char];
  const dbl = g.buffs.double > 0;
  const ox = p.x + p.w + 2, oy = p.slide ? p.y + 2 : p.y + C.sh;
  const add = (vy, dy) => g.shots.push({ type: C.shot, x: ox, y: oy + (dy || 0), w: C.shot === 'meow' ? 18 : C.shot === 'heart' ? 13 : 9, h: C.shot === 'meow' ? 34 : C.shot === 'heart' ? 12 : 9,
    vx: C.vx, vy: vy || 0, v: Math.floor(Math.random() * 3), dmg: C.dmg, pierce: !!C.pierce || C.shot === 'meow', life: C.range || 1.4, max: C.range || 1.4, hit: new Set() });
  if (C.shot === 'meow') { const s = g.shots; add(0, -11); s[s.length - 1].y = oy - 11; if (dbl) add(0, -30); Audio8.sfx('meow'); }
  else if (p.burst > 0) { for (const a of [-0.3, -0.15, 0, 0.15, 0.3]) add(Math.sin(a) * C.vx, 0); Audio8.sfx('shoot'); }
  else if (dbl) { add(0, -3); add(0, 3); Audio8.sfx(C.shot === 'heart' ? 'heart' : 'shoot'); }
  else { add(0, 0); Audio8.sfx(C.shot === 'heart' ? 'heart' : 'shoot'); }
  if (C.shot === 'heart') heartPowers();
  p.shootAnim = 0.15;
}
function special() {
  const p = g.p, C = CHARS[save.char];
  p.spT = C.cd * (1 - 0.15 * lvl('special'));
  Audio8.sfx('special');
  if (C.special === 'burst') { p.burst = 2.5; say('¡RÁFAGA GÓTICA!', 1.2); }
  else if (C.special === 'dash') { p.dash = 0.6; say('¡EMBESTIDA!', 1); }
  else {
    say('¡MAULLIDO SÓNICO!', 1.2); g.flash = 0.25; g.shake = 0.25;
    for (const s of g.eshots) burst(s.x, s.y, '#ff8fa3', 4);
    g.eshots.length = 0;
    for (const f of g.foes) if (f.x < W) damage(f, 3);
    if (g.boss && !g.boss.enter) damageBoss(6);
  }
}
// 💘 Corazones de Aiden: cada disparo sale de un tipo al azar.
const HEARTS = ['broken', 'bat', 'fire', 'stitch'];
function heartPowers() {
  for (const s of g.shots) if (s.type === 'heart' && !s.kind) {
    s.kind = pick(HEARTS);
    if (s.kind === 'fire') { s.dmg = 3; s.pierce = true; s.vx = 340; }
    if (s.kind === 'bat') { s.vx = 250; s.life = 1.8; s.max = 1.8; }
  }
}
function heartHit(s, f) {
  if (s.kind === 'broken' && !s.split) {
    s.split = true; s.life = 0;
    for (const vy of [-140, 140]) g.shots.push({ type: 'heart', kind: 'half', x: s.x, y: s.y, w: 9, h: 9, vx: 260, vy, dmg: 1, pierce: false, life: 0.8, max: 0.8, hit: new Set([f]) });
    burst(s.x + 6, s.y + 6, '#e8193c', 6, 60);
  }
  if (s.kind === 'stitch' && f && f.dead && Math.random() < 0.3) g.pickups.push({ type: 'heart', x: f.x + f.w / 2 - 6, y: Math.min(f.y, GROUND - 24), w: 16, h: 16 });
}
function homing(s, dt) {
  let best = null, bd = 1e9;
  for (const f of g.foes) if (!f.dead && f.x > s.x - 10) { const d = Math.hypot(f.x - s.x, f.y - s.y); if (d < bd) { bd = d; best = f; } }
  const ty = best ? best.y + best.h / 2 - 6 : (g.boss && !g.boss.enter ? g.boss.y + 70 : s.y);
  s.vy += Math.max(-900, Math.min(900, (ty - s.y) * 12)) * dt; s.vy *= 0.92;
}
function damage(f, d) {
  f.hp -= d; burst(f.x + f.w / 2, f.y + f.h / 2, '#fff', 4, 60);
  if (f.hp <= 0 && !f.dead) {
    f.dead = true; g.kills++; Audio8.sfx('enemy');
    burst(f.x + f.w / 2, f.y + f.h / 2, f.type === 'crate' ? '#c8a46a' : '#ff4d6d', 12);
    if (Math.random() < 0.35) g.pickups.push({ type: 'coin', x: f.x + f.w / 2 - 5, y: Math.min(f.y, GROUND - 20), w: 10, h: 10 });
  }
}
function damageBoss(d) {
  const b = g.boss; b.hp -= d; b.hurt = 0.1;
  if (b.hp <= b.maxHp / 2) b.phase = 2;
  if (b.hp <= 0) {
    for (let i = 0; i < 6; i++) burst(b.x + rnd(0, 134), b.y + rnd(0, 150), pick(['#ff4d6d', '#ffcf3f', '#fff']), 14, 160);
    Audio8.sfx('boom'); g.shake = 0.6; g.flash = 0.3;
    for (let i = 0; i < 12; i++) g.pickups.push({ type: 'coin', x: b.x + rnd(0, 80), y: rnd(120, 200), w: 10, h: 10 });
    g.pickups.push({ type: 'heart', x: b.x + 40, y: 150, w: 12, h: 12 });
    g.kills += 10; g.bosses++; g.boss = null; g.nextBoss = g.dist + 1800;
    say('¡JEFE DERROTADO! +10', 2.5); Audio8.play('run');
  }
}

function update(dt) {
  g.t += dt;
  const p = g.p, C = CHARS[save.char];
  // velocidad y distancia
  g.speed = Math.min(300, 130 + g.dist * 0.05) + (p.dash > 0 ? 120 : 0);
  g.dist += g.speed * dt / 10;
  for (const k in g.buffs) g.buffs[k] = Math.max(0, g.buffs[k] - dt);
  p.inv = Math.max(0, p.inv - dt); p.spT = Math.max(0, p.spT - dt); p.burst = Math.max(0, p.burst - dt);
  p.dash = Math.max(0, p.dash - dt); p.shootAnim = Math.max(0, p.shootAnim - dt); p.hurtT = Math.max(0, p.hurtT - dt);
  g.shake = Math.max(0, g.shake - dt); g.flash = Math.max(0, g.flash - dt); g.msgT = Math.max(0, g.msgT - dt);

  // salto y deslizamiento
  const maxJumps = (C.dj || lvl('dj') > 0) ? 2 : 1;
  const wantSlide = inp.slide && p.ground;
  if (wantSlide !== p.slide) {
    const fullH = C.h, low = Math.max(8, Math.round(C.h * 0.45));
    if (wantSlide) { p.y += fullH - low; p.h = low; } else { p.y -= fullH - p.h; p.h = fullH; }
    p.slide = wantSlide;
  }
  if (pressed.jump) {
    if (p.ground) { p.vy = -(C.jump || 400); p.ground = false; p.jumps = 1; Audio8.sfx('jump'); burst(p.x + p.w / 2, p.y + p.h, '#8a8195', 5, 40); }
    else if (p.jumps < maxJumps) { p.vy = -(C.jump || 400) * 0.88; p.jumps++; Audio8.sfx('jump'); burst(p.x + p.w / 2, p.y + p.h, '#ff8fa3', 6, 50); }
  }
  if (!inp.jump && p.vy < -160) p.vy = -160;
  const oldBottom = p.y + p.h;
  p.vy += 1100 * dt; p.y += p.vy * dt;
  p.ground = false;
  if (p.y + p.h >= GROUND) { p.y = GROUND - p.h; p.vy = 0; p.ground = true; p.jumps = 0; }
  else if (p.vy >= 0) for (const pl of g.plats) {
    if (p.x + p.w > pl.x + 2 && p.x < pl.x + pl.w - 2 && oldBottom <= pl.y + 1 && p.y + p.h >= pl.y) { p.y = pl.y - p.h; p.vy = 0; p.ground = true; p.jumps = 0; }
  }

  // disparo y especial
  p.fireT -= dt;
  let rate = C.rate * (1 - 0.12 * lvl('fire')) * (g.buffs.coffee > 0 ? 0.55 : 1);
  if (p.burst > 0 && C.special === 'burst') rate = 0.09;
  if (inp.shoot && p.fireT <= 0 && !p.slide) { fire(); p.fireT = rate; }
  if (pressed.special && p.spT <= 0) special();

  // mundo que se mueve
  const sc = g.speed * dt;
  for (const pl of g.plats) pl.x -= sc;
  g.plats = g.plats.filter(pl => pl.x + pl.w > -10);

  if (!g.boss) {
    if (g.dist >= g.nextBoss) spawnBoss();
    g.spawnT -= dt; if (g.spawnT <= 0) { spawnFoe(); g.spawnT = rnd(1.2, 2.2) * (1 - 0.45 * Math.min(1, g.dist / 3000)); }
    g.platT -= dt; if (g.platT <= 0) { spawnPlat(); g.platT = rnd(4, 8); }
  }
  g.coinT -= dt; if (g.coinT <= 0) { spawnCoins(); g.coinT = rnd(2.5, 4.5); }
  g.pupT -= dt; if (g.pupT <= 0) { const t = pick(PUPS); g.pickups.push({ type: t, x: W + 10, y: rnd(130, 185), w: 16, h: 16, pup: true }); g.pupT = rnd(10, 16); }

  // enemigos
  for (const f of g.foes) {
    f.t += dt; f.atk = Math.max(0, f.atk - dt);
    f.x += (f.vx || 0) * dt - sc;
    if (f.type === 'stapler') f.y = f.base + Math.sin(f.t * 3 + f.wave) * 16;
    if (f.type === 'email' && !f.dived && f.x < p.x + 280) { f.dived = true; const dx = p.x + 30 - f.x, dy = p.y + p.h / 2 - f.y; const l = Math.hypot(dx, dy); f.vx = dx / l * 230; f.vy = dy / l * 230; f.atk = 1; }
    if (f.type === 'email' && f.dived) f.y += f.vy * dt;
    if (f.type === 'printer') { f.fireT -= dt; if (f.fireT <= 0 && f.x < W - 20) { f.atk = 0.3; f.fireT = rnd(1.8, 2.6); g.eshots.push({ x: f.x - 6, y: f.y + 14, w: 11, h: 8, vx: -150, vy: 0 }); } }
    if (!f.dead && hit(p, f)) {
      if (p.dash > 0) damage(f, 5);
      else if (f.type !== 'crate' || true) { hurtPlayer(); if (f.type !== 'crate' && f.type !== 'printer') damage(f, 99); }
    }
  }
  g.foes = g.foes.filter(f => !f.dead && f.x > -40 && f.y < H + 20);

  // jefe
  const b = g.boss;
  if (b) {
    b.t += dt; b.hurt = Math.max(0, b.hurt - dt);
    if (b.enter) { b.x -= 80 * dt; if (b.x <= 330) { b.x = 330; b.enter = false; } }
    else {
      b.y = GROUND - 150 + Math.sin(b.t * 1.5) * 2; b.atkAnim = Math.max(0, b.atkAnim - dt);
      b.atkT -= dt;
      if (b.atkT <= 0) {
        b.atkAnim = 0.4; const a = Math.random();
        if (a < 0.55) { for (const hy of pick([[GROUND - 12, GROUND - 50], [GROUND - 30, GROUND - 70], [GROUND - 12, GROUND - 70]])) g.eshots.push({ x: b.x, y: hy, w: 8, h: 6, vx: -170 - (b.phase - 1) * 40, vy: 0 }); }
        else if (a < 0.8) { const f = { type: 'email', w: 30, h: 24, x: b.x, y: b.y + 40, hp: 1, vx: -90, dived: false, t: 0, atk: 0, hitBy: new Set() }; f.base = f.y; g.foes.push(f); }
        else { for (let i = 0; i < 5; i++) g.eshots.push({ x: b.x + 20, y: b.y + 20, w: 8, h: 6, vx: -120 - i * 25, vy: -160 + i * 25, grav: true }); }
        b.atkT = b.phase === 2 ? rnd(1, 1.6) : rnd(1.6, 2.4);
      }
    }
    if (hit(p, { x: b.x + 16, y: b.y + 18, w: 104, h: 128 })) { hurtPlayer(); if (p.dash > 0 && !b.enter) damageBoss(3); }
  }

  // disparos
  for (const s of g.shots) {
    if (s.kind === 'bat') homing(s, dt);
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    for (const f of g.foes) if (!f.dead && !s.hit.has(f) && hit(s, f)) { s.hit.add(f); damage(f, s.dmg); if (s.type === 'heart') heartHit(s, f); if (!s.pierce) { s.life = 0; break; } }
    if (g.boss && !g.boss.enter && s.life > 0 && !s.hit.has('boss') && hit(s, { x: g.boss.x + 16, y: g.boss.y + 18, w: 104, h: 128 })) { s.hit.add('boss'); damageBoss(s.dmg); if (s.type === 'heart') heartHit(s, null); if (!s.pierce) s.life = 0; }
  }
  g.shots = g.shots.filter(s => s.life > 0 && s.x < W + 20 && s.y > -20 && s.y < H);
  for (const s of g.eshots) {
    s.x += s.vx * dt; if (s.grav) { s.vy += 400 * dt; } s.y += s.vy * dt;
    if (hit(p, s)) { s.dead = true; hurtPlayer(); }
  }
  g.eshots = g.eshots.filter(s => !s.dead && s.x > -20 && s.y < GROUND + 4);

  // objetos
  const mag = Math.max(lvl('magnet') * 35, g.buffs.magnet > 0 ? 110 : 0);
  for (const it of g.pickups) {
    it.x -= sc;
    if (mag && it.type === 'coin') {
      const dx = p.x + p.w / 2 - (it.x + 5), dy = p.y + p.h / 2 - (it.y + 5), d = Math.hypot(dx, dy);
      if (d < mag) { it.x += dx / d * 260 * dt; it.y += dy / d * 260 * dt; }
    }
    if (hit(p, it)) {
      it.got = true;
      if (it.type === 'coin') { g.coins++; Audio8.sfx('coin'); }
      else {
        Audio8.sfx('power'); const dur = 7 + 3 * lvl('coffee');
        if (it.type === 'heart') p.hp = Math.min(p.maxHp, p.hp + 1);
        else if (it.type === 'shield') p.shield = true;
        else if (it.type === 'clock') g.coins += 10;
        else g.buffs[it.type] = dur;
        say(PUP_NAMES[it.type], 1.5);
        burst(it.x + 6, it.y + 6, '#ffcf3f', 10);
      }
    }
  }
  g.pickups = g.pickups.filter(it => !it.got && it.x > -20);

  for (const q of g.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; q.life -= dt; }
  g.parts = g.parts.filter(q => q.life > 0);
  for (const q of g.pops) { q.y -= 20 * dt; q.life -= dt; }
  g.pops = g.pops.filter(q => q.life > 0);
}

// ---------- Dibujo de la partida ----------
function playerState() {
  const p = g.p;
  if (p.hurtT > 0) return 'hurt';
  if (p.dash > 0) return 'special';
  if (p.slide) return 'slide';
  if (!p.ground) return p.vy < 0 ? 'jump' : 'fall';
  return p.shootAnim > 0 ? 'runshoot' : 'run';
}
function drawPlay(dt) {
  ctx.save();
  if (g.shake > 0) ctx.translate(Math.round(rnd(-3, 3)), Math.round(rnd(-3, 3)));
  drawWorld(state === 'play' ? dt : 0, g.speed);
  for (const pl of g.plats) {
    box(Math.round(pl.x), pl.y, pl.w, 4, '#8a5a3a'); box(Math.round(pl.x), pl.y + 4, pl.w, 2, '#5a3a22');
    box(Math.round(pl.x) + 4, pl.y + 6, 3, GROUND - pl.y - 6, '#5a3a22'); box(Math.round(pl.x) + pl.w - 7, pl.y + 6, 3, GROUND - pl.y - 6, '#5a3a22');
    box(Math.round(pl.x) + 10, pl.y - 9, 14, 9, '#2a2d35'); box(Math.round(pl.x) + 11, pl.y - 8, 12, 6, '#5fd3ff');
  }
  // sombras en el suelo (ayudan a ver dónde está cada uno)
  const shadow = (x, w, y) => { const d = Math.max(0, GROUND - y); ctx.globalAlpha = Math.max(0.12, 0.45 - d / 300); ctx.fillStyle = '#05030a';
    ctx.beginPath(); ctx.ellipse(x, GROUND + 1, Math.max(4, w / 2 + 3 - d / 20), 3, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; };
  shadow(g.p.x + g.p.w / 2, g.p.w, g.p.y + g.p.h);
  for (const f of g.foes) shadow(f.x + f.w / 2, f.w, f.y + f.h);
  if (g.boss) shadow(g.boss.x + 67, 110, g.boss.y + 150);
  for (const it of g.pickups) Sprites.pickup(ctx, it.type, Math.round(it.x), Math.round(it.y), g.t + it.x * 0.01);
  for (const f of g.foes) Sprites.enemy(ctx, f.type, f.t, Math.round(f.x), Math.round(f.y), f.atk > 0, f.w, f.h);
  if (g.boss) {
    const b = g.boss;
    Sprites.boss(ctx, b.t, Math.round(b.x), Math.round(b.y), b.hurt > 0, b.phase, b.atkAnim > 0);
    box(140, 26, 200, 6, '#2a0a10', '#ff4d6d'); box(141, 27, Math.max(0, 198 * b.hp / b.maxHp), 4, '#ff4d6d');
    text('FOTOCOPIADORA INFERNAL', 240, 16, 8, '#ffb3c1', 'center');
  }
  const p = g.p;
  if (!(p.inv > 0 && Math.floor(g.t * 16) % 2)) {
    if (p.dash > 0) { ctx.globalAlpha = 0.35; Sprites.player(ctx, save.char, 'run', g.t, Math.round(p.x) - 10, Math.round(p.y), p.w, p.h); ctx.globalAlpha = 1; }
    Sprites.player(ctx, save.char, playerState(), g.t, Math.round(p.x), Math.round(p.y), p.w, p.h);
  }
  if (p.shield) { ctx.strokeStyle = 'rgba(127,179,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 + 6, p.h / 2 + 5, 0, 0, 7); ctx.stroke(); }
  for (const s of g.shots) Sprites.shot(ctx, s.type, Math.round(s.x), Math.round(s.y), g.t, s.life / s.max, s.type === 'heart' ? s.kind : s.v);
  for (const s of g.eshots) Sprites.shot(ctx, 'paper', Math.round(s.x), Math.round(s.y), g.t);
  for (const q of g.parts) box(Math.round(q.x), Math.round(q.y), 2, 2, q.col);
  ctx.restore();
  if (g.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (g.flash * 2).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
  for (const q of g.pops) text(q.s, q.x, q.y, 8, q.col, 'center');
  drawHud();
}
function drawHud() {
  const p = g.p;
  for (let i = 0; i < p.maxHp; i++) {
    if (i < p.hp) Sprites.pickup(ctx, 'heart', 6 + i * 17, 5, 0);
    else { ctx.globalAlpha = 0.25; Sprites.pickup(ctx, 'heart', 6 + i * 17, 5, 0); ctx.globalAlpha = 1; }
  }
  if (p.shield) Sprites.pickup(ctx, 'shield', 8 + p.maxHp * 17, 5, 0);
  text(Math.floor(g.dist) + ' m', W / 2, 5, 8, '#fff', 'center');
  Sprites.pickup(ctx, 'coin', W - 78, 4, 0); text('' + g.coins, W - 64, 6, 8, '#ffcf3f');
  // pausa
  box(W - 26, 3, 20, 18, 'rgba(0,0,0,0.4)', '#ff4d6d'); box(W - 20, 8, 3, 8, '#fff'); box(W - 14, 8, 3, 8, '#fff');
  // buffs activos
  let bx = 6;
  for (const k of ['coffee', 'double', 'magnet']) if (g.buffs[k] > 0) {
    Sprites.pickup(ctx, k, bx, 24, 0); box(bx, 40, Math.round(12 * g.buffs[k] / (7 + 3 * lvl('coffee'))), 2, '#ffcf3f'); bx += 16;
  }
  // especial
  const C = CHARS[save.char], full = C.cd * (1 - 0.15 * lvl('special'));
  const ready = p.spT <= 0;
  if (g.msgT > 0) text(g.msg, W / 2, 40, 8, '#ffcf3f', 'center');
  if (isTouch) {
    for (const k in TBTN) {
      const b = TBTN[k], on = touch[k];
      ctx.globalAlpha = on ? 0.55 : 0.3; ctx.fillStyle = k === 'special' && ready ? '#ff4d6d' : '#000';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
      text(b.label, b.x, b.y - 4, 8, '#fff', 'center');
      if (k === 'special' && !ready) { ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.spT / full)); ctx.stroke(); }
    }
  } else {
    box(W / 2 - 40, H - 12, 80, 5, '#2a0a10', '#ff4d6d'); box(W / 2 - 39, H - 11, Math.round(78 * (ready ? 1 : 1 - p.spT / full)), 3, ready ? '#ff4d6d' : '#8a2a3a');
    text(ready ? 'ESPECIAL (K)' : 'cargando…', W / 2, H - 24, 8, ready ? '#ffb3c1' : '#8a7a90', 'center');
  }
}

// ---------- Pantallas ----------
function drawTitle(dt) {
  drawWorld(dt, 40);
  const cw = ok(BG.cover) ? BG.cover.naturalWidth : 0, cx = (W - cw) / 2;
  ctx.fillStyle = 'rgba(13,10,18,0.45)'; ctx.fillRect(0, 0, W, H);
  if (cw) { ctx.drawImage(BG.cover, W - cw, 0); box(W - cw - 2, 0, 2, H, '#ff4d6d'); }
  else {
    Sprites.player(ctx, 'mai', 'run', stateT, 150, GROUND - 52, 22, 52);
    Sprites.player(ctx, 'aiden', 'run', stateT + 0.2, 96, GROUND - 36, 46, 36);
    Sprites.player(ctx, 'nobodi', 'run', stateT + 0.4, 40, GROUND - 36, 46, 36);
  }
  const y = 26 + Math.sin(stateT * 2) * 2;
  text('PITI-PAUSE', cx, y, 32, '#ff4d6d', 'center', '#2a0a10');
  text('RUSH', cx, y + 40, 24, '#fff', 'center', '#c4142c');
  text('Una pausa muy movida', cx, y + 74, 8, '#ffcf3f', 'center');
  button(cx - 60, 128, 120, 24, 'JUGAR', () => setState('select'), { active: true });
  button(cx - 60, 158, 120, 22, 'MEJORAS', () => setState('shop'));
  button(cx - 60, 186, 120, 20, save.muted ? 'SONIDO: NO' : 'SONIDO: SÍ', () => { save.muted = !save.muted; Audio8.setMuted(save.muted); persist(); });
  text('Récord: ' + save.best + ' m', 10, H - 18, 8, '#fff');
  Sprites.pickup(ctx, 'coin', W - cw - 64, H - 20, 0); text('' + save.points, W - cw - 48, H - 18, 8, '#ffcf3f');
}
function drawSelect(dt) {
  drawWorld(dt, 20);
  ctx.fillStyle = 'rgba(13,10,18,0.6)'; ctx.fillRect(0, 0, W, H);
  text('ELIGE QUIÉN SALE A LA PAUSA', W / 2, 14, 8, '#fff', 'center');
  ORDER.forEach((id, i) => {
    const C = CHARS[id], x = 24 + i * 148, y = 34, on = i === selIdx;
    ui.push({ x, y, w: 136, h: 168, fn: () => { if (selIdx === i) startRun(); else selIdx = i; } });
    box(x, y, 136, 168, on ? '#3a1022' : '#1a1222', on ? '#ff4d6d' : '#5a4060');
    const im = Sprites.portraits[id];
    if (im.complete && im.naturalWidth) { const s = Math.min(96 / im.naturalWidth, 88 / im.naturalHeight); const w = im.naturalWidth * s, h = im.naturalHeight * s; ctx.drawImage(im, x + 68 - w / 2, y + 8 + 88 - h, w, h); }
    text(C.name, x + 68, y + 102, 16, on ? '#ff4d6d' : '#fff', 'center');
    C.lines.forEach((l, j) => text(l, x + 68, y + 122 + j * 11, 8, l === 'Especial:' ? '#ff8fa3' : '#d8c8e0', 'center'));
  });
  button(24, 214, 100, 24, 'VOLVER', () => setState('title'));
  button(W - 184, 214, 160, 24, '¡A CORRER!', startRun, { active: true });
}
function drawShop(dt) {
  drawWorld(dt, 15);
  ctx.fillStyle = 'rgba(13,10,18,0.7)'; ctx.fillRect(0, 0, W, H);
  text('MEJORAS', W / 2, 10, 16, '#ff4d6d', 'center');
  Sprites.pickup(ctx, 'coin', W - 80, 12, 0); text('' + save.points, W - 66, 14, 8, '#ffcf3f');
  UPGRADES.forEach((u, i) => {
    const col = i % 2, row = Math.floor(i / 2), x = 14 + col * 230, y = 34 + row * 44;
    const L = lvl(u.id), max = u.costs.length, done = L >= max, cost = done ? 0 : u.costs[L];
    const can = !done && save.points >= cost;
    box(x, y, 222, 40, '#1a1222', done ? '#3fbf6a' : can ? '#ff4d6d' : '#4a4052');
    Sprites.pickup(ctx, u.icon, x + 8, y + 14, 0);
    text(u.name, x + 28, y + 6, 8, '#fff'); text(u.desc, x + 28, y + 18, 8, '#a898b0');
    for (let k = 0; k < max; k++) box(x + 28 + k * 10, y + 30, 8, 4, k < L ? '#ffcf3f' : '#3a3040');
    if (done) text('MÁX', x + 214, y + 28, 8, '#3fbf6a', 'right');
    else { Sprites.pickup(ctx, 'coin', x + 168, y + 26, 0); text('' + cost, x + 214, y + 28, 8, can ? '#ffcf3f' : '#6a6070', 'right'); }
    ui.push({ x, y, w: 222, h: 40, fn: () => {
      if (done) return;
      if (save.points < cost) { Audio8.sfx('nope'); shopMsg = 'Te faltan ' + (cost - save.points) + ' monedas'; shopMsgT = 1.5; return; }
      save.points -= cost; save.up[u.id] = L + 1; persist(); Audio8.sfx('buy'); shopMsg = '¡' + u.name + ' mejorada!'; shopMsgT = 1.5;
    } });
  });
  if (shopMsgT > 0) { shopMsgT -= dt; text(shopMsg, W / 2, 214, 8, '#ffcf3f', 'center'); }
  button(14, 236, 100, 24, 'VOLVER', () => setState('title'));
  button(W - 154, 236, 140, 24, 'JUGAR', () => setState('select'), { active: true });
}
function drawPause() {
  drawPlay(0);
  ctx.fillStyle = 'rgba(13,10,18,0.7)'; ctx.fillRect(0, 0, W, H);
  text('PAUSA', W / 2, 70, 24, '#fff', 'center');
  text('(una pausa dentro de la pausa)', W / 2, 102, 8, '#a898b0', 'center');
  button(W / 2 - 70, 126, 140, 24, 'SEGUIR', () => setState('play'), { active: true });
  button(W / 2 - 70, 158, 140, 22, save.muted ? 'SONIDO: NO' : 'SONIDO: SÍ', () => { save.muted = !save.muted; Audio8.setMuted(save.muted); persist(); });
  button(W / 2 - 70, 188, 140, 22, 'SALIR AL MENÚ', () => { Audio8.stop(); setState('title'); });
}
function drawOver(dt) {
  drawWorld(dt, 0);
  ctx.fillStyle = 'rgba(13,10,18,0.75)'; ctx.fillRect(0, 0, W, H);
  const o = overInfo;
  text('SE ACABÓ LA PAUSA', W / 2, 22, 16, '#ff4d6d', 'center');
  text(o.d + ' m', W / 2, 52, 24, '#fff', 'center');
  if (o.record) text('¡NUEVO RÉCORD!', W / 2, 82, 8, '#ffcf3f', 'center');
  else text('Récord: ' + save.best + ' m', W / 2, 82, 8, '#a898b0', 'center');
  const rows = [['Monedas', o.coins], ['Bichos de oficina', o.kills], ['Por distancia', Math.floor(o.d / 50)]];
  rows.forEach((r, i) => { text(r[0], 140, 104 + i * 14, 8, '#d8c8e0'); text('+' + r[1], 340, 104 + i * 14, 8, '#ffcf3f', 'right'); });
  box(140, 146, 200, 1, '#5a4060');
  text('Total', 140, 152, 8, '#fff'); text('+' + o.earned, 340, 152, 8, '#ffcf3f', 'right');
  if (o.bosses) text('Fotocopiadoras destruidas: ' + o.bosses, W / 2, 168, 8, '#ffb3c1', 'center');
  button(30, 196, 130, 26, 'OTRA VEZ', startRun, { active: true });
  button(175, 196, 130, 26, 'MEJORAS', () => setState('shop'));
  button(320, 196, 130, 26, 'MENÚ', () => setState('title'));
}

// ---------- Bucle ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  stateT += dt; ui = [];
  readInput();
  ctx.clearRect(0, 0, W, H);
  if (state === 'title') drawTitle(dt);
  else if (state === 'select') drawSelect(dt);
  else if (state === 'shop') drawShop(dt);
  else if (state === 'play') { update(dt); if (state === 'play') drawPlay(dt); }
  else if (state === 'pause') drawPause();
  else if (state === 'over') drawOver(dt);
  requestAnimationFrame(frame);
}
const fontReady = (document.fonts && document.fonts.load) ? document.fonts.load('10px PIX') : Promise.resolve();
Promise.race([fontReady, new Promise(r => setTimeout(r, 1500))]).then(() => {
  setState('title'); requestAnimationFrame(frame);
  // Solo para pruebas: index.html#prueba-play, #prueba-select, #prueba-shop, #prueba-over
  const h = location.hash;
  if (h === '#prueba-select') setState('select');
  if (h === '#prueba-shop') { save.points = 230; setState('shop'); }
  if (h.startsWith('#prueba-play')) {
    selIdx = { 'aiden': 1, 'nobodi': 2 }[h.split('-')[2]] || 0; startRun(); isTouch = h.includes('touch');
    keys.add('KeyJ'); setInterval(() => { keys.add('Space'); setTimeout(() => keys.delete('Space'), 250); }, 1400);
    if (h.includes('boss')) g.dist = 1490;
    if (h.includes('stats')) { keys.delete('Space'); }
    const secs = h.includes('boss') ? 6 : 9; // avanza la partida sin esperar
    for (let i = 0; i < secs * 60; i++) { readInput(); update(1 / 60); if (state !== 'play') break; drawWorld(1 / 60, g.speed); }
    if (h.includes('stats')) { for (let i = 0; i < 25 * 60 && state === 'play'; i++) { readInput(); update(1 / 60); } if (state === 'play') endRun(); }
    if (h.includes('special')) { touch.special = true; readInput(); update(1 / 60); touch.special = false; for (let i = 0; i < 20; i++) { readInput(); update(1 / 60); } }
  }
  if (h === '#prueba-over') { startRun(); g.dist = 842; g.coins = 37; g.kills = 12; endRun(); }
});
