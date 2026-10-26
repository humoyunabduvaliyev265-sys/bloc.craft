import * as THREE from 'three';
import {
  BLOCK_DEFS,
  BlockType,
  FLY_HORIZONTAL_SPEED,
  FLY_VERTICAL_SPEED,
  GRAVITY,
  JUMP_VELOCITY,
  PLAYER_EYE_HEIGHT,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  SPRINT_SPEED,
  WALK_SPEED,
} from './constants';
import { sounds } from './audio';
import { VoxelWorld } from './world';

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;      // Space or Mobile Up
  descend: boolean;   // Shift or Mobile Down
  sprint: boolean;
}

export class Player {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3; // feet position
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = false;
  public isFlying: boolean = false;
  
  // Camera rotation
  public pitch: number = 0; // vertical look (-89 to +89 deg)
  public yaw: number = 0;   // horizontal look

  // Flight double-tap detection
  private lastJumpPressTime: number = 0;
  private lastFlyButtonTapTime: number = 0;
  private lastMobileUpTapTime: number = 0;

  // Mode change callback
  public onModeChange?: (mode: 'WALKING' | 'FLYING') => void;

  constructor(camera: THREE.PerspectiveCamera, spawnPos?: THREE.Vector3) {
    this.camera = camera;
    this.position = spawnPos ? spawnPos.clone() : new THREE.Vector3(8, 25, 8);
    this.updateCameraTransform();
  }

  public setFlying(flying: boolean) {
    if (this.isFlying !== flying) {
      this.isFlying = flying;
      this.velocity.set(0, 0, 0);
      sounds.playFlyToggle(flying);
      this.onModeChange?.(this.isFlying ? 'FLYING' : 'WALKING');
    }
  }

  public toggleFlying() {
    this.setFlying(!this.isFlying);
  }

  // Double-tap handler for FLY button
  public handleFlyButtonTap() {
    const now = performance.now();
    const diff = now - this.lastFlyButtonTapTime;
    this.lastFlyButtonTapTime = now;

    if (diff < 380) {
      // Double tap detected! Enable flight mode
      this.setFlying(true);
    } else {
      // Single tap also toggles flight for user convenience
      this.toggleFlying();
    }
  }

  // Double-tap handler for Mobile UP button
  public handleMobileUpTap() {
    const now = performance.now();
    const diff = now - this.lastMobileUpTapTime;
    this.lastMobileUpTapTime = now;

    if (diff < 380) {
      // Double tap UP button enables flying mode!
      this.setFlying(true);
    }
  }

  // Handle Space key press with double-tap detection
  public handleSpacePress() {
    const now = performance.now();
    const diff = now - this.lastJumpPressTime;
    this.lastJumpPressTime = now;

    if (diff < 320) {
      // Double tap Space enables/toggles flight!
      this.toggleFlying();
    } else if (this.isGrounded && !this.isFlying) {
      this.velocity.y = JUMP_VELOCITY;
      this.isGrounded = false;
      sounds.playJump();
    }
  }

  public look(deltaX: number, deltaY: number, sensitivity = 0.0022) {
    this.yaw -= deltaX * sensitivity;
    this.pitch -= deltaY * sensitivity;

    // Clamp vertical pitch to prevent backflips
    const maxPitch = (Math.PI / 2) - 0.01;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    this.updateCameraTransform();
  }

  public updateCameraTransform() {
    this.camera.position.set(
      this.position.x,
      this.position.y + PLAYER_EYE_HEIGHT,
      this.position.z
    );

    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const cosYaw = Math.cos(this.yaw);
    const sinYaw = Math.sin(this.yaw);

    const forward = new THREE.Vector3(
      -sinYaw * cosPitch,
      sinPitch,
      -cosYaw * cosPitch
    ).normalize();

    this.camera.lookAt(
      this.camera.position.x + forward.x,
      this.camera.position.y + forward.y,
      this.camera.position.z + forward.z
    );
  }

  public update(dt: number, input: PlayerInput, world: VoxelWorld) {
    // Clamp dt to avoid tunneling on tab switch
    const clampedDt = Math.min(dt, 0.05);

    // Compute forward & right horizontal vectors
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);

    const rightX = -forwardZ;
    const rightZ = forwardX;

    // Movement direction input
    let moveX = 0;
    let moveZ = 0;

    if (input.forward) {
      moveX += forwardX;
      moveZ += forwardZ;
    }
    if (input.backward) {
      moveX -= forwardX;
      moveZ -= forwardZ;
    }
    if (input.left) {
      moveX -= rightX;
      moveZ -= rightZ;
    }
    if (input.right) {
      moveX += rightX;
      moveZ += rightZ;
    }

    const moveLength = Math.hypot(moveX, moveZ);
    if (moveLength > 0.0001) {
      moveX /= moveLength;
      moveZ /= moveLength;
    }

    if (this.isFlying) {
      // ===== FLYING MODE PHYSICS =====
      const targetSpeed = FLY_HORIZONTAL_SPEED;
      this.velocity.x = moveX * targetSpeed;
      this.velocity.z = moveZ * targetSpeed;

      // Vertical flight movement
      if (input.jump) {
        // Space or UP arrow: fly higher into sky!
        this.velocity.y = FLY_VERTICAL_SPEED;
      } else if (input.descend) {
        // Shift or DOWN arrow: descend
        this.velocity.y = -FLY_VERTICAL_SPEED;
      } else {
        // Stable hover damping
        this.velocity.y = THREE.MathUtils.damp(this.velocity.y, 0, 10, clampedDt);
      }

      // In flying mode, smoothly move without ground friction
      this.position.x += this.velocity.x * clampedDt;
      this.position.y += this.velocity.y * clampedDt;
      this.position.z += this.velocity.z * clampedDt;

      // Prevent flying below bedrock level
      if (this.position.y < 1.0) {
        this.position.y = 1.0;
        this.velocity.y = 0;
      }

      this.isGrounded = false;
    } else {
      // ===== WALKING / JUMPING PHYSICS =====
      const currentSpeed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
      this.velocity.x = moveX * currentSpeed;
      this.velocity.z = moveZ * currentSpeed;

      // Gravity
      this.velocity.y -= GRAVITY * clampedDt;
      // Clamp terminal fall speed
      if (this.velocity.y < -35.0) {
        this.velocity.y = -35.0;
      }

      // Jump if requested and grounded
      if (input.jump && this.isGrounded) {
        this.velocity.y = JUMP_VELOCITY;
        this.isGrounded = false;
        sounds.playJump();
      }

      // Footstep sound when walking on ground
      if (this.isGrounded && moveLength > 0.1) {
        sounds.playFootstep();
      }

      // Resolve collisions axis by axis
      this.moveWithCollisions(clampedDt, world);
    }

    this.updateCameraTransform();
  }

  // Precise AABB block collision resolution
  private moveWithCollisions(dt: number, world: VoxelWorld) {
    const r = PLAYER_RADIUS;
    const h = PLAYER_HEIGHT;

    // --- X AXIS ---
    this.position.x += this.velocity.x * dt;
    let minX = Math.floor(this.position.x - r);
    let maxX = Math.floor(this.position.x + r);
    let minY = Math.floor(this.position.y);
    let maxY = Math.floor(this.position.y + h - 0.05);
    let minZ = Math.floor(this.position.z - r);
    let maxZ = Math.floor(this.position.z + r);

    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          if (this.isSolidAt(world, x, y, z)) {
            if (this.velocity.x > 0) {
              this.position.x = x - r - 0.001;
            } else if (this.velocity.x < 0) {
              this.position.x = x + 1 + r + 0.001;
            }
            this.velocity.x = 0;
            break;
          }
        }
      }
    }

    // --- Z AXIS ---
    this.position.z += this.velocity.z * dt;
    minX = Math.floor(this.position.x - r);
    maxX = Math.floor(this.position.x + r);
    minZ = Math.floor(this.position.z - r);
    maxZ = Math.floor(this.position.z + r);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidAt(world, x, y, z)) {
            if (this.velocity.z > 0) {
              this.position.z = z - r - 0.001;
            } else if (this.velocity.z < 0) {
              this.position.z = z + 1 + r + 0.001;
            }
            this.velocity.z = 0;
            break;
          }
        }
      }
    }

    // --- Y AXIS ---
    this.position.y += this.velocity.y * dt;
    minX = Math.floor(this.position.x - r);
    maxX = Math.floor(this.position.x + r);
    minY = Math.floor(this.position.y);
    maxY = Math.floor(this.position.y + h - 0.05);
    minZ = Math.floor(this.position.z - r);
    maxZ = Math.floor(this.position.z + r);

    let landed = false;
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let y = minY; y <= maxY; y++) {
          if (this.isSolidAt(world, x, y, z)) {
            if (this.velocity.y < 0) {
              // Hit ground
              this.position.y = y + 1;
              this.velocity.y = 0;
              landed = true;
            } else if (this.velocity.y > 0) {
              // Hit ceiling
              this.position.y = y - h - 0.001;
              this.velocity.y = 0;
            }
            break;
          }
        }
      }
    }

    this.isGrounded = landed;
  }

  private isSolidAt(world: VoxelWorld, x: number, y: number, z: number): boolean {
    const block = world.getBlock(x, y, z);
    if (block === BlockType.AIR || block === BlockType.WATER) return false;
    const def = BLOCK_DEFS[block];
    return def?.isSolid ?? false;
  }
}
