export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  COBBLESTONE = 4,
  WOOD = 5,
  LEAVES = 6,
  SAND = 7,
  WATER = 8,
  PLANKS = 9,
  BRICK = 10,
  GLASS = 11,
  GLOWSTONE = 12,
  BEDROCK = 13,
  DIAMOND_ORE = 14,
  GOLD_BLOCK = 15,
  TNT = 16,
  BOOKSHELF = 17,
}

export interface BlockDef {
  id: BlockType;
  name: string;
  isTransparent?: boolean;
  isSolid?: boolean;
  isLiquid?: boolean;
  color: string; // for particles / fallback
  particleColor: number;
  lightEmission?: number;
  topTexture: string;
  sideTexture: string;
  bottomTexture: string;
}

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  [BlockType.AIR]: {
    id: BlockType.AIR,
    name: 'Air',
    isTransparent: true,
    isSolid: false,
    color: '#000000',
    particleColor: 0x000000,
    topTexture: 'air',
    sideTexture: 'air',
    bottomTexture: 'air',
  },
  [BlockType.GRASS]: {
    id: BlockType.GRASS,
    name: 'Grass Block',
    isSolid: true,
    color: '#5b8e32',
    particleColor: 0x5b8e32,
    topTexture: 'grass_top',
    sideTexture: 'grass_side',
    bottomTexture: 'dirt',
  },
  [BlockType.DIRT]: {
    id: BlockType.DIRT,
    name: 'Dirt',
    isSolid: true,
    color: '#866043',
    particleColor: 0x866043,
    topTexture: 'dirt',
    sideTexture: 'dirt',
    bottomTexture: 'dirt',
  },
  [BlockType.STONE]: {
    id: BlockType.STONE,
    name: 'Stone',
    isSolid: true,
    color: '#7b7b7b',
    particleColor: 0x7b7b7b,
    topTexture: 'stone',
    sideTexture: 'stone',
    bottomTexture: 'stone',
  },
  [BlockType.COBBLESTONE]: {
    id: BlockType.COBBLESTONE,
    name: 'Cobblestone',
    isSolid: true,
    color: '#606060',
    particleColor: 0x606060,
    topTexture: 'cobblestone',
    sideTexture: 'cobblestone',
    bottomTexture: 'cobblestone',
  },
  [BlockType.WOOD]: {
    id: BlockType.WOOD,
    name: 'Oak Wood',
    isSolid: true,
    color: '#6b5130',
    particleColor: 0x6b5130,
    topTexture: 'wood_top',
    sideTexture: 'wood_side',
    bottomTexture: 'wood_top',
  },
  [BlockType.LEAVES]: {
    id: BlockType.LEAVES,
    name: 'Oak Leaves',
    isTransparent: true,
    isSolid: true,
    color: '#346d22',
    particleColor: 0x346d22,
    topTexture: 'leaves',
    sideTexture: 'leaves',
    bottomTexture: 'leaves',
  },
  [BlockType.SAND]: {
    id: BlockType.SAND,
    name: 'Sand',
    isSolid: true,
    color: '#d6c68a',
    particleColor: 0xd6c68a,
    topTexture: 'sand',
    sideTexture: 'sand',
    bottomTexture: 'sand',
  },
  [BlockType.WATER]: {
    id: BlockType.WATER,
    name: 'Water',
    isTransparent: true,
    isSolid: false,
    isLiquid: true,
    color: '#3b68c9',
    particleColor: 0x3b68c9,
    topTexture: 'water',
    sideTexture: 'water',
    bottomTexture: 'water',
  },
  [BlockType.PLANKS]: {
    id: BlockType.PLANKS,
    name: 'Oak Planks',
    isSolid: true,
    color: '#a07d4b',
    particleColor: 0xa07d4b,
    topTexture: 'planks',
    sideTexture: 'planks',
    bottomTexture: 'planks',
  },
  [BlockType.BRICK]: {
    id: BlockType.BRICK,
    name: 'Bricks',
    isSolid: true,
    color: '#9b4d3f',
    particleColor: 0x9b4d3f,
    topTexture: 'brick',
    sideTexture: 'brick',
    bottomTexture: 'brick',
  },
  [BlockType.GLASS]: {
    id: BlockType.GLASS,
    name: 'Glass',
    isTransparent: true,
    isSolid: true,
    color: '#d7e8ee',
    particleColor: 0xd7e8ee,
    topTexture: 'glass',
    sideTexture: 'glass',
    bottomTexture: 'glass',
  },
  [BlockType.GLOWSTONE]: {
    id: BlockType.GLOWSTONE,
    name: 'Glowstone',
    isSolid: true,
    color: '#ebd677',
    particleColor: 0xebd677,
    lightEmission: 1.0,
    topTexture: 'glowstone',
    sideTexture: 'glowstone',
    bottomTexture: 'glowstone',
  },
  [BlockType.BEDROCK]: {
    id: BlockType.BEDROCK,
    name: 'Bedrock',
    isSolid: true,
    color: '#282828',
    particleColor: 0x282828,
    topTexture: 'bedrock',
    sideTexture: 'bedrock',
    bottomTexture: 'bedrock',
  },
  [BlockType.DIAMOND_ORE]: {
    id: BlockType.DIAMOND_ORE,
    name: 'Diamond Ore',
    isSolid: true,
    color: '#4dedf4',
    particleColor: 0x4dedf4,
    topTexture: 'diamond_ore',
    sideTexture: 'diamond_ore',
    bottomTexture: 'diamond_ore',
  },
  [BlockType.GOLD_BLOCK]: {
    id: BlockType.GOLD_BLOCK,
    name: 'Gold Block',
    isSolid: true,
    color: '#f9d835',
    particleColor: 0xf9d835,
    topTexture: 'gold',
    sideTexture: 'gold',
    bottomTexture: 'gold',
  },
  [BlockType.TNT]: {
    id: BlockType.TNT,
    name: 'TNT',
    isSolid: true,
    color: '#db3322',
    particleColor: 0xdb3322,
    topTexture: 'tnt_top',
    sideTexture: 'tnt_side',
    bottomTexture: 'tnt_bottom',
  },
  [BlockType.BOOKSHELF]: {
    id: BlockType.BOOKSHELF,
    name: 'Bookshelf',
    isSolid: true,
    color: '#8b5a2b',
    particleColor: 0x8b5a2b,
    topTexture: 'planks',
    sideTexture: 'bookshelf',
    bottomTexture: 'planks',
  },
};

export const HOTBAR_BLOCKS: BlockType[] = [
  BlockType.GRASS,
  BlockType.DIRT,
  BlockType.STONE,
  BlockType.COBBLESTONE,
  BlockType.WOOD,
  BlockType.LEAVES,
  BlockType.PLANKS,
  BlockType.BRICK,
  BlockType.GLASS,
  BlockType.GLOWSTONE,
];

export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 48;
export const SEA_LEVEL = 12;

export const GRAVITY = 26.0;
export const JUMP_VELOCITY = 8.6;
export const WALK_SPEED = 5.4;
export const SPRINT_SPEED = 8.5;
export const FLY_VERTICAL_SPEED = 11.0;
export const FLY_HORIZONTAL_SPEED = 14.5;
export const PLAYER_RADIUS = 0.32;
export const PLAYER_HEIGHT = 1.78;
export const PLAYER_EYE_HEIGHT = 1.62;
