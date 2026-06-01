import * as THREE from 'three';

const DETECT_RANGE  = 22;
const IDEAL_RANGE   = 10;
const RETREAT_RANGE = 5;
const ORB_SPEED     = 11;
const ORB_DAMAGE    = 12;

export class CyCarrot {
  constructor(scene, position) {
    this.health         = 50 + Math.floor(Math.random() * 30);
    this.maxHealth      = this.health;
    this.speed          = 1.8 + Math.random() * 0.8;
    this.attackRange    = 0;   // no melee — Game.js skips the melee check
    this.attackDamage   = 0;
    this.dead           = false;
    this.justDied       = false;
    this.deathTimer     = 1.2;
    this._scene         = scene;
    this._shootInterval = 2.2 + Math.random() * 1.2;
    this._lastShot      = -(Math.random() * 2);  // stagger first shots
    this._aimTimer      = 0;
    this._orbs          = [];
    this._walkCycle     = Math.random() * Math.PI * 2;

    this._build(scene, position);
    this._buildHealthBar(scene);
  }

  _build(scene, position) {
    this.group = new THREE.Group();

    const bodyMat   = new THREE.MeshLambertMaterial({ color: 0x7799bb });
    const darkMat   = new THREE.MeshLambertMaterial({ color: 0x223344 });
    const leafMat   = new THREE.MeshLambertMaterial({ color: 0x33bbcc });
    const accentMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    const glowMat   = new THREE.MeshBasicMaterial({ color: 0x22ddff });

    const s = (geo, mat) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      return m;
    };

    // Body: same cone shape, metallic blue-gray
    const body = s(new THREE.CylinderGeometry(0.42, 0.04, 1.32, 5), bodyMat);
    body.position.y = 0.86;
    this.group.add(body);

    // Two glowing accent rings
    [0.92, 1.26].forEach(ry => {
      const ring = s(new THREE.CylinderGeometry(0.45, 0.45, 0.07, 12), accentMat);
      ring.position.y = ry;
      this.group.add(ring);
    });

    // Cyber teal leaves
    const leafData = [
      [0,    0,    0,    0   ],
      [-0.1, 0,    0.08, 0.28],
      [0.12, 0,   -0.06, -0.24],
      [-0.06,0,  -0.12,  0.22],
      [0.08, 0,    0.10, -0.18],
    ];
    leafData.forEach(([ox, , oz, rz], i) => {
      const leaf = s(new THREE.ConeGeometry(0.09 - i * 0.008, 0.40 - i * 0.03, 5), leafMat);
      leaf.position.set(ox, 1.66 + i * 0.04, oz);
      leaf.rotation.z = rz;
      this.group.add(leaf);
    });

    // Glowing blue LED eyes
    [-0.13, 0.13].forEach(ex => {
      const eye = s(new THREE.BoxGeometry(0.15, 0.09, 0.05), glowMat);
      eye.position.set(ex, 1.16, 0.30);
      this.group.add(eye);
      const brow = s(new THREE.BoxGeometry(0.15, 0.04, 0.04), darkMat);
      brow.position.set(ex, 1.26, 0.30);
      this.group.add(brow);
    });

    // Neutral flat mouth
    const mouth = s(new THREE.BoxGeometry(0.22, 0.04, 0.04), darkMat);
    mouth.position.set(0, 0.94, 0.31);
    this.group.add(mouth);

    // Left arm
    this._leftArmPivot = new THREE.Group();
    this._leftArmPivot.position.set(-0.30, 1.08, 0);
    const leftCyl = s(new THREE.CylinderGeometry(0.04, 0.04, 0.58, 5), darkMat);
    leftCyl.rotation.z = Math.PI / 2;
    leftCyl.position.x = -0.29;
    this._leftArmPivot.add(leftCyl);
    this.group.add(this._leftArmPivot);

    // Right arm with plasma cannon
    this._rightArmPivot = new THREE.Group();
    this._rightArmPivot.position.set(0.30, 1.08, 0);
    const rightCyl = s(new THREE.CylinderGeometry(0.04, 0.04, 0.58, 5), darkMat);
    rightCyl.rotation.z = Math.PI / 2;
    rightCyl.position.x = 0.29;
    this._rightArmPivot.add(rightCyl);

    // Cannon barrel
    const barrel = s(new THREE.CylinderGeometry(0.06, 0.09, 0.30, 8), accentMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.x = 0.66;
    this._rightArmPivot.add(barrel);

    // Glowing tip
    const tip = s(new THREE.SphereGeometry(0.08, 8, 6), glowMat);
    tip.position.x = 0.84;
    this._rightArmPivot.add(tip);
    this.group.add(this._rightArmPivot);

    // Legs
    const makeLeg = (xOff) => {
      const g = new THREE.Group();
      g.position.set(xOff, 0.26, 0);
      const stick = s(new THREE.CylinderGeometry(0.038, 0.038, 0.52, 5), darkMat);
      stick.position.y = -0.26;
      g.add(stick);
      [-0.09, 0.09].forEach(tx => {
        const toe = s(new THREE.CylinderGeometry(0.028, 0.02, 0.18, 4), darkMat);
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

    this._materials = [{ mat: bodyMat, origColor: bodyMat.color.clone() }];

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

  canAttack() { return false; }

  takeDamage(amount) {
    if (this.dead) return;
    this.health = Math.max(0, this.health - amount);
    this._materials.forEach(({ mat }) => mat.color.set(0xffffff));
    setTimeout(() => {
      this._materials.forEach(({ mat, origColor }) => mat.color.copy(origColor));
    }, 150);

    if (this.health <= 0) {
      this.dead     = true;
      this.justDied = true;
      this.deathTimer = 1.2;
      if (this._hbGroup) { this._scene.remove(this._hbGroup); this._hbGroup = null; }
      this._orbs.forEach(o => this._scene.remove(o.mesh));
      this._orbs = [];
    }
  }

  _shoot(targetPos) {
    const origin = this.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
    const dir = new THREE.Vector3().subVectors(targetPos, origin);
    dir.y = 0;
    if (dir.length() < 0.01) return;
    dir.normalize();

    const orbMat = new THREE.MeshBasicMaterial({ color: 0x22ddff });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), orbMat);
    orb.position.copy(origin);
    this._scene.add(orb);

    this._orbs.push({ mesh: orb, vel: dir.multiplyScalar(ORB_SPEED), life: 3.0 });
    this._aimTimer = 0.35;
  }

  _updateOrbs(delta, player, dungeon) {
    this._orbs = this._orbs.filter(o => {
      o.life -= delta;
      o.mesh.position.addScaledVector(o.vel, delta);
      o.mesh.rotation.x += delta * 4;

      // Wall collision
      if (!dungeon.isWalkable(o.mesh.position.x, o.mesh.position.z)) {
        this._scene.remove(o.mesh);
        return false;
      }

      // Player hit — use XZ-only distance since orbs travel horizontally at Y≈1.1
      const dx = o.mesh.position.x - player.mesh.position.x;
      const dz = o.mesh.position.z - player.mesh.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 0.85) {
        player.takeDamage(ORB_DAMAGE);
        this._scene.remove(o.mesh);
        return false;
      }

      if (o.life <= 0) {
        this._scene.remove(o.mesh);
        return false;
      }
      return true;
    });
  }

  update(delta, player, dungeon, camera) {
    if (this.dead) {
      this.deathTimer -= delta;
      this.group.rotation.x = Math.min(this.group.rotation.x + delta * 2.8, Math.PI * 0.5);
      this.group.position.y = Math.max(-0.5, this.group.position.y - delta * 0.4);
      return;
    }

    if (!player.dead) this._updateOrbs(delta, player, dungeon);

    const dist = this.group.position.distanceTo(player.mesh.position);
    const now  = performance.now() / 1000;

    // Arm aim/recoil animation
    this._aimTimer = Math.max(0, this._aimTimer - delta);
    this._rightArmPivot.rotation.x += (
      (this._aimTimer > 0 ? -0.9 : 0) - this._rightArmPivot.rotation.x
    ) * Math.min(1, delta * 12);

    if (dist < DETECT_RANGE) {
      // Face player
      const dir = new THREE.Vector3().subVectors(player.mesh.position, this.group.position);
      dir.y = 0;
      if (dir.length() > 0.01) this.group.rotation.y = Math.atan2(dir.x, dir.z);

      if (dist < RETREAT_RANGE) {
        // Back away
        dir.normalize();
        const nx = this.group.position.x - dir.x * this.speed * delta;
        const nz = this.group.position.z - dir.z * this.speed * delta;
        if (dungeon.isWalkable(nx, this.group.position.z)) this.group.position.x = nx;
        if (dungeon.isWalkable(this.group.position.x, nz)) this.group.position.z = nz;
      } else if (dist > IDEAL_RANGE) {
        // Approach to ideal range
        dir.normalize();
        const spd = this.speed * 0.65 * delta;
        const nx = this.group.position.x + dir.x * spd;
        const nz = this.group.position.z + dir.z * spd;
        if (dungeon.isWalkable(nx, this.group.position.z)) this.group.position.x = nx;
        if (dungeon.isWalkable(this.group.position.x, nz)) this.group.position.z = nz;
      }

      // Shoot when in range
      if (!player.dead && now - this._lastShot >= this._shootInterval) {
        this._lastShot = now;
        this._shoot(player.mesh.position.clone());
      }

      // Walk cycle
      this._walkCycle += delta * 5;
      const w = Math.sin(this._walkCycle) * 0.3;
      this._leftLeg.rotation.x  =  w;
      this._rightLeg.rotation.x = -w;
      this._leftArmPivot.rotation.x = -w * 0.3;
    } else {
      // Idle hover
      this._walkCycle += delta * 1.5;
      this.group.position.y = Math.sin(this._walkCycle) * 0.04;
    }

    // Billboard health bar
    if (this._hbGroup && camera) {
      this._hbGroup.position.copy(this.group.position);
      this._hbGroup.position.y = 2.7;
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
