import React from 'react';
import { GameSnapshot } from '../game/types';
import { Trophy, RotateCcw, Zap, Sparkles } from 'lucide-react';

interface VictoryModalProps {
  snapshot: GameSnapshot;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  snapshot,
  onRestart,
  onReturnTitle,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/90 pointer-events-auto">
      <div className="w-full max-w-lg flex flex-col items-center text-center">
        {/* Crown indicator */}
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-amber-400 uppercase mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Sector Fully Cleared</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-amber-400 tracking-tight uppercase italic mb-2 drop-shadow-[0_0_25px_rgba(245,158,11,0.5)]">
          Ultimate Comeback!
        </h2>

        <p className="text-sm text-slate-300 mb-8 max-w-sm">
          You survived all 10 escalating waves and vanquished the Nemesis Overlord from the jaws of defeat.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8">
          <div className="flex flex-col p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 text-left shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <span className="text-[11px] font-mono text-amber-400 uppercase">Victory Score</span>
            <span className="text-2xl font-black font-mono text-white tabular-nums">
              {snapshot.score.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              +25,000 Apex Survivor Bonus
            </span>
          </div>

          <div className="flex flex-col p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Max Combo</span>
            <span className="text-2xl font-black font-mono text-cyan-400 tabular-nums">
              x{(1 + snapshot.maxCombo * 0.2).toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1">
              {snapshot.maxCombo} Streaks
            </span>
          </div>

          <div className="flex flex-col p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Foes Annihilated</span>
            <span className="text-xl font-bold font-mono text-slate-200 tabular-nums">
              {snapshot.enemiesKilled.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1">
              Damage: {snapshot.damageDealt.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Comebacks Executed</span>
            <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
              {snapshot.comebacksUsed}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1">
              Surges triggered
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onRestart}
            className="flex-1 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black tracking-wider uppercase text-sm shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again [SPACE]</span>
          </button>

          <button
            onClick={onReturnTitle}
            className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Title Menu
          </button>
        </div>
      </div>
    </div>
  );
};
