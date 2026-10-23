import type { TournamentRacer } from './game-state.ts';
import { Screen, MIN_BETS } from './game-state.ts';
import type { GameContext } from './screen-lobby.ts';
import { getActiveRacers, computeOdds } from './tournament-engine.ts';
import { buildStatBar } from './renderer-ascii.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a single racer card's HTML string. */
function buildRacerCard(
  racer: TournamentRacer,
  isEliminated: boolean,
  isSelected: boolean
): string {
  const eliminatedClass = isEliminated ? ' eliminated' : '';
  const selectedClass = isSelected ? ' selected' : '';
  const tierLower = racer.tier.toLowerCase();

  // Stat bars rendered as inline width-percentage style divs
  const spdBar = buildStatBar(racer.stats.speed, 10);
  const staBar = buildStatBar(racer.stats.stamina, 10);
  const lckBar = buildStatBar(racer.stats.luck, 10);

  return `
<div class="racer-card${eliminatedClass}${selectedClass}" data-racer-id="${racer.id}">
  <div class="card-header">
    <span class="card-sprite">${racer.sprite}</span>
    <div class="card-name-block">
      <span class="card-name">${racer.name}</span>
      <span class="card-tier-badge tier-${tierLower}">${racer.tier}</span>
    </div>
  </div>
  <div class="card-stats">
    <div class="stat-row">
      <span class="stat-label">SPD</span>
      <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${racer.stats.speed}%"></div></div>
      <span class="stat-value">${racer.stats.speed}</span>
      <span class="stat-ascii">${spdBar}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">STA</span>
      <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${racer.stats.stamina}%"></div></div>
      <span class="stat-value">${racer.stats.stamina}</span>
      <span class="stat-ascii">${staBar}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">LCK</span>
      <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${racer.stats.luck}%"></div></div>
      <span class="stat-value">${racer.stats.luck}</span>
      <span class="stat-ascii">${lckBar}</span>
    </div>
  </div>
  <div class="card-stand">
    <div class="card-stand-label">STAND</div>
    ${racer.stand.name}
  </div>
</div>`.trim();
}

/** Build the odds board rows. */
function buildOddsRows(
  racers: TournamentRacer[],
  oddsMap: Map<string, number>
): string {
  return racers
    .map((racer) => {
      const pct = oddsMap.get(racer.id) ?? 0;
      return `
<div class="odds-row">
  <span class="odds-sprite">${racer.sprite}</span>
  <span class="odds-name">${racer.shortName}</span>
  <span class="odds-pct">${pct.toFixed(1)}%</span>
</div>`.trim();
    })
    .join('\n');
}

/** Build the round progress dots (4 steps). */
function buildProgressDots(currentRound: number): string {
  const dots = [1, 2, 3, 4].map((n) => {
    const cls = n === currentRound ? 'progress-dot active' : 'progress-dot';
    const label = n === 4 ? 'F' : String(n);
    return `<span class="${cls}" title="Round ${n}">${label}</span>`;
  });
  return `<div class="round-progress">${dots.join('')}</div>`;
}

// ---------------------------------------------------------------------------
// renderPreRace
// ---------------------------------------------------------------------------

export function renderPreRace(ctx: GameContext): void {
  const app = document.getElementById('app');
  if (!app) return;

  const tournament = ctx.tournament!;
  const activeRacers = getActiveRacers(tournament);
  const oddsMap = computeOdds(activeRacers);
  const minBet = MIN_BETS[tournament.round] ?? 100;
  const balance = ctx.bankroll.balance;
  const roundLabel = tournament.isFinals ? 'FINALS' : `ROUND ${tournament.round}`;
  const finalsSuffix = tournament.isFinals ? ' · FINALS' : '';

  // Build racer cards (all tournament racers so eliminated ones show as greyed out)
  const allRacers = tournament.racers;
  const cardsHtml = allRacers
    .map((racer) =>
      buildRacerCard(
        racer,
        racer.status === 'eliminated',
        racer.id === ctx.selectedRacerId
      )
    )
    .join('\n');

  const oddsHtml = buildOddsRows(activeRacers, oddsMap);
  const progressHtml = buildProgressDots(tournament.round);

  app.innerHTML = `
<div class="screen screen-fade" id="screen-prerace">
  <div class="prerace-header">
    ${progressHtml}
    <span class="prerace-round-badge">${roundLabel}</span>
  </div>
  <div class="prerace-layout">
    <div class="prerace-left-panel">
      <div class="section-title">SELECT YOUR RACER — ROUND ${tournament.round}${finalsSuffix}</div>
      <div class="racer-cards-grid" id="racer-cards-grid">
        ${cardsHtml}
      </div>
    </div>
    <div class="prerace-right-panel">
      <div class="section-title">WIN ODDS</div>
      <div class="odds-list" id="odds-list">${oddsHtml}</div>
      <div class="divider"></div>
      <div class="section-title">PLACE YOUR BET</div>
      <div class="bet-section">
        <div class="bet-row">
          <span class="bet-label">AMOUNT</span>
          <input
            type="number"
            class="bet-input"
            id="bet-amount-input"
            placeholder="${minBet}"
            min="${minBet}"
            max="${balance}"
          />
        </div>
        <div class="bet-min-note">Min bet: $${minBet} · Balance: $${balance}</div>
        <div class="bet-error" id="bet-error"></div>
        <div class="bet-action-row">
          <button class="btn-primary" id="btn-place-bet">PLACE BET &amp; RACE</button>
        </div>
      </div>
    </div>
  </div>
</div>`.trim();

  // Fade in
  setTimeout(() => {
    const screen = document.querySelector<HTMLElement>('.screen-fade');
    if (screen) screen.classList.add('visible');
  }, 50);

  // ── Card selection ──────────────────────────────────────────────────────────
  const grid = document.getElementById('racer-cards-grid');
  grid?.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.racer-card');
    if (!card) return;

    // Ignore clicks on eliminated cards
    if (card.classList.contains('eliminated')) return;

    const racerId = card.dataset.racerId ?? null;
    ctx.selectedRacerId = racerId;

    // Update selected styling across all cards
    grid.querySelectorAll('.racer-card').forEach((el) =>
      el.classList.remove('selected')
    );
    card.classList.add('selected');
  });

  // ── Place bet button ────────────────────────────────────────────────────────
  const betBtn = document.getElementById('btn-place-bet');
  const errorEl = document.getElementById('bet-error');

  betBtn?.addEventListener('click', () => {
    const input = document.getElementById('bet-amount-input') as HTMLInputElement | null;
    const rawAmount = input ? parseFloat(input.value) : NaN;

    // Validation
    if (!ctx.selectedRacerId) {
      if (errorEl) errorEl.textContent = 'Please select a racer first.';
      return;
    }

    if (isNaN(rawAmount) || rawAmount < minBet) {
      if (errorEl) errorEl.textContent = `Minimum bet is $${minBet}.`;
      return;
    }

    if (rawAmount > balance) {
      if (errorEl) errorEl.textContent = `You only have $${balance}.`;
      return;
    }

    // Clear any previous error
    if (errorEl) errorEl.textContent = '';

    // Commit the bet
    ctx.bankroll.betAmount = rawAmount;
    ctx.bankroll.betRacerId = ctx.selectedRacerId;
    ctx.pickedRacerId = ctx.selectedRacerId;

    ctx.fsm.transition(Screen.Race);
  });
}
