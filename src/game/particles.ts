import * as THREE from 'three';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

const MAX_PARTICLES = 160;

export class ParticleSystem {
  public scene: THREE.Scene;
  private instancedMesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private dummy = new THREE.Object3D();
  private gravity = 18.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshLambertMaterial({});

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.frustumCulled = false;
    this.scene.add(this.instancedMesh);

    // Hide all instances initially
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.dummy.position.set(0, -999, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public emitBlockBreak(x: number, y: number, z: number, colorHex: number) {
    const burstCount = 14;
    const baseColor = new THREE.Color(colorHex);

    for (let i = 0; i < burstCount; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }

      // Slightly vary particle tint
      const pColor = baseColor.clone();
      pColor.offsetHSL(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.15
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 3.5;

      this.particles.push({
        x: x + 0.5 + (Math.random() - 0.5) * 0.6,
        y: y + 0.5 + (Math.random() - 0.5) * 0.6,
        z: z + 0.5 + (Math.random() - 0.5) * 0.6,
        vx: Math.cos(angle) * speed * (Math.random() * 0.8 + 0.2),
        vy: 2.2 + Math.random() * 4.0,
        vz: Math.sin(angle) * speed * (Math.random() * 0.8 + 0.2),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
        scale: 0.8 + Math.random() * 0.6,
        color: pColor,
      });
    }
  }

  public update(dt: number) {
    const activeCount = this.particles.length;

    for (let i = activeCount - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // Gravity & position integration
      p.vy -= this.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }

    // Update instanced meshes
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        const progress = p.life / p.maxLife;
        const currentScale = Math.max(0.01, p.scale * (1.0 - progress));

        this.dummy.position.set(p.x, p.y, p.z);
        this.dummy.scale.set(currentScale, currentScale, currentScale);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
        this.instancedMesh.setColorAt(i, p.color);
      } else {
        this.dummy.position.set(0, -999, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      }
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  public dispose() {
    this.scene.remove(this.instancedMesh);
    this.instancedMesh.geometry.dispose();
  }
}
