import * as THREE from 'three';
import { BlockType, BLOCK_DEFS } from './constants';

export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 16;
export const TEXTURE_SIZE = 16;

export interface AtlasCoords {
  col: number;
  row: number;
}

export const TEXTURE_SLOTS: Record<string, AtlasCoords> = {
  grass_top: { col: 0, row: 0 },
  grass_side: { col: 1, row: 0 },
  dirt: { col: 2, row: 0 },
  stone: { col: 3, row: 0 },
  cobblestone: { col: 4, row: 0 },
  wood_side: { col: 5, row: 0 },
  wood_top: { col: 6, row: 0 },
  leaves: { col: 7, row: 0 },
  sand: { col: 8, row: 0 },
  water: { col: 9, row: 0 },
  planks: { col: 10, row: 0 },
  brick: { col: 11, row: 0 },
  glass: { col: 12, row: 0 },
  glowstone: { col: 13, row: 0 },
  bedrock: { col: 14, row: 0 },
  diamond_ore: { col: 15, row: 0 },
  gold: { col: 0, row: 1 },
  tnt_top: { col: 1, row: 1 },
  tnt_side: { col: 2, row: 1 },
  tnt_bottom: { col: 3, row: 1 },
  bookshelf: { col: 4, row: 1 },
};

// Generates pixel patterns on an Offscreen/Canvas
function createProceduralAtlasCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TEXTURE_SIZE;
  canvas.height = ATLAS_ROWS * TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Clear with transparent black
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const drawPixel = (
    baseCol: number,
    baseRow: number,
    x: number,
    y: number,
    color: string
  ) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      baseCol * TEXTURE_SIZE + x,
      baseRow * TEXTURE_SIZE + y,
      1,
      1
    );
  };

  const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // 1. Dirt
  const drawDirt = (c: number, r: number) => {
    const shades = ['#866043', '#77543a', '#684a32', '#936a4b', '#5c402b'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx = Math.floor(pseudoRandom(x * 13 + y * 37) * shades.length);
        drawPixel(c, r, x, y, shades[idx]);
      }
    }
  };

  // 2. Grass Top
  const drawGrassTop = (c: number, r: number) => {
    const shades = ['#4f8826', '#5b9c2d', '#447820', '#67ad33', '#3d6c1c'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx = Math.floor(pseudoRandom(x * 19 + y * 41 + 101) * shades.length);
        drawPixel(c, r, x, y, shades[idx]);
      }
    }
  };

  // 3. Grass Side
  const drawGrassSide = (c: number, r: number) => {
    drawDirt(c, r);
    const grassShades = ['#4f8826', '#5b9c2d', '#447820', '#67ad33'];
    // Grass overhang at top (2-4 pixels down with jagged edges)
    for (let x = 0; x < 16; x++) {
      const drop = Math.floor(pseudoRandom(x * 17 + 23) * 3) + 2;
      for (let y = 0; y < drop; y++) {
        const idx = Math.floor(pseudoRandom(x * 3 + y * 7 + 55) * grassShades.length);
        drawPixel(c, r, x, y, grassShades[idx]);
      }
      if (pseudoRandom(x * 31) > 0.5 && drop < 5) {
        drawPixel(c, r, x, drop, grassShades[1]);
      }
    }
  };

  // 4. Stone
  const drawStone = (c: number, r: number) => {
    const shades = ['#757575', '#6e6e6e', '#828282', '#616161', '#8c8c8c'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx = Math.floor(pseudoRandom(x * 7 + y * 29 + 89) * shades.length);
        drawPixel(c, r, x, y, shades[idx]);
      }
    }
  };

  // 5. Cobblestone
  const drawCobblestone = (c: number, r: number) => {
    const shades = ['#4f4f4f', '#606060', '#747474', '#8a8a8a', '#3e3e3e'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        // Create irregular mortar lines
        const isBorder = (x % 4 === 0 && y % 3 !== 0) || (y % 4 === 0);
        if (isBorder && pseudoRandom(x * 5 + y * 11) > 0.25) {
          drawPixel(c, r, x, y, shades[0]);
        } else {
          const idx = Math.floor(pseudoRandom(x * 9 + y * 13 + 3) * (shades.length - 1)) + 1;
          drawPixel(c, r, x, y, shades[idx]);
        }
      }
    }
  };

  // 6. Wood Side (Bark)
  const drawWoodSide = (c: number, r: number) => {
    const shades = ['#695133', '#574228', '#7a5f3d', '#483620', '#856743'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        // Vertical bark grooves
        const groove = (x % 4 === 0) ? 0.3 : 0.0;
        const val = pseudoRandom(x * 21 + y * 3 + 12) - groove;
        const idx = Math.max(0, Math.min(shades.length - 1, Math.floor(val * shades.length)));
        drawPixel(c, r, x, y, shades[idx]);
      }
    }
  };

  // 7. Wood Top (Rings)
  const drawWoodTop = (c: number, r: number) => {
    const bark = '#574228';
    const ringDark = '#947247';
    const ringLight = '#b08a59';
    const core = '#9e794c';

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 15) {
          drawPixel(c, r, x, y, bark);
        } else {
          const dist = Math.sqrt((x - 7.5) ** 2 + (y - 7.5) ** 2);
          if (dist < 2.2) {
            drawPixel(c, r, x, y, core);
          } else if (Math.floor(dist) % 2 === 0) {
            drawPixel(c, r, x, y, ringLight);
          } else {
            drawPixel(c, r, x, y, ringDark);
          }
        }
      }
    }
  };

  // 8. Leaves (with cutout transparency)
  const drawLeaves = (c: number, r: number) => {
    const shades = ['#285917', '#346d21', '#407e2a', '#1e4810'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const rnd = pseudoRandom(x * 47 + y * 71 + 9);
        if (rnd < 0.18) {
          // Transparent pixel in leaves
          // leave blank
        } else {
          const idx = Math.floor(rnd * shades.length);
          drawPixel(c, r, x, y, shades[idx]);
        }
      }
    }
  };

  // 9. Sand
  const drawSand = (c: number, r: number) => {
    const shades = ['#dbcfa0', '#cfc291', '#e8dcaf', '#c4b684'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx = Math.floor(pseudoRandom(x * 11 + y * 23 + 43) * shades.length);
        drawPixel(c, r, x, y, shades[idx]);
      }
    }
  };

  // 10. Water (translucent blue waves)
  const drawWater = (c: number, r: number) => {
    const shades = ['#386bd8', '#2e5ec4', '#4b7ce6', '#2550b0'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const wave = Math.sin(x * 0.8 + y * 0.4);
        const idx = Math.abs(Math.floor((wave + pseudoRandom(x + y * 13)) * 1.5)) % shades.length;
        drawPixel(c, r, x, y, shades[idx]);
      }
    }
  };

  // 11. Oak Planks
  const drawPlanks = (c: number, r: number) => {
    const shades = ['#b8945f', '#a88552', '#977545', '#c7a36c'];
    const seam = '#6a4e28';
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (y % 4 === 0) {
          drawPixel(c, r, x, y, seam);
        } else {
          const plankRow = Math.floor(y / 4);
          const isStaggeredSeam = (plankRow % 2 === 0 && x === 8) || (plankRow % 2 === 1 && (x === 4 || x === 12));
          if (isStaggeredSeam) {
            drawPixel(c, r, x, y, seam);
          } else {
            const idx = Math.floor(pseudoRandom(x * 5 + y * 19 + 77) * shades.length);
            drawPixel(c, r, x, y, shades[idx]);
          }
        }
      }
    }
  };

  // 12. Bricks
  const drawBricks = (c: number, r: number) => {
    const mortar = '#d3c5be';
    const brickShades = ['#9c493b', '#b35544', '#853e32', '#c25e4c'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (y % 4 === 0) {
          drawPixel(c, r, x, y, mortar);
        } else {
          const row = Math.floor(y / 4);
          const seamX = (row % 2 === 0) ? 8 : 0;
          if (x === seamX || (row % 2 !== 0 && x === 15)) {
            drawPixel(c, r, x, y, mortar);
          } else {
            const idx = Math.floor(pseudoRandom(x * 7 + y * 23 + 1) * brickShades.length);
            drawPixel(c, r, x, y, brickShades[idx]);
          }
        }
      }
    }
  };

  // 13. Glass
  const drawGlass = (c: number, r: number) => {
    const frame = '#e0f0f5';
    const glare = '#ffffff';
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 15) {
          drawPixel(c, r, x, y, frame);
        } else if ((x === 3 && y === 3) || (x === 4 && y === 3) || (x === 3 && y === 4)) {
          drawPixel(c, r, x, y, glare);
        } else if ((x === 11 && y === 11) || (x === 12 && y === 11) || (x === 11 && y === 12)) {
          drawPixel(c, r, x, y, glare);
        }
      }
    }
  };

  // 14. Glowstone
  const drawGlowstone = (c: number, r: number) => {
    const shades = ['#ffe27c', '#ffd24d', '#f3b426', '#e09819', '#fff1ad'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx = Math.floor(pseudoRandom(x * 31 + y * 17 + 81) * shades.length);
        drawPixel(c, r, x, y, shades[idx]);
      }
    }
  };

  // 15. Bedrock
  const drawBedrock = (c: number, r: number) => {
    const shades = ['#202020', '#151515', '#333333', '#404040', '#0a0a0a'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx = Math.floor(pseudoRandom(x * 13 + y * 29 + 63) * shades.length);
        drawPixel(c, r, x, y, shades[idx]);
      }
    }
  };

  // 16. Diamond Ore
  const drawDiamondOre = (c: number, r: number) => {
    drawStone(c, r);
    const gems = [
      [3, 4], [4, 4], [4, 5],
      [10, 3], [11, 3], [10, 4],
      [6, 11], [7, 11], [7, 12],
      [12, 10], [13, 10],
    ];
    for (const [gx, gy] of gems) {
      drawPixel(c, r, gx, gy, '#5dfaf8');
      if (gx > 0) drawPixel(c, r, gx - 1, gy, '#2ec7c5');
    }
  };

  // 17. Gold Block
  const drawGold = (c: number, r: number) => {
    const shades = ['#f5db38', '#ebce23', '#ffd942', '#d4b718'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 15) {
          drawPixel(c, r, x, y, '#d4b718');
        } else {
          const idx = Math.floor(pseudoRandom(x * 19 + y * 7 + 109) * shades.length);
          drawPixel(c, r, x, y, shades[idx]);
        }
      }
    }
  };

  // 18. TNT
  const drawTNTTop = (c: number, r: number) => {
    const shades = ['#b83321', '#cf3d28', '#a12b1a'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx = Math.floor(pseudoRandom(x * 11 + y * 13) * shades.length);
        drawPixel(c, r, x, y, shades[idx]);
      }
    }
    // Center fuse
    drawPixel(c, r, 7, 7, '#222222');
    drawPixel(c, r, 8, 7, '#222222');
    drawPixel(c, r, 7, 8, '#222222');
    drawPixel(c, r, 8, 8, '#222222');
  };

  const drawTNTSide = (c: number, r: number) => {
    const red = '#cf3d28';
    const darkRed = '#a12b1a';
    const white = '#f5f5f5';
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (y >= 5 && y <= 10) {
          drawPixel(c, r, x, y, white);
        } else {
          drawPixel(c, r, x, y, (x + y) % 3 === 0 ? darkRed : red);
        }
      }
    }
    // Black "TNT" pixel text in the middle band
    // T
    drawPixel(c, r, 2, 6, '#111'); drawPixel(c, r, 3, 6, '#111'); drawPixel(c, r, 4, 6, '#111');
    drawPixel(c, r, 3, 7, '#111'); drawPixel(c, r, 3, 8, '#111'); drawPixel(c, r, 3, 9, '#111');
    // N
    drawPixel(c, r, 6, 6, '#111'); drawPixel(c, r, 6, 7, '#111'); drawPixel(c, r, 6, 8, '#111'); drawPixel(c, r, 6, 9, '#111');
    drawPixel(c, r, 7, 7, '#111'); drawPixel(c, r, 8, 8, '#111');
    drawPixel(c, r, 9, 6, '#111'); drawPixel(c, r, 9, 7, '#111'); drawPixel(c, r, 9, 8, '#111'); drawPixel(c, r, 9, 9, '#111');
    // T
    drawPixel(c, r, 11, 6, '#111'); drawPixel(c, r, 12, 6, '#111'); drawPixel(c, r, 13, 6, '#111');
    drawPixel(c, r, 12, 7, '#111'); drawPixel(c, r, 12, 8, '#111'); drawPixel(c, r, 12, 9, '#111');
  };

  // 19. Bookshelf
  const drawBookshelf = (c: number, r: number) => {
    drawPlanks(c, r);
    // Draw 2 shelves with books
    const bookColors = ['#9c3425', '#24598a', '#2d6d37', '#917926', '#593073'];
    for (let shelf = 0; shelf < 2; shelf++) {
      const startY = shelf === 0 ? 2 : 9;
      for (let x = 2; x < 14; x++) {
        const col = bookColors[x % bookColors.length];
        for (let y = startY; y < startY + 5; y++) {
          drawPixel(c, r, x, y, col);
        }
        // Top highlight
        drawPixel(c, r, x, startY, '#f5e4c6');
      }
    }
  };

  // Render all into the atlas
  drawGrassTop(0, 0);
  drawGrassSide(1, 0);
  drawDirt(2, 0);
  drawStone(3, 0);
  drawCobblestone(4, 0);
  drawWoodSide(5, 0);
  drawWoodTop(6, 0);
  drawLeaves(7, 0);
  drawSand(8, 0);
  drawWater(9, 0);
  drawPlanks(10, 0);
  drawBricks(11, 0);
  drawGlass(12, 0);
  drawGlowstone(13, 0);
  drawBedrock(14, 0);
  drawDiamondOre(15, 0);
  drawGold(0, 1);
  drawTNTTop(1, 1);
  drawTNTSide(2, 1);
  drawDirt(3, 1); // TNT bottom
  drawBookshelf(4, 1);

  return canvas;
}

let cachedTexture: THREE.CanvasTexture | null = null;
let cachedCanvas: HTMLCanvasElement | null = null;
const cachedIcons: Map<BlockType, string> = new Map();

export function getVoxelAtlasTexture(): THREE.CanvasTexture {
  if (!cachedTexture) {
    if (!cachedCanvas) {
      cachedCanvas = createProceduralAtlasCanvas();
    }
    cachedTexture = new THREE.CanvasTexture(cachedCanvas);
    cachedTexture.magFilter = THREE.NearestFilter;
    cachedTexture.minFilter = THREE.NearestFilter;
    cachedTexture.generateMipmaps = false;
    cachedTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return cachedTexture;
}

export function getBlockUVs(textureName: string): [number, number, number, number] {
  const slot = TEXTURE_SLOTS[textureName] || TEXTURE_SLOTS['dirt'];
  const u0 = slot.col / ATLAS_COLS;
  const v0 = 1.0 - (slot.row + 1) / ATLAS_ROWS;
  const u1 = (slot.col + 1) / ATLAS_COLS;
  const v1 = 1.0 - slot.row / ATLAS_ROWS;
  return [u0, v0, u1, v1];
}

// Generate data URL icon for hotbar / inventory display
export function getBlockIconDataUrl(blockType: BlockType): string {
  if (cachedIcons.has(blockType)) {
    return cachedIcons.get(blockType)!;
  }

  const def = BLOCK_DEFS[blockType];
  if (!def || blockType === BlockType.AIR) return '';

  if (!cachedCanvas) {
    cachedCanvas = createProceduralAtlasCanvas();
  }

  const iconCanvas = document.createElement('canvas');
  iconCanvas.width = 32;
  iconCanvas.height = 32;
  const ctx = iconCanvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const slot = TEXTURE_SLOTS[def.sideTexture] || TEXTURE_SLOTS[def.topTexture] || { col: 2, row: 0 };
  
  ctx.drawImage(
    cachedCanvas,
    slot.col * TEXTURE_SIZE,
    slot.row * TEXTURE_SIZE,
    TEXTURE_SIZE,
    TEXTURE_SIZE,
    0,
    0,
    32,
    32
  );

  const dataUrl = iconCanvas.toDataURL('image/png');
  cachedIcons.set(blockType, dataUrl);
  return dataUrl;
}
