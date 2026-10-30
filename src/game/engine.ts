import { sound } from './audio';
import {
  Enemy,
  EnemyType,
  FloatingText,
  GameDifficulty,
  GameSnapshot,
  GameState,
  Particle,
  Perk,
  Player,
  PlayerStats,
  Projectile,
  Shockwave,
} from './types';
import { ALL_PERKS } from './perks';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Game state
  public state: GameState = 'TITLE';
  public difficulty: GameDifficulty = 'STANDARD';
  public score: number = 0;
  public highScore: number = 0;
  public wave: number = 1;
  public maxWaves: number = 10;
  public enemiesKilled: number = 0;
  public damageDealt: number = 0;
  public comebacksUsed: number = 0;

  // Camera & Shake
  private cameraX: number = 0;
  private cameraY: number = 0;
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.92;
  private hitstopTimer: number = 0; // brief pause for impacts

  // Entities
  private player: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private shockwaves: Shockwave[] = [];

  // Wave Manager
  private waveEnemiesToSpawn: number = 0;
  private waveSpawnTimer: number = 0;
  private isWaveInProgress: boolean = false;
  private bossEntity: Enemy | null = null;

  // Input State (Held vs Just Pressed)
  private keysHeld: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private mousePos = { x: 0, y: 0 };
  private mouseHeld = false;
  private mouseJustPressed = false;
  private spaceBufferTimer = 0;

  // React snapshot notification
  private onSnapshotUpdate?: (snapshot: GameSnapshot) => void;
  private onPerkTrigger?: (offeredPerks: Perk[]) => void;
  private lastSnapshotTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;

    this.highScore = parseInt(localStorage.getItem('comeback_high_score') || '0', 10);
    this.player = this.createDefaultPlayer();

    this.setupListeners();
    this.handleResize();
  }

  private createDefaultPlayer(): Player {
    const defaultStats: PlayerStats = {
      hp: 100,
      maxHp: 100,
      speed: 340,
      damage: 28,
      fireRate: 4.8, // shots/sec
      pierce: 1,
      bulletSpeed: 780,
      dashCooldown: 1.0,
      surgeDuration: 8.0,
      surgeChargeRate: 1.0,
      lifestealPercent: 0.0,
      shockwaveOnDash: false,
      spreadShots: 0,
    };

    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 18,
      facingAngle: 0,
      stats: defaultStats,
      attackTimer: 0,
      dashTimer: 0,
      dashCooldownTimer: 0,
      isDashing: false,
      dashDirX: 0,
      dashDirY: 0,
      invulnerableTimer: 0,
      comebackMeter: 20, // starts with some adrenaline
      isSurging: false,
      surgeTimer: 0,
      totalComebacksUsed: 0,
      combo: 0,
      comboTimer: 0,
      maxCombo: 0,
      perks: [],
    };
  }

  public setCallbacks(
    onSnapshot: (snapshot: GameSnapshot) => void,
    onPerk: (offered: Perk[]) => void
  ) {
    this.onSnapshotUpdate = onSnapshot;
    this.onPerkTrigger = onPerk;
  }

  private setupListeners() {
    window.addEventListener('resize', () => this.handleResize());

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keysHeld.has(e.code)) {
        this.keysJustPressed.add(e.code);
      }
      this.keysHeld.add(e.code);

      if (e.code === 'Space' || e.code === 'KeyE') {
        this.spaceBufferTimer = 0.2; // 200ms input buffer
      }

      // Title screen quick start
      if (this.state === 'TITLE' && (e.code === 'Enter' || e.code === 'Space')) {
        this.startGame();
      } else if (this.state === 'GAME_OVER' || this.state === 'VICTORY') {
        if (e.code === 'Enter' || e.code === 'Space') {
          this.startGame();
        }
      } else if (e.code === 'Escape' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.keysJustPressed.clear();
      this.mouseHeld = false;
      this.mouseJustPressed = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseHeld = true;
        this.mouseJustPressed = true;
      } else if (e.button === 2) {
        // Right click triggers comeback surge
        e.preventDefault();
        this.tryTriggerComebackSurge();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseHeld = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = true;
  }

  public startGame(difficulty: GameDifficulty = this.difficulty) {
    this.difficulty = difficulty;
    this.state = 'PLAYING';
    this.score = 0;
    this.wave = 1;
    this.enemiesKilled = 0;
    this.damageDealt = 0;
    this.comebacksUsed = 0;

    this.player = this.createDefaultPlayer();
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.bossEntity = null;

    this.startWave(1);
    this.emitSnapshot();
  }

  public restartGame() {
    this.startGame(this.difficulty);
  }

  public togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTime = performance.now();
    }
    this.emitSnapshot();
  }

  public applyPerk(perk: Perk) {
    perk.apply(this.player.stats, this.player);
    this.player.perks.push(perk.id);
    sound.playPerkSelect();

    // Spawn celebratory particles
    for (let i = 0; i < 35; i++) {
      const angle = (Math.PI * 2 * i) / 35;
      const speed = 140 + Math.random() * 120;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 3,
        color: perk.rarity === 'LEGENDARY' ? '#F59E0B' : '#38BDF8',
        alpha: 1,
        decay: 0.8 + Math.random() * 0.4,
        shape: 'spark',
        glow: true,
      });
    }

    this.state = 'PLAYING';
    this.lastTime = performance.now();
    this.emitSnapshot();
  }

  private startWave(waveNum: number) {
    this.wave = waveNum;
    this.isWaveInProgress = true;
    this.waveSpawnTimer = 0.5;

    const baseCount = 8 + waveNum * 5;
    const diffMultiplier = this.difficulty === 'HARDCORE' ? 1.4 : this.difficulty === 'RELENTLESS' ? 1.8 : 1.0;
    this.waveEnemiesToSpawn = Math.floor(baseCount * diffMultiplier);

    // Boss at wave 5 and 10
    if (waveNum === 5 || waveNum === 10) {
      this.spawnBoss(waveNum === 10 ? 'NEMESIS OVERLORD' : 'CYBER COLOSSUS');
    }

    this.addFloatingText(this.player.x, this.player.y - 60, `WAVE ${waveNum}`, '#F59E0B', 1.8, true);
    sound.playTelegraph();
  }

  private spawnBoss(name: string) {
    const bossHp = this.wave === 10 ? 3200 : 1600;
    const boss: Enemy = {
      id: 'boss_' + Date.now(),
      type: 'NEMESIS_BOSS',
      x: this.player.x + 350,
      y: this.player.y,
      vx: 0,
      vy: 0,
      radius: 46,
      hp: bossHp,
      maxHp: bossHp,
      speed: 130,
      color: '#EF4444',
      scoreValue: 5000,
      attackState: 'IDLE',
      attackTimer: 2.0,
      telegraphTimer: 0,
      telegraphDuration: 1.0,
      aimAngle: 0,
      hitFlashTimer: 0,
      squashX: 1,
      squashY: 1,
      bossPhase: 1,
    };
    this.bossEntity = boss;
    this.enemies.push(boss);

    this.shakeIntensity = 18;
    sound.playHeavyHit();
    this.addFloatingText(boss.x, boss.y - 80, `WARNING: ${name}`, '#EF4444', 2.0, true);
  }

  private spawnEnemy() {
    if (this.waveEnemiesToSpawn <= 0) return;
    this.waveEnemiesToSpawn--;

    // Spawn in a ring around the player outside screen bounds
    const angle = Math.random() * Math.PI * 2;
    const dist = 650 + Math.random() * 250;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;

    // Pick enemy type based on wave
    const roll = Math.random();
    let type: EnemyType = 'SCRAPPER';
    let hp = 45 + this.wave * 12;
    let radius = 16;
    let speed = 190 + Math.random() * 40;
    let color = '#F97316'; // orange
    let score = 100;

    if (this.wave >= 2 && roll < 0.28) {
      type = 'GOLIATH';
      hp = 160 + this.wave * 35;
      radius = 28;
      speed = 105;
      color = '#A855F7'; // purple brute
      score = 250;
    } else if (this.wave >= 3 && roll > 0.72) {
      type = 'SNIPER';
      hp = 35 + this.wave * 8;
      radius = 15;
      speed = 140;
      color = '#06B6D4'; // cyan sniper
      score = 200;
    }

    if (this.difficulty === 'HARDCORE') {
      hp *= 1.3;
      speed *= 1.15;
    } else if (this.difficulty === 'RELENTLESS') {
      hp *= 1.6;
      speed *= 1.3;
    }

    this.enemies.push({
      id: 'e_' + Math.random().toString(36).substring(2, 9),
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      hp,
      maxHp: hp,
      speed,
      color,
      scoreValue: score,
      attackState: 'IDLE',
      attackTimer: 0.5 + Math.random() * 1.5,
      telegraphTimer: 0,
      telegraphDuration: type === 'GOLIATH' ? 0.9 : type === 'SNIPER' ? 1.1 : 0.4,
      aimAngle: 0,
      hitFlashTimer: 0,
      squashX: 1,
      squashY: 1,
    });
  }

  // COMEBACK SURGE ACTIVATION
  public tryTriggerComebackSurge(): boolean {
    if (this.state !== 'PLAYING') return false;
    if (this.player.isSurging) return false;
    if (this.player.comebackMeter < 100) return false;

    // IGNITE COMEBACK SURGE!
    this.player.isSurging = true;
    this.player.surgeTimer = this.player.stats.surgeDuration;
    this.player.comebackMeter = 100;
    this.player.invulnerableTimer = 1.8;
    this.player.totalComebacksUsed++;
    this.comebacksUsed++;

    // Heal player if Phoenix perk is active or base surge bonus
    const healAmount = this.player.stats.maxHp * 0.35;
    this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + healAmount);

    // Audio & Screen Juice
    sound.playComebackSurgeActivate();
    this.shakeIntensity = 28;
    this.hitstopTimer = 0.08; // 80ms hitstop for explosive surge feel

    // Concussive burst shockwave centered on player
    this.shockwaves.push({
      x: this.player.x,
      y: this.player.y,
      radius: 10,
      maxRadius: 380,
      color: '#F59E0B',
      alpha: 1,
      damage: 180,
      stunsEnemies: true,
    });

    // Massive particle ring
    for (let i = 0; i < 60; i++) {
      const a = (Math.PI * 2 * i) / 60;
      const spd = 260 + Math.random() * 220;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 3 + Math.random() * 4,
        color: i % 2 === 0 ? '#F59E0B' : '#EF4444',
        alpha: 1,
        decay: 0.9 + Math.random() * 0.5,
        shape: 'spark',
        glow: true,
      });
    }

    this.addFloatingText(this.player.x, this.player.y - 65, 'COMEBACK SURGE!', '#F59E0B', 2.2, true);
    this.emitSnapshot();
    return true;
  }

  // Main Loop
  public start() {
    this.lastTime = performance.now();
    const loop = (timestamp: number) => {
      const rawDt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  // UPDATE SIMULATION
  private update(dt: number) {
    if (this.state === 'TITLE') {
      // Atmospheric background camera drift and particle movement
      this.cameraX += Math.cos(performance.now() * 0.0005) * 0.8;
      this.cameraY += Math.sin(performance.now() * 0.0006) * 0.8;
      this.updateParticles(dt);
      return;
    }

    if (this.state !== 'PLAYING') {
      return;
    }

    // Hitstop freeze handling
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // Update screen shake decay
    if (this.shakeIntensity > 0.05) {
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }

    // Update input buffering
    if (this.spaceBufferTimer > 0) {
      this.spaceBufferTimer -= dt;
      if (this.spaceBufferTimer > 0 && this.player.comebackMeter >= 100 && !this.player.isSurging) {
        this.tryTriggerComebackSurge();
        this.spaceBufferTimer = 0;
      }
    }

    // Check Surge key
    if (this.keysJustPressed.has('Space') || this.keysJustPressed.has('KeyE') || this.keysJustPressed.has('ShiftLeft')) {
      if (this.player.comebackMeter >= 100 && !this.player.isSurging) {
        this.tryTriggerComebackSurge();
      }
    }

    // Adrenaline Comeback meter passive charge when HP is low
    const hpRatio = this.player.stats.hp / this.player.stats.maxHp;
    if (!this.player.isSurging) {
      if (hpRatio < 0.35) {
        // High adrenaline!
        const adrenalineCharge = (1 - hpRatio) * 12 * this.player.stats.surgeChargeRate * dt;
        this.player.comebackMeter = Math.min(100, this.player.comebackMeter + adrenalineCharge);
      }
      if (this.player.comebackMeter >= 100 && this.player.comebackMeter - (12 * dt) < 100) {
        sound.playComebackSurgeReady();
      }
    } else {
      // Surge is active: tick down
      this.player.surgeTimer -= dt;
      this.player.comebackMeter = Math.max(0, (this.player.surgeTimer / this.player.stats.surgeDuration) * 100);
      if (this.player.surgeTimer <= 0) {
        this.player.isSurging = false;
        this.player.comebackMeter = 0;
      }
    }

    // Player Update
    this.updatePlayer(dt);

    // Camera follow player smoothly
    const targetCamX = this.player.x;
    const targetCamY = this.player.y;
    this.cameraX += (targetCamX - this.cameraX) * 0.12;
    this.cameraY += (targetCamY - this.cameraY) * 0.12;

    // Wave Spawning
    if (this.isWaveInProgress) {
      if (this.waveEnemiesToSpawn > 0) {
        this.waveSpawnTimer -= dt;
        if (this.waveSpawnTimer <= 0) {
          this.spawnEnemy();
          this.waveSpawnTimer = Math.max(0.2, 0.9 - this.wave * 0.05);
        }
      } else if (this.enemies.length === 0) {
        // Wave complete!
        this.completeWave();
      }
    }

    // Enemies update
    this.updateEnemies(dt);

    // Projectiles update
    this.updateProjectiles(dt);

    // Shockwaves update
    this.updateShockwaves(dt);

    // Particles update
    this.updateParticles(dt);

    // Floating text update
    this.updateFloatingTexts(dt);

    // Combo timer decay
    if (this.player.combo > 0) {
      this.player.comboTimer -= dt;
      if (this.player.comboTimer <= 0) {
        this.player.combo = 0;
      }
    }

    // Clear edge-triggered keys for next frame
    this.keysJustPressed.clear();
    this.mouseJustPressed = false;

    // Throttled Snapshot dispatch to React (15fps)
    const now = performance.now();
    if (now - this.lastSnapshotTime > 66) {
      this.lastSnapshotTime = now;
      this.emitSnapshot();
    }
  }

  private completeWave() {
    this.isWaveInProgress = false;
    sound.playVictory();
    this.addFloatingText(this.player.x, this.player.y - 70, `WAVE ${this.wave} SURVIVED!`, '#10B981', 2.0, true);

    if (this.wave >= this.maxWaves) {
      // Victory!
      this.state = 'VICTORY';
      this.score += 25000;
      this.updateHighScore();
      this.emitSnapshot();
      return;
    }

    // Offer perks
    this.state = 'PERK_SELECTION';
    const offered = this.getOfferedPerks();
    if (this.onPerkTrigger) {
      this.onPerkTrigger(offered);
    }
    this.emitSnapshot();
  }

  private getOfferedPerks(): Perk[] {
    const unpicked = ALL_PERKS.filter(p => !this.player.perks.includes(p.id));
    const pool = unpicked.length >= 3 ? unpicked : ALL_PERKS;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  public nextWave() {
    this.startWave(this.wave + 1);
    this.state = 'PLAYING';
    this.lastTime = performance.now();
  }

  private updatePlayer(dt: number) {
    const p = this.player;

    // Invulnerability decay
    if (p.invulnerableTimer > 0) {
      p.invulnerableTimer -= dt;
    }

    // Dash decay
    if (p.isDashing) {
      p.dashTimer -= dt;
      p.x += p.dashDirX * (p.stats.speed * 2.8) * dt;
      p.y += p.dashDirY * (p.stats.speed * 2.8) * dt;

      // Dash trail particles
      this.particles.push({
        x: p.x + (Math.random() - 0.5) * 10,
        y: p.y + (Math.random() - 0.5) * 10,
        vx: -p.dashDirX * 50,
        vy: -p.dashDirY * 50,
        radius: 4,
        color: p.isSurging ? '#F59E0B' : '#38BDF8',
        alpha: 0.7,
        decay: 2.5,
        shape: 'spark',
      });

      if (p.dashTimer <= 0) {
        p.isDashing = false;
      }
    } else {
      // Dash cooldown
      if (p.dashCooldownTimer > 0) {
        p.dashCooldownTimer -= dt;
      }

      // Movement input
      let mx = 0;
      let my = 0;
      if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) my -= 1;
      if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) my += 1;
      if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) mx -= 1;
      if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) mx += 1;

      if (mx !== 0 && my !== 0) {
        const invLen = 1 / Math.SQRT2;
        mx *= invLen;
        my *= invLen;
      }

      // Speed bonus during Comeback Surge (+35%)
      const speedMult = p.isSurging ? 1.35 : 1.0;
      p.vx = mx * p.stats.speed * speedMult;
      p.vy = my * p.stats.speed * speedMult;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Dash Trigger (Space or Shift or Right Click when meter not ready to surge, or dedicated dash key)
      const wantsDash = this.keysJustPressed.has('ShiftLeft') || this.keysJustPressed.has('KeyQ');
      if (wantsDash && p.dashCooldownTimer <= 0 && (mx !== 0 || my !== 0)) {
        p.isDashing = true;
        p.dashTimer = 0.2; // 200ms dash
        p.dashCooldownTimer = p.stats.dashCooldown;
        p.dashDirX = mx;
        p.dashDirY = my;
        p.invulnerableTimer = 0.25;
        sound.playDash();

        // Concussive dash perk
        if (p.stats.shockwaveOnDash) {
          this.shockwaves.push({
            x: p.x,
            y: p.y,
            radius: 8,
            maxRadius: 130,
            color: '#38BDF8',
            alpha: 0.9,
            damage: 45,
            stunsEnemies: true,
          });
        }
      }
    }

    // Aiming at mouse cursor in world space
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const screenCenterX = (this.canvas.width / dpr) / 2;
    const screenCenterY = (this.canvas.height / dpr) / 2;
    const mouseWorldX = this.mousePos.x - screenCenterX + this.cameraX;
    const mouseWorldY = this.mousePos.y - screenCenterY + this.cameraY;

    p.facingAngle = Math.atan2(mouseWorldY - p.y, mouseWorldX - p.x);

    // Shooting
    if (p.attackTimer > 0) {
      p.attackTimer -= dt;
    }

    const fireRateMult = p.isSurging ? 2.0 : 1.0;
    const effectiveFireRate = p.stats.fireRate * fireRateMult;
    const cooldownPerShot = 1 / effectiveFireRate;

    if (this.mouseHeld && p.attackTimer <= 0) {
      this.firePlayerProjectiles();
      p.attackTimer = cooldownPerShot;
    }
  }

  private firePlayerProjectiles() {
    const p = this.player;
    sound.playShoot(p.isSurging ? 1.4 : 1.0);

    const baseDmg = p.isSurging ? p.stats.damage * 2.2 : p.stats.damage;
    const bulletSpeed = p.stats.bulletSpeed;
    const angle = p.facingAngle;

    // Base projectile
    this.createPlayerBullet(p.x, p.y, angle, bulletSpeed, baseDmg);

    // Spread perks
    if (p.stats.spreadShots > 0) {
      const spreadAngle = 0.22;
      for (let i = 1; i <= p.stats.spreadShots / 2; i++) {
        this.createPlayerBullet(p.x, p.y, angle + spreadAngle * i, bulletSpeed, baseDmg * 0.85);
        this.createPlayerBullet(p.x, p.y, angle - spreadAngle * i, bulletSpeed, baseDmg * 0.85);
      }
    }

    // Muzzle flash particles
    const muzzleDist = p.radius + 10;
    const mx = p.x + Math.cos(angle) * muzzleDist;
    const my = p.y + Math.sin(angle) * muzzleDist;
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: mx,
        y: my,
        vx: Math.cos(angle + (Math.random() - 0.5) * 0.6) * 180,
        vy: Math.sin(angle + (Math.random() - 0.5) * 0.6) * 180,
        radius: 2.5,
        color: p.isSurging ? '#F59E0B' : '#38BDF8',
        alpha: 1,
        decay: 4.0,
        shape: 'spark',
      });
    }
  }

  private createPlayerBullet(x: number, y: number, angle: number, speed: number, dmg: number) {
    const p = this.player;
    this.projectiles.push({
      id: 'pb_' + Math.random().toString(36).substring(2, 7),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: p.isSurging ? 7 : 4.5,
      color: p.isSurging ? '#F59E0B' : '#38BDF8',
      damage: dmg,
      isPlayer: true,
      pierce: p.stats.pierce,
      lifespan: 1.4,
      isSurgeEmpowered: p.isSurging,
    });
  }

  private updateEnemies(dt: number) {
    const p = this.player;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Hit flash decay
      if (e.hitFlashTimer > 0) e.hitFlashTimer -= dt;

      // Squash/stretch recovery
      e.squashX += (1 - e.squashX) * 0.2;
      e.squashY += (1 - e.squashY) * 0.2;

      // Vector to player
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      const angleToPlayer = Math.atan2(dy, dx);

      // Enemy AI behaviors based on type
      if (e.type === 'SCRAPPER') {
        // Fast runner, winds up when in lunging range
        if (e.attackState === 'IDLE') {
          if (dist < 140) {
            e.attackState = 'WINDUP';
            e.telegraphTimer = e.telegraphDuration;
            e.aimAngle = angleToPlayer;
            e.squashX = 0.6;
            e.squashY = 1.4;
          } else {
            // Chase player
            e.vx = Math.cos(angleToPlayer) * e.speed;
            e.vy = Math.sin(angleToPlayer) * e.speed;
            e.x += e.vx * dt;
            e.y += e.vy * dt;
          }
        } else if (e.attackState === 'WINDUP') {
          e.telegraphTimer -= dt;
          if (e.telegraphTimer <= 0) {
            e.attackState = 'ATTACKING';
            e.attackTimer = 0.35; // Lunge duration
            e.squashX = 1.4;
            e.squashY = 0.6;
            sound.playDash();
          }
        } else if (e.attackState === 'ATTACKING') {
          e.attackTimer -= dt;
          e.x += Math.cos(e.aimAngle) * (e.speed * 2.8) * dt;
          e.y += Math.sin(e.aimAngle) * (e.speed * 2.8) * dt;
          if (e.attackTimer <= 0) {
            e.attackState = 'COOLDOWN';
            e.attackTimer = 0.6;
          }
        } else if (e.attackState === 'COOLDOWN') {
          e.attackTimer -= dt;
          if (e.attackTimer <= 0) {
            e.attackState = 'IDLE';
          }
        }
      } else if (e.type === 'GOLIATH') {
        // Tank: moves slowly, stops to ground slam
        if (e.attackState === 'IDLE') {
          e.vx = Math.cos(angleToPlayer) * e.speed;
          e.vy = Math.sin(angleToPlayer) * e.speed;
          e.x += e.vx * dt;
          e.y += e.vy * dt;

          if (dist < 180) {
            e.attackState = 'WINDUP';
            e.telegraphTimer = e.telegraphDuration;
            sound.playTelegraph();
          }
        } else if (e.attackState === 'WINDUP') {
          e.telegraphTimer -= dt;
          if (e.telegraphTimer <= 0) {
            // Slam!
            e.attackState = 'COOLDOWN';
            e.attackTimer = 1.5;
            this.shockwaves.push({
              x: e.x,
              y: e.y,
              radius: 12,
              maxRadius: 210,
              color: '#A855F7',
              alpha: 1,
              damage: 38,
              stunsEnemies: false,
            });
            this.shakeIntensity = 14;
            sound.playHeavyHit();
          }
        } else if (e.attackState === 'COOLDOWN') {
          e.attackTimer -= dt;
          if (e.attackTimer <= 0) {
            e.attackState = 'IDLE';
          }
        }
      } else if (e.type === 'SNIPER') {
        // Keeps distance around 400px, charges sniper line
        if (dist < 320) {
          // Back away
          e.x -= Math.cos(angleToPlayer) * e.speed * dt;
          e.y -= Math.sin(angleToPlayer) * e.speed * dt;
        } else if (dist > 520) {
          // Move closer
          e.x += Math.cos(angleToPlayer) * e.speed * dt;
          e.y += Math.sin(angleToPlayer) * e.speed * dt;
        }

        e.attackTimer -= dt;
        if (e.attackState === 'IDLE' && e.attackTimer <= 0) {
          e.attackState = 'WINDUP';
          e.telegraphTimer = e.telegraphDuration;
          e.aimAngle = angleToPlayer;
          sound.playTelegraph();
        } else if (e.attackState === 'WINDUP') {
          e.telegraphTimer -= dt;
          // Follow player aim until last 0.25s
          if (e.telegraphTimer > 0.25) {
            e.aimAngle = angleToPlayer;
          }
          if (e.telegraphTimer <= 0) {
            // Fire high-speed sniper projectile
            this.projectiles.push({
              id: 'sp_' + Math.random().toString(36).substring(2, 7),
              x: e.x,
              y: e.y,
              vx: Math.cos(e.aimAngle) * 850,
              vy: Math.sin(e.aimAngle) * 850,
              radius: 6,
              color: '#06B6D4',
              damage: 32,
              isPlayer: false,
              pierce: 1,
              lifespan: 1.8,
            });
            sound.playShoot(0.7);
            e.attackState = 'IDLE';
            e.attackTimer = 2.2;
          }
        }
      } else if (e.type === 'NEMESIS_BOSS') {
        // Boss moves and fires bullet barrages
        e.aimAngle = angleToPlayer;
        if (dist > 250) {
          e.x += Math.cos(angleToPlayer) * e.speed * dt;
          e.y += Math.sin(angleToPlayer) * e.speed * dt;
        }

        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = e.bossPhase === 2 ? 1.2 : 2.0;

          // Radial bullet burst
          const count = e.bossPhase === 2 ? 16 : 10;
          for (let k = 0; k < count; k++) {
            const bAngle = (Math.PI * 2 * k) / count + (performance.now() * 0.002);
            this.projectiles.push({
              id: 'boss_b_' + Math.random(),
              x: e.x,
              y: e.y,
              vx: Math.cos(bAngle) * 260,
              vy: Math.sin(bAngle) * 260,
              radius: 6,
              color: '#EF4444',
              damage: 22,
              isPlayer: false,
              pierce: 1,
              lifespan: 3.5,
            });
          }
          sound.playShoot(0.6);

          // Phase transition check
          if (e.hp < e.maxHp * 0.5 && e.bossPhase === 1) {
            e.bossPhase = 2;
            e.speed = 180;
            this.addFloatingText(e.x, e.y - 70, 'PHASE 2: ENRAGED!', '#EF4444', 2.2, true);
            this.shakeIntensity = 20;
            sound.playHeavyHit();
          }
        }
      }

      // Check collision with player
      if (dist < p.radius + e.radius) {
        // Player takes contact damage
        if (p.invulnerableTimer <= 0) {
          const dmg = e.type === 'GOLIATH' ? 30 : e.type === 'NEMESIS_BOSS' ? 25 : 16;
          this.damagePlayer(dmg);
        }
      }

      // Soft enemy separation
      for (let j = i - 1; j >= 0; j--) {
        const other = this.enemies[j];
        const sepDx = e.x - other.x;
        const sepDy = e.y - other.y;
        const sepDist = Math.hypot(sepDx, sepDy);
        const minDist = e.radius + other.radius;
        if (sepDist < minDist && sepDist > 0.001) {
          const overlap = (minDist - sepDist) * 0.5;
          const nx = sepDx / sepDist;
          const ny = sepDy / sepDist;
          e.x += nx * overlap;
          e.y += ny * overlap;
          other.x -= nx * overlap;
          other.y -= ny * overlap;
        }
      }
    }
  }

  private updateProjectiles(dt: number) {
    const p = this.player;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.lifespan -= dt;

      if (proj.lifespan <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Trail particles for empowered surge shots
      if (proj.isSurgeEmpowered && Math.random() < 0.4) {
        this.particles.push({
          x: proj.x,
          y: proj.y,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          radius: 3,
          color: '#F59E0B',
          alpha: 0.8,
          decay: 3.0,
          shape: 'spark',
        });
      }

      if (proj.isPlayer) {
        // Check hits against enemies
        let hit = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const dist = Math.hypot(proj.x - e.x, proj.y - e.y);
          if (dist < proj.radius + e.radius) {
            hit = true;
            this.hitEnemy(e, j, proj);

            proj.pierce--;
            if (proj.pierce <= 0) {
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      } else {
        // Enemy projectile against player
        const distToPlayer = Math.hypot(proj.x - p.x, proj.y - p.y);
        if (distToPlayer < proj.radius + p.radius) {
          this.projectiles.splice(i, 1);
          if (p.invulnerableTimer <= 0) {
            this.damagePlayer(proj.damage);
          }
        }
      }
    }
  }

  private hitEnemy(e: Enemy, index: number, proj: Projectile) {
    e.hp -= proj.damage;
    e.hitFlashTimer = 0.12;
    e.squashX = 1.3;
    e.squashY = 0.7;
    this.damageDealt += Math.floor(proj.damage);

    sound.playHit(proj.isSurgeEmpowered);

    // Floating damage text
    this.addFloatingText(
      e.x + (Math.random() - 0.5) * 20,
      e.y - e.radius - 8,
      Math.floor(proj.damage).toString(),
      proj.isSurgeEmpowered ? '#F59E0B' : '#E2E8F0',
      proj.isSurgeEmpowered ? 1.4 : 1.0,
      proj.isSurgeEmpowered
    );

    // Lifesteal perk
    if (this.player.stats.lifestealPercent > 0) {
      const heal = proj.damage * this.player.stats.lifestealPercent;
      this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + heal);
    }

    // Impact sparks
    for (let k = 0; k < (proj.isSurgeEmpowered ? 8 : 4); k++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x: proj.x,
        y: proj.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        color: e.color,
        alpha: 1,
        decay: 2.5,
        shape: 'spark',
      });
    }

    // Defeated enemy
    if (e.hp <= 0) {
      this.killEnemy(e, index);
    }
  }

  private killEnemy(e: Enemy, index: number) {
    this.enemies.splice(index, 1);
    this.enemiesKilled++;

    // Score with combo multiplier
    const comboMult = 1 + Math.min(5, this.player.combo * 0.2);
    const earnedScore = Math.floor(e.scoreValue * comboMult);
    this.score += earnedScore;
    this.updateHighScore();

    // Increment combo
    this.player.combo++;
    this.player.comboTimer = 3.5;
    if (this.player.combo > this.player.maxCombo) {
      this.player.maxCombo = this.player.combo;
    }

    // Comeback meter charges on kill
    if (!this.player.isSurging) {
      const charge = (e.type === 'GOLIATH' ? 18 : e.type === 'NEMESIS_BOSS' ? 40 : 8) * this.player.stats.surgeChargeRate;
      this.player.comebackMeter = Math.min(100, this.player.comebackMeter + charge);
      if (this.player.comebackMeter >= 100) {
        sound.playComebackSurgeReady();
      }
    } else {
      // During surge, kills grant HP and extend surge
      const heal = this.player.stats.maxHp * 0.05;
      this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + heal);
      this.player.surgeTimer = Math.min(this.player.stats.surgeDuration, this.player.surgeTimer + 0.35);
    }

    // Death explosion
    const count = e.type === 'NEMESIS_BOSS' ? 60 : e.type === 'GOLIATH' ? 24 : 12;
    for (let k = 0; k < count; k++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * (e.type === 'NEMESIS_BOSS' ? 320 : 180);
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        color: e.color,
        alpha: 1,
        decay: 1.2 + Math.random() * 0.8,
        shape: 'spark',
        glow: true,
      });
    }

    if (e.type === 'NEMESIS_BOSS') {
      this.bossEntity = null;
      this.shakeIntensity = 30;
      this.hitstopTimer = 0.12;
      sound.playHeavyHit();
      this.addFloatingText(e.x, e.y, 'BOSS DEFEATED!', '#10B981', 2.5, true);
    }
  }

  private damagePlayer(damage: number) {
    const p = this.player;
    // Surge gives 50% damage resistance
    const effectiveDamage = p.isSurging ? damage * 0.5 : damage;

    p.stats.hp -= effectiveDamage;
    p.invulnerableTimer = 0.45;
    this.shakeIntensity = Math.min(22, this.shakeIntensity + 12);
    sound.playPlayerHurt();

    // Comeback meter charges heavily when taking damage! The lower HP, the bigger the charge!
    if (!p.isSurging) {
      const hpPct = p.stats.hp / p.stats.maxHp;
      // Comeback scaling multiplier: at 10% HP, charge is 3x
      const comebackMultiplier = 1 + (1 - Math.max(0, hpPct)) * 2.0;
      const charge = (effectiveDamage * 0.85 * comebackMultiplier) * p.stats.surgeChargeRate;
      p.comebackMeter = Math.min(100, p.comebackMeter + charge);

      if (p.comebackMeter >= 100) {
        sound.playComebackSurgeReady();
        this.addFloatingText(p.x, p.y - 45, 'COMEBACK READY!', '#F59E0B', 1.8, true);
      }
    }

    // Blood / Spark particles
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 90;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3,
        color: '#EF4444',
        alpha: 0.9,
        decay: 2.0,
        shape: 'spark',
      });
    }

    // Check Player Death
    if (p.stats.hp <= 0) {
      p.stats.hp = 0;
      this.gameOver();
    }
  }

  private gameOver() {
    this.state = 'GAME_OVER';
    sound.playGameOver();
    this.updateHighScore();
    this.shakeIntensity = 25;
    this.emitSnapshot();
  }

  private updateShockwaves(dt: number) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * (14 * dt);
      sw.alpha -= 1.8 * dt;

      // Hit enemies within ring radius
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dist = Math.hypot(e.x - sw.x, e.y - sw.y);
        if (Math.abs(dist - sw.radius) < 25) {
          if (sw.damage > 0) {
            e.hp -= sw.damage * dt * 5;
            e.hitFlashTimer = 0.08;
            if (sw.stunsEnemies) {
              e.attackTimer += 0.5 * dt;
              e.vx *= 0.5;
              e.vy *= 0.5;
            }
            if (e.hp <= 0) {
              this.killEnemy(e, j);
            }
          }
        }
      }

      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius * 0.98) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.alpha -= p.decay * dt;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= 1.2 * dt;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string, scale = 1.0, isCritical = false) {
    this.floatingTexts.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      alpha: 1,
      scale,
      vy: -60,
      isCritical,
    });
  }

  private updateHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('comeback_high_score', String(this.highScore));
    }
  }

  private emitSnapshot() {
    if (!this.onSnapshotUpdate) return;
    const snap: GameSnapshot = {
      state: this.state,
      score: this.score,
      highScore: this.highScore,
      wave: this.wave,
      maxWaves: this.maxWaves,
      waveProgress: Math.min(1, Math.max(0, 1 - (this.waveEnemiesToSpawn + this.enemies.length) / (8 + this.wave * 5))),
      enemiesRemaining: this.enemies.length + this.waveEnemiesToSpawn,
      playerHp: Math.ceil(this.player.stats.hp),
      playerMaxHp: this.player.stats.maxHp,
      comebackMeter: Math.floor(this.player.comebackMeter),
      isSurging: this.player.isSurging,
      surgeTimeRemaining: Math.max(0, this.player.surgeTimer),
      combo: this.player.combo,
      maxCombo: this.player.maxCombo,
      isBossActive: this.bossEntity !== null,
      bossHpPercent: this.bossEntity ? Math.max(0, this.bossEntity.hp / this.bossEntity.maxHp) : 0,
      bossName: this.wave === 10 ? 'NEMESIS OVERLORD' : 'CYBER COLOSSUS',
      activePerks: ALL_PERKS.filter(p => this.player.perks.includes(p.id)),
      enemiesKilled: this.enemiesKilled,
      damageDealt: this.damageDealt,
      comebacksUsed: this.comebacksUsed,
    };
    this.onSnapshotUpdate(snap);
  }

  // RENDER PIPELINE
  private render() {
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    // Clear Screen with deep cosmic slate
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // Camera transform with screen shake
    ctx.save();
    const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
    const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    ctx.translate(width / 2 + shakeX - this.cameraX, height / 2 + shakeY - this.cameraY);

    // 1. Grid Background
    this.renderGrid(ctx, width, height);

    // 2. Shockwaves
    this.renderShockwaves(ctx);

    // 3. Enemy Telegraphs & Laser Sights
    this.renderTelegraphs(ctx);

    // 4. Enemies
    this.renderEnemies(ctx);

    // 5. Player
    this.renderPlayer(ctx);

    // 6. Projectiles
    this.renderProjectiles(ctx);

    // 7. Particles
    this.renderParticles(ctx);

    // 8. Floating Numbers
    this.renderFloatingTexts(ctx);

    ctx.restore();

    // 9. Fullscreen Vignette & Surge Glow
    this.renderSurgeBorder(ctx, width, height);

    // 10. Crosshair
    if (this.state === 'PLAYING') {
      this.renderCrosshair(ctx);
    }
  }

  private renderGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const gridSize = 80;
    const startX = Math.floor((this.cameraX - width) / gridSize) * gridSize;
    const endX = Math.ceil((this.cameraX + width) / gridSize) * gridSize;
    const startY = Math.floor((this.cameraY - height) / gridSize) * gridSize;
    const endY = Math.ceil((this.cameraY + height) / gridSize) * gridSize;

    ctx.strokeStyle = this.player.isSurging ? 'rgba(245, 158, 11, 0.12)' : 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Subtle arena boundaries or center marker
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.stroke();
  }

  private renderTelegraphs(ctx: CanvasRenderingContext2D) {
    for (const e of this.enemies) {
      if (e.attackState !== 'WINDUP') continue;

      if (e.type === 'GOLIATH') {
        // Expanding danger ring
        const progress = 1 - (e.telegraphTimer / e.telegraphDuration);
        const radius = progress * 210;

        ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#C084FC';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, 210, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (e.type === 'SNIPER') {
        // Red sniper targeting laser line
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
        ctx.lineWidth = e.telegraphTimer < 0.25 ? 3 : 1.5;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.aimAngle) * 900, e.y + Math.sin(e.aimAngle) * 900);
        ctx.stroke();
      } else if (e.type === 'SCRAPPER') {
        // Lunge trajectory arrow
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.aimAngle) * 110, e.y + Math.sin(e.aimAngle) * 110);
        ctx.stroke();
      }
    }
  }

  private renderEnemies(ctx: CanvasRenderingContext2D) {
    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(e.squashX, e.squashY);

      // Flash white when hit
      const fillColor = e.hitFlashTimer > 0 ? '#FFFFFF' : e.color;

      ctx.fillStyle = fillColor;
      ctx.beginPath();

      if (e.type === 'GOLIATH') {
        // Sturdy hexagonal brute
        this.drawPolygon(ctx, 0, 0, e.radius, 6);
      } else if (e.type === 'SNIPER') {
        // Sleek sharp diamond
        this.drawPolygon(ctx, 0, 0, e.radius, 4);
      } else if (e.type === 'NEMESIS_BOSS') {
        // Mighty 8-sided fortress
        this.drawPolygon(ctx, 0, 0, e.radius, 8);
      } else {
        // Scrapper triangle scout
        this.drawPolygon(ctx, 0, 0, e.radius, 3, Math.atan2(e.vy, e.vx) + Math.PI / 2);
      }
      ctx.fill();

      // Border outline
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mini Health bar above enemy if damaged
      if (e.hp < e.maxHp && e.type !== 'NEMESIS_BOSS') {
        const barW = e.radius * 2;
        const barH = 4;
        const pct = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-barW / 2, -e.radius - 10, barW, barH);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-barW / 2, -e.radius - 10, barW * pct, barH);
      }

      ctx.restore();
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.facingAngle);

    // Invulnerability blink
    if (p.invulnerableTimer > 0 && Math.floor(performance.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Surge kinetic aura
    if (p.isSurging) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Player Hull (Futuristic combat vessel)
    ctx.fillStyle = p.isSurging ? '#F59E0B' : '#0EA5E9';
    ctx.beginPath();
    ctx.moveTo(p.radius + 6, 0); // Tip
    ctx.lineTo(-p.radius, -p.radius * 0.85); // Left fin
    ctx.lineTo(-p.radius * 0.5, 0); // Center notch
    ctx.lineTo(-p.radius, p.radius * 0.85); // Right fin
    ctx.closePath();
    ctx.fill();

    // Inner cockpit core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(2, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const proj of this.projectiles) {
      ctx.save();
      ctx.fillStyle = proj.color;

      if (proj.isSurgeEmpowered) {
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 12;
      }

      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      // White core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderShockwaves(ctx: CanvasRenderingContext2D) {
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = sw.alpha;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `${ft.isCritical ? 'bold 22px' : '600 16px'} "JetBrains Mono", monospace`;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private renderSurgeBorder(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Adrenaline surge border indicator
    if (this.player.isSurging) {
      const pulse = Math.sin(performance.now() * 0.008) * 0.2 + 0.8;
      ctx.save();
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.45 * pulse})`;
      ctx.lineWidth = 18;
      ctx.strokeRect(0, 0, width, height);
      ctx.restore();
    } else if (this.player.comebackMeter >= 100) {
      // Golden blinking prompt
      const blink = Math.sin(performance.now() * 0.012) * 0.3 + 0.6;
      ctx.save();
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.35 * blink})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(0, 0, width, height);
      ctx.restore();
    } else if (this.player.stats.hp / this.player.stats.maxHp < 0.3) {
      // Critical health warning pulse
      const pulse = Math.sin(performance.now() * 0.01) * 0.25 + 0.55;
      ctx.save();
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 * pulse})`;
      ctx.lineWidth = 12;
      ctx.strokeRect(0, 0, width, height);
      ctx.restore();
    }
  }

  private renderCrosshair(ctx: CanvasRenderingContext2D) {
    const mx = this.mousePos.x;
    const my = this.mousePos.y;
    const p = this.player;

    ctx.save();
    ctx.strokeStyle = p.isSurging ? '#F59E0B' : '#38BDF8';
    ctx.lineWidth = 1.5;

    // Crosshair ring
    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Cross ticks
    ctx.beginPath();
    ctx.moveTo(mx - 18, my);
    ctx.lineTo(mx - 6, my);
    ctx.moveTo(mx + 6, my);
    ctx.lineTo(mx + 18, my);
    ctx.moveTo(mx, my - 18);
    ctx.lineTo(mx, my - 6);
    ctx.moveTo(mx, my + 6);
    ctx.lineTo(mx, my + 18);
    ctx.stroke();

    ctx.restore();
  }

  private drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, offsetAngle = 0) {
    if (sides < 3) return;
    const a = (Math.PI * 2) / sides;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = i * a + offsetAngle;
      const px = x + radius * Math.cos(angle);
      const py = y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}
