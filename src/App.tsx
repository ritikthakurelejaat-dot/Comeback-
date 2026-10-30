import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { GameDifficulty, GameSnapshot, GameState, Perk } from './game/types';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { PerkModal } from './components/PerkModal';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { PauseModal } from './components/PauseModal';
import { sound } from './game/audio';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [snapshot, setSnapshot] = useState<GameSnapshot>({
    state: 'TITLE',
    score: 0,
    highScore: 0,
    wave: 1,
    maxWaves: 10,
    waveProgress: 0,
    enemiesRemaining: 0,
    playerHp: 100,
    playerMaxHp: 100,
    comebackMeter: 20,
    isSurging: false,
    surgeTimeRemaining: 0,
    combo: 0,
    maxCombo: 0,
    isBossActive: false,
    bossHpPercent: 0,
    bossName: '',
    activePerks: [],
    enemiesKilled: 0,
    damageDealt: 0,
    comebacksUsed: 0,
  });

  const [offeredPerks, setOfferedPerks] = useState<Perk[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    engine.setCallbacks(
      (snap) => {
        setSnapshot(snap);
        setGameState(snap.state);
      },
      (perks) => {
        setOfferedPerks(perks);
        setGameState('PERK_SELECTION');
      }
    );

    engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  const handleStartGame = (difficulty: GameDifficulty) => {
    if (engineRef.current) {
      engineRef.current.startGame(difficulty);
      setGameState('PLAYING');
    }
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restartGame();
      setGameState('PLAYING');
    }
  };

  const handleResume = () => {
    if (engineRef.current) {
      engineRef.current.togglePause();
      setGameState('PLAYING');
    }
  };

  const handleReturnTitle = () => {
    if (engineRef.current) {
      engineRef.current.state = 'TITLE';
      setGameState('TITLE');
    }
  };

  const handleSelectPerk = (perk: Perk) => {
    if (engineRef.current) {
      engineRef.current.applyPerk(perk);
      engineRef.current.nextWave();
      setGameState('PLAYING');
    }
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleTriggerSurge = () => {
    if (engineRef.current) {
      engineRef.current.tryTriggerComebackSurge();
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 font-sans select-none">
      {/* Isolated 60FPS Game Simulation Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair z-0"
      />

      {/* Subtle cinematic vignette */}
      <div className="absolute inset-0 cinematic-vignette pointer-events-none z-[1]" />

      {/* Game Shell View State Router */}
      {gameState === 'TITLE' && (
        <TitleScreen
          onStart={handleStartGame}
          highScore={snapshot.highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {(gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'PERK_SELECTION') && (
        <HUD
          snapshot={snapshot}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onTriggerSurge={handleTriggerSurge}
        />
      )}

      {gameState === 'PERK_SELECTION' && (
        <PerkModal
          offeredPerks={offeredPerks}
          onSelect={handleSelectPerk}
          wave={snapshot.wave}
        />
      )}

      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onReturnTitle={handleReturnTitle}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameState === 'GAME_OVER' && (
        <GameOverModal
          snapshot={snapshot}
          onRestart={handleRestart}
          onReturnTitle={handleReturnTitle}
        />
      )}

      {gameState === 'VICTORY' && (
        <VictoryModal
          snapshot={snapshot}
          onRestart={handleRestart}
          onReturnTitle={handleReturnTitle}
        />
      )}
    </div>
  );
}
