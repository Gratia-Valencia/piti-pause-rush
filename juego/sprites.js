'use strict';
// 🎨 Dibujos del juego.
// Mientras no estén las hojas de Gemini, se dibujan figuras pixel provisionales por código.
// Cuando una hoja esté lista, se apunta en SHEETS y el juego la usa sola.
const Sprites = (() => {
  // Hojas de Gemini ya recortadas y escaladas (sprites-data.js, generado por build.py).
  const DATA = (typeof SPRITE_DATA !== 'undefined') ? SPRITE_DATA : {};
  const IMG = {};
  for (const k in DATA) { const im = new Image(); im.src = DATA[k].src; IMG[k] = im; }
  // Animaciones que se alinean por la izquierda (llevan arma, estela o van tumbadas)
  const LEFT = new Set(['shoot', 'runshoot', 'slide', 'dash', 'dashfx', 'ball']);

  const portraits = {};
  for (const id of ['mai', 'aiden', 'nobodi']) {
    const im = new Image(); im.src = 'assets/retrato-' + id + '.png'; portraits[id] = im;
  }

  const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };

  function fromSheet(c, id, anim, t, x, y, w, h) {
    const d = DATA[id], im = IMG[id];
    if (!d || !im || !im.complete || !im.naturalWidth) return false;
    const a = d.anims[anim] || d.anims.run || d.anims.move || d.anims.idle;
    if (!a) return false;
    const fi = a.f[Math.floor(t * a.fps) % a.f.length];
    const [sx, sy, fw, fh] = d.frames[fi];
    const dx = LEFT.has(anim) ? x - 3 : x + w / 2 - fw / 2;
    c.drawImage(im, sx, sy, fw, fh, Math.round(dx), Math.round(y + h - fh), fw, fh);
    return true;
  }
  const has = id => !!DATA[id];

  // ---------- Provisionales ----------
  function mai(c, st, t, x, y) {
    const run = st === 'run' || st === 'runshoot';
    const leg = run ? (Math.floor(t * 12) % 2 ? 1 : -1) : 0;
    if (st === 'slide') {
      R(c,'#111',x-2,y+4,22,8); R(c,'#c4142c',x-2,y+4,22,1);
      R(c,'#141014',x+14,y-2,8,7); R(c,'#f2c9b8',x+16,y,5,4); R(c,'#c4142c',x+15,y-1,1,5);
      R(c,'#2a2a2a',x+17,y+1,4,1); R(c,'#141014',x-6,y+9,8,3);
      return;
    }
    // pelo de detrás
    R(c,'#141014',x+1,y+2,6,13); R(c,'#c4142c',x+2,y+4,1,9); R(c,'#ff7aa8',x+4,y+5,1,7);
    // cabeza
    R(c,'#141014',x+3,y,10,4); R(c,'#f2c9b8',x+6,y+3,7,6);
    R(c,'#c4142c',x+4,y+1,2,6);
    R(c,'#1a1a1a',x+7,y+5,6,1); R(c,'#1a1a1a',x+7,y+5,1,2); R(c,'#1a1a1a',x+10,y+5,1,2); R(c,'#1a1a1a',x+12,y+5,1,2);
    // abrigo
    R(c,'#111',x+3,y+9,10,12); R(c,'#c4142c',x+11,y+9,1,12); R(c,'#c4142c',x+3,y+20,10,1);
    R(c,'#111',x+(run?0:1),y+14,3,9); R(c,'#c4142c',x+(run?0:1),y+22,3,1);
    R(c,'#2b2b2b',x+6,y+10,4,4); R(c,'#c4142c',x+7,y+11,2,2);
    // piernas de rayas
    for (let i = 0; i < 5; i++) {
      const col = i % 2 ? '#111' : '#c4142c';
      R(c,col,x+5+leg,y+21+i,2,1); R(c,col,x+9-leg,y+21+i,2,1);
    }
    R(c,'#0a0a0a',x+4+leg,y+25,4,3); R(c,'#0a0a0a',x+8-leg,y+25,4,3);
    // brazo y revólver
    const sh = st === 'shoot' || st === 'runshoot';
    R(c,'#111',x+10,y+12,4,2); R(c,'#f2c9b8',x+13,y+12,1,2);
    R(c,'#c9cbd6',x+13,y+11,sh?7:5,2); R(c,'#6b6f80',x+14,y+13,2,2);
    if (sh && Math.floor(t * 20) % 2) R(c,'#ffe066',x+20,y+10,3,3);
    if (st === 'hurt') { c.globalAlpha = 0.5; R(c,'#fff',x,y,16,28); c.globalAlpha = 1; }
  }

  function cat(c, kind, st, t, x, y) {
    const base = kind === 'aiden' ? '#8a5a32' : '#f4f1ec';
    const dark = kind === 'aiden' ? '#3d2614' : '#8d7d6c';
    const run = st === 'run' || st === 'runshoot';
    const f = Math.floor(t * 12) % 2;
    // cola
    R(c,base,x-3,y+(run?2:-2),4,2); R(c,base,x-4,y+(run?0:-5),2,5);
    // cuerpo
    R(c,base,x,y+3,16,7);
    if (kind === 'aiden') { R(c,dark,x+3,y+3,2,6); R(c,dark,x+7,y+3,2,5); R(c,dark,x+11,y+4,2,5); }
    else { R(c,dark,x+2,y+3,6,3); R(c,dark,x+10,y+3,3,2); }
    // patas
    const p = run ? (f ? 1 : -1) : 0;
    R(c,base,x+1+p,y+10,2,4); R(c,base,x+5-p,y+10,2,4); R(c,base,x+10+p,y+10,2,4); R(c,base,x+14-p,y+10,2,4);
    // cabeza
    R(c,base,x+14,y-1,8,7); R(c,base,x+14,y-3,2,2); R(c,base,x+20,y-3,2,2);
    if (kind === 'nobodi') { R(c,dark,x+14,y-1,4,3); R(c,dark,x+14,y-3,2,2); }
    else { R(c,dark,x+16,y-1,1,2); R(c,dark,x+18,y-1,1,2); }
    R(c,'#ffd34d',x+17,y+1,1,1); R(c,'#ffd34d',x+20,y+1,1,1);
    R(c,'#ff8fa3',x+21,y+3,1,1);
    if (st === 'shoot' || st === 'runshoot') R(c,'#ff8fa3',x+21,y+4,2,1);
    if (st === 'hurt') { c.globalAlpha = 0.5; R(c,'#fff',x-4,y-3,27,17); c.globalAlpha = 1; }
  }

  const MAP = {
    mai:    { runshoot: 'runshoot', special: 'runshoot' },
    aiden:  { runshoot: 'run', slide: 'dash', special: 'dashfx' },
    nobodi: { runshoot: 'run', slide: 'ball', special: 'shoot' },
  };
  function player(c, id, st, t, x, y, w, h) {
    const anim = (MAP[id] && MAP[id][st]) || st;
    if (fromSheet(c, id, anim, t, x, y, w, h)) return;
    if (id === 'mai') mai(c, st, t, x, y);
    else cat(c, id, st, t, x + (st === 'slide' ? 0 : 0), y + (h - 14));
  }

  function enemy(c, type, t, x, y, atk, w, h) {
    if (fromSheet(c, type, atk ? 'atk' : 'move', t, x, y, w || 20, h || 20)) return;
    const f = Math.floor(t * 8) % 2;
    switch (type) {
      case 'printer':
        R(c,'#9aa0ab',x,y+4,26,18); R(c,'#6b7180',x,y+18,26,4); R(c,'#2a2d35',x+3,y+9,20,3);
        R(c,'#ff2a3d',x+5,y+5,4,3); R(c,'#ff2a3d',x+15,y+5,4,3);
        R(c,'#fff',x+5,y+(atk ? 0 : 2),14,4); R(c,'#1b1d22',x+2,y+22,4,2); R(c,'#1b1d22',x+20,y+22,4,2);
        break;
      case 'stapler':
        R(c,'#3a0d14',x+2,y+(f?0:4),6,4); R(c,'#3a0d14',x+12,y+(f?0:4),6,4);
        R(c,'#8c1626',x+3,y+5,15,4); R(c,'#5a0e18',x+3,y+9,15,3); R(c,'#c9cbd6',x+3,y+8,4,1);
        R(c,'#ffe066',x+14,y+6,2,2);
        break;
      case 'mug':
        R(c,'#f4f1ec',x+1,y+2,12,11); R(c,'#5b3a1e',x+2,y+2,10,2); R(c,'#f4f1ec',x+12,y+5,3,5); R(c,'#c9c3b8',x+13,y+6,1,3);
        R(c,'#111',x+3,y+6,2,2); R(c,'#111',x+8,y+6,2,2); R(c,'#111',x+3,y+5,3,1); R(c,'#111',x+7,y+5,3,1);
        R(c,'#111',x+3+(f?1:0),y+13,2,3); R(c,'#111',x+8-(f?1:0),y+13,2,3);
        if (atk) R(c,'#d9a066',x+3,y,2,2);
        break;
      case 'email':
        R(c,'#3a0d14',x-3,y+(f?0:5),5,4); R(c,'#3a0d14',x+16,y+(f?0:5),5,4);
        R(c,'#f0e2c4',x,y+2,18,12); R(c,'#c9b48a',x,y+2,18,1); R(c,'#c9b48a',x+1,y+3,8,1); R(c,'#c9b48a',x+9,y+3,8,1);
        R(c,'#d4142c',x+8,y+5,2,5); R(c,'#d4142c',x+8,y+11,2,2);
        break;
      case 'crate':
        R(c,'#c8a46a',x,y,20,20); R(c,'#8a6a3a',x,y,20,2); R(c,'#8a6a3a',x,y+9,20,2); R(c,'#fff',x+4,y+4,12,4);
        break;
    }
  }

  function boss(c, t, x, y, hurt, phase, atk) {
    if (fromSheet(c, 'boss', hurt ? 'hurt' : atk ? 'atk' : 'idle', t, x, y, 134, 150)) return;
    const f = Math.floor(t * 4) % 2;
    R(c,'#5d6170',x,y+20,90,66); R(c,'#8a8f9e',x+4,y+24,82,40); R(c,'#3a3d47',x,y+84,90,6);
    R(c,'#2a2d35',x+10,y+6,70,16); R(c,'#c8ccd8',x+14,y+10,62,8);
    R(c,hurt?'#fff':'#ff2a3d',x+18,y+32,14,8); R(c,hurt?'#fff':'#ff2a3d',x+56,y+32,14,8);
    R(c,'#111',x+16,y+50,58,14);
    for (let i = 0; i < 7; i++) R(c,'#f4f1ec',x+18+i*8,y+50+(i%2?(f?6:8):0),6,6);
    R(c,'#2a2d35',x-12,y+44+(f?2:-2),14,4); R(c,'#2a2d35',x+88,y+44+(f?-2:2),14,4);
    if (phase === 2) { R(c,'#ff6a00',x+30,y+12+(f?0:2),4,4); R(c,'#ffe066',x+60,y+10+(f?2:0),3,3); }
  }

  const ICON_SIZE = { coin: 14, double: 16 };
  function pickup(c, type, x, y, t) {
    const b = Math.round(Math.sin(t * 5) * 1.5);
    y += b;
    const sz = ICON_SIZE[type] || 15;
    if (fromSheet(c, 'icons', type, 0, x, y, sz - 2, sz)) return;
    switch (type) {
      case 'coin':
        R(c,'#ffcf3f',x+1,y,8,10); R(c,'#ffcf3f',x,y+1,10,8); R(c,'#b8860b',x+2,y+2,6,6);
        R(c,'#fff4c2',x+3,y+3,4,3); R(c,'#3a2600',x+3,y+4,1,1); R(c,'#3a2600',x+6,y+4,1,1); R(c,'#fff4c2',x+4,y+6,2,1);
        break;
      case 'clock': R(c,'#ffcf3f',x+1,y+1,10,10); R(c,'#fff4c2',x+3,y+3,6,6); R(c,'#3a2600',x+5,y+4,1,3); R(c,'#3a2600',x+5,y+6,3,1); R(c,'#ffcf3f',x+5,y-1,2,2); break;
      case 'coffee': R(c,'#f4f1ec',x+1,y+3,8,8); R(c,'#5b3a1e',x+2,y+3,6,2); R(c,'#f4f1ec',x+9,y+5,2,4); R(c,'#ddd',x+3,y,1,2); R(c,'#ddd',x+6,y-1,1,2); break;
      case 'heart': R(c,'#e8193c',x+1,y+2,4,4); R(c,'#e8193c',x+6,y+2,4,4); R(c,'#e8193c',x+1,y+4,9,3); R(c,'#e8193c',x+3,y+7,5,2); R(c,'#e8193c',x+5,y+9,1,1); R(c,'#ff9db0',x+2,y+3,2,1); break;
      case 'shield': R(c,'#7fb3ff',x+1,y,10,7); R(c,'#7fb3ff',x+2,y+7,8,3); R(c,'#7fb3ff',x+4,y+10,4,2); R(c,'#e8193c',x+4,y+3,4,3); break;
      case 'double': R(c,'#c9cbd6',x,y+2,12,3); R(c,'#c9cbd6',x,y+7,12,3); R(c,'#ffe066',x+9,y+11,3,1); break;
      case 'magnet': R(c,'#e8193c',x+1,y+1,3,8); R(c,'#e8193c',x+8,y+1,3,8); R(c,'#e8193c',x+1,y+7,10,3); R(c,'#ddd',x+1,y,3,2); R(c,'#ddd',x+8,y,3,2); break;
    }
  }

  function shot(c, type, x, y, t, life, v) {
    switch (type) {
      case 'bullet': y += 3; R(c,'#fff6b0',x,y,9,3); R(c,'#ffcf3f',x-3,y,3,3); R(c,'#ff8a3d',x-5,y+1,2,1); break;
      case 'hairball': if (!fromSheet(c, 'icons', 'yarn', 0, x, y, 10, 11)) { R(c,'#7a5230',x,y,6,6); R(c,'#a9784a',x+1,y+1,3,2); } break;
      case 'meow':
        if (fromSheet(c, 'notes', 'note', ((v || 0) + 0.5) / 10, x, y + Math.round(Math.sin(t * 14 + (v || 0)) * 2), 12, 18)) {
          c.globalAlpha = Math.max(0, life) * 0.6;
        }
        c.strokeStyle = 'rgba(255,143,163,' + Math.max(0, life).toFixed(2) + ')'; c.lineWidth = 2;
        c.beginPath(); c.arc(x, y + 11, 11, -1, 1); c.stroke();
        c.beginPath(); c.arc(x - 4, y + 8, 5, -1, 1); c.stroke();
        c.globalAlpha = 1;
        break;
      case 'heart': {
        // Dibujo de Gemini si está (hoja «hearts»), si no, corazón pixel por código
        const k = v || 'broken';
        if (fromSheet(c, 'hearts', k, k === 'half' ? (y % 2) : t, x, y, k === 'half' ? 9 : 13, k === 'half' ? 9 : 13)) break;
        const H = (col, dx, dy) => { R(c,col,x+1+dx,y+dy,4,3); R(c,col,x+6+dx,y+dy,4,3); R(c,col,x+dx,y+1+dy,11,4); R(c,col,x+1+dx,y+5+dy,9,2); R(c,col,x+3+dx,y+7+dy,5,2); R(c,col,x+5+dx,y+9+dy,1,1); };
        if (k === 'half') { R(c,'#1a1018',x-1,y-1,7,9); R(c,'#e8193c',x,y,5,7); R(c,'#ff9db0',x+1,y+1,2,1); break; }
        R(c,'#1a1018',x-1,y-1,13,12);
        if (k === 'broken') { H('#e8193c', 0, 0); R(c,'#1a1018',x+5,y+1,1,2); R(c,'#1a1018',x+6,y+3,1,2); R(c,'#1a1018',x+5,y+5,1,2); R(c,'#1a1018',x+6,y+7,1,2); }
        else if (k === 'bat') { const f = Math.floor(t * 12) % 2; R(c,'#2a1036',x-5,y+(f?0:3),5,3); R(c,'#2a1036',x+11,y+(f?0:3),5,3); H('#5a1f7a', 0, 0); R(c,'#ff2a3d',x+3,y+3,1,1); R(c,'#ff2a3d',x+7,y+3,1,1); }
        else if (k === 'fire') { const f = Math.floor(t * 14) % 2; R(c,'#ff8a1f',x-4,y+2+(f?1:0),4,3); R(c,'#ffcf3f',x-7,y+3,3,2); R(c,'#ff8a1f',x+2,y-3+(f?1:0),2,3); R(c,'#ff8a1f',x+7,y-2-(f?1:0),2,3); H('#ff3d1f', 0, 0); R(c,'#ffcf3f',x+2,y+2,2,1); }
        else { H('#ff8fb8', 0, 0); for (let i = 0; i < 4; i++) R(c,'#1a1018',x+2+i*2,y+4+(i%2),1,1); }
        R(c,'rgba(255,255,255,0.7)',x+2,y+1,2,1);
        break;
      }
      case 'paper': R(c,'#1a1018',x-1,y-1,13,10); R(c,'#f4f1ec',x,y,11,8); R(c,'#aab',x+1,y+2,8,1); R(c,'#aab',x+1,y+4,7,1); break;
    }
  }

  return { player, enemy, boss, pickup, shot, portraits, has };
})();
