// Dynamic thumbstick + action buttons for touch devices.
// movement.x / movement.y: -1..1, updated each touchmove.
// Joystick appears at the first touch point on the left 55% of the screen.

export class MobileControls {
  constructor() {
    this.movement = { x: 0, y: 0 };
    this.enabled  = false;

    this._touchId   = null;        // active joystick touch identifier
    this._origin    = { x: 0, y: 0 };
    this._radius    = 68;          // outer ring radius in CSS pixels
    this._callbacks = {};

    if (!this._isTouch()) return;
    this.enabled = true;
    this._buildUI();
    this._bindCanvas();
  }

  // ── Detection ────────────────────────────────────────────────────────────

  _isTouch() {
    return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  _buildUI() {
    // Full-screen layer that renders the joystick (pointer-events: none)
    this._layer = document.createElement('div');
    this._layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:10;';

    const R = this._radius;

    // Outer ring
    this._ring = document.createElement('div');
    this._ring.style.cssText = `
      position:absolute; display:none;
      width:${R * 2}px; height:${R * 2}px;
      border-radius:50%;
      border:2px solid rgba(255,255,255,0.28);
      background:rgba(255,255,255,0.04);
      transform:translate(-50%,-50%);
      box-shadow:0 0 24px rgba(120,160,255,0.12);
    `;

    // Knob
    this._knob = document.createElement('div');
    this._knob.style.cssText = `
      position:absolute; display:none;
      width:54px; height:54px;
      border-radius:50%;
      background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(160,190,255,0.65));
      border:2px solid rgba(255,255,255,0.85);
      transform:translate(-50%,-50%);
      box-shadow:0 2px 14px rgba(120,160,255,0.4);
    `;

    this._layer.appendChild(this._ring);
    this._layer.appendChild(this._knob);
    document.body.appendChild(this._layer);

    // ── Buttons ──
    // Attack — bottom right, large
    this._attackBtn = this._makeBtn('⚔', `
      right:22px; bottom:30px; width:84px; height:84px;
      background:radial-gradient(circle at 38% 32%, #cc4411, #7a0e00);
      border-color:#dd5522; font-size:34px;
    `);

    // Inventory — top right
    this._invBtn = this._makeBtn('🎒', `
      right:22px; top:58px; width:54px; height:54px;
      background:rgba(25,16,44,0.88);
      border-color:#6644aa; font-size:22px;
    `);

    // Map — below inventory
    this._mapBtn = this._makeBtn('🗺️', `
      right:22px; top:122px; width:54px; height:54px;
      background:rgba(10,22,18,0.88);
      border-color:#226644; font-size:22px;
    `);

    document.body.appendChild(this._attackBtn);
    document.body.appendChild(this._invBtn);
    document.body.appendChild(this._mapBtn);
  }

  _makeBtn(icon, css) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; z-index:50;
      border-radius:50%; border:2px solid #555;
      display:flex; align-items:center; justify-content:center;
      pointer-events:all; touch-action:none;
      user-select:none; -webkit-tap-highlight-color:transparent;
      box-shadow:0 4px 16px rgba(0,0,0,0.6);
      transition:transform 0.07s, opacity 0.07s;
      ${css}
    `;
    el.textContent = icon;

    // Press feedback
    el.addEventListener('touchstart', () => {
      el.style.transform = 'scale(0.90)';
      el.style.opacity   = '0.75';
    }, { passive: true });
    const release = () => {
      el.style.transform = '';
      el.style.opacity   = '';
    };
    el.addEventListener('touchend',    release, { passive: true });
    el.addEventListener('touchcancel', release, { passive: true });

    return el;
  }

  // ── Wire up game callbacks ────────────────────────────────────────────────

  setCallbacks({ onAttack, onPotion, onInventory, onMap }) {
    const tap = (el, fn) => el.addEventListener('touchstart', e => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    }, { passive: false });

    tap(this._attackBtn, onAttack);
    tap(this._invBtn,    onInventory);
    if (onMap) tap(this._mapBtn, onMap);
    this._callbacks = { onPotion };
  }

  // ── Canvas touch binding ──────────────────────────────────────────────────

  _bindCanvas() {
    const canvas = document.querySelector('canvas');

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        // Only left 55 % of screen starts the joystick
        if (this._touchId === null && t.clientX < window.innerWidth * 0.55) {
          this._touchId = t.identifier;
          this._origin.x = t.clientX;
          this._origin.y = t.clientY;
          this._showJoystick(t.clientX, t.clientY);
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this._touchId) continue;
        const dx = t.clientX - this._origin.x;
        const dy = t.clientY - this._origin.y;
        const dist  = Math.hypot(dx, dy);
        const capped = Math.min(dist, this._radius);
        const angle  = Math.atan2(dy, dx);
        const kx = Math.cos(angle) * capped;
        const ky = Math.sin(angle) * capped;

        // Move knob
        this._knob.style.left = (this._origin.x + kx) + 'px';
        this._knob.style.top  = (this._origin.y + ky) + 'px';

        // Expose normalised movement (dead-zone = 10 px)
        if (dist > 10) {
          this.movement.x =  kx / this._radius;
          this.movement.y =  ky / this._radius;  // +y = screen-down = world-backward
        } else {
          this.movement.x = this.movement.y = 0;
        }
      }
    }, { passive: false });

    const onEnd = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._touchId) {
          this._touchId = null;
          this.movement.x = this.movement.y = 0;
          this._hideJoystick();
        }
      }
    };
    canvas.addEventListener('touchend',    onEnd, { passive: false });
    canvas.addEventListener('touchcancel', onEnd, { passive: false });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _showJoystick(x, y) {
    this._ring.style.left = this._knob.style.left = x + 'px';
    this._ring.style.top  = this._knob.style.top  = y + 'px';
    this._ring.style.display = this._knob.style.display = 'block';
  }

  _hideJoystick() {
    this._ring.style.display = this._knob.style.display = 'none';
  }
}
