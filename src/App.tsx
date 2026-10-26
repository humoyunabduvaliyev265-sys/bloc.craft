import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, GameEngineStats } from './game/GameEngine';
import { BlockType, HOTBAR_BLOCKS } from './game/constants';
import { sounds } from './game/audio';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { MobileControls } from './components/MobileControls';
import { InventoryModal } from './components/InventoryModal';
import { PauseMenu } from './components/PauseMenu';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High-level Game State
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused'>('title');
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sounds.isMuted());

  // HUD stats synchronized from engine
  const [stats, setStats] = useState<GameEngineStats>({
    fps: 60,
    mode: 'WALKING',
    x: 8,
    y: 22,
    z: 8,
    activeBlock: BlockType.GRASS,
    targetBlock: null,
    timeOfDay: 0.42,
  });

  const [hotbar, setHotbar] = useState<BlockType[]>([...HOTBAR_BLOCKS]);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);

  // Initialize Three.js Game Engine once
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine(mountRef.current);
    engineRef.current = engine;

    // Connect stats listener
    const unsubscribe = engine.subscribe((newStats) => {
      setStats(newStats);
      setSelectedSlot(engine.selectedHotbarIndex);
      setHotbar([...engine.hotbar]);
    });

    // Connect modal triggers
    engine.onOpenInventory = () => {
      setIsInventoryOpen((prev) => !prev);
    };

    engine.onTogglePause = () => {
      setGameState((prev) => {
        if (prev === 'playing') {
          engine.setPaused(true);
          return 'paused';
        } else if (prev === 'paused') {
          engine.setPaused(false);
          engine.requestPointerLock();
          return 'playing';
        }
        return prev;
      });
    };

    return () => {
      unsubscribe();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Handlers
  const handlePlayWorld = () => {
    if (!engineRef.current) return;
    engineRef.current.startPlaying();
    setGameState('playing');
  };

  const handleResume = () => {
    if (!engineRef.current) return;
    engineRef.current.setPaused(false);
    engineRef.current.requestPointerLock();
    setGameState('playing');
  };

  const handleRestart = () => {
    if (!engineRef.current) return;
    engineRef.current.restartWorld();
    setGameState('playing');
  };

  const handleSelectSlot = (index: number) => {
    if (!engineRef.current) return;
    engineRef.current.selectHotbarSlot(index);
    setSelectedSlot(index);
  };

  const handleChooseBlockForSlot = (blockType: BlockType) => {
    if (!engineRef.current) return;
    engineRef.current.setSlotBlock(selectedSlot, blockType);
    setHotbar([...engineRef.current.hotbar]);
  };

  const handleToggleFly = () => {
    if (!engineRef.current) return;
    engineRef.current.player.handleFlyButtonTap();
  };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleSetTime = (t: number) => {
    if (!engineRef.current) return;
    engineRef.current.sky.setTime(t);
  };

  // Touch screen look drag listener on right side
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== 'playing' || !engineRef.current) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // If touch is on right half of screen, use it for look/aim
      if (touch.clientX > window.innerWidth * 0.35) {
        engineRef.current.handleTouchLookStart(
          touch.identifier,
          touch.clientX,
          touch.clientY
        );
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gameState !== 'playing' || !engineRef.current) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      engineRef.current.handleTouchLookMove(
        touch.identifier,
        touch.clientX,
        touch.clientY
      );
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (gameState !== 'playing' || !engineRef.current) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      engineRef.current.handleTouchLookEnd(touch.identifier);
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 z-0 cursor-crosshair"
        onClick={() => {
          if (gameState === 'playing' && engineRef.current && !engineRef.current.isPointerLocked) {
            engineRef.current.requestPointerLock();
          }
        }}
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onPlay={handlePlayWorld}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* In-Game Heads-Up Display (HUD) */}
      {gameState === 'playing' && (
        <>
          <GameHUD
            stats={stats}
            hotbar={hotbar}
            selectedSlot={selectedSlot}
            onSelectSlot={handleSelectSlot}
            onFlyTap={handleToggleFly}
            onOpenInventory={() => setIsInventoryOpen(true)}
            onPause={() => {
              engineRef.current?.setPaused(true);
              setGameState('paused');
            }}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />

          {/* Mobile Joystick and Action Controls */}
          <MobileControls
            engine={engineRef.current}
            isFlying={stats.mode === 'FLYING'}
          />
        </>
      )}

      {/* Creative Block Inventory Modal */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        onSelectBlock={handleChooseBlockForSlot}
        selectedSlot={selectedSlot}
      />

      {/* Pause Menu Modal */}
      <PauseMenu
        isOpen={gameState === 'paused'}
        onResume={handleResume}
        onRestart={handleRestart}
        isFlying={stats.mode === 'FLYING'}
        onToggleFly={handleToggleFly}
        timeOfDay={stats.timeOfDay}
        onSetTime={handleSetTime}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
    </div>
  );
}
