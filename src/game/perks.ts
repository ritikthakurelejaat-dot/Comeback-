import { Perk } from './types';

export const ALL_PERKS: Perk[] = [
  {
    id: 'phoenix_defiance',
    title: 'Phoenix Defiance',
    description: 'Triggering Comeback Surge immediately heals 40% of your maximum health.',
    rarity: 'LEGENDARY',
    icon: 'Flame',
    apply: (stats) => {
      stats.lifestealPercent += 0.15;
    },
  },
  {
    id: 'kinetic_shockwave',
    title: 'Concussive Dash',
    description: 'Dashing unleashes an expanding kinetic shockwave that stuns and repels enemies.',
    rarity: 'RARE',
    icon: 'Zap',
    apply: (stats) => {
      stats.shockwaveOnDash = true;
      stats.dashCooldown = Math.max(0.4, stats.dashCooldown * 0.85);
    },
  },
  {
    id: 'overdrive_shards',
    title: 'Spread Overdrive',
    description: 'Attacks fire 2 additional kinetic shards in an angled spread pattern.',
    rarity: 'RARE',
    icon: 'Crosshair',
    apply: (stats) => {
      stats.spreadShots += 2;
      stats.damage *= 0.9; // slight damage compensation for triple bullets
    },
  },
  {
    id: 'surge_accelerator',
    title: 'Adrenaline Dynamo',
    description: 'Comeback meter charges 50% faster, and Comeback Surge duration increases by 3 seconds.',
    rarity: 'COMMON',
    icon: 'Gauge',
    apply: (stats) => {
      stats.surgeChargeRate *= 1.5;
      stats.surgeDuration += 3.0;
    },
  },
  {
    id: 'hyper_velocity',
    title: 'Hyper Velocity',
    description: 'Increases movement speed by 25% and bullet projectile velocity by 40%.',
    rarity: 'COMMON',
    icon: 'FastForward',
    apply: (stats) => {
      stats.speed *= 1.25;
      stats.bulletSpeed *= 1.4;
    },
  },
  {
    id: 'quantum_pierce',
    title: 'Plasma Rail',
    description: 'All projectiles pierce through 2 additional targets and deal +25% impact damage.',
    rarity: 'RARE',
    icon: 'Target',
    apply: (stats) => {
      stats.pierce += 2;
      stats.damage *= 1.25;
    },
  },
  {
    id: 'vampiric_edge',
    title: 'Reaper’s Feast',
    description: 'Defeating enemies heals 2% HP and extends active Surge duration by 0.4s.',
    rarity: 'LEGENDARY',
    icon: 'HeartPulse',
    apply: (stats) => {
      stats.lifestealPercent += 0.08;
    },
  },
  {
    id: 'rapid_fire_core',
    title: 'Rotary Cycler',
    description: 'Increases primary weapon attack speed by 45%.',
    rarity: 'COMMON',
    icon: 'RotateCw',
    apply: (stats) => {
      stats.fireRate *= 1.45;
    },
  },
  {
    id: 'titan_hull',
    title: 'Titan Hull',
    description: 'Increases maximum HP by +50 and restores all health instantly.',
    rarity: 'COMMON',
    icon: 'Shield',
    apply: (stats, player) => {
      stats.maxHp += 50;
      player.stats.hp = stats.maxHp;
    },
  },
];

export function getRandomPerks(count: number, currentPerkIds: string[]): Perk[] {
  // Filter out perks that have already been chosen if unique or allow stacking
  const available = ALL_PERKS.filter(p => !currentPerkIds.includes(p.id));
  const pool = available.length >= count ? available : ALL_PERKS;
  
  // Shuffle
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
