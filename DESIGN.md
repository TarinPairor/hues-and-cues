# Minigames for two design

The supplied physical board is the visual authority: a dark backing, black gutters, A–P and 1–30 coordinates on all four edges, and all 480 reference colors. No generated hues replace the source colors. The surrounding interface recedes so the board is the dominant element.

The game surface supports an operation: take a seat, act on your turn, see a reveal. A lavender tabletop surrounds the dark board, with a quiet pale panel for current clues. Four small color squares make the wordmark; the same motif appears while waiting. Players are labelled Player 1 and Player 2 throughout. Join game reveals a password form. A live count starts at 0 players joined; each connected player appears in a separate card stacked vertically, including their score after joining.

## Tokens

- Table: `#eeeaf4`; panel: `#faf8fd`; ink: `#30263e`; secondary text: `#6b6079`.
- Dividers: `#d6cee0`; primary action: `#65418f`; board backing: `#211d28`.
- Typography: locally available Avenir Next/Avenir with Segoe UI and sans-serif fallbacks, avoiding a network font dependency. Display headings 26–42px; compact labels and coordinates keep visual weight on the board.
- Panel radii 16px; controls 10px; the board's color cells remain square.

## Layout and states

Desktop: masthead, round context and stacked player cards, full board with a 288px turn panel, scoring explanation, recent round history. Below 800px the turn panel follows the board. The board scrolls at narrow widths rather than shrinking cells into indistinguishable pixels.

The turn panel replaces its content for choosing, hint entry, guessing, waiting, and reveal. First and second guesses use numbered white/dark markers; the target uses a diamond. Reveal outlines the two scoring rings. Coordinates supplement color everywhere. Private choices never enter the guesser's snapshot.

Buttons have hover, focus, and disabled states. Hint counts update while typing. Arrow keys navigate the board. Dialogs contain instructions and restart confirmation. Reduced motion disables transitions.

## Verification limit

Mechanical UI checks passed. Live desktop/mobile screenshot review could not run because this environment prevented Chrome from launching and prohibited listening on local TCP ports. No rendered visual pass is claimed.

## Shared room and game shelf

The shared shell uses the same lavender surfaces and stacked player cards. The default view is a game shelf with Hues & Cues and In a Nutshell cards, illustrated by a strip of color swatches. No unavailable games are listed. Join and password controls belong to the room. Either joined player can launch a game once both are connected; server state controls navigation for both players. The card changes from Play game to Resume game after the first launch. All games returns to the shelf, with seats, scores, and rounds preserved. Game-specific views and rules live in separate modules.

## In a Nutshell windows

The supplied box photograph defines the game's surface: a muted burgundy box, numbered vertical windows, pale yellow word strips, and cool white sliding tabs. The digital board keeps that structure, with a private answer strip at the bottom for the Nut Picker. Tapping a word switches its reveal state; visible and hidden labels accompany the visual tab position. The guesser receives null placeholders for hidden words until the reveal. Desktop pairs the question box with a turn panel; below 800px the turn panel follows the box. A separate restart dialog names this game's reset. The shelf uses pale question-window strips to distinguish its card from the Hues color strips.
