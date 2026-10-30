import React from 'react';
import { GameSnapshot } from '../game/types';
import { RotateCcw, Trophy, Skull, Zap, Swords } from 'lucide-react';

interface GameOverModalProps {
  snapshot: GameSnapshot;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  snapshot,
  onRestart,
  onReturnTitle,
}) => {
  const isNewRecord = snapshot.score > 0 && snapshot.score >= snapshot.highScore;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/90 pointer-events-auto">
      <div className="w-full max-w-lg flex flex-col items-center text-center">
        {/* Header indicator */}
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-red-400 uppercase mb-3">
          <Skull className="w-4 h-4" />
          <span>Simulation Terminated</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight uppercase italic mb-2">
          Signal Lost
        </h2>

        <p className="text-sm text-slate-400 mb-8 max-w-sm">
          Your systems succumbed to the onslaught, but the combat data endures.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8">
          <div className="flex flex-col p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Final Score</span>
            <span className="text-2xl font-black font-mono text-slate-100 tabular-nums">
              {snapshot.score.toLocaleString()}
            </span>
            {isNewRecord && (
              <span className="text-[10px] font-mono text-amber-400 mt-1 flex items-center gap-1 font-bold">
                <Trophy className="w-3 h-3" /> NEW HIGH SCORE!
              </span>
            )}
          </div>

          <div className="flex flex-col p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Wave Reached</span>
            <span className="text-2xl font-black font-mono text-amber-400 tabular-nums">
              {snapshot.wave} / {snapshot.maxWaves}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1">
              Max Combo: x{(1 + snapshot.maxCombo * 0.2).toFixed(1)}
            </span>
          </div>

          <div className="flex flex-col p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Enemies Crushed</span>
            <span className="text-xl font-bold font-mono text-slate-200 tabular-nums">
              {snapshot.enemiesKilled.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1">
              Damage: {snapshot.damageDealt.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Comebacks Executed</span>
            <span className="text-xl font-bold font-mono text-sky-400 tabular-nums">
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
            className="flex-1 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black tracking-wider uppercase text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
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
