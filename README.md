# Classical Chess — Kindle-friendly two-player chess

A traditional two-player chess game designed for touchscreens and the Kindle Colorsoft Signature Edition. It keeps the original chess rules and familiar layout, but uses static 2D pieces, tap-to-move controls and a high-contrast, flat-colour interface suited to an E Ink screen.

## Put it on your website

Upload the **entire `classical-chess` folder** to your website, keeping its folder structure intact. The `index.html` file, CSS, JavaScript files and `assets` folder must stay together.

For example, if you upload the folder to a directory called `chess`, open the resulting address:

```text
https://your-website.example/chess/
```

You can also place the contents of this folder in your website's main directory, provided you do not overwrite another site's `index.html`.

The game has no external libraries, fonts, APIs, analytics or remote chess services. The only files it loads are the local files inside this folder. The game rules run in the browser on the device.

## Use it on a Kindle Colorsoft

1. Connect the Kindle to Wi-Fi.
2. Open the Kindle's **Web Browser** from the Home screen menu.
3. Enter the website address where you uploaded this folder.
4. Tap a piece once, then tap one of its highlighted legal destination squares.
5. Tap the same piece again to deselect it. White moves first.

The Kindle Colorsoft web browser supports JavaScript and SSL, which this game uses. The game does not use media plug-ins. The screen is E Ink, so the interface avoids movement effects, animated highlights and decorative motion. The clock is off by default; when a time control is selected, the displayed clock updates once per second.

## Playing

- Two people share the same device. White and Black take alternate turns.
- Tap a piece, then tap its destination square. Dragging is not required.
- Selected pieces and legal destinations are clearly marked.
- The player names can be edited by tapping the name fields.
- Choose No clock, 5, 10, 15 or 30 minutes, or set a custom time.
- Use New Game or Restart to reset the position.
- Offer Draw, Accept/Decline and Resign are available as normal chess-game controls.
- The Fullscreen control expands the board area only. If the browser does not support the Fullscreen API, it uses a board-focus layout instead and leaves the other controls accessible below.

## Standard chess rules

The bundled rules engine handles legal moves, check, checkmate, stalemate, castling, en passant, promotion to queen/rook/bishop/knight, threefold repetition, fivefold repetition, fifty-move and seventy-five-move draws, and insufficient material. The game also includes standard algebraic move history.

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

## Tests and notes

Run the bundled move-generation tests with Node.js:

```bash
node tests/engine-test.js
```

The rules engine is bundled locally; it does not load code from a CDN. The site needs a connection to load from your web host, but no account, server-side chess engine, database or online opponent is used. Once the page and its assets have loaded, every move is processed on the device.

This is a traditional local chess game, not a certified tournament arbiter or official FIDE clock.
