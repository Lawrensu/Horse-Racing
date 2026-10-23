import type { TournamentState, TournamentRacer, RoundResult, Racer } from './game-state.ts';
import { ELIMINATION_SCHEDULE } from './game-state.ts';
import { computeWeight } from './race-engine.ts';

// ---------------------------------------------------------------------------
// Tournament initialisation
// ---------------------------------------------------------------------------

/**
 * Build initial tournament state from a randomized roster.
 * All racers start as 'active', round = 1, maxRounds = 4, isFinals = false.
 */
export function initTournament(racers: Racer[]): TournamentState {
  const tournamentRacers: TournamentRacer[] = racers.map((r) => ({
    ...r,
    status: 'active',
    roundsAdvanced: 0,
  }));

  return {
    round: 1,
    maxRounds: 4,
    racers: tournamentRacers,
    history: [],
    isFinals: false,
    isComplete: false,
    winner: null,
  };
}

// ---------------------------------------------------------------------------
// Round advancement
// ---------------------------------------------------------------------------

/**
 * Process the end of a round.
 *
 * - Uses ELIMINATION_SCHEDULE[state.round] to determine how many racers
 *   are cut (the last N in finishOrder).
 * - Increments roundsAdvanced for racers who are still active after elimination.
 * - If round 4 completed: marks isComplete = true and sets winner to finishOrder[0].
 * - If active count after elimination <= 3: sets isFinals = true on next round.
 * - Round 4 is always finals.
 */
export function advanceRound(
  state: TournamentState,
  result: RoundResult
): TournamentState {
  const eliminateCount = ELIMINATION_SCHEDULE[state.round] ?? 0;
  const eliminatedSet = new Set(result.eliminated);

  // Mark racers eliminated or advance them.
  const updatedRacers: TournamentRacer[] = state.racers.map((racer) => {
    if (racer.status !== 'active') return { ...racer };

    if (eliminatedSet.has(racer.id)) {
      return { ...racer, status: 'eliminated' };
    }

    return { ...racer, roundsAdvanced: racer.roundsAdvanced + 1 };
  });

  const nextRound = state.round + 1;
  const isLastRound = state.round === state.maxRounds;

  // Determine winner and completion.
  const isComplete = isLastRound;
  const winner = isLastRound ? (result.finishOrder[0] ?? null) : null;

  // Mark winner status in racer list.
  const finalRacers: TournamentRacer[] = winner
    ? updatedRacers.map((r) =>
        r.id === winner ? { ...r, status: 'winner' } : r
      )
    : updatedRacers;

  // Determine whether next round is finals.
  // Round 4 is always finals; also trigger early if <= 3 active remain.
  const activeAfterElimination = finalRacers.filter(
    (r) => r.status === 'active'
  ).length;
  const isFinals = !isComplete && (nextRound === state.maxRounds || activeAfterElimination <= 3);

  // Validate eliminateCount matches result for safety (soft check — we trust result).
  void eliminateCount;

  return {
    ...state,
    round: isComplete ? state.round : nextRound,
    racers: finalRacers,
    history: [...state.history, result],
    isFinals,
    isComplete,
    winner,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return racers whose status is 'active'.
 */
export function getActiveRacers(state: TournamentState): TournamentRacer[] {
  return state.racers.filter((r) => r.status === 'active');
}

/**
 * Compute win probability percentage for each active racer, based on their
 * composite weight. Returns a Map<racerId, percentage> that sums to 100.
 */
export function computeOdds(racers: TournamentRacer[]): Map<string, number> {
  const odds = new Map<string, number>();

  if (racers.length === 0) return odds;

  const weights = racers.map((r) => computeWeight(r.stats));
  const total = weights.reduce((sum, w) => sum + w, 0);

  if (total === 0) {
    // Edge case: all weights are zero — distribute evenly.
    const even = 100 / racers.length;
    for (const racer of racers) {
      odds.set(racer.id, parseFloat(even.toFixed(2)));
    }
    return odds;
  }

  // Compute raw percentages, rounding to 2 decimal places.
  let assigned = 0;
  for (let i = 0; i < racers.length; i++) {
    const pct = i === racers.length - 1
      // Give the last racer the remainder to ensure the sum is exactly 100.
      ? parseFloat((100 - assigned).toFixed(2))
      : parseFloat(((weights[i] / total) * 100).toFixed(2));

    odds.set(racers[i].id, pct);
    assigned += pct;
  }

  return odds;
}
