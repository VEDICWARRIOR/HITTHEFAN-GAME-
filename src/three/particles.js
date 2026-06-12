// ── Particle Systems ────────────────────────────────────────────
// Sparks, smoke, and debris for the fan destruction sequence

import * as THREE from 'three';

// ── Spark Particles ──────────────────────────────────────────

class SparkSystem {
  constructor(scene) {
    this.scene = scene;
    this.count = 120;
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    this.velocities = [];
    this.lifetimes = new Float32Array(this.count);
    this.alive = false;

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const spriteTex = this._createSparkTexture();
    this.material = new THREE.PointsMaterial({
      map: spriteTex,
      size: 0.15,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffaa33,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.visible = false;
    scene.add(this.points);
  }

  emit(origin) {
    this.alive = true;
    this.points.visible = true;
    this._elapsed = 0;

    for (let i = 0; i < this.count; i++) {
      this.positions[i * 3] = origin.x + (Math.random() - 0.5) * 0.3;
      this.positions[i * 3 + 1] = origin.y + (Math.random() - 0.5) * 0.3;
      this.positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.3;

      const speed = 2 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      this.velocities[i] = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed * 0.5 + 1,
        Math.cos(phi) * speed
      );
      this.lifetimes[i] = 0.5 + Math.random() * 1.5;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  update(dt) {
    if (!this.alive) return;
    this._elapsed += dt;
    let allDead = true;

    for (let i = 0; i < this.count; i++) {
      this.lifetimes[i] -= dt;
      if (this.lifetimes[i] <= 0) continue;
      allDead = false;

      this.positions[i * 3] += this.velocities[i].x * dt;
      this.positions[i * 3 + 1] += this.velocities[i].y * dt;
      this.positions[i * 3 + 2] += this.velocities[i].z * dt;

      // Gravity
      this.velocities[i].y -= 4 * dt;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.material.opacity = Math.max(0, 1 - this._elapsed / 2);

    if (allDead || this._elapsed > 3) {
      this.alive = false;
      this.points.visible = false;
    }
  }

  _createSparkTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,220,100,1)');
    gradient.addColorStop(0.3, 'rgba(255,160,30,1)');
    gradient.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }
}

// ── Smoke Particles ──────────────────────────────────────────

class SmokeSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.alive = false;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
  }

  emit(origin) {
    this.alive = true;
    this.group.visible = true;
    this._elapsed = 0;

    // Clean previous
    while (this.group.children.length) {
      const c = this.group.children[0];
      c.geometry.dispose();
      c.material.dispose();
      this.group.remove(c);
    }
    this.particles = [];

    for (let i = 0; i < 30; i++) {
      const geo = new THREE.PlaneGeometry(0.5 + Math.random() * 0.8, 0.5 + Math.random() * 0.8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x444444,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        origin.x + (Math.random() - 0.5) * 0.5,
        origin.y + (Math.random() - 0.5) * 0.5,
        origin.z + (Math.random() - 0.5) * 0.5
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        0.5 + Math.random() * 1.0,
        (Math.random() - 0.5) * 0.8
      );

      this.particles.push({ mesh, vel, life: 1 + Math.random() * 2 });
      this.group.add(mesh);
    }
  }

  update(dt) {
    if (!this.alive) return;
    this._elapsed += dt;
    let allDead = true;

    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      allDead = false;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      p.mesh.material.opacity = Math.max(0, p.life / 3) * 0.4;
      p.mesh.scale.addScalar(dt * 0.5);
      p.mesh.rotation.z += dt * 0.3;
    }

    if (allDead || this._elapsed > 4) {
      this.alive = false;
      this.group.visible = false;
    }
  }
}

// ── Debris Particles (blade fragments) ───────────────────────

// ── Debris Particles (blade fragments) ───────────────────────
import { spawnPhysicalDebris, clearPhysicalDebris, updatePhysics } from '../physics/physics.js';

class DebrisSystem {
  constructor(scene) {
    this.scene = scene;
    this.pieces = [];
    this.alive = false;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
  }

  emit(origin, bladeColor) {
    this.alive = true;
    this.group.visible = true;
    this._elapsed = 0;

    clearPhysicalDebris();

    while (this.group.children.length) {
      const c = this.group.children[0];
      c.geometry.dispose();
      c.material.dispose();
      this.group.remove(c);
    }
    this.pieces = [];

    // Increase number of debris pieces for high-fidelity physics explosion!
    for (let i = 0; i < 28; i++) {
      const w = 0.08 + Math.random() * 0.22;
      const h = 0.04 + Math.random() * 0.12;
      const d = 0.015 + Math.random() * 0.04;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({
        color: bladeColor || 0x4a3728,
        roughness: 0.6,
        metalness: 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Random starting offset near the hub
      const spawnPos = origin.clone().set(
        origin.x + (Math.random() - 0.5) * 0.3,
        origin.y + (Math.random() - 0.5) * 0.3,
        origin.z + (Math.random() - 0.5) * 0.3
      );
      mesh.position.copy(spawnPos);

      // Random outwards velocity
      const speed = 2.5 + Math.random() * 5.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() * 0.4 + 0.1) * Math.PI; // eject outwards/upwards
      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed + 1.5,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      // Random spin
      const rotVel = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );

      this.group.add(mesh);
      this.pieces.push({ mesh, life: 3.5 + Math.random() * 1.5 });

      // Spawn in physics world
      spawnPhysicalDebris(
        mesh,
        new THREE.Vector3(w, h, d),
        spawnPos,
        vel,
        rotVel
      );
    }
  }

  update(dt) {
    if (!this.alive) return;
    this._elapsed += dt;

    // Tick the Cannon physics engine
    updatePhysics(dt);

    let allDead = true;
    for (const p of this.pieces) {
      p.life -= dt;
      if (p.life > 0) {
        allDead = false;
        // Fade out slightly as lifetime decays
        if (p.mesh.material && p.life < 1.0) {
          p.mesh.material.transparent = true;
          p.mesh.material.opacity = Math.max(0, p.life);
        }
      } else {
        p.mesh.visible = false;
      }
    }

    if (allDead || this._elapsed > 5.5) {
      this.alive = false;
      this.group.visible = false;
      clearPhysicalDebris();
    }
  }
}

// ── Heat Glow Ring ───────────────────────────────────────────

class HeatGlow {
  constructor(scene) {
    const geo = new THREE.RingGeometry(0.35, 0.65, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = -0.05;
    scene.add(this.mesh);
    this._intensity = 0;
  }

  setIntensity(pct) {
    // pct: 0 = no glow, 1 = max glow
    this._intensity = pct;
    this.mesh.material.opacity = pct * 0.6;
    // shift color from orange to red
    const r = 1;
    const g = 0.3 * (1 - pct);
    const b = 0;
    this.mesh.material.color.setRGB(r, g, b);
    this.mesh.scale.setScalar(1 + pct * 0.3);
  }

  update(dt) {
    // Pulse effect
    if (this._intensity > 0) {
      const pulse = Math.sin(Date.now() * 0.008) * 0.1;
      this.mesh.material.opacity = Math.max(0, this._intensity * 0.6 + pulse);
    }
  }
}

export { SparkSystem, SmokeSystem, DebrisSystem, HeatGlow };
