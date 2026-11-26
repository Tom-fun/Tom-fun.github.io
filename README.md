# Classical Chess — Local Two-Player Game

A traditional 2D chess game for two people sharing one device. It runs directly in a modern browser and does not require internet access, an account, a server, a computer opponent or an external library.

## Start playing

1. Download and unzip the project folder.
2. Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari).
3. Choose a time control, enter player names, and begin. White moves first.

All project files stay together in the same folder. Do not move `engine.js`, `app.js`, `styles.css` or the `assets` folder away from `index.html`.

## Included

- Traditional 8×8 chessboard with coordinates, wooden-style squares and 12 individual transparent SVG Staunton-inspired piece images.
- Click-to-move and mouse drag-and-drop. On touchscreens, tap a piece and then its destination square.
- Legal move validation, check, checkmate, stalemate, castling, en passant and promotion to queen, rook, bishop or knight.
- Draw detection for insufficient material, threefold repetition and the fifty-move rule, plus automatic fivefold-repetition and seventy-five-move draws.
- Local draw offers, resignation and standard algebraic move history.
- Optional 5, 10, 15, 30-minute or custom chess clocks, with no-clock mode.
- Browser fullscreen, responsive layout and optional move/capture sounds.

## Project structure

```text
classical-chess/
├── index.html
├── styles.css
├── app.js
├── engine.js
├── README.md
├── tests/
│   └── engine-test.js
└── assets/
    └── pieces/
        ├── white-king.svg
        ├── white-queen.svg
        ├── white-rook.svg
        ├── white-bishop.svg
        ├── white-knight.svg
        ├── white-pawn.svg
        ├── black-king.svg
        ├── black-queen.svg
        ├── black-rook.svg
        ├── black-bishop.svg
        ├── black-knight.svg
        └── black-pawn.svg
```

## Notes

- The bundled JavaScript rules engine is local to this folder; it does not load code from a CDN.
- Optional engine regression tests can be run with `node tests/engine-test.js` (requires Node.js).
- All 12 piece illustrations are separate SVG files with transparent backgrounds.
- Time controls restart the current board when changed so both clocks begin from the selected control.
- The optional sound starts turned off. Turn it on with the sound control in the header.
- Fullscreen expands the chessboard area only (including the player name and clock strips); the rest of the interface stays outside it. Press `Escape` or use the on-board exit control to leave fullscreen.

The game is designed for casual local play using standard chess rules; it is not a certified tournament arbiter or an official FIDE pairing/clock system.
