import * as THREE from 'three';
import {
  BlockType,
  BLOCK_DEFS,
  HOTBAR_BLOCKS,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
} from './constants';
import { Player, PlayerInput } from './player';
import { VoxelSky } from './sky';
import { VoxelWorld, VoxelRaycastHit } from './world';
import { ParticleSystem } from './particles';
import { sounds } from './audio';

export interface GameEngineStats {
  fps: number;
  mode: 'WALKING' | 'FLYING';
  x: number;
  y: number;
  z: number;
  activeBlock: BlockType;
  targetBlock: string | null;
  timeOfDay: number;
}

export type GameEngineListener = (stats: GameEngineStats) => void;

export class GameEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public player: Player;
  public world: VoxelWorld;
  public sky: VoxelSky;
  public particles: ParticleSystem;

  public activeBlock: BlockType = BlockType.GRASS;
  public hotbar: BlockType[] = [...HOTBAR_BLOCKS];
  public selectedHotbarIndex: number = 0;

  // Game state
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public isTitleScreen: boolean = true;
  public isPointerLocked: boolean = false;

  // Input states
  public input: PlayerInput = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    descend: false,
    sprint: false,
  };

  // FPS calculation
  private frameCount: number = 0;
  private lastFpsTime: number = 0;
  private currentFps: number = 60;

  private clock: THREE.Clock;
  private animFrameId: number = 0;
  private isSoftwareGl: boolean = false;
  private currentRaycastHit: VoxelRaycastHit | null = null;
  private listeners: Set<GameEngineListener> = new Set();

  // Mobile virtual joystick state
  public joystickDelta: { x: number; y: number } = { x: 0, y: 0 };
  private touchLookId: number | null = null;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;

  // Callbacks
  public onOpenInventory?: () => void;
  public onTogglePause?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Detect Software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 300);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Components
    this.sky = new VoxelSky(this.scene);
    this.world = new VoxelWorld(this.scene);
    this.particles = new ParticleSystem(this.scene);

    // Player spawn: find surface at (8, 8)
    this.player = new Player(this.camera, new THREE.Vector3(8, 22, 8));
    this.player.onModeChange = () => {
      this.notifyStats();
    };

    this.clock = new THREE.Clock();

    // Setup input listeners
    this.bindEvents();

    // Initial terrain generation
    this.world.update(this.player.position.x, this.player.position.z);

    // Find good ground spawn position
    for (let y = 45; y >= 2; y--) {
      const b = this.world.getBlock(8, y, 8);
      if (b !== BlockType.AIR && b !== BlockType.WATER) {
        this.player.position.set(8, y + 1.2, 8);
        this.player.updateCameraTransform();
        break;
      }
    }

    // Start loop
    this.clock.start();
    this.lastFpsTime = performance.now();
    this.tick();
  }

  public subscribe(fn: GameEngineListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notifyStats() {
    const stats: GameEngineStats = {
      fps: this.currentFps,
      mode: this.player.isFlying ? 'FLYING' : 'WALKING',
      x: Math.floor(this.player.position.x),
      y: Math.floor(this.player.position.y),
      z: Math.floor(this.player.position.z),
      activeBlock: this.activeBlock,
      targetBlock: this.currentRaycastHit
        ? BLOCK_DEFS[this.currentRaycastHit.blockType]?.name || 'Block'
        : null,
      timeOfDay: this.sky.timeOfDay,
    };
    for (const fn of this.listeners) {
      fn(stats);
    }
  }

  public selectHotbarSlot(index: number) {
    if (index >= 0 && index < this.hotbar.length) {
      this.selectedHotbarIndex = index;
      this.activeBlock = this.hotbar[index];
      sounds.playClick();
      this.notifyStats();
    }
  }

  public setSlotBlock(index: number, block: BlockType) {
    if (index >= 0 && index < this.hotbar.length) {
      this.hotbar[index] = block;
      if (this.selectedHotbarIndex === index) {
        this.activeBlock = block;
      }
      this.notifyStats();
    }
  }

  public startPlaying() {
    this.isTitleScreen = false;
    this.isPaused = false;
    this.isRunning = true;
    this.requestPointerLock();
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public requestPointerLock() {
    // Only lock pointer on desktop / mouse devices
    if (!('ontouchstart' in window) && !this.isPaused && !this.isTitleScreen) {
      this.renderer.domElement.requestPointerLock?.();
    }
  }

  public breakTargetBlock() {
    if (this.currentRaycastHit) {
      const { blockX, blockY, blockZ, blockType } = this.currentRaycastHit;
      if (blockType !== BlockType.BEDROCK) {
        this.world.setBlock(blockX, blockY, blockZ, BlockType.AIR);
        const col = BLOCK_DEFS[blockType]?.particleColor ?? 0x777777;
        this.particles.emitBlockBreak(blockX, blockY, blockZ, col);
        sounds.playBlockBreak();
      }
    }
  }

  public placeTargetBlock() {
    if (this.currentRaycastHit && this.activeBlock !== BlockType.AIR) {
      const { blockX, blockY, blockZ, faceNormal } = this.currentRaycastHit;
      const targetX = blockX + faceNormal.x;
      const targetY = blockY + faceNormal.y;
      const targetZ = blockZ + faceNormal.z;

      // Check collision with player AABB
      const pr = PLAYER_RADIUS;
      const ph = PLAYER_HEIGHT;
      const px = this.player.position.x;
      const py = this.player.position.y;
      const pz = this.player.position.z;

      const playerOverlap =
        targetX + 1 > px - pr &&
        targetX < px + pr &&
        targetY + 1 > py &&
        targetY < py + ph &&
        targetZ + 1 > pz - pr &&
        targetZ < pz + pr;

      if (!playerOverlap) {
        this.world.setBlock(targetX, targetY, targetZ, this.activeBlock);
        sounds.playBlockPlace();
      }
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.isTitleScreen) return;

    // Hotbar selection with 1-9
    if (e.code >= 'Digit1' && e.code <= 'Digit9') {
      const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
      if (idx < this.hotbar.length) {
        this.selectHotbarSlot(idx);
      }
      return;
    }

    if (e.code === 'Digit0') {
      this.selectHotbarSlot(9);
      return;
    }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.backward = true;
        // In flying mode, DOWN arrow descends!
        if (this.player.isFlying) {
          this.input.descend = true;
        }
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = true;
        break;
      case 'Space':
        e.preventDefault();
        this.input.jump = true;
        this.player.handleSpacePress();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.descend = true;
        this.input.sprint = !this.player.isFlying;
        break;
      case 'KeyF':
        // F key toggle flight!
        this.player.toggleFlying();
        break;
      case 'KeyE':
      case 'KeyB':
        this.onOpenInventory?.();
        break;
      case 'Escape':
        this.onTogglePause?.();
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.backward = false;
        if (this.player.isFlying) {
          this.input.descend = false;
        }
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = false;
        break;
      case 'Space':
        this.input.jump = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.descend = false;
        this.input.sprint = false;
        break;
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isTitleScreen || this.isPaused) return;
    if (this.isPointerLocked) {
      this.player.look(e.movementX, e.movementY);
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.isTitleScreen || this.isPaused) return;

    if (!this.isPointerLocked) {
      this.requestPointerLock();
      return;
    }

    if (e.button === 0) {
      // Left click: break block
      this.breakTargetBlock();
    } else if (e.button === 2) {
      // Right click: place block
      this.placeTargetBlock();
    }
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.isTitleScreen || this.isPaused) return;
    if (e.deltaY > 0) {
      this.selectHotbarSlot((this.selectedHotbarIndex + 1) % this.hotbar.length);
    } else if (e.deltaY < 0) {
      this.selectHotbarSlot(
        (this.selectedHotbarIndex - 1 + this.hotbar.length) % this.hotbar.length
      );
    }
  };

  // Mobile Touch Controls
  public handleTouchLookStart(touchId: number, clientX: number, clientY: number) {
    this.touchLookId = touchId;
    this.lastTouchX = clientX;
    this.lastTouchY = clientY;
  }

  public handleTouchLookMove(touchId: number, clientX: number, clientY: number) {
    if (this.touchLookId === touchId) {
      const deltaX = clientX - this.lastTouchX;
      const deltaY = clientY - this.lastTouchY;
      this.lastTouchX = clientX;
      this.lastTouchY = clientY;
      this.player.look(deltaX, deltaY, 0.004);
    }
  }

  public handleTouchLookEnd(touchId: number) {
    if (this.touchLookId === touchId) {
      this.touchLookId = null;
    }
  }

  public handleJoystickInput(x: number, y: number) {
    this.joystickDelta = { x, y };
    const deadzone = 0.15;
    this.input.forward = y < -deadzone;
    this.input.backward = y > deadzone;
    this.input.left = x < -deadzone;
    this.input.right = x > deadzone;
  }

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handlePointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
  };

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('wheel', this.handleWheel, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private unbindEvents() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousemove', this.handleMouseMove);
    canvas.removeEventListener('mousedown', this.handleMouseDown);
    canvas.removeEventListener('wheel', this.handleWheel);
  }

  private tick = () => {
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);

    // FPS calculation
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
      this.notifyStats();
    }

    if (this.isTitleScreen) {
      // Atmospheric title screen live camera pan
      const time = now * 0.00015;
      const radius = 24;
      const camX = 8 + Math.cos(time) * radius;
      const camZ = 8 + Math.sin(time) * radius;
      const camY = 32;

      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(8, 16, 8);

      this.sky.update(dt, new THREE.Vector3(8, 20, 8));
      this.world.update(8, 8);
    } else if (!this.isPaused) {
      // In-game updates
      this.player.update(dt, this.input, this.world);
      this.sky.update(dt, this.player.position);
      this.world.update(this.player.position.x, this.player.position.z);
      this.particles.update(dt);

      // Raycast for targeted block
      const lookDir = new THREE.Vector3();
      this.camera.getWorldDirection(lookDir);
      this.currentRaycastHit = this.world.raycast(
        this.camera.position,
        lookDir,
        6.5
      );
      this.world.updateTargetOutline(this.currentRaycastHit);
    }

    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  public restartWorld() {
    this.world.dispose();
    this.world = new VoxelWorld(this.scene);
    this.player.position.set(8, 25, 8);
    this.player.velocity.set(0, 0, 0);
    this.player.setFlying(false);

    this.world.update(8, 8);
    for (let y = 45; y >= 2; y--) {
      const b = this.world.getBlock(8, y, 8);
      if (b !== BlockType.AIR && b !== BlockType.WATER) {
        this.player.position.set(8, y + 1.2, 8);
        this.player.updateCameraTransform();
        break;
      }
    }
    this.isPaused = false;
    this.requestPointerLock();
    this.notifyStats();
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    this.unbindEvents();
    this.world.dispose();
    this.sky.dispose();
    this.particles.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
