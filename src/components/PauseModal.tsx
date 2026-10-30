import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnTitle,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 pointer-events-auto">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="text-xs font-mono tracking-widest text-slate-500 uppercase mb-2">
          Simulation Suspended
        </div>

        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight mb-6">
          Game Paused
        </h2>

        {/* Buttons list */}
        <div className="flex flex-col gap-3 w-full mb-8">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-bold uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume [ESC]</span>
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            <span>{isMuted ? 'Sound: Muted' : 'Sound: Enabled'}</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Mission</span>
          </button>

          <button
            onClick={onReturnTitle}
            className="w-full py-3 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Exit To Title</span>
          </button>
        </div>

        {/* Quick controls recall */}
        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/80 w-full text-[11px] font-mono text-slate-400 text-left space-y-1">
          <div><span className="text-slate-200">WASD</span> : Move</div>
          <div><span className="text-slate-200">Left Click</span> : Aim & Fire</div>
          <div><span className="text-amber-400 font-bold">Space / Right-Click</span> : Comeback Surge</div>
          <div><span className="text-slate-200">Shift</span> : Tactical Dash</div>
          <div><span className="text-slate-200">Esc</span> : Pause / Resume</div>
        </div>
      </div>
    </div>
  );
};
