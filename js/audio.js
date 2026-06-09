/* =========================================================================
   audio.js  —  Synthetische Soundeffekte via WebAudio (keine externen Dateien)
   ========================================================================= */
(function () {
  "use strict";
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ac = ensure(); if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur + 0.02);
  }

  function noise(dur, vol) {
    if (muted) return;
    const ac = ensure(); if (!ac) return;
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(); src.buffer = buf;
    const g = ac.createGain(); g.gain.value = vol || 0.3;
    src.connect(g); g.connect(ac.destination); src.start();
  }

  const SFX = {
    init: ensure,
    setMuted: (m) => { muted = m; },
    coin: () => tone(880, 0.08, "square", 0.12, 1320),
    jump: () => tone(420, 0.16, "sine", 0.18, 760),
    roll: () => tone(300, 0.14, "sawtooth", 0.12, 150),
    lane: () => tone(520, 0.06, "triangle", 0.1, 620),
    power: () => { tone(660, 0.1, "square", 0.15, 990); setTimeout(() => tone(990, 0.12, "square", 0.15, 1480), 90); },
    crash: () => { noise(0.3, 0.35); tone(160, 0.4, "sawtooth", 0.25, 60); },
    shield: () => tone(700, 0.25, "sine", 0.2, 350),
    start: () => { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.12, "square", 0.15), i * 80)); },
    gameover: () => { [523, 415, 349, 262].forEach((f, i) => setTimeout(() => tone(f, 0.22, "triangle", 0.18), i * 130)); },
  };

  window.SFX = SFX;
})();
