import * as THREE from 'three';

const DETECT_RANGE          = 40;
const BLAST_INTERVAL        = 3.5;
const BLAST_SPEED           = 11;
const BLAST_DAMAGE          = 25;
const BLAST_RADIUS          = 0.42;
const FREEZE_DURATION       = 5;
const CONFUSION_DURATION    = 10;
const LASER_WARN_DURATION   = 3.0;
const LASER_HIDE_BEFORE     = 0.75; // warning beam vanishes this many seconds before firing
const LASER_ACTIVE_DURATION = 2.0;
const LASER_DAMAGE          = 40;
const LASER_HIT_RADIUS      = 0.9;  // perpendicular distance for hit
const LASER_FAR             = 200;  // extend beam to map edge

export class WizardCarrot {
  constructor(scene, position) {
    this.health       = 1000;
    this.maxHealth    = 1000;
    this.attackRange  = 0;
    this.attackDamage = 0;
    this.dead         = false;
    this.justDied     = false;
    this.deathTimer   = 2.0;
    this._scene       = scene;
    this._lastShot    = 2.0; // short delay before first shot
    this._orbs        = [];
    this._bobCycle    = 0;
    this._shootAnim   = 0;
    this._attackPhase    = 0;  // 0=ice, 1=confusion, 2=laser; cycles
    this._speed      = 0.65;
    this._laserState = null; // null | 'warning' | 'active'
    this._laserTimer = 0;
    this._laserMesh  = null;
    this._laserDirX  = 0;
    this._laserDirZ  = 1;
    this._laserHit   = false;

    this._build(scene, position);
    this._buildHealthBar(scene);
  }

  _build(scene, position) {
    this.group = new THREE.Group();

    const orange  = new THREE.MeshLambertMaterial({ color: 0xee6600 });
    const purple  = new THREE.MeshLambertMaterial({ color: 0x6633aa });
    const dpurple = new THREE.MeshLambertMaterial({ color: 0x331166 });
    const white   = new THREE.MeshLambertMaterial({ color: 0xeeeedd });
    const eyeMat  = new THREE.MeshBasicMaterial({ color: 0x44ddff });
    const staffWd = new THREE.MeshLambertMaterial({ color: 0x7a4a18 });
    const crystal = new THREE.MeshBasicMaterial({ color: 0x55eeff });
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffee44 });
    const leaf    = new THREE.MeshLambertMaterial({ color: 0x228844 });

    const s = (geo, mat) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      return m;
    };

    // Robe base — wide flare
    const robeBase = s(new THREE.CylinderGeometry(0.82, 0.95, 0.70, 10), dpurple);
    robeBase.position.y = 0.45;
    this.group.add(robeBase);

    // Robe body
    const robeBody = s(new THREE.CylinderGeometry(0.60, 0.82, 1.10, 10), purple);
    robeBody.position.y = 1.25;
    this.group.add(robeBody);

    // Carrot head/face (orange)
    const head = s(new THREE.CylinderGeometry(0.44, 0.48, 0.58, 8), orange);
    head.position.y = 2.10;
    this.group.add(head);

    // Beard
    const beard = s(new THREE.ConeGeometry(0.30, 0.62, 7), white);
    beard.rotation.x = Math.PI;
    beard.position.set(0, 1.72, 0.16);
    this.group.add(beard);

    // Eyes (ice blue)
    [-0.15, 0.15].forEach(ex => {
      const eye = s(new THREE.BoxGeometry(0.13, 0.10, 0.05), eyeMat);
      eye.position.set(ex, 2.18, 0.42);
      this.group.add(eye);
    });

    // Eyebrows
    [-0.15, 0.15].forEach(ex => {
      const brow = s(new THREE.BoxGeometry(0.14, 0.04, 0.04), dpurple);
      brow.position.set(ex, 2.30, 0.42);
      this.group.add(brow);
    });

    // Wizard hat brim
    const brim = s(new THREE.CylinderGeometry(0.72, 0.72, 0.10, 12), dpurple);
    brim.position.y = 2.50;
    this.group.add(brim);

    // Wizard hat cone
    const hat = s(new THREE.ConeGeometry(0.46, 1.35, 8), purple);
    hat.position.y = 3.22;
    this.group.add(hat);

    // Stars on hat
    [[0, 2.70, 0.40], [-0.25, 2.95, 0.32], [0.22, 3.10, 0.28]].forEach(([x, y, z]) => {
      const star = s(new THREE.OctahedronGeometry(0.075), starMat);
      star.position.set(x, y, z);
      this.group.add(star);
    });

    // Leaves sprouting from hat tip
    [0, 1.3, 2.6, 3.9].forEach((rot, i) => {
      const lf = s(new THREE.ConeGeometry(0.07 - i * 0.008, 0.34 - i * 0.025, 5), leaf);
      lf.position.set(Math.sin(rot) * 0.06, 3.92 + i * 0.04, Math.cos(rot) * 0.06);
      lf.rotation.z = (Math.random() - 0.5) * 0.4;
      this.group.add(lf);
    });

    // Left arm
    const leftArm = s(new THREE.CylinderGeometry(0.055, 0.055, 0.65, 5), purple);
    leftArm.rotation.z = -Math.PI / 2;
    leftArm.position.set(-0.80, 1.72, 0);
    this.group.add(leftArm);

    // Right arm pivot (holds staff)
    this._staffPivot = new THREE.Group();
    this._staffPivot.position.set(0.55, 1.72, 0);
    const rightArm = s(new THREE.CylinderGeometry(0.055, 0.055, 0.65, 5), purple);
    rightArm.rotation.z = Math.PI / 2;
    rightArm.position.x = 0.32;
    this._staffPivot.add(rightArm);

    // Staff handle
    const staffHandle = s(new THREE.CylinderGeometry(0.040, 0.040, 1.7, 6), staffWd);
    staffHandle.position.set(0.68, 0.38, 0);
    this._staffPivot.add(staffHandle);

    // Crystal orb on staff tip
    this._staffOrb = s(new THREE.SphereGeometry(0.18, 10, 8), crystal);
    this._staffOrb.position.set(0.68, 1.25, 0);
    this._staffPivot.add(this._staffOrb);

    this.group.add(this._staffPivot);

    this._materials = [
      { mat: orange, origColor: orange.color.clone() },
      { mat: purple, origColor: purple.color.clone() },
    ];

    // Start floating above ground
    this.group.position.copy(position);
    this.group.position.y = 0.3;
    scene.add(this.group);
    this.mesh = this.group;
  }

  _buildHealthBar(scene) {
    this._hbGroup = new THREE.Group();

    // Boss bar is wider than regular enemies
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.34),
      new THREE.MeshBasicMaterial({ color: 0x110022, depthTest: false })
    );
    this._hbGroup.add(bg);

    this._hbFgMat = new THREE.MeshBasicMaterial({ color: 0x5533dd, depthTest: false });
    this._hbFg = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.34), this._hbFgMat);
    this._hbFg.position.z = 0.005;
    this._hbGroup.add(this._hbFg);

    this._hbGroup.renderOrder = 999;
    scene.add(this._hbGroup);
  }

  get position() { return this.group.position; }
  canAttack()    { return false; }

  takeDamage(amount) {
    if (this.dead) return;
    this.health = Math.max(0, this.health - amount);
    this._materials.forEach(({ mat }) => mat.color.set(0xffffff));
    setTimeout(() => {
      this._materials.forEach(({ mat, origColor }) => mat.color.copy(origColor));
    }, 150);

    if (this.health <= 0) {
      this.dead       = true;
      this.justDied   = true;
      this.deathTimer = 2.0;
      if (this._hbGroup)  { this._scene.remove(this._hbGroup);  this._hbGroup  = null; }
      if (this._laserMesh){ this._scene.remove(this._laserMesh); this._laserMesh = null; }
      this._laserState = null;
      this._orbs.forEach(o => this._scene.remove(o.mesh));
      this._orbs = [];
    }
  }

  _shoot(type, targetPos) {
    const angle       = this.group.rotation.y;
    const worldOrigin = this.group.position.clone().add(new THREE.Vector3(
      0.68 * Math.sin(angle),
      1.6,
      0.68 * Math.cos(angle)
    ));
    worldOrigin.y += this.group.position.y;

    const dir = new THREE.Vector3().subVectors(targetPos, worldOrigin);
    dir.y = 0;
    if (dir.length() < 0.01) return;
    dir.normalize();

    const color = type === 'ice' ? 0x99ddff : 0xcc44ff;
    const mat   = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82 });
    const orb   = new THREE.Mesh(new THREE.SphereGeometry(BLAST_RADIUS, 10, 8), mat);
    orb.position.copy(worldOrigin);
    this._scene.add(orb);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(BLAST_RADIUS * 0.40, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    orb.add(core);

    this._orbs.push({ mesh: orb, vel: dir.multiplyScalar(BLAST_SPEED), life: 6.0, type });
    this._shootAnim = 0.4;
  }

  _updateOrbs(delta, player, dungeon) {
    this._orbs = this._orbs.filter(o => {
      o.life -= delta;
      o.mesh.position.addScaledVector(o.vel, delta);
      o.mesh.rotation.y += delta * 4;

      if (!dungeon.isWalkable(o.mesh.position.x, o.mesh.position.z)) {
        this._scene.remove(o.mesh);
        return false;
      }

      const dx  = o.mesh.position.x - player.mesh.position.x;
      const dz  = o.mesh.position.z - player.mesh.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.0) {
        const alreadyAffected = o.type === 'ice' ? player.frozen : player.confused;
        if (alreadyAffected) {
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          player.knockback(-dx / len, -dz / len, 5);
        } else if (o.type === 'ice') {
          player.takeDamage(BLAST_DAMAGE);
          player.freeze(FREEZE_DURATION);
        } else {
          player.takeDamage(BLAST_DAMAGE);
          player.confuse(CONFUSION_DURATION);
        }
        this._scene.remove(o.mesh);
        return false;
      }

      if (o.life <= 0) { this._scene.remove(o.mesh); return false; }
      return true;
    });
  }

  update(delta, player, dungeon, camera) {
    if (this.dead) {
      this.deathTimer -= delta;
      this.group.rotation.x = Math.min(this.group.rotation.x + delta * 1.5, Math.PI * 0.5);
      this.group.position.y = Math.max(-0.5, this.group.position.y - delta * 0.25);
      return;
    }

    if (!player.dead) this._updateOrbs(delta, player, dungeon);

    const now  = performance.now() / 1000;
    const dist = this.group.position.distanceTo(player.mesh.position);

    // Always face player
    const dir = new THREE.Vector3().subVectors(player.mesh.position, this.group.position);
    dir.y = 0;
    if (dir.length() > 0.01) this.group.rotation.y = Math.atan2(dir.x, dir.z);

    // Hover bob
    this._bobCycle += delta * 1.1;
    this.group.position.y = 0.3 + Math.sin(this._bobCycle) * 0.14;

    // Glide toward player (pause during laser so aim stays readable)
    if (!this._laserState && dist > 2.5 && dist < DETECT_RANGE) {
      const nx = this.group.position.x + dir.x * this._speed * delta;
      const nz = this.group.position.z + dir.z * this._speed * delta;
      if (dungeon.isWalkable(nx, this.group.position.z)) this.group.position.x = nx;
      if (dungeon.isWalkable(this.group.position.x, nz)) this.group.position.z = nz;
    }

    // Staff orb pulse / shoot recoil
    if (this._staffOrb) {
      this._shootAnim = Math.max(0, this._shootAnim - delta * 4);
      const pulse = 1.0 + Math.sin(now * 3.5) * 0.12 + this._shootAnim * 0.6;
      this._staffOrb.scale.setScalar(pulse);
      this._staffPivot.rotation.x = -this._shootAnim * 0.5;
    }

    // Attack logic — laser takes full priority when active
    if (this._laserState) {
      this._updateLaser(delta, player);
    } else if (dist < DETECT_RANGE && !player.dead) {
      if (now - this._lastShot >= BLAST_INTERVAL) {
        this._lastShot = now;
        if (this._attackPhase === 2) {
          this._startLaser(player.mesh.position);
        } else {
          const type = this._attackPhase === 0 ? 'ice' : 'confusion';
          this._shoot(type, player.mesh.position.clone());
          this._attackPhase = (this._attackPhase + 1) % 3;
        }
      }
    }

    // Health bar billboard
    if (this._hbGroup && camera) {
      this._hbGroup.position.copy(this.group.position);
      this._hbGroup.position.y = 5.2;
      this._hbGroup.quaternion.copy(camera.quaternion);

      const ratio = this.health / this.maxHealth;
      this._hbFg.scale.x    = Math.max(0.001, ratio);
      this._hbFg.position.x = -(1 - ratio) * 1.4;

      // Purple → red as health drops
      this._hbFgMat.color.setRGB(0.4 + 0.4 * (1 - ratio), 0.1, 0.7 * ratio);
    }
  }

  // ── Laser helpers ─────────────────────────────────────────────────────────

  _startLaser(playerPos) {
    this._setLaserDir(playerPos);
    this._laserState = 'warning';
    this._laserTimer = LASER_WARN_DURATION;
    this._laserHit   = false;
    this._laserMesh  = this._makeLaserBeam(0.75, 0xff2200, 0.30);
    this._placeLaserBeam(this._laserMesh);
  }

  _setLaserDir(playerPos) {
    const dx = playerPos.x - this.group.position.x;
    const dz = playerPos.z - this.group.position.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0.01) { this._laserDirX = dx / len; this._laserDirZ = dz / len; }
  }

  _makeLaserBeam(radius, color, opacity) {
    // Unit cylinder (length 1) scaled to LASER_FAR each frame
    const geo  = new THREE.CylinderGeometry(radius, radius, 1, 12, 1);
    const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    this._scene.add(mesh);
    return mesh;
  }

  _placeLaserBeam(mesh) {
    const ox = this.group.position.x, oz = this.group.position.z;
    // Midpoint along the ray at LASER_FAR/2
    mesh.position.set(
      ox + this._laserDirX * LASER_FAR / 2,
      1.2,
      oz + this._laserDirZ * LASER_FAR / 2
    );
    mesh.scale.y = LASER_FAR;
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(this._laserDirX, 0, this._laserDirZ)
    );
  }

  _updateLaser(delta, player) {
    this._laserTimer -= delta;
    const playerPos = player.mesh.position;

    if (this._laserState === 'warning') {
      if (this._laserTimer > LASER_HIDE_BEFORE) {
        // Beam tracks player — direction still updating
        this._setLaserDir(playerPos);
        this._placeLaserBeam(this._laserMesh);
      } else if (this._laserMesh) {
        // Direction locked — hide beam, giving player time to escape
        this._scene.remove(this._laserMesh);
        this._laserMesh = null;
      }

      if (this._laserTimer <= 0) {
        // Fire blue laser in the locked direction
        this._laserMesh  = this._makeLaserBeam(0.50, 0x44aaff, 0.88);
        this._placeLaserBeam(this._laserMesh);
        this._laserState = 'active';
        this._laserTimer = LASER_ACTIVE_DURATION;
      }

    } else if (this._laserState === 'active') {
      if (!this._laserHit && !player.dead) {
        // Perpendicular distance from player to the semi-infinite ray
        const rx = playerPos.x - this.group.position.x;
        const rz = playerPos.z - this.group.position.z;
        const along = rx * this._laserDirX + rz * this._laserDirZ;
        if (along > 0) {  // player is in front of the wizard
          const perpX = rx - along * this._laserDirX;
          const perpZ = rz - along * this._laserDirZ;
          if (Math.sqrt(perpX * perpX + perpZ * perpZ) < LASER_HIT_RADIUS) {
            player.takeDamage(LASER_DAMAGE);
            this._laserHit = true;
          }
        }
      }

      if (this._laserTimer <= 0) {
        this._scene.remove(this._laserMesh);
        this._laserMesh   = null;
        this._laserState  = null;
        this._attackPhase = 0;
        this._lastShot    = performance.now() / 1000;
      }
    }
  }
}
