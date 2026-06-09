# 🏃 Tunnel Dash

Ein vollständiger, auf dem Handy spielbarer **Endless Runner** im Stil von Subway Surfers –
aber mit **komplett eigenen, lizenzfreien Assets**. Kein fremdes Bildmaterial, kein
kopiertes Original: Alle Grafiken (Charaktere, Münzen, Züge, Hindernisse, Skyline) und
Soundeffekte werden zur Laufzeit **per Code generiert** (Canvas-2D bzw. WebAudio).
Damit sind sämtliche Inhalte original und frei von Lizenz-Risiken.

## ▶️ Spielen

Es ist **kein Build-Schritt** nötig – reines HTML5/JavaScript.

- **Auf dem Handy:** `index.html` über einen kleinen Webserver öffnen (siehe unten) und
  die Adresse im Handy-Browser aufrufen. „Zum Startbildschirm hinzufügen" macht daraus
  eine Vollbild-App.
- **Lokal testen:**
  ```bash
  python3 -m http.server 8080
  # dann im Browser:  http://localhost:8080
  ```
  (oder `npx serve`). Direktes Öffnen der Datei (`file://`) funktioniert meist auch.

## 🎮 Steuerung

| Aktion        | Handy (Touch)   | Tastatur (Desktop)        |
|---------------|-----------------|---------------------------|
| Spur wechseln | Wischen ← / →   | Pfeil ←/→ oder `A`/`D`    |
| Springen      | Wischen ↑ / Tipp| Pfeil ↑, `W` oder Leertaste |
| Rollen/Ducken | Wischen ↓       | Pfeil ↓ oder `S`          |
| Pause         | Button oben rechts | `P`                    |

## ✨ Features

- **Pseudo-3D-Strecke** mit perspektivisch zulaufenden Spuren und scrollenden Schwellen
- **3 Spuren**, Springen, Rollen/Ducken
- Hindernisse: niedrige Barrieren (drüber springen), Überhänge (drunter rollen), **Züge** (ausweichen)
- **Münzen** sammeln (inkl. Münzbögen über Hürden)
- **Power-Ups:**
  - 🧲 **Magnet** – zieht Münzen an
  - ✖️ **2×** – doppelte Punkte
  - 🚀 **Jetpack** – fliegen + unverwundbar + Münzregen
  - 🛹 **Hoverboard** – Schutzschild (rettet vor einem Crash)
- Steigende Geschwindigkeit / Schwierigkeit
- **Charakterauswahl** (3 selbst gezeichnete Figuren)
- HUD mit Punkten, Münzen und aktiven Power-Ups
- Menü, Countdown, Pause, Game-Over-Screen
- **Highscore & Münzen** werden lokal gespeichert (`localStorage`)
- Synthetisierte Soundeffekte (WebAudio)
- Optimiert für Touch, läuft aber auch am Desktop

## 📁 Struktur

```
index.html        Aufbau, HUD & Overlays
css/style.css     Komplettes UI-Styling (mobil zuerst)
js/assets.js      Prozedurale Grafiken (alle Sprites per Code)
js/audio.js       Synthetische Soundeffekte (WebAudio)
js/game.js        Spiellogik, Pseudo-3D-Rendering, Steuerung
test/smoke.js     Headless-Stabilitätstest (Node)
```

## 🧪 Test

Ein Headless-Smoke-Test treibt das Spiel ohne Browser mehrere hundert Frames inkl.
Eingaben durch und prüft auf Laufzeitfehler:

```bash
node test/smoke.js
```

## 📜 Lizenz & Assets

Alle Grafiken und Sounds sind **eigenständig im Code erzeugt** und damit frei von
Drittanbieter-Lizenzen. Das Spiel ist von Subway Surfers *inspiriert*, enthält aber
**keine** Original-Assets, -Marken oder -Charaktere.
