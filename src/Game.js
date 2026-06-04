import * as THREE from 'three';
import { Dungeon } from './Dungeon.js?v=3';
import { Player } from './Player.js?v=3';
import { Enemy } from './Enemy.js?v=3';
import { UI } from './UI.js?v=3';
import { Inventory } from './Inventory.js?v=3';
import { LootDrop } from './LootDrop.js?v=3';
import { randomDrop, randomDropL2, findItemById, scaleItem, SAVE_KEY, getMeta, saveMeta, WIZARD_WAND } from './Items.js?v=3';
import { MobileControls } from './MobileControls.js?v=3';
import { DungeonMap } from './DungeonMap.js?v=3';
import { CyCarrot } from './CyCarrot.js';
import { CarrotSoldier } from './CarrotSoldier.js';
import { WizardCarrot } from './WizardCarrot.js';
import { DebugPanel } from './DebugPanel.js';
import { getStartingAbilities } from './Abilities.js';

const TILE = 3;

const LEVELS = {
  1: { enemies: 24, cyCarrots: 12, soldiers: 0,  gridSize: 42 },
  2: { enemies: 20, cyCarrots: 20, soldiers: 20, gridSize: 52 },
  3: { enemies: 30, cyCarrots: 24, soldiers: 24, gridSize: 56 },
  4: { enemies: 35, cyCarrots: 28, soldiers: 28, gridSize: 60 },
  5: { enemies: 0,  cyCarrots: 0,  soldiers: 0,  gridSize: 32 },
};
const LOOT_CHANCE = 0.10;

const DIFFICULTY_CFG = {
  1: { hpMult: 1.0, dmgMult: 1.0 },
  2: { hpMult: 1.6, dmgMult: 1.3 },
  3: { hpMult: 2.5, dmgMult: 1.7 },
};
const DIFFICULTY_NAME = { 1: '', 2: 'Adventure', 3: 'Apocalypse' };

export class Game {
  constructor(level = 1, saveData = null, character = 'stuffy', difficulty = 1) {
    this._level      = level;
    this._saveData   = saveData;
    this._character  = character;
    this._difficulty = difficulty;
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
    if (this._level === 5) {
      this.dungeon.generateArena(cfg.gridSize, cfg.gridSize);
    } else {
      this.dungeon.generate(cfg.gridSize, cfg.gridSize);
    }

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

    // Scale enemy stats for higher difficulties
    if (this._difficulty > 1) {
      const { hpMult, dmgMult } = DIFFICULTY_CFG[this._difficulty];
      this.enemies.forEach(e => {
        e.health       = Math.round(e.health    * hpMult);
        e.maxHealth    = Math.round(e.maxHealth * hpMult);
        if (e.attackDamage > 0)
          e.attackDamage = Math.round(e.attackDamage * dmgMult);
      });
    }

    this._bossDoor = null;
    if (this._level === 5) {
      const bossPos = startPos.clone();
      bossPos.z -= 22;
      this.enemies.push(new WizardCarrot(this.scene, bossPos));
      this._buildBossDoor(startPos.x);
    }

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
    this.debugPanel = new DebugPanel(
      item => {
        if (item.type === 'weapon') this.inventory.equippedWeapon = item;
        else                        this.inventory.equippedArmor  = item;
        this.player.equip(item);
        if (this.inventory._visible) this.inventory._refresh();
      },
      level => {
        this._saveProgress();
        sessionStorage.setItem('debug_level', level);
        location.reload();
      }
    );

    // Mobile controls (no-op on desktop)
    this.mobile = new MobileControls(this.renderer.domElement);
    if (this.mobile.enabled) {
      this.mobile.setCallbacks({
        onAttack:    () => this._playerAttack(),
        onPotion:    () => this._usePotion(),
        onDash:      () => this._playerDash(),
        onInventory: () => this.inventory.toggle(),
        onMap:       () => this.dungeonMap.toggle(),
        onPause:     () => this.ui.togglePause(),
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
    const diffLabel = DIFFICULTY_NAME[this._difficulty];
    badge.textContent = diffLabel ? `LEVEL ${level}  ·  ${diffLabel.toUpperCase()}` : `LEVEL ${level}`;
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

  _saveProgress() {
    const save = {
      score:    this.ui.score,
      bagIds:   this.inventory.items.map(i => i.id),
      weaponId: this.inventory.equippedWeapon?.id ?? null,
      armorId:  this.inventory.equippedArmor?.id  ?? null,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  _markLevelCleared(level) {
    const meta = getMeta();
    if (!meta.clearedLevels.includes(level)) meta.clearedLevels.push(level);
    if (level === 5) {
      if (!meta.unlockedDifficulties) meta.unlockedDifficulties = [1];
      const next = this._difficulty + 1;
      if (next <= 3 && !meta.unlockedDifficulties.includes(next))
        meta.unlockedDifficulties.push(next);
    }
    saveMeta(meta);
  }

  _initInput() {
    this.keys = {};
    this._lastAttackTime = 0;
    this._potionCooldownMax = 20;
    this._potionCooldownLeft = 0;
    this._doubleTapTimes = {};

    // Ability cooldown tracking: map of abilityId → last-used clock time
    this._abilityCooldowns = {};
    this._abilities = getStartingAbilities(this._character);
    this._laserBeams = []; // active beam visuals

    const DOUBLE_TAP_MS = 250;
    const DASH_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];

    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;

      // Double-tap dash — skip key-repeat events
      if (DASH_KEYS.includes(e.code) && !e.repeat) {
        const now = performance.now();
        if (now - (this._doubleTapTimes[e.code] || 0) < DOUBLE_TAP_MS) {
          this._doubleTapTimes[e.code] = 0;
          this._playerDash(e.code);
        } else {
          this._doubleTapTimes[e.code] = now;
        }
      }

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
      if (e.code === 'KeyM') {
        e.preventDefault();
        this.ui.togglePause();
      }
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        e.preventDefault();
        this._useAbility('laser_blast');
      }
    });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
    document.addEventListener('click', () => {
      if (!this.inventory._visible) this._playerAttack();
    });
  }

  // ─── Combat ──────────────────────────────────────────────────────────────

  _playerAttack() {
    if (this.ui.gameOver || this.ui.victory || this.ui.paused || this.player.frozen) return;
    if (this.inventory._visible) return;

    const weapon   = this.inventory.equippedWeapon;
    const baseCooldown = weapon ? weapon.cooldown : 0.48;
    const cooldown = this._character === 'minty' ? baseCooldown * 0.90 : baseCooldown;
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
        const boost = this._character === 'slothy' ? 1.10 : this._character === 'minty' ? 1.05 : 1.0;
        const dmg = Math.floor((minD + Math.floor(Math.random() * (maxD - minD + 1))) * boost);
        enemy.takeDamage(dmg);
        this.ui.showDamageAt(
          enemy.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)), dmg
        );
        if (enemy.dead) this.ui.addScore(100);
      }
    });
  }

  _playerDash(keyCode = null) {
    if (this.ui.gameOver || this.ui.victory || this.ui.paused || this.player.dead || this.player.frozen) return;
    if (!this.player.canDash()) return;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    const dir = new THREE.Vector3();
    const src = keyCode ? { [keyCode]: true } : this.keys;
    if (src['KeyW'] || src['ArrowUp'])    dir.add(forward);
    if (src['KeyS'] || src['ArrowDown'])  dir.sub(forward);
    if (src['KeyD'] || src['ArrowRight']) dir.add(right);
    if (src['KeyA'] || src['ArrowLeft'])  dir.sub(right);
    if (dir.length() < 0.01)
      dir.set(Math.sin(this.player.facingAngle), 0, Math.cos(this.player.facingAngle));

    this.player.dash(dir);
    this._spawnDashParticles(this.player.position);
  }

  _usePotion() {
    if (this.ui.gameOver || this.ui.victory || this.ui.paused) return;
    if (this._potionCooldownLeft > 0 || this.player.dead) return;
    this.player.heal(40);
    this._potionCooldownLeft = this._potionCooldownMax;
    this.ui.setPotionCooldown(this._potionCooldownLeft, this._potionCooldownMax);
    this._spawnHealParticles(this.player.position);
  }

  // ─── Abilities ───────────────────────────────────────────────────────────

  _useAbility(id) {
    if (this.ui.gameOver || this.ui.victory || this.ui.paused || this.player.frozen || this.player.dead) return;
    if (this.inventory._visible) return;

    const ability = this._abilities.find(a => a.id === id);
    if (!ability) return;

    const now = this.clock.getElapsedTime();
    if (now - (this._abilityCooldowns[id] ?? -Infinity) < ability.cooldown) return;
    this._abilityCooldowns[id] = now;

    if (id === 'laser_blast') this._useLaserBlast(ability);
  }

  _useLaserBlast(ability) {
    const tips = this.player.getAntennaTips();
    const origins = tips ?? [this.player.position.clone().add(new THREE.Vector3(0, 1.2, 0))];
    const dir = new THREE.Vector3(
      Math.sin(this.player.facingAngle), 0,
      Math.cos(this.player.facingAngle)
    ).normalize();

    // Hit detection: use player position (XZ) as the ray anchor so both beams share one hit pass
    const hitOrigin = this.player.position.clone();
    this.enemies.forEach(enemy => {
      if (enemy.dead) return;
      const toEnemy = enemy.group.position.clone().sub(hitOrigin);
      toEnemy.y = 0;
      if (toEnemy.length() > ability.range) return;

      const along = toEnemy.dot(dir);
      if (along < 0) return;
      const perpSq = toEnemy.lengthSq() - along * along;
      if (perpSq > 1.6 * 1.6) return;

      const boost = this._character === 'slothy' ? 1.10 : this._character === 'minty' ? 1.05 : 1.0;
      const dmg = Math.floor(ability.damage * boost);
      enemy.takeDamage(dmg);
      this.ui.showDamageAt(
        enemy.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)), dmg
      );
      if (enemy.dead) {
        this.ui.addScore(100);
        this._spawnParticles(enemy.group.position);
        if (enemy instanceof WizardCarrot) {
          this.lootDrops.push(new LootDrop(this.scene, enemy.group.position.clone(), scaleItem(WIZARD_WAND, this._difficulty)));
          this._unlockBossDoor();
        } else {
          this._spawnLoot(enemy.group.position);
        }
      }
    });

    // Spawn one beam per antenna tip
    const beamLen = ability.range;
    const flashColors = [0x39ff14, 0xaaff44, 0xffffff];
    origins.forEach(origin => {
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x39ff14, transparent: true, opacity: 0.95,
      });
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, beamLen, 6),
        beamMat
      );
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      beam.position.copy(origin).addScaledVector(dir, beamLen / 2);
      this.scene.add(beam);
      this._laserBeams.push({ mesh: beam, mat: beamMat, life: 0.22 });

      // Muzzle flash at each tip
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.09, 0.09),
          new THREE.MeshBasicMaterial({ color: flashColors[i % flashColors.length] })
        );
        m.position.copy(origin).addScaledVector(dir, 0.5 + Math.random() * 0.8);
        m.position.x += (Math.random() - 0.5) * 0.3;
        m.position.z += (Math.random() - 0.5) * 0.3;
        this.scene.add(m);
        this.particles.push({
          mesh: m,
          vel: new THREE.Vector3(
            dir.x * (2 + Math.random() * 3) + (Math.random() - 0.5) * 1.5,
            1 + Math.random() * 2,
            dir.z * (2 + Math.random() * 3) + (Math.random() - 0.5) * 1.5
          ),
          life: 0.18 + Math.random() * 0.10,
        });
      }
    });
  }

  _updateLaserBeams(delta) {
    this._laserBeams = this._laserBeams.filter(b => {
      b.life -= delta;
      b.mat.opacity = Math.max(0, b.life / 0.22) * 0.95;
      if (b.life <= 0) { this.scene.remove(b.mesh); return false; }
      return true;
    });
  }

  // ─── Loot ────────────────────────────────────────────────────────────────

  _spawnLoot(position) {
    if (Math.random() > LOOT_CHANCE) return;
    const base = this._level >= 2 ? randomDropL2() : randomDrop();
    this.lootDrops.push(new LootDrop(this.scene, position.clone(), scaleItem(base, this._difficulty)));
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

  // ─── Boss door ───────────────────────────────────────────────────────────

  _buildBossDoor(arenaX) {
    const x = arenaX, z = 7;
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x334455 });

    // Two pillars
    [-2.3, 2.3].forEach(ox => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.8, 0.55), frameMat);
      pillar.position.set(x + ox, 2.4, z);
      this.scene.add(pillar);
    });

    // Lintel
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.45, 0.55), frameMat);
    lintel.position.set(x, 4.85, z);
    this.scene.add(lintel);

    // Portal fill — starts locked (dark red)
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0x880000, transparent: true, opacity: 0.55,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.5), portalMat);
    portal.position.set(x, 2.4, z);
    this.scene.add(portal);

    // Dim red point light while locked
    const light = new THREE.PointLight(0xff1100, 2.0, 14);
    light.position.set(x, 2.5, z);
    this.scene.add(light);

    this._bossDoor = { portalMat, light, unlocked: false, pos: new THREE.Vector3(x, 0, z) };
  }

  _unlockBossDoor() {
    if (!this._bossDoor || this._bossDoor.unlocked) return;
    this._bossDoor.unlocked = true;
    this._bossDoor.portalMat.color.set(0xffcc44);
    this._bossDoor.portalMat.opacity = 0.85;
    this._bossDoor.light.color.set(0xffeeaa);
    this._bossDoor.light.intensity = 6;
    this._bossDoor.light.distance  = 22;
    this.ui.showPickup({ name: 'Exit unlocked — reach the door!', icon: '🚪', rarity: 'rare' });
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
    const paused = this.inventory._visible || this.debugPanel.visible || this.ui.paused;

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
          if (enemy instanceof WizardCarrot) {
            this.lootDrops.push(new LootDrop(this.scene, enemy.group.position.clone(), scaleItem(WIZARD_WAND, this._difficulty)));
            this._unlockBossDoor();
          } else {
            this._spawnLoot(enemy.group.position);
          }
        }
      });

      // Remove finished death animations
      this.enemies = this.enemies.filter(e => {
        if (e.dead && e.deathTimer <= 0) { this.scene.remove(e.group); return false; }
        return true;
      });

      this._updateParticles(delta);
      this._updateLaserBeams(delta);
      this._updateLoot(elapsed);

      if (this.player.health <= 0) {
        this.ui.showGameOver();
      } else if (this._totalEnemies > 0 && this.enemies.length === 0) {
        this._markLevelCleared(this._level);
        if (this._level < 5) {
          this._saveProgress();
          this.ui.showLevelComplete(this._level, () => location.reload());
        }
        // Level 5: victory triggers when player walks through the boss door
      }

      // Boss door proximity check
      if (this._bossDoor?.unlocked && !this.player.dead) {
        if (this.player.position.distanceTo(this._bossDoor.pos) < 2.5) {
          this._saveProgress();
          this.ui.showVictory();
        }
      }
    }

    this.dungeonMap.update(this.player.position, this.player.facingAngle, this.enemies);

    if (this._bossDoor?.unlocked) {
      const pulse = 0.55 + Math.sin(elapsed * 4) * 0.30;
      this._bossDoor.portalMat.opacity  = Math.max(0.25, pulse);
      this._bossDoor.light.intensity    = 4 + Math.sin(elapsed * 3) * 2;
    }

    this.dungeon.animateTorches(elapsed);
    this._updateCamera(delta);

    if (this._potionCooldownLeft > 0 && !paused) {
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
