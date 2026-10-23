import type { Stats, TournamentRacer, RaceRacer, RaceState } from './game-state.ts';

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/**
 * Compute a racer's base weight from stats (higher = faster overall).
 * Speed contributes most, then stamina, then luck.
 */
export function computeWeight(stats: Stats): number {
  return stats.speed * 0.5 + stats.stamina * 0.3 + stats.luck * 0.2;
}

/**
 * Box-Muller transform: samples a normally-distributed value
 * with the given mean and standard deviation.
 */
export function randNormal(mean: number, stdDev: number): number {
  // Use the Box-Muller polar form for numerical stability.
  let u = 0;
  let v = 0;
  // Avoid u === 0 (log(0) is -Infinity)
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

/**
 * Weighted random pick — selects one item proportional to its weight.
 * Throws if arrays are empty or have mismatched lengths.
 */
export function weightedPick<T>(items: T[], weights: number[]): T {
  if (items.length === 0 || items.length !== weights.length) {
    throw new Error('weightedPick: items and weights must be non-empty arrays of equal length');
  }

  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = Math.random() * total;

  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }

  // Fallback for floating-point rounding — return last item
  return items[items.length - 1];
}

// ---------------------------------------------------------------------------
// Race initialisation
// ---------------------------------------------------------------------------

/**
 * Build a fresh RaceState from the currently active tournament racers.
 * Every racer starts at position 0 with all flags at their defaults.
 */
export function initRace(racers: TournamentRacer[]): RaceState {
  const raceRacers: RaceRacer[] = racers.map((tr) => ({
    // Spread all TournamentRacer (and its Racer) fields
    ...tr,
    // RaceRacer-specific fields
    position: 0,
    finished: false,
    finishTick: null,
    finishPosition: null,
    speedMultiplier: 1.0,
    lockedTicks: 0,
    staminaImmune: false,
    skipTick: false,
  }));

  return {
    tick: 0,
    racers: raceRacers,
    finishOrder: [],
    isComplete: false,
    activeEvents: [],
  };
}

// ---------------------------------------------------------------------------
// Race tick simulation
// ---------------------------------------------------------------------------

/**
 * Advance the race by one tick. Returns a **new** RaceState (immutable update).
 *
 * Per-racer logic (in order):
 *  1. Skip if already finished.
 *  2. If skipTick is true, clear it and skip movement (Magent Magent effect).
 *  3. If lockedTicks > 0, decrement and skip movement (Johnny's Tusk).
 *  4. Compute advance from weight/stats.
 *  5. Apply stamina degradation past position 50 (unless staminaImmune).
 *  6. Apply speedMultiplier then reset it to 1.0.
 *  7. Clamp advance to >= 0.
 *  8. Update position; detect finish (>= 100).
 *
 * After all racers are processed:
 *  9.  Decrement StandEvent ticksRemaining, filter expired ones.
 *  10. Mark race complete when all racers have finished.
 */
export function tickRace(state: RaceState): RaceState {
  const nextTick = state.tick + 1;
  const finishOrder = [...state.finishOrder];

  const nextRacers: RaceRacer[] = state.racers.map((racer) => {
    // 1. Already finished — carry forward unchanged.
    if (racer.finished) return { ...racer };

    // 2. Magent Magent's skipTick: consume flag, skip movement this tick.
    if (racer.skipTick) {
      return { ...racer, skipTick: false };
    }

    // 3. Johnny's Tusk: position is locked.
    if (racer.lockedTicks > 0) {
      return { ...racer, lockedTicks: racer.lockedTicks - 1 };
    }

    // 4. Compute base advance.
    const weight = computeWeight(racer.stats);
    const mean = 1.4 * (weight / 100);
    const stdDev = 0.3 * (racer.stats.luck / 100);
    let advance = randNormal(mean, stdDev);

    // 5. Stamina degradation past position 50 (unless immune).
    if (racer.position >= 50 && !racer.staminaImmune) {
      advance *= (racer.stats.stamina / 100) * 0.8 + 0.2;
    }

    // 6. Apply speedMultiplier (consumed once per tick).
    const multiplier = racer.speedMultiplier;
    advance *= multiplier;

    // 7. Clamp: no backward movement.
    advance = Math.max(0, advance);

    // 8. Advance position.
    const newPos = racer.position + advance;

    if (newPos >= 100) {
      // Racer crosses the finish line this tick.
      const finishPosition = finishOrder.length + 1;
      finishOrder.push(racer.id);

      return {
        ...racer,
        position: 100,
        finished: true,
        finishTick: nextTick,
        finishPosition,
        speedMultiplier: 1.0,
      };
    }

    return {
      ...racer,
      position: newPos,
      speedMultiplier: 1.0,
    };
  });

  // 9. Age stand events, drop expired ones.
  const activeEvents = state.activeEvents
    .map((ev) => ({ ...ev, ticksRemaining: ev.ticksRemaining - 1 }))
    .filter((ev) => ev.ticksRemaining > 0);

  // 10. Race is complete when every racer has finished.
  const isComplete = nextRacers.every((r) => r.finished);

  return {
    tick: nextTick,
    racers: nextRacers,
    finishOrder,
    isComplete,
    activeEvents,
  };
}
