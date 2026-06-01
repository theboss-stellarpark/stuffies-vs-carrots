export const SAVE_KEY   = 'stuffies_save';
export const META_KEY   = 'stuffies_meta';
export const SLOTHY_COST = 250;
export const MINTY_COST  = 500;
export const SELL_VALUE  = { common: 10, rare: 30, epic: 75, legendary: 200 };

export function getMeta() {
  try { return { ...defaultMeta(), ...JSON.parse(localStorage.getItem(META_KEY)) }; }
  catch { return defaultMeta(); }
}
export function saveMeta(meta) { localStorage.setItem(META_KEY, JSON.stringify(meta)); }
function defaultMeta() {
  return { coins: 0, unlockedChars: ['stuffy'], selectedChar: 'stuffy', clearedLevels: [], unlockedDifficulties: [1] };
}

export const WEAPONS = [
  {
    id: 'banana_blade', name: 'Banana Blade', type: 'weapon', rarity: 'common',
    damage: [22, 35], cooldown: 0.48, range: 3.8, arc: Math.PI * 0.70,
    color: 0xffdd00, guardColor: 0x44aa22, shape: 'banana', icon: '🍌',
    desc: 'A perfectly ripened blade. Surprisingly dangerous.',
  },
  {
    id: 'greatsword', name: 'Greatsword', type: 'weapon', rarity: 'rare',
    damage: [42, 62], cooldown: 0.78, range: 5.2, arc: Math.PI * 0.44,
    color: 0x8899cc, guardColor: 0x445577, shape: 'greatsword', icon: '🗡️',
    desc: 'Slow but hits like a battering ram.',
  },
  {
    id: 'war_axe', name: 'War Axe', type: 'weapon', rarity: 'rare',
    damage: [32, 50], cooldown: 0.60, range: 4.0, arc: Math.PI * 0.60,
    color: 0xcc7733, guardColor: 0x885522, shape: 'axe', icon: '🪓',
    desc: 'Cleaves through bone and armor alike.',
  },
  {
    id: 'dagger', name: 'Shadow Dagger', type: 'weapon', rarity: 'common',
    damage: [14, 24], cooldown: 0.28, range: 2.8, arc: Math.PI * 0.72,
    color: 0x9999bb, guardColor: 0x445566, shape: 'dagger', icon: '🔪',
    desc: 'Lightning-fast strikes from close range.',
  },
  {
    id: 'bone_mace', name: 'Bone Mace', type: 'weapon', rarity: 'common',
    damage: [26, 42], cooldown: 0.55, range: 3.5, arc: Math.PI * 0.55,
    color: 0xccccaa, guardColor: 0xaaaaaa, shape: 'mace', icon: '🦴',
    desc: 'Taken from a fallen skeleton.',
  },
];

export const ARMORS = [
  {
    id: 'leather_vest', name: 'Leather Vest', type: 'armor', rarity: 'common',
    defense: 2, color: 0x7a4520, pantColor: 0x5a3015, icon: '🥋',
    desc: 'Basic protection from soft hides.',
  },
  {
    id: 'chain_mail', name: 'Chain Mail', type: 'armor', rarity: 'rare',
    defense: 4, color: 0x778899, pantColor: 0x556677, icon: '⛓️',
    desc: 'Interlocked metal rings.',
  },
  {
    id: 'spaceship_armor', name: 'Spaceship Armor', type: 'armor', rarity: 'rare',
    defense: 6, color: 0xd0d8e4, pantColor: 0xb0bcc8, icon: '🚀',
    desc: 'Forged from salvaged hull plating. The triangle is load-bearing.',
  },
  {
    id: 'dark_robe', name: 'Dark Robe', type: 'armor', rarity: 'epic',
    defense: 7, color: 0x3a2255, pantColor: 0x281840, icon: '🔮',
    desc: 'Woven with dark magic — absorbs 7 damage per hit.',
  },
  {
    id: 'bone_armor', name: 'Bone Armor', type: 'armor', rarity: 'common',
    defense: 3, color: 0xccccaa, pantColor: 0xaaaaaa, icon: '💀',
    desc: 'Assembled from skeleton remains.',
  },
];

// ── Level 2 exclusive drops ──────────────────────────────────────────────────

export const WEAPONS_L2 = [
  {
    id: 'plasma_blade', name: 'Plasma Blade', type: 'weapon', rarity: 'epic',
    damage: [68, 92], cooldown: 0.38, range: 5.2, arc: Math.PI * 0.68,
    color: 0x44eeff, guardColor: 0x0055aa, shape: 'plasma', icon: '⚡',
    desc: 'Superheated plasma edge — melts through anything.',
  },
  {
    id: 'cryo_lance', name: 'Cryo Lance', type: 'weapon', rarity: 'rare',
    damage: [50, 72], cooldown: 0.88, range: 7.8, arc: Math.PI * 0.22,
    color: 0xaaddff, guardColor: 0x4488cc, shape: 'lance', icon: '🔱',
    desc: 'Extreme reach, razor-narrow arc. Poke before they close in.',
  },
  {
    id: 'shock_gauntlet', name: 'Shock Gauntlet', type: 'weapon', rarity: 'common',
    damage: [15, 27], cooldown: 0.19, range: 2.2, arc: Math.PI * 0.85,
    color: 0xffee44, guardColor: 0xaa7700, shape: 'gauntlet', icon: '👊',
    desc: 'Electric knuckles — overwhelming speed at close range.',
  },
  {
    id: 'scatter_cannon', name: 'Scatter Cannon', type: 'weapon', rarity: 'rare',
    damage: [26, 44], cooldown: 0.72, range: 4.5, arc: Math.PI * 0.92,
    color: 0xee9944, guardColor: 0x663311, shape: 'cannon', icon: '💥',
    desc: 'Enormous arc, crowd control king. Spray and slay.',
  },
];

export const ARMORS_L2 = [
  {
    id: 'nano_suit', name: 'Nano Suit', type: 'armor', rarity: 'epic',
    defense: 10, color: 0x334455, pantColor: 0x223344, icon: '🤖',
    desc: 'Self-sealing nanomesh — absorbs 10 damage per hit.',
  },
  {
    id: 'cryo_vest', name: 'Cryo Vest', type: 'armor', rarity: 'rare',
    defense: 6, color: 0x88ccee, pantColor: 0x4488bb, icon: '❄️',
    desc: 'Frozen composite panels — absorbs 6 damage per hit.',
  },
  {
    id: 'combat_chassis', name: 'Combat Chassis', type: 'armor', rarity: 'common',
    defense: 4, color: 0x556677, pantColor: 0x334455, icon: '🦾',
    desc: 'Tactical bodyplate — absorbs 4 damage per hit.',
  },
  {
    id: 'reflector_shield', name: 'Reflector Shield', type: 'armor', rarity: 'rare',
    defense: 7, color: 0xddcc88, pantColor: 0xbb9944, icon: '🪞',
    desc: 'Mirror-polished alloy — absorbs 7 damage and looks great.',
  },
];

const _ALL_BASE = () => [...WEAPONS, ...ARMORS, ...WEAPONS_L2, ...ARMORS_L2, WIZARD_WAND];

// Returns a stat-boosted copy with a difficulty-suffixed id so saves round-trip correctly.
export function scaleItem(item, difficulty) {
  if (difficulty <= 1) return item;
  const dmgAdd    = difficulty === 2 ? 15 : 30;
  const defAdd    = difficulty === 2 ? 3  : 6;
  const sellMult  = difficulty === 2 ? 2  : 3;
  const scaled = { ...item, id: `${item.id}_d${difficulty}` };
  if (item.type === 'weapon') {
    scaled.damage = [item.damage[0] + dmgAdd, item.damage[1] + dmgAdd];
  } else {
    scaled.defense = item.defense + defAdd;
  }
  const baseSell = SELL_VALUE[item.rarity] || 10;
  scaled.sellValue = baseSell * sellMult;
  return scaled;
}

export function findItemById(id) {
  // Handle scaled variants (e.g. "wizards_wand_d2")
  const m = id && id.match(/^(.+)_d([23])$/);
  if (m) {
    const base = _ALL_BASE().find(i => i.id === m[1]);
    return base ? scaleItem(base, parseInt(m[2])) : null;
  }
  return _ALL_BASE().find(i => i.id === id) || null;
}

export const RARITY_COLOR = {
  common:    '#aaaaaa',
  rare:      '#4499ff',
  epic:      '#cc44ff',
  legendary: '#ffdd00',
};

export const RARITY_BORDER = {
  common:    '#555555',
  rare:      '#2266bb',
  epic:      '#882299',
  legendary: '#bb8800',
};

export const WIZARD_WAND = {
  id: 'wizards_wand', name: "Wizard's Wand", type: 'weapon', rarity: 'legendary',
  damage: [100, 110], cooldown: 0.34, range: 5.0, arc: Math.PI * 0.50,
  color: 0xffdd00, guardColor: 0xffaa00, shape: 'dagger', icon: '🪄',
  desc: 'Crackling with ancient magic. Belonged to the Wizard Carrot.',
};

const _DEFAULT_WEAPON = {
  type: 'weapon', id: '__default__', shape: 'sword',
  color: 0xd0d0ee, guardColor: 0xaa8833,
};
const _DEFAULT_ARMOR = {
  type: 'armor', id: '__default__', defense: 0,
  color: 0xbb88ee, pantColor: 0xa070dd,
};

export function defaultWeapon() { return _DEFAULT_WEAPON; }
export function defaultArmor()  { return _DEFAULT_ARMOR; }

function _rarityRoll() {
  const r = Math.random();
  return r < 0.70 ? 'common' : r < 0.95 ? 'rare' : 'epic';
}

export function randomDrop() {
  const rarity = _rarityRoll();
  const pool = [...WEAPONS, ...ARMORS].filter(i => i.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function randomDropL2() {
  const rarity = _rarityRoll();
  const pool = [...WEAPONS_L2, ...ARMORS_L2].filter(i => i.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Difficulty 3 (Apocalypse): same item pool as L2 but heavily weighted toward rare/epic
export function randomDropHard() {
  const r = Math.random();
  const rarity = r < 0.25 ? 'common' : r < 0.62 ? 'rare' : 'epic';
  const pool = [...WEAPONS_L2, ...ARMORS_L2].filter(i => i.rarity === rarity);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : randomDropL2();
}
