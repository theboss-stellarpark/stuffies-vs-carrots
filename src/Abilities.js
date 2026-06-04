// Ability tree definitions per character.
// unlocked: true = granted at game start, no prerequisites needed.

export const CHARACTER_ABILITIES = {
  stuffy: [
    {
      id: 'laser_blast',
      name: 'Laser Blast',
      description: 'Fire a laser beam that deals damage to all enemies in its path.',
      damage: 10,
      cooldown: 0.85,
      range: 22,
      key: 'Alt',
      unlocked: true,
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
