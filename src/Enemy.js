import * as THREE from 'three';

const STATE = { IDLE: 0, CHASE: 1, ATTACK: 2 };

export class Enemy {
  constructor(scene, position, type = 'skeleton') {
    this.health = 60 + Math.floor(Math.random() * 40);
    this.maxHealth = this.health;
    this.speed = 2.5 + Math.random() * 1.5;
    this.attackDamage = 3 + Math.floor(Math.random() * 4);
    this.attackCooldown = 1.1 + Math.random() * 0.6;
    this.detectionRange = 18;
    this.attackRange = 2.2;
    this.dead = false;
    this.justDied = false;
    this.deathTimer = 1.2;
    this._state = STATE.IDLE;
    this._lastAttack = 0;
    this._walkCycle = Math.random() * Math.PI * 2;
    this._scene = scene;
    this._type = type;

    this._build(scene, position);
    this._buildHealthBar(scene);
  }

  _build(scene, position) {
    this.group = new THREE.Group();

    const orangeMat = new THREE.MeshLambertMaterial({ color: 0xee5500 });
    const greenMat  = new THREE.MeshLambertMaterial({ color: 0x228800 });
    const blackMat  = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const whiteMat  = new THREE.MeshLambertMaterial({ color: 0xeeeeee });

    const s = (geo, mat) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      return m;
    };

    // ── Carrot body: wide at top, pointy at bottom ──
    const body = s(new THREE.CylinderGeometry(0.42, 0.04, 1.32, 5), orangeMat);
    body.position.y = 0.86;
    this.group.add(body);

    // ── Green leafy top (several cones splayed out) ──
    const leafData = [
      [0,    0,    0,    0   ],   // center, straight up
      [-0.1, 0,    0.08, 0.28],   // lean left-forward
      [0.12, 0,   -0.06, -0.24],  // lean right-back
      [-0.06,0,  -0.12,  0.22],   // lean left-back
      [0.08, 0,    0.10, -0.18],  // lean right-forward
    ];
    leafData.forEach(([ox, , oz, rz], i) => {
      const leaf = s(new THREE.ConeGeometry(0.09 - i * 0.008, 0.40 - i * 0.03, 5), greenMat);
      leaf.position.set(ox, 1.66 + i * 0.04, oz);
      leaf.rotation.z = rz;
      this.group.add(leaf);
    });

    // ── Face features (front of body, z ≈ +0.30) ──
    // Angry white eyes
    [-0.13, 0.13].forEach((ex, i) => {
      const eyeWhite = s(new THREE.BoxGeometry(0.15, 0.10, 0.05), whiteMat);
      eyeWhite.position.set(ex, 1.16, 0.30);
      this.group.add(eyeWhite);

      const pupil = s(new THREE.BoxGeometry(0.08, 0.07, 0.04), blackMat);
      pupil.position.set(ex, 1.14, 0.33);
      this.group.add(pupil);

      // Angry inward-tilted brow
      const brow = s(new THREE.BoxGeometry(0.17, 0.045, 0.04), blackMat);
      brow.position.set(ex, 1.25, 0.30);
      brow.rotation.z = (i === 0 ? 1 : -1) * 0.45;
      this.group.add(brow);
    });

    // Frown: two short angled bars forming a ∪ shape
    [-0.09, 0.09].forEach((fx, i) => {
      const frown = s(new THREE.BoxGeometry(0.13, 0.045, 0.04), blackMat);
      frown.position.set(fx, 0.94, 0.31);
      frown.rotation.z = (i === 0 ? 1 : -1) * 0.55;
      this.group.add(frown);
    });

    // ── Stick arms (thin cylinders, pivot at shoulder) ──
    this._leftArmPivot = new THREE.Group();
    this._leftArmPivot.position.set(-0.30, 1.08, 0);
    const leftArmCyl = s(new THREE.CylinderGeometry(0.04, 0.04, 0.58, 5), blackMat);
    leftArmCyl.rotation.z = Math.PI / 2;
    leftArmCyl.position.x = -0.29;
    this._leftArmPivot.add(leftArmCyl);
    this.group.add(this._leftArmPivot);

    this._rightArmPivot = new THREE.Group();
    this._rightArmPivot.position.set(0.30, 1.08, 0);
    const rightArmCyl = s(new THREE.CylinderGeometry(0.04, 0.04, 0.58, 5), blackMat);
    rightArmCyl.rotation.z = Math.PI / 2;
    rightArmCyl.position.x = 0.29;
    this._rightArmPivot.add(rightArmCyl);
    this.group.add(this._rightArmPivot);

    // Sword on right arm
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const guardMat = new THREE.MeshLambertMaterial({ color: 0x885522 });
    const blade = s(new THREE.BoxGeometry(0.08, 0.80, 0.06), bladeMat);
    blade.position.set(0.68, -0.1, 0.05);
    blade.rotation.z = -0.5;
    this._rightArmPivot.add(blade);
    const guard = s(new THREE.BoxGeometry(0.28, 0.07, 0.08), guardMat);
    guard.position.set(0.52, 0.22, 0.04);
    guard.rotation.z = -0.5;
    this._rightArmPivot.add(guard);

    // ── Stick legs with tiny forked feet ──
    const makeLeg = (xOff) => {
      const g = new THREE.Group();
      g.position.set(xOff, 0.26, 0);
      // Main stick
      const stick = s(new THREE.CylinderGeometry(0.038, 0.038, 0.52, 5), blackMat);
      stick.position.y = -0.26;
      g.add(stick);
      // Two small toe branches
      [-0.09, 0.09].forEach(tx => {
        const toe = s(new THREE.CylinderGeometry(0.028, 0.02, 0.18, 4), blackMat);
        toe.rotation.z = tx > 0 ? 0.7 : -0.7;
        toe.position.set(tx * 0.7, -0.55, 0.05);
        g.add(toe);
      });
      return g;
    };

    this._leftLeg  = makeLeg(-0.11);
    this._rightLeg = makeLeg(0.11);
    this.group.add(this._leftLeg);
    this.group.add(this._rightLeg);

    // Flash-on-hit: only the orange body
    this._materials = [{ mat: orangeMat, origColor: orangeMat.color.clone() }];

    this.group.position.copy(position);
    scene.add(this.group);
    this.mesh = this.group;
  }

  _buildHealthBar(scene) {
    this._hbGroup = new THREE.Group();

    const bgGeo = new THREE.PlaneGeometry(1.1, 0.14);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x220000, depthTest: false, transparent: true, opacity: 0.85 });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    this._hbGroup.add(bg);

    const fgGeo = new THREE.PlaneGeometry(1.1, 0.14);
    this._hbFgMat = new THREE.MeshBasicMaterial({ color: 0xdd2200, depthTest: false });
    this._hbFg = new THREE.Mesh(fgGeo, this._hbFgMat);
    this._hbFg.position.z = 0.005;
    this._hbGroup.add(this._hbFg);

    this._hbGroup.renderOrder = 999;
    scene.add(this._hbGroup);
  }

  get position() { return this.group.position; }

  canAttack() {
    const now = performance.now() / 1000;
    if (now - this._lastAttack >= this.attackCooldown) {
      this._lastAttack = now;
      return true;
    }
    return false;
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.health = Math.max(0, this.health - amount);
    // Flash white/red
    this._flashTimer = 0.15;
    this._materials.forEach(({ mat }) => mat.color.set(0xff2200));
    setTimeout(() => {
      this._materials.forEach(({ mat, origColor }) => mat.color.copy(origColor));
    }, 150);

    if (this.health <= 0) {
      this.dead = true;
      this.justDied = true;
      this.deathTimer = 1.2;
      if (this._hbGroup) {
        this._scene.remove(this._hbGroup);
        this._hbGroup = null;
      }
    }
  }

  update(delta, player, dungeon, camera) {
    if (this.dead) {
      this.deathTimer -= delta;
      // Fall/crumble animation
      this.group.rotation.x = Math.min(this.group.rotation.x + delta * 2.8, Math.PI * 0.5);
      this.group.position.y = Math.max(-0.5, this.group.position.y - delta * 0.4);
      return;
    }

    const dist = this.group.position.distanceTo(player.mesh.position);

    if (dist < this.detectionRange) {
      this._state = dist < this.attackRange ? STATE.ATTACK : STATE.CHASE;
    } else {
      this._state = STATE.IDLE;
    }

    if (this._state === STATE.CHASE || this._state === STATE.ATTACK) {
      const dir = new THREE.Vector3()
        .subVectors(player.mesh.position, this.group.position);
      dir.y = 0;

      // Face player
      if (dir.length() > 0.01) {
        this.group.rotation.y = Math.atan2(dir.x, dir.z);
      }

      if (this._state === STATE.CHASE) {
        dir.normalize();
        const nx = this.group.position.x + dir.x * this.speed * delta;
        const nz = this.group.position.z + dir.z * this.speed * delta;
        if (dungeon.isWalkable(nx, this.group.position.z)) this.group.position.x = nx;
        if (dungeon.isWalkable(this.group.position.x, nz)) this.group.position.z = nz;

        // Walk cycle
        this._walkCycle += delta * 7;
        const w = Math.sin(this._walkCycle) * 0.42;
        this._leftLeg.rotation.x = w;
        this._rightLeg.rotation.x = -w;
        this._leftArmPivot.rotation.x = -w * 0.4;
        this._rightArmPivot.rotation.x = w * 0.4;
      } else {
        // Attack wind-up sway
        this._walkCycle += delta * 3;
        this._rightArmPivot.rotation.x = Math.sin(this._walkCycle) * 0.5 - 0.3;
      }
    } else {
      // Idle breathing
      this._walkCycle += delta * 1.5;
      this.group.position.y = Math.sin(this._walkCycle) * 0.04;
      this._leftLeg.rotation.x *= 0.9;
      this._rightLeg.rotation.x *= 0.9;
    }

    // Billboard health bar
    if (this._hbGroup && camera) {
      this._hbGroup.position.copy(this.group.position);
      this._hbGroup.position.y = 2.7;
      this._hbGroup.quaternion.copy(camera.quaternion);

      const ratio = this.health / this.maxHealth;
      this._hbFg.scale.x = Math.max(0.001, ratio);
      this._hbFg.position.x = -(1 - ratio) * 0.55;

      // Color shift red as health drops
      if (ratio > 0.5) {
        this._hbFgMat.color.setRGB(0.6 + (1 - ratio) * 0.8, 0.2, 0.05);
      } else {
        this._hbFgMat.color.setRGB(0.85, 0.08, 0.05);
      }
    }
  }
}
