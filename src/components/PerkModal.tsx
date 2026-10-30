import React from 'react';
import { Perk } from '../game/types';
import { Flame, Zap, Crosshair, Gauge, FastForward, Target, HeartPulse, RotateCw, Shield } from 'lucide-react';

interface PerkModalProps {
  offeredPerks: Perk[];
  onSelect: (perk: Perk) => void;
  wave: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Zap,
  Crosshair,
  Gauge,
  FastForward,
  Target,
  HeartPulse,
  RotateCw,
  Shield,
};

export const PerkModal: React.FC<PerkModalProps> = ({ offeredPerks, onSelect, wave }) => {
  // Keyboard numbers 1, 2, 3 support
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && offeredPerks[0]) onSelect(offeredPerks[0]);
      if (e.key === '2' && offeredPerks[1]) onSelect(offeredPerks[1]);
      if (e.key === '3' && offeredPerks[2]) onSelect(offeredPerks[2]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [offeredPerks, onSelect]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 pointer-events-auto">
      <div className="w-full max-w-2xl flex flex-col items-center text-center">
        {/* Header */}
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-emerald-400 uppercase mb-2">
          <span>Wave {wave} Cleared</span>
          <span>·</span>
          <span>Enhancement Protocol</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight mb-2">
          Select Your Comeback Perk
        </h2>
        <p className="text-slate-400 text-xs md:text-sm max-w-md mb-8">
          Reinforce your combat systems to endure higher tier threats.
        </p>

        {/* 3 Perk Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {offeredPerks.map((perk, idx) => {
            const Icon = ICON_MAP[perk.icon] || Zap;
            const isLegendary = perk.rarity === 'LEGENDARY';
            const isRare = perk.rarity === 'RARE';

            return (
              <button
                key={perk.id}
                onClick={() => onSelect(perk)}
                className={`group flex flex-col text-left p-5 rounded-xl border transition-all duration-150 transform hover:-translate-y-1 cursor-pointer bg-slate-900/90 ${
                  isLegendary
                    ? 'border-amber-500/50 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : isRare
                    ? 'border-sky-500/50 hover:border-sky-400 hover:shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                    : 'border-slate-800 hover:border-slate-700 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isLegendary
                        ? 'bg-amber-500/10 text-amber-400'
                        : isRare
                        ? 'bg-sky-500/10 text-sky-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className="font-mono text-xs font-semibold text-slate-500">
                    [{idx + 1}]
                  </span>
                </div>

                <div className="text-xs font-mono uppercase tracking-wider mb-1 text-slate-400">
                  {perk.rarity}
                </div>

                <div className="text-base font-bold text-slate-100 group-hover:text-white transition-colors mb-2">
                  {perk.title}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mt-auto">
                  {perk.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 group-hover:text-slate-200">
                  <span>SELECT PERK</span>
                  <span>→</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 text-xs text-slate-500 font-mono">
          Press <span className="text-slate-300">1</span>, <span className="text-slate-300">2</span>, or <span className="text-slate-300">3</span> on your keyboard to instantly choose.
        </div>
      </div>
    </div>
  );
};
