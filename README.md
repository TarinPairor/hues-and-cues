# Minigames — for two

A shared two-player minigame room with live WebSockets. Hues & Cues is the first and currently only minigame, with a 16 × 30 board sampled from the supplied reference image.

## Run

Use Node.js 22 or newer:

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. Select **Join game**, then enter the password **`amy`**. The first person becomes Player 1 and the next becomes Player 2. Join from another browser, private window, or device for the second player. The lobby shows a live joined count and stacked player cards. A fresh tab also works, but duplicating a tab can copy its seat session.

For another device on the same Wi-Fi, open `http://YOUR_COMPUTER_LAN_IP:5173` on **both** devices. The server listens on all interfaces. Both players must use the same server; separate server processes have separate rooms. Allow incoming connections through your computer's firewall if needed.

Use `npm start` without watch mode. Set `PORT` to change the port:

```sh
PORT=3000 npm start
```

This needs a running Node server with WebSocket support. A static file server or static-only hosting cannot synchronize the game. When putting it behind a reverse proxy, forward `/ws` with WebSocket upgrades; HTTPS pages automatically use secure WebSockets.

## Choose a game

Once both players have joined, either player can select **Hues & Cues** from the game shelf. Selection opens the game for both players. **All games** brings both players back to the shelf while preserving the round and scores. Select **Resume game** to continue. Sessions remain in memory while the server runs.

## Play Hues & Cues

1. Player 1 starts as clue giver. Choose one of four random, visually separated colors, or shuffle for four new options. Only the clue giver receives the options and target.
2. Send a **one-word** hint. The guesser selects a board square and locks in their first guess.
3. Send a second hint with **one or two words**. The guesser locks in another guess; choosing the same square is allowed.
4. Reveal the target. Score **both** guesses independently: exact = **3**, within one square = **2**, within two squares = **1**, farther = **0**. Diagonals count. Points go to the guesser, up to 6 per round.
5. Next round swaps roles. Restart scores resets both scores, history, and the round, with Player 1 giving clues again.

The input counts words as you type; the server independently enforces limits and turns. Hyphens, slashes, and dashes separate words. Apostrophes stay inside words; Unicode letters are supported. This checks word count, not whether a clue is fair or meaningful.

On a phone the full board scrolls horizontally so similar colors remain individually selectable. Keyboard users can focus the board's first square, navigate with arrow keys, and select with Enter or Space before locking in the guess.

## Seats and reconnects

There is one hardcoded room with exactly two players, displayed as Player 1 and Player 2 (internally A and B). The server checks the hardcoded password `amy` and assigns the first disconnected or unused seat; clients cannot choose a player number. Each seat gets a random reconnect token saved in session storage. Refreshing or reconnecting preserves the seat, score, and round. Opening the same seat session in another tab transfers that seat to the new connection.

A lost connection keeps its reconnect token valid until someone joins that offline seat with the password. A new password join replaces that token, so the previous session cannot take the seat back. **Leave game** explicitly releases it for someone else. Restarting the server clears all seats, scores, and rounds. There are no accounts, database, or permanent score storage. Anyone with access to this server and the shared password can claim an available seat; either seated player can restart scores.

## Checks

```sh
npm test
```

Tests cover square scoring boundaries, word validation, choice diversity, complete rounds, turn restrictions, private snapshots, seat ownership, reconnects, role swapping, restart, static serving, and actual WebSocket clients.

In environments that prohibit opening local ports, only the real socket test is skipped (with an explicit reason). The server protocol and HTTP handler still run in memory.

Implementation verification in the restricted workspace: **11 tests passed, 1 real socket test skipped** because TCP listening is blocked. Browser screenshot verification was also blocked by the environment. Syntax checks and the UI's mechanical design checks passed.

## Files

- `room.mjs`: shared game selection, saved game sessions, action routing.
- `games/hues.mjs`: Hues & Cues rules, scoring, hints, and private snapshots.
- `game.mjs`: compatibility export of the Hues & Cues rules.
- `server.mjs`: shared room, seat tokens, WebSockets, and static HTTP server.
- `public/app.js`: shared room, join controls, game shelf, and connection lifecycle.
- `public/games/catalog.js`: shared public minigame descriptions.
- `public/games/hues.js`: Hues & Cues browser view and controls.
- `public/ui.js`: small shared browser helpers.
- `public/`: page layout, styles, and reference board colors.
- `tests/`: rules, protocol, HTTP, and WebSocket tests.

## Add a minigame

1. Add its public ID, name, description, and category to `public/games/catalog.js`.
2. Add its server class in `games/`, implementing `act(seat, message)` and `snapshot(seat)`. Keep private information out of the other player's snapshot. Register its factory in `room.mjs`.
3. Add its browser view in `public/games/`, with `update(state)` and `deactivate()` methods, and its HTML section. Register the view and section visibility in `public/app.js`. Pass game actions through `send` with the minigame's ID.

The server owns selection for both players. The room retains one session per game. Seat tokens and passwords belong to the shared room; individual games own their rules, scores, and round history.
