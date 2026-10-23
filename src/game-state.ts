// Stats for a racer
export interface Stats {
  speed: number;      // 0-100
  stamina: number;    // 0-100
  luck: number;       // 0-100
}

// Tier determines stat range on randomize
export type Tier = 'S' | 'A' | 'B' | 'C';

// Stand/ability definition
export interface Stand {
  name: string;
  flavorText: string;        // shown in event banner
  activationChance: number;  // 0-1, per tick probability
}

// A racer's base definition (static per tournament)
export interface Racer {
  id: string;
  name: string;
  shortName: string;   // max 3 chars for track display e.g. "JNY"
  sprite: string;      // e.g. "♞" or ASCII char
  tier: Tier;
  stats: Stats;
  stand: Stand;
}

// Status in tournament
export type RacerStatus = 'active' | 'eliminated' | 'winner';

// Racer with tournament status
export interface TournamentRacer extends Racer {
  status: RacerStatus;
  roundsAdvanced: number;
}

// Racer during a live race
export interface RaceRacer extends TournamentRacer {
  position: number;        // 0.0 - 100.0
  finished: boolean;
  finishTick: number | null;
  finishPosition: number | null;  // 1st, 2nd, 3rd etc.
  speedMultiplier: number; // temporary effect multiplier, default 1.0
  lockedTicks: number;     // ticks remaining position-locked (Johnny's Tusk)
  staminaImmune: boolean;  // Diego's Scary Monsters
  skipTick: boolean;       // Magent Magent's invulnerability
}

// An active stand event to display
export interface StandEvent {
  text: string;
  ticksRemaining: number;
}

// Full live race state
export interface RaceState {
  tick: number;
  racers: RaceRacer[];
  finishOrder: string[];   // racer ids in finish order
  isComplete: boolean;
  activeEvents: StandEvent[];
}

// Result of a completed round
export interface RoundResult {
  finishOrder: string[];   // racer ids 1st to last
  eliminated: string[];    // racer ids eliminated
  advanced: string[];      // racer ids advancing
}

// Player's current bankroll state
export interface BankrollState {
  balance: number;
  betAmount: number;
  betRacerId: string | null;
  won: boolean | null;     // null = no result yet
  payout: number;          // how much was won/lost last round
}

// Full tournament state
export interface TournamentState {
  round: number;            // 1-indexed
  maxRounds: number;        // 4 (R1, R2, R3, Finals)
  racers: TournamentRacer[];
  history: RoundResult[];
  isFinals: boolean;
  isComplete: boolean;
  winner: string | null;    // racer id of tournament winner
}

// All game screens — using const object instead of enum (erasableSyntaxOnly compatible)
export const Screen = {
  Lobby:    'LOBBY',
  PreRace:  'PRE_RACE',
  Race:     'RACE',
  Results:  'RESULTS',
  Victory:  'VICTORY',
  GameOver: 'GAME_OVER',
} as const;
export type Screen = typeof Screen[keyof typeof Screen];

// Minimum bets per round
export const MIN_BETS: Record<number, number> = {
  1: 100,
  2: 250,
  3: 350,
  4: 500,
};

// Elimination count per round (how many cut after this round)
export const ELIMINATION_SCHEDULE: Record<number, number> = {
  1: 3,
  2: 2,
  3: 2,
  4: 0,
};

// Starting bankroll
export const STARTING_BANKROLL = 1000;
