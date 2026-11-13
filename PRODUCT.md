# Minigames for two
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Two people playing minigames together from separate browsers.

## Product Purpose
Join one shared room and choose a minigame together. Hues & Cues is the first game: give short word hints, guess a hidden color, and accumulate points.

## Stack
Node.js and native browser JavaScript with WebSockets, following the nearby tarnkie-society/game pattern requested in the brief.

## Capabilities and Constraints
One hardcoded room with password `amy`; Join game reveals a password field, then the server assigns Player 1 or Player 2 automatically (internally A and B). Both players first see a game shelf; either can select a minigame for both. All games returns both to the shelf without losing the round or scores. Public lobby presence shows 0, 1, or 2 joined players, with joined players shown as stacked cards. 16 rows A–P and 30 columns. Four distinct random color choices for the clue giver. First hint: one word. Second hint: at most two words. One guess after each hint. Server validates turns and hints and keeps the target private until reveal. Restart resets scores. Reconnect restores a seat with a browser session token.

Assumed rules pending user feedback: add both guesses to the guesser's score; exact = 3, square distance one = 2, distance two = 1, farther = 0; alternate clue giver each round. Scores and seats live in server memory and reset when the server restarts.

## Brand Commitments
Use the supplied rainbow grid layout and square scoring rings. Colors are sampled directly from the supplied board screenshot.

## In a Nutshell

The second minigame assigns difficulty by guesser: Player 1 answers hard general-knowledge questions, while Player 2 answers very easy questions. Each has a separate bank of 50 original questions. The Nut Picker privately sees the question and answer and chooses individual words to reveal, with at least one visible word. The other player submits one typed answer. Matching ignores case, whitespace, and punctuation and accepts listed alternative answers. A correct answer awards the Nut Picker 1 point for each hidden word; an incorrect answer awards 0. Roles alternate each round, with reveal, history, and a separate score reset. Each guesser’s deck shuffles independently and uses all 50 questions before repeating; restart reshuffles both decks. Both minigames share the same room, password `amy`, seats, and reconnect mechanism, while preserving independent scores and progress.

## Guess Who

The third minigame uses 24 original characters with hair colors and lengths, glasses, hats, beards, and earrings. Both players choose a private secret character before play. They alternate typed yes/no questions; the other player answers honestly from their own secret card. Each player can privately eliminate and restore characters. On their asking turn, a player can instead make a final guess: correct earns them 1 point, incorrect awards the other player 1 point. A final guess reveals both characters and ends the round. The first asker alternates each round. Restart resets this game's scores, secrets, eliminations, and history. The shared room, password `amy`, seat recovery, and game shelf work as for the other minigames.
