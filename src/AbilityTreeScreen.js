import { CHARACTER_ABILITIES } from './Abilities.js';
import { getMeta, saveMeta, xpToNextLevel } from './Items.js?v=3';

export class AbilityTreeScreen {
  constructor(character, onBack) {
    this._character = character;
    this._onBack    = onBack;
    this._meta      = getMeta();
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.style.cssText = `
      position:fixed; inset:0; z-index:300;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      background:radial-gradient(ellipse at center,#0d1e10 0%,#050d08 60%,#020508 100%);
      font-family:Georgia,serif; user-select:none;
    `;

    // Back
    const back = document.createElement('div');
    back.textContent = '← Back';
    back.style.cssText = `
      position:absolute; top:22px; left:24px;
      color:#5aac6a; font-size:14px; letter-spacing:2px;
      cursor:pointer; opacity:0.8; transition:opacity 0.15s;
    `;
    back.onmouseenter = () => back.style.opacity = '1';
    back.onmouseleave = () => back.style.opacity = '0.8';
    back.onclick = () => { this.remove(); this._onBack(); };

    // Token + XP display
    const info = document.createElement('div');
    const needed = xpToNextLevel(this._meta.level);
    info.style.cssText = `
      position:absolute; top:18px; right:24px; text-align:right;
    `;
    info.innerHTML = `
      <div style="color:#39ff14;font-size:15px;letter-spacing:2px;text-shadow:0 0 10px rgba(57,255,20,0.7)">
        🪙 ${this._meta.tokens} token${this._meta.tokens !== 1 ? 's' : ''}
      </div>
      <div style="color:#5a8a6a;font-size:10px;letter-spacing:2px;margin-top:4px">
        LVL ${this._meta.level} · ${this._meta.xp}/${needed} XP
      </div>
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = 'FLUFFY — ABILITY TREE';
    title.style.cssText = `
      font-size:clamp(16px,2.5vw,26px); color:#e8ffe8;
      letter-spacing:5px; margin-bottom:52px;
      text-shadow:0 0 30px rgba(57,255,20,0.5);
    `;

    this._el.appendChild(back);
    this._el.appendChild(info);
    this._el.appendChild(title);
    this._el.appendChild(this._buildTree());
    document.body.appendChild(this._el);
  }

  _buildTree() {
    const abilities = CHARACTER_ABILITIES[this._character] || [];

    const roots = abilities.filter(a => !a.requires);
    this._byParent = {};
    abilities.filter(a => a.requires).forEach(a => {
      (this._byParent[a.requires] ??= []).push(a);
    });

    const treeEl = document.createElement('div');
    treeEl.style.cssText = 'display:flex; flex-direction:column; gap:32px; align-items:flex-start;';

    roots.forEach(root => {
      treeEl.appendChild(this._buildBranch(root, this._byParent[root.id] || []));
    });

    return treeEl;
  }

  _buildBranch(root, children) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center;';

    row.appendChild(this._buildNode(root));

    if (!children.length) return row;

    // Horizontal stem from root to junction
    const stem = document.createElement('div');
    stem.style.cssText = 'width:32px; height:2px; background:#1a4a1a; flex-shrink:0;';

    // Junction + branches
    const junction = document.createElement('div');
    junction.style.cssText = `
      display:flex; flex-direction:column;
      flex-shrink:0;
    `;

    // Right-side children column
    const childCol = document.createElement('div');
    childCol.style.cssText = 'display:flex; flex-direction:column; gap:16px;';

    children.forEach((child, i) => {
      const branchRow = document.createElement('div');
      branchRow.style.cssText = 'display:flex; align-items:center;';

      // Connector: horizontal line from junction to child
      const hLine = document.createElement('div');
      const isUnlocked = this._meta.unlockedAbilities.includes(child.id);
      const col = isUnlocked ? '#39ff14' : '#1a4a1a';
      hLine.style.cssText = `width:28px; height:2px; background:${col}; flex-shrink:0;`;

      branchRow.appendChild(hLine);
      branchRow.appendChild(this._buildBranch(child, this._byParent[child.id] || []));
      childCol.appendChild(branchRow);
    });

    // Build the vertical junction bar that connects all branch rows
    // We need to draw this as an overlay — use a wrapper with position:relative
    const junctionWrap = document.createElement('div');
    junctionWrap.style.cssText = 'display:flex; align-items:center; position:relative;';

    // Left stem + vertical bar
    const connector = document.createElement('div');
    connector.style.cssText = 'display:flex; align-items:stretch; flex-shrink:0; margin-right:0;';

    if (children.length === 1) {
      const line = document.createElement('div');
      const col = this._meta.unlockedAbilities.includes(children[0].id) ? '#39ff14' : '#1a4a1a';
      line.style.cssText = `width:60px; height:2px; background:${col}; align-self:center;`;
      connector.appendChild(line);
    } else {
      // T-connector using CSS borders
      const tWrap = document.createElement('div');
      tWrap.style.cssText = 'display:flex; flex-direction:column; width:60px; align-self:stretch;';
      children.forEach((child, i) => {
        const isUnlocked = this._meta.unlockedAbilities.includes(child.id);
        const col = isUnlocked ? '#39ff14' : '#1a4a1a';
        const half = document.createElement('div');
        half.style.cssText = `
          flex:1;
          border-left:2px solid ${col};
          ${i === 0 ? `border-bottom:2px solid ${col};` : `border-top:2px solid ${col};`}
          box-sizing:border-box;
        `;
        tWrap.appendChild(half);
      });
      connector.appendChild(tWrap);
    }

    row.appendChild(stem);
    row.appendChild(connector);
    row.appendChild(childCol);

    return row;
  }

  _buildNode(ab) {
    const isUnlocked  = this._meta.unlockedAbilities.includes(ab.id);
    const cost        = ab.tokenCost ?? 1;
    const reqUnlocked = !ab.requires || this._meta.unlockedAbilities.includes(ab.requires);
    const canAfford   = this._meta.tokens >= cost && reqUnlocked;

    const node = document.createElement('div');
    node.style.cssText = `
      width:158px; padding:16px 14px 14px;
      border-radius:14px; text-align:center;
      border:2px solid ${isUnlocked ? '#39ff14' : '#1a3a1a'};
      background:${isUnlocked ? 'rgba(10,30,10,0.9)' : 'rgba(8,14,8,0.85)'};
      box-shadow:${isUnlocked ? '0 0 22px rgba(57,255,20,0.3)' : 'none'};
      opacity:${isUnlocked ? '1' : '0.72'};
    `;

    const icon = document.createElement('div');
    icon.textContent = ab.icon ?? (ab.id === 'grape_bomb' ? '💜' : (ab.requires ? '⚡⚡' : '⚡'));
    icon.style.cssText = `font-size:26px; margin-bottom:7px; filter:${isUnlocked ? 'none' : 'grayscale(0.6)'};`;

    const name = document.createElement('div');
    name.textContent = ab.name;
    name.style.cssText = `
      color:${isUnlocked ? '#ccffcc' : '#3a6a3a'};
      font-size:12px; letter-spacing:1px; margin-bottom:9px; font-weight:bold;
    `;

    const stats = document.createElement('div');
    stats.style.cssText = 'display:flex; flex-direction:column; gap:3px; margin-bottom:10px;';
    const row = (label, val) => {
      const r = document.createElement('div');
      r.style.cssText = 'display:flex; justify-content:space-between; font-size:10px;';
      r.innerHTML = `
        <span style="color:${isUnlocked ? '#5aac6a' : '#2a4a2a'};letter-spacing:1px">${label}</span>
        <span style="color:${isUnlocked ? '#aaffaa' : '#3a5a3a'}">${val}</span>
      `;
      return r;
    };
    if (ab.damage > 0) stats.appendChild(row('DMG', ab.damage));
    if (ab.duration)   stats.appendChild(row('DURATION', `${ab.duration}s`));
    stats.appendChild(row('COOLDOWN', `${ab.cooldown}s`));
    if (ab.fuseTime)   stats.appendChild(row('FUSE', `${ab.fuseTime}s`));
    stats.appendChild(row('KEY', 'E'));

    node.appendChild(icon);
    node.appendChild(name);
    node.appendChild(stats);

    const isEquipped = this._meta.equippedAbility === ab.id;

    if (isUnlocked) {
      if (isEquipped) {
        const badge = document.createElement('div');
        badge.textContent = '★ EQUIPPED';
        badge.style.cssText = `
          font-size:9px; color:#39ff14; letter-spacing:2px;
          padding:4px 0; font-weight:bold;
        `;
        node.appendChild(badge);
      } else {
        const equipBtn = document.createElement('div');
        equipBtn.textContent = 'EQUIP';
        equipBtn.style.cssText = `
          padding:5px 14px; border-radius:8px; font-size:10px;
          letter-spacing:2px; cursor:pointer;
          border:1px solid #39ff14; color:#39ff14;
          background:rgba(57,255,20,0.06);
          transition:background 0.15s;
        `;
        equipBtn.onmouseenter = () => equipBtn.style.background = 'rgba(57,255,20,0.18)';
        equipBtn.onmouseleave = () => equipBtn.style.background = 'rgba(57,255,20,0.06)';
        equipBtn.onclick = () => {
          this._meta.equippedAbility = ab.id;
          saveMeta(this._meta);
          this._el.remove();
          this._build();
        };
        node.appendChild(equipBtn);
      }
    } else if (cost > 0) {
      const btn = document.createElement('div');
      btn.style.cssText = `
        padding:5px 10px; border-radius:8px; font-size:10px;
        letter-spacing:1px; cursor:${canAfford ? 'pointer' : 'default'};
        border:1px solid ${canAfford ? '#39ff14' : '#1a3a1a'};
        color:${canAfford ? '#39ff14' : '#2a4a2a'};
        background:${canAfford ? 'rgba(57,255,20,0.08)' : 'transparent'};
        transition:background 0.15s;
      `;
      btn.textContent = !reqUnlocked ? '🔒 Locked' : `🪙 ${cost} token${cost !== 1 ? 's' : ''}`;
      if (canAfford) {
        btn.onmouseenter = () => btn.style.background = 'rgba(57,255,20,0.18)';
        btn.onmouseleave = () => btn.style.background = 'rgba(57,255,20,0.08)';
        btn.onclick = () => {
          this._meta.tokens -= cost;
          this._meta.unlockedAbilities.push(ab.id);
          saveMeta(this._meta);
          this._el.remove();
          this._build();
        };
      }
      node.appendChild(btn);
    }

    return node;
  }

  remove() {
    this._el.style.transition = 'opacity 0.3s';
    this._el.style.opacity = '0';
    setTimeout(() => this._el.remove(), 320);
  }
}
