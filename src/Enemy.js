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

    const bone = () => new THREE.MeshLambertMaterial({ color: 0xcccab8 });
    const eye = new THREE.MeshBasicMaterial({ color: 0x44ff33 });

    const box = (w, h, d, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat instanceof THREE.Material ? mat : bone());
      m.castShadow = true;
      return m;
    };

    // Torso
    const torso = box(0.65, 0.9, 0.38);
    torso.position.y = 1.25;
    this.group.add(torso);

    // Head (skull shape)
    const head = box(0.58, 0.6, 0.58);
    head.position.y = 2.05;
    this.group.add(head);

    // Glowing eyes
    const eyeGeo = new THREE.BoxGeometry(0.11, 0.11, 0.08);
    const leftEye = new THREE.Mesh(eyeGeo, eye);
    leftEye.position.set(-0.15, 2.08, 0.3);
    this.group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eye);
    rightEye.position.set(0.15, 2.08, 0.3);
    this.group.add(rightEye);

    // Legs
    this._leftLeg = box(0.22, 0.78, 0.28);
    this._leftLeg.position.set(-0.17, 0.39, 0);
    this.group.add(this._leftLeg);

    this._rightLeg = box(0.22, 0.78, 0.28);
    this._rightLeg.position.set(0.17, 0.39, 0);
    this.group.add(this._rightLeg);

    // Arms
    this._leftArmPivot = new THREE.Group();
    this._leftArmPivot.position.set(-0.46, 1.65, 0);
    const leftArm = box(0.2, 0.75, 0.24);
    leftArm.position.y = -0.37;
    this._leftArmPivot.add(leftArm);
    this.group.add(this._leftArmPivot);

    this._rightArmPivot = new THREE.Group();
    this._rightArmPivot.position.set(0.46, 1.65, 0);
    const rightArm = box(0.2, 0.75, 0.24);
    rightArm.position.y = -0.37;
    this._rightArmPivot.add(rightArm);
    this.group.add(this._rightArmPivot);

    // Weapon: bone club
    const clubMat = new THREE.MeshLambertMaterial({ color: 0xb8a888 });
    const clubHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 6), clubMat);
    clubHandle.position.set(0, -0.78, 0.3);
    clubHandle.rotation.x = Math.PI * 0.2;
    this._rightArmPivot.add(clubHandle);

    const clubHead = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), clubMat);
    clubHead.position.set(0, -1.15, 0.5);
    this._rightArmPivot.add(clubHead);

    // Store all material instances for flash effect
    this._materials = [];
    this.group.traverse(child => {
      if (child.isMesh && child.material && child.material !== eye) {
        this._materials.push({ mat: child.material, origColor: child.material.color.clone() });
      }
    });

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
