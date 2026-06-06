# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

There is no build step. Serve the repo root over HTTP (ES modules require it):

```bash
npx serve .
# or
python3 -m http.server 8080
```

Open the served URL in a browser. Three.js is loaded from a CDN via the importmap in `index.html` — no `npm install` needed.

## Controls

| Desktop | Action |
|---|---|
| WASD / Arrow keys | Move |
| Click / Space | Attack |
| Q | Potion |
| F | Toggle minimap |
| I / Tab | Toggle inventory |

On touch devices, `MobileControls` auto-activates and renders a dynamic joystick (left 55% of screen) plus action buttons.

## Architecture

**`Game`** is the single orchestrator. Its constructor wires everything together and starts `requestAnimationFrame`. The `_animate()` loop is the only place game state advances.

**`Dungeon`** generates a 42×42 grid map using random room placement with L-shaped corridor connections. It builds Three.js `InstancedMesh` for floors and walls (performance), stores walkable tiles in a `Set<"gx,gz">` for O(1) collision, and exposes `isWalkable(worldX, worldZ)` used by both Player and Enemy.

**Coordinate system**: `worldCoord = gridCoord × TILE` where `TILE = 3` (defined in `Game.js`). All 3D positions are in world space; grid positions are used only for map generation and collision.

**`Player` / `Enemy`**: Each owns a `THREE.Group` with procedurally built geometry (no external models). Player facing angle drives attack arc direction. Enemy uses a three-state machine (`IDLE → CHASE → ATTACK`) based on distance to player.

**Combat flow** (`Game._playerAttack`): arc check via dot product between player facing vector and direction-to-enemy. Weapon stats (damage, cooldown, range, arc) come from the equipped item or defaults.

**`Items.js`**: Pure data module — `WEAPONS` and `ARMORS` arrays plus `randomDrop()`. No classes. `defaultWeapon()` / `defaultArmor()` return sentinel objects used when slots are empty.

**`Inventory`**: Fully DOM-based panel (no Three.js). Holds up to 8 bag items plus one equipped weapon and one equipped armor. Equipping calls `player.equip(item)` via the `onEquip` callback, which swaps the weapon mesh or recolors the player's materials.

**`LootDrop`**: Spawned on enemy death (50% chance). Bobbing/spinning 3D pickup; auto-collects when player walks within 1.8 world units.

**`DungeonMap`**: Canvas minimap. Pre-renders the static dungeon layout once into `ImageData`, then composites live player/enemy dots on top each frame. Toggle with F.

**`UI`**: Pure DOM HUD — health bar, score, enemy counter, floating damage numbers, pickup notifications, game-over/victory overlay.

## Key constants

All tunable game values live at the top of `Game.js`:

```js
const TILE = 3;          // world units per dungeon grid cell
const ENEMY_COUNT = 12;
const LOOT_CHANCE = 0.5;
```

Dungeon dimensions are passed to `dungeon.generate(42, 42)` in `_buildWorld()`.

## Adding content

- **New weapons/armors**: add entries to `WEAPONS` or `ARMORS` in `Items.js`. Weapon `shape` must match a `case` in `Player._buildWeaponMesh`.
- **New enemy types**: `Enemy` constructor accepts a `type` parameter (unused in rendering currently — all enemies render as skeletons).
- **New weapon shapes**: add a `case` in `Player._buildWeaponMesh` and set `shape` on the item definition.
