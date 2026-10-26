import * as THREE from 'three';
import {
  BlockType,
  BLOCK_DEFS,
  CHUNK_HEIGHT,
  CHUNK_WIDTH,
  SEA_LEVEL,
} from './constants';
import { generateChunkVoxels } from './terrain';
import { getBlockUVs, getVoxelAtlasTexture } from './textures';

export interface VoxelRaycastHit {
  blockX: number;
  blockY: number;
  blockZ: number;
  faceNormal: THREE.Vector3;
  blockType: BlockType;
}

export class Chunk {
  public chunkX: number;
  public chunkZ: number;
  public voxels: Uint8Array;
  public mesh: THREE.Mesh | null = null;
  public waterMesh: THREE.Mesh | null = null;
  public isDirty: boolean = true;
  private scene: THREE.Scene;
  private solidMaterial: THREE.MeshLambertMaterial;
  private waterMaterial: THREE.MeshLambertMaterial;

  constructor(
    chunkX: number,
    chunkZ: number,
    scene: THREE.Scene,
    solidMat: THREE.MeshLambertMaterial,
    waterMat: THREE.MeshLambertMaterial
  ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.scene = scene;
    this.solidMaterial = solidMat;
    this.waterMaterial = waterMat;

    const { voxels } = generateChunkVoxels(chunkX, chunkZ);
    this.voxels = voxels;
  }

  public getIndex(lx: number, ly: number, lz: number): number {
    return lx + ly * CHUNK_WIDTH + lz * CHUNK_WIDTH * CHUNK_HEIGHT;
  }

  public getBlock(lx: number, ly: number, lz: number): BlockType {
    if (
      lx < 0 ||
      lx >= CHUNK_WIDTH ||
      ly < 0 ||
      ly >= CHUNK_HEIGHT ||
      lz < 0 ||
      lz >= CHUNK_WIDTH
    ) {
      return BlockType.AIR;
    }
    return this.voxels[this.getIndex(lx, ly, lz)] as BlockType;
  }

  public setBlock(lx: number, ly: number, lz: number, type: BlockType): boolean {
    if (
      lx < 0 ||
      lx >= CHUNK_WIDTH ||
      ly < 0 ||
      ly >= CHUNK_HEIGHT ||
      lz < 0 ||
      lz >= CHUNK_WIDTH
    ) {
      return false;
    }
    this.voxels[this.getIndex(lx, ly, lz)] = type;
    this.isDirty = true;
    return true;
  }

  public rebuildMesh(world: VoxelWorld) {
    if (!this.isDirty) return;
    this.isDirty = false;

    // Remove existing meshes
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.waterMesh) {
      this.scene.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      this.waterMesh = null;
    }

    const solidPositions: number[] = [];
    const solidNormals: number[] = [];
    const solidUVs: number[] = [];
    const solidColors: number[] = [];

    const waterPositions: number[] = [];
    const waterNormals: number[] = [];
    const waterUVs: number[] = [];
    const waterColors: number[] = [];

    const worldOriginX = this.chunkX * CHUNK_WIDTH;
    const worldOriginZ = this.chunkZ * CHUNK_WIDTH;

    // Face definitions [dx, dy, dz, normalX, normalY, normalZ, lightMultiplier]
    const faces = [
      // Top face (Y+)
      {
        dir: [0, 1, 0],
        norm: [0, 1, 0],
        corners: [
          [0, 1, 1],
          [1, 1, 1],
          [1, 1, 0],
          [0, 1, 0],
        ],
        light: 1.0,
        texProp: 'topTexture',
      },
      // Bottom face (Y-)
      {
        dir: [0, -1, 0],
        norm: [0, -1, 0],
        corners: [
          [0, 0, 0],
          [1, 0, 0],
          [1, 0, 1],
          [0, 0, 1],
        ],
        light: 0.52,
        texProp: 'bottomTexture',
      },
      // East face (X+)
      {
        dir: [1, 0, 0],
        norm: [1, 0, 0],
        corners: [
          [1, 0, 1],
          [1, 0, 0],
          [1, 1, 0],
          [1, 1, 1],
        ],
        light: 0.72,
        texProp: 'sideTexture',
      },
      // West face (X-)
      {
        dir: [-1, 0, 0],
        norm: [-1, 0, 0],
        corners: [
          [0, 0, 0],
          [0, 0, 1],
          [0, 1, 1],
          [0, 1, 0],
        ],
        light: 0.72,
        texProp: 'sideTexture',
      },
      // South face (Z+)
      {
        dir: [0, 0, 1],
        norm: [0, 0, 1],
        corners: [
          [0, 0, 1],
          [1, 0, 1],
          [1, 1, 1],
          [0, 1, 1],
        ],
        light: 0.86,
        texProp: 'sideTexture',
      },
      // North face (Z-)
      {
        dir: [0, 0, -1],
        norm: [0, 0, -1],
        corners: [
          [1, 0, 0],
          [0, 0, 0],
          [0, 1, 0],
          [1, 1, 0],
        ],
        light: 0.86,
        texProp: 'sideTexture',
      },
    ];

    for (let lz = 0; lz < CHUNK_WIDTH; lz++) {
      for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
        for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
          const block = this.getBlock(lx, ly, lz);
          if (block === BlockType.AIR) continue;

          const def = BLOCK_DEFS[block];
          if (!def) continue;

          const isWater = block === BlockType.WATER;
          const posList = isWater ? waterPositions : solidPositions;
          const normList = isWater ? waterNormals : solidNormals;
          const uvList = isWater ? waterUVs : solidUVs;
          const colList = isWater ? waterColors : solidColors;

          const wx = worldOriginX + lx;
          const wz = worldOriginZ + lz;

          for (const face of faces) {
            const nwx = wx + face.dir[0];
            const nwy = ly + face.dir[1];
            const nwz = wz + face.dir[2];

            const neighbor = world.getBlock(nwx, nwy, nwz);
            const neighborDef = BLOCK_DEFS[neighbor];

            let shouldRenderFace = false;
            if (isWater) {
              // Water only renders against air or non-water transparent blocks
              shouldRenderFace = neighbor === BlockType.AIR;
            } else {
              // Solid block renders if neighbor is air, water, or transparent (like leaves or glass)
              if (
                neighbor === BlockType.AIR ||
                neighbor === BlockType.WATER ||
                (neighborDef?.isTransparent && neighbor !== block)
              ) {
                shouldRenderFace = true;
              }
            }

            if (!shouldRenderFace) continue;

            const texName =
              (def as unknown as Record<string, string>)[face.texProp] ||
              def.sideTexture ||
              'dirt';
            const [u0, v0, u1, v1] = getBlockUVs(texName);

            // Water slight dip on top face
            const yOffset = isWater && face.dir[1] === 1 ? -0.12 : 0;

            const c = face.corners;
            // Quad is made of 2 triangles: (0, 1, 2) and (0, 2, 3)
            const quadVertices = [
              c[0],
              c[1],
              c[2],
              c[0],
              c[2],
              c[3],
            ];

            const quadUVs = [
              [u0, v0],
              [u1, v0],
              [u1, v1],
              [u0, v0],
              [u1, v1],
              [u0, v1],
            ];

            for (let i = 0; i < 6; i++) {
              const vert = quadVertices[i];
              posList.push(
                wx + vert[0],
                ly + vert[1] + (vert[1] === 1 ? yOffset : 0),
                wz + vert[2]
              );
              normList.push(face.norm[0], face.norm[1], face.norm[2]);
              uvList.push(quadUVs[i][0], quadUVs[i][1]);

              // Light shading
              const light = face.light;
              colList.push(light, light, light);
            }
          }
        }
      }
    }

    // Build solid mesh
    if (solidPositions.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(solidPositions, 3)
      );
      geometry.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute(solidNormals, 3)
      );
      geometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(solidUVs, 2)
      );
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(solidColors, 3)
      );

      this.mesh = new THREE.Mesh(geometry, this.solidMaterial);
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
      this.scene.add(this.mesh);
    }

    // Build water mesh (translucent)
    if (waterPositions.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(waterPositions, 3)
      );
      geometry.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute(waterNormals, 3)
      );
      geometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(waterUVs, 2)
      );
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(waterColors, 3)
      );

      this.waterMesh = new THREE.Mesh(geometry, this.waterMaterial);
      this.scene.add(this.waterMesh);
    }
  }

  public dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.waterMesh) {
      this.scene.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      this.waterMesh = null;
    }
  }
}

export class VoxelWorld {
  public scene: THREE.Scene;
  public chunks: Map<string, Chunk> = new Map();
  public solidMaterial: THREE.MeshLambertMaterial;
  public waterMaterial: THREE.MeshLambertMaterial;
  public blockOutline: THREE.LineSegments;
  public renderRadius: number = 3; // 7x7 chunks = 49 chunks around player
  private atlasTexture: THREE.CanvasTexture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.atlasTexture = getVoxelAtlasTexture();

    // Solid block material with vertex colors for directional shading
    this.solidMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.5,
    });

    // Water block material (translucent blue)
    this.waterMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    // Block highlight wireframe box
    const boxGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(boxGeo);
    this.blockOutline = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
    );
    this.blockOutline.visible = false;
    this.scene.add(this.blockOutline);
  }

  private chunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.chunkKey(cx, cz));
  }

  public getOrCreateChunk(cx: number, cz: number): Chunk {
    const key = this.chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(
        cx,
        cz,
        this.scene,
        this.solidMaterial,
        this.waterMaterial
      );
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  public getBlock(wx: number, wy: number, wz: number): BlockType {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return BlockType.AIR;
    const cx = Math.floor(wx / CHUNK_WIDTH);
    const cz = Math.floor(wz / CHUNK_WIDTH);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BlockType.AIR;

    let lx = wx % CHUNK_WIDTH;
    if (lx < 0) lx += CHUNK_WIDTH;
    let lz = wz % CHUNK_WIDTH;
    if (lz < 0) lz += CHUNK_WIDTH;

    return chunk.getBlock(lx, wy, lz);
  }

  public setBlock(
    wx: number,
    wy: number,
    wz: number,
    type: BlockType
  ): boolean {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return false;
    const cx = Math.floor(wx / CHUNK_WIDTH);
    const cz = Math.floor(wz / CHUNK_WIDTH);
    const chunk = this.getOrCreateChunk(cx, cz);

    let lx = wx % CHUNK_WIDTH;
    if (lx < 0) lx += CHUNK_WIDTH;
    let lz = wz % CHUNK_WIDTH;
    if (lz < 0) lz += CHUNK_WIDTH;

    const ok = chunk.setBlock(lx, wy, lz, type);
    if (ok) {
      chunk.rebuildMesh(this);

      // If on chunk border, mark neighbor chunk dirty and rebuild too
      if (lx === 0) this.getChunk(cx - 1, cz)?.rebuildMesh(this);
      if (lx === CHUNK_WIDTH - 1) this.getChunk(cx + 1, cz)?.rebuildMesh(this);
      if (lz === 0) this.getChunk(cx, cz - 1)?.rebuildMesh(this);
      if (lz === CHUNK_WIDTH - 1) this.getChunk(cx, cz + 1)?.rebuildMesh(this);
    }
    return ok;
  }

  // Update chunks around player position
  public update(playerX: number, playerZ: number) {
    const centerCX = Math.floor(playerX / CHUNK_WIDTH);
    const centerCZ = Math.floor(playerZ / CHUNK_WIDTH);
    const r = this.renderRadius;

    // Load active chunks
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const cx = centerCX + dx;
        const cz = centerCZ + dz;
        const chunk = this.getOrCreateChunk(cx, cz);
        if (chunk.isDirty) {
          chunk.rebuildMesh(this);
        }
      }
    }

    // Unload distant chunks (beyond radius + 2)
    const unloadDistSq = (r + 2) * (r + 2);
    for (const [key, chunk] of this.chunks.entries()) {
      const dx = chunk.chunkX - centerCX;
      const dz = chunk.chunkZ - centerCZ;
      if (dx * dx + dz * dz > unloadDistSq) {
        chunk.dispose();
        this.chunks.delete(key);
      }
    }
  }

  // Fast exact Voxel DDA Raycast
  public raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number = 6.5
  ): VoxelRaycastHit | null {
    let px = origin.x;
    let py = origin.y;
    let pz = origin.z;

    const dx = direction.x;
    const dy = direction.y;
    const dz = direction.z;

    let ix = Math.floor(px);
    let iy = Math.floor(py);
    let iz = Math.floor(pz);

    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

    const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;

    let tMaxX =
      stepX > 0
        ? (ix + 1 - px) * tDeltaX
        : stepX < 0
        ? (px - ix) * tDeltaX
        : Infinity;
    let tMaxY =
      stepY > 0
        ? (iy + 1 - py) * tDeltaY
        : stepY < 0
        ? (py - iy) * tDeltaY
        : Infinity;
    let tMaxZ =
      stepZ > 0
        ? (iz + 1 - pz) * tDeltaZ
        : stepZ < 0
        ? (pz - iz) * tDeltaZ
        : Infinity;

    let normalX = 0;
    let normalY = 0;
    let normalZ = 0;

    let dist = 0;

    while (dist < maxDistance) {
      const block = this.getBlock(ix, iy, iz);
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        return {
          blockX: ix,
          blockY: iy,
          blockZ: iz,
          faceNormal: new THREE.Vector3(normalX, normalY, normalZ),
          blockType: block,
        };
      }

      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          dist = tMaxX;
          tMaxX += tDeltaX;
          ix += stepX;
          normalX = -stepX;
          normalY = 0;
          normalZ = 0;
        } else {
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          iz += stepZ;
          normalX = 0;
          normalY = 0;
          normalZ = -stepZ;
        }
      } else {
        if (tMaxY < tMaxZ) {
          dist = tMaxY;
          tMaxY += tDeltaY;
          iy += stepY;
          normalX = 0;
          normalY = -stepY;
          normalZ = 0;
        } else {
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          iz += stepZ;
          normalX = 0;
          normalY = 0;
          normalZ = -stepZ;
        }
      }
    }

    return null;
  }

  public updateTargetOutline(hit: VoxelRaycastHit | null) {
    if (hit) {
      this.blockOutline.position.set(
        hit.blockX + 0.5,
        hit.blockY + 0.5,
        hit.blockZ + 0.5
      );
      this.blockOutline.visible = true;
    } else {
      this.blockOutline.visible = false;
    }
  }

  public dispose() {
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
    }
    this.chunks.clear();
    this.scene.remove(this.blockOutline);
    this.blockOutline.geometry.dispose();
    this.solidMaterial.dispose();
    this.waterMaterial.dispose();
  }
}
