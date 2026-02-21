(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // HUD
  const uiScore = document.getElementById("score");
  const uiBest = document.getElementById("best");
  const uiCoins = document.getElementById("coins");
  const uiSpeed = document.getElementById("speed");

  // overlays/buttons
  const overlay = document.getElementById("overlay");
  const gameover = document.getElementById("gameover");
  const btnStart = document.getElementById("btnStart");
  const btnRestart = document.getElementById("btnRestart");
  const finalScore = document.getElementById("finalScore");
  const earnedCoinsEl = document.getElementById("earnedCoins");

  // settings
  const settingsOverlay = document.getElementById("settings");
  const btnSettings = document.getElementById("btnSettings");
  const btnCloseSettings = document.getElementById("btnCloseSettings");
  const btnSaveSettings = document.getElementById("btnSaveSettings");
  const setSteer = document.getElementById("setSteer");
  const setSteerVal = document.getElementById("setSteerVal");
  const setScoreRate = document.getElementById("setScoreRate");
  const setScoreRateVal = document.getElementById("setScoreRateVal");
  const setTrafficStart = document.getElementById("setTrafficStart");
  const setTrafficStartVal = document.getElementById("setTrafficStartVal");
  const setScale = document.getElementById("setScale");
  const setScaleVal = document.getElementById("setScaleVal");

  // shop
  const shopOverlay = document.getElementById("shop");
  const btnShop = document.getElementById("btnShop");
  const btnCloseShop = document.getElementById("btnCloseShop");
  const shopList = document.getElementById("shopList");

  const W = canvas.width, H = canvas.height;
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const rand = (a,b)=>a+Math.random()*(b-a);

  // rounded rect
  function rr(x, y, w, h, r) {
    const r2 = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x + r2, y);
    ctx.arcTo(x + w, y, x + w, y + h, r2);
    ctx.arcTo(x + w, y + h, x, y + h, r2);
    ctx.arcTo(x, y + h, x, y, r2);
    ctx.arcTo(x, y, x + w, y, r2);
    ctx.closePath();
  }

  // storage
  const BEST_KEY="neon_best";
  const COINS_KEY="neon_coins";
  const SETTINGS_KEY="neon_settings";
  const SHOP_KEY="neon_shop_state";

  const defaultSettings = {
    steerSmooth: 28,
    scoreRate: 0.30,
    trafficStart: 105,
    canvasScale: 1.0
  };

  function loadSettings(){
    try{
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      return { ...defaultSettings, ...(s||{}) };
    }catch{
      return { ...defaultSettings };
    }
  }
  let settings = loadSettings();

  function applyCanvasScale(){
    const scale = settings.canvasScale ?? 1.0;
    canvas.style.width = `min(${520*scale}px, 100%)`;
  }

  // shop data
  const cars = [
    { id:"classic", name:"Classic Violet", price:0,   color:"#7c5cff" },
    { id:"aqua",    name:"Aqua Rush",      price:120, color:"#29d3ff" },
    { id:"neon",    name:"Neon Pink",      price:220, color:"#ff3d88" },
    { id:"gold",    name:"Gold Runner",    price:380, color:"#ffcc33" },
    { id:"mint",    name:"Mint Glide",     price:520, color:"#34f5c5" },
    { id:"ruby",    name:"Ruby Night",     price:700, color:"#ff2b5a" },
  ];

  const themes = [
    { id:"neon",   name:"Neon Default", price:0,
      bgTop:"#0c0d26", bgBottom:"#040410", road:"#07071a",
      dash:"#e9e9ff22", leftNeon:"#7c5cff55", rightNeon:"#29d3ff55" },
    { id:"sunset", name:"Sunset Drive", price:250,
      bgTop:"#2b0f2a", bgBottom:"#080310", road:"#12081a",
      dash:"#ffd0a622", leftNeon:"#ff7a1855", rightNeon:"#ff3d8855" },
    { id:"ice",    name:"Ice Circuit", price:420,
      bgTop:"#0b2030", bgBottom:"#030811", road:"#061a2a",
      dash:"#bfe6ff22", leftNeon:"#72e6ff55", rightNeon:"#a0b7ff55" },
    { id:"toxic",  name:"Toxic Grid", price:600,
      bgTop:"#071a0f", bgBottom:"#02060a", road:"#04140a",
      dash:"#c8ff6222", leftNeon:"#b6ff2f55", rightNeon:"#29d3ff55" },
  ];

  function loadShopState(){
    try{
      const st = JSON.parse(localStorage.getItem(SHOP_KEY) || "null");
      return st || {
        ownedCars:{ classic:true },
        equippedCar:"classic",
        ownedThemes:{ neon:true },
        equippedTheme:"neon"
      };
    }catch{
      return {
        ownedCars:{ classic:true },
        equippedCar:"classic",
        ownedThemes:{ neon:true },
        equippedTheme:"neon"
      };
    }
  }
  let shopState = loadShopState();

  function saveShopState(){
    localStorage.setItem(SHOP_KEY, JSON.stringify(shopState));
  }
  function currentCar(){
    return cars.find(c=>c.id===shopState.equippedCar) || cars[0];
  }
  function currentTheme(){
    return themes.find(t=>t.id===shopState.equippedTheme) || themes[0];
  }

  // stats
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let coins = Number(localStorage.getItem(COINS_KEY) || 0);

  uiBest.textContent = String(best);
  uiCoins.textContent = String(coins);

  // game state
  let running=false, paused=false, dead=false;

  // lanes
  const laneCount=4;
  const lanePadding=54;
  const roadLeft=lanePadding;
  const roadRight=W-lanePadding;
  const roadWidth=roadRight-roadLeft;
  const laneWidth=roadWidth/laneCount;
  const laneCenterX=(lane)=>roadLeft+laneWidth*(lane+0.5);

  const player = {
    w: laneWidth*0.62,
    h: 98,
    lane: 1,
    x: laneCenterX(1),
    y: H-150,
    targetX: laneCenterX(1),
    smooth: settings.steerSmooth,
    color: currentCar().color
  };

  let t=0, score=0, speedMul=1.0;
  let spawnTimer=0, spawnEvery=settings.trafficStart;
  let traffic=[];

  // HOLD input (fix freezing)
  const input = { leftHeld:false, rightHeld:false, stepCooldown:0 };

  function resetGame(){
    t=0; score=0; speedMul=1.0;
    spawnTimer=0; spawnEvery=settings.trafficStart;
    traffic=[];
    dead=false; paused=false;

    player.lane=1;
    player.x=laneCenterX(player.lane);
    player.targetX=player.x;
    player.smooth=settings.steerSmooth;
    player.color=currentCar().color;

    input.leftHeld=false;
    input.rightHeld=false;
    input.stepCooldown=0;

    uiScore.textContent="0";
    uiSpeed.textContent="1.0x";
  }

  function startGame(){
    resetGame();
    running=true;
    overlay.classList.remove("show");
    gameover.classList.remove("show");
  }

  function endGame(){
    dead=true;
    running=false;

    const final=Math.floor(score);
    finalScore.textContent=String(final);

    const earned=Math.max(1, Math.floor(final/40));
    coins += earned;
    localStorage.setItem(COINS_KEY, String(coins));
    uiCoins.textContent=String(coins);
    earnedCoinsEl.textContent=String(earned);

    if(final>best){
      best=final;
      localStorage.setItem(BEST_KEY, String(best));
      uiBest.textContent=String(best);
    }

    gameover.classList.add("show");
  }

  function togglePause(){ if(!dead) paused=!paused; }

  function spawnCar(){
    let lane=Math.floor(rand(0,laneCount));
    const tooClose=traffic.some(c=>c.lane===lane && c.y<220);
    if(tooClose) lane=(lane+1)%laneCount;

    const carW=laneWidth*rand(0.56,0.72);
    const carH=rand(86,120);

    traffic.push({
      lane,
      x: laneCenterX(lane),
      y: -carH-20,
      w: carW, h: carH,
      vy: rand(6.8, 8.6)*speedMul,
      color: Math.random()<0.5 ? "#29d3ff" : "#ff3d88"
    });
  }

  function rectsOverlap(a,b){
    return (
      a.x-a.w/2 < b.x+b.w/2 &&
      a.x+a.w/2 > b.x-b.w/2 &&
      a.y-a.h/2 < b.y+b.h/2 &&
      a.y+a.h/2 > b.y-b.h/2
    );
  }

  function drawBackground(){
    const th=currentTheme();

    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, th.bgTop);
    g.addColorStop(1, th.bgBottom);
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);

    ctx.fillStyle=th.road;
    ctx.fillRect(roadLeft,0,roadWidth,H);

    const dashSpeed=9.5*speedMul;
    const dashLen=36, gap=22;
    const offset=(t*dashSpeed)%(dashLen+gap);

    ctx.save();
    ctx.lineWidth=5;
    ctx.setLineDash([dashLen,gap]);
    ctx.lineDashOffset=-offset;

    for(let i=1;i<laneCount;i++){
      const x=roadLeft+laneWidth*i;
      ctx.strokeStyle=th.dash;
      ctx.beginPath();
      ctx.moveTo(x,0);
      ctx.lineTo(x,H);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha=0.9;
    ctx.strokeStyle=th.leftNeon;
    ctx.lineWidth=7;
    ctx.beginPath(); ctx.moveTo(roadLeft,0); ctx.lineTo(roadLeft,H); ctx.stroke();
    ctx.strokeStyle=th.rightNeon;
    ctx.beginPath(); ctx.moveTo(roadRight,0); ctx.lineTo(roadRight,H); ctx.stroke();
    ctx.restore();
  }

  function drawCar(x,y,w,h,color){
    ctx.save();
    ctx.translate(x,y);

    ctx.globalAlpha=0.22;
    ctx.fillStyle=color;
    rr(-w/2-10,-h/2-10,w+20,h+20,22);
    ctx.fill();

    ctx.globalAlpha=1;
    const body=ctx.createLinearGradient(0,-h/2,0,h/2);
    body.addColorStop(0,"#1b1c3a");
    body.addColorStop(1,"#0b0b18");
    ctx.fillStyle=body;
    rr(-w/2,-h/2,w,h,18);
    ctx.fill();

    ctx.fillStyle=color+"cc";
    rr(-w*0.12,-h/2+10,w*0.24,h-20,12);
    ctx.fill();

    ctx.fillStyle="#e9e9ff22";
    rr(-w*0.34,-h*0.22,w*0.68,h*0.42,14);
    ctx.fill();

    ctx.restore();
  }

  function handleHeldSteering(){
    if(input.stepCooldown>0){ input.stepCooldown--; return; }
    if(input.leftHeld && input.rightHeld) return;

    if(input.leftHeld && player.lane>0){
      player.lane--;
      player.targetX=laneCenterX(player.lane);
      input.stepCooldown=9;
    }else if(input.rightHeld && player.lane<laneCount-1){
      player.lane++;
      player.targetX=laneCenterX(player.lane);
      input.stepCooldown=9;
    }
  }

  function update(){
    if(!running || paused) return;
    t++;

    speedMul=clamp(1+t/2400, 1, 3.0);

    // traffic ramp: start low then increase
    const targetSpawn=clamp(settings.trafficStart-(speedMul-1)*18, 22, settings.trafficStart);
    spawnEvery += (targetSpawn-spawnEvery)*0.02;

    spawnTimer++;
    if(spawnTimer>=spawnEvery){
      spawnTimer=0;
      spawnCar();
      if(t>900 && Math.random()<0.10) spawnCar();
      if(t>1800 && Math.random()<0.14) spawnCar();
    }

    handleHeldSteering();

    player.smooth=settings.steerSmooth;
    player.x += (player.targetX-player.x)/player.smooth;

    const baseVy=9.3*speedMul;
    for(const c of traffic){
      c.vy=clamp(c.vy, baseVy*0.85, baseVy*1.25);
      c.y += c.vy;
    }
    traffic = traffic.filter(c=>c.y < H + c.h + 40);

    score += settings.scoreRate*speedMul;
    uiScore.textContent=String(Math.floor(score));
    uiSpeed.textContent=speedMul.toFixed(1)+"x";

    const p={x:player.x,y:player.y,w:player.w,h:player.h};
    for(const c of traffic){
      const r={x:c.x,y:c.y,w:c.w,h:c.h};
      if(rectsOverlap(p,r)){ endGame(); break; }
    }
  }

  function render(){
    drawBackground();
    for(const c of traffic) drawCar(c.x,c.y,c.w,c.h,c.color);
    drawCar(player.x,player.y,player.w,player.h,player.color);

    if(paused && !dead){
      ctx.save();
      ctx.fillStyle="#00000088";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#e9e9ff";
      ctx.font="800 44px system-ui, sans-serif";
      ctx.textAlign="center";
      ctx.fillText("PAUSED", W/2, H/2);
      ctx.font="500 16px system-ui, sans-serif";
      ctx.fillStyle="#cfd0ff";
      ctx.fillText("SPACE to resume", W/2, H/2+34);
      ctx.restore();
    }
  }

  function loop(){ update(); render(); requestAnimationFrame(loop); }

  // ---------- SHOP ----------
  function renderShop(){
    shopList.innerHTML="";
    uiCoins.textContent=String(coins);

    const secCars=document.createElement("div");
    secCars.className="shopSection";
    secCars.textContent="🚗 Cars";
    shopList.appendChild(secCars);

    for(const c of cars){
      const owned=!!shopState.ownedCars?.[c.id];
      const equipped=(shopState.equippedCar===c.id);

      const item=document.createElement("div");
      item.className="shopItem";

      const title=document.createElement("h3");
      title.textContent=c.name;

      const sw=document.createElement("div");
      sw.className="shopSwatch";
      sw.style.background=`linear-gradient(90deg, ${c.color}66, ${c.color}cc)`;

      const meta=document.createElement("div");
      meta.className="shopMeta";
      meta.innerHTML=`<span>Price: <b>${c.price}</b></span><span>${owned?"Owned":"Locked"}</span>`;

      const btn=document.createElement("button");
      btn.className="miniBtn";

      if(c.price===0){
        btn.textContent=equipped?"Equipped":"Equip";
        btn.disabled=equipped;
        btn.onclick=()=>{
          shopState.equippedCar=c.id; saveShopState();
          player.color=currentCar().color;
          renderShop();
        };
      }else if(!owned){
        btn.textContent=coins>=c.price ? `Buy (${c.price})` : `Need ${c.price}`;
        btn.disabled=coins<c.price;
        btn.onclick=()=>{
          if(coins<c.price) return;
          coins-=c.price;
          shopState.ownedCars[c.id]=true;
          localStorage.setItem(COINS_KEY,String(coins));
          saveShopState();
          renderShop();
        };
      }else{
        btn.textContent=equipped?"Equipped":"Equip";
        btn.disabled=equipped;
        btn.onclick=()=>{
          shopState.equippedCar=c.id; saveShopState();
          player.color=currentCar().color;
          renderShop();
        };
      }

      item.appendChild(title);
      item.appendChild(sw);
      item.appendChild(meta);
      item.appendChild(btn);
      shopList.appendChild(item);
    }

    const secThemes=document.createElement("div");
    secThemes.className="shopSection";
    secThemes.textContent="🗺️ Map Themes";
    shopList.appendChild(secThemes);

    for(const th of themes){
      const owned=!!shopState.ownedThemes?.[th.id];
      const equipped=(shopState.equippedTheme===th.id);

      const item=document.createElement("div");
      item.className="shopItem";

      const title=document.createElement("h3");
      title.textContent=th.name;

      const sw=document.createElement("div");
      sw.className="shopSwatch";
      sw.style.background=`linear-gradient(90deg, ${th.bgTop}, ${th.bgBottom})`;

      const meta=document.createElement("div");
      meta.className="shopMeta";
      meta.innerHTML=`<span>Price: <b>${th.price}</b></span><span>${owned?"Owned":"Locked"}</span>`;

      const btn=document.createElement("button");
      btn.className="miniBtn";

      if(th.price===0){
        btn.textContent=equipped?"Equipped":"Equip";
        btn.disabled=equipped;
        btn.onclick=()=>{ shopState.equippedTheme=th.id; saveShopState(); renderShop(); };
      }else if(!owned){
        btn.textContent=coins>=th.price ? `Buy (${th.price})` : `Need ${th.price}`;
        btn.disabled=coins<th.price;
        btn.onclick=()=>{
          if(coins<th.price) return;
          coins-=th.price;
          shopState.ownedThemes[th.id]=true;
          localStorage.setItem(COINS_KEY,String(coins));
          saveShopState();
          renderShop();
        };
      }else{
        btn.textContent=equipped?"Equipped":"Equip";
        btn.disabled=equipped;
        btn.onclick=()=>{ shopState.equippedTheme=th.id; saveShopState(); renderShop(); };
      }

      item.appendChild(title);
      item.appendChild(sw);
      item.appendChild(meta);
      item.appendChild(btn);
      shopList.appendChild(item);
    }
  }

  const shopIsOpen=()=>shopOverlay.classList.contains("show");
  const shopOpen=()=>{
    if(running && !paused) paused=true;
    renderShop();
    shopOverlay.classList.add("show");
  };
  const shopClose=()=>shopOverlay.classList.remove("show");
  const shopToggle=()=> shopIsOpen()?shopClose():shopOpen();

  // ---------- SETTINGS UI ----------
  function syncSettingsUI(){
    setSteer.value=String(settings.steerSmooth);
    setSteerVal.textContent=String(settings.steerSmooth);

    setScoreRate.value=String(settings.scoreRate);
    setScoreRateVal.textContent=settings.scoreRate.toFixed(2);

    setTrafficStart.value=String(settings.trafficStart);
    setTrafficStartVal.textContent=String(settings.trafficStart);

    setScale.value=String(settings.canvasScale);
    setScaleVal.textContent=settings.canvasScale.toFixed(2);
  }
  function hookRange(inp, out, fmt=(v)=>v){
    inp.addEventListener("input", ()=> out.textContent = fmt(Number(inp.value)));
  }
  hookRange(setSteer,setSteerVal,v=>String(Math.round(v)));
  hookRange(setScoreRate,setScoreRateVal,v=>v.toFixed(2));
  hookRange(setTrafficStart,setTrafficStartVal,v=>String(Math.round(v)));
  hookRange(setScale,setScaleVal,v=>v.toFixed(2));

  btnSaveSettings.addEventListener("click", ()=>{
    settings.steerSmooth=Number(setSteer.value);
    settings.scoreRate=Number(setScoreRate.value);
    settings.trafficStart=Number(setTrafficStart.value);
    settings.canvasScale=Number(setScale.value);

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyCanvasScale();
    player.smooth=settings.steerSmooth;
    settingsOverlay.classList.remove("show");
  });

  // ---------- INPUT ----------
  window.addEventListener("keydown",(e)=>{
    if(e.code==="ArrowLeft"||e.code==="KeyA") input.leftHeld=true;
    if(e.code==="ArrowRight"||e.code==="KeyD") input.rightHeld=true;

    if(e.code==="Space"){
      e.preventDefault();
      if(!running && !dead) return;
      togglePause();
    }
    if(e.code==="KeyR"){ e.preventDefault(); startGame(); }
    if(e.code==="Escape"){
      settingsOverlay.classList.remove("show");
      shopOverlay.classList.remove("show");
    }
  });
  window.addEventListener("keyup",(e)=>{
    if(e.code==="ArrowLeft"||e.code==="KeyA") input.leftHeld=false;
    if(e.code==="ArrowRight"||e.code==="KeyD") input.rightHeld=false;
  });

  function setHoldFromX(clientX, holding){
    const rect=canvas.getBoundingClientRect();
    const x=clientX-rect.left;
    const leftSide=x < rect.width/2;
    if(holding){
      input.leftHeld=leftSide;
      input.rightHeld=!leftSide;
    }else{
      input.leftHeld=false;
      input.rightHeld=false;
    }
  }
  canvas.addEventListener("mousedown",(e)=>setHoldFromX(e.clientX,true));
  window.addEventListener("mouseup",()=>setHoldFromX(0,false));

  let touchStartX=null;
  canvas.addEventListener("touchstart",(e)=>{
    const t0=e.changedTouches[0];
    touchStartX=t0.clientX;
    setHoldFromX(t0.clientX,true);
  },{passive:true});
  canvas.addEventListener("touchmove",(e)=>{
    const t0=e.changedTouches[0];
    setHoldFromX(t0.clientX,true);
  },{passive:true});
  canvas.addEventListener("touchend",(e)=>{
    const t0=e.changedTouches[0];
    const dx=touchStartX==null?0:(t0.clientX-touchStartX);
    touchStartX=null;

    if(Math.abs(dx)>28){
      input.leftHeld = dx<0;
      input.rightHeld = dx>0;
      input.stepCooldown=0;
      setTimeout(()=>{input.leftHeld=false;input.rightHeld=false;},120);
    }else{
      input.leftHeld=false; input.rightHeld=false;
    }
  },{passive:true});

  // ---------- BUTTONS ----------
  btnStart.addEventListener("click", ()=>startGame());
  btnRestart.addEventListener("click", ()=>startGame());

  btnSettings.addEventListener("click", ()=>{
    if(running && !paused) paused=true;
    syncSettingsUI();
    settingsOverlay.classList.add("show");
  });
  btnCloseSettings.addEventListener("click", ()=>settingsOverlay.classList.remove("show"));
  settingsOverlay.addEventListener("click",(e)=>{
    if(e.target===settingsOverlay) settingsOverlay.classList.remove("show");
  });

  btnShop.addEventListener("click", ()=>shopToggle());
  btnCloseShop.addEventListener("click", ()=>shopClose());
  shopOverlay.addEventListener("click",(e)=>{
    if(e.target===shopOverlay) shopClose();
  });

  // ---------- INIT ----------
  applyCanvasScale();

  // ensure shop state
  shopState.ownedCars = shopState.ownedCars || { classic:true };
  shopState.ownedThemes = shopState.ownedThemes || { neon:true };
  shopState.equippedCar = shopState.equippedCar || "classic";
  shopState.equippedTheme = shopState.equippedTheme || "neon";
  saveShopState();

  player.color=currentCar().color;

  uiScore.textContent="0";
  uiBest.textContent=String(best);
  uiCoins.textContent=String(coins);
  uiSpeed.textContent="1.0x";

  resetGame();
  render();
  loop();
})();