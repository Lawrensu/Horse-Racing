import { Screen } from './game-state.ts';
import type { GameContext } from './screen-lobby.ts';
import { getActiveRacers } from './tournament-engine.ts';
import { initRace, tickRace } from './race-engine.ts';
import { GameLoop } from './loop-game.ts';
import { applyStandEvents } from './events-stand.ts';
import { DEFAULT_COLS } from './renderer-ascii.ts';

const RACE_TICK_RATE = 10; // ticks per second — slightly slower for readability

/** How many monospace characters fit across `el`'s content box. */
function measureCols(el: HTMLElement): number {
  const style = getComputedStyle(el);
  const g = document.createElement('canvas').getContext('2d');
  if (!g) return DEFAULT_COLS;
  g.font = `${style.fontSize} ${style.fontFamily}`;
  const charW = g.measureText('0').width;
  const inner = el.clientWidth
    - parseFloat(style.paddingLeft)
    - parseFloat(style.paddingRight);
  return charW > 0 ? Math.floor(inner / charW) : DEFAULT_COLS;
}

export function renderRace(ctx: GameContext): void {
  const app = document.getElementById('app');
  if (!app) return;

  const tournament   = ctx.tournament!;
  const activeRacers = getActiveRacers(tournament);

  ctx.raceState      = initRace(activeRacers);
  ctx.selectedRacerId = null;

  const pickedId    = ctx.pickedRacerId;
  const pickedRacer = pickedId ? activeRacers.find(r => r.id === pickedId) ?? null : null;
  const betAmount   = ctx.bankroll.betAmount;

  // ── Inject full-screen layout ───────────────────────────────────────────────
  //
  // Structure:
  //   .race-fullscreen
  //     .race-canvas-area          ← fills the space above the stats bar
  //       pre#race-canvas          ← animated ASCII race
  //     .race-pick-banner          ← thin "your pick" strip
  //     .race-stats-bar            ← Undertale-style bottom panel
  //       pre#stats-bar-canvas
  //
  app.innerHTML = `
<div class="race-fullscreen screen-fade" id="screen-race">
  <div class="race-canvas-area">
    <pre id="race-canvas">Loading race...</pre>
  </div>
  <div class="race-pick-banner">
    ${pickedRacer
      ? `★ YOUR PICK &nbsp; ${pickedRacer.sprite} ${pickedRacer.name} &nbsp;|&nbsp; BET $${betAmount}`
      : 'No pick placed'}
  </div>
  <div class="race-stats-bar">
    <pre id="stats-bar-canvas"></pre>
  </div>
</div>`.trim();

  // Fade in
  setTimeout(() => {
    document.querySelector<HTMLElement>('.screen-fade')?.classList.add('visible');
  }, 50);

  const raceCanvas    = document.getElementById('race-canvas')!;
  const statsBarCanvas = document.getElementById('stats-bar-canvas')!;

  // Fit both ASCII panels to the full width of the screen, and keep them
  // fitted when the window is resized (the listener drops itself once the
  // race screen has been replaced).
  let raceCols  = measureCols(raceCanvas);
  let statsCols = measureCols(statsBarCanvas);
  const onResize = () => {
    if (!raceCanvas.isConnected) {
      window.removeEventListener('resize', onResize);
      return;
    }
    raceCols  = measureCols(raceCanvas);
    statsCols = measureCols(statsBarCanvas);
  };
  window.addEventListener('resize', onResize);

  // ── Stop any running loop ───────────────────────────────────────────────────
  if (ctx.loop.running) ctx.loop.stop();

  // Flag set in onTick when race finishes; transition fires in onRender
  // AFTER the final frame has been painted, so DOM is never written post-swap.
  let raceFinished = false;

  // ── Build game loop ─────────────────────────────────────────────────────────
  const newLoop = new GameLoop(
    RACE_TICK_RATE,

    // onTick — game logic only, no DOM access
    () => {
      if (!ctx.raceState || raceFinished) return;
      ctx.raceState = tickRace(ctx.raceState);
      ctx.raceState = applyStandEvents(ctx.raceState);

      if (ctx.raceState.isComplete) {
        raceFinished = true;
      }
    },

    // onRender — DOM writes, then transition once race is done
    () => {
      if (!ctx.raceState) return;

      // Always paint the final frame before transitioning
      raceCanvas.textContent = ctx.renderer.buildRaceFrame(
        ctx.raceState,
        tournament.round,
        tournament.isFinals,
        pickedId,
        raceCols,
      );

      statsBarCanvas.textContent = ctx.renderer.buildStatsBar(
        ctx.raceState,
        pickedId,
        statsCols,
      );

      // Transition only after the final frame is painted
      if (raceFinished) {
        newLoop.stop();
        ctx.loop = newLoop;
        // Small delay so the player sees the finished state for a moment
        setTimeout(() => {
          ctx.fsm.transition(Screen.Results);
        }, 1200);
      }
    },
  );

  ctx.loop = newLoop;
  newLoop.start();
}
