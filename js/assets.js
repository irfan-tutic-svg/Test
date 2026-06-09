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
     Stilisierter Läufer. Pose-Parameter erzeugen Lauf-, Sprung- und Roll-Frames.
     Jeder Charakter hat eine eigene Farbpalette. */
  const CHAR_PALETTES = [
    { name: "Nova",  skin: "#f1c29b", hood: "#ff5d8f", pants: "#2b3a55", shoe: "#ffd23f", hair: "#3a2a2a" },
    { name: "Volt",  skin: "#e0a878", hood: "#4bd0ff", pants: "#1f2d3d", shoe: "#ff8c42", hair: "#1a1a1a" },
    { name: "Pixel", skin: "#caa07a", hood: "#3ee07a", pants: "#33264d", shoe: "#ffffff", hair: "#5a3a1a" },
  ];

  function drawCharacter(ctx, S, pal, pose) {
    // pose: { legA, legB, armA, armB, lean, crouch, fly }
    ctx.save();
    ctx.translate(S * 0.5, S * 0.5);
    const crouch = pose.crouch || 0;          // 0..1
    const lean = pose.lean || 0;
    ctx.rotate(lean);
    ctx.scale(1, 1 - crouch * 0.35);
    ctx.translate(0, crouch * S * 0.18);

    const u = S / 100; // unit
    const shadowGrad = ctx;

    // ---- Beine ----
    function leg(angle, side) {
      ctx.save();
      ctx.translate(side * 7 * u, 14 * u);
      ctx.rotate(angle);
      ctx.fillStyle = pal.pants;
      rr(ctx, -5 * u, 0, 10 * u, 20 * u, 5 * u); ctx.fill();
      // Schuh
      ctx.fillStyle = pal.shoe;
      rr(ctx, -6 * u, 16 * u, 14 * u, 8 * u, 4 * u); ctx.fill();
      ctx.restore();
    }
    leg(pose.legA, -1);
    leg(pose.legB, 1);

    // ---- Körper / Hoodie ----
    ctx.fillStyle = pal.hood;
    rr(ctx, -14 * u, -16 * u, 28 * u, 34 * u, 11 * u); ctx.fill();
    // Reißverschluss
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.moveTo(0, -14 * u); ctx.lineTo(0, 16 * u); ctx.stroke();

    // ---- Arme ----
    function arm(angle, side) {
      ctx.save();
      ctx.translate(side * 13 * u, -10 * u);
      ctx.rotate(angle);
      ctx.fillStyle = pal.hood;
      rr(ctx, -4.5 * u, 0, 9 * u, 18 * u, 4.5 * u); ctx.fill();
      ctx.fillStyle = pal.skin;
      ctx.beginPath(); ctx.arc(0, 19 * u, 4.5 * u, 0, 7); ctx.fill();
      ctx.restore();
    }
    arm(pose.armA, -1);
    arm(pose.armB, 1);

    // ---- Kopf ----
    ctx.save();
    ctx.translate(0, -26 * u);
    // Haare hinten
    ctx.fillStyle = pal.hair;
    ctx.beginPath(); ctx.arc(0, 0, 13 * u, 0, 7); ctx.fill();
    // Gesicht
    ctx.fillStyle = pal.skin;
    rr(ctx, -11 * u, -8 * u, 22 * u, 20 * u, 10 * u); ctx.fill();
    // Kapuze um den Kopf
    ctx.strokeStyle = pal.hood; ctx.lineWidth = 5 * u;
    ctx.beginPath(); ctx.arc(0, 0, 13 * u, Math.PI * 0.85, Math.PI * 0.15, true); ctx.stroke();
    // Augen
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath(); ctx.arc(-4.5 * u, 0, 2 * u, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(4.5 * u, 0, 2 * u, 0, 7); ctx.fill();
    // Lächeln
    ctx.strokeStyle = "#9a5b4a"; ctx.lineWidth = 1.6 * u; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, 4 * u, 4 * u, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function buildCharacterSet(pal) {
    const S = 120;
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
    // Sprung
    let jc = mkCanvas(S, S);
    drawCharacter(jc.getContext("2d"), S, pal, { legA: -0.5, legB: -0.9, armA: -1.4, armB: -1.2, lean: -0.05 });
    set.jump = jc;
    // Roll / Ducken
    let rc = mkCanvas(S, S);
    drawCharacter(rc.getContext("2d"), S, pal, { legA: 0.9, legB: -0.6, armA: -0.4, armB: 0.4, lean: 0.5, crouch: 1 });
    set.roll = rc;
    return set;
  }

  /* ---------------- Münze ---------------- */
  function buildCoinFrames() {
    const S = 48, N = 8, frames = [];
    for (let i = 0; i < N; i++) {
      const c = mkCanvas(S, S), ctx = c.getContext("2d");
      const phase = (i / N) * Math.PI * 2;
      const sx = Math.abs(Math.cos(phase)) * 0.9 + 0.1; // Rotation -> Breite
      ctx.translate(S / 2, S / 2);
      ctx.scale(sx, 1);
      const r = S * 0.42;
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      g.addColorStop(0, "#fff6c2"); g.addColorStop(0.5, "#ffd23f"); g.addColorStop(1, "#c98a00");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#b97d00"; ctx.stroke();
      // Stern
      ctx.fillStyle = "rgba(255,255,255,0.55)";
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
  // Zug: lange Box mit Fenstern, Perspektive wird beim Zeichnen skaliert.
  function buildTrain(color) {
    const W = 160, H = 260, c = mkCanvas(W, H), ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, color.a); g.addColorStop(0.5, color.b); g.addColorStop(1, color.a);
    ctx.fillStyle = g;
    rr(ctx, 8, 8, W - 16, H - 16, 22); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 4; ctx.stroke();
    // Front-Scheibe
    ctx.fillStyle = "#bfe9ff";
    rr(ctx, 26, 22, W - 52, 54, 16); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    rr(ctx, 30, 26, (W - 52) / 2, 46, 12); ctx.fill();
    // Seitenfenster
    ctx.fillStyle = "#7ecbff";
    for (let y = 96; y < H - 40; y += 56) {
      rr(ctx, 30, y, W - 60, 34, 8); ctx.fill();
    }
    // Lichter
    ctx.fillStyle = "#fff3b0";
    ctx.beginPath(); ctx.arc(34, H - 26, 9, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 34, H - 26, 9, 0, 7); ctx.fill();
    return c;
  }

  // Niedrige Barriere (drüber springen)
  function buildLowBarrier() {
    const W = 150, H = 70, c = mkCanvas(W, H), ctx = c.getContext("2d");
    ctx.fillStyle = "#ff8c42";
    rr(ctx, 6, 18, W - 12, H - 26, 8); ctx.fill();
    ctx.fillStyle = "#142d3c";
    for (let x = 14; x < W - 18; x += 34) {
      ctx.save(); ctx.translate(x, 18);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 0); ctx.lineTo(10, H - 8); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#ffd23f";
    rr(ctx, 6, 10, W - 12, 12, 6); ctx.fill();
    return c;
  }

  // Hohe Barriere / Schranke (drunter durch rollen)
  function buildHighBarrier() {
    const W = 150, H = 150, c = mkCanvas(W, H), ctx = c.getContext("2d");
    // Pfosten
    ctx.fillStyle = "#3a4a5a";
    rr(ctx, 8, 20, 16, H - 20, 5); ctx.fill();
    rr(ctx, W - 24, 20, 16, H - 20, 5); ctx.fill();
    // Balken oben (gestreift)
    for (let x = 8; x < W - 8; x += 28) {
      ctx.fillStyle = ((x / 28) | 0) % 2 ? "#ff4b4b" : "#fff";
      rr(ctx, x, 14, 28, 26, 4); ctx.fill();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 2;
    rr(ctx, 6, 12, W - 12, 30, 6); ctx.stroke();
    return c;
  }

  /* ---------------- Power-Ups ---------------- */
  function powerIcon(kind) {
    const S = 44, c = mkCanvas(S, S), ctx = c.getContext("2d");
    ctx.translate(S / 2, S / 2);
    const bg = {
      magnet: ["#ff6b6b", "#c20000"], x2: ["#9b7bff", "#4b2ec2"],
      jet: ["#5bd6ff", "#1b7bbf"], board: ["#5ef09a", "#1b9a4a"],
    }[kind];
    const g = ctx.createLinearGradient(0, -S / 2, 0, S / 2);
    g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, S * 0.42, 0, 7); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (kind === "magnet") {
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, -2, 10, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-10, 8); ctx.moveTo(10, -2); ctx.lineTo(10, 8); ctx.stroke();
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(-12, 6, 6, 6); ctx.fillRect(6, 6, 6, 6);
    } else if (kind === "x2") {
      ctx.font = "900 22px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("2×", 0, 1);
    } else if (kind === "jet") {
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 6); ctx.lineTo(0, 2); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(4, 14); ctx.lineTo(0, 10); ctx.lineTo(-4, 14); ctx.closePath(); ctx.fill();
    } else if (kind === "board") {
      ctx.fillStyle = "#142d3c";
      rr(ctx, -14, 2, 28, 8, 4); ctx.fill();
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath(); ctx.arc(-7, 12, 3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(7, 12, 3, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff";
      rr(ctx, -10, -10, 20, 12, 4); ctx.fill();
    }
    return c;
  }

  /* ---------------- Hintergrund: Skyline ---------------- */
  function buildSkyline(w, h, seed) {
    const c = mkCanvas(w, h), ctx = c.getContext("2d");
    let s = seed || 1;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const tones = ["#1f4356", "#27566b", "#173648"];
    let x = 0;
    while (x < w) {
      const bw = 40 + rnd() * 70;
      const bh = h * (0.35 + rnd() * 0.6);
      ctx.fillStyle = tones[(rnd() * tones.length) | 0];
      ctx.fillRect(x, h - bh, bw, bh);
      // Fenster
      ctx.fillStyle = "rgba(255,210,63,0.5)";
      for (let wy = h - bh + 10; wy < h - 10; wy += 16) {
        for (let wx = x + 6; wx < x + bw - 8; wx += 14) {
          if (rnd() > 0.45) ctx.fillRect(wx, wy, 6, 8);
        }
      }
      x += bw + 4;
    }
    return c;
  }

  /* ---------------- Wolke ---------------- */
  function buildCloud() {
    const W = 160, H = 80, c = mkCanvas(W, H), ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    [[50, 50, 34], [90, 44, 40], [128, 52, 28], [70, 56, 30]].forEach(([x, y, r]) => {
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
      buildTrain({ a: "#e54b5e", b: "#ff7a8a" }),
      buildTrain({ a: "#2e8bd6", b: "#5cb6ff" }),
      buildTrain({ a: "#f0a93a", b: "#ffce6e" }),
      buildTrain({ a: "#5a4bd6", b: "#8a7aff" }),
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
