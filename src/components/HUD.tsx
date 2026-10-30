import React from 'react';
import { GameSnapshot } from '../game/types';
import { Volume2, VolumeX, Shield, Zap, Flame, Crosshair } from 'lucide-react';

interface HUDProps {
  snapshot: GameSnapshot;
  isMuted: boolean;
  onToggleMute: () => void;
  onTriggerSurge: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  snapshot,
  isMuted,
  onToggleMute,
  onTriggerSurge,
}) => {
  const hpPercent = Math.max(0, Math.min(100, (snapshot.playerHp / snapshot.playerMaxHp) * 100));
  const isHpCritical = hpPercent < 30;
  const isSurgeReady = snapshot.comebackMeter >= 100;

  return (
    <div className="absolute inset-0 pointer-events-none p-4 md:p-6 flex flex-col justify-between select-none z-10">
      {/* TOP PERIMETER CLUSTER */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Player Vitality Cluster */}
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <div className="flex items-center justify-between text-xs font-mono font-bold tracking-wider">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span>VITALITY</span>
            </span>
            <span className={`tabular-nums ${isHpCritical ? 'text-red-400 animate-pulse font-extrabold' : 'text-slate-100'}`}>
              {snapshot.playerHp} / {snapshot.playerMaxHp}
            </span>
          </div>

          {/* Health Bar */}
          <div className="w-full h-3 bg-slate-900 border border-slate-700/80 rounded overflow-hidden p-0.5">
            <div
              className={`h-full rounded-sm transition-all duration-100 ${
                isHpCritical
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 animate-pulse'
                  : snapshot.isSurging
                  ? 'bg-gradient-to-r from-amber-400 to-red-500'
                  : 'bg-gradient-to-r from-sky-500 to-cyan-400'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          {/* Adrenaline Warning Text when HP critical */}
          {isHpCritical && !snapshot.isSurging && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 tracking-tight animate-bounce">
              <Flame className="w-3 h-3 text-red-500 fill-red-500" />
              <span>ADRENALINE SURGE: METER CHARGING FAST</span>
            </div>
          )}
        </div>

        {/* Top-Center: Wave & Boss Cluster */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900/90 border border-slate-800 px-4 py-1.5 rounded-lg flex items-center gap-3">
            <span className="text-xs font-mono font-bold tracking-widest text-amber-400">
              WAVE {snapshot.wave} / {snapshot.maxWaves}
            </span>
            {snapshot.combo > 1 && (
              <span className="text-xs font-mono font-black text-cyan-400 tabular-nums">
                x{(1 + snapshot.combo * 0.2).toFixed(1)} COMBO
              </span>
            )}
          </div>

          {/* Boss Bar if active */}
          {snapshot.isBossActive && (
            <div className="mt-2 w-72 md:w-96 flex flex-col items-center gap-1">
              <div className="text-[11px] font-mono font-bold tracking-wider text-red-400 uppercase flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-red-500" />
                <span>{snapshot.bossName}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 border border-red-900/60 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-100"
                  style={{ width: `${snapshot.bossHpPercent * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Score Cluster & Audio Toggle */}
        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <div className="text-[10px] tracking-wider text-slate-400 uppercase">SCORE</div>
            <div className="text-base font-extrabold text-slate-100 tabular-nums">
              {snapshot.score.toLocaleString()}
            </div>
          </div>

          <button
            onClick={onToggleMute}
            className="pointer-events-auto p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>
        </div>
      </div>

      {/* BOTTOM PERIMETER CLUSTER: THE COMEBACK GAUGE */}
      <div className="flex flex-col items-center justify-center pb-2">
        <div className="w-full max-w-md flex flex-col items-center gap-1.5">
          {/* Gauge Status Header */}
          <div className="flex items-center justify-between w-full text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <Zap className={`w-4 h-4 ${isSurgeReady || snapshot.isSurging ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-slate-400'}`} />
              <span className={snapshot.isSurging ? 'text-amber-400 font-extrabold' : isSurgeReady ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                {snapshot.isSurging ? 'OVERDRIVE ACTIVE' : isSurgeReady ? 'COMEBACK SURGE READY' : 'COMEBACK CHARGE'}
              </span>
            </span>

            <span className="tabular-nums font-bold text-slate-300">
              {snapshot.isSurging
                ? `${snapshot.surgeTimeRemaining.toFixed(1)}s`
                : `${snapshot.comebackMeter}%`}
            </span>
          </div>

          {/* Main Meter Bar */}
          <div
            onClick={() => {
              if (isSurgeReady && !snapshot.isSurging) {
                onTriggerSurge();
              }
            }}
            className={`w-full h-4 bg-slate-900/90 rounded border p-0.5 overflow-hidden transition-all ${
              isSurgeReady
                ? 'border-amber-400 cursor-pointer pointer-events-auto shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                : 'border-slate-800'
            }`}
          >
            <div
              className={`h-full rounded-sm transition-all duration-75 ${
                snapshot.isSurging
                  ? 'bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300 animate-pulse'
                  : isSurgeReady
                  ? 'bg-gradient-to-r from-amber-400 to-amber-300 animate-pulse'
                  : 'bg-gradient-to-r from-slate-700 via-amber-600 to-amber-500'
              }`}
              style={{ width: `${snapshot.comebackMeter}%` }}
            />
          </div>

          {/* Action Prompt when Ready */}
          {isSurgeReady && !snapshot.isSurging && (
            <div className="pointer-events-auto flex items-center gap-2 mt-1">
              <button
                onClick={onTriggerSurge}
                className="px-4 py-1 bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 font-mono font-black text-xs uppercase tracking-wider rounded shadow-[0_0_15px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>IGNITE SURGE [SPACE / RIGHT-CLICK]</span>
              </button>
            </div>
          )}

          {/* Active Surge Perks ticker */}
          {snapshot.isSurging && (
            <div className="text-[11px] font-mono tracking-tight text-amber-300 flex items-center gap-2">
              <span>2X ATTACK SPEED</span>
              <span>·</span>
              <span>LIFESTEAL ACTIVE</span>
              <span>·</span>
              <span>50% RESISTANCE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
