/* =========================================================================
   game.js  —  TUNNEL DASH  (Endless Runner, Pseudo-3D, mobile-tauglich)
   ========================================================================= */
(function () {
  "use strict";

  const A = window.Assets, SFX = window.SFX;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // ---- Persistenz ----
  const store = {
    get high() { return +(localStorage.getItem("td_high") || 0); },
    set high(v) { localStorage.setItem("td_high", v); },
    get coins() { return +(localStorage.getItem("td_coins") || 0); },
    set coins(v) { localStorage.setItem("td_coins", v); },
    get char() { return +(localStorage.getItem("td_char") || 0); },
    set char(v) { localStorage.setItem("td_char", v); },
  };

  // ---- Bildschirm / Projektion ----
  let W = 0, H = 0, DPR = 1, cx = 0, horizonY = 0, F = 0;
  const camH = 1.0;
  const LANE_X = 0.5;       // seitlicher Welt-Abstand pro Spur
  const TRACK_HALF = 0.92;  // halbe Streckenbreite (Welt)
  const Z_PLAYER = 3.2;     // Tiefe der Spielfigur
  const Z_BOTTOM = 1.55;    // unterer Streckenrand
  const Z_FAR = 62;         // Spawn-Distanz

  let skyline = null;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2;
    horizonY = H * 0.40;
    F = H * 0.95;
    skyline = A.buildSkyline(Math.max(W * 2, 1400), Math.round(H * 0.36), 7);
  }
  window.addEventListener("resize", resize);

  function project(wx, wz, wy) {
    const s = F / wz;
    return { x: cx + wx * s + camShakeX, y: horizonY + (camH - (wy || 0)) * s + camShakeY, s };
  }
  function laneToX(laneF) { return laneF * LANE_X; }

  // ---- Spielzustand ----
  const GS = { MENU: 0, COUNT: 1, PLAY: 2, PAUSE: 3, OVER: 4 };
  let mode = GS.MENU;

  let camShakeX = 0, camShakeY = 0, shakeT = 0;

  const player = {
    lane: 0, laneF: 0,
    y: 0, vy: 0, grounded: true,
    rollT: 0, runT: 0,
    flying: false, flyY: 0,
  };

  const state = {
    speed: 0, dist: 0, score: 0, coins: 0,
    rowAcc: 0, rowGap: 11,
    puAcc: 0,
    effects: { magnet: 0, x2: 0, jet: 0 },
    shield: false, invuln: 0,
    trainBusy: 0, // verbleibende Welt-Distanz, in der keine neuen Hindernisse kommen
  };

  let obstacles = [];  // {type, lane, z, len, w, h, baseY, img, hit}
  let coins = [];      // {lane, lx, z, y, taken, mag}
  let powerups = [];   // {kind, lane, z, y, taken}
  let particles = [];

  const JUMP_V = 4.4, GRAV = 12.5;

  function reset() {
    player.lane = 0; player.laneF = 0; player.y = 0; player.vy = 0;
    player.grounded = true; player.rollT = 0; player.runT = 0;
    player.flying = false; player.flyY = 0;
    state.speed = 16; state.dist = 0; state.score = 0; state.coins = 0;
    state.rowAcc = 0; state.rowGap = 11; state.puAcc = 0;
    state.effects = { magnet: 0, x2: 0, jet: 0 };
    state.shield = false; state.invuln = 0; state.trainBusy = 0;
    obstacles = []; coins = []; powerups = []; particles = [];
  }

  // ---- Spawning ----
  const TRAIN_COLORS = A.trains;
  function freeLanes(used) { return [-1, 0, 1].filter((l) => !used.includes(l)); }

  function spawnRow() {
    const used = [];
    const r = Math.random();

    if (state.trainBusy > 0) {
      // Während ein Zug läuft: nur Münzen / Power-Ups in freien Spuren
      maybeCoinsOrPower(freeLanes([]));
      return;
    }

    if (r < 0.16) {
      // Zug in einer Spur (lange Hürde) -> blockiert Spur für seine Länge
      const lane = [-1, 0, 1][(Math.random() * 3) | 0];
      const len = 12 + Math.random() * 8;
      obstacles.push({
        type: "train", lane, z: Z_FAR, len,
        w: 0.95, h: 1.7, baseY: 0,
        img: TRAIN_COLORS[(Math.random() * TRAIN_COLORS.length) | 0], hit: false,
      });
      state.trainBusy = len + 6;
      maybeCoinsOrPower(freeLanes([lane]));
      return;
    }

    // 1–2 niedrige/hohe Hindernisse, mind. eine Spur frei
    const count = r < 0.55 ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const free = freeLanes(used);
      if (free.length <= 1) break; // immer ≥1 frei lassen
      const lane = free[(Math.random() * free.length) | 0];
      used.push(lane);
      if (Math.random() < 0.5) {
        obstacles.push({ type: "jump", lane, z: Z_FAR, len: 0.8, w: 0.85, h: 0.5, baseY: 0, img: A.lowBarrier, hit: false });
        // Münzbogen über der Hürde
        for (let k = 0; k < 5; k++)
          coins.push({ lane, lx: laneToX(lane), z: Z_FAR + 2 - k * 0.9, y: 0.5 + Math.sin((k / 4) * Math.PI) * 0.7, taken: false });
      } else {
        obstacles.push({ type: "duck", lane, z: Z_FAR, len: 0.8, w: 0.9, h: 0.75, baseY: 0.62, img: A.highBarrier, hit: false });
      }
    }
    maybeCoinsOrPower(freeLanes(used));
  }

  function maybeCoinsOrPower(free) {
    if (!free.length) return;
    const lane = free[(Math.random() * free.length) | 0];
    state.puAcc += state.rowGap;
    if (state.puAcc > 26 + Math.random() * 16) {
      state.puAcc = 0;
      const kinds = ["magnet", "x2", "jet", "board"];
      powerups.push({ kind: kinds[(Math.random() * kinds.length) | 0], lane, lx: laneToX(lane), z: Z_FAR, y: 0.6, taken: false });
    } else if (Math.random() < 0.85) {
      const n = 4 + ((Math.random() * 4) | 0);
      for (let k = 0; k < n; k++)
        coins.push({ lane, lx: laneToX(lane), z: Z_FAR + k * 0.9, y: 0.45, taken: false });
    }
  }

  // ---- Eingaben ----
  function moveLane(dir) {
    if (mode !== GS.PLAY) return;
    const t = Math.max(-1, Math.min(1, player.lane + dir));
    if (t !== player.lane) { player.lane = t; SFX.lane(); }
  }
  function doJump() {
    if (mode !== GS.PLAY || player.flying) return;
    if (player.grounded) { player.vy = JUMP_V; player.grounded = false; player.rollT = 0; SFX.jump(); }
  }
  function doRoll() {
    if (mode !== GS.PLAY || player.flying) return;
    player.rollT = 0.55;
    if (!player.grounded) { player.y = 0; player.vy = -2; } // schneller runter
    SFX.roll();
  }

  // Tastatur
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase()) || k === " ") e.preventDefault();
    if (k === "arrowleft" || k === "a") moveLane(-1);
    else if (k === "arrowright" || k === "d") moveLane(1);
    else if (k === "arrowup" || k === "w" || k === " ") doJump();
    else if (k === "arrowdown" || k === "s") doRoll();
    else if (k === "p") togglePause();
  });

  // Touch
  let tStart = null;
  canvas.addEventListener("touchstart", (e) => {
    SFX.init();
    const t = e.changedTouches[0];
    tStart = { x: t.clientX, y: t.clientY, t: performance.now() };
  }, { passive: true });
  canvas.addEventListener("touchend", (e) => {
    if (!tStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tStart.x, dy = t.clientY - tStart.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const TH = 24;
    if (adx < TH && ady < TH) { doJump(); } // Tipp = Sprung
    else if (adx > ady) { moveLane(dx > 0 ? 1 : -1); }
    else { dy < 0 ? doJump() : doRoll(); }
    tStart = null;
  }, { passive: true });
  // Maus (Desktop-Test)
  let mDown = null;
  canvas.addEventListener("mousedown", (e) => { SFX.init(); mDown = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("mouseup", (e) => {
    if (!mDown) return;
    const dx = e.clientX - mDown.x, dy = e.clientY - mDown.y;
    const adx = Math.abs(dx), ady = Math.abs(dy), TH = 24;
    if (adx < TH && ady < TH) doJump();
    else if (adx > ady) moveLane(dx > 0 ? 1 : -1);
    else dy < 0 ? doJump() : doRoll();
    mDown = null;
  });

  // ---- Update ----
  function update(dt) {
    // Schwierigkeit
    state.speed = Math.min(40, state.speed + 0.55 * dt);
    state.rowGap = Math.max(7, 11 - (state.speed - 16) * 0.18);
    const scoreMul = state.effects.x2 > 0 ? 2 : 1;
    state.dist += state.speed * dt;
    state.score += state.speed * dt * 1.1 * scoreMul;

    // Effekt-Timer
    for (const k in state.effects) if (state.effects[k] > 0) state.effects[k] -= dt;
    if (state.invuln > 0) state.invuln -= dt;
    player.flying = state.effects.jet > 0;

    // Spieler-Spurinterpolation
    player.laneF += (player.lane - player.laneF) * Math.min(1, dt * 12);

    // Vertikal
    if (player.flying) {
      player.y += (2.4 - player.y) * Math.min(1, dt * 4);
      player.grounded = false; player.vy = 0; player.rollT = 0;
    } else {
      if (!player.grounded) {
        player.y += player.vy * dt;
        player.vy -= GRAV * dt;
        if (player.y <= 0) { player.y = 0; player.vy = 0; player.grounded = true; }
      }
      if (player.rollT > 0) player.rollT -= dt;
    }
    player.runT += dt * (6 + state.speed * 0.25);

    // Reihen spawnen
    state.rowAcc += state.speed * dt;
    while (state.rowAcc >= state.rowGap) {
      state.rowAcc -= state.rowGap;
      spawnRow();
    }
    if (state.trainBusy > 0) state.trainBusy -= state.speed * dt;

    // Bewegung der Welt
    const dz = state.speed * dt;
    for (const o of obstacles) o.z -= dz;
    for (const c of coins) c.z -= dz;
    for (const p of powerups) p.z -= dz;

    const px = laneToX(player.laneF);
    const playerLane = Math.round(player.laneF);

    // Jetpack-Münzstrom
    if (player.flying && Math.random() < 0.4) {
      coins.push({ lane: playerLane, lx: px, z: Z_FAR * 0.5, y: 2.2 + Math.random() * 0.4, taken: false, mag: true });
    }

    // Kollision Hindernisse
    for (const o of obstacles) {
      if (o.hit) continue;
      const zb = o.z + o.len;
      const overlap = o.z <= Z_PLAYER + 0.45 && zb >= Z_PLAYER - 0.45;
      if (!overlap) continue;
      if (o.lane !== playerLane) continue;
      let safe = false;
      if (player.flying || state.invuln > 0) safe = true;
      else if (o.type === "jump") safe = player.y > 0.28;
      else if (o.type === "duck") safe = player.rollT > 0;
      else if (o.type === "train") safe = false;
      if (safe) continue;
      o.hit = true;
      if (state.shield) {
        state.shield = false; state.invuln = 1.4; SFX.shield();
        burst(project(laneToX(player.laneF), Z_PLAYER, player.y + 0.4), "#5ef09a", 18);
        triggerShake(8);
      } else {
        return gameOver();
      }
    }

    // Münzen
    const magnet = state.effects.magnet > 0;
    for (const c of coins) {
      if (c.taken) continue;
      if (c.z < Z_PLAYER - 2) { c.taken = true; continue; }
      const inMag = (magnet || c.mag) && c.z < 18 && c.z > Z_PLAYER - 1;
      if (inMag) {
        c.lx += (px - c.lx) * Math.min(1, dt * 6);
        c.y += ((player.y + 0.4) - c.y) * Math.min(1, dt * 6);
      }
      const near = c.z <= Z_PLAYER + 0.7 && c.z >= Z_PLAYER - 0.9;
      const aligned = Math.abs(c.lx - px) < 0.3;
      if (near && (aligned || inMag)) {
        c.taken = true;
        state.coins++; state.score += 6 * scoreMul;
        SFX.coin();
        burst(project(c.lx, c.z, c.y), "#ffd23f", 6);
      }
    }

    // Power-Ups
    for (const p of powerups) {
      if (p.taken) continue;
      if (p.z < Z_PLAYER - 2) { p.taken = true; continue; }
      const near = p.z <= Z_PLAYER + 0.8 && p.z >= Z_PLAYER - 1;
      if (near && (Math.abs(laneToX(p.lane) - px) < 0.32)) {
        p.taken = true; activatePower(p.kind);
        burst(project(p.lx, p.z, p.y), "#ffffff", 16);
        SFX.power();
      }
    }

    // Partikel
    for (const pt of particles) {
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 260 * dt; pt.life -= dt;
    }

    // Aufräumen
    obstacles = obstacles.filter((o) => o.z + o.len > Z_PLAYER - 2.5);
    coins = coins.filter((c) => !c.taken && c.z > 1.2);
    powerups = powerups.filter((p) => !p.taken && p.z > 1.2);
    particles = particles.filter((p) => p.life > 0);

    // Shake
    if (shakeT > 0) {
      shakeT -= dt;
      const m = shakeT * 90;
      camShakeX = (Math.random() * 2 - 1) * m;
      camShakeY = (Math.random() * 2 - 1) * m;
    } else { camShakeX = 0; camShakeY = 0; }

    updateHUD();
  }

  function activatePower(kind) {
    if (kind === "magnet") state.effects.magnet = 7;
    else if (kind === "x2") state.effects.x2 = 9;
    else if (kind === "jet") state.effects.jet = 5;
    else if (kind === "board") { state.shield = true; }
  }

  function triggerShake(t) { shakeT = Math.max(shakeT, t / 100); }

  function burst(p, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 160;
      particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.4 + Math.random() * 0.4, color, size: 2 + Math.random() * 3 });
    }
  }

  // ---- Rendering ----
  function drawImg(img, p, worldW, worldH, baseY) {
    const sw = worldW * p.s, sh = worldH * p.s;
    ctx.drawImage(img, p.x - sw / 2, p.y - sh - (baseY || 0) * p.s, sw, sh);
  }

  function render() {
    // Himmel
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY + 40);
    sky.addColorStop(0, "#0b2a3a");
    sky.addColorStop(0.5, "#13628a");
    sky.addColorStop(1, "#36b0c4");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, horizonY + 60);

    // Skyline (Parallax nach Spur)
    if (skyline) {
      const off = (-player.laneF * 40) % (skyline.width / 2);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(skyline, off - skyline.width / 4, horizonY - skyline.height + 4);
      ctx.globalAlpha = 1;
    }
    // Wolken
    const cl = A.cloud;
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 3; i++) {
      const cxp = ((state.dist * 6 + i * 520) % (W + 200)) - 100 - player.laneF * 20;
      ctx.drawImage(cl, W - cxp, horizonY * 0.25 + i * 30, 120, 60);
    }
    ctx.globalAlpha = 1;

    drawGround();

    // Entitäten (fern -> nah)
    const ents = [];
    for (const o of obstacles) ents.push({ z: o.z, kind: "o", ref: o });
    for (const c of coins) if (!c.taken) ents.push({ z: c.z, kind: "c", ref: c });
    for (const p of powerups) if (!p.taken) ents.push({ z: p.z, kind: "p", ref: p });
    ents.sort((a, b) => b.z - a.z);

    for (const e of ents) {
      if (e.z <= 1.2) continue;
      if (e.kind === "o") {
        const o = e.ref;
        const p = project(laneToX(o.lane), o.z, 0);
        drawImg(o.img, p, o.w, o.h, o.baseY);
      } else if (e.kind === "c") {
        const c = e.ref;
        const p = project(c.lx, c.z, c.y);
        const frame = A.coin[(state.dist * 8 + c.z * 3 | 0) % A.coin.length];
        const sz = 0.32 * p.s;
        ctx.drawImage(frame, p.x - sz / 2, p.y - sz / 2, sz, sz);
      } else {
        const pw = e.ref;
        const p = project(laneToX(pw.lane), pw.z, pw.y);
        const img = A.power[pw.kind];
        const sz = 0.5 * p.s * (1 + Math.sin(state.dist * 4 + pw.z) * 0.06);
        // schwebender Glow
        ctx.save();
        ctx.shadowColor = "#fff"; ctx.shadowBlur = 12 * (p.s / 200);
        ctx.drawImage(img, p.x - sz / 2, p.y - sz, sz, sz);
        ctx.restore();
      }
    }

    drawPlayer();

    // Partikel
    for (const pt of particles) {
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    // Streckenfläche (Trapez)
    const fL = project(-TRACK_HALF, Z_FAR, 0), fR = project(TRACK_HALF, Z_FAR, 0);
    const nL = project(-TRACK_HALF, Z_BOTTOM, 0), nR = project(TRACK_HALF, Z_BOTTOM, 0);

    // Tunnelboden
    const gg = ctx.createLinearGradient(0, horizonY, 0, H);
    gg.addColorStop(0, "#0e6e7c");
    gg.addColorStop(1, "#0a3540");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(fL.x, fL.y); ctx.lineTo(fR.x, fR.y);
    ctx.lineTo(nR.x, nR.y); ctx.lineTo(nL.x, nL.y); ctx.closePath();
    ctx.fill();

    // Seitenwände
    ctx.fillStyle = "#0a2530";
    ctx.beginPath();
    ctx.moveTo(0, horizonY); ctx.lineTo(fL.x, fL.y); ctx.lineTo(nL.x, nL.y); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W, horizonY); ctx.lineTo(fR.x, fR.y); ctx.lineTo(nR.x, nR.y); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

    // Schwellen (scrollend)
    const step = 2.2;
    const phase = state.dist % step;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    for (let z = Z_BOTTOM + step - phase; z < Z_FAR; z += step) {
      const l = project(-TRACK_HALF, z, 0), r = project(TRACK_HALF, z, 0);
      ctx.lineWidth = Math.max(1, l.s * 0.05);
      ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.stroke();
    }

    // Spurlinien
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2;
    for (const sep of [-0.75, -0.25, 0.25, 0.75]) {
      const f = project(sep, Z_FAR, 0), n = project(sep, Z_BOTTOM, 0);
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(n.x, n.y); ctx.stroke();
    }
  }

  function drawPlayer() {
    const set = A.chars[store.char] || A.chars[0];
    const px = laneToX(player.laneF);
    const base = project(px, Z_PLAYER, 0);
    const p = project(px, Z_PLAYER, player.y);

    // Schatten
    const shAlpha = Math.max(0.08, 0.4 - player.y * 0.25);
    ctx.fillStyle = `rgba(0,0,0,${shAlpha})`;
    ctx.beginPath();
    const sw = 0.55 * base.s * (1 - player.y * 0.12);
    ctx.ellipse(base.x, base.y, sw, sw * 0.32, 0, 0, 7);
    ctx.fill();

    // Jetpack-Flammen
    if (player.flying) {
      ctx.fillStyle = "#ffce4a";
      for (let i = 0; i < 3; i++) {
        const fy = p.y + (0.1 + Math.random() * 0.25) * p.s;
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(p.x + (i - 1) * 12, fy, (6 + Math.random() * 6) * (p.s / 240), 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Blinken bei Unverwundbarkeit
    if (state.invuln > 0 && (performance.now() / 80 | 0) % 2 === 0) return;

    // Sprite wählen
    let img;
    if (player.rollT > 0) img = set.roll;
    else if (!player.grounded || player.flying) img = set.jump;
    else img = set.run[(player.runT | 0) % set.run.length];

    const wH = player.rollT > 0 ? 0.62 : 0.88;
    const wW = player.rollT > 0 ? 0.9 : 0.62;
    const sh = wH * p.s, swid = wW * p.s;
    ctx.drawImage(img, p.x - swid / 2, p.y - sh, swid, sh);

    // Schild-Aura
    if (state.shield) {
      ctx.strokeStyle = "rgba(94,240,154,0.8)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - sh * 0.5, swid * 0.7, sh * 0.6, 0, 0, 7); ctx.stroke();
    }
  }

  // ---- HUD / Overlays ----
  const el = (id) => document.getElementById(id);
  const hud = el("hud"), puBar = el("powerup-bar");
  const puURL = {}; // gecachte Icon-DataURLs (vermeidet toDataURL pro Frame)

  function updateHUD() {
    el("hud-score").textContent = Math.floor(state.score);
    el("hud-coins").textContent = state.coins;
    // Power-Up-Chips
    const chips = [];
    if (state.effects.magnet > 0) chips.push(["magnet", state.effects.magnet, 7]);
    if (state.effects.x2 > 0) chips.push(["x2", state.effects.x2, 9]);
    if (state.effects.jet > 0) chips.push(["jet", state.effects.jet, 5]);
    if (state.shield) chips.push(["board", 1, 1]);
    puBar.innerHTML = chips.map(([k, t, max]) =>
      `<div class="pu-chip"><img class="pu-ico" src="${puURL[k]}"><div class="pu-bar"><i style="width:${Math.round(t / max * 100)}%"></i></div></div>`
    ).join("");
  }

  function show(id) { el(id).classList.remove("hidden"); }
  function hide(id) { el(id).classList.add("hidden"); }

  function toMenu() {
    mode = GS.MENU;
    hide("hud"); hide("pause"); hide("gameover"); hide("countdown");
    show("menu");
    el("menu-highscore").textContent = store.high;
    el("menu-coins").textContent = store.coins;
  }

  function startGame() {
    SFX.init(); SFX.start();
    reset();
    hide("menu"); hide("gameover");
    show("hud");
    runCountdown();
  }

  function runCountdown() {
    mode = GS.COUNT;
    const cd = el("countdown");
    cd.classList.remove("hidden");
    const seq = ["3", "2", "1", "<span class='go'>LOS!</span>"];
    let i = 0;
    const tick = () => {
      cd.classList.remove("anim");
      void cd.offsetWidth;
      cd.innerHTML = "<span>" + seq[i] + "</span>";
      cd.classList.add("anim");
      i++;
      if (i < seq.length) setTimeout(tick, 750);
      else setTimeout(() => { cd.classList.add("hidden"); mode = GS.PLAY; last = performance.now(); }, 700);
    };
    tick();
  }

  function togglePause() {
    if (mode === GS.PLAY) { mode = GS.PAUSE; show("pause"); }
    else if (mode === GS.PAUSE) { hide("pause"); mode = GS.PLAY; last = performance.now(); }
  }

  function gameOver() {
    mode = GS.OVER;
    SFX.crash(); SFX.gameover();
    triggerShake(14);
    burst(project(laneToX(player.laneF), Z_PLAYER, player.y + 0.4), "#ff5d5d", 26);
    const sc = Math.floor(state.score);
    store.coins = store.coins + state.coins;
    const best = sc > store.high;
    if (best) store.high = sc;
    el("go-score").textContent = sc;
    el("go-coins").textContent = state.coins;
    el("go-best").classList.toggle("hidden", !best);
    setTimeout(() => { hide("hud"); show("gameover"); }, 600);
  }

  // ---- Charakterauswahl ----
  function buildCharList() {
    const list = el("char-list");
    list.innerHTML = "";
    A.chars.forEach((set, idx) => {
      const c = document.createElement("canvas");
      c.width = 60; c.height = 76;
      const cc = c.getContext("2d");
      cc.drawImage(set.run[0], -28, -22, 116, 116);
      if (idx === store.char) c.classList.add("sel");
      c.addEventListener("click", () => {
        store.char = idx;
        [...list.children].forEach((x) => x.classList.remove("sel"));
        c.classList.add("sel");
        SFX.lane();
      });
      list.appendChild(c);
    });
  }

  // ---- Loop ----
  let last = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000) || 0;
    last = now;
    if (mode === GS.PLAY) update(dt);
    if (mode !== GS.MENU) render();
    requestAnimationFrame(loop);
  }

  // ---- Wiring ----
  function init() {
    resize();
    for (const k in A.power) puURL[k] = A.power[k].toDataURL();
    buildCharList();
    toMenu();

    el("btn-play").onclick = startGame;
    el("btn-again").onclick = startGame;
    el("btn-menu").onclick = toMenu;
    el("btn-quit").onclick = () => { hide("pause"); toMenu(); };
    el("btn-resume").onclick = togglePause;
    el("btn-pause").onclick = togglePause;
    el("btn-howto").onclick = () => { hide("menu"); show("howto"); };
    el("btn-howto-back").onclick = () => { hide("howto"); show("menu"); };

    last = performance.now();
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
