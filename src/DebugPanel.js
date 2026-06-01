import { WEAPONS, ARMORS, WEAPONS_L2, ARMORS_L2, WIZARD_WAND, RARITY_COLOR, RARITY_BORDER, scaleItem, getMeta, saveMeta } from './Items.js?v=3';

// Split so it's not sitting as one obvious literal in the source
const _PW = ['flu', 'ffy', '717'].join('');

export class DebugPanel {
  constructor(onEquip, onSelectLevel) {
    this._onEquip          = onEquip;
    this._onSelectLevel    = onSelectLevel;
    this._unlocked         = false;
    this._visible          = false;
    this._debugDifficulty  = 1;
    this._buildPrompt();
    this._buildPanel();
  }

  // ── Password prompt ────────────────────────────────────────────────────────

  _buildPrompt() {
    this._prompt = document.createElement('div');
    this._prompt.style.cssText = `
      position:fixed; inset:0; z-index:500;
      display:none; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.7);
      pointer-events:all;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:#0d0a14; border:2px solid #553333;
      border-radius:10px; padding:28px 32px;
      display:flex; flex-direction:column; gap:14px; align-items:center;
      font-family:Georgia,serif;
    `;

    const title = document.createElement('div');
    title.textContent = '🔒  DEBUG ACCESS';
    title.style.cssText = 'color:#cc4444; font-size:15px; letter-spacing:3px;';

    this._pwInput = document.createElement('input');
    this._pwInput.type = 'password';
    this._pwInput.placeholder = 'password';
    this._pwInput.style.cssText = `
      background:#1a0f1f; border:1px solid #553333; border-radius:5px;
      color:#ffffff; font-size:15px; padding:8px 14px; outline:none;
      width:200px; font-family:monospace; letter-spacing:2px;
    `;

    this._pwError = document.createElement('div');
    this._pwError.style.cssText = 'color:#ff4444; font-size:12px; height:14px; letter-spacing:1px;';

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Unlock';
    submitBtn.style.cssText = `
      background:#3a1a1a; color:#ff8888; border:1px solid #883333;
      border-radius:5px; padding:7px 24px; font-size:14px;
      font-family:Georgia,serif; cursor:pointer; letter-spacing:1px;
    `;
    submitBtn.onmouseenter = () => submitBtn.style.background = '#551a1a';
    submitBtn.onmouseleave = () => submitBtn.style.background = '#3a1a1a';

    const tryUnlock = () => {
      if (this._pwInput.value === _PW) {
        // Unlock all characters when debug access is granted
        const meta = getMeta();
        ['slothy', 'minty'].forEach(id => {
          if (!meta.unlockedChars.includes(id)) meta.unlockedChars.push(id);
        });
        saveMeta(meta);

        this._unlocked = true;
        this._hidePrompt();
        this.show();
      } else {
        this._pwError.textContent = 'incorrect password';
        box.style.animation = 'none';
        requestAnimationFrame(() => {
          box.style.transition = 'transform 0.07s';
          const shake = [6, -6, 5, -5, 3, -3, 0];
          shake.forEach((x, i) =>
            setTimeout(() => { box.style.transform = `translateX(${x}px)`; }, i * 60)
          );
        });
        this._pwInput.value = '';
      }
    };

    submitBtn.onclick = tryUnlock;
    this._pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });

    // Close on backdrop click
    this._prompt.addEventListener('click', e => {
      if (e.target === this._prompt) this._hidePrompt();
    });

    box.appendChild(title);
    box.appendChild(this._pwInput);
    box.appendChild(this._pwError);
    box.appendChild(submitBtn);
    this._prompt.appendChild(box);
    document.getElementById('hud').appendChild(this._prompt);
  }

  _showPrompt() {
    this._pwInput.value = '';
    this._pwError.textContent = '';
    this._prompt.style.display = 'flex';
    setTimeout(() => this._pwInput.focus(), 50);
  }

  _hidePrompt() {
    this._prompt.style.display = 'none';
  }

  // ── Main panel ─────────────────────────────────────────────────────────────

  _buildPanel() {
    this._panel = document.createElement('div');
    this._panel.style.cssText = `
      position:fixed; inset:0; z-index:400;
      display:none; align-items:flex-start; justify-content:center;
      background:rgba(0,0,0,0.80); overflow-y:auto; padding:24px 0 40px;
      pointer-events:all;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = `
      width:700px; max-width:96vw;
      background:#100a18; border:2px solid #883333;
      border-radius:12px; padding:22px 24px;
      font-family:Georgia,serif;
    `;
    inner.addEventListener('click', e => e.stopPropagation());

    // Title bar
    const titleBar = document.createElement('div');
    titleBar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;';
    const titleEl = document.createElement('div');
    titleEl.innerHTML = '🛠 &nbsp;DEBUG — ITEM TESTER';
    titleEl.style.cssText = 'color:#ff6655; font-size:15px; letter-spacing:3px;';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background:none; border:1px solid #553333; color:#aa4444;
      width:28px; height:28px; cursor:pointer; border-radius:4px; font-size:13px;
    `;
    closeBtn.onclick = () => this.hide();

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🗑 Clear Debug Gear';
    resetBtn.style.cssText = `
      background:#1a0808; border:1px solid #662222; color:#aa4444;
      border-radius:4px; padding:4px 10px; font-size:11px;
      cursor:pointer; font-family:monospace; letter-spacing:1px;
    `;
    resetBtn.onmouseenter = () => resetBtn.style.background = '#2a0808';
    resetBtn.onmouseleave = () => resetBtn.style.background = '#1a0808';
    resetBtn.onclick = () => {
      if (!confirm('Clear debug gear? Equipped items, bag, and unlocked difficulties will be reset to default. Coins, cleared levels, and character unlocks are kept.')) return;
      const meta = getMeta();
      meta.unlockedDifficulties = [1];
      saveMeta(meta);
      localStorage.removeItem('stuffies_save');
      sessionStorage.removeItem('debug_char');
      sessionStorage.removeItem('debug_level');
      sessionStorage.removeItem('debug_difficulty');
      location.reload();
    };

    titleBar.appendChild(titleEl);
    titleBar.appendChild(resetBtn);
    titleBar.appendChild(closeBtn);
    inner.appendChild(titleBar);

    // ── Character selector ──
    const charHeading = document.createElement('div');
    charHeading.textContent = 'CHARACTER';
    charHeading.style.cssText = `
      font-size:10px; letter-spacing:3px; color:#664444;
      margin:0 0 8px; border-bottom:1px solid #2a1a2a; padding-bottom:5px;
    `;
    inner.appendChild(charHeading);

    const charRow = document.createElement('div');
    charRow.style.cssText = 'display:flex; gap:10px; margin-bottom:4px;';

    const chars = [
      { id: 'stuffy', label: 'Fluffy', icon: '👽', desc: 'Alien warrior' },
      { id: 'slothy', label: 'Slothy', icon: '🦥', desc: '+10% attack'  },
      { id: 'minty',  label: 'Minty',  icon: '🐻', desc: '+10% spd / +5% atk' },
    ];

    const refreshCards = () => {
      const pending = sessionStorage.getItem('debug_char') || getMeta().selectedChar;
      charRow.querySelectorAll('[data-char]').forEach(c => {
        const sel = c.dataset.char === pending;
        c.style.borderColor = sel ? '#ff6655' : '#442222';
        c.style.background  = sel ? 'rgba(80,20,20,0.6)' : '#0d0a14';
      });
    };

    chars.forEach(ch => {
      const card = document.createElement('div');
      card.dataset.char = ch.id;
      card.style.cssText = `
        padding:10px 14px; border-radius:7px; border:2px solid #442222;
        background:#0d0a14; cursor:pointer; text-align:center; min-width:110px;
        transition:border-color 0.12s, background 0.12s; font-family:Georgia,serif;
      `;
      card.innerHTML = `
        <div style="font-size:26px;margin-bottom:4px">${ch.icon}</div>
        <div style="font-size:12px;color:#ff8877;letter-spacing:1px">${ch.label}</div>
        <div style="font-size:10px;color:#664444;margin-top:2px">${ch.desc}</div>
      `;
      card.onmouseenter = () => { card.style.borderColor = '#ff6655'; card.style.background = '#1a0a0a'; };
      card.onmouseleave = () => refreshCards();
      card.onclick = () => {
        sessionStorage.setItem('debug_char', ch.id);
        refreshCards();
        reloadNote.style.display = 'block';
      };
      charRow.appendChild(card);
    });

    const reloadNote = document.createElement('div');
    reloadNote.style.cssText = `
      display:none; margin-top:8px; margin-bottom:4px;
      font-size:11px; color:#ff8855; letter-spacing:1px;
    `;
    reloadNote.innerHTML = '⚠ Start a new game to play as the selected character.';

    inner.appendChild(charRow);
    inner.appendChild(reloadNote);
    refreshCards();

    // ── Level selector ──
    const lvlHeading = document.createElement('div');
    lvlHeading.textContent = 'JUMP TO LEVEL';
    lvlHeading.style.cssText = `
      font-size:10px; letter-spacing:3px; color:#664444;
      margin:14px 0 8px; border-bottom:1px solid #2a1a2a; padding-bottom:5px;
    `;
    inner.appendChild(lvlHeading);

    const lvlRow = document.createElement('div');
    lvlRow.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-bottom:4px;';

    for (let n = 1; n <= 5; n++) {
      const box = document.createElement('div');
      box.style.cssText = `
        width:70px; height:64px; border-radius:8px;
        border:2px solid #663333; background:#0d0a14;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center; gap:2px;
        cursor:pointer; font-family:Georgia,serif;
        transition:border-color 0.12s, background 0.12s;
      `;
      box.innerHTML = `
        <div style="font-size:22px;color:#ff8877;line-height:1">${n}</div>
        <div style="font-size:9px;color:#664444;letter-spacing:1px">LEVEL</div>
      `;
      box.onmouseenter = () => { box.style.borderColor = '#ff6655'; box.style.background = '#1a0a0a'; };
      box.onmouseleave = () => { box.style.borderColor = '#663333'; box.style.background = '#0d0a14'; };
      box.onclick = () => {
        // Use a temporary key — never writes to meta, so menu stays clean
        this.hide();
        if (this._onSelectLevel) this._onSelectLevel(n);
      };
      lvlRow.appendChild(box);
    }

    inner.appendChild(lvlRow);

    // ── Game difficulty selector ──
    const gameDiffHeading = document.createElement('div');
    gameDiffHeading.textContent = 'GAME DIFFICULTY';
    gameDiffHeading.style.cssText = `
      font-size:10px; letter-spacing:3px; color:#664444;
      margin:14px 0 8px; border-bottom:1px solid #2a1a2a; padding-bottom:5px;
    `;
    inner.appendChild(gameDiffHeading);

    const gameDiffRow = document.createElement('div');
    gameDiffRow.style.cssText = 'display:flex; gap:8px; margin-bottom:4px;';

    const gameDiffOpts = [
      { id: 1, label: 'Default',    sub: '1× enemies' },
      { id: 2, label: 'Adventure',  sub: '1.6× HP / 1.3× dmg' },
      { id: 3, label: 'Apocalypse', sub: '2.5× HP / 1.7× dmg' },
    ];
    const gameDiffBtns = [];
    const currentGameDiff = parseInt(sessionStorage.getItem('debug_difficulty') || '1');
    const refreshGameDiff = () => {
      gameDiffBtns.forEach(({ btn, id }) => {
        const active = parseInt(sessionStorage.getItem('debug_difficulty') || '1') === id;
        btn.style.background  = active ? '#3a1a1a' : '#1a0a0a';
        btn.style.borderColor = active ? '#ff6655' : '#442222';
        btn.style.color       = active ? '#ff8877' : '#664444';
      });
    };

    gameDiffOpts.forEach(({ id, label, sub }) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        padding:6px 12px; border-radius:5px; cursor:pointer;
        background:#1a0a0a; border:1px solid #442222; color:#664444;
        font-family:Georgia,serif; font-size:11px; letter-spacing:1px;
        transition:background 0.12s, border-color 0.12s;
      `;
      btn.innerHTML = `${label}<br><span style="font-size:9px;opacity:0.7">${sub}</span>`;
      btn.onclick = () => {
        sessionStorage.setItem('debug_difficulty', id);
        refreshGameDiff();
      };
      gameDiffBtns.push({ btn, id });
      gameDiffRow.appendChild(btn);
    });
    inner.appendChild(gameDiffRow);

    const gameDiffNote = document.createElement('div');
    gameDiffNote.style.cssText = 'font-size:10px; color:#554433; letter-spacing:1px; margin-bottom:4px;';
    gameDiffNote.textContent = '⚠ Applies on next level jump.';
    inner.appendChild(gameDiffNote);
    refreshGameDiff();

    // ── Loot difficulty selector ──
    const diffHeading = document.createElement('div');
    diffHeading.textContent = 'LOOT DIFFICULTY';
    diffHeading.style.cssText = `
      font-size:10px; letter-spacing:3px; color:#664444;
      margin:14px 0 8px; border-bottom:1px solid #2a1a2a; padding-bottom:5px;
    `;
    inner.appendChild(diffHeading);

    const diffRow = document.createElement('div');
    diffRow.style.cssText = 'display:flex; gap:8px; margin-bottom:4px;';

    const diffOpts = [
      { id: 1, label: 'Default',    suffix: '' },
      { id: 2, label: 'Adventure',  suffix: '+15 dmg / +3 def' },
      { id: 3, label: 'Apocalypse', suffix: '+30 dmg / +6 def' },
    ];
    const diffBtns = [];
    const refreshDiff = () => {
      diffBtns.forEach(({ btn, id }) => {
        const sel = this._debugDifficulty === id;
        btn.style.background   = sel ? '#3a1a1a' : '#1a0a0a';
        btn.style.borderColor  = sel ? '#ff6655' : '#442222';
        btn.style.color        = sel ? '#ff8877' : '#664444';
      });
    };

    diffOpts.forEach(({ id, label, suffix }) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        padding:6px 12px; border-radius:5px; cursor:pointer;
        background:#1a0a0a; border:1px solid #442222; color:#664444;
        font-family:Georgia,serif; font-size:11px; letter-spacing:1px;
        transition:background 0.12s, border-color 0.12s;
      `;
      btn.innerHTML = `${label}${suffix ? `<br><span style="font-size:9px;opacity:0.7">${suffix}</span>` : ''}`;
      btn.onclick = () => { this._debugDifficulty = id; refreshDiff(); };
      diffBtns.push({ btn, id });
      diffRow.appendChild(btn);
    });
    inner.appendChild(diffRow);
    refreshDiff();

    // Sections
    const sections = [
      { label: 'LEVEL 1 WEAPONS', items: WEAPONS },
      { label: 'LEVEL 1 ARMORS',  items: ARMORS  },
      { label: 'LEVEL 2 WEAPONS', items: WEAPONS_L2 },
      { label: 'LEVEL 2 ARMORS',  items: ARMORS_L2  },
      { label: 'LEGENDARY',       items: [WIZARD_WAND] },
    ];

    sections.forEach(({ label, items }) => {
      const heading = document.createElement('div');
      heading.textContent = label;
      heading.style.cssText = `
        font-size:10px; letter-spacing:3px; color:#664444;
        margin:14px 0 8px; border-bottom:1px solid #2a1a2a; padding-bottom:5px;
      `;
      inner.appendChild(heading);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill,minmax(148px,1fr)); gap:8px;';

      items.forEach(item => {
        const rc = RARITY_COLOR[item.rarity]  || '#aaa';
        const rb = RARITY_BORDER[item.rarity] || '#555';
        const card = document.createElement('div');
        card.style.cssText = `
          padding:9px 10px; border:2px solid ${rb}; border-radius:7px;
          background:#0d0a14; cursor:pointer;
          transition:border-color 0.12s, background 0.12s;
        `;
        card.innerHTML = `
          <div style="font-size:20px;margin-bottom:4px">${item.icon || '•'}</div>
          <div style="font-size:11px;color:${rc};font-weight:bold;margin-bottom:2px;line-height:1.25">${item.name}</div>
          <div style="font-size:10px;color:#666">${
            item.type === 'weapon'
              ? `⚔ ${item.damage[0]}–${item.damage[1]}`
              : `🛡 -${item.defense} dmg`
          }</div>
          <div style="font-size:9px;color:#443;margin-top:3px">${item.desc}</div>
        `;
        card.onmouseenter = () => { card.style.borderColor = rc; card.style.background = '#1a1025'; };
        card.onmouseleave = () => { card.style.borderColor = rb; card.style.background = '#0d0a14'; };
        card.onclick = () => {
          this._onEquip(scaleItem(item, this._debugDifficulty));
          // Flash the card green to confirm
          card.style.borderColor = '#44ff88';
          card.style.background  = '#0a1f10';
          setTimeout(() => {
            card.style.borderColor = rb;
            card.style.background  = '#0d0a14';
          }, 400);
        };
        grid.appendChild(card);
      });

      inner.appendChild(grid);
    });

    this._panel.appendChild(inner);
    this._panel.addEventListener('click', e => {
      if (e.target === this._panel) this.hide();
    });
    document.getElementById('hud').appendChild(this._panel);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  toggle() {
    if (!this._unlocked) { this._showPrompt(); return; }
    this._visible ? this.hide() : this.show();
  }

  show() { this._visible = true;  this._panel.style.display = 'flex'; }
  hide() { this._visible = false; this._panel.style.display = 'none'; }

  get visible() { return this._visible || this._prompt.style.display !== 'none'; }
}
