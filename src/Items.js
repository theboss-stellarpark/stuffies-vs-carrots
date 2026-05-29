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
    defense: 1, color: 0x3a2255, pantColor: 0x281840, icon: '🔮',
    desc: 'Woven with dark magic — flimsy but mysterious.',
  },
  {
    id: 'bone_armor', name: 'Bone Armor', type: 'armor', rarity: 'common',
    defense: 3, color: 0xccccaa, pantColor: 0xaaaaaa, icon: '💀',
    desc: 'Assembled from skeleton remains.',
  },
];

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

export function randomDrop() {
  const pool = [...WEAPONS, ...ARMORS];
  return pool[Math.floor(Math.random() * pool.length)];
}
