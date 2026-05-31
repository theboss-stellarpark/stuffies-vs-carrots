import * as THREE from 'three';
import { Dungeon } from './Dungeon.js?v=3';
import { Player } from './Player.js?v=3';
import { Enemy } from './Enemy.js?v=3';
import { UI } from './UI.js?v=3';
import { Inventory } from './Inventory.js?v=3';
import { LootDrop } from './LootDrop.js?v=3';
import { randomDrop, randomDropL2, findItemById, SAVE_KEY } from './Items.js?v=3';
import { MobileControls } from './MobileControls.js?v=3';
import { DungeonMap } from './DungeonMap.js?v=3';
import { CyCarrot } from './CyCarrot.js';
import { CarrotSoldier } from './CarrotSoldier.js';
import { DebugPanel } from './DebugPanel.js';

const TILE = 3;

const LEVELS = {
  1: { enemies: 24, cyCarrots: 12, soldiers: 0,  gridSize: 42 },
  2: { enemies: 20, cyCarrots: 20, soldiers: 20, gridSize: 52 },
};
const LOOT_CHANCE = 0.10;

export class Game {
  constructor(level = 1, saveData = null, character = 'stuffy') {
    this._level     = level;
    this._saveData  = saveData;
    this._character = character;
    this._initRenderer();
    this._initScene();
    this._buildWorld();
    this._initInput();
    this._animate();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2a3a);
    this.scene.fog = new THREE.Fog(0x1a2a3a, 20, 80);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 200);
    this._camOffset = new THREE.Vector3(0, 19, 15);

    this.scene.add(new THREE.AmbientLight(0xddeeff, 2.8));
    this.scene.add(new THREE.HemisphereLight(0xeef4ff, 0xbbd0e8, 1.4));

    this.clock = new THREE.Clock();
    this.particles = [];
    this.lootDrops = [];
    this._totalEnemies = 0;
  }

  _buildWorld() {
    const cfg = LEVELS[this._level] || LEVELS[1];

    this.dungeon = new Dungeon(this.scene, TILE);
    this.dungeon.generate(cfg.gridSize, cfg.gridSize);

    const startPos = this.dungeon.getStartPosition();
    this.player = new Player(this.scene, startPos, this._character);

    const spawnPos      = this.dungeon.getSpawnPositions(cfg.enemies);
    const cySpawnPos    = this.dungeon.getSpawnPositions(cfg.cyCarrots);
    const soldierPos    = this.dungeon.getSpawnPositions(cfg.soldiers);
    this.enemies = [
      ...spawnPos.map(p => new Enemy(this.scene, p)),
      ...cySpawnPos.map(p => new CyCarrot(this.scene, p)),
      ...soldierPos.map(p => new CarrotSoldier(this.scene, p)),
    ];
    this._totalEnemies = this.enemies.length;

    this.ui = new UI();
    this.ui.init(this.player, this.camera);

    // Level badge
    this._addLevelBadge(this._level);

    // Inventory
    this.inventory = new Inventory();
    this.inventory.onEquip = item => this.player.equip(item);

    // Make potion slot tappable on mobile
    this.ui.onPotionUse = () => this._usePotion();

    // Restore gear from save
    if (this._saveData) this._restoreSave(this._saveData);

    // Dungeon map overlay
    this.dungeonMap = new DungeonMap(this.dungeon);

    // Debug panel
    this.debugPanel = new DebugPanel(item => {
      if (item.type === 'weapon') {
        this.inventory.equippedWeapon = item;
      } else {
        this.inventory.equippedArmor = item;
      }
      this.player.equip(item);
      if (this.inventory._visible) this.inventory._refresh();
    });

    // Mobile controls (no-op on desktop)
    this.mobile = new MobileControls(this.renderer.domElement);
    if (this.mobile.enabled) {
      this.mobile.setCallbacks({
        onAttack:    () => this._playerAttack(),
        onPotion:    () => this._usePotion(),
        onDash:      () => this._playerDash(),
        onInventory: () => this.inventory.toggle(),
        onMap:       () => this.dungeonMap.toggle(),
      });
    }

    const targetCamPos = startPos.clone().add(this._camOffset);
    this.camera.position.copy(targetCamPos);
    this.camera.lookAt(startPos.clone().add(new THREE.Vector3(0, 1, 0)));
  }

  _addLevelBadge(level) {
    const badge = document.createElement('div');
    badge.style.cssText = `
      position:fixed; top:18px; left:50%;
      transform:translateX(calc(-50% + 120px));
      color:#5aacc8; font-size:12px; letter-spacing:3px;
      font-family:Georgia,serif;
    `;
    badge.textContent = `LEVEL ${level}`;
    document.getElementById('hud').appendChild(badge);
  }

  _restoreSave(save) {
    (save.bagIds || []).forEach(id => {
      const item = findItemById(id);
      if (item) this.inventory.addItem(item);
    });
    if (save.weaponId) {
      const w = findItemById(save.weaponId);
      if (w) { this.inventory.equippedWeapon = w; this.player.equip(w); }
    }
    if (save.armorId) {
      const a = findItemById(save.armorId);
      if (a) { this.inventory.equippedArmor = a; this.player.equip(a); }
    }
    if (save.score) this.ui.score = save.score;
  }

  _saveProgress(nextLevel) {
    const save = {
      level:    nextLevel,
      score:    this.ui.score,
      bagIds:   this.inventory.items.map(i => i.id),
      weaponId: this.inventory.equippedWeapon?.id ?? null,
      armorId:  this.inventory.equippedArmor?.id  ?? null,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  _initInput() {
    this.keys = {};
    this._lastAttackTime = 0;
    this._potionCooldownMax = 20;
    this._potionCooldownLeft = 0;

    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      this.keys[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); this._playerAttack(); }
      if (e.code === 'KeyQ')  { e.preventDefault(); this._usePotion(); }
      if (e.code === 'KeyI' || e.code === 'Tab') {
        e.preventDefault();
        this.inventory.toggle();
      }
      if (e.code === 'KeyF') {
        e.preventDefault();
        this.dungeonMap.toggle();
      }
      if (e.code === 'Backquote') {
        e.preventDefault();
        this.debugPanel.toggle();
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        this._playerDash();
      }
    });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });
    document.addEventListener('click', () => {
      if (!this.inventory._visible) this._playerAttack();
    });
  }

  // ─── Combat ──────────────────────────────────────────────────────────────

  _playerAttack() {
    if (this.ui.gameOver || this.ui.victory) return;
    if (this.inventory._visible) return;

    const weapon   = this.inventory.equippedWeapon;
    const cooldown = weapon ? weapon.cooldown : 0.48;
    const range    = weapon ? weapon.range    : 3.8;
    const arc      = weapon ? weapon.arc      : Math.PI * 0.65;
    const [minD, maxD] = weapon ? weapon.damage : [22, 35];

    const now = this.clock.getElapsedTime();
    if (now - this._lastAttackTime < cooldown) return;
    this._lastAttackTime = now;

    this.player.triggerAttack();

    const playerDir = new THREE.Vector3(
      Math.sin(this.player.facingAngle), 0,
      Math.cos(this.player.facingAngle)
    );

    this.enemies.forEach(enemy => {
      if (enemy.dead) return;
      const toEnemy = new THREE.Vector3()
        .subVectors(enemy.group.position, this.player.position);
      toEnemy.y = 0;
      if (toEnemy.length() > range) return;
      toEnemy.normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, playerDir.dot(toEnemy))));
      if (angle < arc / 2) {
        const boost = this._character === 'slothy' ? 1.10 : 1.0;
        const dmg = Math.floor((minD + Math.floor(Math.random() * (maxD - minD + 1))) * boost);
        enemy.takeDamage(dmg);
        this.ui.showDamageAt(
          enemy.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)), dmg
        );
        if (enemy.dead) this.ui.addScore(100);
      }
    });
  }

  _playerDash() {
    if (this.ui.gameOver || this.ui.victory || this.player.dead) return;
    if (!this.player.canDash()) return;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    const dir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    dir.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  dir.sub(forward);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dir.add(right);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  dir.sub(right);
    if (dir.length() < 0.01)
      dir.set(Math.sin(this.player.facingAngle), 0, Math.cos(this.player.facingAngle));

    this.player.dash(dir);
    this._spawnDashParticles(this.player.position);
  }

  _usePotion() {
    if (this.ui.gameOver || this.ui.victory) return;
    if (this._potionCooldownLeft > 0 || this.player.dead) return;
    this.player.heal(40);
    this._potionCooldownLeft = this._potionCooldownMax;
    this.ui.setPotionCooldown(this._potionCooldownLeft, this._potionCooldownMax);
    this._spawnHealParticles(this.player.position);
  }

  // ─── Loot ────────────────────────────────────────────────────────────────

  _spawnLoot(position) {
    if (Math.random() > LOOT_CHANCE) return;
    const item = this._level >= 2 ? randomDropL2() : randomDrop();
    const drop = new LootDrop(this.scene, position.clone(), item);
    this.lootDrops.push(drop);
  }

  _updateLoot(elapsed) {
    this.lootDrops = this.lootDrops.filter(drop => {
      if (drop.collected) return false;
      const inRange = drop.update(elapsed, this.player.position);
      if (inRange && !this.inventory.isFull) {
        drop.collect();
        this.inventory.addItem(drop.item);
        this.ui.showPickup(drop.item);
        return false;
      }
      return true;
    });
  }

  // ─── Particles ───────────────────────────────────────────────────────────

  _spawnDashParticles(position) {
    const colors = [0xaaddff, 0x88ccff, 0xffffff];
    for (let i = 0; i < 7; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.07, 0.20),
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })
      );
      mesh.position.copy(position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.7, 0.3 + Math.random() * 1.2, (Math.random() - 0.5) * 0.7
      ));
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3),
        life: 0.20 + Math.random() * 0.12,
      });
    }
  }

  _spawnHealParticles(position) {
    const colors = [0x44ff88, 0x88ffaa, 0x22dd66];
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.14),
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })
      );
      mesh.position.copy(position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.2, 0.5 + Math.random() * 1.5, (Math.random() - 0.5) * 1.2
      ));
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 4, (Math.random() - 0.5) * 3),
        life: 0.7 + Math.random() * 0.5,
      });
    }
  }

  _spawnParticles(position) {
    const colors = [0xee5500, 0xff7722, 0xcc4400, 0x228800];
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 0.18),
        new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })
      );
      mesh.position.copy(position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.8
      ));
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 7, 3 + Math.random() * 5, (Math.random() - 0.5) * 7
        ),
        life: 0.5 + Math.random() * 0.4,
      });
    }
  }

  _updateParticles(delta) {
    this.particles = this.particles.filter(p => {
      p.life -= delta;
      p.vel.y -= 14 * delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.rotation.x += delta * 6;
      p.mesh.rotation.z += delta * 4;
      if (p.life <= 0) { this.scene.remove(p.mesh); return false; }
      return true;
    });
  }

  // ─── Camera ──────────────────────────────────────────────────────────────

  _updateCamera(delta) {
    const target = this.player.position.clone().add(this._camOffset);
    this.camera.position.lerp(target, 1 - Math.pow(0.02, delta));
    this.camera.lookAt(this.player.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
  }

  // ─── Main loop ───────────────────────────────────────────────────────────

  _animate() {
    requestAnimationFrame(() => this._animate());
    const delta   = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    const gameActive = !this.ui.gameOver && !this.ui.victory;
    const paused = this.inventory._visible || this.debugPanel.visible;

    if (gameActive && !paused) {
      const touchMove = this.mobile.enabled ? this.mobile.movement : null;
      this.player.update(delta, this.keys, this.camera, this.dungeon, touchMove);

      this.enemies.forEach(enemy => {
        enemy.update(delta, this.player, this.dungeon, this.camera);

        if (!enemy.dead && !this.player.dead) {
          const dist = enemy.group.position.distanceTo(this.player.position);
          if (dist < enemy.attackRange && enemy.canAttack()) {
            this.player.takeDamage(enemy.attackDamage);
          }
        }

        if (enemy.justDied) {
          enemy.justDied = false;
          this._spawnParticles(enemy.group.position);
          this._spawnLoot(enemy.group.position);
        }
      });

      // Remove finished death animations
      this.enemies = this.enemies.filter(e => {
        if (e.dead && e.deathTimer <= 0) { this.scene.remove(e.group); return false; }
        return true;
      });

      this._updateParticles(delta);
      this._updateLoot(elapsed);

      if (this.player.health <= 0) {
        this.ui.showGameOver();
      } else if (this._totalEnemies > 0 && this.enemies.length === 0) {
        if (this._level < 2) {
          this._saveProgress(this._level + 1);
          this.ui.showLevelComplete(this._level, () => location.reload());
        } else {
          localStorage.removeItem(SAVE_KEY);
          this.ui.showVictory();
        }
      }
    }

    this.dungeonMap.update(this.player.position, this.player.facingAngle, this.enemies);

    this.dungeon.animateTorches(elapsed);
    this._updateCamera(delta);

    if (this._potionCooldownLeft > 0) {
      this._potionCooldownLeft = Math.max(0, this._potionCooldownLeft - delta);
      this.ui.setPotionCooldown(this._potionCooldownLeft, this._potionCooldownMax);
    }

    this.ui.setDashCooldown(this.player.dashCooldownLeft, this.player.dashCooldown);
    this.ui.updateCoins();

    const liveEnemies = this.enemies.filter(e => !e.dead).length;
    this.ui.update(liveEnemies);

    this.renderer.render(this.scene, this.camera);
  }
}
