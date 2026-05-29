// Compact corner minimap — always live, no game pause, toggle with F.
export class DungeonMap {
  constructor(dungeon) {
    this._dungeon = dungeon;
    this._visible = false;
    this._static  = null;
    this._T       = 4;    // pixels per dungeon tile (fixed compact size)
    this._build();
    this._prerender();
  }

  // ── DOM panel ────────────────────────────────────────────────────────────

  _build() {
    const { width, height } = this._dungeon;
    const T  = this._T;
    const pw = width  * T;
    const ph = height * T;

    this._panel = document.createElement('div');
    this._panel.style.cssText = `
      position:fixed; top:50px; right:84px;
      background:rgba(6,4,12,0.82);
      border:1px solid #3a3050;
      border-radius:7px;
      padding:7px 7px 6px 7px;
      display:none; flex-direction:column; gap:5px;
      box-shadow:0 0 20px rgba(0,0,0,0.8), 0 0 8px rgba(60,30,90,0.3);
      pointer-events:none; z-index:50;
    `;

    // "MAP" label
    const label = document.createElement('div');
    label.style.cssText = `
      color:#ffcc88; font-family:Georgia,serif;
      font-size:10px; letter-spacing:3px; text-align:center;
    `;
    label.textContent = 'MAP';

    // Legend row
    const legend = document.createElement('div');
    legend.style.cssText = `
      display:flex; gap:10px; justify-content:center;
      font-family:monospace; font-size:9px; color:#555; letter-spacing:0px;
    `;
    legend.innerHTML =
      '<span><span style="color:#88aaff">●</span> You</span>' +
      '<span><span style="color:#ff4433">●</span> Enemy</span>';

    // Canvas
    this._canvas = document.createElement('canvas');
    this._canvas.width  = pw;
    this._canvas.height = ph;
    this._canvas.style.cssText = `
      display:block; border:1px solid #22182e; border-radius:2px;
    `;

    this._panel.appendChild(label);
    this._panel.appendChild(this._canvas);
    this._panel.appendChild(legend);
    document.getElementById('hud').appendChild(this._panel);

    this._ctx = this._canvas.getContext('2d');
  }

  // ── Pre-render dungeon tiles once ────────────────────────────────────────

  _prerender() {
    const { grid, width, height } = this._dungeon;
    const T   = this._T;
    const ctx = this._ctx;

    ctx.fillStyle = '#06050c';
    ctx.fillRect(0, 0, width * T, height * T);

    for (let gz = 0; gz < height; gz++) {
      for (let gx = 0; gx < width; gx++) {
        if (grid[gz][gx] === 1) {
          // Floor — tiny per-tile variation for texture
          const v = ((gx * 7 + gz * 13) % 5);
          const b = 0x42 + v * 2;
          ctx.fillStyle = `rgb(${b + 14},${b + 10},${b + 6})`;
          ctx.fillRect(gx * T, gz * T, T, T);
        } else if (this._adjFloor(gx, gz)) {
          // Wall bordering a floor tile
          ctx.fillStyle = '#211730';
          ctx.fillRect(gx * T, gz * T, T, T);
        }
        // else: void — stays black
      }
    }

    this._static = ctx.getImageData(0, 0, width * T, height * T);
  }

  _adjFloor(gx, gz) {
    const { grid, width, height } = this._dungeon;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx, nz = gz + dy;
        if (nx >= 0 && nx < width && nz >= 0 && nz < height && grid[nz][nx] === 1)
          return true;
      }
    }
    return false;
  }

  // ── Per-frame draw (called every frame from Game, even when "paused") ────

  update(playerPos, playerAngle, enemies) {
    if (!this._visible) return;

    const WT  = this._dungeon.T;   // 3 world units per tile
    const T   = this._T;           // 5 map pixels per tile
    const ctx = this._ctx;
    const now = Date.now();

    ctx.putImageData(this._static, 0, 0);

    const mx = wx => (wx / WT) * T;
    const mz = wz => (wz / WT) * T;

    // ── Enemy blinking dots ──
    const blink = Math.floor(now / 480) % 2 === 0;
    enemies.forEach(enemy => {
      if (enemy.dead) return;
      const ex = mx(enemy.group.position.x);
      const ez = mz(enemy.group.position.z);

      // Soft glow
      ctx.fillStyle = blink ? 'rgba(255,50,20,0.28)' : 'rgba(180,10,0,0.14)';
      ctx.beginPath();
      ctx.arc(ex, ez, T * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Solid dot
      ctx.fillStyle = blink ? '#ff4433' : '#bb2211';
      ctx.beginPath();
      ctx.arc(ex, ez, T * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Player glow ──
    const px = mx(playerPos.x);
    const pz = mz(playerPos.z);

    const g = ctx.createRadialGradient(px, pz, 0, px, pz, T * 3.2);
    g.addColorStop(0, 'rgba(100,160,255,0.48)');
    g.addColorStop(1, 'rgba(100,160,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, pz, T * 3.2, 0, Math.PI * 2);
    ctx.fill();

    // ── Player dot ──
    ctx.fillStyle   = '#aaccff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(px, pz, T * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ── Direction arrow ──
    // facingAngle = atan2(moveX, moveZ): 0→+Z (map-down), π/2→+X (map-right)
    const aLen = T * 2.6;
    const adx  = Math.sin(playerAngle) * aLen;
    const adz  = Math.cos(playerAngle) * aLen;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(px, pz);
    ctx.lineTo(px + adx, pz + adz);
    ctx.stroke();

    // Arrowhead
    const tip  = Math.atan2(adz, adx);
    const hl   = T * 1.1;
    const hs   = 0.48;
    ctx.beginPath();
    ctx.moveTo(px + adx, pz + adz);
    ctx.lineTo(px + adx - hl * Math.cos(tip - hs), pz + adz - hl * Math.sin(tip - hs));
    ctx.moveTo(px + adx, pz + adz);
    ctx.lineTo(px + adx - hl * Math.cos(tip + hs), pz + adz - hl * Math.sin(tip + hs));
    ctx.stroke();
  }

  // ── Toggle ───────────────────────────────────────────────────────────────

  show()   { this._visible = true;  this._panel.style.display = 'flex'; }
  hide()   { this._visible = false; this._panel.style.display = 'none'; }
  toggle() { this._visible ? this.hide() : this.show(); }
  get visible() { return this._visible; }
}
