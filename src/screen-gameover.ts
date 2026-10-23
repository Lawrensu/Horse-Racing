import type { GameContext } from './screen-lobby.ts';
import { Screen, STARTING_BANKROLL } from './game-state.ts';

// ─── Game Over ASCII art ─────────────────────────────────────────────────────

const GAMEOVER_ART = `
  ___   __   _  _  ____     __  _  _  ____  ____ 
 / __) / _\\ ( \\/ )(  __)   /  \\( \\/ )(  __)(  _ \\
( (_ \\(  O )/ \\/ \\ ) _)   (  O ))  /  ) _)  )   /
 \\___/ \\__/ \\_)(_/(____)   \\__/(__/  (____)(__\\_)
`.trimStart();

// ─── Main render ─────────────────────────────────────────────────────────────

/**
 * Renders the game-over screen shown when the player's bankroll falls below
 * the minimum required bet for the next round.
 *
 * Displays:
 *  - Game Over ASCII banner.
 *  - Final balance, rounds survived, net loss.
 *  - "TRY AGAIN" button that resets state and returns to the lobby.
 */
export function renderGameOver(ctx: GameContext): void {
  const balance = ctx.bankroll.balance;
  // round is still the round that just finished (advanceRound already ran).
  // History length === number of completed rounds.
  const roundsSurvived = ctx.tournament?.history.length ?? 0;
  const netLoss = balance - STARTING_BANKROLL;   // will be negative
  const netLossDisplay = netLoss <= 0
    ? `$${Math.abs(netLoss)}`
    : `+$${netLoss}`; // edge-case: somehow positive

  const app = document.querySelector<HTMLElement>('#app')!;
  app.innerHTML = `
    <div class="screen gameover-container screen-fade" id="screen-gameover">
      <pre class="gameover-ascii">${GAMEOVER_ART}</pre>
      <div class="end-subtitle">YOU WENT BROKE</div>

      <div class="final-stats">
        <div class="final-stat-row">
          <span class="final-stat-label">FINAL BALANCE</span>
          <span class="final-stat-value text-danger">$${balance}</span>
        </div>
        <div class="final-stat-row">
          <span class="final-stat-label">ROUNDS SURVIVED</span>
          <span class="final-stat-value">${roundsSurvived} / 4</span>
        </div>
        <div class="final-stat-row">
          <span class="final-stat-label">NET LOSS</span>
          <span class="final-stat-value text-danger">${netLossDisplay}</span>
        </div>
      </div>

      <div class="results-action-row">
        <button class="btn-primary" id="btn-play-again-gameover">TRY AGAIN</button>
      </div>
    </div>
  `;

  // ── Wire "TRY AGAIN" ────────────────────────────────────────────────────────
  document.getElementById('btn-play-again-gameover')!
    .addEventListener('click', () => {
      // Reset bankroll to starting amount; clear all transient state.
      ctx.bankroll.balance    = STARTING_BANKROLL;
      ctx.bankroll.betAmount  = 0;
      ctx.bankroll.betRacerId = null;
      ctx.bankroll.won        = null;
      ctx.bankroll.payout     = 0;

      ctx.tournament       = null;
      ctx.raceState        = null;
      ctx.selectedRacerId  = null;
      ctx.pickedRacerId    = null;

      ctx.fsm.transition(Screen.Lobby);
    });
}
