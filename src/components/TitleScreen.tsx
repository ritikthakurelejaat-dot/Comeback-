import React from 'react';
import { GameDifficulty } from '../game/types';
import { Volume2, VolumeX, ShieldAlert, Zap, Flame, Trophy } from 'lucide-react';
import { sound } from '../game/audio';

interface TitleScreenProps {
  onStart: (diff: GameDifficulty) => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  highScore,
  isMuted,
  onToggleMute,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<GameDifficulty>('STANDARD');

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-12 z-20 pointer-events-auto">
      {/* Top Bar: Minimal high score & audio toggle */}
      <div className="flex items-center justify-between text-xs tracking-wider text-slate-400">
        <div className="flex items-center gap-2 font-mono tabular-nums bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>ALL-TIME BEST:</span>
          <span className="font-bold text-slate-100">{highScore.toLocaleString()}</span>
        </div>

        <button
          onClick={onToggleMute}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          <span className="text-xs uppercase">{isMuted ? 'Audio Off' : 'Audio On'}</span>
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup with 30-40% Negative Space */}
      <div className="flex flex-col items-center justify-center my-auto text-center select-none">
        {/* Kinetic Badge */}
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-amber-400/90 uppercase mb-4 px-3 py-1 rounded border border-amber-500/20 bg-amber-500/10">
          <Flame className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>Defiance From The Brink</span>
        </div>

        {/* Bespoke Inline SVG Title Lockup */}
        <div className="w-full max-w-2xl px-4 py-2">
          <svg viewBox="0 0 820 140" className="w-full h-auto drop-shadow-[0_0_35px_rgba(245,158,11,0.35)]">
            <defs>
              <linearGradient id="comebackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="45%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>
              <linearGradient id="glowLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>

            {/* Kinetic backdrop hazard slashes */}
            <line x1="80" y1="12" x2="140" y2="128" stroke="rgba(245,158,11,0.2)" strokeWidth="6" />
            <line x1="120" y1="12" x2="180" y2="128" stroke="rgba(245,158,11,0.15)" strokeWidth="4" />
            <line x1="680" y1="12" x2="740" y2="128" stroke="rgba(239,68,68,0.2)" strokeWidth="6" />

            {/* Custom stylized typography */}
            <text
              x="410"
              y="105"
              textAnchor="middle"
              fill="url(#comebackGrad)"
              fontFamily="'Outfit', sans-serif"
              fontWeight="900"
              fontSize="112"
              letterSpacing="6"
              style={{ fontStyle: 'italic' }}
            >
              COMEBACK
            </text>

            {/* Cyber underline rule */}
            <rect x="180" y="124" width="460" height="3" fill="url(#glowLine)" />
            <polygon points="410,121 416,125 410,129 404,125" fill="#FFFFFF" />
          </svg>
        </div>

        <p className="max-w-md text-slate-400 text-sm mt-2 leading-relaxed">
          The closer you are to defeat, the more dangerous you become. Withstand the onslaught, charge your <span className="text-amber-400 font-semibold">Comeback Surge</span>, and turn the tide!
        </p>

        {/* Difficulty Selection */}
        <div className="flex items-center gap-2 mt-7 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          {(['STANDARD', 'HARDCORE', 'RELENTLESS'] as GameDifficulty[]).map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedDifficulty === diff
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>

        {/* Primary Start CTA */}
        <div className="mt-8">
          <button
            onClick={() => onStart(selectedDifficulty)}
            className="group relative px-10 py-4 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black tracking-wider text-base uppercase rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-3"
          >
            <Zap className="w-5 h-5 fill-current" />
            <span>Launch Game</span>
            <span className="text-xs bg-slate-950/20 text-slate-950 px-2 py-0.5 rounded font-mono font-bold ml-1">
              SPACE
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Flat Control-Hint Line */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4 gap-2">
        <div className="font-mono text-center sm:text-left">
          <span className="text-slate-400">WASD</span> Move · <span className="text-slate-400">Left Click</span> Strike · <span className="text-amber-400 font-bold">Space / Right-Click</span> Surge · <span className="text-slate-400">Shift</span> Dash · <span className="text-slate-400">Esc</span> Pause
        </div>
        <div className="text-slate-600 text-[11px] font-mono">
          V1.0 · 60FPS ARENA SIMULATION
        </div>
      </div>
    </div>
  );
};
