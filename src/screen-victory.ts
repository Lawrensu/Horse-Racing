import type { GameContext } from './screen-lobby.ts';
import { Screen, STARTING_BANKROLL } from './game-state.ts';

// ─── Victory ASCII art ───────────────────────────────────────────────────────

const VICTORY_ART = `
 _  _  __  ___  ____  __  ____  _  _ 
( \\/ )(  )/ __)(_  _)/  \\(  _ \\( \\/ )
 \\  /  )( ( (__  )(  )(__))   / \\  / 
  \\/  (__) \\___)(__)  (__)(__)  \\/  
`.trimStart();

// ─── Main render ─────────────────────────────────────────────────────────────

/**
 * Renders the victory screen shown when the player survives all four rounds.
 *
 * Displays:
 *  - Victory ASCII banner.
 *  - Final balance, starting balance, net profit, rounds survived.
 *  - Tournament winner name and sprite.
 *  - "PLAY AGAIN" button that resets state and returns to the lobby.
 */
export function renderVictory(ctx: GameContext): void {
  const balance  = ctx.bankroll.balance;
  const profit   = balance - STARTING_BANKROLL;
  const profitSign  = profit >= 0 ? '+' : '';
  const profitClass = profit >= 0 ? 'text-green' : 'text-danger';

  // Tournament winner — look up in the final tournament state.
  const tournament = ctx.tournament;
  const winnerId   = tournament?.winner ?? null;
  const winnerRacer = tournament?.racers.find((r) => r.id === winnerId) ?? null;
  const winnerDisplay = winnerRacer
    ? `${winnerRacer.sprite} ${winnerRacer.name}`
    : '—';

  const app = document.querySelector<HTMLElement>('#app')!;
  app.innerHTML = `
    <div class="screen victory-container screen-fade" id="screen-victory">
      <pre class="victory-ascii">${VICTORY_ART}</pre>
      <div class="end-subtitle">TOURNAMENT CHAMPION</div>

      <div class="final-stats">
        <div class="final-stat-row">
          <span class="final-stat-label">FINAL BALANCE</span>
          <span class="final-stat-value text-green">$${balance}</span>
        </div>
        <div class="final-stat-row">
          <span class="final-stat-label">STARTING BALANCE</span>
          <span class="final-stat-value">$${STARTING_BANKROLL}</span>
        </div>
        <div class="final-stat-row">
          <span class="final-stat-label">NET PROFIT</span>
          <span class="final-stat-value ${profitClass}">${profitSign}${profit}</span>
        </div>
        <div class="final-stat-row">
          <span class="final-stat-label">ROUNDS SURVIVED</span>
          <span class="final-stat-value">4 / 4</span>
        </div>
        <div class="final-stat-row">
          <span class="final-stat-label">TOURNAMENT WINNER</span>
          <span class="final-stat-value text-gold">${winnerDisplay}</span>
        </div>
      </div>

      <div class="results-action-row">
        <button class="btn-primary" id="btn-play-again-victory">PLAY AGAIN</button>
      </div>
    </div>
  `;

  // ── Wire "PLAY AGAIN" ───────────────────────────────────────────────────────
  document.getElementById('btn-play-again-victory')!
    .addEventListener('click', () => {
      // Reset bankroll to starting amount; clear all transient state.
      ctx.bankroll.balance   = STARTING_BANKROLL;
      ctx.bankroll.betAmount = 0;
      ctx.bankroll.betRacerId = null;
      ctx.bankroll.won       = null;
      ctx.bankroll.payout    = 0;

      ctx.tournament       = null;
      ctx.raceState        = null;
      ctx.selectedRacerId  = null;
      ctx.pickedRacerId    = null;

      ctx.fsm.transition(Screen.Lobby);
    });
}
