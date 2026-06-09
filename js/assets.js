/* =========================================================================
   assets.js  —  Prozedurale, selbst gezeichnete Grafiken (100% lizenzfrei)
   Alle Sprites werden zur Laufzeit auf Offscreen-Canvas gerendert.
   Kein externes Bildmaterial, keine Copyright-Assets.
   ========================================================================= */
(function () {
  "use strict";

  function mkCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------------- Charakter ----------------
     Stilisierter Läufer mit Outline, Shading, Cap und Rucksack-Riemen.
     Pose-Parameter erzeugen Lauf-, Sprung- und Roll-Frames. */
  const CHAR_PALETTES = [
    { name: "Nova",  skin: "#f7c9a0", skinSh: "#e0a878", hood: "#ff5d8f", hoodSh: "#d8366e", pants: "#34465f", pantsSh: "#243345", shoe: "#ffd23f", shoeSh: "#e0a800", pack: "#3ee07a", cap: "#ff8c42", hair: "#3a2620" },
    { name: "Volt",  skin: "#eab488", skinSh: "#cf9362", hood: "#4bd0ff", hoodSh: "#1f9cd6", pants: "#26323f", pantsSh: "#18222c", shoe: "#ff8c42", shoeSh: "#d96a20", pack: "#ffd23f", cap: "#1b9aaa", hair: "#1a1a1a" },
    { name: "Pixel", skin: "#d8ac82", skinSh: "#bb8a5e", hood: "#3ee07a", hoodSh: "#1fae57", pants: "#3a2d56", pantsSh: "#281d3d", shoe: "#ffffff", shoeSh: "#c9c9c9", pack: "#ff5d8f", cap: "#7c5cff", hair: "#5a3a1a" },
  ];

  const OL = "rgba(18,24,34,0.92)";

  function drawCharacter(ctx, S, pal, pose) {
    ctx.save();
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.translate(S * 0.5, S * 0.5);
    const crouch = pose.crouch || 0;
    ctx.rotate(pose.lean || 0);
    ctx.scale(1, 1 - crouch * 0.35);
    ctx.translate(0, crouch * S * 0.18);
    const u = S / 100;
    const olw = 2.2 * u;

    function shade(c1, c2, x, y, w, h) {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      return g;
    }

    // ---- Beine ----
    function leg(angle, side) {
      ctx.save();
      ctx.translate(side * 7 * u, 14 * u);
      ctx.rotate(angle);
      ctx.fillStyle = shade(pal.pants, pal.pantsSh, -5 * u, 0, 10 * u, 20 * u);
      ctx.strokeStyle = OL; ctx.lineWidth = olw;
      rr(ctx, -5 * u, 0, 10 * u, 20 * u, 5 * u); ctx.fill(); ctx.stroke();
      // Schuh
      ctx.fillStyle = shade(pal.shoe, pal.shoeSh, -6 * u, 16 * u, 14 * u, 9 * u);
      rr(ctx, -6 * u, 16 * u, 15 * u, 9 * u, 4 * u); ctx.fill(); ctx.stroke();
      // Sohle
      ctx.fillStyle = "#222";
      rr(ctx, -6 * u, 23 * u, 15 * u, 3 * u, 1.5 * u); ctx.fill();
      ctx.restore();
    }
    leg(pose.legA, -1);
    leg(pose.legB, 1);

    // ---- Körper / Hoodie ----
    ctx.fillStyle = shade(pal.hood, pal.hoodSh, 0, -16 * u, 0, 34 * u);
    ctx.strokeStyle = OL; ctx.lineWidth = olw;
    rr(ctx, -14 * u, -16 * u, 28 * u, 34 * u, 11 * u); ctx.fill(); ctx.stroke();
    // Bauchtasche
    ctx.fillStyle = pal.hoodSh;
    rr(ctx, -9 * u, 2 * u, 18 * u, 10 * u, 5 * u); ctx.fill();
    // Reißverschluss
    ctx.strokeStyle = "rgba(0,0,0,0.22)"; ctx.lineWidth = 1.6 * u;
    ctx.beginPath(); ctx.moveTo(0, -14 * u); ctx.lineTo(0, 2 * u); ctx.stroke();
    // Rucksack-Riemen
    ctx.strokeStyle = pal.pack; ctx.lineWidth = 4 * u;
    ctx.beginPath(); ctx.moveTo(-7 * u, -15 * u); ctx.lineTo(-5 * u, 10 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7 * u, -15 * u); ctx.lineTo(5 * u, 10 * u); ctx.stroke();

    // ---- Arme ----
    function arm(angle, side) {
      ctx.save();
      ctx.translate(side * 13 * u, -10 * u);
      ctx.rotate(angle);
      ctx.fillStyle = shade(pal.hood, pal.hoodSh, -4.5 * u, 0, 0, 18 * u);
      ctx.strokeStyle = OL; ctx.lineWidth = olw;
      rr(ctx, -4.5 * u, 0, 9 * u, 18 * u, 4.5 * u); ctx.fill(); ctx.stroke();
      ctx.fillStyle = pal.skin;
      ctx.beginPath(); ctx.arc(0, 19 * u, 4.8 * u, 0, 7); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    arm(pose.armA, -1);
    arm(pose.armB, 1);

    // ---- Kopf ----
    ctx.save();
    ctx.translate(0, -26 * u);
    // Gesicht
    ctx.fillStyle = pal.skin;
    ctx.strokeStyle = OL; ctx.lineWidth = olw;
    rr(ctx, -11 * u, -7 * u, 22 * u, 20 * u, 9 * u); ctx.fill(); ctx.stroke();
    // Wangenschatten
    ctx.fillStyle = pal.skinSh;
    rr(ctx, -11 * u, 4 * u, 22 * u, 9 * u, 8 * u); ctx.fill();
    // Cap
    ctx.fillStyle = shade(pal.cap, pal.hoodSh, -13 * u, -16 * u, 0, 12 * u);
    ctx.beginPath();
    ctx.moveTo(-12 * u, -4 * u);
    ctx.quadraticCurveTo(-13 * u, -16 * u, 0, -16 * u);
    ctx.quadraticCurveTo(13 * u, -16 * u, 12 * u, -4 * u);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Schirm
    ctx.fillStyle = pal.cap;
    rr(ctx, 4 * u, -6 * u, 14 * u, 4.5 * u, 2 * u); ctx.fill(); ctx.stroke();
    // Knopf
    ctx.fillStyle = pal.hoodSh;
    ctx.beginPath(); ctx.arc(0, -15 * u, 2 * u, 0, 7); ctx.fill();
    // Augen
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-4.5 * u, 0, 3 * u, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(4.5 * u, 0, 3 * u, 0, 7); ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath(); ctx.arc(-4 * u, 0.5 * u, 1.6 * u, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(5 * u, 0.5 * u, 1.6 * u, 0, 7); ctx.fill();
    // Lächeln
    ctx.strokeStyle = "#9a5b4a"; ctx.lineWidth = 1.8 * u;
    ctx.beginPath(); ctx.arc(0, 5 * u, 4 * u, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function buildCharacterSet(pal) {
    const S = 128;
    const set = { run: [], jump: null, roll: null, palette: pal, size: S };
    const FRAMES = 8;
    for (let i = 0; i < FRAMES; i++) {
      const t = (i / FRAMES) * Math.PI * 2;
      const sw = Math.sin(t);
      const c = mkCanvas(S, S);
      drawCharacter(c.getContext("2d"), S, pal, {
        legA: sw * 0.6, legB: -sw * 0.6,
        armA: -sw * 0.7, armB: sw * 0.7,
        lean: 0.06,
      });
      set.run.push(c);
    }
    let jc = mkCanvas(S, S);
    drawCharacter(jc.getContext("2d"), S, pal, { legA: -0.5, legB: -0.9, armA: -1.4, armB: -1.2, lean: -0.05 });
    set.jump = jc;
    let rc = mkCanvas(S, S);
    drawCharacter(rc.getContext("2d"), S, pal, { legA: 0.9, legB: -0.6, armA: -0.4, armB: 0.4, lean: 0.5, crouch: 1 });
    set.roll = rc;
    return set;
  }

  /* ---------------- Münze ---------------- */
  function buildCoinFrames() {
    const S = 64, N = 10, frames = [];
    for (let i = 0; i < N; i++) {
      const c = mkCanvas(S, S), ctx = c.getContext("2d");
      const phase = (i / N) * Math.PI * 2;
      const sx = Math.abs(Math.cos(phase)) * 0.92 + 0.08;
      ctx.translate(S / 2, S / 2);
      // Glow
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, S * 0.5);
      glow.addColorStop(0, "rgba(255,224,120,0.55)");
      glow.addColorStop(1, "rgba(255,224,120,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, S * 0.5, 0, 7); ctx.fill();
      ctx.scale(sx, 1);
      const r = S * 0.32;
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
      g.addColorStop(0, "#fff6c2"); g.addColorStop(0.55, "#ffd23f"); g.addColorStop(1, "#c98a00");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#a87400"; ctx.stroke();
      // innerer Ring
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, 7); ctx.stroke();
      // Stern
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + k * (Math.PI * 2 / 5);
        const a2 = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
        ctx.lineTo(Math.cos(a2) * r * 0.22, Math.sin(a2) * r * 0.22);
      }
      ctx.closePath(); ctx.fill();
      frames.push(c);
    }
    return frames;
  }

  /* ---------------- Hindernisse ---------------- */
  function buildTrain(color) {
    const W = 180, H = 300, c = mkCanvas(W, H), ctx = c.getContext("2d");
    ctx.lineJoin = "round";
    // Körper mit seitlichem Volumen-Verlauf
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, color.dark); g.addColorStop(0.18, color.a);
    g.addColorStop(0.5, color.b); g.addColorStop(0.82, color.a); g.addColorStop(1, color.dark);
    ctx.fillStyle = g;
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 4;
    rr(ctx, 10, 10, W - 20, H - 20, 26); ctx.fill(); ctx.stroke();
    // Dach
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    rr(ctx, 18, 14, W - 36, 18, 12); ctx.fill();
    // Front-Scheibe (Verlauf)
    const wg = ctx.createLinearGradient(0, 26, 0, 84);
    wg.addColorStop(0, "#dff5ff"); wg.addColorStop(1, "#7ec3ef");
    ctx.fillStyle = wg;
    rr(ctx, 30, 28, W - 60, 56, 16); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    rr(ctx, 34, 32, (W - 60) / 2 - 6, 48, 12); ctx.fill();
    // Seitenfenster
    for (let y = 108; y < H - 56; y += 60) {
      const sg = ctx.createLinearGradient(0, y, 0, y + 36);
      sg.addColorStop(0, "#bfe6ff"); sg.addColorStop(1, "#6fb8e8");
      ctx.fillStyle = sg;
      rr(ctx, 34, y, W - 68, 36, 9); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 2; ctx.stroke();
    }
    // Zierstreifen
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(14, H - 64, W - 28, 8);
    // Scheinwerfer mit Glow
    [[40, H - 34], [W - 40, H - 34]].forEach(([x, y]) => {
      const lg = ctx.createRadialGradient(x, y, 1, x, y, 20);
      lg.addColorStop(0, "#fff8c0"); lg.addColorStop(1, "rgba(255,248,192,0)");
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff3b0";
      ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
    });
    return c;
  }

  function buildLowBarrier() {
    const W = 170, H = 86, c = mkCanvas(W, H), ctx = c.getContext("2d");
    ctx.lineJoin = "round";
    // Betonblock
    const g = ctx.createLinearGradient(0, 18, 0, H);
    g.addColorStop(0, "#ffa15a"); g.addColorStop(1, "#e0712d");
    ctx.fillStyle = g; ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 3;
    rr(ctx, 6, 20, W - 12, H - 28, 10); ctx.fill(); ctx.stroke();
    // Warnstreifen
    ctx.save();
    rr(ctx, 6, 20, W - 12, H - 28, 10); ctx.clip();
    for (let x = -H; x < W; x += 26) {
      ctx.fillStyle = ((x / 26) | 0) % 2 ? "#142d3c" : "#ffd23f";
      ctx.beginPath();
      ctx.moveTo(x, 20); ctx.lineTo(x + 14, 20); ctx.lineTo(x + 14 + 30, H); ctx.lineTo(x + 30, H);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // Oberkante
    ctx.fillStyle = "#ffd23f";
    rr(ctx, 4, 12, W - 8, 12, 6); ctx.fill(); ctx.stroke();
    return c;
  }

  function buildHighBarrier() {
    const W = 170, H = 130, c = mkCanvas(W, H), ctx = c.getContext("2d");
    ctx.lineJoin = "round";
    // Pfosten
    const pg = ctx.createLinearGradient(0, 0, 18, 0);
    pg.addColorStop(0, "#4a5a6a"); pg.addColorStop(1, "#2a3744");
    ctx.fillStyle = pg; ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 3;
    rr(ctx, 10, 38, 18, H - 40, 5); ctx.fill(); ctx.stroke();
    rr(ctx, W - 28, 38, 18, H - 40, 5); ctx.fill(); ctx.stroke();
    // Schild-Balken (oben, drunter durchrollen)
    const bg = ctx.createLinearGradient(0, 10, 0, 46);
    bg.addColorStop(0, "#ff5b5b"); bg.addColorStop(1, "#c20000");
    ctx.fillStyle = bg;
    rr(ctx, 6, 12, W - 12, 36, 8); ctx.fill(); ctx.stroke();
    // Pfeil nach unten (ducken)
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(W / 2 - 14, 22); ctx.lineTo(W / 2 + 14, 22); ctx.lineTo(W / 2, 40);
    ctx.closePath(); ctx.fill();
    return c;
  }

  /* ---------------- Power-Ups ---------------- */
  function powerIcon(kind) {
    const S = 56, c = mkCanvas(S, S), ctx = c.getContext("2d");
    ctx.translate(S / 2, S / 2);
    const bg = {
      magnet: ["#ff7b7b", "#c20000"], x2: ["#a98bff", "#4b2ec2"],
      jet: ["#6bdcff", "#1b7bbf"], board: ["#6ef0a4", "#1b9a4a"],
    }[kind];
    // Außen-Glow
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, S * 0.5);
    glow.addColorStop(0, bg[0] + "cc"); glow.addColorStop(1, bg[0] + "00");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, S * 0.5, 0, 7); ctx.fill();
    // Scheibe
    const g = ctx.createLinearGradient(0, -S / 2, 0, S / 2);
    g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, S * 0.36, 0, 7); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.stroke();
    // Glanz
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath(); ctx.ellipse(-5, -8, 11, 6, -0.5, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (kind === "magnet") {
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, -2, 10, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-10, 8); ctx.moveTo(10, -2); ctx.lineTo(10, 8); ctx.stroke();
      ctx.fillStyle = "#ffd23f"; ctx.fillRect(-13, 6, 6, 6); ctx.fillRect(7, 6, 6, 6);
    } else if (kind === "x2") {
      ctx.font = "900 24px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("2×", 0, 1);
    } else if (kind === "jet") {
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, 7); ctx.lineTo(0, 2); ctx.lineTo(-9, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(5, 16); ctx.lineTo(0, 11); ctx.lineTo(-5, 16); ctx.closePath(); ctx.fill();
    } else if (kind === "board") {
      ctx.fillStyle = "#142d3c"; rr(ctx, -16, 2, 32, 9, 5); ctx.fill();
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath(); ctx.arc(-8, 13, 3.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(8, 13, 3.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; rr(ctx, -11, -11, 22, 13, 4); ctx.fill();
    }
    return c;
  }

  /* ---------------- Hintergrund: Skyline ---------------- */
  function buildSkyline(w, h, seed, opts) {
    opts = opts || {};
    const c = mkCanvas(w, h), ctx = c.getContext("2d");
    let s = seed || 1;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const far = !!opts.far;
    const tones = far
      ? ["#2a5a72", "#326b85", "#24506a"]
      : ["#163243", "#1d4257", "#102835"];
    const winCol = far ? "rgba(180,230,255,0.25)" : "rgba(255,210,63,0.55)";
    let x = 0;
    while (x < w) {
      const bw = (far ? 30 : 44) + rnd() * (far ? 50 : 80);
      const bh = h * ((far ? 0.25 : 0.4) + rnd() * (far ? 0.5 : 0.6));
      const top = h - bh;
      // Gebäude mit leichtem Verlauf
      const g = ctx.createLinearGradient(x, top, x, h);
      const base = tones[(rnd() * tones.length) | 0];
      g.addColorStop(0, base); g.addColorStop(1, "rgba(8,20,28,0.9)");
      ctx.fillStyle = g;
      ctx.fillRect(x, top, bw, bh);
      // Dach-Antenne
      if (!far && rnd() > 0.6) {
        ctx.fillStyle = base; ctx.fillRect(x + bw / 2 - 1, top - 12 - rnd() * 14, 2, 14);
      }
      // Fenster
      ctx.fillStyle = winCol;
      const stepY = far ? 12 : 15, stepX = far ? 10 : 13;
      for (let wy = top + 8; wy < h - 8; wy += stepY)
        for (let wx = x + 5; wx < x + bw - 7; wx += stepX)
          if (rnd() > (far ? 0.6 : 0.45)) ctx.fillRect(wx, wy, far ? 4 : 6, far ? 5 : 8);
      x += bw + (far ? 2 : 5);
    }
    // Dunst am Fuß
    const haze = ctx.createLinearGradient(0, h - h * 0.4, 0, h);
    haze.addColorStop(0, "rgba(54,176,196,0)");
    haze.addColorStop(1, far ? "rgba(54,176,196,0.5)" : "rgba(40,120,150,0.35)");
    ctx.fillStyle = haze; ctx.fillRect(0, h - h * 0.4, w, h * 0.4);
    return c;
  }

  function buildCloud() {
    const W = 180, H = 90, c = mkCanvas(W, H), ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255,255,255,0.92)"); g.addColorStop(1, "rgba(220,238,248,0.8)");
    ctx.fillStyle = g;
    [[54, 56, 36], [98, 48, 44], [138, 58, 30], [76, 62, 32]].forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    });
    return c;
  }

  /* ---------------- Build All ---------------- */
  const Assets = {
    chars: CHAR_PALETTES.map(buildCharacterSet),
    palettes: CHAR_PALETTES,
    coin: buildCoinFrames(),
    trains: [
      buildTrain({ a: "#e54b5e", b: "#ff8a98", dark: "#a8273a" }),
      buildTrain({ a: "#2e8bd6", b: "#6cc0ff", dark: "#1a5e99" }),
      buildTrain({ a: "#f0a93a", b: "#ffd27a", dark: "#bd7d18" }),
      buildTrain({ a: "#5a4bd6", b: "#9a8aff", dark: "#3a2da3" }),
    ],
    lowBarrier: buildLowBarrier(),
    highBarrier: buildHighBarrier(),
    power: {
      magnet: powerIcon("magnet"),
      x2: powerIcon("x2"),
      jet: powerIcon("jet"),
      board: powerIcon("board"),
    },
    cloud: buildCloud(),
    buildSkyline: buildSkyline,
  };

  window.Assets = Assets;
})();
