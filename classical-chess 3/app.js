(() => {
  'use strict';
  const { ChessGame } = window.ChessEngine;
  const $ = id => document.getElementById(id);
  const pieceNames = {k:'King',q:'Queen',r:'Rook',b:'Bishop',n:'Knight',p:'Pawn'};
  const pieceAsset = (color,type) => `assets/pieces/${color==='w'?'white':'black'}-${pieceNames[type].toLowerCase()}.svg`;

  let game = new ChessGame();
  let selectedSquare = null;
  let pendingPromotion = null;
  let drawOffer = null;
  let finished = false;
  let soundEnabled = false;
  let timerHandle = null;
  let lastTick = Date.now();
  let clockSettings = {baseMs:0, remaining:{w:null,b:null}};
  let dragFrom = null;
  let suppressClickUntil = 0;
  let audioContext = null;

  const boardGrid = $('boardGrid');
  const promotionDialog = $('promotionDialog');

  function getPlayerName(color) {
    const raw = $(color==='w'?'whiteName':'blackName').value.trim();
    return raw || (color==='w'?'White':'Black');
  }

  function chosenMinutes() {
    const value=$('timeControl').value;
    if (value==='custom') {
      const n=Number($('customMinutes').value);
      return Math.max(1,Math.min(180,Number.isFinite(n)?Math.floor(n):10));
    }
    return Number(value)||0;
  }

  function setupClocks() {
    const minutes=chosenMinutes();
    const ms=minutes*60*1000;
    clockSettings={baseMs:ms,remaining:{w:ms||null,b:ms||null}};
    lastTick=Date.now();
    updateClocks();
  }

  function formatClock(ms) {
    if (ms==null) return '—:——';
    const seconds=Math.max(0,Math.ceil(ms/1000));
    const mins=Math.floor(seconds/60);
    const secs=seconds%60;
    return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  }

  function updateClocks() {
    for (const color of ['w','b']) {
      const el=$(color==='w'?'whiteClock':'blackClock');
      el.textContent=formatClock(clockSettings.remaining[color]);
      el.classList.toggle('low-time',clockSettings.remaining[color]!=null && clockSettings.remaining[color]<=30000);
    }
  }

  function tickClock() {
    if (finished || !clockSettings.baseMs) { lastTick=Date.now(); return; }
    const now=Date.now();
    const elapsed=Math.max(0,now-lastTick);
    lastTick=now;
    const color=game.turn();
    clockSettings.remaining[color]-=elapsed;
    if (clockSettings.remaining[color]<=0) {
      clockSettings.remaining[color]=0;
      updateClocks();
      handleFlagFall(color);
      return;
    }
    updateClocks();
  }

  function handleFlagFall(color) {
    if (finished) return;
    const winner=opposite(color);
    const winnerName=getPlayerName(winner);
    if (game.insufficientMaterial()) {
      finishGame('½–½','Draw on time','The player who still had time does not have sufficient material to checkmate.');
    } else {
      finishGame(winner==='w'?'1–0':'0–1',`${winnerName} wins on time`,`${getPlayerName(color)} ran out of time.`);
    }
    playSound(true);
  }

  function opposite(color) { return color==='w'?'b':'w'; }

  function startTicker() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle=setInterval(tickClock,250);
  }

  function clearSelection() {
    selectedSquare=null;
    dragFrom=null;
  }

  function resetGame() {
    game.reset();
    clearSelection();
    pendingPromotion=null;
    drawOffer=null;
    finished=false;
    $('drawResponse').hidden=true;
    $('resultPanel').hidden=true;
    $('offerDraw').disabled=false;
    $('resignGame').disabled=false;
    setupClocks();
    lastTick=Date.now();
    renderBoard();
    renderHistory();
    updateStatus();
    updatePlayerCards();
    updateDrawControls();
    startTicker();
    if (promotionDialog.open) promotionDialog.close();
  }

  function finishGame(score,title,description) {
    if (finished) return;
    finished=true;
    drawOffer=null;
    $('drawResponse').hidden=true;
    $('resultPanel').hidden=false;
    $('resultTitle').textContent=title;
    $('resultDescription').textContent=`${description}  ${score}`;
    $('gameStatus').textContent=title;
    $('turnText').textContent=score;
    $('turnStatus').querySelector('.turn-dot').style.background='#c7aa79';
    $('offerDraw').disabled=true;
    $('resignGame').disabled=true;
    updatePlayerCards();
    renderBoard();
    updateDrawControls();
  }

  function checkForGameEnd() {
    const side=game.turn();
    const legal=game.legalMoves();
    if (!legal.length) {
      if (game.inCheck(side)) {
        const winner=opposite(side);
        const name=getPlayerName(winner);
        finishGame(winner==='w'?'1–0':'0–1',`${name} wins by checkmate`,`${getPlayerName(side)} is checkmated.`);
      } else finishGame('½–½','Draw by stalemate','The player to move has no legal move and is not in check.');
      return true;
    }
    if (game.insufficientMaterial()) {
      finishGame('½–½','Draw by insufficient material','Neither player has enough material to deliver checkmate.');
      return true;
    }
    if (game.repetitionCount()>=5) {
      finishGame('½–½','Draw by fivefold repetition','The same position has occurred five times.');
      return true;
    }
    if (game.repetitionCount()>=3) {
      finishGame('½–½','Draw by threefold repetition','The same position has occurred three times.');
      return true;
    }
    if (game.halfmoveClock()>=150) {
      finishGame('½–½','Draw by the 75-move rule','Seventy-five moves have passed without a pawn move or capture.');
      return true;
    }
    if (game.halfmoveClock()>=100) {
      finishGame('½–½','Draw by the 50-move rule','Fifty moves have passed without a pawn move or capture.');
      return true;
    }
    return false;
  }

  function playSound(capture=false) {
    if (!soundEnabled) return;
    try {
      const AC=window.AudioContext||window.webkitAudioContext;
      if (!AC) return;
      audioContext ||= new AC();
      if (audioContext.state==='suspended') audioContext.resume();
      const osc=audioContext.createOscillator();
      const gain=audioContext.createGain();
      const now=audioContext.currentTime;
      osc.type=capture?'triangle':'sine';
      osc.frequency.setValueAtTime(capture?185:360,now);
      if (!capture) osc.frequency.exponentialRampToValueAtTime(285,now+.075);
      gain.gain.setValueAtTime(capture?.0001:.0001,now);
      gain.gain.linearRampToValueAtTime(capture?.035:.025,now+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,now+(capture?.13:.09));
      osc.connect(gain);gain.connect(audioContext.destination);
      osc.start(now);osc.stop(now+(capture?.14:.1));
    } catch (_) { /* Audio is optional; gameplay never depends on it. */ }
  }

  function renderBoard(animationMove=null) {
    let oldRect=null;
    if (animationMove) {
      const oldPiece=boardGrid.querySelector(`[data-square="${animationMove.from}"] .piece`);
      if (oldPiece) oldRect=oldPiece.getBoundingClientRect();
    }
    const selectedMoves=selectedSquare==null?[]:game.moves(selectedSquare);
    const moveTargets=new Map();
    selectedMoves.forEach(m=>moveTargets.set(m.toSquare,m));
    const board=game.board();
    const checkSquare=game.inCheck()?board.findIndex(p=>p&&p.type==='k'&&p.color===game.turn()):-1;
    const last=game.history.at(-1);
    const frag=document.createDocumentFragment();
    for (let r=0;r<8;r++) {
      for (let c=0;c<8;c++) {
        const squareIndex=r*8+c;
        const name=String.fromCharCode(97+c)+(8-r);
        const square=document.createElement('button');
        square.type='button';
        square.className=`square ${(r+c)%2===0?'light':'dark'}`;
        square.dataset.square=name;
        square.setAttribute('role','gridcell');
        const p=board[squareIndex];
        square.setAttribute('aria-label',`${name}${p?`, ${p.color==='w'?'White':'Black'} ${pieceNames[p.type]}`:''}`);
        if (selectedSquare===name) square.classList.add('selected');
        if (last && (last.fromSquare===name||last.toSquare===name)) square.classList.add('last-move');
        if (last && last.captured && last.toSquare===name) square.classList.add('capture-square');
        if (squareIndex===checkSquare) square.classList.add('in-check');
        const move=moveTargets.get(name);
        if (move) square.classList.add(move.captured?'legal-capture':'legal-target');
        if (c===0) {
          const rank=document.createElement('span');rank.className='coordinate rank';rank.textContent=String(8-r);square.append(rank);
        }
        if (r===7) {
          const file=document.createElement('span');file.className='coordinate file';file.textContent=String.fromCharCode(97+c);square.append(file);
        }
        if (p) {
          const image=document.createElement('img');
          image.className='piece';
          image.src=pieceAsset(p.color,p.type);
          image.alt=`${p.color==='w'?'White':'Black'} ${pieceNames[p.type]}`;
          image.draggable=true;
          image.dataset.piece='true';
          square.append(image);
        }
        frag.append(square);
      }
    }
    boardGrid.replaceChildren(frag);
    if (animationMove && oldRect) {
      const image=boardGrid.querySelector(`[data-square="${animationMove.to}"] .piece`);
      if (image) {
        const newRect=image.getBoundingClientRect();
        image.classList.add('animating');
        image.style.transform=`translate(${oldRect.left-newRect.left}px,${oldRect.top-newRect.top}px)`;
        requestAnimationFrame(()=>requestAnimationFrame(()=>{image.style.transform='translate(0,0)';}));
        image.addEventListener('transitionend',()=>{image.classList.remove('animating');image.style.transform='';},{once:true});
      }
    }
  }

  function renderHistory() {
    const tbody=$('moveHistory');
    tbody.replaceChildren();
    const history=game.history;
    if (!history.length) {
      const tr=document.createElement('tr');tr.className='empty-history';
      const td=document.createElement('td');td.colSpan=3;td.textContent='Your moves will appear here.';tr.append(td);tbody.append(tr);
    } else {
      for(let i=0;i<history.length;i+=2) {
        const tr=document.createElement('tr');
        if (i+2>=history.length) tr.classList.add('latest-row');
        const number=document.createElement('td');number.textContent=String(Math.floor(i/2)+1);tr.append(number);
        const white=document.createElement('td');white.textContent=history[i].san;tr.append(white);
        const black=document.createElement('td');black.textContent=history[i+1]?.san||'—';tr.append(black);
        tbody.append(tr);
      }
    }
    $('moveCount').textContent=String(history.length);
    const fullMoves=Math.ceil(history.length/2);
    $('historySummary').textContent=history.length===0?'No moves yet':`${fullMoves} ${fullMoves===1?'move':'moves'} played`;
    const wrap=$('moveTableWrap');wrap.scrollTop=wrap.scrollHeight;
  }

  function updateStatus() {
    if (finished) return;
    const color=game.turn();
    const label=color==='w'?'White':'Black';
    const checked=game.inCheck(color);
    $('turnText').textContent=checked?`${label} is in check`:`${label} to move`;
    $('turnStatus').querySelector('.turn-dot').style.background=checked?'#d97962':(color==='w'?'#e4d4b5':'#68716d');
    $('gameStatus').textContent=checked?'Check':'Game in progress';
  }

  function updatePlayerCards() {
    $('whitePlayerCard').classList.toggle('active',!finished&&game.turn()==='w');
    $('blackPlayerCard').classList.toggle('active',!finished&&game.turn()==='b');
  }

  function updateDrawControls() {
    const button=$('offerDraw');
    button.disabled=finished||!!drawOffer;
    const awaitingReply=!!drawOffer && game.turn()!==drawOffer.color && game.history.length>drawOffer.offeredAtPly;
    if (awaitingReply) {
      $('drawResponse').hidden=false;
      $('drawMessage').textContent=`${getPlayerName(drawOffer.color)} offers a draw.`;
    } else $('drawResponse').hidden=true;
  }

  function completeMove(from,to,promotion='q') {
    const move=game.move(from,to,promotion);
    if (!move) return false;
    clearSelection();
    if (drawOffer && move.color !== drawOffer.color) drawOffer=null;
    lastTick=Date.now();
    playSound(!!move.captured);
    renderBoard({from:move.fromSquare,to:move.toSquare});
    renderHistory();
    const ended=checkForGameEnd();
    if (!ended) {
      updateStatus();
      updatePlayerCards();
    }
    updateDrawControls();
    updateClocks();
    return true;
  }

  function openPromotion(from,to,color) {
    pendingPromotion={from,to};
    const options=$('promotionOptions');options.replaceChildren();
    for (const type of ['q','r','b','n']) {
      const button=document.createElement('button');button.type='button';button.className='promotion-choice';
      const img=document.createElement('img');img.src=pieceAsset(color,type);img.alt='';
      const label=document.createElement('span');label.textContent=pieceNames[type];
      button.append(img,label);
      button.addEventListener('click',()=>{
        const pending=pendingPromotion;pendingPromotion=null;
        promotionDialog.close();
        if (pending) completeMove(pending.from,pending.to,type);
      });
      options.append(button);
    }
    promotionDialog.showModal();
  }

  function tryMove(from,to) {
    if (finished) return;
    const moves=game.moves(from).filter(m=>m.toSquare===to);
    if (!moves.length) return;
    if (moves.some(m=>m.promotion)) {
      const p=game.pieceAt(from);
      openPromotion(from,to,p?.color||game.turn());
    } else completeMove(from,to);
  }

  function onSquareClick(name) {
    if (finished) return;
    const target=game.pieceAt(name);
    if (selectedSquare==null) {
      if (target && target.color===game.turn()) { selectedSquare=name;renderBoard(); }
      return;
    }
    if (selectedSquare===name) { clearSelection();renderBoard();return; }
    if (target && target.color===game.turn()) { selectedSquare=name;renderBoard();return; }
    const from=selectedSquare;
    const hasMove=game.moves(from).some(m=>m.toSquare===name);
    if (hasMove) tryMove(from,name);
    else { clearSelection();renderBoard(); }
  }

  boardGrid.addEventListener('click',event=>{
    if (Date.now()<suppressClickUntil) return;
    const square=event.target.closest('.square');
    if (square) onSquareClick(square.dataset.square);
  });
  boardGrid.addEventListener('dragstart',event=>{
    const image=event.target.closest('.piece');
    if (!image || finished) { event.preventDefault();return; }
    const square=image.closest('.square');
    const piece=game.pieceAt(square.dataset.square);
    if (!piece || piece.color!==game.turn()) { event.preventDefault();return; }
    dragFrom=square.dataset.square;
    selectedSquare=dragFrom;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed='move';
      event.dataTransfer.setData('text/plain',dragFrom);
    }
    boardGrid.querySelectorAll('.square.selected,.square.legal-target,.square.legal-capture').forEach(el=>el.classList.remove('selected','legal-target','legal-capture'));
    const sourceSquare=square;
    sourceSquare.classList.add('selected');
    for (const m of game.moves(dragFrom)) {
      const target=boardGrid.querySelector(`[data-square="${m.toSquare}"]`);
      if (target) target.classList.add(m.captured?'legal-capture':'legal-target');
    }
  });
  boardGrid.addEventListener('dragover',event=>{if (event.target.closest('.square')) event.preventDefault();});
  boardGrid.addEventListener('drop',event=>{
    const square=event.target.closest('.square');
    if (!square || !dragFrom) return;
    event.preventDefault();
    const from=dragFrom,to=square.dataset.square;
    dragFrom=null;suppressClickUntil=Date.now()+350;
    if (from!==to) {
      const legal=game.moves(from).some(m=>m.toSquare===to);
      if (legal) tryMove(from,to);
      else {clearSelection();renderBoard();}
    } else {clearSelection();renderBoard();}
  });
  boardGrid.addEventListener('dragend',()=>{
    if (dragFrom) {dragFrom=null;clearSelection();renderBoard();}
  });

  $('newGame').addEventListener('click',()=>resetGame());
  $('restartGame').addEventListener('click',()=>resetGame());
  $('offerDraw').addEventListener('click',()=>{
    if (finished||drawOffer) return;
    drawOffer={color:game.turn(),offeredAtPly:game.history.length};
    updateDrawControls();
  });
  $('acceptDraw').addEventListener('click',()=>{
    if (!drawOffer||finished) return;
    finishGame('½–½','Draw by agreement','Both players have agreed to a draw.');
  });
  $('declineDraw').addEventListener('click',()=>{
    drawOffer=null;updateDrawControls();
  });
  $('resignGame').addEventListener('click',()=>{
    if (finished) return;
    const resigning=game.turn();
    const name=getPlayerName(resigning);
    if (!window.confirm(`${name}, resign this game?`)) return;
    const winner=opposite(resigning);
    finishGame(winner==='w'?'1–0':'0–1',`${getPlayerName(winner)} wins by resignation`,`${name} resigned.`);
  });
  const boardColumn=$('boardColumn') || document.querySelector('.board-column');
  const exitBoardFullscreen=async()=>{
    if (document.fullscreenElement) await document.exitFullscreen();
  };
  $('fullscreenButton').addEventListener('click',async()=>{
    try {
      if (document.fullscreenElement===boardColumn) await exitBoardFullscreen();
      else {
        if (document.fullscreenElement) await document.exitFullscreen();
        await boardColumn.requestFullscreen();
      }
    } catch (error) {
      $('gameStatus').textContent='Board fullscreen is unavailable in this browser';
    }
  });
  $('boardFullscreenExit').addEventListener('click',()=>exitBoardFullscreen());
  document.addEventListener('fullscreenchange',()=>{
    const active=document.fullscreenElement===boardColumn;
    $('fullscreenButton').querySelector('span:last-child').textContent=active?'Exit fullscreen':'Fullscreen';
    $('fullscreenButton').querySelector('.action-symbol').textContent=active?'×':'⛶';
  });
  $('soundToggle').addEventListener('click',()=>{
    soundEnabled=!soundEnabled;
    $('soundToggle').setAttribute('aria-pressed',String(soundEnabled));
    $('soundToggle').querySelector('span').textContent=soundEnabled?'Sound on':'Sound off';
    if (soundEnabled) playSound(false);
  });
  $('timeControl').addEventListener('change',()=>{
    $('customTimeWrap').hidden=$('timeControl').value!=='custom';
    resetGame();
  });
  $('customMinutes').addEventListener('change',()=>resetGame());
  $('whiteName').addEventListener('change',()=>{if (!finished) updateStatus();});
  $('blackName').addEventListener('change',()=>{if (!finished) updateStatus();});
  promotionDialog.addEventListener('close',()=>{
    if (pendingPromotion) {pendingPromotion=null;clearSelection();renderBoard();}
  });

  // The clock is deliberately local: it uses the device's monotonic elapsed time and never contacts a server.
  resetGame();
})();
