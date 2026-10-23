import type { GameContext } from './screen-lobby.ts';
import type { RoundResult } from './game-state.ts';
import { Screen, ELIMINATION_SCHEDULE, MIN_BETS } from './game-state.ts';
import { advanceRound, getActiveRacers, computeOdds } from './tournament-engine.ts';
import { updateHUD } from './screen-lobby.ts';

// ─── Main render ─────────────────────────────────────────────────────────────

/**
 * Renders the post-race results screen.
 *
 * Responsibilities:
 *  - Shows the podium for top 3 finishers.
 *  - Shows the full finish-order list with eliminated / player-bet badges.
 *  - Computes win/loss payout and updates bankroll.
 *  - Calls advanceRound() to update tournament state.
 *  - Wires the action button (Next Round / Victory / Game Over).
 */
export function renderResults(ctx: GameContext): void {
  const raceState = ctx.raceState!;
  const tournament = ctx.tournament!;

  const finishOrder = raceState.finishOrder;       // racer ids, 1st → last
  const racersMap = new Map(raceState.racers.map((r) => [r.id, r]));

  // ── 1. Win / loss calculation ───────────────────────────────────────────────
  const playerWon = ctx.pickedRacerId !== null &&
    ctx.pickedRacerId === finishOrder[0];

  let payout = 0;
  if (ctx.pickedRacerId !== null) {
    if (playerWon) {
      const odds = computeOdds(getActiveRacers(tournament));
      const winOdds = odds.get(ctx.pickedRacerId) ?? 50;
      // Payout = bet × (100 / winOdds%)  — higher odds ⇒ bigger payout
      payout = Math.round(ctx.bankroll.betAmount * (100 / winOdds));
    } else {
      payout = -ctx.bankroll.betAmount;
    }
  }

  // ── 2. Update bankroll in-place ─────────────────────────────────────────────
  ctx.bankroll.balance += payout;
  ctx.bankroll.won = payout > 0;
  ctx.bankroll.payout = payout;

  // ── 3. Determine eliminated racers (bottom N of finish order) ──────────────
  const eliminateCount = ELIMINATION_SCHEDULE[tournament.round] ?? 0;
  const eliminated = finishOrder.slice(finishOrder.length - eliminateCount);
  const advanced   = finishOrder.slice(0, finishOrder.length - eliminateCount);

  // ── 4. Build RoundResult and advance the tournament ─────────────────────────
  const roundResult: RoundResult = { finishOrder, eliminated, advanced };
  ctx.tournament = advanceRound(tournament, roundResult);

  // ── 5. Refresh HUD ──────────────────────────────────────────────────────────
  updateHUD(ctx);

  // ── 6. Build HTML ───────────────────────────────────────────────────────────
  const roundLabel = tournament.round;
  const payoutSign = payout >= 0 ? '+' : '';
  const payoutClass = payout >= 0 ? 'win' : 'loss';
  const newBalance = ctx.bankroll.balance;

  // Podium (needs at least 3 finishers; pad with empty strings if fewer)
  const get = (idx: number) => racersMap.get(finishOrder[idx] ?? '');
  const first  = get(0);
  const second = get(1);
  const third  = get(2);

  const podiumBlock = (racer: typeof first, rank: string, label: string) => {
    if (!racer) return `<div class="podium-step ${rank}"><div class="podium-block">—</div><div class="podium-label">${label}</div></div>`;
    return `
      <div class="podium-step ${rank}">
        <div class="podium-block">${racer.sprite} ${racer.name}</div>
        <div class="podium-label">${label}</div>
      </div>`;
  };

  const eliminatedSet = new Set(eliminated);

  const finishRows = finishOrder.map((id, idx) => {
    const racer = racersMap.get(id);
    if (!racer) return '';
    const pos = idx + 1;
    const isPickedRacer = id === ctx.pickedRacerId;
    const isEliminated = eliminatedSet.has(id);
    const rowClass = isPickedRacer ? ' player-pick' : '';

    const eliminatedBadge = isEliminated
      ? `<span class="eliminated-tag">ELIMINATED</span>`
      : '';
    const betBadge = isPickedRacer
      ? `<span class="your-bet-tag">YOUR BET</span>`
      : '';

    return `
      <div class="finish-row${rowClass}">
        <span class="finish-pos">${pos}.</span>
        <span class="finish-sprite">${racer.sprite}</span>
        <span class="finish-name">${racer.name}</span>
        ${eliminatedBadge}${betBadge}
      </div>`;
  }).join('');

  // ── 7. Determine the action button ─────────────────────────────────────────
  // Use the already-advanced tournament state for the min-bet check.
  const nextTournament = ctx.tournament!;
  let actionLabel: string;
  let actionScreen: Screen;

  if (ctx.bankroll.balance < MIN_BETS[nextTournament.round]) {
    actionLabel  = 'GAME OVER';
    actionScreen = Screen.GameOver;
  } else if (nextTournament.isComplete) {
    actionLabel  = 'VICTORY! VIEW RESULTS';
    actionScreen = Screen.Victory;
  } else {
    actionLabel  = 'ADVANCE TO NEXT ROUND';
    actionScreen = Screen.PreRace;
  }

  // ── 8. Inject HTML ──────────────────────────────────────────────────────────
  const app = document.querySelector<HTMLElement>('#app')!;
  app.innerHTML = `
    <div class="screen results-container screen-fade" id="screen-results">
      <div class="results-title">RACE RESULTS — ROUND ${roundLabel}</div>

      <div class="bankroll-delta ${payoutClass}">${payoutSign}${payout}</div>
      <div class="bankroll-summary">Balance: $${newBalance}</div>

      <div class="podium">
        ${podiumBlock(second, 'rank-2', '2ND')}
        ${podiumBlock(first,  'rank-1', '1ST ★')}
        ${podiumBlock(third,  'rank-3', '3RD')}
      </div>

      <div class="finish-order-list" id="finish-order-list">
        ${finishRows}
      </div>

      <div class="results-action-row">
        <button class="btn-primary" id="btn-results-action">${actionLabel}</button>
      </div>
    </div>
  `;

  // ── 9. Wire action button ───────────────────────────────────────────────────
  document.getElementById('btn-results-action')!
    .addEventListener('click', () => {
      ctx.fsm.transition(actionScreen);
    });
}
