import { BlockType, CHUNK_HEIGHT, CHUNK_WIDTH, SEA_LEVEL } from './constants';

// Fast 2D Simplex-like Perlin Noise Generator
class Noise2D {
  private perm: Uint8Array;

  constructor(seed: number = 1337) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    // Shuffle with seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  public noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
    const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));

    return this.lerp(v, x1, x2);
  }

  // Multi-octave fractal noise
  public fbm(x: number, y: number, octaves = 4, persistence = 0.5, lacunarity = 2.0): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}

export const terrainNoise = new Noise2D(4242);
export const biomeNoise = new Noise2D(9876);
export const treeNoise = new Noise2D(5432);

export interface TreeData {
  x: number;
  y: number;
  z: number;
  height: number;
}

// Computes height at global world coordinates (wx, wz)
export function getTerrainHeight(wx: number, wz: number): number {
  // Low-frequency rolling terrain
  const base = terrainNoise.fbm(wx * 0.012, wz * 0.012, 3, 0.5, 2.0);
  // High-frequency mountain ridges
  const detail = terrainNoise.fbm(wx * 0.04, wz * 0.04, 2, 0.5, 2.0);
  // Mountain multiplier from biome
  const mountainFactor = Math.max(0, biomeNoise.noise(wx * 0.006, wz * 0.006));

  const rawHeight = 16 + base * 12 + detail * 4 + mountainFactor * 14;
  return Math.max(3, Math.min(CHUNK_HEIGHT - 10, Math.floor(rawHeight)));
}

// Generate chunk block voxel array [x + y * CHUNK_WIDTH + z * CHUNK_WIDTH * CHUNK_HEIGHT]
export function generateChunkVoxels(
  chunkX: number,
  chunkZ: number
): { voxels: Uint8Array; trees: TreeData[] } {
  const voxels = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_WIDTH);
  const trees: TreeData[] = [];

  const getIdx = (x: number, y: number, z: number) => {
    return x + y * CHUNK_WIDTH + z * CHUNK_WIDTH * CHUNK_HEIGHT;
  };

  // Generate ground columns
  for (let lz = 0; lz < CHUNK_WIDTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      const wx = chunkX * CHUNK_WIDTH + lx;
      const wz = chunkZ * CHUNK_WIDTH + lz;

      const surfaceY = getTerrainHeight(wx, wz);

      // Bedrock at the very bottom
      voxels[getIdx(lx, 0, lz)] = BlockType.BEDROCK;

      for (let y = 1; y < CHUNK_HEIGHT; y++) {
        const idx = getIdx(lx, y, lz);

        if (y < surfaceY - 3) {
          // Stone layer
          // Rare diamond ore veins deep down
          const oreNoise = terrainNoise.noise(wx * 0.2 + y * 0.3, wz * 0.2 + y * 0.3);
          if (y <= 9 && oreNoise > 0.68) {
            voxels[idx] = BlockType.DIAMOND_ORE;
          } else {
            voxels[idx] = BlockType.STONE;
          }
        } else if (y < surfaceY) {
          // Dirt layer below surface
          if (surfaceY <= SEA_LEVEL + 1) {
            voxels[idx] = BlockType.SAND;
          } else {
            voxels[idx] = BlockType.DIRT;
          }
        } else if (y === surfaceY) {
          // Surface block
          if (surfaceY <= SEA_LEVEL + 1) {
            voxels[idx] = BlockType.SAND;
          } else if (surfaceY > 28) {
            // High mountain peak: stone
            voxels[idx] = BlockType.STONE;
          } else {
            voxels[idx] = BlockType.GRASS;
          }
        } else if (y <= SEA_LEVEL && y > surfaceY) {
          // Ocean / water level fill
          voxels[idx] = BlockType.WATER;
        } else {
          // Air above surface
          voxels[idx] = BlockType.AIR;
        }
      }

      // Check if we should spawn a tree here
      if (
        surfaceY > SEA_LEVEL + 1 &&
        surfaceY < 27 &&
        lx >= 2 &&
        lx <= CHUNK_WIDTH - 3 &&
        lz >= 2 &&
        lz <= CHUNK_WIDTH - 3
      ) {
        // Deterministic pseudo-random tree check
        const tVal = treeNoise.noise(wx * 0.15, wz * 0.15);
        if (tVal > 0.48) {
          // Space trees apart
          const densityCheck = (Math.abs(wx * 31 + wz * 17) % 19) === 0;
          if (densityCheck) {
            trees.push({
              x: lx,
              y: surfaceY + 1,
              z: lz,
              height: 4 + Math.floor(Math.abs(tVal * 100) % 3),
            });
          }
        }
      }
    }
  }

  // Stamp trees into chunk voxel array
  for (const tree of trees) {
    const { x: tx, y: ty, z: tz, height: th } = tree;

    // Wood trunk
    for (let y = 0; y < th; y++) {
      const curY = ty + y;
      if (curY < CHUNK_HEIGHT) {
        voxels[getIdx(tx, curY, tz)] = BlockType.WOOD;
      }
    }

    // Leaves canopy (box layers centered on trunk top)
    const leafBase = ty + th - 2;
    for (let ly = leafBase; ly <= leafBase + 3; ly++) {
      if (ly >= CHUNK_HEIGHT) continue;
      const radius = ly >= leafBase + 2 ? 1 : 2;

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const px = tx + dx;
          const pz = tz + dz;
          if (px >= 0 && px < CHUNK_WIDTH && pz >= 0 && pz < CHUNK_WIDTH) {
            const idx = getIdx(px, ly, pz);
            // Skip corners on wider layer for rounded crown, and don't overwrite trunk
            const isCorner = Math.abs(dx) === radius && Math.abs(dz) === radius;
            if (isCorner && Math.random() > 0.4) continue;
            if (voxels[idx] === BlockType.AIR) {
              voxels[idx] = BlockType.LEAVES;
            }
          }
        }
      }
    }
  }

  return { voxels, trees };
}
