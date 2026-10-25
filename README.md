# Steel Ball Run: ASCII Horse Racing

A browser-based horse racing game set in the world of JoJo's Bizarre Adventure Part 7, rendered entirely in ASCII art.

## Overview

Steel Ball Run is a single-page betting and racing game where you manage a bankroll across a four-round elimination tournament. Ten characters from the Steel Ball Run manga compete in each race, each with randomized stats and a unique Stand ability that can fire mid-race to shift momentum. You pick a horse, place a bet, watch the ASCII race unfold in real time, collect your winnings or absorb your losses, and survive until the Finals. The game ends when your balance drops below the next round's minimum bet or when a tournament champion is crowned.

This project was created during a vibe coding workshop in an hour, organized by the Swinburne AWS Student Builder Club.

## Features

* ASCII art terminal style visuals rendered with Unicode box drawing characters
* 10 playable characters from JoJo Part 7, each with a distinct Stand ability
* Elimination tournament across 4 rounds with escalating stakes
* Per character stats randomized fresh at the start of each tournament
* Live race simulation using weighted RNG and a stamina degradation curve
* Stand ability events fire mid race with flavor text banners on the track display
* Bankroll betting economy with escalating minimum bets per round
* Victory screen on tournament completion and game over screen on bankruptcy
* Background music: "Steer Barr Run" by Kroi

## Tech Stack

* Vite 6
* TypeScript
* Vanilla HTML and CSS
* No frameworks or UI libraries

## Getting Started

```bash
git clone <repo-url>
cd Horse-Racing
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Build for Production

```bash
npm run build
```

Output goes to `dist/`.

## How to Play

1. The Lobby screen presents the tournament roster with each character's tier and Stand name. Press Start to begin.
2. The Pre Race screen shows the current field of active racers, their win odds, the minimum bet for this round, and your current balance. Pick a racer and enter your bet amount, then confirm.
3. The Race screen runs the live simulation. Each tick the track updates, racer positions advance, and Stand abilities can fire at any moment showing a banner with flavor text.
4. The Results screen shows the finish order, who was eliminated, and your net gain or loss for the round. Advance to the next round.
5. Repeat from step 2 until the Finals are complete.
6. If your balance falls below the next round's minimum bet at any point, the Game Over screen appears.
7. If a winner is crowned at the end of Round 4, the Victory screen plays.

## Characters

* Johnny Joestar (S Tier): Tusk
* Gyro Zeppeli (S Tier): Ball Breaker
* Funny Valentine (S Tier): D4C
* Diego Brando (A Tier): Scary Monsters
* Hot Pants (A Tier): Cream Starter
* Wekapipo (B Tier): Wrecking Ball
* Magent Magent (B Tier): 20th Century Boy
* Pocoloco (B Tier): Hey Ya!
* Mountain Tim (C Tier): Oh! Lonesome Me
* Sandman (C Tier): In a Silent Way

## Tournament Structure

* Round 1 runs all 10 racers and eliminates the bottom 3 finishers
* Round 2 runs the remaining 7 and eliminates the bottom 2
* Round 3 runs the remaining 5 and eliminates the bottom 2
* Round 4 is the Finals with the last 3 racers, no eliminations, winner takes the tournament
* The `isFinals` flag also triggers early if 3 or fewer active racers remain before Round 4

## Betting Economy

* Starting bankroll is 1000 dollars
* Minimum bets per round: Round 1 requires 100, Round 2 requires 250, Round 3 requires 350, Finals requires 500
* Payout on a win is calculated as: bet multiplied by 100 then divided by the winner's win odds percentage
* A racer with low odds pays out much more than a favorite
* If your balance falls below the minimum bet of the next round, the game ends

## Project Structure

* `src/game-state.ts`: all shared TypeScript interfaces, the Screen const object, and game constants
* `src/characters-roster.ts`: BASE_CHARACTERS definitions and the randomizeRoster function
* `src/fsm-game.ts`: StateMachine class managing screen transitions with onEnter hooks
* `src/loop-game.ts`: GameLoop class implementing the fixed timestep accumulator pattern
* `src/race-engine.ts`: tickRace simulation, Box-Muller sampling, computeWeight, and initRace
* `src/events-stand.ts`: applyStandEvents applies Stand effects each tick after tickRace
* `src/tournament-engine.ts`: initTournament, advanceRound, computeOdds, and getActiveRacers
* `src/renderer-ascii.ts`: AsciiRenderer builds the race frame and stats panel strings

## Credits

* Game concept: JoJo's Bizarre Adventure Part 7: Steel Ball Run by Hirohiko Araki
* Background music: "Steer Barr Run" by Kroi. All rights belong to the artist, and the track is used here for a fun, non-commercial project
* Created during a vibe coding workshop in an hour, organized by the Swinburne AWS Student Builder Club
