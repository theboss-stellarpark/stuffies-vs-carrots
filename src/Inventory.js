import { RARITY_COLOR, RARITY_BORDER, defaultWeapon, defaultArmor } from './Items.js';

export class Inventory {
  constructor() {
    this.items = [];          // bag slots (max 8)
    this.maxSize = 8;
    this.equippedWeapon = null;
    this.equippedArmor  = null;
    this._visible = false;
    this.onEquip = null;      // callback(item)
    this._build();
  }

  // ─── UI build ────────────────────────────────────────────────────────────

  _build() {
    const hud = document.getElementById('hud');

    this._panel = document.createElement('div');
    this._panel.style.cssText = `
      position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      width:520px;
      background:rgba(10,7,16,0.97);
      border:2px solid #3a3050;
      border-radius:12px;
      padding:20px;
      display:none;
      font-family:Georgia,serif;
      color:#ccc;
      z-index:200;
      box-shadow:0 0 60px rgba(0,0,0,0.9);
      pointer-events:all;
      user-select:none;
    `;
    this._panel.addEventListener('click', e => e.stopPropagation());
    this._panel.addEventListener('mousedown', e => e.stopPropagation());

    // ── Title bar ──
    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
      display:flex; justify-content:space-between; align-items:center;
      margin-bottom:16px; border-bottom:1px solid #2a2038; padding-bottom:10px;
    `;
    const title = document.createElement('div');
    title.textContent = '⚔  INVENTORY';
    title.style.cssText = 'font-size:17px; letter-spacing:3px; color:#ffcc88;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background:none; border:1px solid #555; color:#888;
      width:28px; height:28px; cursor:pointer; border-radius:4px; font-size:13px;
    `;
    closeBtn.onclick = () => this.hide();
    titleBar.appendChild(title);
    titleBar.appendChild(closeBtn);
    this._panel.appendChild(titleBar);

    // ── Body layout ──
    const body = document.createElement('div');
    body.style.cssText = 'display:flex; gap:16px; margin-bottom:44px;';

    // Left: equipment slots
    const equipCol = document.createElement('div');
    equipCol.style.cssText = 'width:155px; flex-shrink:0;';
    this._addLabel(equipCol, 'EQUIPPED');

    this._wSlot = this._makeEquipSlot('WEAPON');
    this._aSlot  = this._makeEquipSlot('ARMOR');
    equipCol.appendChild(this._wSlot.el);
    equipCol.appendChild(this._aSlot.el);

    const divider = document.createElement('div');
    divider.style.cssText = 'width:1px; background:#2a2038; flex-shrink:0;';

    // Right: bag grid
    const bagCol = document.createElement('div');
    bagCol.style.cssText = 'flex:1; min-width:0;';
    this._bagLabel = this._addLabel(bagCol, 'BACKPACK  0/8');

    this._grid = document.createElement('div');
    this._grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:8px;';
    bagCol.appendChild(this._grid);

    body.appendChild(equipCol);
    body.appendChild(divider);
    body.appendChild(bagCol);
    this._panel.appendChild(body);

    // ── Tooltip strip ──
    this._tip = document.createElement('div');
    this._tip.style.cssText = `
      position:absolute; bottom:0; left:0; right:0;
      border-top:1px solid #2a2038; border-radius:0 0 10px 10px;
      padding:8px 16px; font-size:12px; color:#999;
      background:rgba(0,0,0,0.5); min-height:36px;
    `;
    this._tip.textContent = 'Hover an item to see details.  Click to equip.';
    this._panel.appendChild(this._tip);

    hud.appendChild(this._panel);
  }

  _addLabel(parent, text) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'font-size:10px; letter-spacing:2px; color:#666; margin-bottom:10px;';
    parent.appendChild(el);
    return el;
  }

  _makeEquipSlot(label) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:12px;';

    const lbl = document.createElement('div');
    lbl.textContent = label;
    lbl.style.cssText = 'font-size:10px; color:#554; letter-spacing:1px; margin-bottom:4px;';
    wrap.appendChild(lbl);

    const slot = document.createElement('div');
    slot.style.cssText = `
      width:100%; min-height:60px; padding:8px 10px;
      background:#0d0a14; border:1px solid #2a2038; border-radius:6px;
      display:flex; align-items:center; gap:10px; cursor:pointer;
      transition:border-color 0.15s;
    `;
    slot.title = 'Click to unequip';

    const icon = document.createElement('div');
    icon.style.cssText = 'font-size:22px; width:26px; text-align:center; flex-shrink:0;';
    icon.textContent = '—';

    const info = document.createElement('div');
    info.style.cssText = 'font-size:11px; color:#555; line-height:1.55;';
    info.textContent = 'Empty';

    slot.appendChild(icon);
    slot.appendChild(info);
    wrap.appendChild(slot);

    const type = label === 'WEAPON' ? 'weapon' : 'armor';
    slot.onclick = e => { e.stopPropagation(); this._unequip(type); };
    slot.onmouseenter = () => { slot.style.borderColor = '#553'; };
    slot.onmouseleave = () => {
      const item = type === 'weapon' ? this.equippedWeapon : this.equippedArmor;
      slot.style.borderColor = item ? (RARITY_BORDER[item.rarity] || '#333') : '#2a2038';
    };

    return { el: wrap, slot, icon, info };
  }

  _makeItemCard(item) {
    const rc = RARITY_COLOR[item.rarity] || '#aaa';
    const rb = RARITY_BORDER[item.rarity] || '#555';

    const card = document.createElement('div');
    card.style.cssText = `
      padding:9px 10px; border:2px solid ${rb}; border-radius:7px;
      background:#0d0a14; cursor:pointer;
      transition:border-color 0.12s, background 0.12s;
    `;

    const iconEl = document.createElement('div');
    iconEl.textContent = item.icon || (item.type === 'weapon' ? '⚔️' : '🛡️');
    iconEl.style.cssText = 'font-size:20px; margin-bottom:4px;';

    const nameEl = document.createElement('div');
    nameEl.textContent = item.name;
    nameEl.style.cssText = `font-size:11px; color:${rc}; font-weight:bold; margin-bottom:2px; line-height:1.25;`;

    const statEl = document.createElement('div');
    statEl.style.cssText = 'font-size:10px; color:#777;';
    if (item.type === 'weapon') {
      statEl.textContent = `⚔ ${item.damage[0]}–${item.damage[1]}  ⏱ ${(item.cooldown * 1000).toFixed(0)}ms`;
    } else {
      statEl.textContent = `🛡 -${item.defense} dmg taken`;
    }

    card.appendChild(iconEl);
    card.appendChild(nameEl);
    card.appendChild(statEl);

    card.onmouseenter = () => {
      card.style.borderColor = rc;
      card.style.background = '#18101f';
      this._tip.innerHTML =
        `<strong style="color:${rc}">${item.name}</strong> &nbsp;`
        + `<span style="color:#555;font-size:10px;letter-spacing:1px">${item.rarity.toUpperCase()}</span>`
        + `<br><span style="color:#888">${item.desc}</span>`;
    };
    card.onmouseleave = () => {
      card.style.borderColor = rb;
      card.style.background = '#0d0a14';
      this._tip.textContent = 'Hover an item to see details.  Click to equip.';
    };
    card.onclick = e => { e.stopPropagation(); this._equipFromBag(item); };

    return card;
  }

  // ─── Equip / unequip ────────────────────────────────────────────────────

  _equipFromBag(item) {
    this.items = this.items.filter(i => i !== item);

    // Send currently-equipped item back to bag
    const displaced = item.type === 'weapon' ? this.equippedWeapon : this.equippedArmor;
    if (displaced) this.items.push(displaced);

    if (item.type === 'weapon') this.equippedWeapon = item;
    else                        this.equippedArmor  = item;

    if (this.onEquip) this.onEquip(item);
    this._refresh();
  }

  _unequip(type) {
    const item = type === 'weapon' ? this.equippedWeapon : this.equippedArmor;
    if (!item) return;
    if (this.items.length >= this.maxSize) return; // bag full

    this.items.push(item);
    if (type === 'weapon') {
      this.equippedWeapon = null;
      if (this.onEquip) this.onEquip(defaultWeapon());
    } else {
      this.equippedArmor = null;
      if (this.onEquip) this.onEquip(defaultArmor());
    }
    this._refresh();
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  addItem(item) {
    if (this.items.length >= this.maxSize) return false;
    this.items.push(item);
    if (this._visible) this._refresh();
    return true;
  }

  get isFull() { return this.items.length >= this.maxSize; }

  toggle() { this._visible ? this.hide() : this.show(); }
  show()   { this._visible = true;  this._refresh(); this._panel.style.display = 'block'; }
  hide()   { this._visible = false; this._panel.style.display = 'none'; }

  // ─── Refresh UI ─────────────────────────────────────────────────────────

  _refresh() {
    this._refreshSlot(this._wSlot, this.equippedWeapon, 'weapon');
    this._refreshSlot(this._aSlot,  this.equippedArmor,  'armor');

    this._grid.innerHTML = '';
    this.items.forEach(item => this._grid.appendChild(this._makeItemCard(item)));
    this._bagLabel.textContent = `BACKPACK  ${this.items.length}/${this.maxSize}`;
  }

  _refreshSlot(slot, item, type) {
    if (item && item.id !== '__default__') {
      const rc = RARITY_COLOR[item.rarity] || '#aaa';
      slot.icon.textContent = item.icon || (type === 'weapon' ? '⚔️' : '🛡️');
      slot.info.innerHTML = `<span style="color:${rc}">${item.name}</span><br>`
        + (type === 'weapon'
          ? `<span style="color:#666">⚔ ${item.damage[0]}–${item.damage[1]}</span>`
          : `<span style="color:#666">🛡 -${item.defense} dmg</span>`);
      slot.slot.style.borderColor = RARITY_BORDER[item.rarity] || '#333';
    } else {
      slot.icon.textContent = '—';
      slot.info.textContent = 'Empty';
      slot.slot.style.borderColor = '#2a2038';
    }
  }
}
