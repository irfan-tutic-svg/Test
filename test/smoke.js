/* Headless Smoke-Test: stubt DOM + Canvas und treibt das Spiel einige
   hundert Frames, um Laufzeitfehler (ReferenceError/TypeError) zu finden.
   Kein visueller Test — nur Stabilität der Logik. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// --- Canvas-2D-Kontext-Stub ---
function makeCtx() {
  const grad = { addColorStop() {} };
  const handler = {
    get(_t, prop) {
      if (prop === "createLinearGradient" || prop === "createRadialGradient" || prop === "createPattern") return () => grad;
      if (prop === "measureText") return () => ({ width: 0 });
      if (prop === "getImageData") return () => ({ data: [] });
      if (prop === "canvas") return makeCanvas(10, 10);
      // alle übrigen Properties: Setter/Getter erlauben, Methoden = no-op
      return typeof prop === "string" && /^[a-z]/.test(prop) ? (() => {}) : 0;
    },
    set() { return true; },
  };
  return new Proxy({}, handler);
}
function makeCanvas(w, h) {
  return {
    width: w || 300, height: h || 150,
    style: {},
    getContext: () => makeCtx(),
    toDataURL: () => "data:image/png;base64,",
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
    classList: clsList(),
  };
}
function clsList() {
  const s = new Set();
  return { add: (c) => s.add(c), remove: (c) => s.delete(c), toggle: (c, f) => (f ? s.add(c) : s.delete(c)), contains: (c) => s.has(c) };
}
function makeEl() {
  const children = [];
  const el = {
    style: {}, classList: clsList(), children, dataset: {},
    _html: "", _text: "",
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    set textContent(v) { this._text = v; }, get textContent() { return this._text; },
    set onclick(f) { this._onclick = f; }, get onclick() { return this._onclick; },
    get offsetWidth() { return 100; },
    addEventListener: () => {}, appendChild: (c) => children.push(c),
    getContext: () => makeCtx(), getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  return el;
}

const els = {};
const document = {
  getElementById: (id) => (els[id] || (els[id] = makeEl())),
  createElement: (t) => (t === "canvas" ? makeCanvas(300, 150) : makeEl()),
  addEventListener: () => {},
  readyState: "complete",
};

let rafCb = null;
const sandbox = {
  window: null,
  document,
  navigator: { userAgent: "node" },
  localStorage: (() => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => (m[k] = String(v)) }; })(),
  performance: { now: () => sandbox.__t },
  requestAnimationFrame: (cb) => { rafCb = cb; return 1; },
  AudioContext: function () { return { state: "running", currentTime: 0, resume() {}, sampleRate: 44100,
    createOscillator: () => ({ type: "", frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }),
    createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 }, connect() {} }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(10) }),
    createBufferSource: () => ({ buffer: null, connect() {}, start() {} }),
    destination: {} }; },
  setTimeout: (fn) => { try { fn(); } catch (e) { throw e; } return 0; },
  console,
  Math, Date, JSON, Array, Object,
  innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
  __t: 0,
};
const winListeners = {};
sandbox.addEventListener = (type, fn) => { (winListeners[type] || (winListeners[type] = [])).push(fn); };
document.addEventListener = (type, fn) => {};
sandbox.window = sandbox;
sandbox.webkitAudioContext = sandbox.AudioContext;
vm.createContext(sandbox);

for (const f of ["js/assets.js", "js/audio.js", "js/game.js"]) {
  const code = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  vm.runInContext(code, sandbox, { filename: f });
}

// init() läuft beim Laden (readyState complete). loop() hat sich via rAF registriert.
// Spiel starten:
els["btn-play"]._onclick();   // startGame -> Countdown (setTimeout sofort) -> mode=PLAY

function key(k) {
  (winListeners.keydown || []).forEach((fn) => fn({ key: k, preventDefault() {} }));
}

let frames = 0, errors = 0, restarts = 0;
sandbox.__t = 1000;
const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s"];
for (let i = 0; i < 1500; i++) {
  sandbox.__t += 16.7;
  // zufällige Eingaben zur Pfadabdeckung
  if (i % 7 === 0) key(keys[(Math.random() * keys.length) | 0]);
  // wenn Game Over: neu starten, um PLAY-Pfad weiter zu testen
  if (els["gameover"] && els["gameover"].classList.contains && !els["gameover"].classList.contains("hidden")) {
    try { els["btn-again"]._onclick(); restarts++; } catch (e) {}
  }
  if (!rafCb) break;
  const cb = rafCb; rafCb = null;
  try { cb(sandbox.__t); frames++; }
  catch (e) { errors++; console.error("Frame-Fehler:", e.message); console.error(e.stack); break; }
}
console.log("Neustarts:", restarts);

console.log("Frames gelaufen:", frames);
console.log("Fehler:", errors);
console.log("Smoke-Test:", errors === 0 && frames > 100 ? "BESTANDEN ✅" : "FEHLGESCHLAGEN ❌");
process.exit(errors === 0 && frames > 100 ? 0 : 1);
