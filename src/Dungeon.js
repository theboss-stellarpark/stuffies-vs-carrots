import * as THREE from 'three';

const WALL = 0;
const FLOOR = 1;

const WALL_H = 4.5;   // taller walls for a space-station feel

class Room {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.cx = Math.floor(x + w / 2);
    this.cy = Math.floor(y + h / 2);
  }
}

export class Dungeon {
  constructor(scene, tileSize) {
    this.scene   = scene;
    this.T       = tileSize;
    this.rooms   = [];
    this.grid    = null;
    this.width   = 0;
    this.height  = 0;
    this.torchLights = [];  // kept for API compatibility
    this._lights = [];      // { light, phase, type }
    this._panels = [];      // { mesh, mat, phase, type }
  }

  generate(width, height) {
    this.width  = width;
    this.height = height;
    this.grid   = Array.from({ length: height }, () => new Array(width).fill(WALL));
    this._placeRooms();
    this._connectRooms();
    this._buildGeometry();
    this._addSpaceLights();
    this._addConduits();
  }

  // ── Room generation (unchanged) ─────────────────────────────────────────

  _placeRooms() {
    const MIN = 5, MAX = 11;
    let attempts = 80;
    while (this.rooms.length < 10 && attempts-- > 0) {
      const w = MIN + Math.floor(Math.random() * (MAX - MIN));
      const h = MIN + Math.floor(Math.random() * (MAX - MIN));
      const x = 2 + Math.floor(Math.random() * (this.width  - w - 4));
      const y = 2 + Math.floor(Math.random() * (this.height - h - 4));
      const room = new Room(x, y, w, h);
      const overlaps = this.rooms.some(r =>
        room.x - 2 < r.x + r.w + 2 && room.x + room.w + 2 > r.x - 2 &&
        room.y - 2 < r.y + r.h + 2 && room.y + room.h + 2 > r.y - 2
      );
      if (!overlaps) { this._carveRoom(room); this.rooms.push(room); }
    }
  }

  _carveRoom(room) {
    for (let y = room.y; y < room.y + room.h; y++)
      for (let x = room.x; x < room.x + room.w; x++)
        this.grid[y][x] = FLOOR;
  }

  _connectRooms() {
    const sorted = [...this.rooms].sort((a, b) => a.cx - b.cx);
    for (let i = 0; i < sorted.length - 1; i++)
      this._carveCorridor(sorted[i], sorted[i + 1]);
    for (let i = 0; i < sorted.length - 2; i += 2)
      this._carveCorridor(sorted[i], sorted[i + 2]);
  }

  _carveCorridor(a, b) {
    let x = a.cx, y = a.cy;
    while (x !== b.cx) {
      x += x < b.cx ? 1 : -1;
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) this.grid[y][x] = FLOOR;
    }
    while (y !== b.cy) {
      y += y < b.cy ? 1 : -1;
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) this.grid[y][x] = FLOOR;
    }
  }

  // ── Geometry ─────────────────────────────────────────────────────────────

  _buildGeometry() {
    const T     = this.T;
    const dummy = new THREE.Object3D();

    const floorPos = [];
    const wallPos  = [];

    for (let gz = 0; gz < this.height; gz++) {
      for (let gx = 0; gx < this.width; gx++) {
        const wx = gx * T, wz = gz * T;
        if (this.grid[gz][gx] === FLOOR) {
          floorPos.push([wx, wz, gx, gz]);
        } else if (this._adjacentToFloor(gx, gz)) {
          wallPos.push([wx, wz]);
        }
      }
    }

    // ── Floor: dark metal checkerboard panels ──
    const floorGeo = new THREE.BoxGeometry(T, 0.20, T);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x1a1c28, vertexColors: false });
    const floorMesh = new THREE.InstancedMesh(floorGeo, floorMat, floorPos.length);
    floorMesh.receiveShadow = true;

    const colA = new THREE.Color(0x1e2030);  // lighter panel
    const colB = new THREE.Color(0x13141c);  // darker panel

    floorPos.forEach(([wx, wz, gx, gz], i) => {
      dummy.position.set(wx, -0.10, wz);
      dummy.updateMatrix();
      floorMesh.setMatrixAt(i, dummy.matrix);
      floorMesh.setColorAt(i, (gx + gz) % 2 === 0 ? colA : colB);
    });
    floorMesh.instanceMatrix.needsUpdate = true;
    floorMesh.instanceColor.needsUpdate  = true;
    this.scene.add(floorMesh);

    // ── Floor edge glow strip (thin emissive band at floor level near walls) ──
    // Runs along each floor tile that borders a wall
    const stripPositions = [];
    for (let gz = 0; gz < this.height; gz++) {
      for (let gx = 0; gx < this.width; gx++) {
        if (this.grid[gz][gx] !== FLOOR) continue;
        // Check 4 cardinal neighbours
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dz]) => {
          const nx = gx + dx, nz = gz + dz;
          if (nx < 0 || nz < 0 || nx >= this.width || nz >= this.height) return;
          if (this.grid[nz][nx] !== FLOOR) {
            stripPositions.push([gx * T + dx * T * 0.48, gz * T + dz * T * 0.48, dx, dz]);
          }
        });
      }
    }

    const stripGeo = new THREE.BoxGeometry(0.06, 0.12, T);
    const stripMat = new THREE.MeshBasicMaterial({ color: 0x003366 });
    const stripMesh = new THREE.InstancedMesh(stripGeo, stripMat, stripPositions.length);
    stripPositions.forEach(([wx, wz, dx, dz], i) => {
      dummy.position.set(wx, 0.01, wz);
      // Rotate strips that run in the Z direction
      dummy.rotation.y = dx !== 0 ? Math.PI / 2 : 0;
      dummy.updateMatrix();
      dummy.rotation.y = 0; // reset for next
      if (dx !== 0) {
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.position.set(wx, 0.01, wz);
        dummy.updateMatrix();
      } else {
        dummy.rotation.set(0, 0, 0);
        dummy.position.set(wx, 0.01, wz);
        dummy.updateMatrix();
      }
      stripMesh.setMatrixAt(i, dummy.matrix);
    });
    dummy.rotation.set(0, 0, 0);
    stripMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(stripMesh);

    // ── Walls: dark steel-blue panelled plates ──
    const wallGeo = new THREE.BoxGeometry(T, WALL_H, T);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x1a2233 });
    const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallPos.length);
    wallMesh.castShadow  = true;
    wallMesh.receiveShadow = true;
    wallPos.forEach(([wx, wz], i) => {
      dummy.position.set(wx, WALL_H / 2, wz);
      dummy.updateMatrix();
      wallMesh.setMatrixAt(i, dummy.matrix);
    });
    wallMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(wallMesh);

    // ── Wall top trim strip (thin teal line at top of every wall) ──
    const trimGeo = new THREE.BoxGeometry(T, 0.10, T);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0x004455 });
    const trimMesh = new THREE.InstancedMesh(trimGeo, trimMat, wallPos.length);
    wallPos.forEach(([wx, wz], i) => {
      dummy.position.set(wx, WALL_H - 0.05, wz);
      dummy.updateMatrix();
      trimMesh.setMatrixAt(i, dummy.matrix);
    });
    trimMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(trimMesh);

    // Store for collision
    this._floorSet = new Set(
      floorPos.map(([wx, wz]) => `${Math.round(wx / T)},${Math.round(wz / T)}`)
    );
  }

  _adjacentToFloor(gx, gz) {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx, nz = gz + dy;
        if (nx >= 0 && nx < this.width && nz >= 0 && nz < this.height)
          if (this.grid[nz][nx] === FLOOR) return true;
      }
    return false;
  }

  // ── Sci-fi lights ────────────────────────────────────────────────────────

  _addSpaceLights() {
    const T = this.T;

    this.rooms.forEach((room, ri) => {
      const isAlert = ri === this.rooms.length - 1; // last room = red alert
      const isTeal  = ri % 3 === 0;

      const lightCol = isAlert ? 0xff2200 : (isTeal ? 0x00ddff : 0x3388ff);
      const panelCol = isAlert ? 0xff3300 : (isTeal ? 0x00bbdd : 0x1155cc);

      const cx = room.cx * T;
      const cz = room.cy * T;

      // ── Ceiling-mounted light panel ──
      const panelW = T * 1.4, panelD = T * 0.9;
      const panelGeo = new THREE.BoxGeometry(panelW, 0.08, panelD);
      const panelMat = new THREE.MeshBasicMaterial({ color: panelCol });
      const panel    = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(cx, WALL_H - 0.06, cz);
      this.scene.add(panel);
      this._panels.push({ mesh: panel, mat: panelMat, phase: Math.random() * Math.PI * 2, type: isAlert ? 'alert' : 'main' });

      // Glow halo below panel
      const haloGeo = new THREE.SphereGeometry(0.5, 8, 6);
      const haloMat = new THREE.MeshBasicMaterial({ color: panelCol, transparent: true, opacity: 0.35 });
      const halo    = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(cx, WALL_H - 0.65, cz);
      this.scene.add(halo);
      this._panels.push({ mesh: halo, mat: haloMat, phase: Math.random() * Math.PI * 2, type: isAlert ? 'alert' : 'halo' });

      // Main point light
      const light = new THREE.PointLight(lightCol, isAlert ? 6 : 5.5, T * 9, 1.1);
      light.position.set(cx, WALL_H - 1.0, cz);
      this.scene.add(light);
      this._lights.push({ light, phase: Math.random() * Math.PI * 2, type: isAlert ? 'alert' : 'main' });
      this.torchLights.push({ light, phase: Math.random() * Math.PI * 2 }); // compat

      // Secondary fill lights in larger rooms
      if (room.w >= 7 && room.h >= 7) {
        [
          [room.x + 2, room.y + 2],
          [room.x + room.w - 3, room.y + room.h - 3],
        ].forEach(([gx, gz]) => {
          const wx = gx * T, wz = gz * T;

          // Small indicator disc on wall
          const discGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 10);
          const discMat = new THREE.MeshBasicMaterial({ color: panelCol });
          const disc    = new THREE.Mesh(discGeo, discMat);
          disc.rotation.x = Math.PI / 2;
          disc.position.set(wx, WALL_H * 0.52, wz);
          this.scene.add(disc);
          this._panels.push({ mesh: disc, mat: discMat, phase: Math.random() * Math.PI * 2, type: 'disc' });

          const fill = new THREE.PointLight(lightCol, 2.5, T * 5, 1.4);
          fill.position.set(wx, WALL_H * 0.7, wz);
          this.scene.add(fill);
          this._lights.push({ light: fill, phase: Math.random() * Math.PI * 2, type: 'fill' });
        });
      }
    });

    // ── Corridor strip lights ──
    for (let gz = 1; gz < this.height - 1; gz++) {
      for (let gx = 1; gx < this.width - 1; gx++) {
        if (this.grid[gz][gx] !== FLOOR) continue;
        const hNeighbors = (this.grid[gz][gx - 1] === FLOOR) + (this.grid[gz][gx + 1] === FLOOR);
        const vNeighbors = (this.grid[gz - 1]?.[gx] === FLOOR) + (this.grid[gz + 1]?.[gx] === FLOOR);
        const isCorridor = (hNeighbors === 2 && vNeighbors <= 1) || (vNeighbors === 2 && hNeighbors <= 1);
        if (!isCorridor || (gx + gz) % 5 !== 0) continue;

        const isH = hNeighbors === 2;
        const stripGeo = new THREE.BoxGeometry(isH ? T * 0.7 : 0.10, 0.06, isH ? 0.10 : T * 0.7);
        const stripMat = new THREE.MeshBasicMaterial({ color: 0x004466 });
        const strip    = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(gx * this.T, WALL_H - 0.06, gz * this.T);
        this.scene.add(strip);

        const corridorLight = new THREE.PointLight(0x0077aa, 2.8, this.T * 5, 1.4);
        corridorLight.position.set(gx * this.T, WALL_H * 0.6, gz * this.T);
        this.scene.add(corridorLight);
        this._lights.push({ light: corridorLight, phase: Math.random() * Math.PI * 2, type: 'corridor' });
      }
    }
  }

  // ── Conduits and tech panels ──────────────────────────────────────────────

  _addConduits() {
    const T = this.T;

    this.rooms.forEach((room, ri) => {
      // ── Horizontal conduit pipe along the inside top of left wall ──
      const pipeLen = (room.h - 2) * T;
      const pipeMat = new THREE.MeshLambertMaterial({ color: 0x2a3545 });
      const pipe    = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, pipeLen, 7), pipeMat
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(
        room.x * T,
        WALL_H - 0.55,
        room.cy * T
      );
      this.scene.add(pipe);

      // ── Tech console panel on the right wall ──
      const wallX = (room.x + room.w - 1) * T;
      const wallZ = room.cy * T;

      // Panel body
      const consoleBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, T * 0.70, T * 0.85),
        new THREE.MeshLambertMaterial({ color: 0x0c1420 })
      );
      consoleBody.position.set(wallX, WALL_H * 0.48, wallZ);
      this.scene.add(consoleBody);

      // Screen (darker inset)
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, T * 0.40, T * 0.52),
        new THREE.MeshBasicMaterial({ color: 0x001833 })
      );
      screen.position.set(wallX + 0.11, WALL_H * 0.50, wallZ);
      this.scene.add(screen);

      // Indicator LEDs down the side
      const ledColors = [0x00ff55, 0x00aaff, 0xff4400, 0x00ff55, 0xffcc00];
      ledColors.forEach((col, i) => {
        const led = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.07, 0.05),
          new THREE.MeshBasicMaterial({ color: col })
        );
        led.position.set(wallX + 0.11, WALL_H * 0.28 + i * 0.22, wallZ - T * 0.32);
        this.scene.add(led);
      });

      // ── Vent grille on bottom of another wall ──
      if (room.h >= 7) {
        const ventW = T * 0.6;
        const ventMat = new THREE.MeshLambertMaterial({ color: 0x111822 });
        for (let vi = 0; vi < 4; vi++) {
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(ventW, 0.06, 0.04), ventMat
          );
          bar.position.set(room.cx * T, 0.18 + vi * 0.18, room.y * T);
          this.scene.add(bar);
        }
        // Vent glow
        const ventGlow = new THREE.PointLight(0x0033aa, 0.8, T * 2);
        ventGlow.position.set(room.cx * T, 0.3, room.y * T);
        this.scene.add(ventGlow);
      }
    });

    // ── Warning stripe on floor near last room entrance ──
    const lastRoom = this.rooms[this.rooms.length - 1];
    if (lastRoom) {
      const stripeY = 0.01;
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
      for (let i = 0; i < 6; i++) {
        if (i % 2 !== 0) continue;
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(T * 0.3, 0.04, T),
          stripeMat
        );
        stripe.position.set(
          (lastRoom.x + i) * T,
          stripeY,
          lastRoom.y * T
        );
        this.scene.add(stripe);
      }
    }
  }

  // ── Animate lights (called every frame from Game.js as animateTorches) ──

  animateTorches(time) {
    this._lights.forEach(({ light, phase, type }) => {
      switch (type) {
        case 'alert':
          // Red warning: fast strobe
          light.intensity = 4.5 + Math.sin(time * 8 + phase) * 2.5;
          break;
        case 'main':
          // Room overhead: slow breath
          light.intensity = 5.0 + Math.sin(time * 1.4 + phase) * 0.6;
          break;
        case 'fill':
          light.intensity = 2.4 + Math.sin(time * 1.8 + phase) * 0.4;
          break;
        case 'corridor':
          // Corridors: very steady, tiny flicker
          light.intensity = 2.7 + Math.sin(time * 3 + phase) * 0.2;
          break;
      }
    });

    // Animate panel brightness
    this._panels.forEach(({ mat, phase, type }) => {
      if (type === 'alert') {
        const t = 0.35 + Math.sin(time * 8 + phase) * 0.3;
        mat.color.setRGB(t * 1.0, t * 0.12, t * 0.04);
      } else if (type === 'halo') {
        mat.opacity = 0.25 + Math.sin(time * 1.6 + phase) * 0.12;
      }
    });
  }

  // ── Collision / spawn helpers (unchanged) ───────────────────────────────

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
    const enemyRooms = this.rooms.slice(1);
    for (let i = 0; i < count; i++) {
      const room = enemyRooms[i % enemyRooms.length];
      const ox = Math.floor(Math.random() * (room.w - 2)) + 1;
      const oz = Math.floor(Math.random() * (room.h - 2)) + 1;
      positions.push(new THREE.Vector3(
        (room.x + ox) * this.T, 0, (room.y + oz) * this.T
      ));
    }
    return positions;
  }
}
