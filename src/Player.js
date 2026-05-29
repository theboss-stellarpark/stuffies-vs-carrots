import * as THREE from 'three';

export class Player {
  constructor(scene, position) {
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 7;
    this.defense = 0;
    this.facingAngle = 0;
    this.attackAnim = 0;
    this.invincible = false;
    this.dead = false;
    this._walkCycle = 0;

    this._build(scene, position);
  }

  _build(scene, position) {
    this.group = new THREE.Group();

    // ── Materials (armor/pants swapped by equip system) ──
    this._armorMat = new THREE.MeshLambertMaterial({ color: 0xbb88ee }); // lavender body
    this._pantsMat = new THREE.MeshLambertMaterial({ color: 0xa070dd }); // slightly darker limbs
    const eyeDarkMat  = new THREE.MeshLambertMaterial({ color: 0x0e1a10 });
    const eyeGreenMat = new THREE.MeshBasicMaterial({ color: 0x33bb55 });
    const eyeShineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const noseMat     = new THREE.MeshLambertMaterial({ color: 0xd0a0f0 });
    const antennaMat  = new THREE.MeshLambertMaterial({ color: 0x9966cc });
    const stripeMat   = new THREE.MeshLambertMaterial({ color: 0x4466aa });
    const tipMat      = new THREE.MeshLambertMaterial({ color: 0xcc44cc });

    const s = (geo, mat) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      return m;
    };

    // ── Body (chubby oval sphere) ──
    const body = s(new THREE.SphereGeometry(0.50, 12, 9), this._armorMat);
    body.scale.set(0.78, 1.22, 0.80);
    body.position.y = 1.08;
    this.group.add(body);

    // ── Head (blends into body) ──
    const head = s(new THREE.SphereGeometry(0.43, 12, 9), this._armorMat);
    head.position.y = 1.84;
    this.group.add(head);

    // ── Ears: large forward-facing flat discs, like elephant ears ──
    // Z scale is very small so you see the full round face from the front.
    const innerEarMat = new THREE.MeshLambertMaterial({ color: 0xd0a0f0 });

    [-1, 1].forEach(side => {
      const x = side * 0.68;

      // Outer ear — triangular cone, flat side facing the head
      const outer = s(new THREE.ConeGeometry(0.36, 0.62, 3), this._armorMat);
      outer.scale.set(1.0, 1.0, 0.12);
      outer.rotation.y = side * Math.PI / 3;
      outer.position.set(x, 2.19, 0.0);
      this.group.add(outer);

      // Inner ear — smaller triangle, lighter colour, pushed slightly forward
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.40, 3), innerEarMat);
      inner.scale.set(1.0, 1.0, 0.10);
      inner.rotation.y = side * Math.PI / 3;
      inner.position.set(x, 2.24, 0.03);
      this.group.add(inner);
    });

    // ── Eyes (large shiny) ──
    const eyeGeo   = new THREE.SphereGeometry(0.135, 12, 10);
    const irisGeo  = new THREE.SphereGeometry(0.088, 10, 8);
    const shineGeo = new THREE.SphereGeometry(0.038, 7, 6);

    [[-0.2, 1.94, 0.38], [0.2, 1.94, 0.38]].forEach(([x, y, z], i) => {
      const outer = s(eyeGeo, eyeDarkMat);
      outer.position.set(x, y, z);
      this.group.add(outer);

      const iris = new THREE.Mesh(irisGeo, eyeGreenMat);
      iris.position.set(x, y, z + 0.07);
      this.group.add(iris);

      const shine = new THREE.Mesh(shineGeo, eyeShineMat);
      shine.position.set(x + (i === 0 ? 0.04 : -0.04), y + 0.04, z + 0.12);
      this.group.add(shine);
    });

    // ── Nose (small round bump) ──
    const nose = s(new THREE.SphereGeometry(0.1, 8, 7), noseMat);
    nose.scale.set(1, 0.8, 0.85);
    nose.position.set(0, 1.75, 0.45);
    this.group.add(nose);

    // ── Striped antennae ──
    const makeAntenna = (xOff) => {
      const g = new THREE.Group();
      g.position.set(xOff, 2.26, 0.0);
      g.rotation.z = xOff < 0 ? -0.22 : 0.22;

      // 4 alternating stripe segments
      [antennaMat, stripeMat, antennaMat, stripeMat].forEach((mat, i) => {
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.13, 7),
          mat
        );
        seg.position.y = i * 0.13 + 0.065;
        g.add(seg);
      });

      // Fuzzy ball tip
      const tip = s(new THREE.SphereGeometry(0.11, 9, 8), tipMat);
      tip.position.y = 4 * 0.13 + 0.11;
      g.add(tip);

      // Extra fuzz bumps on the tip
      [-0.06, 0.06, 0, 0].forEach((ox, i) => {
        const fuzz = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 6, 5),
          tipMat
        );
        fuzz.position.set(ox, 4 * 0.13 + 0.11 + (i < 2 ? 0.05 : 0.1), i >= 2 ? (i === 2 ? 0.06 : -0.06) : 0);
        g.add(fuzz);
      });

      return g;
    };
    this.group.add(makeAntenna(-0.21));
    this.group.add(makeAntenna(0.21));

    // ── Legs ──
    const legGeo = new THREE.BoxGeometry(0.32, 0.62, 0.32);
    this._leftLeg  = s(legGeo, this._pantsMat);
    this._leftLeg.position.set(-0.22, 0.56, 0);
    this.group.add(this._leftLeg);
    this._rightLeg = s(legGeo, this._pantsMat);
    this._rightLeg.position.set(0.22, 0.56, 0);
    this.group.add(this._rightLeg);

    // ── Striped feet ──
    const makeFoot = (xOff) => {
      const g = new THREE.Group();
      g.position.set(xOff, 0.2, 0.05);
      // Base
      g.add((() => { const m = s(new THREE.BoxGeometry(0.36, 0.24, 0.42), this._pantsMat); return m; })());
      // Stripes
      [-0.1, 0.06].forEach(zo => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.075, 0.075), stripeMat);
        stripe.position.set(0, -0.06, zo);
        g.add(stripe);
      });
      return g;
    };
    this.group.add(makeFoot(-0.22));
    this.group.add(makeFoot(0.22));

    // ── Arms (pivot at shoulder for swing animation) ──
    this._leftArmPivot = new THREE.Group();
    this._leftArmPivot.position.set(-0.54, 1.45, 0);
    const leftArm = s(new THREE.BoxGeometry(0.28, 0.52, 0.28), this._pantsMat);
    leftArm.position.y = -0.26;
    this._leftArmPivot.add(leftArm);
    this.group.add(this._leftArmPivot);

    this._rightArmPivot = new THREE.Group();
    this._rightArmPivot.position.set(0.54, 1.45, 0);
    const rightArm = s(new THREE.BoxGeometry(0.28, 0.52, 0.28), this._pantsMat);
    rightArm.position.y = -0.26;
    this._rightArmPivot.add(rightArm);
    this.group.add(this._rightArmPivot);

    // ── Default weapon ──
    this._weaponGroup = this._buildWeaponMesh({ shape: 'sword', color: 0xd0d0ee, guardColor: 0xaa8833 });
    this._rightArmPivot.add(this._weaponGroup);

    // ── Soft purple glow ──
    this._light = new THREE.PointLight(0x9966cc, 2.0, 10, 1.5);
    this._light.position.y = 1.5;
    this.group.add(this._light);

    this.group.position.copy(position);
    scene.add(this.group);
    this.mesh = this.group;
  }

  // ─── Equipment ──────────────────────────────────────────────────────────

  equip(item) {
    if (!item) return;
    if (item.type === 'weapon') {
      this._rightArmPivot.remove(this._weaponGroup);
      this._weaponGroup = this._buildWeaponMesh(item);
      this._rightArmPivot.add(this._weaponGroup);
    } else if (item.type === 'armor') {
      this.defense = item.defense || 0;
      this._armorMat.color.setHex(item.color    || 0xbb88ee);
      this._pantsMat.color.setHex(item.pantColor || item.color || 0xa070dd);
    }
  }

  _buildWeaponMesh(item) {
    const group = new THREE.Group();
    group.position.set(0, -0.9, 0);

    const mat  = new THREE.MeshLambertMaterial({ color: item.color     || 0xd0d0ee });
    const gmat = new THREE.MeshLambertMaterial({ color: item.guardColor || 0xaa8833 });
    const b = (w, h, d, m) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || mat);
      mesh.castShadow = true;
      return mesh;
    };

    switch (item.shape) {
      case 'greatsword': {
        const blade = b(0.13, 1.65, 0.08);
        blade.position.y = -0.82;
        const guard = b(0.52, 0.10, 0.12, gmat);
        group.add(blade, guard);
        break;
      }
      case 'axe': {
        const handle = b(0.10, 1.05, 0.10, gmat);
        handle.position.y = -0.52;
        const head = b(0.52, 0.48, 0.10);
        head.position.set(0.14, -0.82, 0);
        const spike = b(0.10, 0.22, 0.10);
        spike.position.set(-0.18, -0.6, 0);
        group.add(handle, head, spike);
        break;
      }
      case 'dagger': {
        const blade = b(0.07, 0.62, 0.06);
        blade.position.y = -0.31;
        const guard = b(0.22, 0.07, 0.09, gmat);
        group.add(blade, guard);
        break;
      }
      case 'mace': {
        const handle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.82, 6),
          gmat
        );
        handle.position.y = -0.41;
        const head = b(0.30, 0.30, 0.30);
        head.position.y = -0.97;
        const spike1 = b(0.44, 0.10, 0.10);
        spike1.position.y = -0.97;
        const spike2 = b(0.10, 0.10, 0.44);
        spike2.position.y = -0.97;
        group.add(handle, head, spike1, spike2);
        break;
      }
      default: { // sword
        const blade = b(0.08, 1.12, 0.06);
        blade.position.y = -0.56;
        const guard = b(0.36, 0.08, 0.10, gmat);
        group.add(blade, guard);
        break;
      }
    }
    return group;
  }

  // ─── Core ────────────────────────────────────────────────────────────────

  get position() { return this.group.position; }

  triggerAttack() { this.attackAnim = 1.0; }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  takeDamage(amount) {
    if (this.invincible || this.dead) return;
    const reduced = Math.max(1, amount - this.defense);
    this.health = Math.max(0, this.health - reduced);
    this.invincible = true;
    setTimeout(() => { this.invincible = false; }, 900);
    if (this.health <= 0) this.dead = true;
  }

  // touchMove: optional {x, y} from MobileControls (-1..1 each axis)
  update(delta, keys, camera, dungeon, touchMove = null) {
    if (this.dead) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    const move = new THREE.Vector3();
    if (keys['KeyW'] || keys['ArrowUp'])    move.add(forward);
    if (keys['KeyS'] || keys['ArrowDown'])  move.sub(forward);
    if (keys['KeyD'] || keys['ArrowRight']) move.add(right);
    if (keys['KeyA'] || keys['ArrowLeft'])  move.sub(right);

    // Joystick: screen-right → world-right, screen-up (-y) → world-forward
    if (touchMove) {
      const tx = touchMove.x, ty = touchMove.y;
      if (Math.abs(tx) > 0.08 || Math.abs(ty) > 0.08) {
        move.addScaledVector(right,    tx);
        move.addScaledVector(forward, -ty);   // screen +Y is down = world backward
      }
    }

    if (move.length() > 0) {
      move.normalize();
      this.facingAngle = Math.atan2(move.x, move.z);
      const nx = this.group.position.x + move.x * this.speed * delta;
      const nz = this.group.position.z + move.z * this.speed * delta;
      if (dungeon.isWalkable(nx, this.group.position.z)) this.group.position.x = nx;
      if (dungeon.isWalkable(this.group.position.x, nz)) this.group.position.z = nz;

      this._walkCycle += delta * 9;
      const w = Math.sin(this._walkCycle) * 0.38;
      this._leftLeg.rotation.x = w;
      this._rightLeg.rotation.x = -w;
      this._leftArmPivot.rotation.x = -w * 0.4;
    } else {
      this._leftLeg.rotation.x *= 0.8;
      this._rightLeg.rotation.x *= 0.8;
      this._leftArmPivot.rotation.x *= 0.8;
    }

    this.group.rotation.y = this.facingAngle;

    if (this.attackAnim > 0) {
      this.attackAnim -= delta * 5;
      const t = Math.max(0, this.attackAnim);
      this._rightArmPivot.rotation.x = -Math.PI * 0.75 * Math.sin(t * Math.PI);
      this._weaponGroup.rotation.x   =  Math.PI * 0.30 * Math.sin(t * Math.PI);
      if (this.attackAnim < 0) this.attackAnim = 0;
    } else {
      this._rightArmPivot.rotation.x *= 0.8;
    }

    const visible = !this.invincible || Math.floor(Date.now() / 80) % 2 === 0;
    this.group.visible = visible;
  }
}
