import type { Racer, Tier } from './game-state.ts';

// Stat ranges by tier
export function getTierRange(tier: Tier): { min: number; max: number } {
  switch (tier) {
    case 'S': return { min: 70, max: 100 };
    case 'A': return { min: 55, max: 85 };
    case 'B': return { min: 40, max: 70 };
    case 'C': return { min: 25, max: 55 };
  }
}

// Character definitions with placeholder stats (all 0)
// Stats are populated by randomizeRoster()
export const BASE_CHARACTERS: Racer[] = [
  {
    id: 'johnny',
    name: 'Johnny Joestar',
    shortName: 'JNY',
    sprite: '♞',
    tier: 'S',
    stats: { speed: 0, stamina: 0, luck: 0 },
    stand: {
      name: 'Tusk',
      activationChance: 0.04,
      flavorText: '★ JOHNNY activates TUSK — rival LOCKED in place!',
    },
  },
  {
    id: 'gyro',
    name: 'Gyro Zeppeli',
    shortName: 'GYR',
    sprite: '⊙',
    tier: 'S',
    stats: { speed: 0, stamina: 0, luck: 0 },
    stand: {
      name: 'Ball Breaker',
      activationChance: 0.05,
      flavorText: '★ GYRO activates BALL BREAKER — SPEED BURST!',
    },
  },
  {
    id: 'valentine',
    name: 'Funny Valentine',
    shortName: 'VAL',
    sprite: '✦',
    tier: 'S',
    stats: { speed: 0, stamina: 0, luck: 0 },
    stand: {
      name: 'D4C',
      activationChance: 0.035,
      flavorText: '★ FUNNY VALENTINE activates D4C — WARPS FORWARD!',
    },
  },
  {
    id: 'diego',
    name: 'Diego Brando',
    shortName: 'DEG',
    sprite: '☿',
    tier: 'A',
    stats: { speed: 0, stamina: 0, luck: 0 },
    stand: {
      name: 'Scary Monsters',
      activationChance: 0.06,
      flavorText: '★ DIEGO activates SCARY MONSTERS — STAMINA IMMUNE!',
    },
  },
  {
    id: 'hotpants',
    name: 'Hot Pants',
    shortName: 'HTP',
    sprite: '✿',
    tier: 'A',
    stats: { speed: 0, stamina: 0, luck: 0 },
    stand: {
      name: 'Cream Starter',
      activationChance: 0.055,
      flavorText: '★ HOT PANTS activates CREAM STARTER — STAMINA RESTORED!',
    },
  },
  {
    id: 'wekapipo',
    name: 'Wekapipo',
    shortName: 'WKP',
    sprite: '⚙',
    tier: 'B',
    stats: { speed: 0, stamina: 0, luck: 0 },
    stand: {
      name: 'Wrecking Ball',
      activationChance: 0.045,
      flavorText: '★ WEKAPIPO activates WRECKING BALL — LEADER SLOWED!',
    },
  },
  {
    id: 'magent',
    name: 'Magent Magent',
    shortName: 'MGT',
    sprite: '◈',
    tier: 'B',
    stats: { speed: 0, stamina: 0, luck: 0 },
    stand: {
      name: '20th Century Boy',
      activationChance: 0.05,
      flavorText: '★ MAGENT MAGENT activates 20TH CENTURY BOY — INVINCIBLE!',
    },
  },
  {
    id: 'pocoloco',
    name: 'Pocoloco',
    shortName: 'PCL',
    sprite: '★',
    tier: 'B',
    stats: { speed: 0, stamina: 0, luck: 0 },
    stand: {
      name: 'Hey Ya!',
      activationChance: 0.07,
      flavorText: '★ POCOLOCO activates HEY YA! — MASSIVE LUCK SURGE!',
    },
  },
  {
    id: 'tim',
    name: 'Mountain Tim',
    shortName: 'TIM',
    sprite: '⌖',
    tier: 'C',
    stats: { speed: 0, stamina: 0, luck: 0 },
    stand: {
      name: 'Oh! Lonesome Me',
      activationChance: 0.06,
      flavorText: '★ MOUNTAIN TIM activates OH! LONESOME ME — LASSO PULL!',
    },
  },
  {
    id: 'sandman',
    name: 'Sandman',
    shortName: 'SND',
    sprite: '∿',
    tier: 'C',
    stats: { speed: 0, stamina: 0, luck: 0 },
    stand: {
      name: 'In a Silent Way',
      activationChance: 0.065,
      flavorText: '★ SANDMAN activates IN A SILENT WAY — STEADY STRIDE!',
    },
  },
];

/**
 * Rolls a random integer in [min, max] inclusive.
 */
function rollStat(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Takes base character definitions and returns a fresh Racer[] with
 * randomized stats within each character's tier range.
 */
export function randomizeRoster(base: Racer[] = BASE_CHARACTERS): Racer[] {
  return base.map((character) => {
    const { min, max } = getTierRange(character.tier);
    return {
      ...character,
      stats: {
        speed:   rollStat(min, max),
        stamina: rollStat(min, max),
        luck:    rollStat(min, max),
      },
    };
  });
}
