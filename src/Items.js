export const SAVE_KEY = 'stuffies_save';

export const WEAPONS = [
  {
    id: 'short_sword', name: 'Short Sword', type: 'weapon', rarity: 'common',
    damage: [22, 35], cooldown: 0.48, range: 3.8, arc: Math.PI * 0.65,
    color: 0xd0d0ee, guardColor: 0xaa8833, shape: 'sword', icon: '⚔️',
    desc: 'A reliable blade for any adventurer.',
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
    id: 'iron_plate', name: 'Iron Plate', type: 'armor', rarity: 'rare',
    defense: 6, color: 0x9999aa, pantColor: 0x667788, icon: '🛡️',
    desc: 'Heavy but very protective.',
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

export function findItemById(id) {
  return [...WEAPONS, ...ARMORS, ...WEAPONS_L2, ...ARMORS_L2].find(i => i.id === id) || null;
}

export const RARITY_COLOR = {
  common: '#aaaaaa',
  rare:   '#4499ff',
  epic:   '#cc44ff',
};

export const RARITY_BORDER = {
  common: '#555555',
  rare:   '#2266bb',
  epic:   '#882299',
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
