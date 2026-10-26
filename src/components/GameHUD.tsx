import React, { useRef } from 'react';
import { Rocket, Package, Pause, Volume2, VolumeX, Crosshair as CrosshairIcon } from 'lucide-react';
import { BlockType, BLOCK_DEFS } from '../game/constants';
import { getBlockIconDataUrl } from '../game/textures';
import { GameEngineStats } from '../game/GameEngine';

interface GameHUDProps {
  stats: GameEngineStats;
  hotbar: BlockType[];
  selectedSlot: number;
  onSelectSlot: (index: number) => void;
  onFlyTap: () => void;
  onOpenInventory: () => void;
  onPause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  hotbar,
  selectedSlot,
  onSelectSlot,
  onFlyTap,
  onOpenInventory,
  onPause,
  isMuted,
  onToggleMute,
}) => {
  // Double-tap tracker for the screen FLY 🚀 button
  const lastFlyTapRef = useRef<number>(0);

  const handleFlyButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFlyTap();
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 sm:p-4 select-none">
      {/* Top Bar: Stats & Controls */}
      <div className="flex items-start justify-between w-full">
        {/* Left Status Cluster */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {/* Mode Badge & FLY 🚀 Button */}
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded border text-xs font-bold pixel-font tracking-wide shadow-md transition-colors ${
                stats.mode === 'FLYING'
                  ? 'bg-amber-500/90 border-amber-300 text-black'
                  : 'bg-emerald-950/85 border-emerald-500 text-emerald-300'
              }`}
            >
              MODE: {stats.mode}
            </div>

            {/* VISIBLE FLY 🚀 BUTTON (Supports double-tap and single tap) */}
            <button
              onClick={handleFlyButtonClick}
              onTouchEnd={handleFlyButtonClick}
              title="Double tap to fly high into the sky!"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold pixel-font cursor-pointer active:scale-95 transition-all shadow-lg ${
                stats.mode === 'FLYING'
                  ? 'bg-amber-400 hover:bg-amber-300 border-amber-200 text-black shadow-amber-500/40 ring-2 ring-amber-300'
                  : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-300 text-white shadow-indigo-600/40'
              }`}
            >
              <Rocket className="w-4 h-4" />
              <span>FLY 🚀</span>
            </button>
          </div>

          {/* Coordinates & Target info */}
          <div className="bg-black/65 border border-white/15 rounded px-2.5 py-1 text-xs text-gray-200 font-mono flex items-center gap-3">
            <span>
              XYZ: {stats.x}, {stats.y}, {stats.z}
            </span>
            <span className="text-gray-400">|</span>
            <span className="tabular-nums text-emerald-400">{stats.fps} FPS</span>
          </div>

          {stats.targetBlock && (
            <div className="bg-black/65 border border-amber-400/40 rounded px-2 py-0.5 text-xs text-amber-200 font-mono w-fit">
              Target: <span className="font-bold text-white">{stats.targetBlock}</span>
            </div>
          )}
        </div>

        {/* Right Action Icons (Inventory & Pause) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            className="p-2 bg-black/65 hover:bg-black/85 border border-white/20 rounded cursor-pointer text-gray-300 hover:text-white transition-colors"
            title="Toggle Sound"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          <button
            onClick={onOpenInventory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/65 hover:bg-black/85 border border-white/20 rounded cursor-pointer text-xs font-bold text-white pixel-font transition-colors"
            title="Open Creative Block Inventory (E / B)"
          >
            <Package className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">BAG</span>
          </button>

          <button
            onClick={onPause}
            className="p-2 bg-black/65 hover:bg-black/85 border border-white/20 rounded cursor-pointer text-gray-300 hover:text-white transition-colors"
            title="Pause Game (Esc)"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Reticle / Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        <div className="relative w-6 h-6 flex items-center justify-center">
          {/* Clean minimal pixel crosshair */}
          <div className="absolute w-4 h-[2px] bg-white/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
          <div className="absolute h-4 w-[2px] bg-white/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
          <div className="w-1 h-1 bg-black/50" />
        </div>
      </div>

      {/* Bottom Block Hotbar (Minecraft Classic Slot Bar) */}
      <div className="flex flex-col items-center gap-1.5 pointer-events-auto mb-1">
        {/* Active Block Name tooltip */}
        <div className="text-xs font-bold tracking-wide text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] pixel-font">
          {BLOCK_DEFS[stats.activeBlock]?.name ?? 'Block'}
        </div>

        {/* Hotbar Slots */}
        <div className="flex items-center gap-1 p-1.5 bg-black/75 border-2 border-[#555] rounded-md shadow-2xl overflow-x-auto max-w-full">
          {hotbar.map((blockId, index) => {
            const isSelected = selectedSlot === index;
            const iconUrl = getBlockIconDataUrl(blockId);

            return (
              <button
                key={index}
                onClick={() => onSelectSlot(index)}
                className={`relative w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded cursor-pointer transition-transform ${
                  isSelected
                    ? 'border-2 border-white bg-white/25 scale-105 shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                    : 'border border-[#444] bg-[#222]/80 hover:bg-[#333]'
                }`}
              >
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt={BLOCK_DEFS[blockId]?.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain pointer-events-none pixel-font"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
                {/* Slot index number label */}
                <span className="absolute bottom-0.5 right-1 text-[9px] sm:text-[10px] text-gray-300 font-mono font-bold leading-none select-none">
                  {(index + 1) % 10}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
