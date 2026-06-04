import * as THREE from 'three';

export class Player {
  constructor(scene, position, character = 'stuffy') {
    this._character = character;
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 7;
    this.defense = 0;
    this.facingAngle = 0;
    this._armorBody = null;
    this._armorPadL = null;
    this._armorPadR = null;
    this.attackAnim = 0;
    this.invincible = false;
    this.dead = false;
    this._walkCycle = 0;

    this._dashCooldown     = 2.5;
    this._dashCooldownLeft = 0;
    this._dashActive       = false;
    this._dashTimer        = 0;
    this._dashDir          = new THREE.Vector3();

    this.frozen          = false;
    this._frozenTimer    = 0;
    this._iceCube        = null;
    this._knockbackVel   = new THREE.Vector3();

    this.confused        = false;
    this._confusedTimer  = 0;
    this._confusedAura   = null;

    if      (this._character === 'slothy') this._buildSlothy(scene, position);
    else if (this._character === 'minty')  this._buildMinty(scene, position);
    else                                   this._buildStuffie(scene, position);
  }

  _buildSlothy(scene, position) {
    this.group = new THREE.Group();

    const blue  = new THREE.MeshLambertMaterial({ color: 0x7788ee });
    const patch = new THREE.MeshLambertMaterial({ color: 0x4433aa });
    const dark  = new THREE.MeshLambertMaterial({ color: 0x111122 });

    const s = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };

    // Round fluffy body
    const body = s(new THREE.SphereGeometry(0.55, 12, 10), blue);
    body.scale.set(1.0, 1.05, 0.92);
    body.position.y = 1.0;
    this.group.add(body);

    // Fluffy bumps around body edges
    [[-0.38,1.15,0.22],[0.38,1.15,0.22],[0,1.48,0.25],[-0.28,0.68,0.18],[0.28,0.68,0.18]].forEach(([x,y,z]) => {
      const fluff = s(new THREE.SphereGeometry(0.20, 8, 6), blue);
      fluff.position.set(x, y, z);
      this.group.add(fluff);
    });

    // Round head blending into body
    const head = s(new THREE.SphereGeometry(0.43, 12, 10), blue);
    head.position.y = 1.82;
    this.group.add(head);

    // Purple eye patches
    [-0.17, 0.17].forEach(ex => {
      const ep = s(new THREE.SphereGeometry(0.16, 8, 6), patch);
      ep.scale.set(1.0, 0.72, 0.48);
      ep.position.set(ex, 1.88, 0.38);
      this.group.add(ep);
      // Black eye dot
      const eye = s(new THREE.SphereGeometry(0.065, 7, 6), dark);
      eye.position.set(ex, 1.88, 0.44);
      this.group.add(eye);
    });

    // Black nose
    const nose = s(new THREE.SphereGeometry(0.075, 7, 6), dark);
    nose.scale.set(1.2, 0.85, 0.75);
    nose.position.set(0, 1.72, 0.46);
    this.group.add(nose);

    // Smile
    [-0.10, 0.10].forEach((sx, i) => {
      const smile = s(new THREE.BoxGeometry(0.13, 0.04, 0.03), dark);
      smile.position.set(sx, 1.60, 0.46);
      smile.rotation.z = (i === 0 ? 1 : -1) * 0.48;
      this.group.add(smile);
    });

    // Long drooping arms
    this._leftArmPivot = new THREE.Group();
    this._leftArmPivot.position.set(-0.52, 1.32, 0);
    const lArm = s(new THREE.CylinderGeometry(0.075, 0.062, 0.85, 7), blue);
    lArm.position.set(0, -0.425, 0);   // centered so TOP is at pivot = connected to shoulder
    lArm.rotation.z = 0.28;            // droop outward
    this._leftArmPivot.add(lArm);
    const lHand = s(new THREE.SphereGeometry(0.10, 7, 6), blue);
    lHand.position.set(0.24, -0.82, 0);
    this._leftArmPivot.add(lHand);
    [-0.07, 0, 0.07].forEach(cx => {
      const claw = s(new THREE.CylinderGeometry(0.022, 0.012, 0.13, 4), dark);
      claw.position.set(cx + 0.24, -0.97, 0);
      this._leftArmPivot.add(claw);
    });
    this.group.add(this._leftArmPivot);

    this._rightArmPivot = new THREE.Group();
    this._rightArmPivot.position.set(0.52, 1.32, 0);
    const rArm = s(new THREE.CylinderGeometry(0.075, 0.062, 0.85, 7), blue);
    rArm.position.set(0, -0.425, 0);   // centered so TOP is at pivot = connected to shoulder
    rArm.rotation.z = -0.28;           // droop outward
    this._rightArmPivot.add(rArm);
    const rHand = s(new THREE.SphereGeometry(0.10, 7, 6), blue);
    rHand.position.set(-0.24, -0.82, 0);
    this._rightArmPivot.add(rHand);
    [-0.07, 0, 0.07].forEach(cx => {
      const claw = s(new THREE.CylinderGeometry(0.022, 0.012, 0.13, 4), dark);
      claw.position.set(cx - 0.24, -0.97, 0);
      this._rightArmPivot.add(claw);
    });
    this.group.add(this._rightArmPivot);

    this._weaponGroup = this._buildWeaponMesh({ shape: 'sword', color: 0xd0d0ee, guardColor: 0xaa8833 });
    this._rightArmPivot.add(this._weaponGroup);

    // Short stubby legs
    const legGeo = new THREE.BoxGeometry(0.30, 0.50, 0.30);
    this._leftLeg  = s(legGeo, blue); this._leftLeg.position.set(-0.20, 0.42, 0);
    this._rightLeg = s(legGeo, blue); this._rightLeg.position.set( 0.20, 0.42, 0);
    this.group.add(this._leftLeg);
    this.group.add(this._rightLeg);

    // Feet with claws
    [-0.20, 0.20].forEach(fx => {
      const foot = s(new THREE.SphereGeometry(0.16, 8, 6), blue);
      foot.scale.set(1.0, 0.6, 1.4);
      foot.position.set(fx, 0.16, 0.06);
      this.group.add(foot);
      [-0.07, 0, 0.07].forEach(tx => {
        const toe = s(new THREE.CylinderGeometry(0.02, 0.012, 0.12, 4), dark);
        toe.position.set(fx + tx, 0.10, 0.22);
        this.group.add(toe);
      });
    });

    this._armorBody = null; this._armorPadL = null; this._armorPadR = null;
    this._materials = [{ mat: blue, origColor: blue.color.clone() }];
    this.group.position.copy(position);
    scene.add(this.group);
    this.mesh = this.group;
  }

  _buildMinty(scene, position) {
    this.group = new THREE.Group();

    const mint     = new THREE.MeshLambertMaterial({ color: 0x55ddbb });
    const hoodie   = new THREE.MeshLambertMaterial({ color: 0xee2277 });
    const hoodDark = new THREE.MeshLambertMaterial({ color: 0xcc1166 });
    const innerEar = new THREE.MeshLambertMaterial({ color: 0xffaad4 });
    const dark     = new THREE.MeshLambertMaterial({ color: 0x221111 });
    const shine    = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const s = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };

    // Pink hoodie body — slimmer
    const body = s(new THREE.SphereGeometry(0.52, 12, 10), hoodie);
    body.scale.set(0.72, 1.10, 0.76);
    body.position.y = 1.05;
    this.group.add(body);

    // Teal fur peeking out below hoodie
    const furBase = s(new THREE.SphereGeometry(0.40, 10, 8), mint);
    furBase.scale.set(0.78, 0.48, 0.82);
    furBase.position.set(0, 0.64, 0);
    this.group.add(furBase);

    // Hoodie pocket
    const pocket = s(new THREE.BoxGeometry(0.24, 0.14, 0.04), hoodDark);
    pocket.position.set(0, 0.88, 0.40);
    this.group.add(pocket);

    // Head (teal)
    const head = s(new THREE.SphereGeometry(0.40, 12, 10), mint);
    head.position.y = 1.84;
    this.group.add(head);

    // Round bear ears (teal + pink inner)
    [-0.36, 0.36].forEach(ex => {
      const ear = s(new THREE.SphereGeometry(0.19, 10, 8), mint);
      ear.position.set(ex, 2.22, 0.04);
      this.group.add(ear);
      const inner = s(new THREE.SphereGeometry(0.11, 8, 6), innerEar);
      inner.position.set(ex, 2.23, 0.11);
      this.group.add(inner);
    });

    // Eyes with shine
    [-0.17, 0.17].forEach((ex, i) => {
      const eye = s(new THREE.SphereGeometry(0.082, 8, 7), dark);
      eye.position.set(ex, 1.92, 0.40);
      this.group.add(eye);
      const eyeShine = s(new THREE.SphereGeometry(0.030, 6, 5), shine);
      eyeShine.position.set(ex + (i === 0 ? 0.03 : -0.03), 1.94, 0.46);
      this.group.add(eyeShine);
      // Eyelashes
      [-0.06, 0, 0.06].forEach(lx => {
        const lash = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.065, 0.018), dark);
        lash.position.set(ex + lx, 1.98, 0.39);
        lash.rotation.z = lx * 0.9;
        this.group.add(lash);
      });
    });

    // Nose
    const nose = s(new THREE.SphereGeometry(0.065, 7, 6), dark);
    nose.scale.set(1.3, 0.9, 0.75);
    nose.position.set(0, 1.78, 0.45);
    this.group.add(nose);

    // Smile
    [-0.10, 0.10].forEach((sx, i) => {
      const piece = s(new THREE.BoxGeometry(0.12, 0.034, 0.025), dark);
      piece.position.set(sx, 1.67, 0.45);
      piece.rotation.z = (i === 0 ? 1 : -1) * 0.44;
      this.group.add(piece);
    });

    // Arms — hoodie sleeves + teal paws
    this._leftArmPivot = new THREE.Group();
    this._leftArmPivot.position.set(-0.40, 1.38, 0);
    const lSleeve = s(new THREE.CylinderGeometry(0.10, 0.09, 0.52, 8), hoodie);
    lSleeve.position.set(0, -0.26, 0); lSleeve.rotation.z = 0.20;
    this._leftArmPivot.add(lSleeve);
    const lPaw = s(new THREE.SphereGeometry(0.11, 8, 6), mint);
    lPaw.position.set(0.11, -0.56, 0);
    this._leftArmPivot.add(lPaw);
    this.group.add(this._leftArmPivot);

    this._rightArmPivot = new THREE.Group();
    this._rightArmPivot.position.set(0.40, 1.38, 0);
    const rSleeve = s(new THREE.CylinderGeometry(0.10, 0.09, 0.52, 8), hoodie);
    rSleeve.position.set(0, -0.26, 0); rSleeve.rotation.z = -0.20;
    this._rightArmPivot.add(rSleeve);
    const rPaw = s(new THREE.SphereGeometry(0.11, 8, 6), mint);
    rPaw.position.set(-0.11, -0.56, 0);
    this._rightArmPivot.add(rPaw);
    this.group.add(this._rightArmPivot);

    this._weaponGroup = this._buildWeaponMesh({ shape: 'sword', color: 0xd0d0ee, guardColor: 0xaa8833 });
    this._rightArmPivot.add(this._weaponGroup);

    // Legs (teal)
    const legGeo = new THREE.BoxGeometry(0.30, 0.52, 0.30);
    this._leftLeg  = s(legGeo, mint); this._leftLeg.position.set(-0.22, 0.44, 0);
    this._rightLeg = s(legGeo, mint); this._rightLeg.position.set( 0.22, 0.44, 0);
    this.group.add(this._leftLeg);
    this.group.add(this._rightLeg);

    // Feet
    [-0.22, 0.22].forEach(fx => {
      const foot = s(new THREE.SphereGeometry(0.14, 8, 6), mint);
      foot.scale.set(1.0, 0.65, 1.30);
      foot.position.set(fx, 0.18, 0.04);
      this.group.add(foot);
    });

    this._armorBody = null; this._armorPadL = null; this._armorPadR = null;
    this._materials = [
      { mat: mint,   origColor: mint.color.clone() },
      { mat: hoodie, origColor: hoodie.color.clone() },
    ];
    this.group.position.copy(position);
    scene.add(this.group);
    this.mesh = this.group;
  }

  _buildStuffie(scene, position) {
    this.group = new THREE.Group();
    this._armorMat = new THREE.MeshLambertMaterial({ color: 0xbb88ee });
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

    // ── Ears: triangular, flat base flush against head ──
    // x=0.52 puts the flat edge of the base triangle just inside the head surface.
    // rotation.y = side*PI/3 rotates the 3-segment base so one flat edge faces inward.
    // scale.z=0.30 gives enough depth to be visible from the isometric camera.
    const innerEarMat = new THREE.MeshLambertMaterial({ color: 0xd0a0f0 });

    [-1, 1].forEach(side => {
      const x = side * 0.52;

      const outer = s(new THREE.ConeGeometry(0.30, 0.52, 3), this._armorMat);
      outer.scale.set(1.0, 1.0, 0.30);
      outer.rotation.y = side * Math.PI / 3;
      outer.position.set(x, 2.04, 0.0);
      this.group.add(outer);

      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.33, 3), innerEarMat);
      inner.scale.set(1.0, 1.0, 0.26);
      inner.rotation.y = side * Math.PI / 3;
      inner.position.set(x, 2.09, 0.04);
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
    this._leftAntenna  = makeAntenna(-0.21);
    this._rightAntenna = makeAntenna(0.21);
    this.group.add(this._leftAntenna);
    this.group.add(this._rightAntenna);

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
      // Remove previous armor pieces
      if (this._armorBody)  this.group.remove(this._armorBody);
      if (this._armorPadL)  this._leftArmPivot.remove(this._armorPadL);
      if (this._armorPadR)  this._rightArmPivot.remove(this._armorPadR);
      this._armorBody = this._armorPadL = this._armorPadR = null;

      this.defense = item.defense || 0;

      if (item.id !== '__default__') {
        const { body, padL, padR } = this._buildArmorMesh(item);
        this._armorBody = body;
        this._armorPadL = padL;
        this._armorPadR = padR;
        if (body) this.group.add(body);
        if (padL) this._leftArmPivot.add(padL);
        if (padR) this._rightArmPivot.add(padR);
      }
    }
  }

  // Returns { body: Group, padL: Mesh|null, padR: Mesh|null }
  _buildArmorMesh(item) {
    const mk = (geo, color) => {
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
      mesh.castShadow = true;
      return mesh;
    };
    const body = new THREE.Group();
    const c = item.color || 0x888888;
    let padL = null, padR = null;

    switch (item.id) {

      case 'leather_vest': {
        // X-cross chest straps
        [0.44, -0.44].forEach(angle => {
          const strap = mk(new THREE.BoxGeometry(0.08, 0.78, 0.07), c);
          strap.position.set(0, 1.06, 0.43);
          strap.rotation.z = angle;
          body.add(strap);
        });
        // Metal buckle
        const buckle = mk(new THREE.BoxGeometry(0.14, 0.14, 0.07), 0xcc9922);
        buckle.position.set(0, 1.06, 0.47);
        body.add(buckle);
        // Waist belt
        const belt = mk(new THREE.CylinderGeometry(0.41, 0.40, 0.10, 10), c);
        belt.position.y = 0.66;
        body.add(belt);
        // Round leather shoulder pads
        const pGeo = new THREE.SphereGeometry(0.17, 8, 6);
        padL = mk(pGeo, c); padL.scale.set(1.1, 0.62, 0.85);
        padR = mk(pGeo, c); padR.scale.set(1.1, 0.62, 0.85);
        break;
      }

      case 'chain_mail': {
        // Fitted mail shirt
        const shirt = mk(new THREE.CylinderGeometry(0.43, 0.40, 1.05, 10), c);
        shirt.position.y = 1.06;
        body.add(shirt);
        // Horizontal ring rows
        for (let i = 0; i < 5; i++) {
          const ring = mk(new THREE.TorusGeometry(0.41, 0.026, 6, 14), c);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 0.57 + i * 0.19;
          body.add(ring);
        }
        // Round cap shoulders
        const cGeo = new THREE.SphereGeometry(0.20, 8, 6);
        padL = mk(cGeo, c); padL.scale.set(1.1, 0.68, 0.90);
        padR = mk(cGeo, c); padR.scale.set(1.1, 0.68, 0.90);
        break;
      }

      case 'spaceship_armor': {
        const lightBlue = 0x88ccee;

        // Main chest hull (light grey)
        const hull = mk(new THREE.BoxGeometry(0.68, 0.64, 0.10), c);
        hull.position.set(0, 1.10, 0.43);
        body.add(hull);

        // Central triangle cockpit (light blue) — 3-sided cone pointing up
        const triMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0, 0.20, 0.44, 3, 1),
          new THREE.MeshLambertMaterial({ color: lightBlue })
        );
        triMesh.rotation.y = Math.PI / 6;
        triMesh.position.set(0, 1.10, 0.50);
        body.add(triMesh);

        // Horizontal wing panels (light grey, one each side)
        [-1, 1].forEach(side => {
          const wing = mk(new THREE.BoxGeometry(0.30, 0.18, 0.08), c);
          wing.position.set(side * 0.46, 1.10, 0.40);
          wing.rotation.z = side * -0.18;
          body.add(wing);

          // Wing tip fin
          const fin = mk(new THREE.BoxGeometry(0.08, 0.28, 0.07), c);
          fin.position.set(side * 0.58, 1.02, 0.40);
          body.add(fin);
        });

        // Bottom thruster strip (front)
        const thruster = mk(new THREE.BoxGeometry(0.52, 0.10, 0.09), c);
        thruster.position.set(0, 0.74, 0.43);
        body.add(thruster);

        // ── Back (mirror of front at z = -0.43) ──
        const hullB = mk(new THREE.BoxGeometry(0.68, 0.64, 0.10), c);
        hullB.position.set(0, 1.10, -0.43);
        body.add(hullB);

        const triBack = new THREE.Mesh(
          new THREE.CylinderGeometry(0, 0.20, 0.44, 3, 1),
          new THREE.MeshLambertMaterial({ color: lightBlue })
        );
        triBack.rotation.y = Math.PI / 6;
        triBack.position.set(0, 1.10, -0.50);
        body.add(triBack);

        [-1, 1].forEach(side => {
          const wingB = mk(new THREE.BoxGeometry(0.30, 0.18, 0.08), c);
          wingB.position.set(side * 0.46, 1.10, -0.40);
          wingB.rotation.z = side * -0.18;
          body.add(wingB);

          const finB = mk(new THREE.BoxGeometry(0.08, 0.28, 0.07), c);
          finB.position.set(side * 0.58, 1.02, -0.40);
          body.add(finB);
        });

        const thrusterB = mk(new THREE.BoxGeometry(0.52, 0.10, 0.09), c);
        thrusterB.position.set(0, 0.74, -0.43);
        body.add(thrusterB);

        // Angled pauldrons that echo the wing shape
        padL = mk(new THREE.BoxGeometry(0.36, 0.14, 0.28), c);
        padL.position.set(0, 0.08, 0);
        padR = mk(new THREE.BoxGeometry(0.36, 0.14, 0.28), c);
        padR.position.set(0, 0.08, 0);
        break;
      }

      case 'dark_robe': {
        const dark = 0x2a1840;
        // Flowing robe from waist to ground
        const robe = mk(new THREE.CylinderGeometry(0.50, 0.62, 1.55, 8), c);
        robe.position.y = 0.76;
        body.add(robe);
        // Upper robe / shoulder cape
        const cape = mk(new THREE.CylinderGeometry(0.46, 0.50, 0.42, 8), c);
        cape.position.y = 1.50;
        body.add(cape);
        // Hood behind head
        const hood = mk(new THREE.SphereGeometry(0.52, 10, 8), dark);
        hood.scale.set(1.0, 0.82, 0.68);
        hood.position.set(0, 1.94, -0.14);
        body.add(hood);
        // Glowing trim at hem
        const trim = mk(new THREE.TorusGeometry(0.61, 0.038, 6, 16), 0x7722cc);
        trim.rotation.x = Math.PI / 2;
        trim.position.y = 0.01;
        body.add(trim);
        break;
      }

      case 'nano_suit': {
        // Sleek form-fitting shell with glowing cyan seams
        const shell = mk(new THREE.SphereGeometry(0.53, 12, 9), c);
        shell.scale.set(0.80, 1.28, 0.82);
        shell.position.y = 1.08;
        body.add(shell);
        const seamV = mk(new THREE.BoxGeometry(0.05, 0.90, 0.05), 0x00ccff);
        seamV.position.set(0, 1.08, 0.50);
        body.add(seamV);
        [-0.22, 0.22].forEach(x => {
          const seamH = mk(new THREE.BoxGeometry(0.04, 0.70, 0.04), 0x0088ee);
          seamH.position.set(x, 1.08, 0.49);
          body.add(seamH);
        });
        const sGeo = new THREE.SphereGeometry(0.18, 8, 6);
        padL = mk(sGeo, c); padL.scale.set(1.1, 0.70, 0.90);
        padR = mk(sGeo, c); padR.scale.set(1.1, 0.70, 0.90);
        break;
      }

      case 'cryo_vest': {
        const chest = mk(new THREE.BoxGeometry(0.60, 0.68, 0.10), c);
        chest.position.set(0, 1.08, 0.44);
        body.add(chest);
        [-0.17, 0.17].forEach(x => {
          const facet = mk(new THREE.BoxGeometry(0.20, 0.50, 0.07), 0xcceeff);
          facet.position.set(x, 1.10, 0.48);
          facet.rotation.z = x > 0 ? -0.12 : 0.12;
          body.add(facet);
        });
        // Hex shoulder pads
        padL = mk(new THREE.CylinderGeometry(0.16, 0.18, 0.10, 6), c);
        padL.rotation.y = Math.PI / 6;
        padR = mk(new THREE.CylinderGeometry(0.16, 0.18, 0.10, 6), c);
        padR.rotation.y = Math.PI / 6;
        break;
      }

      case 'combat_chassis': {
        const front = mk(new THREE.BoxGeometry(0.62, 0.72, 0.10), c);
        front.position.set(0, 1.08, 0.44);
        body.add(front);
        [-0.27, 0.27].forEach(x => {
          const side = mk(new THREE.BoxGeometry(0.10, 0.62, 0.08), 0x334455);
          side.position.set(x, 1.10, 0.40);
          side.rotation.y = x > 0 ? -0.4 : 0.4;
          body.add(side);
        });
        const belt = mk(new THREE.BoxGeometry(0.70, 0.11, 0.44), 0x223344);
        belt.position.y = 0.70;
        body.add(belt);
        padL = mk(new THREE.BoxGeometry(0.34, 0.18, 0.26), c);
        padR = mk(new THREE.BoxGeometry(0.34, 0.18, 0.26), c);
        break;
      }

      case 'reflector_shield': {
        const shield = mk(new THREE.BoxGeometry(0.66, 0.82, 0.10), c);
        shield.position.set(0, 1.10, 0.43);
        body.add(shield);
        const inner = mk(new THREE.BoxGeometry(0.42, 0.58, 0.06), 0xeeddbb);
        inner.position.set(0, 1.10, 0.49);
        body.add(inner);
        const centre = mk(new THREE.BoxGeometry(0.18, 0.26, 0.06), c);
        centre.position.set(0, 1.10, 0.52);
        body.add(centre);
        padL = mk(new THREE.BoxGeometry(0.42, 0.14, 0.32), c);
        padR = mk(new THREE.BoxGeometry(0.42, 0.14, 0.32), c);
        break;
      }

      case 'bone_armor': {
        // Horizontal rib bars across chest
        for (let i = 0; i < 5; i++) {
          const rib = mk(new THREE.CylinderGeometry(0.036, 0.036, 0.72, 6), c);
          rib.rotation.z = Math.PI / 2;
          rib.position.set(0, 0.72 + i * 0.18, 0.41);
          body.add(rib);
        }
        // Spine strip down the back
        const spine = mk(new THREE.CylinderGeometry(0.055, 0.048, 0.90, 6), c);
        spine.position.set(0, 1.08, -0.42);
        body.add(spine);
        // Skull-cap shoulder pieces
        const sGeo = new THREE.SphereGeometry(0.20, 8, 6);
        padL = mk(sGeo, c); padL.scale.set(1.0, 0.60, 0.80);
        padR = mk(sGeo, c); padR.scale.set(1.0, 0.60, 0.80);
        break;
      }
    }

    return { body, padL, padR };
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
      case 'plasma': {
        const blade = b(0.06, 1.30, 0.04);
        blade.position.y = -0.65;
        const guard = b(0.40, 0.08, 0.08, gmat);
        // Glowing edge strip
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 1.30, 0.03),
          new THREE.MeshBasicMaterial({ color: item.guardColor || 0x00aaff })
        );
        edge.position.set(0.048, -0.65, 0);
        group.add(blade, guard, edge);
        break;
      }

      case 'lance': {
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.04, 2.20, 6),
          gmat
        );
        shaft.position.y = -1.10;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.46, 6), mat);
        tip.position.y = -0.02;
        group.add(shaft, tip);
        break;
      }

      case 'gauntlet': {
        const plate = b(0.38, 0.24, 0.22);
        plate.position.set(0, -0.12, 0);
        [-0.12, 0, 0.12].forEach(x => {
          const bump = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 6), mat);
          bump.position.set(x, -0.04, 0.12);
          group.add(bump);
        });
        const wrist = b(0.28, 0.32, 0.20, gmat);
        wrist.position.set(0, -0.44, 0);
        group.add(plate, wrist);
        break;
      }

      case 'cannon': {
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.14, 0.70, 8),
          mat
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, -0.35, -0.14);
        const body2 = b(0.28, 0.38, 0.26, gmat);
        body2.position.set(0, -0.30, 0.06);
        const muzzle = new THREE.Mesh(
          new THREE.TorusGeometry(0.12, 0.035, 6, 12),
          mat
        );
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, -0.35, -0.52);
        group.add(barrel, body2, muzzle);
        break;
      }

      case 'banana': {
        // Curved banana blade — 6 segments forming an arc
        for (let i = 0; i < 6; i++) {
          const t     = i / 5;
          const curve = t * 0.52;
          const seg   = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.24, 0.08),
            new THREE.MeshLambertMaterial({ color: item.color || 0xffdd00 })
          );
          seg.position.set(-Math.sin(curve) * 0.32, -0.68 + t * 1.12, 0);
          seg.rotation.z = -curve;
          group.add(seg);
        }
        // Green stem tip
        const stem = new THREE.Mesh(
          new THREE.ConeGeometry(0.055, 0.18, 5),
          new THREE.MeshLambertMaterial({ color: item.guardColor || 0x44aa22 })
        );
        stem.position.set(-Math.sin(0.52) * 0.32, 0.50, 0);
        stem.rotation.z = -0.52;
        group.add(stem);
        // Peel strips as guard, splaying outward
        [-0.48, 0, 0.48].forEach((rx, i) => {
          const peel = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.34, 0.06),
            new THREE.MeshLambertMaterial({ color: item.color || 0xffdd00 })
          );
          peel.position.set(rx * 0.5, -0.10, 0);
          peel.rotation.z = (i - 1) * 0.52;
          group.add(peel);
        });
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

  // Returns world-space tip positions of both antennae (stuffy only)
  getAntennaTips() {
    if (!this._leftAntenna) return null;
    this._leftAntenna.updateWorldMatrix(true, false);
    this._rightAntenna.updateWorldMatrix(true, false);
    const tipY = new THREE.Vector3(0, 0.63, 0);
    return [
      tipY.clone().applyMatrix4(this._leftAntenna.matrixWorld),
      tipY.clone().applyMatrix4(this._rightAntenna.matrixWorld),
    ];
  }

  triggerAttack() { this.attackAnim = 1.0; }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  get dashCooldownLeft() { return this._dashCooldownLeft; }
  get dashCooldown()     { return this._dashCooldown; }
  canDash() { return !this._dashActive && this._dashCooldownLeft <= 0 && !this.dead; }

  dash(dir) {
    if (!this.canDash()) return;
    this._dashDir.copy(dir).normalize();
    this._dashActive       = true;
    this._dashTimer        = 0.18;
    this._dashCooldownLeft = this._dashCooldown;
    this.facingAngle       = Math.atan2(dir.x, dir.z);
  }

  freeze(duration) {
    if (this.dead) return;
    this.frozen       = true;
    this._frozenTimer = duration;
    if (!this._iceCube) {
      const geo     = new THREE.BoxGeometry(1.5, 2.4, 1.5);
      const mat     = new THREE.MeshBasicMaterial({ color: 0x99ddff, transparent: true, opacity: 0.55 });
      this._iceCube = new THREE.Mesh(geo, mat);
      this._iceCube.position.set(0, 1.2, 0);

      const wireMat  = new THREE.MeshBasicMaterial({ color: 0xccf0ff, wireframe: true });
      const wireGeo  = new THREE.BoxGeometry(1.54, 2.44, 1.54);
      const wire     = new THREE.Mesh(wireGeo, wireMat);
      wire.position.set(0, 1.2, 0);

      this.group.add(this._iceCube);
      this.group.add(wire);
      this._iceCubeWire = wire;
    }
  }

  confuse(duration) {
    if (this.dead) return;
    this.confused       = true;
    this._confusedTimer = duration;
    if (!this._confusedAura) {
      const mat          = new THREE.MeshBasicMaterial({ color: 0xcc44ff, transparent: true, opacity: 0.28 });
      this._confusedAura = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), mat);
      this._confusedAura.position.set(0, 1.1, 0);
      this.group.add(this._confusedAura);
    }
  }

  knockback(dirX, dirZ, force = 5) {
    this._knockbackVel.set(dirX * force, 0, dirZ * force);
  }

  takeDamage(amount) {
    if (this.invincible || this._dashActive || this.dead) return;
    const reduced = Math.max(1, amount - this.defense);
    this.health = Math.max(0, this.health - reduced);
    this.invincible = true;
    setTimeout(() => { this.invincible = false; }, 900);
    if (this.health <= 0) this.dead = true;
  }

  // touchMove: optional {x, y} from MobileControls (-1..1 each axis)
  update(delta, keys, camera, dungeon, touchMove = null) {
    if (this.dead) return;

    // Confusion timer — runs even while frozen
    if (this.confused) {
      this._confusedTimer -= delta;
      if (this._confusedAura)
        this._confusedAura.scale.setScalar(1 + Math.sin(performance.now() * 0.006) * 0.18);
      if (this._confusedTimer <= 0) {
        this.confused = false;
        if (this._confusedAura) { this.group.remove(this._confusedAura); this._confusedAura = null; }
      }
    }

    // Frozen: skip input movement but allow knockback to slide the player
    if (this.frozen) {
      this._frozenTimer -= delta;
      if (this._knockbackVel.lengthSq() > 0.01) {
        const nx = this.group.position.x + this._knockbackVel.x * delta;
        const nz = this.group.position.z + this._knockbackVel.z * delta;
        if (dungeon.isWalkable(nx, this.group.position.z)) this.group.position.x = nx;
        if (dungeon.isWalkable(this.group.position.x, nz)) this.group.position.z = nz;
        this._knockbackVel.multiplyScalar(Math.max(0, 1 - delta * 9));
      }
      if (this._frozenTimer <= 0) {
        this.frozen = false;
        if (this._iceCube)     { this.group.remove(this._iceCube);     this._iceCube     = null; }
        if (this._iceCubeWire) { this.group.remove(this._iceCubeWire); this._iceCubeWire = null; }
      }
      return;
    }

    // Dash cooldown tick
    if (this._dashCooldownLeft > 0)
      this._dashCooldownLeft = Math.max(0, this._dashCooldownLeft - delta);

    // Dash movement takes full priority
    if (this._dashActive) {
      this._dashTimer -= delta;
      const spd = 30 * delta;
      const nx = this.group.position.x + this._dashDir.x * spd;
      const nz = this.group.position.z + this._dashDir.z * spd;
      if (dungeon.isWalkable(nx, this.group.position.z)) this.group.position.x = nx;
      if (dungeon.isWalkable(this.group.position.x, nz)) this.group.position.z = nz;
      this._walkCycle += delta * 20;
      const w = Math.sin(this._walkCycle) * 0.5;
      this._leftLeg.rotation.x  =  w;
      this._rightLeg.rotation.x = -w;
      this.group.rotation.y = this.facingAngle;
      // Blink faster during dash
      this.group.visible = Math.floor(Date.now() / 45) % 2 === 0;
      if (this._dashTimer <= 0) this._dashActive = false;
      return;
    }

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    const inv  = this.confused ? -1 : 1;
    const move = new THREE.Vector3();
    if (keys['KeyW'] || keys['ArrowUp'])    move.addScaledVector(forward,  inv);
    if (keys['KeyS'] || keys['ArrowDown'])  move.addScaledVector(forward, -inv);
    if (keys['KeyD'] || keys['ArrowRight']) move.addScaledVector(right,    inv);
    if (keys['KeyA'] || keys['ArrowLeft'])  move.addScaledVector(right,   -inv);

    // Joystick: screen-right → world-right, screen-up (-y) → world-forward
    if (touchMove) {
      const tx = touchMove.x * inv, ty = touchMove.y * inv;
      if (Math.abs(tx) > 0.08 || Math.abs(ty) > 0.08) {
        move.addScaledVector(right,    tx);
        move.addScaledVector(forward, -ty);
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
      this.attackAnim -= delta * 3.5;
      const t = Math.max(0, this.attackAnim);

      let rx, rz;
      if (t > 0.70) {
        // Wind-up: arm pulls toward camera (behind player) and out to right
        const p = (1 - t) / 0.30;
        rx = -0.6 * p;   //  0   → -0.6  (toward camera = behind player)
        rz = -0.7 * p;   //  0   → -0.7  (out to right side)
      } else {
        // Sweep: arm drives AWAY from camera (forward, toward enemies)
        // while sweeping right to left across the front of the character
        const p     = (0.70 - t) / 0.70;
        const eased = 1 - Math.pow(1 - p, 2);
        rx = -0.6 + eased * 2.0;   // -0.6 → +1.4  (weapon swings toward enemies = forward)
        rz = -0.7 + eased * 1.5;   // -0.7 → +0.8  (sweeps right to left)
      }

      this._rightArmPivot.rotation.x = rx;
      this._rightArmPivot.rotation.z = rz;
      this._rightArmPivot.rotation.y = 0;

      if (this.attackAnim < 0) this.attackAnim = 0;
    } else {
      this._rightArmPivot.rotation.x *= 0.8;
      this._rightArmPivot.rotation.y *= 0.8;
      this._rightArmPivot.rotation.z *= 0.8;
    }

    const visible = !this.invincible || Math.floor(Date.now() / 80) % 2 === 0;
    this.group.visible = visible;
  }
}
