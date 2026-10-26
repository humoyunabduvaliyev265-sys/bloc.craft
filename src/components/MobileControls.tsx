import React, { useRef, useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Rocket, Pickaxe, Box } from 'lucide-react';
import { GameEngine } from '../game/GameEngine';

interface MobileControlsProps {
  engine: GameEngine | null;
  isFlying: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  engine,
  isFlying,
}) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState<boolean>(false);
  const joystickTouchIdRef = useRef<number | null>(null);

  // UP button double-tap tracking
  const lastUpTapTimeRef = useRef<number>(0);

  useEffect(() => {
    // Detect mobile or touch capability
    const checkTouch = () => {
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 1024;
      setIsMobile(hasTouch);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Joystick touch handlers
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickBaseRef.current || !engine) return;
    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;
    setIsJoystickActive(true);

    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    updateJoystick(dx, dy);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickBaseRef.current || !engine || joystickTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const rect = joystickBaseRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        updateJoystick(dx, dy);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setIsJoystickActive(false);
        setKnobPos({ x: 0, y: 0 });
        engine?.handleJoystickInput(0, 0);
        break;
      }
    }
  };

  const updateJoystick = (dx: number, dy: number) => {
    const maxRadius = 45;
    const dist = Math.hypot(dx, dy);
    let clampedX = dx;
    let clampedY = dy;

    if (dist > maxRadius) {
      clampedX = (dx / dist) * maxRadius;
      clampedY = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: clampedX, y: clampedY });
    engine?.handleJoystickInput(clampedX / maxRadius, clampedY / maxRadius);
  };

  // Large UP button handlers (supports jump and continuous flying upward)
  const handleUpTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!engine) return;

    const now = performance.now();
    const diff = now - lastUpTapTimeRef.current;
    lastUpTapTimeRef.current = now;

    if (diff < 380) {
      // Double tap UP button enables flying mode!
      engine.player.setFlying(true);
    }

    // Hold UP to jump or fly upward
    engine.input.jump = true;
    if (diff >= 380 && !engine.player.isFlying) {
      engine.player.handleSpacePress();
    }
  };

  const handleUpTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!engine) return;
    engine.input.jump = false;
  };

  // Down / Descend handlers
  const handleDownTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!engine) return;
    engine.input.descend = true;
  };

  const handleDownTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!engine) return;
    engine.input.descend = false;
  };

  if (!isMobile) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex justify-between items-end p-4 pb-20 select-none">
      {/* LEFT: Virtual Movement Joystick */}
      <div className="pointer-events-auto">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          onTouchCancel={handleJoystickTouchEnd}
          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 transition-colors flex items-center justify-center ${
            isJoystickActive
              ? 'bg-black/60 border-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
              : 'bg-black/45 border-white/20'
          }`}
          style={{ touchAction: 'none' }}
        >
          {/* Outer direction notches */}
          <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-white/40" />
          <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-white/40" />
          <div className="absolute left-2 w-1.5 h-1.5 rounded-full bg-white/40" />
          <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/40" />

          {/* Draggable Knob */}
          <div
            className="w-12 h-12 rounded-full bg-emerald-500/80 border-2 border-white shadow-md transform pointer-events-none"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: isJoystickActive ? 'none' : 'transform 0.15s ease-out',
            }}
          />
        </div>
      </div>

      {/* RIGHT: Action & Flight Control Cluster */}
      <div className="pointer-events-auto flex flex-col items-end gap-2.5">
        {/* Top Action Row: Break & Place */}
        <div className="flex items-center gap-2">
          {/* BREAK BLOCK */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              engine?.breakTargetBlock();
            }}
            onClick={() => engine?.breakTargetBlock()}
            className="w-14 h-14 bg-red-600/85 active:bg-red-500 border-2 border-red-300 rounded-xl shadow-lg flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
            title="Break Targeted Block"
          >
            <Pickaxe className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold pixel-font leading-none">MINE</span>
          </button>

          {/* PLACE BLOCK */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              engine?.placeTargetBlock();
            }}
            onClick={() => engine?.placeTargetBlock()}
            className="w-14 h-14 bg-emerald-600/85 active:bg-emerald-500 border-2 border-emerald-300 rounded-xl shadow-lg flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
            title="Place Selected Block"
          >
            <Box className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold pixel-font leading-none">PLACE</span>
          </button>
        </div>

        {/* Middle Row: Large FLY Toggle */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.player.handleFlyButtonTap();
          }}
          onClick={() => engine?.player.handleFlyButtonTap()}
          className={`w-30 h-11 rounded-lg border-2 flex items-center justify-center gap-2 pixel-font text-xs font-bold shadow-lg active:scale-95 transition-all ${
            isFlying
              ? 'bg-amber-400 border-amber-200 text-black shadow-amber-500/50'
              : 'bg-indigo-600 border-indigo-300 text-white shadow-indigo-600/40'
          }`}
        >
          <Rocket className="w-4 h-4" />
          <span>FLY 🚀</span>
        </button>

        {/* Bottom Row: Large UP / FLY HIGH & DOWN buttons */}
        <div className="flex items-center gap-2">
          {/* DOWN / DESCEND BUTTON */}
          <button
            onTouchStart={handleDownTouchStart}
            onTouchEnd={handleDownTouchEnd}
            onMouseDown={handleDownTouchStart}
            onMouseUp={handleDownTouchEnd}
            className="w-14 h-14 bg-gray-800/85 active:bg-gray-700 border-2 border-gray-400 rounded-xl shadow-lg flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
            title="Descend in Flying Mode"
          >
            <ArrowDown className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold pixel-font leading-none">DOWN</span>
          </button>

          {/* LARGE UP BUTTON (Double-tap to fly, hold to ascend higher into sky!) */}
          <button
            onTouchStart={handleUpTouchStart}
            onTouchEnd={handleUpTouchEnd}
            onMouseDown={handleUpTouchStart}
            onMouseUp={handleUpTouchEnd}
            className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl border-3 flex flex-col items-center justify-center shadow-xl active:scale-95 transition-all ${
              isFlying
                ? 'bg-amber-500 hover:bg-amber-400 border-amber-200 text-black shadow-amber-500/60 ring-2 ring-yellow-300'
                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 text-white shadow-emerald-700/60'
            }`}
            title="Double-tap for Fly mode; Hold to Fly Upward!"
          >
            <ArrowUp className="w-7 h-7 mb-0.5" />
            <span className="text-[10px] font-black pixel-font leading-none">
              {isFlying ? 'FLY UP' : 'UP'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
