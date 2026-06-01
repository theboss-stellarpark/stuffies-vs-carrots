import { SAVE_KEY, SLOTHY_COST, MINTY_COST, getMeta, saveMeta } from './Items.js?v=3';

export class HomeScreen {
  constructor(onSelectLevel) {
    this._onSelectLevel = onSelectLevel;
    this._meta          = getMeta();
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.style.cssText = `
      position:fixed; inset:0; z-index:200;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      background:radial-gradient(ellipse at center,#1a3a5a 0%,#0d1e30 55%,#050d16 100%);
      font-family:Georgia,serif;
      user-select:none;
    `;

    // Grid background
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;opacity:0.12;pointer-events:none;';
    this._el.appendChild(canvas);
    this._gridCanvas = canvas;
    this._drawGrid();

    // Title
    const title = document.createElement('div');
    title.textContent = 'Stuffies vs. Carrots';
    title.style.cssText = `
      font-size:clamp(28px,5vw,64px);
      color:#e8f4ff; letter-spacing:3px;
      text-shadow:0 0 40px rgba(100,200,255,0.7), 0 0 80px rgba(50,150,255,0.3);
      margin-bottom:8px; text-align:center; padding:0 20px;
    `;

    const sub = document.createElement('div');
    sub.textContent = '— a dungeon survival —';
    sub.style.cssText = `
      font-size:clamp(11px,1.6vw,16px); color:#6aabcc;
      letter-spacing:5px; margin-bottom:32px; text-align:center;
    `;

    this._selectedDifficulty = 1;

    // ── Character selector ──
    const charWrap = document.createElement('div');
    charWrap.style.cssText = 'display:flex;gap:14px;margin-bottom:28px;';
    this._buildCharSelector(charWrap);

    // ── Difficulty selector ──
    const diffLabel = document.createElement('div');
    diffLabel.textContent = 'SELECT DIFFICULTY';
    diffLabel.style.cssText = 'font-size:11px;letter-spacing:4px;color:#4a7a9a;margin-bottom:12px;text-align:center;';

    const diffWrap = document.createElement('div');
    diffWrap.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:28px;';
    this._buildDifficultySelector(diffWrap);

    // ── Level selector ──
    const levelLabel = document.createElement('div');
    levelLabel.textContent = 'SELECT LEVEL';
    levelLabel.style.cssText = `
      font-size:11px; letter-spacing:4px; color:#4a7a9a;
      margin-bottom:12px; text-align:center;
    `;

    const levelWrap = document.createElement('div');
    levelWrap.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:32px;';
    this._buildLevelSelector(levelWrap);

    // Coin counter (top right)
    const coins = document.createElement('div');
    coins.textContent = `🪙 ${this._meta.coins || 0}`;
    coins.style.cssText = `
      position:absolute; top:18px; right:22px;
      color:#ffcc44; font-size:18px; letter-spacing:1px;
      text-shadow:0 0 10px #ffaa00;
      font-family:Georgia,serif;
    `;

    // Version tag
    const ver = document.createElement('div');
    ver.textContent = 'v0.1';
    ver.style.cssText = `
      position:absolute; bottom:18px; right:22px;
      color:#2a4a6a; font-family:monospace; font-size:12px; letter-spacing:1px;
    `;

    this._el.appendChild(coins);
    this._el.appendChild(title);
    this._el.appendChild(sub);
    this._el.appendChild(charWrap);
    this._el.appendChild(diffLabel);
    this._el.appendChild(diffWrap);
    this._el.appendChild(levelLabel);
    this._el.appendChild(levelWrap);
    this._el.appendChild(ver);
    document.body.appendChild(this._el);

    window.addEventListener('resize', () => this._drawGrid());
  }

  _buildCharSelector(wrap) {
    const chars = [
      { id: 'stuffy', label: 'Fluffy', icon: '👽', desc: 'Alien warrior',      always: true,  cost: 0 },
      { id: 'slothy', label: 'Slothy', icon: '🦥', desc: '+10% attack',        always: false, cost: SLOTHY_COST },
      { id: 'minty',  label: 'Minty',  icon: '🐻', desc: '+10% spd / +5% atk', always: false, cost: MINTY_COST },
    ];

    chars.forEach(ch => {
      const unlocked = ch.always || this._meta.unlockedChars.includes(ch.id);
      const selected = this._meta.selectedChar === ch.id;

      const card = document.createElement('div');
      card.dataset.char = ch.id;
      card.style.cssText = `
        width:110px; padding:12px 8px; border-radius:10px; text-align:center;
        border:2px solid ${selected ? '#4a9acc' : '#243a4e'};
        background:${selected ? 'rgba(20,60,100,0.7)' : 'rgba(10,20,35,0.6)'};
        cursor:${unlocked ? 'pointer' : 'default'};
        transition:border-color 0.15s, background 0.15s;
        position:relative;
      `;
      card.innerHTML = `
        <div style="font-size:32px;margin-bottom:5px">${ch.icon}</div>
        <div style="color:#ddeeff;font-size:12px;letter-spacing:1px">${ch.label}</div>
        <div style="color:#5a8aaa;font-size:10px;margin-top:2px">${ch.desc}</div>
      `;

      if (!unlocked) {
        const lockOverlay = document.createElement('div');
        lockOverlay.style.cssText = `
          position:absolute;inset:0;border-radius:8px;
          background:rgba(0,0,0,0.65);
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
          pointer-events:all;
        `;
        lockOverlay.innerHTML = `
          <div style="font-size:18px">🔒</div>
          <div style="color:#ffcc44;font-size:11px;letter-spacing:1px">${ch.cost} 🪙</div>
        `;
        if (this._meta.coins >= ch.cost) {
          lockOverlay.innerHTML += `<div style="color:#88ff88;font-size:10px;margin-top:2px">TAP TO UNLOCK</div>`;
          lockOverlay.style.cursor = 'pointer';
          lockOverlay.addEventListener('click', e => {
            e.stopPropagation();
            this._meta.coins -= ch.cost;
            this._meta.unlockedChars.push(ch.id);
            this._meta.selectedChar = ch.id;
            saveMeta(this._meta);
            this.remove();
            new HomeScreen(this._onSelectLevel);
          });
        }
        card.appendChild(lockOverlay);
      } else {
        card.addEventListener('click', () => {
          this._meta.selectedChar = ch.id;
          saveMeta(this._meta);
          wrap.querySelectorAll('[data-char]').forEach(c => {
            const sel = c.dataset.char === ch.id;
            c.style.borderColor = sel ? '#4a9acc' : '#243a4e';
            c.style.background  = sel ? 'rgba(20,60,100,0.7)' : 'rgba(10,20,35,0.6)';
          });
        });
      }

      wrap.appendChild(card);
    });
  }

  _buildDifficultySelector(wrap) {
    const unlocked = this._meta.unlockedDifficulties || [1];
    const diffs = [
      { id: 1, label: 'Default',    icon: '⚔️',  desc: 'Standard challenge',         req: null },
      { id: 2, label: 'Adventure',  icon: '🔥',  desc: 'Harder enemies · L2 loot',   req: 'Beat Level 5 on Default' },
      { id: 3, label: 'Apocalypse', icon: '💀',  desc: 'Max difficulty · best loot', req: 'Beat Level 5 on Adventure' },
    ];

    const cards = [];
    const refresh = () => {
      cards.forEach(({ card, d }) => {
        const sel = this._selectedDifficulty === d.id;
        card.style.borderColor = sel ? '#4a9acc' : '#243a4e';
        card.style.background  = sel ? 'rgba(20,60,100,0.7)' : 'rgba(10,20,35,0.6)';
      });
    };

    diffs.forEach(d => {
      const isUnlocked = unlocked.includes(d.id);
      const card = document.createElement('div');
      card.style.cssText = `
        width:130px; padding:12px 8px; border-radius:10px; text-align:center;
        border:2px solid ${this._selectedDifficulty === d.id ? '#4a9acc' : '#243a4e'};
        background:${this._selectedDifficulty === d.id ? 'rgba(20,60,100,0.7)' : 'rgba(10,20,35,0.6)'};
        cursor:${isUnlocked ? 'pointer' : 'default'};
        transition:border-color 0.15s, background 0.15s;
        position:relative;
      `;
      card.innerHTML = `
        <div style="font-size:28px;margin-bottom:5px">${d.icon}</div>
        <div style="color:#ddeeff;font-size:12px;letter-spacing:1px">${d.label}</div>
        <div style="color:#5a8aaa;font-size:10px;margin-top:3px;line-height:1.4">${d.desc}</div>
      `;

      if (!isUnlocked) {
        const lock = document.createElement('div');
        lock.style.cssText = `
          position:absolute;inset:0;border-radius:8px;
          background:rgba(0,0,0,0.65);
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
        `;
        lock.innerHTML = `
          <div style="font-size:18px">🔒</div>
          <div style="color:#aaaaaa;font-size:9px;text-align:center;padding:0 6px;line-height:1.4">${d.req}</div>
        `;
        card.appendChild(lock);
      } else {
        card.addEventListener('click', () => {
          this._selectedDifficulty = d.id;
          refresh();
        });
      }

      cards.push({ card, d });
      wrap.appendChild(card);
    });
  }

  _buildLevelSelector(wrap) {
    const cleared = this._meta.clearedLevels || [];
    const save    = this._loadSave();

    for (let n = 1; n <= 5; n++) {
      const isCleared  = cleared.includes(n);
      const isUnlocked = n === 1 || cleared.includes(n - 1);

      const box = document.createElement('div');
      box.style.cssText = `
        width:90px; height:90px; border-radius:10px; border:2px solid;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center; gap:4px;
        font-family:Georgia,serif; position:relative;
        transition:transform 0.1s, box-shadow 0.1s;
        ${isUnlocked
          ? `border-color:${isCleared ? '#44aa44' : '#4a9acc'};
             background:${isCleared ? 'rgba(20,60,20,0.7)' : 'rgba(20,60,100,0.7)'};
             cursor:pointer;`
          : `border-color:#2a3a4a; background:rgba(10,16,24,0.6); cursor:not-allowed;`}
      `;

      // Level number
      const num = document.createElement('div');
      num.textContent = n;
      num.style.cssText = `font-size:28px; color:${isUnlocked ? '#e8f4ff' : '#2a4a5a'}; line-height:1;`;

      // Status
      const status = document.createElement('div');
      status.style.cssText = 'font-size:13px;';
      status.textContent = isCleared ? '✓' : (!isUnlocked ? '🔒' : '');

      box.appendChild(num);
      box.appendChild(status);

      if (!isUnlocked) {
        const tip = document.createElement('div');
        tip.textContent = `Clear ${n - 1} first`;
        tip.style.cssText = 'font-size:9px;color:#2a5a6a;letter-spacing:0.5px;text-align:center;';
        box.appendChild(tip);
      }

      if (isUnlocked) {
        box.onmouseenter = () => {
          box.style.transform  = 'scale(1.06)';
          box.style.boxShadow  = isCleared
            ? '0 0 20px rgba(50,180,50,0.4)'
            : '0 0 20px rgba(70,170,220,0.4)';
        };
        box.onmouseleave = () => {
          box.style.transform = 'scale(1)';
          box.style.boxShadow = 'none';
        };
        box.onclick = () => {
          this._onSelectLevel(n, save, this._selectedDifficulty);
          this.remove();
        };
      }

      wrap.appendChild(box);
    }
  }

  _loadSave() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || null; }
    catch { return null; }
  }

  _drawGrid() {
    const c = this._gridCanvas;
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth   = 1;
    const step = 60;
    for (let x = 0; x <= c.width;  x += step) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,c.height); ctx.stroke(); }
    for (let y = 0; y <= c.height; y += step) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(c.width,y);  ctx.stroke(); }
  }

  remove() {
    this._el.style.transition = 'opacity 0.4s';
    this._el.style.opacity = '0';
    setTimeout(() => this._el.remove(), 420);
  }
}
