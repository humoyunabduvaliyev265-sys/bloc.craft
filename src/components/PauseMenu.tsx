import React from 'react';
import { Play, RotateCcw, Rocket, Volume2, VolumeX, Sun, Moon } from 'lucide-react';
import { sounds } from '../game/audio';

interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  isFlying: boolean;
  onToggleFly: () => void;
  timeOfDay: number;
  onSetTime: (t: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onResume,
  onRestart,
  isFlying,
  onToggleFly,
  timeOfDay,
  onSetTime,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 pointer-events-auto select-none">
      <div className="bg-[#242424] border-4 border-[#555] rounded-lg shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 text-white">
        {/* Title */}
        <div className="text-center border-b-2 border-[#3a3a3a] pb-3">
          <h2 className="text-xl sm:text-2xl font-black pixel-font text-amber-300 drop-shadow-[0_2px_0_#443010]">
            GAME PAUSED
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Mode: <span className="font-bold text-white">{isFlying ? 'FLYING 🚀' : 'WALKING'}</span>
          </p>
        </div>

        {/* Buttons List */}
        <div className="flex flex-col gap-2.5">
          {/* Resume */}
          <button
            onClick={() => {
              sounds.playClick();
              onResume();
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-300 rounded font-bold pixel-font text-xs cursor-pointer active:scale-98 transition-transform shadow-md"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>RESUME GAME</span>
          </button>

          {/* Toggle Flying Mode */}
          <button
            onClick={() => {
              sounds.playClick();
              onToggleFly();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 border-2 rounded font-bold pixel-font text-xs cursor-pointer active:scale-98 transition-transform shadow-md ${
              isFlying
                ? 'bg-amber-500 hover:bg-amber-400 border-amber-200 text-black'
                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-300 text-white'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>{isFlying ? 'DISABLE FLIGHT' : 'ENABLE FLIGHT 🚀'}</span>
          </button>

          {/* Restart World */}
          <button
            onClick={() => {
              sounds.playClick();
              onRestart();
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-700 hover:bg-red-600 border-2 border-red-400 rounded font-bold pixel-font text-xs cursor-pointer active:scale-98 transition-transform shadow-md"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART / NEW WORLD</span>
          </button>
        </div>

        {/* Atmosphere Time of Day Preset Buttons */}
        <div className="p-3 bg-[#181818] border border-white/10 rounded flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-mono text-gray-300">
            <span>Atmosphere / Lighting:</span>
            <span className="text-amber-400">
              {timeOfDay < 0.25 || timeOfDay > 0.85
                ? 'Night 🌙'
                : timeOfDay < 0.4
                ? 'Sunrise 🌅'
                : timeOfDay < 0.65
                ? 'Noon ☀️'
                : 'Sunset 🌆'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono">
            <button
              onClick={() => onSetTime(0.32)}
              className="py-1 px-1 bg-[#333] hover:bg-[#444] rounded text-center cursor-pointer text-amber-200"
            >
              Sunrise
            </button>
            <button
              onClick={() => onSetTime(0.5)}
              className="py-1 px-1 bg-[#333] hover:bg-[#444] rounded text-center cursor-pointer text-yellow-300"
            >
              Noon
            </button>
            <button
              onClick={() => onSetTime(0.72)}
              className="py-1 px-1 bg-[#333] hover:bg-[#444] rounded text-center cursor-pointer text-orange-300"
            >
              Sunset
            </button>
            <button
              onClick={() => onSetTime(0.05)}
              className="py-1 px-1 bg-[#333] hover:bg-[#444] rounded text-center cursor-pointer text-indigo-300"
            >
              Night
            </button>
          </div>
        </div>

        {/* Audio Mute */}
        <div className="flex items-center justify-between pt-2 border-t border-[#3a3a3a]">
          <span className="text-xs text-gray-300 font-mono">Sound Effects:</span>
          <button
            onClick={onToggleMute}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#333] hover:bg-[#444] rounded text-xs font-mono cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-red-400" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Enabled</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
