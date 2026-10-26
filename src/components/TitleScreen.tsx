import React from 'react';
import { Volume2, VolumeX, Sparkles, Compass, Rocket, Shield } from 'lucide-react';
import { sounds } from '../game/audio';

interface TitleScreenProps {
  onPlay: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onPlay,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between p-6 pointer-events-auto bg-black/35 backdrop-blur-[2px]">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between max-w-5xl">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-white/20 rounded text-xs text-emerald-400 pixel-font">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>VOXEL ENGINE v2.0</span>
        </div>

        <button
          onClick={onToggleMute}
          className="flex items-center gap-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 border border-white/25 rounded text-xs text-white/90 cursor-pointer active:scale-95 transition-transform"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-red-400" />
              <span>Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Sound On</span>
            </>
          )}
        </button>
      </div>

      {/* Main Title Lockup */}
      <div className="flex flex-col items-center text-center my-auto max-w-2xl">
        {/* Pixel Art Logo Lockup */}
        <div className="relative mb-6">
          <div className="text-4xl sm:text-6xl md:text-7xl font-black tracking-wider text-amber-300 drop-shadow-[0_6px_0_#6b4914] pixel-font uppercase select-none">
            VOXELCRAFT
          </div>
          <div className="mt-2 text-lg sm:text-2xl text-emerald-400 font-bold tracking-widest pixel-font drop-shadow-[0_2px_0_#143d10]">
            3D EDITION
          </div>
        </div>

        <p className="text-gray-200 text-sm sm:text-base max-w-lg mb-8 leading-relaxed font-sans bg-black/50 p-3 rounded-lg border border-white/10 shadow-lg">
          Explore an infinite 3D voxel sandbox. Mine, build, sprint, jump, and
          activate <span className="text-yellow-300 font-bold">Flight Mode 🚀</span> to
          soar high above mountains, trees, and floating clouds!
        </p>

        {/* Play CTA Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onPlay();
          }}
          className="group relative px-10 py-5 bg-gradient-to-b from-emerald-500 to-green-700 hover:from-emerald-400 hover:to-green-600 active:translate-y-1 border-4 border-emerald-300 shadow-[0_8px_0_#134e1d] hover:shadow-[0_6px_0_#134e1d] rounded-sm text-white pixel-font text-base sm:text-xl font-bold cursor-pointer transition-all active:shadow-none"
        >
          <span className="flex items-center gap-3">
            <Rocket className="w-6 h-6 text-yellow-300 group-hover:rotate-12 transition-transform" />
            <span>PLAY WORLD</span>
          </span>
        </button>

        {/* Features row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 w-full text-xs">
          <div className="flex flex-col items-center p-2.5 bg-black/60 border border-white/10 rounded">
            <Compass className="w-5 h-5 text-sky-400 mb-1" />
            <span className="text-white font-medium">Infinite World</span>
          </div>
          <div className="flex flex-col items-center p-2.5 bg-black/60 border border-white/10 rounded">
            <Rocket className="w-5 h-5 text-yellow-400 mb-1" />
            <span className="text-white font-medium">Rocket Flight</span>
          </div>
          <div className="flex flex-col items-center p-2.5 bg-black/60 border border-white/10 rounded">
            <Shield className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-white font-medium">Mine & Build</span>
          </div>
          <div className="flex flex-col items-center p-2.5 bg-black/60 border border-white/10 rounded">
            <Sparkles className="w-5 h-5 text-purple-400 mb-1" />
            <span className="text-white font-medium">Day / Night</span>
          </div>
        </div>
      </div>

      {/* Flat Control Hints Footer */}
      <div className="w-full text-center py-2 px-4 bg-black/70 border border-white/15 rounded-md text-gray-300 text-xs sm:text-sm font-mono tracking-wide">
        <span className="text-emerald-400 font-bold">DESKTOP:</span> WASD Move · Mouse Look · Left Click Mine · Right Click Place · Space Jump · Double-Tap Space / F to Fly · Shift Descend
        <br className="hidden sm:inline" />
        <span className="text-yellow-400 font-bold sm:ml-3">MOBILE:</span> Left Joystick Move · Drag Screen Look · Large UP & FLY Buttons
      </div>
    </div>
  );
};
