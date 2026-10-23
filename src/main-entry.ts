/**
 * main-entry.ts
 * ─────────────
 * Top-level bootstrapper for Steel Ball Run.
 *
 * Responsibilities:
 *  - Import global CSS.
 *  - Create the singleton StateMachine, AsciiRenderer, and a placeholder GameLoop.
 *  - Build the shared GameContext that every screen module reads and mutates.
 *  - Register FSM onEnter handlers so each screen renders automatically on
 *    state transitions.
 *  - Kick off the initial lobby render (the FSM starts at Lobby, so no
 *    transition fires on startup — we call renderLobby directly).
 *
 * NOTE — GameLoop lifecycle:
 *  The GameLoop constructor requires fixed onTick / onRender callbacks, so
 *  it cannot be shared across screens without re-creation.  screen-race.ts
 *  is responsible for:
 *    1. Creating a new GameLoop(12, onTick, onRender) when the race starts.
 *    2. Assigning it to ctx.loop.
 *    3. Calling ctx.loop.start().
 *    4. Calling ctx.loop.stop() when leaving the race screen.
 *  The placeholder assigned here keeps ctx.loop non-null so all screens can
 *  safely call ctx.loop.stop() without a null-check.
 */

// ── Global styles ────────────────────────────────────────────────────────────
import './styles/main-base.css';
import './styles/layout-app.css';
import './styles/screen-lobby.css';
import './styles/screen-prerace.css';
import './styles/screen-race.css';
import './styles/screen-results.css';

// ── Game modules ─────────────────────────────────────────────────────────────
import { Screen, STARTING_BANKROLL } from './game-state.ts';
import type { BankrollState } from './game-state.ts';
import { StateMachine } from './fsm-game.ts';
import { GameLoop } from './loop-game.ts';
import { AsciiRenderer } from './renderer-ascii.ts';

// ── Screen renderers ─────────────────────────────────────────────────────────
import { renderLobby, updateHUD } from './screen-lobby.ts';
import type { GameContext } from './screen-lobby.ts';
import { renderPreRace } from './screen-prerace.ts';
import { renderRace } from './screen-race.ts';
import { renderResults } from './screen-results.ts';
import { renderVictory } from './screen-victory.ts';
import { renderGameOver } from './screen-gameover.ts';

// ─── Singleton instances ─────────────────────────────────────────────────────

const fsm      = new StateMachine();
const renderer = new AsciiRenderer();

/**
 * Placeholder loop — never started.
 * screen-race.ts replaces ctx.loop with a real GameLoop before calling start().
 */
const placeholderLoop = new GameLoop(12, () => {}, () => {});

// ─── Initial bankroll ────────────────────────────────────────────────────────

const initialBankroll: BankrollState = {
  balance:    STARTING_BANKROLL,
  betAmount:  0,
  betRacerId: null,
  won:        null,
  payout:     0,
};

// ─── Shared context ──────────────────────────────────────────────────────────

/**
 * ctx is the single source of truth passed to every screen function.
 * Screens read from it, mutate it, and hand it back to the next screen
 * via FSM transitions.
 */
const ctx: GameContext = {
  fsm,
  tournament:       null,
  bankroll:         initialBankroll,
  raceState:        null,
  loop:             placeholderLoop,
  renderer,
  selectedRacerId:  null,
  pickedRacerId:    null,
};

// ─── FSM onEnter handlers ────────────────────────────────────────────────────

/**
 * Each handler fires whenever the FSM enters the corresponding screen.
 * The handler is responsible for rendering the screen and wiring its events.
 */

/**
 * Screens are injected with the `.screen-fade` class (opacity 0). The results,
 * victory and game-over renderers never add `.visible`, which left them blank,
 * so fade them in here.
 */
function fadeInScreen(): void {
  setTimeout(() => {
    document.querySelector<HTMLElement>('.screen-fade')?.classList.add('visible');
  }, 50);
}

fsm.onEnter(Screen.Lobby, () => {
  renderLobby(ctx);
  updateHUD(ctx);
});

fsm.onEnter(Screen.PreRace, () => {
  updateHUD(ctx);
  renderPreRace(ctx);
});

fsm.onEnter(Screen.Race, () => {
  // screen-race.ts creates a new GameLoop, assigns ctx.loop, and starts it.
  renderRace(ctx);
});

fsm.onEnter(Screen.Results, () => {
  renderResults(ctx);
  fadeInScreen();
});

fsm.onEnter(Screen.Victory, () => {
  renderVictory(ctx);
  fadeInScreen();
});

fsm.onEnter(Screen.GameOver, () => {
  renderGameOver(ctx);
  fadeInScreen();
});

// ─── Background music ────────────────────────────────────────────────────────
//
// Browsers block audio autoplay until the user interacts with the page.
// We attempt to play on the first click/keypress and then leave it looping.
// Drop steer-barr-run.mp3 into the public/ folder and it will be served at /steer-barr-run.mp3.

const bgm = new Audio('/steer-barr-run.mp3');
bgm.loop   = true;
bgm.volume = 0.45;

let bgmStarted = false;

function tryStartBgm(): void {
  if (bgmStarted) return;
  bgmStarted = true;
  bgm.play().catch(() => {
    // Autoplay still blocked — silently ignore; user can interact again.
    bgmStarted = false;
  });
}

document.addEventListener('click',   tryStartBgm, { once: false });
document.addEventListener('keydown',  tryStartBgm, { once: false });

// ─── Bootstrap ───────────────────────────────────────────────────────────────

/**
 * The FSM initialises at Screen.Lobby but no transition fires on load,
 * so we render the lobby manually to paint the initial UI.
 */
renderLobby(ctx);
updateHUD(ctx);
