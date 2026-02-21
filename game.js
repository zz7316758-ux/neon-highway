(() => {
  // ---------- DOM ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const uiScore = document.getElementById("score");
  const uiBest = document.getElementById("best");
  const uiCoins = document.getElementById("coins");
  const uiSpeed = document.getElementById("speed");
  const uiP2 = document.getElementById("p2score");

  const overlay = document.getElementById("overlay");
  const gameover = document.getElementById("gameover");
  const finalScore = document.getElementById("finalScore");
  const earnedCoinsEl = document.getElementById("earnedCoins");
  const btnRestart = document.getElementById("btnRestart");
  const btnStartSingle = document.getElementById("btnStartSingle");
  const btnStartMulti = document.getElementById("btnStartMulti");

  const settingsOverlay = document.getElementById("settings");
  const btnSettings = document.getElementById("btnSettings");
  const btnCloseSettings = document.getElementById("btnCloseSettings");
  const btnSaveSettings = document.getElementById("btnSaveSettings");

  const setControls = document.getElementById("setControls");
  const setDifficulty = document.getElementById("setDifficulty");
  const setSteer = document.getElementById("setSteer");
  const setSteerVal = document.getElementById("setSteerVal");
  const setScoreRate = document.getElementById("setScoreRate");
  const setScoreRateVal = document.getElementById("setScoreRateVal");
  const setTrafficStart = document.getElementById("setTrafficStart");
  const setTrafficStartVal = document.getElementById("setTrafficStartVal");
  const setScale = document.getElementById("setScale");
  const setScaleVal = document.getElementById("setScaleVal");

  const shopOverlay = document.getElementById("shop");
  const btnShop = document.getElementById("btnShop");
  const btnCloseShop = document.getElementById("btnCloseShop");
  const shopList = document.getElementById("shopList");

  const mpOverlay = document.getElementById("mp");
  const btnCloseMp = document.getElementById("btnCloseMp");
  const btnHost = document.getElementById("btnHost");
  const btnJoin = document.getElementById("btnJoin");
  const btnFinalize = document.getElementById("btnFinalize");
  const offerBox = document.getElementById("offerBox");
  const offerInBox = document.getElementById("offerInBox");
  const answerBox = document.getElementById("answerBox");
  const answerInBox = document.getElementById("answerInBox");
  const mpStatus = document.getElementById("mpStatus");

  const W = canvas.width;
  const H = canvas.height;

  // ---------- HELPERS ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function rr(x, y, w, h, r) {
    const r2 = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r2, y);
    ctx.arcTo(x + w, y, x + w, y + h, r2);
    ctx.arcTo(x + w, y + h, x, y + h, r2);
    ctx.arcTo(x, y + h, x, y, r2);
    ctx.arcTo(x, y, x + w, y, r2);
    ctx.closePath();
  }

  // deterministic RNG for multiplayer shared traffic
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- STORAGE ----------
  const BEST_KEY = "neon_best";
  const COINS_KEY = "neon_coins";
  const SETTINGS_KEY = "neon_settings";
  const SHOP_KEY = "neon_shop_state";

  const defaultSettings = {
    controls: "keyboard",   // keyboard | mouse
    difficulty: "normal",   // normal | hard
    steerSmooth: 28,
    scoreRate: 0.30,
    trafficStart: 105,
    canvasScale: 1.0,
  };

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      return { ...defaultSettings, ...(s || {}) };
    } catch {
      return { ...defaultSettings };
    }
  }
  let settings = loadSettings();

  function applyCanvasScale() {
    const scale = settings.canvasScale ?? 1.0;
    canvas.style.width = `min(${520 * scale}px, 100%)`;
  }

  // ---------- SHOP CONTENT ----------
  const cars = [
    { id: "classic", name: "Classic Violet", price: 0,   color: "#7c5cff" },
    { id: "aqua",    name: "Aqua Rush",      price: 120, color: "#29d3ff" },
    { id: "neon",    name: "Neon Pink",      price: 220, color: "#ff3d88" },
    { id: "gold",    name: "Gold Runner",    price: 380, color: "#ffcc33" },
    { id: "mint",    name: "Mint Glide",     price: 520, color: "#34f5c5" },
    { id: "ruby",    name: "Ruby Night",     price: 700, color: "#ff2b5a" },
  ];

  const themes = [
    {
      id: "neon", name: "Neon Default", price: 0,
      bgTop: "#0c0d26", bgBottom: "#040410", road: "#07071a",
      dash: "#e9e9ff22", leftNeon: "#7c5cff55", rightNeon: "#29d3ff55"
    },
    {
      id: "sunset", name: "Sunset Drive", price: 250,
      bgTop: "#2b0f2a", bgBottom: "#080310", road: "#12081a",
      dash: "#ffd0a622", leftNeon: "#ff7a1855", rightNeon: "#ff3d8855"
    },
    {
      id: "ice", name: "Ice Circuit", price: 420,
      bgTop: "#0b2030", bgBottom: "#030811", road: "#061a2a",
      dash: "#bfe6ff22", leftNeon: "#72e6ff55", rightNeon: "#a0b7ff55"
    },
    {
      id: "toxic", name: "Toxic Grid", price: 600,
      bgTop: "#071a0f", bgBottom: "#02060a", road: "#04140a",
      dash: "#c8ff6222", leftNeon: "#b6ff2f55", rightNeon: "#29d3ff55"
    },
  ];

  function loadShopState() {
    try {
      const st = JSON.parse(localStorage.getItem(SHOP_KEY) || "null");
      return st || {
        ownedCars: { classic: true },
        equippedCar: "classic",
        ownedThemes: { neon: true },
        equippedTheme: "neon"
      };
    } catch {
      return {
        ownedCars: { classic: true },
        equippedCar: "classic",
        ownedThemes: { neon: true },
        equippedTheme: "neon"
      };
    }
  }
  let shopState = loadShopState();

  function saveShopState() { localStorage.setItem(SHOP_KEY, JSON.stringify(shopState)); }
  function currentCar() {
    const id = shopState.equippedCar || "classic";
    return cars.find(c => c.id === id) || cars[0];
  }
  function currentTheme() {
    const id = shopState.equippedTheme || "neon";
    return themes.find(t => t.id === id) || themes[0];
  }

  // ---------- STATS ----------
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let coins = Number(localStorage.getItem(COINS_KEY) || 0);
  uiBest.textContent = String(best);
  uiCoins.textContent = String(coins);
  uiP2.textContent = "-";

  // ---------- DIFFICULTY ----------
  function difficultyConfig() {
    if (settings.difficulty === "hard") {
      return { lanes: 6, startSpeed: 1.5, coinMult: 1.6 };
    }
    return { lanes: 4, startSpeed: 1.0, coinMult: 1.0 };
  }

  // ---------- ROAD/LANES (computed) ----------
  let laneCount = 4;
  let lanePadding = 54;
  let roadLeft = 54;
  let roadRight = W - 54;
  let roadWidth = roadRight - roadLeft;
  let laneWidth = roadWidth / laneCount;

  function recomputeRoad() {
    const d = difficultyConfig();
    laneCount = d.lanes;

    // padding slightly adjusts with more lanes so it still looks nice
    lanePadding = (laneCount >= 6) ? 46 : 54;

    roadLeft = lanePadding;
    roadRight = W - lanePadding;
    roadWidth = roadRight - roadLeft;
    laneWidth = roadWidth / laneCount;
  }

  function laneCenterX(lane) { return roadLeft + laneWidth * (lane + 0.5); }
  function clampToRoadX(x) {
    const minX = roadLeft + laneWidth * 0.5;
    const maxX = roadRight - laneWidth * 0.5;
    return clamp(x, minX, maxX);
  }

  // ---------- PLAYERS ----------
  const p1 = {
    id: 1,
    w: 40, h: 98,
    lane: 1,
    x: 0,
    y: H - 150,
    targetX: 0,
    smooth: settings.steerSmooth,
    color: currentCar().color,
    score: 0,
    alive: true,
    input: { leftHeld:false, rightHeld:false, stepCooldown:0 },
    mouseX: null
  };

  const p2 = {
    id: 2,
    w: 40, h: 98,
    lane: 2,
    x: 0,
    y: H - 260,      // slightly above so 2 cars are visible and not overlapping
    targetX: 0,
    smooth: settings.steerSmooth,
    color: "#29d3ff",
    score: 0,
    alive: true,
    input: { leftHeld:false, rightHeld:false, stepCooldown:0 },
    mouseX: null
  };

  function applyCarSizes() {
    p1.w = laneWidth * 0.62;
    p2.w = laneWidth * 0.62;
    p1.h = 98;
    p2.h = 98;
  }

  // ---------- GAME STATE ----------
  let running = false;
  let paused = false;
  let dead = false;

  let t = 0;
  let speedMul = 1.0;

  // traffic
  let spawnTimer = 0;
  let spawnEvery = settings.trafficStart;
  let traffic = [];

  // RNG (for traffic)
  let sharedSeed = null;
  let rng = Math.random; // replaced when multiplayer starts

  // ---------- MULTIPLAYER (WebRTC copy/paste) ----------
  let mpMode = "sp"; // sp | host | join | connected-host | connected-join
  let pc = null;
  let dc = null;

  const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  function setMpStatus(txt) { mpStatus.textContent = txt; }

  function mpOpen(){ mpOverlay.classList.add("show"); }
  function mpClose(){ mpOverlay.classList.remove("show"); }

  function mpSend(obj) {
    if (dc && dc.readyState === "open") dc.send(JSON.stringify(obj));
  }

  function waitIceComplete(peer) {
    return new Promise((resolve) => {
      if (peer.iceGatheringState === "complete") return resolve();
      const check = () => {
        if (peer.iceGatheringState === "complete") {
          peer.removeEventListener("icegatheringstatechange", check);
          resolve();
        }
      };
      peer.addEventListener("icegatheringstatechange", check);
    });
  }

  function mpCleanup() {
    try { if (dc) dc.close(); } catch {}
    try { if (pc) pc.close(); } catch {}
    dc = null;
    pc = null;
    mpMode = "sp";
    sharedSeed = null;
    rng = Math.random;
    uiP2.textContent = "-";
    p2.alive = false;
  }

  function onMpMessage(ev) {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }

    if (msg.type === "start") {
      // host sends seed + sync t
      sharedSeed = msg.seed >>> 0;
      rng = mulberry32(sharedSeed);
      resetGame(true);
      startGameInternal();
      setMpStatus("Connected! Game started.");
      return;
    }

    if (msg.type === "p2") {
      // opponent state update
      if (typeof msg.score === "number") {
        uiP2.textContent = String(msg.score);
        p2.score = msg.score;
      }
      if (typeof msg.x === "number") {
        p2.targetX = clampToRoadX(msg.x);
      }
      if (typeof msg.alive === "boolean") {
        p2.alive = msg.alive;
      }
      return;
    }

    if (msg.type === "sync") {
      // soft sync time
      if (typeof msg.t === "number") {
        const dt = msg.t - t;
        // only adjust if drift is bigger
        if (Math.abs(dt) > 12) t += Math.sign(dt) * 6;
      }
      return;
    }
  }

  // ---------- RESET/START/END ----------
  function resetGame(isMultiplayer) {
    recomputeRoad();
    applyCarSizes();

    t = 0;
    p1.score = 0;
    p2.score = 0;

    const d = difficultyConfig();
    speedMul = d.startSpeed;

    spawnTimer = 0;
    spawnEvery = settings.trafficStart;
    traffic = [];

    dead = false;
    paused = false;

    p1.color = currentCar().color;
    p1.smooth = settings.steerSmooth;

    // lanes default positions
    p1.lane = Math.min(1, laneCount - 1);
    p1.x = laneCenterX(p1.lane);
    p1.targetX = p1.x;
    p1.alive = true;

    p2.lane = Math.min(2, laneCount - 1);
    p2.x = laneCenterX(p2.lane);
    p2.targetX = p2.x;

    // only show p2 if multiplayer connected/starting
    p2.alive = !!isMultiplayer;

    p1.input.leftHeld = false;
    p1.input.rightHeld = false;
    p1.input.stepCooldown = 0;

    uiScore.textContent = "0";
    uiSpeed.textContent = speedMul.toFixed(1) + "x";
    if (!isMultiplayer) uiP2.textContent = "-";
  }

  function startGameInternal() {
    running = true;
    overlay.classList.remove("show");
    gameover.classList.remove("show");
  }

  function startSingle() {
    mpCleanup();
    resetGame(false);
    startGameInternal();
  }

  function endGame() {
    dead = true;
    running = false;

    const final = Math.floor(p1.score);
    finalScore.textContent = String(final);

    const d = difficultyConfig();

// control-based coin multiplier
const controlCoinMult = (settings.controls === "mouse") ? 0.5 : 1.25;

// score milestone multiplier
const scoreBonusMult = (final >= 10000) ? 1.75 : 1.0;

// final coins
const earned = Math.max(
  1,
  Math.floor((final / 40) * d.coinMult * controlCoinMult * scoreBonusMult)
);

coins += earned;
localStorage.setItem(COINS_KEY, String(coins));
uiCoins.textContent = String(coins);
earnedCoinsEl.textContent = String(earned);

    if (final > best) {
      best = final;
      localStorage.setItem(BEST_KEY, String(best));
      uiBest.textContent = String(best);
    }

    gameover.classList.add("show");

    // in multiplayer, tell other side you died
    if (mpMode.startsWith("connected")) {
      mpSend({ type:"p2", alive:false, score: p1.score, x: p1.x });
    }
  }

  function togglePause() {
    if (dead) return;
    paused = !paused;
  }

  // ---------- TRAFFIC (deterministic when rng is seeded) ----------
  function rand(a, b) { return a + (rng() * (b - a)); }
  function randi(a, bExclusive) { return Math.floor(rand(a, bExclusive)); }

  function spawnCar() {
    let lane = randi(0, laneCount);
    const tooClose = traffic.some(c => c.lane === lane && c.y < 220);
    if (tooClose) lane = (lane + 1) % laneCount;

    const carW = laneWidth * rand(0.56, 0.72);
    const carH = rand(86, 120);

    traffic.push({
      lane,
      x: laneCenterX(lane),
      y: -carH - 20,
      w: carW,
      h: carH,
      vy: rand(6.8, 8.6) * speedMul,
      color: rng() < 0.5 ? "#29d3ff" : "#ff3d88"
    });
  }

  function rectsOverlap(a, b) {
    return (
      a.x - a.w/2 < b.x + b.w/2 &&
      a.x + a.w/2 > b.x - b.w/2 &&
      a.y - a.h/2 < b.y + b.h/2 &&
      a.y + a.h/2 > b.y - b.h/2
    );
  }

  // ---------- DRAW ----------
  function drawBackground() {
    const th = currentTheme();

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.bgTop);
    g.addColorStop(1, th.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = th.road;
    ctx.fillRect(roadLeft, 0, roadWidth, H);

    const dashSpeed = 9.5 * speedMul;
    const dashLen = 36;
    const gap = 22;
    const offset = (t * dashSpeed) % (dashLen + gap);

    ctx.save();
    ctx.lineWidth = 5;
    ctx.setLineDash([dashLen, gap]);
    ctx.lineDashOffset = -offset;

    for (let i = 1; i < laneCount; i++) {
      const x = roadLeft + laneWidth * i;
      ctx.strokeStyle = th.dash;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = th.leftNeon;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(roadLeft, 0); ctx.lineTo(roadLeft, H); ctx.stroke();
    ctx.strokeStyle = th.rightNeon;
    ctx.beginPath(); ctx.moveTo(roadRight, 0); ctx.lineTo(roadRight, H); ctx.stroke();
    ctx.restore();
  }

  function drawCar(x, y, w, h, color) {
    ctx.save();
    ctx.translate(x, y);

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = color;
    rr(-w/2 - 10, -h/2 - 10, w + 20, h + 20, 22);
    ctx.fill();

    ctx.globalAlpha = 1;
    const body = ctx.createLinearGradient(0, -h/2, 0, h/2);
    body.addColorStop(0, "#1b1c3a");
    body.addColorStop(1, "#0b0b18");
    ctx.fillStyle = body;
    rr(-w/2, -h/2, w, h, 18);
    ctx.fill();

    ctx.fillStyle = color + "cc";
    rr(-w*0.12, -h/2 + 10, w*0.24, h - 20, 12);
    ctx.fill();

    ctx.fillStyle = "#e9e9ff22";
    rr(-w*0.34, -h*0.22, w*0.68, h*0.42, 14);
    ctx.fill();

    ctx.restore();
  }

  // ---------- CONTROLS ----------
  function handleKeyboardSteering(player) {
    const inp = player.input;
    if (inp.stepCooldown > 0) { inp.stepCooldown--; return; }
    if (inp.leftHeld && inp.rightHeld) return;

    if (inp.leftHeld && player.lane > 0) {
      player.lane--;
      player.targetX = laneCenterX(player.lane);
      inp.stepCooldown = 9;
    } else if (inp.rightHeld && player.lane < laneCount - 1) {
      player.lane++;
      player.targetX = laneCenterX(player.lane);
      inp.stepCooldown = 9;
    }
  }

  function handleMouseSteering(player) {
    if (player.mouseX == null) return;
    player.targetX = clampToRoadX(player.mouseX);
  }

  // ---------- UPDATE LOOP ----------
  function update() {
    if (!running || paused) return;

    t++;

    // speed grows from base (difficulty startSpeed)
    const baseStart = difficultyConfig().startSpeed;
    const growth = (t / 2400);
    speedMul = clamp(baseStart + growth, baseStart, 3.0);

    // traffic ramp (mouse mode = harder)
let targetSpawn = clamp(
  settings.trafficStart - (speedMul - 1) * 18,
  22,
  settings.trafficStart
);

// If mouse follow is enabled, increase difficulty:
// - smaller spawnEvery => more cars
// - more chance of extra spawns
const mouseHard = (settings.controls === "mouse");
if (mouseHard) {
  targetSpawn = Math.max(14, targetSpawn * 0.65); // ~35% more traffic (and can go even lower)
}

spawnEvery += (targetSpawn - spawnEvery) * 0.03; // reacts faster to difficulty changes

spawnTimer++;
if (spawnTimer >= spawnEvery) {
  spawnTimer = 0;

  spawnCar();

  // extra spawns
  const p1Extra = mouseHard ? 0.28 : 0.10;
  const p2Extra = mouseHard ? 0.40 : 0.14;

  if (t > 450 && rng() < p1Extra) spawnCar();
  if (t > 900 && rng() < p2Extra) spawnCar();
}

  // control mode
if (settings.controls === "keyboard") {
  handleKeyboardSteering(p1);

  // smooth lane movement
  p1.smooth = settings.steerSmooth;
  p1.x += (p1.targetX - p1.x) / p1.smooth;

} else {
  // MOUSE FOLLOW = instant tracking (feels 1:1 with your mouse)
  if (p1.mouseX != null) {
    const mx = clampToRoadX(p1.mouseX);
    p1.x = mx;
    p1.targetX = mx; // keep consistent
  }
}

    // opponent smoothing (always smooth)
    if (p2.alive) {
      p2.smooth = settings.steerSmooth + 4;
      p2.x += (p2.targetX - p2.x) / p2.smooth;
    }

    // traffic move
    const baseVy = 9.3 * speedMul;
    for (const c of traffic) {
      c.vy = clamp(c.vy, baseVy * 0.85, baseVy * 1.25);
      c.y += c.vy;
    }
    traffic = traffic.filter(c => c.y < H + c.h + 40);

    // score
    const effectiveScoreRate = (settings.controls === "mouse") ? 0.60 : settings.scoreRate;

p1.score += effectiveScoreRate * speedMul;
uiScore.textContent = String(Math.floor(p1.score));
uiSpeed.textContent = speedMul.toFixed(1) + "x";

    // collisions (only p1 ends your game)
    const pRect = { x: p1.x, y: p1.y, w: p1.w, h: p1.h };
    for (const c of traffic) {
      const cRect = { x: c.x, y: c.y, w: c.w, h: c.h };
      if (rectsOverlap(pRect, cRect)) {
        endGame();
        break;
      }
    }

    // multiplayer sends
    if (mpMode.startsWith("connected") && (t % 6) === 0) {
      mpSend({ type:"p2", score: Math.floor(p1.score), x: p1.x, alive: !dead });
    }
    if (mpMode === "connected-host" && (t % 60) === 0) {
      mpSend({ type:"sync", t });
    }
  }

  function render() {
    drawBackground();
    for (const c of traffic) drawCar(c.x, c.y, c.w, c.h, c.color);

    // draw opponent first so you are “on top”
    if (p2.alive) drawCar(p2.x, p2.y, p2.w, p2.h, p2.color);
    drawCar(p1.x, p1.y, p1.w, p1.h, p1.color);

    if (paused && !dead) {
      ctx.save();
      ctx.fillStyle = "#00000088";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#e9e9ff";
      ctx.font = "800 44px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", W/2, H/2);
      ctx.font = "500 16px system-ui, sans-serif";
      ctx.fillStyle = "#cfd0ff";
      ctx.fillText("SPACE to resume", W/2, H/2 + 34);
      ctx.restore();
    }
  }

  function loop() { update(); render(); requestAnimationFrame(loop); }

  // ---------- SHOP ----------
  function renderShop() {
    shopList.innerHTML = "";
    uiCoins.textContent = String(coins);

    const s1 = document.createElement("div");
    s1.className = "shopSection";
    s1.textContent = "🚗 Cars";
    shopList.appendChild(s1);

    for (const c of cars) {
      const owned = !!shopState.ownedCars?.[c.id];
      const equipped = (shopState.equippedCar === c.id);

      const item = document.createElement("div");
      item.className = "shopItem";

      const title = document.createElement("h3");
      title.textContent = c.name;

      const sw = document.createElement("div");
      sw.className = "shopSwatch";
      sw.style.background = `linear-gradient(90deg, ${c.color}66, ${c.color}cc)`;

      const meta = document.createElement("div");
      meta.className = "shopMeta";
      meta.innerHTML = `<span>Price: <b>${c.price}</b></span><span>${owned ? "Owned" : "Locked"}</span>`;

      const btn = document.createElement("button");
      btn.className = "miniBtn";

      if (c.price === 0) {
        btn.textContent = equipped ? "Equipped" : "Equip";
        btn.disabled = equipped;
        btn.onclick = () => {
          shopState.equippedCar = c.id;
          saveShopState();
          p1.color = currentCar().color;
          renderShop();
        };
      } else if (!owned) {
        btn.textContent = coins >= c.price ? `Buy (${c.price})` : `Need ${c.price}`;
        btn.disabled = coins < c.price;
        btn.onclick = () => {
          if (coins < c.price) return;
          coins -= c.price;
          shopState.ownedCars[c.id] = true;
          localStorage.setItem(COINS_KEY, String(coins));
          saveShopState();
          renderShop();
        };
      } else {
        btn.textContent = equipped ? "Equipped" : "Equip";
        btn.disabled = equipped;
        btn.onclick = () => {
          shopState.equippedCar = c.id;
          saveShopState();
          p1.color = currentCar().color;
          renderShop();
        };
      }

      item.appendChild(title);
      item.appendChild(sw);
      item.appendChild(meta);
      item.appendChild(btn);
      shopList.appendChild(item);
    }

    const s2 = document.createElement("div");
    s2.className = "shopSection";
    s2.textContent = "🗺️ Map Themes";
    shopList.appendChild(s2);

    for (const th of themes) {
      const owned = !!shopState.ownedThemes?.[th.id];
      const equipped = (shopState.equippedTheme === th.id);

      const item = document.createElement("div");
      item.className = "shopItem";

      const title = document.createElement("h3");
      title.textContent = th.name;

      const sw = document.createElement("div");
      sw.className = "shopSwatch";
      sw.style.background = `linear-gradient(90deg, ${th.bgTop}, ${th.bgBottom})`;

      const meta = document.createElement("div");
      meta.className = "shopMeta";
      meta.innerHTML = `<span>Price: <b>${th.price}</b></span><span>${owned ? "Owned" : "Locked"}</span>`;

      const btn = document.createElement("button");
      btn.className = "miniBtn";

      if (th.price === 0) {
        btn.textContent = equipped ? "Equipped" : "Equip";
        btn.disabled = equipped;
        btn.onclick = () => {
          shopState.equippedTheme = th.id;
          saveShopState();
          renderShop();
        };
      } else if (!owned) {
        btn.textContent = coins >= th.price ? `Buy (${th.price})` : `Need ${th.price}`;
        btn.disabled = coins < th.price;
        btn.onclick = () => {
          if (coins < th.price) return;
          coins -= th.price;
          shopState.ownedThemes[th.id] = true;
          localStorage.setItem(COINS_KEY, String(coins));
          saveShopState();
          renderShop();
        };
      } else {
        btn.textContent = equipped ? "Equipped" : "Equip";
        btn.disabled = equipped;
        btn.onclick = () => {
          shopState.equippedTheme = th.id;
          saveShopState();
          renderShop();
        };
      }

      item.appendChild(title);
      item.appendChild(sw);
      item.appendChild(meta);
      item.appendChild(btn);
      shopList.appendChild(item);
    }
  }

  // ---------- SETTINGS UI ----------
  function syncSettingsUI() {
    setControls.value = settings.controls;
    setDifficulty.value = settings.difficulty;

    setSteer.value = String(settings.steerSmooth);
    setSteerVal.textContent = String(settings.steerSmooth);

    setScoreRate.value = String(settings.scoreRate);
    setScoreRateVal.textContent = settings.scoreRate.toFixed(2);

    setTrafficStart.value = String(settings.trafficStart);
    setTrafficStartVal.textContent = String(settings.trafficStart);

    setScale.value = String(settings.canvasScale);
    setScaleVal.textContent = settings.canvasScale.toFixed(2);
  }

  function hookRange(inputEl, labelEl, fmt = (v)=>v) {
    inputEl.addEventListener("input", () => labelEl.textContent = fmt(Number(inputEl.value)));
  }
  hookRange(setSteer, setSteerVal, v => String(Math.round(v)));
  hookRange(setScoreRate, setScoreRateVal, v => v.toFixed(2));
  hookRange(setTrafficStart, setTrafficStartVal, v => String(Math.round(v)));
  hookRange(setScale, setScaleVal, v => v.toFixed(2));

  // ---------- OVERLAY HELPERS ----------
  function show(el){ el.classList.add("show"); }
  function hide(el){ el.classList.remove("show"); }
  function toggle(el){ el.classList.toggle("show"); }

  // ---------- SHOP TOGGLE ----------
  function shopIsOpen(){ return shopOverlay.classList.contains("show"); }
  function shopOpen(){ if (running && !paused) paused = true; renderShop(); show(shopOverlay); }
  function shopClose(){ hide(shopOverlay); }
  function shopToggle(){ shopIsOpen() ? shopClose() : shopOpen(); }

  // ---------- INPUTS ----------
  // keyboard for P1
  window.addEventListener("keydown", (e) => {
    if (settings.controls === "keyboard") {
      if (e.code === "ArrowLeft" || e.code === "KeyA") p1.input.leftHeld = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") p1.input.rightHeld = true;
    }

    if (e.code === "Space") {
      e.preventDefault();
      if (!running && !dead) return;
      togglePause();
    }
    if (e.code === "KeyR") {
      e.preventDefault();
      startSingle();
    }
    if (e.code === "Escape") {
      hide(settingsOverlay);
      hide(shopOverlay);
      hide(mpOverlay);
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") p1.input.leftHeld = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") p1.input.rightHeld = false;
  });

  // mouse follow (for P1)
  canvas.addEventListener("mousemove", (e) => {
    if (settings.controls !== "mouse") return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    p1.mouseX = x;
  });

  canvas.addEventListener("mouseleave", () => {
    if (settings.controls === "mouse") p1.mouseX = null;
  });

  // touch follow (also works with mouse mode)
  canvas.addEventListener("touchstart", (e) => {
    if (settings.controls !== "mouse") return;
    const t0 = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = (t0.clientX - rect.left) * (W / rect.width);
    p1.mouseX = x;
  }, { passive:true });

  canvas.addEventListener("touchmove", (e) => {
    if (settings.controls !== "mouse") return;
    const t0 = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = (t0.clientX - rect.left) * (W / rect.width);
    p1.mouseX = x;
  }, { passive:true });

  canvas.addEventListener("touchend", () => {
    if (settings.controls === "mouse") p1.mouseX = null;
  }, { passive:true });

  // ---------- BUTTONS ----------
  btnRestart.addEventListener("click", () => startSingle());

  btnStartSingle.addEventListener("click", () => startSingle());

  btnStartMulti.addEventListener("click", () => {
    if (running && !paused) paused = true;
    show(mpOverlay);
    setMpStatus("Not connected.");
    offerBox.value = "";
    offerInBox.value = "";
    answerBox.value = "";
    answerInBox.value = "";
  });

  btnSettings.addEventListener("click", () => {
    if (running && !paused) paused = true;
    syncSettingsUI();
    show(settingsOverlay);
  });
  btnCloseSettings.addEventListener("click", () => hide(settingsOverlay));
  settingsOverlay.addEventListener("click", (e) => { if (e.target === settingsOverlay) hide(settingsOverlay); });

  btnShop.addEventListener("click", () => shopToggle());
  btnCloseShop.addEventListener("click", () => shopClose());
  shopOverlay.addEventListener("click", (e) => { if (e.target === shopOverlay) shopClose(); });

  btnCloseMp.addEventListener("click", () => hide(mpOverlay));
  mpOverlay.addEventListener("click", (e) => { if (e.target === mpOverlay) hide(mpOverlay); });

  btnSaveSettings.addEventListener("click", () => {
    settings.controls = setControls.value;
    settings.difficulty = setDifficulty.value;
    settings.steerSmooth = Number(setSteer.value);
    settings.scoreRate = Number(setScoreRate.value);
    settings.trafficStart = Number(setTrafficStart.value);
    settings.canvasScale = Number(setScale.value);

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyCanvasScale();

    // apply road + sizes immediately (next reset will fully apply)
    recomputeRoad();
    applyCarSizes();

    hide(settingsOverlay);
  });

  // ---------- MULTIPLAYER FLOW ----------
  btnHost.addEventListener("click", async () => {
    mpCleanup();
    mpMode = "host";
    setMpStatus("Creating offer...");

    pc = new RTCPeerConnection(rtcConfig);
    dc = pc.createDataChannel("game");

    dc.onopen = () => {
      mpMode = "connected-host";
      setMpStatus("Connected as HOST. Click 'Finalize & Start' to start after you paste Answer.");
      // note: host starts only after finalize button for clarity
    };
    dc.onmessage = onMpMessage;

    const offer = await pc.createOffer({ offerToReceiveAudio:false, offerToReceiveVideo:false });
    await pc.setLocalDescription(offer);
    await waitIceComplete(pc);

    offerBox.value = JSON.stringify(pc.localDescription);
    setMpStatus("Offer ready. Send it to friend.");
  });

  btnJoin.addEventListener("click", async () => {
    mpCleanup();
    mpMode = "join";
    setMpStatus("Joining... paste offer then create answer.");

    const offerStr = offerInBox.value.trim();
    if (!offerStr) { setMpStatus("Paste Offer first."); return; }

    let offerDesc;
    try { offerDesc = JSON.parse(offerStr); } catch { setMpStatus("Offer is not valid JSON."); return; }

    pc = new RTCPeerConnection(rtcConfig);

    pc.ondatachannel = (e) => {
      dc = e.channel;
      dc.onmessage = onMpMessage;
      dc.onopen = () => {
        mpMode = "connected-join";
        setMpStatus("Connected as JOIN. Waiting for host to start...");
      };
    };

    await pc.setRemoteDescription(offerDesc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitIceComplete(pc);

    answerBox.value = JSON.stringify(pc.localDescription);
    setMpStatus("Answer ready. Send it back to host.");
  });

  btnFinalize.addEventListener("click", async () => {
    // HOST finalizes with Answer then starts game with shared seed
    if (!pc || mpMode !== "host") { setMpStatus("You must be Host."); return; }

    const ansStr = answerInBox.value.trim();
    if (!ansStr) { setMpStatus("Paste Answer first."); return; }

    let ansDesc;
    try { ansDesc = JSON.parse(ansStr); } catch { setMpStatus("Answer is not valid JSON."); return; }

    await pc.setRemoteDescription(ansDesc);

    // start multiplayer match with shared seed
    sharedSeed = (Math.random() * 2**32) >>> 0;
    rng = mulberry32(sharedSeed);

    // enable p2 locally
    p2.alive = true;

    resetGame(true);
    startGameInternal();

    // tell join to start with same seed
    mpSend({ type:"start", seed: sharedSeed });

    hide(mpOverlay);
    setMpStatus("Connected & started!");
  });

  // ---------- INIT ----------
  function init() {
    applyCanvasScale();

    shopState.ownedCars = shopState.ownedCars || { classic:true };
    shopState.ownedThemes = shopState.ownedThemes || { neon:true };
    shopState.equippedCar = shopState.equippedCar || "classic";
    shopState.equippedTheme = shopState.equippedTheme || "neon";
    saveShopState();

    uiScore.textContent = "0";
    uiBest.textContent = String(best);
    uiCoins.textContent = String(coins);
    uiSpeed.textContent = "1.0x";

    recomputeRoad();
    applyCarSizes();

    // initial positions
    resetGame(false);
    render();
    loop();
  }

  init();
})();