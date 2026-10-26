import React from 'react';
import { X, Package } from 'lucide-react';
import { BlockType, BLOCK_DEFS } from '../game/constants';
import { getBlockIconDataUrl } from '../game/textures';
import { sounds } from '../game/audio';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (blockType: BlockType) => void;
  selectedSlot: number;
}

const ALL_BLOCKS: BlockType[] = [
  BlockType.GRASS,
  BlockType.DIRT,
  BlockType.STONE,
  BlockType.COBBLESTONE,
  BlockType.WOOD,
  BlockType.LEAVES,
  BlockType.SAND,
  BlockType.WATER,
  BlockType.PLANKS,
  BlockType.BRICK,
  BlockType.GLASS,
  BlockType.GLOWSTONE,
  BlockType.BEDROCK,
  BlockType.DIAMOND_ORE,
  BlockType.GOLD_BLOCK,
  BlockType.TNT,
  BlockType.BOOKSHELF,
];

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  onSelectBlock,
  selectedSlot,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 pointer-events-auto select-none">
      <div className="bg-[#2a2a2a] border-4 border-[#555] rounded-lg shadow-2xl w-full max-w-lg p-5 flex flex-col gap-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#444] pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold pixel-font text-amber-300">
              CREATIVE INVENTORY
            </h2>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1 hover:bg-white/10 rounded cursor-pointer text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-300 font-mono">
          Click any block to place it into Hotbar Slot #{selectedSlot + 1}:
        </p>

        {/* Block Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto p-1">
          {ALL_BLOCKS.map((blockId) => {
            const def = BLOCK_DEFS[blockId];
            const iconUrl = getBlockIconDataUrl(blockId);

            return (
              <button
                key={blockId}
                onClick={() => {
                  sounds.playClick();
                  onSelectBlock(blockId);
                  onClose();
                }}
                className="group flex flex-col items-center justify-center p-2 rounded border-2 border-[#444] bg-[#1a1a1a] hover:bg-[#333] hover:border-amber-400 cursor-pointer active:scale-95 transition-all"
                title={def.name}
              >
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt={def.name}
                    className="w-10 h-10 object-contain pointer-events-none mb-1 group-hover:scale-110 transition-transform"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
                <span className="text-[10px] text-gray-300 text-center truncate w-full font-sans group-hover:text-amber-300">
                  {def.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center pt-2 border-t border-[#444] text-[11px] text-gray-400 font-mono">
          <span>Press ESC or E to close</span>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-[#444] hover:bg-[#555] text-white rounded font-bold pixel-font text-[10px] cursor-pointer"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
