import * as THREE from 'three';
import { Dungeon } from './Dungeon.js';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { UI } from './UI.js';
import { Inventory } from './Inventory.js';
import { LootDrop } from './LootDrop.js';
import { randomDrop } from './Items.js';
import { MobileControls } from './MobileControls.js';
import { DungeonMap } from './DungeonMap.js';

const TILE = 3;
const ENEMY_COUNT = 12;
const LOOT_CHANCE = 0.5;

export class Game {
  constructor() {
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05040a);
    this.scene.fog = new THREE.Fog(0x05040a, 20, 80);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 200);
    this._camOffset = new THREE.Vector3(0, 19, 15);

    this.scene.add(new THREE.AmbientLight(0x8899bb, 1.6));
    this.scene.add(new THREE.HemisphereLight(0x334466, 0x553322, 1.2));

    this.clock = new THREE.Clock();
    this.particles = [];
    this.lootDrops = [];
    this._totalEnemies = 0;
  }

  _buildWorld() {
    this.dungeon = new Dungeon(this.scene, TILE);
    this.dungeon.generate(42, 42);

    const startPos = this.dungeon.getStartPosition();
    this.player = new Player(this.scene, startPos);

    const spawnPos = this.dungeon.getSpawnPositions(ENEMY_COUNT);
    this.enemies = spawnPos.map(p => new Enemy(this.scene, p));
    this._totalEnemies = this.enemies.length;

    this.ui = new UI();
    this.ui.init(this.player, this.camera);

    // Inventory
    this.inventory = new Inventory();
    this.inventory.onEquip = item => this.player.equip(item);

    // Make potion slot tappable on mobile
    this.ui.onPotionUse = () => this._usePotion();

    // Dungeon map overlay
    this.dungeonMap = new DungeonMap(this.dungeon);

    // Mobile controls (no-op on desktop)
    this.mobile = new MobileControls();
    if (this.mobile.enabled) {
      this.mobile.setCallbacks({
        onAttack:    () => this._playerAttack(),
        onPotion:    () => this._usePotion(),
        onInventory: () => this.inventory.toggle(),
        onMap:       () => this.dungeonMap.toggle(),
      });
    }

    const targetCamPos = startPos.clone().add(this._camOffset);
    this.camera.position.copy(targetCamPos);
    this.camera.lookAt(startPos.clone().add(new THREE.Vector3(0, 1, 0)));
  }

  _initInput() {
    this.keys = {};
    this._lastAttackTime = 0;
    this._potionCooldownMax = 20;
    this._potionCooldownLeft = 0;

    document.addEventListener('keydown', e => {
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
        const dmg = minD + Math.floor(Math.random() * (maxD - minD + 1));
        enemy.takeDamage(dmg);
        this.ui.showDamageAt(
          enemy.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)), dmg
        );
        if (enemy.dead) this.ui.addScore(100);
      }
    });
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
    const item = randomDrop();
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
    const colors = [0xccccaa, 0xddddcc, 0xaaaaaa, 0x888866];
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
    const paused = this.inventory._visible;

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

      if (this.player.health <= 0) this.ui.showGameOver();
      else if (this._totalEnemies > 0 && this.enemies.length === 0) this.ui.showVictory();
    }

    this.dungeonMap.update(this.player.position, this.player.facingAngle, this.enemies);

    this.dungeon.animateTorches(elapsed);
    this._updateCamera(delta);

    if (this._potionCooldownLeft > 0) {
      this._potionCooldownLeft = Math.max(0, this._potionCooldownLeft - delta);
      this.ui.setPotionCooldown(this._potionCooldownLeft, this._potionCooldownMax);
    }

    const liveEnemies = this.enemies.filter(e => !e.dead).length;
    this.ui.update(liveEnemies);

    this.renderer.render(this.scene, this.camera);
  }
}
