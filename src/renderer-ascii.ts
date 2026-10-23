import type { RaceState, RaceRacer } from './game-state.ts';

// ─── Layout constants ─────────────────────────────────────────────────────────

// Default frame width in characters (used when the caller doesn't measure the viewport)
export const DEFAULT_COLS = 100;
// Smallest frame width we'll draw
const MIN_COLS = 60;
// Left label column width (name tag)
const LABEL_W = 8;
// Sprite width in characters (must fit in track)
const SPRITE_W = 16;

// ─── Utilities ────────────────────────────────────────────────────────────────

/** ASCII bar  e.g. buildStatBar(70, 8) => "██████░░" */
export function buildStatBar(value: number, width = 10): string {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** Right-pad / truncate to exactly `len` chars. */
function pad(s: string, len: number): string {
  if (s.length >= len) return s.slice(0, len);
  return s + ' '.repeat(len - s.length);
}

/** Left-pad to exactly `len` chars. */
function lpad(s: string, len: number): string {
  if (s.length >= len) return s.slice(0, len);
  return ' '.repeat(len - s.length) + s;
}

/** Place `sprite` inside a field of `fieldW` spaces starting at `offset`. */
function placeInField(sprite: string, offset: number, fieldW: number): string {
  const arr = Array<string>(fieldW).fill(' ');
  for (let i = 0; i < sprite.length; i++) {
    if (offset + i < fieldW) arr[offset + i] = sprite[i];
  }
  return arr.join('');
}

// ─── Animated jockey-on-horse sprite ─────────────────────────────────────────
//
// 6 lines tall.  Two frames alternate each tick → galloping animation.
//
// The rider sits on the horse's back.  The 3-char name tag floats above.
//
//  Frame A  (legs spread — full stride)      Frame B  (legs tucked — mid-leap)
//
//    {NM}                                       {NM}
//     _o/                                        _o/
//    /|                                         /|
//   ( }==>>                                    ( }==>>
//   / \\  /\\                                   /\\/\\/\\
//  ~     ~                                    /        \\
//
// where {NM} = 3-char shortName (JNY, GYR, …)

type Sprite6 = [string, string, string, string, string, string];

function buildRunningSprite(name: string, frame: 0 | 1): Sprite6 {
  const nm = pad(name, 3);
  if (frame === 0) {
    // Legs extended – full stride
    return [
      ` ${nm}       `,   // name tag above rider head
      `  _o/       `,   // rider head + torso leaning forward
      ` /|         `,   // rider body / reins
      `( }==>      `,   // horse body + speed arrow
      `/ \\  /\\    `,  // front & back legs spread
      `~     ~     `,   // hooves touching ground
    ];
  } else {
    // Legs tucked – mid-air
    return [
      ` ${nm}       `,
      `  _o/       `,
      ` /|         `,
      `( }==>      `,
      ` /\\/\\/\\   `,   // all legs tucked up
      `/        \\  `,  // belly visible mid-leap
    ];
  }
}

function buildFinishedSprite(name: string, pos: number): Sprite6 {
  const nm   = pad(name, 3);
  const ordinals = ['1ST','2ND','3RD','4TH','5TH','6TH','7TH','8TH','9TH','10TH'];
  const ord  = ordinals[pos - 1] ?? `${pos}TH`;
  return [
    ` ${nm}       `,
    `  _o]       `,   // rider standing up in stirrups (celebrating / tired)
    ` /|         `,
    `( }  [${ord}]`,  // horse body + finish badge
    `|| ||       `,   // legs planted
    `oo oo       `,   // hooves down
  ];
}

function buildSprite(racer: RaceRacer, tick: number): Sprite6 {
  if (racer.finished && racer.finishPosition !== null) {
    return buildFinishedSprite(racer.shortName, racer.finishPosition);
  }
  return buildRunningSprite(racer.shortName, (tick % 2) as 0 | 1);
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export class AsciiRenderer {

  /**
   * Build the full-screen race frame.
   *
   * Layout per racer (7 lines total — 1 lane-header + 6 sprite lines):
   *
   *   ║ JNY    │──────────────────{sprite row 0}──────────────────────│║
   *   ║        │                  {sprite row 1}                      │║
   *   …
   *
   * Horses move left→right as position goes 0→100.
   * The frame is surrounded by ╔═╗ / ╚═╝ box-drawing borders.
   */
  buildRaceFrame(
    state:    RaceState,
    roundNum: number,
    isFinals: boolean,
    pickedId: string | null = null,
    cols:     number = DEFAULT_COLS,
  ): string {
    const lines: string[] = [];

    // Outer width = cols = LABEL_W + 1 (│) + trackInner + 1 (│) + 2 (║…║)
    const totalCols  = Math.max(MIN_COLS, cols);
    const trackInner = totalCols - 4 - LABEL_W;
    const innerW = LABEL_W + 1 + trackInner + 1;
    const hrTop  = '═'.repeat(innerW);
    const hrMid  = '═'.repeat(innerW);
    const hrSep  = '─'.repeat(innerW);

    // ── Header ───────────────────────────────────────────────────────────────
    const roundLabel = isFinals ? '✦ FINALS ✦' : `ROUND ${roundNum}`;
    const tickStr    = lpad(String(state.tick), 3).replace(/ /g, '0');
    let   pickLabel  = '';
    if (pickedId) {
      const p = state.racers.find(r => r.id === pickedId);
      if (p) pickLabel = `  ★ YOUR PICK: ${p.sprite} ${p.name}`;
    }
    const headerText = ` ★ STEEL BALL RUN ★   ${roundLabel}   TICK ${tickStr}${pickLabel} `;

    lines.push(`╔${hrTop}╗`);
    lines.push(`║${pad(headerText, innerW)}║`);
    lines.push(`╠${hrMid}╣`);

    // ── Racer lanes ──────────────────────────────────────────────────────────
    const sorted = [...state.racers].sort((a, b) => b.position - a.position);
    const maxOffset = trackInner - SPRITE_W - 2;

    sorted.forEach((racer, laneIdx) => {
      const isPicked = racer.id === pickedId;
      const offset   = Math.min(maxOffset, Math.floor((racer.position / 100) * maxOffset));
      const sprite   = buildSprite(racer, state.tick);

      // Lane header line: shows name + progress track
      const nameTag   = isPicked
        ? pad(`★${racer.shortName}`, LABEL_W)
        : pad(` ${racer.sprite}${racer.shortName}`, LABEL_W);
      const doneFill  = offset > 0 ? '·'.repeat(offset) : '';
      const restFill  = '─'.repeat(Math.max(0, trackInner - offset));
      // keep total track exactly trackInner chars
      const trackSep  = pad(doneFill + restFill, trackInner);
      lines.push(`║${nameTag}│${trackSep}│║`);

      // 6 sprite lines
      for (let i = 0; i < 6; i++) {
        const spriteLine = sprite[i];
        const track = placeInField(spriteLine, offset, trackInner);
        lines.push(`║${' '.repeat(LABEL_W)}│${track}│║`);
      }

      // Thin divider between racers (except after last)
      if (laneIdx < sorted.length - 1) {
        lines.push(`║${' '.repeat(LABEL_W)}╎${hrSep.slice(0, trackInner)}╎║`);
      }
    });

    // ── Events footer ─────────────────────────────────────────────────────────
    lines.push(`╠${hrMid}╣`);
    const events = state.activeEvents.slice(-2);
    if (events.length === 0) {
      lines.push(`║${pad('', innerW)}║`);
    } else {
      for (const ev of events) {
        lines.push(`║${pad(` ${ev.text}`, innerW)}║`);
      }
    }
    lines.push(`╚${'═'.repeat(innerW)}╝`);

    return lines.join('\n');
  }

  /**
   * Build the Undertale-style bottom stats bar.
   * One compact row per racer: rank · sprite · name · stat bars · stand.
   */
  buildStatsBar(
    state:    RaceState,
    pickedId: string | null = null,
    cols:     number = DEFAULT_COLS,
  ): string {
    const lines: string[] = [];
    const innerW = Math.max(MIN_COLS, cols) - 2;
    const border = '═'.repeat(innerW);

    const sorted = [...state.racers].sort((a, b) => b.position - a.position);

    // Row layout: prefix · 3 × ("XXX " bar "  ") · stand · pct
    const PREFIX_W = 30;                 // rank, pick, sprite, short name, name
    const STAND_W  = 16;
    const PCT_W    = 5;                  // space + "100%"
    const fixed    = PREFIX_W + 3 * (4 + 2) + STAND_W + PCT_W;
    // Stretch the stat bars (and the stand column) to use the extra width
    const spare    = Math.max(0, innerW - 2 - fixed - 3 * 8);
    const barW     = Math.max(8, 8 + Math.floor(spare / 4));
    const standW   = STAND_W + Math.max(0, spare - 3 * (barW - 8));

    const group = (label: string) => pad(label, 4 + barW + 2);
    const hdr = pad(' #', 9) + pad('RACER', PREFIX_W - 9)
      + group('SPD') + group('STA') + group('LCK') + pad('STAND', standW);

    lines.push(`╔${border}╗`);
    lines.push(`║${pad(hdr, innerW)}║`);
    lines.push(`╠${'─'.repeat(innerW)}╣`);

    sorted.forEach((racer, idx) => {
      const isPicked = racer.id === pickedId;
      const ordinals = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];
      const rank = racer.finished && racer.finishPosition !== null
        ? lpad(`[${ordinals[racer.finishPosition - 1] ?? racer.finishPosition + 'th'}]`, 5)
        : lpad(`${idx + 1}.`, 5);

      const pick    = isPicked ? '★' : ' ';
      const name    = pad(racer.name, 15);
      const spd     = buildStatBar(racer.stats.speed,   barW);
      const sta     = buildStatBar(racer.stats.stamina, barW);
      const lck     = buildStatBar(racer.stats.luck,    barW);
      const standNm = pad(racer.stand.name, standW);
      const pct     = racer.finished ? '   ' : lpad(`${Math.round(racer.position)}%`, 4);

      const row = `${rank} ${pick}${racer.sprite} ${pad(racer.shortName, 4)}${name}  SPD ${spd}  STA ${sta}  LCK ${lck}  ${standNm} ${pct}`;
      lines.push(`║ ${pad(row, innerW - 2)} ║`);
    });

    lines.push(`╚${border}╝`);
    return lines.join('\n');
  }

  /** Kept for backward compatibility with other screens. */
  buildStatsPanel(racers: RaceRacer[]): string {
    const lines: string[] = [];
    lines.push(pad('NAME           SPD          STA          LCK', 62));
    lines.push('─'.repeat(62));
    for (const r of racers) {
      lines.push(`${pad(r.name, 15)}  SPD ${buildStatBar(r.stats.speed, 8)}  STA ${buildStatBar(r.stats.stamina, 8)}  LCK ${buildStatBar(r.stats.luck, 8)}`);
    }
    return lines.join('\n');
  }
}
