import * as THREE from 'three';

const RARITY_GLOW = { common: 0x888888, rare: 0x2266ff, epic: 0xaa22ff };

export class LootDrop {
  constructor(scene, position, item) {
    this.item = item;
    this.collected = false;
    this._scene = scene;
    this._phase = Math.random() * Math.PI * 2;
    this._build(scene, position);
  }

  _build(scene, position) {
    this.group = new THREE.Group();

    const glowColor = RARITY_GLOW[this.item.rarity] || 0x888888;
    const itemColor = this.item.color || 0xaaaacc;

    // Main body — octahedron for weapons, box for armor
    const bodyGeo = this.item.type === 'weapon'
      ? new THREE.OctahedronGeometry(0.32)
      : new THREE.BoxGeometry(0.42, 0.32, 0.22);
    const bodyMat = new THREE.MeshLambertMaterial({ color: itemColor });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.group.add(body);

    // Spinning rarity ring
    const ringGeo = new THREE.TorusGeometry(0.44, 0.035, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: glowColor });
    this._ring = new THREE.Mesh(ringGeo, ringMat);
    this._ring.rotation.x = Math.PI / 2;
    this.group.add(this._ring);

    // Inner glow
    const glowGeo = new THREE.SphereGeometry(0.16, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowColor, transparent: true, opacity: 0.45,
    });
    this.group.add(new THREE.Mesh(glowGeo, glowMat));

    // Point light
    this._light = new THREE.PointLight(glowColor, 2.8, 5, 1.5);
    this.group.add(this._light);

    this.group.position.copy(position);
    this.group.position.y = 0.65;
    scene.add(this.group);
  }

  // Returns true when player enters pickup range
  update(time, playerPos) {
    if (this.collected) return false;

    this.group.position.y = 0.65 + Math.sin(time * 2.6 + this._phase) * 0.22;
    this.group.rotation.y += 0.026;
    this._light.intensity = 2.2 + Math.sin(time * 4.2 + this._phase) * 0.7;

    const dx = playerPos.x - this.group.position.x;
    const dz = playerPos.z - this.group.position.z;
    return Math.sqrt(dx * dx + dz * dz) < 1.8;
  }

  collect() {
    this.collected = true;
    this._scene.remove(this.group);
  }
}
