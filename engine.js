/*
 * Local 2D Chess — compact rules engine
 * Implements standard chess move legality, castling, en passant, promotion,
 * SAN notation, check/mate/stalemate, repetition and material/50-move draws.
 */
(function (root) {
  'use strict';
  const FILES = 'abcdefgh';
  const PROMOTIONS = ['q', 'r', 'b', 'n'];
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const KNIGHT_STEPS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const KING_STEPS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
  const opposite = c => c === 'w' ? 'b' : 'w';
  const onBoard = (r,c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const idx = (r,c) => r * 8 + c;
  const rc = i => [Math.floor(i / 8), i % 8];
  const squareName = i => { const [r,c] = rc(i); return FILES[c] + (8-r); };
  const squareIndex = name => {
    if (!/^[a-h][1-8]$/.test(name)) return -1;
    return idx(8 - Number(name[1]), FILES.indexOf(name[0]));
  };
  const clone = s => ({
    board: s.board.map(p => p ? {type:p.type,color:p.color} : null),
    turn: s.turn,
    castle: {w:{K:s.castle.w.K,Q:s.castle.w.Q},b:{K:s.castle.b.K,Q:s.castle.b.Q}},
    ep: s.ep, halfmove:s.halfmove, fullmove:s.fullmove
  });

  function fromFen(fen = START_FEN) {
    const parts = fen.trim().split(/\s+/);
    if (parts.length !== 6) throw new Error('Invalid FEN: expected six fields.');
    const rows = parts[0].split('/');
    if (rows.length !== 8) throw new Error('Invalid FEN board.');
    const board = Array(64).fill(null);
    rows.forEach((row, r) => {
      let c = 0;
      for (const ch of row) {
        if (/^[1-8]$/.test(ch)) c += Number(ch);
        else {
          const type = ch.toLowerCase();
          if (!'prnbqk'.includes(type) || c > 7) throw new Error('Invalid FEN piece.');
          board[idx(r,c)] = {type, color: ch === ch.toUpperCase() ? 'w' : 'b'};
          c++;
        }
      }
      if (c !== 8) throw new Error('Invalid FEN rank.');
    });
    const rights = parts[2] === '-' ? '' : parts[2];
    return {
      board,
      turn: parts[1],
      castle: {
        w:{K:rights.includes('K'),Q:rights.includes('Q')},
        b:{K:rights.includes('k'),Q:rights.includes('q')}
      },
      ep: parts[3] === '-' ? null : squareIndex(parts[3]),
      halfmove: Number(parts[4]), fullmove:Number(parts[5])
    };
  }

  function toFen(s) {
    const rows = [];
    for (let r=0;r<8;r++) {
      let row='', empty=0;
      for (let c=0;c<8;c++) {
        const p=s.board[idx(r,c)];
        if (!p) empty++;
        else {
          if (empty) { row += empty; empty=0; }
          row += p.color === 'w' ? p.type.toUpperCase() : p.type;
        }
      }
      if (empty) row += empty;
      rows.push(row);
    }
    let rights='';
    if (s.castle.w.K) rights+='K'; if (s.castle.w.Q) rights+='Q';
    if (s.castle.b.K) rights+='k'; if (s.castle.b.Q) rights+='q';
    return `${rows.join('/')} ${s.turn} ${rights||'-'} ${s.ep == null ? '-' : squareName(s.ep)} ${s.halfmove} ${s.fullmove}`;
  }

  function kingSquare(s, color) {
    return s.board.findIndex(p => p && p.type==='k' && p.color===color);
  }

  function attacked(s, target, byColor) {
    const [tr,tc] = rc(target);
    // Pawn attacks
    const pawnSourceRow = tr - (byColor === 'w' ? -1 : 1);
    for (const dc of [-1,1]) {
      const c=tc-dc;
      if (onBoard(pawnSourceRow,c)) {
        const p=s.board[idx(pawnSourceRow,c)];
        if (p && p.color===byColor && p.type==='p') return true;
      }
    }
    // Knights
    for (const [dr,dc] of KNIGHT_STEPS) {
      const r=tr+dr,c=tc+dc;
      if (onBoard(r,c)) { const p=s.board[idx(r,c)]; if (p && p.color===byColor && p.type==='n') return true; }
    }
    // Adjacent king
    for (const [dr,dc] of KING_STEPS) {
      const r=tr+dr,c=tc+dc;
      if (onBoard(r,c)) { const p=s.board[idx(r,c)]; if (p && p.color===byColor && p.type==='k') return true; }
    }
    // Sliding pieces
    const rayChecks = [
      [BISHOP_DIRS, new Set(['b','q'])],
      [ROOK_DIRS, new Set(['r','q'])]
    ];
    for (const [dirs, types] of rayChecks) {
      for (const [dr,dc] of dirs) {
        let r=tr+dr,c=tc+dc;
        while (onBoard(r,c)) {
          const p=s.board[idx(r,c)];
          if (p) { if (p.color===byColor && types.has(p.type)) return true; break; }
          r+=dr; c+=dc;
        }
      }
    }
    return false;
  }

  function inCheck(s, color=s.turn) {
    const k=kingSquare(s,color);
    return k < 0 || attacked(s,k,opposite(color));
  }

  function makeMove(from,to,piece,extra={}) {
    return {from,to,piece:piece.type,color:piece.color,captured:null,flags:[],promotion:null,...extra};
  }

  function pseudoMoves(s, onlyFrom=null) {
    const moves=[];
    const side=s.turn;
    const start=onlyFrom == null ? 0 : onlyFrom;
    const end=onlyFrom == null ? 64 : onlyFrom+1;
    for (let from=start;from<end;from++) {
      const p=s.board[from];
      if (!p || p.color!==side) continue;
      const [r,c]=rc(from);
      if (p.type==='p') {
        const dir=side==='w'?-1:1;
        const home=side==='w'?6:1;
        const last=side==='w'?0:7;
        const oneR=r+dir;
        if (onBoard(oneR,c) && !s.board[idx(oneR,c)]) {
          const to=idx(oneR,c);
          if (oneR===last) PROMOTIONS.forEach(pr=>moves.push(makeMove(from,to,p,{promotion:pr,flags:['promotion']})));
          else {
            moves.push(makeMove(from,to,p));
            const twoR=r+2*dir;
            if (r===home && !s.board[idx(twoR,c)]) moves.push(makeMove(from,idx(twoR,c),p,{flags:['double']}));
          }
        }
        for (const dc of [-1,1]) {
          const nr=r+dir,nc=c+dc;
          if (!onBoard(nr,nc)) continue;
          const to=idx(nr,nc), target=s.board[to];
          if (target && target.color!==side && target.type!=='k') {
            if (nr===last) PROMOTIONS.forEach(pr=>moves.push(makeMove(from,to,p,{captured:target.type,promotion:pr,flags:['capture','promotion']})));
            else moves.push(makeMove(from,to,p,{captured:target.type,flags:['capture']}));
          } else if (s.ep===to) {
            moves.push(makeMove(from,to,p,{captured:'p',flags:['capture','enpassant']}));
          }
        }
      } else if (p.type==='n' || p.type==='k') {
        const steps=p.type==='n'?KNIGHT_STEPS:KING_STEPS;
        for (const [dr,dc] of steps) {
          const nr=r+dr,nc=c+dc;
          if (!onBoard(nr,nc)) continue;
          const to=idx(nr,nc), t=s.board[to];
          if (!t || (t.color!==side && t.type!=='k')) moves.push(makeMove(from,to,p,t?{captured:t.type,flags:['capture']}:{}));
        }
        if (p.type==='k' && from===(side==='w'?60:4) && !inCheck(s,side)) {
          const homeRow=side==='w'?7:0;
          const rights=s.castle[side];
          const enemy=opposite(side);
          if (rights.K && s.board[idx(homeRow,7)] && s.board[idx(homeRow,7)].type==='r' && s.board[idx(homeRow,7)].color===side &&
              !s.board[idx(homeRow,5)] && !s.board[idx(homeRow,6)] &&
              !attacked(s,idx(homeRow,5),enemy) && !attacked(s,idx(homeRow,6),enemy)) {
            moves.push(makeMove(from,idx(homeRow,6),p,{flags:['castleK']}));
          }
          if (rights.Q && s.board[idx(homeRow,0)] && s.board[idx(homeRow,0)].type==='r' && s.board[idx(homeRow,0)].color===side &&
              !s.board[idx(homeRow,1)] && !s.board[idx(homeRow,2)] && !s.board[idx(homeRow,3)] &&
              !attacked(s,idx(homeRow,3),enemy) && !attacked(s,idx(homeRow,2),enemy)) {
            moves.push(makeMove(from,idx(homeRow,2),p,{flags:['castleQ']}));
          }
        }
      } else {
        const dirs=p.type==='b'?BISHOP_DIRS:p.type==='r'?ROOK_DIRS:[...BISHOP_DIRS,...ROOK_DIRS];
        for (const [dr,dc] of dirs) {
          let nr=r+dr,nc=c+dc;
          while (onBoard(nr,nc)) {
            const to=idx(nr,nc),t=s.board[to];
            if (!t) moves.push(makeMove(from,to,p));
            else { if (t.color!==side && t.type!=='k') moves.push(makeMove(from,to,p,{captured:t.type,flags:['capture']})); break; }
            nr+=dr;nc+=dc;
          }
        }
      }
    }
    return moves;
  }

  function applyRaw(s,m) {
    const p=s.board[m.from];
    const color=p.color;
    const oldTurn=s.turn;
    s.board[m.from]=null;
    if (m.flags.includes('enpassant')) s.board[m.to + (color==='w'?8:-8)]=null;
    s.board[m.to]=m.promotion ? {type:m.promotion,color} : p;
    if (m.flags.includes('castleK')) {
      const row=color==='w'?7:0;
      s.board[idx(row,5)]=s.board[idx(row,7)]; s.board[idx(row,7)]=null;
    }
    if (m.flags.includes('castleQ')) {
      const row=color==='w'?7:0;
      s.board[idx(row,3)]=s.board[idx(row,0)]; s.board[idx(row,0)]=null;
    }
    if (p.type==='k') { s.castle[color].K=false; s.castle[color].Q=false; }
    const rookHomes = [{sq:63,color:'w',side:'K'},{sq:56,color:'w',side:'Q'},{sq:7,color:'b',side:'K'},{sq:0,color:'b',side:'Q'}];
    for (const x of rookHomes) {
      if (m.from===x.sq || (m.to===x.sq && m.captured==='r')) s.castle[x.color][x.side]=false;
    }
    s.ep = m.flags.includes('double') ? (m.from+m.to)/2 : null;
    s.halfmove = p.type==='p' || m.captured ? 0 : s.halfmove+1;
    if (oldTurn==='b') s.fullmove++;
    s.turn=opposite(oldTurn);
  }

  function legalMoves(s, onlyFrom=null) {
    const list=pseudoMoves(s,onlyFrom), legal=[];
    for (const m of list) {
      const test=clone(s);
      applyRaw(test,m);
      if (!inCheck(test,m.color)) legal.push(m);
    }
    return legal;
  }

  function sanFor(s,m,legalBefore) {
    if (m.flags.includes('castleK')) return 'O-O';
    if (m.flags.includes('castleQ')) return 'O-O-O';
    const p=s.board[m.from];
    const capture=!!m.captured;
    let san='';
    if (p.type!=='p') {
      san+=p.type.toUpperCase();
      const competitors=legalBefore.filter(x=>x.from!==m.from && x.to===m.to && x.piece===m.piece);
      if (competitors.length) {
        const [r,c]=rc(m.from);
        const sameFile=competitors.some(x=>rc(x.from)[1]===c);
        const sameRank=competitors.some(x=>rc(x.from)[0]===r);
        if (!sameFile) san+=FILES[c];
        else if (!sameRank) san+=(8-r);
        else san+=FILES[c]+(8-r);
      }
    } else if (capture) san+=FILES[rc(m.from)[1]];
    if (capture) san+='x';
    san+=squareName(m.to);
    if (m.promotion) san+='='+m.promotion.toUpperCase();
    const next=clone(s); applyRaw(next,m);
    if (inCheck(next,next.turn)) san+=legalMoves(next).length===0?'#':'+';
    return san;
  }

  function insufficientMaterial(s) {
    const pieces=[];
    s.board.forEach((p,sq)=>{ if (p && p.type!=='k') pieces.push({type:p.type,sq}); });
    if (pieces.length===0) return true;
    if (pieces.length===1 && ['b','n'].includes(pieces[0].type)) return true;
    if (pieces.every(p=>p.type==='b')) {
      const squareColours=pieces.map(p=>{const [r,c]=rc(p.sq);return (r+c)%2;});
      return squareColours.every(x=>x===squareColours[0]);
    }
    return false;
  }

  function repetitionKey(s) {
    let ep='-';
    if (s.ep != null && legalMoves(s).some(m=>m.flags.includes('enpassant'))) ep=squareName(s.ep);
    let rights='';
    if (s.castle.w.K) rights+='K'; if (s.castle.w.Q) rights+='Q';
    if (s.castle.b.K) rights+='k'; if (s.castle.b.Q) rights+='q';
    const placement=toFen({...s,ep:null}).split(' ')[0];
    return `${placement} ${s.turn} ${rights||'-'} ${ep}`;
  }

  class ChessGame {
    constructor(fen=START_FEN) {
      this.reset(fen);
    }
    reset(fen=START_FEN) {
      this.state=fromFen(fen);
      this.history=[];
      this.positions=new Map([[repetitionKey(this.state),1]]);
    }
    turn() { return this.state.turn; }
    fen() { return toFen(this.state); }
    board() { return this.state.board.map(p=>p?{...p}:null); }
    pieceAt(square) { const i=typeof square==='number'?square:squareIndex(square); const p=this.state.board[i]; return p?{...p}:null; }
    moves(from=null) {
      const sq=from==null?null:(typeof from==='number'?from:squareIndex(from));
      return legalMoves(this.state,sq).map(m=>({...m,fromSquare:squareName(m.from),toSquare:squareName(m.to)}));
    }
    inCheck(color=this.state.turn) { return inCheck(this.state,color); }
    move(from,to,promotion='q') {
      const a=typeof from==='number'?from:squareIndex(from);
      const b=typeof to==='number'?to:squareIndex(to);
      const legal=legalMoves(this.state,a);
      const choices=legal.filter(m=>m.to===b);
      if (!choices.length) return null;
      const chosen=choices.find(m=>m.promotion===(promotion||'q')) || choices.find(m=>!m.promotion);
      if (!chosen) return null;
      const san=sanFor(this.state,chosen,legalMoves(this.state));
      const beforeFen=this.fen();
      const record={...chosen,san,fromSquare:squareName(chosen.from),toSquare:squareName(chosen.to),beforeFen};
      applyRaw(this.state,chosen);
      record.fen=this.fen();
      this.history.push(record);
      const key=repetitionKey(this.state);
      this.positions.set(key,(this.positions.get(key)||0)+1);
      return {...record};
    }
    repetitionCount() { return this.positions.get(repetitionKey(this.state))||0; }
    insufficientMaterial() { return insufficientMaterial(this.state); }
    halfmoveClock() { return this.state.halfmove; }
    isCheckmate() { return inCheck(this.state) && legalMoves(this.state).length===0; }
    isStalemate() { return !inCheck(this.state) && legalMoves(this.state).length===0; }
    isDraw() { return this.isStalemate() || this.insufficientMaterial() || this.repetitionCount()>=3 || this.state.halfmove>=100; }
    legalMoves() { return legalMoves(this.state).map(m=>({...m,fromSquare:squareName(m.from),toSquare:squareName(m.to)})); }
    pgn() {
      const out=[];
      for(let i=0;i<this.history.length;i+=2) {
        const n=Math.floor(i/2)+1;
        out.push(`${n}. ${this.history[i].san}${this.history[i+1]?' '+this.history[i+1].san:''}`);
      }
      return out.join(' ');
    }
  }

  const api={ChessGame,START_FEN,squareName,squareIndex,opposite};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  root.ChessEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
