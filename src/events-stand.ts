import type { RaceState, RaceRacer, StandEvent } from './game-state.ts';

const MAX_ACTIVE_EVENTS = 3;
const EVENT_TICKS = 4;

function addEvent(events: StandEvent[], text: string): StandEvent[] {
  const next = [...events, { text, ticksRemaining: EVENT_TICKS }];
  return next.length > MAX_ACTIVE_EVENTS ? next.slice(next.length - MAX_ACTIVE_EVENTS) : next;
}

/** Returns the racer with the highest position, optionally excluding one id. */
function getLeader(racers: RaceRacer[], excludeId?: string): RaceRacer | null {
  let leader: RaceRacer | null = null;
  for (const r of racers) {
    if (r.finished) continue;
    if (excludeId && r.id === excludeId) continue;
    if (!leader || r.position > leader.position) leader = r;
  }
  return leader;
}

export function applyStandEvents(state: RaceState): RaceState {
  let racers = state.racers.map((r) => ({ ...r }));
  let activeEvents = [...state.activeEvents];

  for (let i = 0; i < racers.length; i++) {
    const racer = racers[i];
    if (racer.finished) continue;
    if (Math.random() >= racer.stand.activationChance) continue;

    // Stand fired — apply effect based on id
    switch (racer.id) {
      case 'johnny': {
        // Lock the current leader (not johnny) for 3 ticks
        const leader = getLeader(racers, 'johnny');
        if (leader) {
          const idx = racers.findIndex((r) => r.id === leader.id);
          if (idx !== -1) racers[idx] = { ...racers[idx], lockedTicks: 3 };
        }
        activeEvents = addEvent(activeEvents, racer.stand.flavorText);
        break;
      }

      case 'gyro': {
        racers[i] = { ...racers[i], speedMultiplier: 2.5 };
        activeEvents = addEvent(activeEvents, racer.stand.flavorText);
        break;
      }

      case 'valentine': {
        const newPos = Math.min(99, racer.position + 12);
        racers[i] = { ...racers[i], position: newPos };
        activeEvents = addEvent(activeEvents, racer.stand.flavorText);
        break;
      }

      case 'diego': {
        // Only apply once — if already immune, skip
        if (racer.staminaImmune) break;
        racers[i] = { ...racers[i], staminaImmune: true };
        activeEvents = addEvent(activeEvents, racer.stand.flavorText);
        break;
      }

      case 'hotpants': {
        const newStamina = Math.min(100, racer.stats.stamina + 15);
        racers[i] = {
          ...racers[i],
          stats: { ...racers[i].stats, stamina: newStamina },
        };
        activeEvents = addEvent(activeEvents, racer.stand.flavorText);
        break;
      }

      case 'wekapipo': {
        // Slow the current leader this tick
        const leader = getLeader(racers, undefined);
        if (leader) {
          const idx = racers.findIndex((r) => r.id === leader.id);
          if (idx !== -1) racers[idx] = { ...racers[idx], speedMultiplier: 0.3 };
        }
        activeEvents = addEvent(activeEvents, racer.stand.flavorText);
        break;
      }

      case 'magent': {
        // Invulnerability surge — speed boost this tick
        racers[i] = { ...racers[i], speedMultiplier: 1.5 };
        activeEvents = addEvent(activeEvents, racer.stand.flavorText);
        break;
      }

      case 'pocoloco': {
        // Only triggers in first 30 ticks
        if (state.tick >= 30) break;
        racers[i] = { ...racers[i], speedMultiplier: 3.0 };
        activeEvents = addEvent(activeEvents, racer.stand.flavorText);
        break;
      }

      case 'tim': {
        racers[i] = { ...racers[i], speedMultiplier: 1.8 };
        activeEvents = addEvent(activeEvents, racer.stand.flavorText);
        break;
      }

      case 'sandman': {
        racers[i] = { ...racers[i], staminaImmune: true };
        activeEvents = addEvent(activeEvents, racer.stand.flavorText);
        break;
      }
    }
  }

  return { ...state, racers, activeEvents };
}
