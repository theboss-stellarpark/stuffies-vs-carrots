import { SAVE_KEY, META_KEY, SLOTHY_COST, getMeta, saveMeta } from './Items.js?v=3';

export class HomeScreen {
  constructor(onNewGame, onContinue) {
    this._onNewGame  = onNewGame;
    this._onContinue = onContinue;
    this._hasSave    = !!localStorage.getItem(SAVE_KEY);
    this._meta       = getMeta();
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

    // Animated grid lines (ISS hull feel)
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;opacity:0.12;pointer-events:none;';
    this._el.appendChild(canvas);
    this._gridCanvas = canvas;
    this._drawGrid();

    // Title
    const title = document.createElement('div');
    title.textContent = 'Stuffies vs. Carrots';
    title.style.cssText = `
      font-size:clamp(32px,6vw,72px);
      color:#e8f4ff;
      letter-spacing:3px;
      text-shadow:0 0 40px rgba(100,200,255,0.7), 0 0 80px rgba(50,150,255,0.3);
      margin-bottom:12px;
      text-align:center;
      padding:0 20px;
    `;

    // Subtitle
    const sub = document.createElement('div');
    sub.textContent = '— a dungeon survival —';
    sub.style.cssText = `
      font-size:clamp(12px,1.8vw,18px);
      color:#6aabcc;
      letter-spacing:5px;
      margin-bottom:64px;
      text-align:center;
    `;

    // ── Character selector ──
    const charWrap = document.createElement('div');
    charWrap.style.cssText = 'display:flex;gap:16px;margin-bottom:32px;';

    const chars = [
      { id: 'stuffy', label: 'Fluffy', icon: '👽', desc: 'Alien warrior', always: true },
      { id: 'slothy', label: 'Slothy', icon: '🦥', desc: '+10% attack', always: false },
    ];

    chars.forEach(ch => {
      const unlocked = ch.always || this._meta.unlockedChars.includes(ch.id);
      const selected = this._meta.selectedChar === ch.id;

      const card = document.createElement('div');
      card.style.cssText = `
        width:120px; padding:14px 10px; border-radius:10px; text-align:center;
        border:2px solid ${selected ? '#4a9acc' : '#243a4e'};
        background:${selected ? 'rgba(20,60,100,0.7)' : 'rgba(10,20,35,0.6)'};
        cursor:${unlocked ? 'pointer' : 'default'};
        transition:border-color 0.15s, background 0.15s;
        position:relative; font-family:Georgia,serif;
      `;

      card.innerHTML = `
        <div style="font-size:36px;margin-bottom:6px">${ch.icon}</div>
        <div style="color:#ddeeff;font-size:13px;letter-spacing:1px">${ch.label}</div>
        <div style="color:#5a8aaa;font-size:10px;margin-top:3px">${ch.desc}</div>
      `;

      if (!unlocked) {
        const lockOverlay = document.createElement('div');
        lockOverlay.style.cssText = `
          position:absolute;inset:0;border-radius:8px;
          background:rgba(0,0,0,0.65);
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
        `;
        lockOverlay.innerHTML = `
          <div style="font-size:20px">🔒</div>
          <div style="color:#ffcc44;font-size:11px;letter-spacing:1px">${SLOTHY_COST} 🪙</div>
        `;

        if (this._meta.coins >= SLOTHY_COST) {
          lockOverlay.innerHTML += `<div style="color:#88ff88;font-size:10px;margin-top:2px">TAP TO UNLOCK</div>`;
          lockOverlay.style.cursor = 'pointer';
          lockOverlay.addEventListener('click', e => {
            e.stopPropagation();
            this._meta.coins -= SLOTHY_COST;
            this._meta.unlockedChars.push('slothy');
            this._meta.selectedChar = 'slothy';
            saveMeta(this._meta);
            this.remove();
            new HomeScreen(this._onNewGame, this._onContinue);
          });
        }
        card.appendChild(lockOverlay);
      } else {
        card.addEventListener('click', () => {
          this._meta.selectedChar = ch.id;
          saveMeta(this._meta);
          // Refresh selection styles
          charWrap.querySelectorAll('[data-char]').forEach(c => {
            const isSel = c.dataset.char === ch.id;
            c.style.borderColor = isSel ? '#4a9acc' : '#243a4e';
            c.style.background  = isSel ? 'rgba(20,60,100,0.7)' : 'rgba(10,20,35,0.6)';
          });
        });
      }

      card.dataset.char = ch.id;
      charWrap.appendChild(card);
    });

    // Buttons
    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;flex-direction:column;gap:18px;align-items:center;';

    const newBtn = this._makeButton('New Game', false);
    newBtn.onclick = () => this._onNewGame();

    const contBtn = this._makeButton('Continue', !this._hasSave);
    if (this._hasSave) contBtn.onclick = () => this._onContinue();

    btnWrap.appendChild(newBtn);
    btnWrap.appendChild(contBtn);

    // Version tag
    const ver = document.createElement('div');
    ver.textContent = 'v0.1';
    ver.style.cssText = `
      position:absolute; bottom:18px; right:22px;
      color:#2a4a6a; font-family:monospace; font-size:12px; letter-spacing:1px;
    `;

    this._el.appendChild(title);
    this._el.appendChild(sub);
    this._el.appendChild(charWrap);
    this._el.appendChild(btnWrap);
    this._el.appendChild(ver);
    document.body.appendChild(this._el);

    window.addEventListener('resize', () => this._drawGrid());
  }

  _makeButton(label, disabled) {
    const btn = document.createElement('button');
    btn.textContent = label;

    const activeStyle = `
      width:240px; padding:16px 0;
      font-size:20px; font-family:Georgia,serif; letter-spacing:2px;
      background:rgba(20,60,100,0.7);
      color:#ddeeff;
      border:2px solid #4a9acc;
      border-radius:8px;
      cursor:pointer;
      transition:background 0.15s, box-shadow 0.15s, transform 0.1s;
      box-shadow:0 0 18px rgba(70,170,220,0.25);
      outline:none;
    `;
    const disabledStyle = `
      width:240px; padding:16px 0;
      font-size:20px; font-family:Georgia,serif; letter-spacing:2px;
      background:rgba(20,30,45,0.5);
      color:#3a5a72;
      border:2px solid #243a4e;
      border-radius:8px;
      cursor:not-allowed;
      outline:none;
    `;

    btn.style.cssText = disabled ? disabledStyle : activeStyle;
    btn.disabled = disabled;

    if (!disabled) {
      btn.onmouseenter = () => {
        btn.style.background = 'rgba(30,90,150,0.85)';
        btn.style.boxShadow  = '0 0 28px rgba(80,190,240,0.5)';
        btn.style.transform  = 'scale(1.04)';
      };
      btn.onmouseleave = () => {
        btn.style.background = 'rgba(20,60,100,0.7)';
        btn.style.boxShadow  = '0 0 18px rgba(70,170,220,0.25)';
        btn.style.transform  = 'scale(1)';
      };
    }

    return btn;
  }

  _drawGrid() {
    const c   = this._gridCanvas;
    const w   = window.innerWidth;
    const h   = window.innerHeight;
    c.width   = w;
    c.height  = h;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth   = 1;
    const step = 60;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  remove() {
    this._el.style.transition = 'opacity 0.4s';
    this._el.style.opacity = '0';
    setTimeout(() => this._el.remove(), 420);
  }
}
