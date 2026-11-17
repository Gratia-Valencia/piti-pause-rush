'use strict';
// 🎵 Música chiptune y efectos, hechos con WebAudio (sin archivos, sin copyright).
const Audio8 = (() => {
  let ac = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  let muted = false, current = null, timer = null, step = 0, nextTime = 0;

  const NOTES = {C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
  function freq(n) {
    const m = /^([A-G]#?)(\d)$/.exec(n);
    if (!m) return 0;
    const midi = (parseInt(m[2]) + 1) * 12 + NOTES[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(type, f, t, dur, vol, out, slideTo) {
    if (!ac || !f) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out || sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, out, hp) {
    if (!ac) return;
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp || 1000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(out || sfxGain);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // Canciones: cada letra es un paso de semicorchea. «-» = silencio.
  const S = s => s.trim().split(/\s+/);
  const SONGS = {
    title: { bpm: 104,
      lead: S(`E5 - - - D5 - C5 - B4 - - - A4 - - -  C5 - - - B4 - A4 - G4 - - - E4 - - -
               F4 - A4 - C5 - - - B4 - A4 - G4 - - -  E4 - G#4 - B4 - - - A4 - - - - - - -`),
      bass: S(`A2 - - - A2 - - - F2 - - - F2 - - -  C3 - - - C3 - - - G2 - - - G2 - - -
               D3 - - - D3 - - - G2 - - - G2 - - -  E2 - - - E2 - - - A2 - - - A2 - - -`),
      drum: S(`k - - - h - - - s - - - h - - -`) },
    run: { bpm: 150,
      lead: S(`A4 - C5 - E5 - A5 - G5 - E5 - C5 - D5 -  E5 - - - D5 C5 - - B4 - - - G4 - - -
               F4 - A4 - C5 - F5 - E5 - C5 - A4 - B4 -  C5 - B4 - A4 - G#4 - A4 - - - - - - -`),
      bass: S(`A2 - A3 - A2 - A3 - A2 - A3 - A2 - A3 -  C3 - C4 - C3 - C4 - G2 - G3 - G2 - G3 -
               F2 - F3 - F2 - F3 - F2 - F3 - F2 - F3 -  E2 - E3 - E2 - E3 - E2 - E3 - E2 - E3 -`),
      drum: S(`k - h - s - h - k k h - s - h h`) },
    boss: { bpm: 172,
      lead: S(`A5 - A5 - G5 - A5 - - - E5 - - - F5 -  E5 - D5 - C5 - D5 - E5 - - - - - - -
               A5 - A5 - G5 - A5 - - - C6 - - - B5 -  A5 - G#5 - E5 - G#5 - A5 - - - - - - -`),
      bass: S(`A2 A2 A3 A2 A2 A2 A3 A2 A2 A2 A3 A2 A2 A2 A3 A2  F2 F2 F3 F2 F2 F2 F3 F2 E2 E2 E3 E2 E2 E2 E3 E2
               A2 A2 A3 A2 A2 A2 A3 A2 C3 C3 C4 C3 C3 C3 C4 C3  D3 D3 D4 D3 E2 E2 E3 E2 A2 A2 A3 A2 A2 A2 A3 A2`),
      drum: S(`k h s h k h s h k k s h k h s s`) },
  };

  function schedule() {
    if (!current) return;
    const song = SONGS[current], spb = 60 / song.bpm / 4;
    while (nextTime < ac.currentTime + 0.12) {
      const L = song.lead[step % song.lead.length], B = song.bass[step % song.bass.length];
      const D = song.drum[step % song.drum.length];
      if (L && L !== '-') tone('square', freq(L), nextTime, spb * 1.8, 0.09, musicGain);
      if (B && B !== '-') tone('triangle', freq(B), nextTime, spb * 1.6, 0.22, musicGain);
      if (D === 'k') tone('sine', 140, nextTime, 0.12, 0.35, musicGain, 45);
      if (D === 's') noise(nextTime, 0.09, 0.16, musicGain, 1800);
      if (D === 'h') noise(nextTime, 0.03, 0.06, musicGain, 7000);
      nextTime += spb; step++;
    }
  }

  return {
    init,
    play(name) {
      init(); if (!ac || current === name) return;
      current = name; step = 0; nextTime = ac.currentTime + 0.05;
      if (!timer) timer = setInterval(schedule, 25);
    },
    stop() { current = null; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
    isMuted() { return muted; },
    suspend() { if (ac && ac.state === 'running') ac.suspend(); },
    resume() { if (ac && ac.state === 'suspended') ac.resume(); },
    sfx(name) {
      if (!ac) return; const t = ac.currentTime;
      switch (name) {
        case 'shoot': tone('square', 880, t, 0.07, 0.10, null, 440); break;
        case 'meow': tone('sawtooth', 700, t, 0.18, 0.10, null, 1100); break;
        case 'hairball': tone('triangle', 300, t, 0.12, 0.25, null, 150); break;
        case 'jump': tone('square', 330, t, 0.12, 0.10, null, 660); break;
        case 'hit': noise(t, 0.15, 0.3, null, 500); tone('square', 200, t, 0.15, 0.12, null, 80); break;
        case 'enemy': noise(t, 0.08, 0.18, null, 1500); break;
        case 'boom': noise(t, 0.4, 0.4, null, 200); tone('sine', 120, t, 0.4, 0.3, null, 40); break;
        case 'coin': tone('square', 988, t, 0.06, 0.08); tone('square', 1319, t + 0.06, 0.12, 0.08); break;
        case 'power': ['C5','E5','G5','C6'].forEach((n, i) => tone('square', freq(n), t + i * 0.06, 0.1, 0.09)); break;
        case 'special': ['A4','C5','E5','A5','E5','A5'].forEach((n, i) => tone('sawtooth', freq(n), t + i * 0.04, 0.08, 0.08)); break;
        case 'buy': ['E5','G5','B5'].forEach((n, i) => tone('triangle', freq(n), t + i * 0.07, 0.14, 0.25)); break;
        case 'nope': tone('square', 160, t, 0.18, 0.12, null, 110); break;
        case 'click': tone('square', 1200, t, 0.03, 0.06); break;
        case 'over': ['A4','G4','F4','E4','D4','A3'].forEach((n, i) => tone('triangle', freq(n), t + i * 0.13, 0.2, 0.3)); break;
      }
    },
  };
})();
