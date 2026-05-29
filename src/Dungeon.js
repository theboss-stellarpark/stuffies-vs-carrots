import * as THREE from 'three';

const WALL = 0;
const FLOOR = 1;

class Room {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.cx = Math.floor(x + w / 2);
    this.cy = Math.floor(y + h / 2);
  }
}

export class Dungeon {
  constructor(scene, tileSize) {
    this.scene = scene;
    this.T = tileSize;
    this.rooms = [];
    this.grid = null;
    this.width = 0;
    this.height = 0;
    this.torchLights = [];
  }

  generate(width, height) {
    this.width = width;
    this.height = height;
    this.grid = Array.from({ length: height }, () => new Array(width).fill(WALL));
    this._placeRooms();
    this._connectRooms();
    this._buildGeometry();
    this._addTorches();
  }

  _placeRooms() {
    const MIN = 5, MAX = 11;
    let attempts = 80;
    while (this.rooms.length < 10 && attempts-- > 0) {
      const w = MIN + Math.floor(Math.random() * (MAX - MIN));
      const h = MIN + Math.floor(Math.random() * (MAX - MIN));
      const x = 2 + Math.floor(Math.random() * (this.width - w - 4));
      const y = 2 + Math.floor(Math.random() * (this.height - h - 4));
      const room = new Room(x, y, w, h);
      const overlaps = this.rooms.some(r =>
        room.x - 2 < r.x + r.w + 2 && room.x + room.w + 2 > r.x - 2 &&
        room.y - 2 < r.y + r.h + 2 && room.y + room.h + 2 > r.y - 2
      );
      if (!overlaps) {
        this._carveRoom(room);
        this.rooms.push(room);
      }
    }
  }

  _carveRoom(room) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        this.grid[y][x] = FLOOR;
      }
    }
  }

  _connectRooms() {
    const sorted = [...this.rooms].sort((a, b) => a.cx - b.cx);
    for (let i = 0; i < sorted.length - 1; i++) {
      this._carveCorridor(sorted[i], sorted[i + 1]);
    }
    // Extra connections to create loops
    for (let i = 0; i < sorted.length - 2; i += 2) {
      this._carveCorridor(sorted[i], sorted[i + 2]);
    }
  }

  _carveCorridor(a, b) {
    let x = a.cx, y = a.cy;
    // Horizontal segment
    while (x !== b.cx) {
      x += x < b.cx ? 1 : -1;
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) this.grid[y][x] = FLOOR;
    }
    // Vertical segment
    while (y !== b.cy) {
      y += y < b.cy ? 1 : -1;
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) this.grid[y][x] = FLOOR;
    }
  }

  _buildGeometry() {
    const T = this.T;
    const WALL_H = T * 1.4;
    const dummy = new THREE.Object3D();

    // Collect positions
    const floorPos = [];
    const wallPos = [];

    for (let gz = 0; gz < this.height; gz++) {
      for (let gx = 0; gx < this.width; gx++) {
        const wx = gx * T, wz = gz * T;
        if (this.grid[gz][gx] === FLOOR) {
          floorPos.push([wx, wz]);
        } else if (this._adjacentToFloor(gx, gz)) {
          wallPos.push([wx, wz]);
        }
      }
    }

    // Floor (instanced)
    const floorGeo = new THREE.BoxGeometry(T, 0.25, T);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x6a5a50 });
    const floorMesh = new THREE.InstancedMesh(floorGeo, floorMat, floorPos.length);
    floorMesh.receiveShadow = true;
    floorPos.forEach(([wx, wz], i) => {
      dummy.position.set(wx, -0.125, wz);
      dummy.updateMatrix();
      floorMesh.setMatrixAt(i, dummy.matrix);
    });
    floorMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(floorMesh);

    // Walls (instanced)
    const wallGeo = new THREE.BoxGeometry(T, WALL_H, T);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x4a3d5c });
    const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallPos.length);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    wallPos.forEach(([wx, wz], i) => {
      dummy.position.set(wx, WALL_H / 2, wz);
      dummy.updateMatrix();
      wallMesh.setMatrixAt(i, dummy.matrix);
    });
    wallMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(wallMesh);

    // Store for collision
    this._floorSet = new Set(floorPos.map(([wx, wz]) => `${Math.round(wx / T)},${Math.round(wz / T)}`));
  }

  _adjacentToFloor(gx, gz) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx, nz = gz + dy;
        if (nx >= 0 && nx < this.width && nz >= 0 && nz < this.height) {
          if (this.grid[nz][nx] === FLOOR) return true;
        }
      }
    }
    return false;
  }

  _addTorches() {
    const T = this.T;
    this.rooms.forEach((room, ri) => {
      // Place torches at room corners
      const corners = [
        [room.x + 1, room.y + 1],
        [room.x + room.w - 2, room.y + 1],
        [room.x + 1, room.y + room.h - 2],
        [room.x + room.w - 2, room.y + room.h - 2],
      ];
      corners.forEach(([tx, tz], ci) => {
        if (ci % 2 !== (ri % 2)) return; // stagger placement for variety
        const wx = tx * T, wz = tz * T;

        // Torch stick
        const stickGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.55, 6);
        const stickMat = new THREE.MeshLambertMaterial({ color: 0x5a3015 });
        const stick = new THREE.Mesh(stickGeo, stickMat);
        stick.position.set(wx, 1.6, wz);
        this.scene.add(stick);

        // Flame (emissive)
        const flameGeo = new THREE.SphereGeometry(0.18, 6, 6);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(wx, 2.05, wz);
        this.scene.add(flame);
        this._flames = this._flames || [];
        this._flames.push({ mesh: flame, baseY: 2.05, phase: Math.random() * Math.PI * 2 });

        // Point light
        const light = new THREE.PointLight(0xff8833, 6, T * 9, 1.2);
        light.position.set(wx, 2.2, wz);
        this.scene.add(light);
        this.torchLights.push({ light, phase: Math.random() * Math.PI * 2 });
      });
    });
  }

  animateTorches(time) {
    this.torchLights.forEach(({ light, phase }) => {
      light.intensity = 5.5 + Math.sin(time * 3.5 + phase) * 0.8;
    });
    if (this._flames) {
      this._flames.forEach(({ mesh, baseY, phase }) => {
        mesh.position.y = baseY + Math.sin(time * 4 + phase) * 0.06;
        mesh.scale.setScalar(0.9 + Math.sin(time * 5 + phase) * 0.12);
      });
    }
  }

  // World-space walkability check with player radius
  isWalkable(worldX, worldZ) {
    const r = 0.45;
    const T = this.T;
    const check = (x, z) => {
      const gx = Math.round(x / T);
      const gz = Math.round(z / T);
      return this._floorSet.has(`${gx},${gz}`);
    };
    return (
      check(worldX - r, worldZ - r) &&
      check(worldX + r, worldZ - r) &&
      check(worldX - r, worldZ + r) &&
      check(worldX + r, worldZ + r)
    );
  }

  getStartPosition() {
    const room = this.rooms[0];
    return new THREE.Vector3(room.cx * this.T, 0, room.cy * this.T);
  }

  getSpawnPositions(count) {
    const positions = [];
    const enemyRooms = this.rooms.slice(1); // skip player start room
    for (let i = 0; i < count; i++) {
      const room = enemyRooms[i % enemyRooms.length];
      const ox = Math.floor(Math.random() * (room.w - 2)) + 1;
      const oz = Math.floor(Math.random() * (room.h - 2)) + 1;
      positions.push(new THREE.Vector3(
        (room.x + ox) * this.T,
        0,
        (room.y + oz) * this.T
      ));
    }
    return positions;
  }
}
