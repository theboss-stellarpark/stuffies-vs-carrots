export class UI {
  constructor() {
    this.score = 0;
    this.player = null;
    this.gameOver = false;
    this.victory = false;
    this._camera = null;
    this.onPotionUse = null;   // set by Game for mobile tap
  }

  init(player, camera) {
    this.player = player;
    this._camera = camera;
    this._build();
  }

  _build() {
    const hud = document.getElementById('hud');

    // Health section (bottom center)
    const healthWrap = document.createElement('div');
    healthWrap.style.cssText = `
      position: fixed;
      bottom: 28px; left: 50%;
      transform: translateX(-50%);
      text-align: center;
    `;
    const healthLabel = document.createElement('div');
    healthLabel.textContent = 'HEALTH';
    healthLabel.style.cssText = 'color:#cc3333;font-size:11px;letter-spacing:3px;margin-bottom:5px;';
    this._healthBg = document.createElement('div');
    this._healthBg.style.cssText = `
      width:220px;height:18px;background:#1a0000;
      border:2px solid #550000;border-radius:9px;overflow:hidden;
    `;
    this._healthFill = document.createElement('div');
    this._healthFill.style.cssText = `
      height:100%;width:100%;
      background:linear-gradient(90deg,#880000,#ff3333);
      border-radius:7px;transition:width 0.12s;
    `;
    this._healthBg.appendChild(this._healthFill);
    healthWrap.appendChild(healthLabel);
    healthWrap.appendChild(this._healthBg);
    hud.appendChild(healthWrap);

    // Score (top right)
    this._scoreEl = document.createElement('div');
    this._scoreEl.style.cssText = `
      position:fixed;top:18px;right:20px;
      color:#ffdd88;font-size:18px;letter-spacing:1px;
      text-shadow:0 0 10px #ffaa00;
    `;
    this._scoreEl.textContent = 'Score: 0';
    hud.appendChild(this._scoreEl);

    // Enemy counter (top center)
    this._enemyCountEl = document.createElement('div');
    this._enemyCountEl.style.cssText = `
      position:fixed;top:18px;left:50%;transform:translateX(-50%);
      color:#aabbcc;font-size:14px;letter-spacing:2px;
      text-shadow:0 0 6px #334455;
    `;
    hud.appendChild(this._enemyCountEl);

    // Controls hint (top left)
    const hint = document.createElement('div');
    hint.style.cssText = `
      position:fixed;top:18px;left:18px;
      color:#667788;font-size:12px;line-height:1.8;
      font-family:monospace;
    `;
    hint.innerHTML = 'WASD / Arrows — Move<br>Click / Space — Attack<br>Q — Potion &nbsp; F — Map<br>I / Tab — Inventory';
    hud.appendChild(hint);

    // Overlay (game over / victory)
    this._overlay = document.createElement('div');
    this._overlay.style.cssText = `
      position:fixed;inset:0;display:none;
      align-items:center;justify-content:center;flex-direction:column;
      background:rgba(0,0,0,0.75);
    `;
    this._overlayTitle = document.createElement('div');
    this._overlayTitle.style.cssText = `
      font-size:68px;font-weight:bold;
      text-shadow:0 0 30px currentColor;margin-bottom:12px;
    `;
    this._overlaySubtitle = document.createElement('div');
    this._overlaySubtitle.style.cssText = `
      font-size:20px;color:#aaaaaa;margin-bottom:32px;letter-spacing:2px;
    `;
    const restartBtn = document.createElement('button');
    restartBtn.textContent = 'Play Again';
    restartBtn.style.cssText = `
      padding:12px 36px;font-size:18px;
      background:#221100;color:#ffcc88;
      border:2px solid #886622;border-radius:6px;
      cursor:pointer;font-family:Georgia,serif;letter-spacing:1px;
    `;
    restartBtn.onmouseenter = () => restartBtn.style.background = '#442200';
    restartBtn.onmouseleave = () => restartBtn.style.background = '#221100';
    restartBtn.onclick = () => location.reload();
    this._overlay.appendChild(this._overlayTitle);
    this._overlay.appendChild(this._overlaySubtitle);
    this._overlay.appendChild(restartBtn);
    hud.appendChild(this._overlay);

    // Potion slot (bottom center, left of health bar)
    this._potionSlot = document.createElement('div');
    this._potionSlot.style.cssText = `
      position:fixed;bottom:22px;left:calc(50% - 148px);
      width:52px;height:52px;
      background:#1a1208;
      border:2px solid #7a5c22;
      border-radius:8px;
      display:flex;align-items:center;justify-content:center;
      flex-direction:column;
      overflow:hidden;
      box-shadow:0 0 8px #4a3010;
      cursor:pointer;
      pointer-events:all;
      touch-action:none;
      -webkit-tap-highlight-color:transparent;
    `;
    this._potionSlot.addEventListener('click', e => {
      e.stopPropagation();
      if (this.onPotionUse) this.onPotionUse();
    });
    this._potionSlot.addEventListener('touchstart', e => {
      e.preventDefault();
      e.stopPropagation();
      if (this.onPotionUse) this.onPotionUse();
    }, { passive: false });

    this._potionIcon = document.createElement('div');
    this._potionIcon.style.cssText = 'font-size:26px;line-height:1;z-index:2;position:relative;';
    this._potionIcon.textContent = '🧪';

    this._potionKey = document.createElement('div');
    this._potionKey.style.cssText = `
      font-size:10px;color:#aa8844;letter-spacing:1px;
      z-index:2;position:relative;margin-top:1px;
    `;
    this._potionKey.textContent = 'Q';

    // Cooldown overlay (sweeps over the icon)
    this._potionCdOverlay = document.createElement('div');
    this._potionCdOverlay.style.cssText = `
      position:absolute;inset:0;
      background:rgba(0,0,0,0.72);
      display:none;
      align-items:center;justify-content:center;
      flex-direction:column;
    `;
    this._potionCdText = document.createElement('div');
    this._potionCdText.style.cssText = 'color:#ffffff;font-size:15px;font-weight:bold;font-family:monospace;';
    this._potionCdOverlay.appendChild(this._potionCdText);

    this._potionSlot.appendChild(this._potionIcon);
    this._potionSlot.appendChild(this._potionKey);
    this._potionSlot.appendChild(this._potionCdOverlay);
    hud.appendChild(this._potionSlot);
  }

  update(enemiesLeft) {
    if (!this.player) return;
    const ratio = this.player.health / this.player.maxHealth;
    this._healthFill.style.width = `${Math.max(0, ratio * 100)}%`;
    this._scoreEl.textContent = `Score: ${this.score}`;
    if (enemiesLeft !== undefined) {
      this._enemyCountEl.textContent = enemiesLeft > 0
        ? `${enemiesLeft} ENEMIES REMAIN`
        : '';
    }
  }

  setPotionCooldown(left, max) {
    if (left > 0) {
      this._potionCdOverlay.style.display = 'flex';
      this._potionCdText.textContent = Math.ceil(left);
      this._potionIcon.style.opacity = '0.35';
    } else {
      this._potionCdOverlay.style.display = 'none';
      this._potionIcon.style.opacity = '1';
    }
  }

  addScore(pts) {
    this.score += pts;
  }

  showPickup(item) {
    const rarityColors = { common: '#aaaaaa', rare: '#4499ff', epic: '#cc44ff' };
    const color = rarityColors[item.rarity] || '#aaaaaa';
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; bottom:90px; left:50%;
      transform:translateX(-50%);
      background:rgba(10,7,16,0.9);
      border:1px solid ${color};
      border-radius:6px; padding:7px 16px;
      font-family:Georgia,serif; font-size:14px;
      color:${color}; pointer-events:none;
      white-space:nowrap;
      transition:opacity 0.5s ease 1.8s, transform 0.5s ease 1.8s;
    `;
    el.textContent = `${item.icon || '•'} ${item.name} picked up`;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(-12px)';
    });
    setTimeout(() => el.remove(), 2400);
  }

  // Floating damage number at a world position
  showDamageAt(worldPos, amount) {
    if (!this._camera) return;
    const v = worldPos.clone().project(this._camera);
    const x = (v.x + 1) / 2 * window.innerWidth;
    const y = -(v.y - 1) / 2 * window.innerHeight;
    const el = document.createElement('div');
    el.textContent = `-${amount}`;
    el.style.cssText = `
      position:fixed;left:${x}px;top:${y}px;
      color:#ff4444;font-size:22px;font-weight:bold;
      font-family:monospace;pointer-events:none;
      text-shadow:1px 1px 2px #000;
      transform:translate(-50%,0);
      transition:transform 0.9s ease-out,opacity 0.9s ease-out;
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = 'translate(-50%,-50px)';
      el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), 950);
  }

  showGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this._overlayTitle.style.color = '#ff3333';
    this._overlayTitle.textContent = 'DEFEATED';
    this._overlaySubtitle.textContent = `Final Score: ${this.score}`;
    this._overlay.style.display = 'flex';
  }

  showVictory() {
    if (this.victory) return;
    this.victory = true;
    this._overlayTitle.style.color = '#ffdd44';
    this._overlayTitle.textContent = 'VICTORY!';
    this._overlaySubtitle.textContent = `Score: ${this.score}`;
    this._overlay.style.display = 'flex';
  }
}
