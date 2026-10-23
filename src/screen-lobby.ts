import type { TournamentState, BankrollState, RaceState } from './game-state.ts';
import { Screen } from './game-state.ts';
import type { StateMachine } from './fsm-game.ts';
import { randomizeRoster, BASE_CHARACTERS } from './characters-roster.ts';
import { initTournament } from './tournament-engine.ts';
import type { GameLoop } from './loop-game.ts';
import type { AsciiRenderer } from './renderer-ascii.ts';

// ---------------------------------------------------------------------------
// Shared context — imported by all screen modules
// ---------------------------------------------------------------------------

export interface GameContext {
  fsm: StateMachine;
  tournament: TournamentState | null;
  bankroll: BankrollState;
  raceState: RaceState | null;
  loop: GameLoop;
  renderer: AsciiRenderer;
  selectedRacerId: string | null;
  pickedRacerId: string | null; // the racer the player bet on this round
}

// ---------------------------------------------------------------------------
// ASCII title art
// ---------------------------------------------------------------------------

const TITLE_ART = ` ___  ____  ____  ____  __       ____   __   __    __       ____  _  _  _  _ 
/ __)(_  _)(  __)(  __)(  )     (  _ \\ / _\\ (  )  (  )     (  _ \\/ )( \\( \\( )
\\__ \\  )(   ) _)  ) _)  )(      ) _ ((  O ) / (_/\\ / (_/\\    )   /) \\/ ( ) ( 
(___/ (__) (____)(____)(__)     (____/ \\__/  \\____/ \\____/   (__\\_)\\____/(_)\\_)`;

// ---------------------------------------------------------------------------
// renderLobby
// ---------------------------------------------------------------------------

export function renderLobby(ctx: GameContext): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
<div class="screen lobby-container screen-fade" id="screen-lobby">
  <pre class="lobby-ascii-title">${TITLE_ART}</pre>
  <div class="lobby-subtitle">THE STEEL BALL RUN</div>
  <div class="lobby-divider"></div>
  <div class="lobby-bankroll-label">STARTING BANKROLL</div>
  <div class="lobby-bankroll-value">$${ctx.bankroll.balance}</div>
  <div class="lobby-start-area">
    <button class="btn-primary" id="btn-start-tournament">START TOURNAMENT</button>
    <div class="lobby-round-info">Round 1 of 4 · Min Bet $100 · 10 Racers</div>
  </div>
  <div class="lobby-credits">
    Inspired by JoJo's Bizarre Adventure Part 7: Steel Ball Run<br>
    An ASCII Horse Racing Experience
  </div>
</div>`;

  // Fade in after a brief paint delay
  setTimeout(() => {
    const screen = document.querySelector<HTMLElement>('.screen-fade');
    if (screen) screen.classList.add('visible');
  }, 50);

  // Wire up the start button
  const btn = document.getElementById('btn-start-tournament');
  btn?.addEventListener('click', () => {
    const roster = randomizeRoster(BASE_CHARACTERS);
    const tournament = initTournament(roster);
    ctx.tournament = tournament;

    // Reset bankroll bet state for the new tournament
    ctx.bankroll.betAmount = 0;
    ctx.bankroll.betRacerId = null;
    ctx.bankroll.won = null;

    ctx.fsm.transition(Screen.PreRace);
  });
}

// ---------------------------------------------------------------------------
// updateHUD
// ---------------------------------------------------------------------------

export function updateHUD(ctx: GameContext): void {
  const hudEl = document.getElementById('hud');
  const bankrollEl = document.getElementById('hud-bankroll-num');
  const roundEl = document.getElementById('hud-round-num');

  if (bankrollEl) {
    bankrollEl.textContent = String(ctx.bankroll.balance);
  }

  if (roundEl) {
    roundEl.textContent = String(ctx.tournament ? ctx.tournament.round : 1);
  }

  // Reveal the HUD once a tournament is in progress
  if (hudEl && ctx.tournament) {
    hudEl.classList.remove('hidden');
  }
}
