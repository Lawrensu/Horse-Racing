import { Screen } from './game-state.ts';

// Allowed transitions between screens
const TRANSITIONS: Record<Screen, Screen[]> = {
  [Screen.Lobby]:    [Screen.PreRace],
  [Screen.PreRace]:  [Screen.Race],
  [Screen.Race]:     [Screen.Results],
  [Screen.Results]:  [Screen.PreRace, Screen.Victory, Screen.GameOver],
  [Screen.Victory]:  [Screen.Lobby],
  [Screen.GameOver]: [Screen.Lobby],
};

type EnterHandler = (from: Screen, to: Screen) => void;

export class StateMachine {
  private _current: Screen = Screen.Lobby;
  private handlers: Map<Screen, EnterHandler[]> = new Map();

  get current(): Screen {
    return this._current;
  }

  /** Register a handler to be called whenever `screen` is entered. */
  onEnter(screen: Screen, handler: EnterHandler): void {
    const list = this.handlers.get(screen);
    if (list) {
      list.push(handler);
    } else {
      this.handlers.set(screen, [handler]);
    }
  }

  /** Attempt to transition to `next`. Throws if the transition is not allowed. */
  transition(next: Screen): void {
    const allowed = TRANSITIONS[this._current];
    if (!allowed.includes(next)) {
      throw new Error(
        `Invalid transition: ${this._current} → ${next}. ` +
        `Allowed: ${allowed.join(', ') || '(none)'}`
      );
    }

    const from = this._current;
    this._current = next;

    const list = this.handlers.get(next);
    if (list) {
      for (const handler of list) {
        handler(from, next);
      }
    }
  }
}
