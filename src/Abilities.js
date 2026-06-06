// Ability tree definitions per character.
// unlocked: true = granted at game start, no prerequisites needed.
// All abilities are activated with E when equipped.

export const CHARACTER_ABILITIES = {
  stuffy: [
    {
      id: 'laser_blast',
      name: 'Laser Blast',
      icon: '⚡',
      description: 'Fire a laser beam that damages all enemies in its path.',
      damage: 10,
      cooldown: 0.85,
      range: 22,
      tokenCost: 0,
      unlocked: true,
    },
    {
      id: 'power_laser',
      name: 'Power Laser',
      icon: '⚡⚡',
      description: 'An amplified laser beam that deals increased damage.',
      damage: 15,
      cooldown: 0.85,
      range: 22,
      tokenCost: 1,
      requires: 'laser_blast',
      unlocked: false,
    },
    {
      id: 'grape_bomb',
      name: 'Grape Bomb',
      icon: '💜',
      description: 'Throw a rolling bomb that explodes after 5 seconds in a large radius.',
      damage: 50,
      cooldown: 10,
      range: 8,
      fuseTime: 5,
      tokenCost: 1,
      requires: 'laser_blast',
      unlocked: false,
    },
    {
      id: 'broken_mech',
      name: 'Broken Mech',
      icon: '⚙️',
      description: 'Channel a busted mech suit: take 25% less damage, deal 10% more damage, and extend your attack range by 25% for 10 seconds.',
      damage: 0,
      cooldown: 30,
      range: 0,
      duration: 10,
      tokenCost: 1,
      requires: 'laser_blast',
      unlocked: false,
    },
    {
      id: 'big_grape_bomb',
      name: 'Big Grape Bomb',
      icon: '💜💜',
      description: 'A massive bomb with a huge blast radius. Long fuse, devastating impact.',
      damage: 75,
      cooldown: 20,
      range: 14,
      fuseTime: 5,
      tokenCost: 2,
      requires: 'grape_bomb',
      unlocked: false,
    },
    {
      id: 'mega_laser',
      name: 'Mega Laser',
      icon: '⚡⚡⚡',
      description: 'A massive laser beam that tears through everything in its path.',
      damage: 25,
      cooldown: 0.9,
      range: 22,
      tokenCost: 2,
      requires: 'power_laser',
      unlocked: false,
    },
  ],
  slothy: [],
  minty:  [],
};

export function getAbilities(character) {
  return CHARACTER_ABILITIES[character] ?? [];
}

export function getStartingAbilities(character) {
  return getAbilities(character).filter(a => a.unlocked);
}

