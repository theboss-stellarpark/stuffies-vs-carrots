import * as THREE from 'three';

const STATE = { IDLE: 0, CHASE: 1, ATTACK: 2 };

export class CarrotSoldier {
  constructor(scene, position) {
    this.health        = 120 + Math.floor(Math.random() * 40);
    this.maxHealth     = this.health;
    this.speed         = 2.0 + Math.random() * 1.0;
    this.attackDamage  = 8 + Math.floor(Math.random() * 6);
    this.attackCooldown = 1.0 + Math.random() * 0.5;
    this.detectionRange = 18;
    this.attackRange   = 2.6;   // slightly longer — spear reach
    this.dead          = false;
    this.justDied      = false;
    this.deathTimer    = 1.2;
    this._state        = STATE.IDLE;
    this._lastAttack   = 0;
    this._walkCycle    = Math.random() * Math.PI * 2;
    this._scene        = scene;

    this._build(scene, position);
    this._buildHealthBar(scene);
  }

  _build(scene, position) {
    this.group = new THREE.Group();

    const orangeMat  = new THREE.MeshLambertMaterial({ color: 0xdd5500 });
    const greenMat   = new THREE.MeshLambertMaterial({ color: 0x2a6a10 });
    const blackMat   = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const creamMat   = new THREE.MeshLambertMaterial({ color: 0xeeddaa });
    const spearMat   = new THREE.MeshLambertMaterial({ color: 0x7a4a1a });
    const bladeMat   = new THREE.MeshLambertMaterial({ color: 0xbbbbcc });

    const s = (geo, mat) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      return m;
    };

    // ── Orange carrot body ──
    const body = s(new THREE.CylinderGeometry(0.40, 0.05, 1.20, 5), orangeMat);
    body.position.y = 0.80;
    this.group.add(body);

    // ── Big green bush head (wide flattened blob) ──
    const bush = s(new THREE.SphereGeometry(0.58, 10, 8), greenMat);
    bush.scale.set(1.25, 0.95, 1.10);
    bush.position.y = 1.62;
    this.group.add(bush);

    // Extra green lumps for bushy texture
    [[-0.28, 1.82, 0.10], [0.30, 1.78, -0.06], [0.06, 1.96, 0.18], [-0.10, 1.70, -0.22]].forEach(([x, y, z]) => {
      const lump = s(new THREE.SphereGeometry(0.26 + Math.random() * 0.10, 8, 6), greenMat);
      lump.position.set(x, y, z);
      this.group.add(lump);
    });

    // ── Face (on the orange body below the bush) ──
    // Thick unibrow
    const brow = s(new THREE.BoxGeometry(0.34, 0.07, 0.05), blackMat);
    brow.position.set(0, 1.18, 0.35);
    brow.rotation.z = 0.08;
    this.group.add(brow);

    // Two fang teeth (cream coloured, pointing down)
    [-0.08, 0.08].forEach(tx => {
      const fang = s(new THREE.ConeGeometry(0.055, 0.16, 4), creamMat);
      fang.position.set(tx, 0.98, 0.36);
      fang.rotation.z = Math.PI;   // point downward
      this.group.add(fang);
    });

    // Frown mouth line
    [-0.10, 0.10].forEach((fx, i) => {
      const frown = s(new THREE.BoxGeometry(0.14, 0.045, 0.04), blackMat);
      frown.position.set(fx, 0.88, 0.36);
      frown.rotation.z = (i === 0 ? 1 : -1) * 0.55;
      this.group.add(frown);
    });

    // ── Stick legs with claw feet ──
    const makeLeg = (xOff) => {
      const g = new THREE.Group();
      g.position.set(xOff, 0.26, 0);
      const stick = s(new THREE.CylinderGeometry(0.040, 0.040, 0.54, 5), blackMat);
      stick.position.y = -0.27;
      g.add(stick);
      // Three-toed claw
      [-0.10, 0, 0.10].forEach((tx, i) => {
        const toe = s(new THREE.CylinderGeometry(0.026, 0.018, 0.20, 4), blackMat);
        toe.rotation.z = (i - 1) * 0.55;
        toe.position.set(tx * 0.9, -0.57, 0.04);
        g.add(toe);
      });
      return g;
    };

    this._leftLeg  = makeLeg(-0.12);
    this._rightLeg = makeLeg(0.12);
    this.group.add(this._leftLeg);
    this.group.add(this._rightLeg);

    // ── Left arm (stick, hanging) ──
    this._leftArmPivot = new THREE.Group();
    this._leftArmPivot.position.set(-0.32, 1.08, 0);
    const leftArm = s(new THREE.CylinderGeometry(0.038, 0.038, 0.56, 5), blackMat);
    leftArm.rotation.z = Math.PI / 2;
    leftArm.position.x = -0.28;
    this._leftArmPivot.add(leftArm);
    this.group.add(this._leftArmPivot);

    // ── Right arm holding spear ──
    this._rightArmPivot = new THREE.Group();
    this._rightArmPivot.position.set(0.32, 1.08, 0);
    const rightArm = s(new THREE.CylinderGeometry(0.038, 0.038, 0.56, 5), blackMat);
    rightArm.rotation.z = Math.PI / 2;
    rightArm.position.x = 0.28;
    this._rightArmPivot.add(rightArm);

    // Spear shaft
    const shaft = s(new THREE.CylinderGeometry(0.040, 0.032, 1.60, 6), spearMat);
    shaft.position.set(0.66, 0.35, 0);
    this._rightArmPivot.add(shaft);

    // Spear tip (triangular/diamond)
    const tip = s(new THREE.ConeGeometry(0.090, 0.38, 4), bladeMat);
    tip.position.set(0.66, 1.15, 0);
    tip.rotation.y = Math.PI / 4;  // rotate square base 45° for diamond look
    this._rightArmPivot.add(tip);

    this.group.add(this._rightArmPivot);

    // Flash-on-hit uses orange body
    this._materials = [{ mat: orangeMat, origColor: orangeMat.color.clone() }];

    this.group.position.copy(position);
    scene.add(this.group);
    this.mesh = this.group;
  }

  _buildHealthBar(scene) {
    this._hbGroup = new THREE.Group();

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x333333, depthTest: false })
    );
    this._hbGroup.add(bg);

    this._hbFgMat = new THREE.MeshBasicMaterial({ color: 0x44dd22, depthTest: false });
    this._hbFg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.22), this._hbFgMat);
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
    this._materials.forEach(({ mat }) => mat.color.set(0xff2200));
    setTimeout(() => {
      this._materials.forEach(({ mat, origColor }) => mat.color.copy(origColor));
    }, 150);

    if (this.health <= 0) {
      this.dead      = true;
      this.justDied  = true;
      this.deathTimer = 1.2;
      if (this._hbGroup) { this._scene.remove(this._hbGroup); this._hbGroup = null; }
    }
  }

  update(delta, player, dungeon, camera) {
    if (this.dead) {
      this.deathTimer -= delta;
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
      if (dir.length() > 0.01) this.group.rotation.y = Math.atan2(dir.x, dir.z);

      if (this._state === STATE.CHASE) {
        dir.normalize();
        const nx = this.group.position.x + dir.x * this.speed * delta;
        const nz = this.group.position.z + dir.z * this.speed * delta;
        if (dungeon.isWalkable(nx, this.group.position.z)) this.group.position.x = nx;
        if (dungeon.isWalkable(this.group.position.x, nz)) this.group.position.z = nz;

        this._walkCycle += delta * 6;
        const w = Math.sin(this._walkCycle) * 0.44;
        this._leftLeg.rotation.x  =  w;
        this._rightLeg.rotation.x = -w;
        this._leftArmPivot.rotation.x  = -w * 0.3;
      } else {
        // Attack wind-up — thrust spear forward
        this._walkCycle += delta * 3;
        this._rightArmPivot.rotation.x = Math.sin(this._walkCycle) * 0.6 - 0.3;
      }
    } else {
      // Idle
      this._walkCycle += delta * 1.5;
      this.group.position.y = Math.sin(this._walkCycle) * 0.04;
      this._leftLeg.rotation.x  *= 0.9;
      this._rightLeg.rotation.x *= 0.9;
    }

    // Billboard health bar
    if (this._hbGroup && camera) {
      this._hbGroup.position.copy(this.group.position);
      this._hbGroup.position.y = 3.0;   // taller enemy, raise bar a bit
      this._hbGroup.quaternion.copy(camera.quaternion);

      const ratio = this.health / this.maxHealth;
      this._hbFg.scale.x    = Math.max(0.001, ratio);
      this._hbFg.position.x = -(1 - ratio) * 0.60;

      const r = Math.min(1, 2 * (1 - ratio));
      const g = Math.min(1, 2 * ratio);
      this._hbFgMat.color.setRGB(r, g, 0);
    }
  }
}
