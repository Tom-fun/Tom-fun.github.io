const assert = require('node:assert/strict');
const { ChessGame } = require('../engine.js');

function perft(game, depth) {
  if (depth === 0) return 1;
  let total = 0;
  for (const move of game.legalMoves()) {
    const child = new ChessGame(game.fen());
    child.move(move.fromSquare, move.toSquare, move.promotion || 'q');
    total += perft(child, depth - 1);
  }
  return total;
}

const vectors = [
  ['Starting position', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 400],
  ['Kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 2039],
  ['En-passant and check evasions', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 191],
  ['Promotion and castling rights', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 264],
  ['Promotion tactics', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 1486]
];
for (const [name, fen, expected] of vectors) {
  const actual = perft(new ChessGame(fen), 2);
  assert.equal(actual, expected, `${name} perft(2)`);
  console.log(`PASS ${name}: ${actual}`);
}

let game = new ChessGame();
assert.equal(game.legalMoves().length, 20);
for (const [from,to] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']]) assert.ok(game.move(from,to));
assert.ok(game.isCheckmate(), 'Fool’s Mate should be checkmate');

console.log('All chess engine checks passed.');
