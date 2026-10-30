export type GameState =
  | 'TITLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'PERK_SELECTION'
  | 'GAME_OVER'
  | 'VICTORY';

export type GameDifficulty = 'STANDARD' | 'HARDCORE' | 'RELENTLESS';

export interface PlayerStats {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  fireRate: number; // shots per sec
  pierce: number;
  bulletSpeed: number;
  dashCooldown: number;
  surgeDuration: number;
  surgeChargeRate: number;
  lifestealPercent: number;
  shockwaveOnDash: boolean;
  spreadShots: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  facingAngle: number;
  stats: PlayerStats;
  
  // Timers & Combat
  attackTimer: number;
  dashTimer: number;
  dashCooldownTimer: number;
  isDashing: boolean;
  dashDirX: number;
  dashDirY: number;
  invulnerableTimer: number;

  // Comeback Mechanics
  comebackMeter: number; // 0 to 100
  isSurging: boolean;
  surgeTimer: number;
  totalComebacksUsed: number;
  
  // Combo
  combo: number;
  comboTimer: number;
  maxCombo: number;

  // Active Perk IDs
  perks: string[];
}

export type EnemyType = 'SCRAPPER' | 'GOLIATH' | 'SNIPER' | 'NEMESIS_BOSS';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  color: string;
  scoreValue: number;
  
  // Telegraphing & Attack State
  attackState: 'IDLE' | 'WINDUP' | 'ATTACKING' | 'COOLDOWN';
  attackTimer: number;
  telegraphTimer: number;
  telegraphDuration: number;
  aimAngle: number;
  
  // Visuals
  hitFlashTimer: number;
  squashX: number;
  squashY: number;
  bossPhase?: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  isPlayer: boolean;
  pierce: number;
  lifespan: number;
  isSurgeEmpowered?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  shape: 'circle' | 'line' | 'spark' | 'ring';
  glow?: boolean;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
  vy: number;
  isCritical?: boolean;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  damage: number;
  stunsEnemies: boolean;
}

export interface Perk {
  id: string;
  title: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  icon: string;
  apply: (stats: PlayerStats, player: Player) => void;
}

export interface GameSnapshot {
  state: GameState;
  score: number;
  highScore: number;
  wave: number;
  maxWaves: number;
  waveProgress: number; // 0 to 1
  enemiesRemaining: number;
  playerHp: number;
  playerMaxHp: number;
  comebackMeter: number; // 0 to 100
  isSurging: boolean;
  surgeTimeRemaining: number;
  combo: number;
  maxCombo: number;
  isBossActive: boolean;
  bossHpPercent: number;
  bossName: string;
  activePerks: Perk[];
  enemiesKilled: number;
  damageDealt: number;
  comebacksUsed: number;
}
