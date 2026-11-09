# Hues for two
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Two people playing a shared color guessing game from separate browsers.

## Product Purpose
Give short word hints, guess a hidden color, reveal it, and accumulate points.

## Stack
Node.js and native browser JavaScript with WebSockets, following the nearby tarnkie-society/game pattern requested in the brief.

## Capabilities and Constraints
One hardcoded room with password `amy`; Join game reveals a password field, then the server assigns Player 1 or Player 2 automatically (internally A and B). Public lobby presence shows 0, 1, or 2 joined players, with joined players shown as stacked cards. 16 rows A–P and 30 columns. Four distinct random color choices for the clue giver. First hint: one word. Second hint: at most two words. One guess after each hint. Server validates turns and hints and keeps the target private until reveal. Restart resets scores. Reconnect restores a seat with a browser session token.

Assumed rules pending user feedback: add both guesses to the guesser's score; exact = 3, square distance one = 2, distance two = 1, farther = 0; alternate clue giver each round. Scores and seats live in server memory and reset when the server restarts.

## Brand Commitments
Use the supplied rainbow grid layout and square scoring rings. Colors are sampled directly from the supplied board screenshot.
