
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const hintEl = document.getElementById("hint");
const clockRedEl = document.getElementById("clock-red");
const clockBlackEl = document.getElementById("clock-black");
const btnUndo = document.getElementById("btn-undo");
const btnSettings = document.getElementById("btn-settings");
const btnSound = document.getElementById("btn-sound");
const btnNew = document.getElementById("btn-new");
const btnSwap = document.getElementById("btn-swap");
const btnClose = document.getElementById("btn-close");
const btnCloseBottom = document.getElementById("btn-close-bottom");
const settingsOverlay = document.getElementById("settings-overlay");
const modeOptions = document.getElementById("mode-options");
const levelOptions = document.getElementById("level-options");
const difficultyGroup = document.getElementById("difficulty-group");
const inputRed = document.getElementById("input-red");
const inputBlack = document.getElementById("input-black");
const nameRedEl = document.getElementById("name-red");
const nameBlackEl = document.getElementById("name-black");
const resultOverlay = document.getElementById("result-overlay");
const resultTitle = document.getElementById("result-title");
const resultSub = document.getElementById("result-sub");
const btnResultClose = document.getElementById("btn-result-close");

const COLS = 9;
const ROWS = 10;
const RED = "red";
const BLACK = "black";
const STORAGE_KEY = "xiangqi_h5_state_v2";

const PIECES = {
  r: { name: "车" },
  n: { name: "马" },
  b: { name: "相" },
  a: { name: "仕" },
  k: { name: "帅" },
  c: { name: "炮" },
  p: { name: "兵" }
};

const PIECES_BLACK = {
  r: { name: "车" },
  n: { name: "马" },
  b: { name: "象" },
  a: { name: "士" },
  k: { name: "将" },
  c: { name: "炮" },
  p: { name: "卒" }
};

const VALUES = {
  k: 10000,
  r: 500,
  n: 270,
  b: 250,
  a: 250,
  c: 350,
  p: 100
};

const state = {
  board: [],
  turn: RED,
  selected: null,
  legalMoves: [],
  history: [],
  timers: {
    red: 600,
    black: 600
  },
  timerId: null,
  gameOver: false,
  lastMove: null,
  lastMoveAt: 0,
  anim: null,
  ai: {
    enabled: true,
    side: BLACK,
    level: 3,
    thinking: false
  },
  names: {
    red: "红方",
    black: "黑方"
  }
};

const sound = {
  enabled: true,
  ctx: null
};

let rafId = null;
let hintTimer = null;

function initBoard() {
  const empty = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  function place(row, col, side, type) {
    const name = side === RED ? PIECES[type].name : PIECES_BLACK[type].name;
    empty[row][col] = { side, type, name };
  }

  // Black
  place(0, 0, BLACK, "r");
  place(0, 1, BLACK, "n");
  place(0, 2, BLACK, "b");
  place(0, 3, BLACK, "a");
  place(0, 4, BLACK, "k");
  place(0, 5, BLACK, "a");
  place(0, 6, BLACK, "b");
  place(0, 7, BLACK, "n");
  place(0, 8, BLACK, "r");
  place(2, 1, BLACK, "c");
  place(2, 7, BLACK, "c");
  place(3, 0, BLACK, "p");
  place(3, 2, BLACK, "p");
  place(3, 4, BLACK, "p");
  place(3, 6, BLACK, "p");
  place(3, 8, BLACK, "p");

  // Red
  place(9, 0, RED, "r");
  place(9, 1, RED, "n");
  place(9, 2, RED, "b");
  place(9, 3, RED, "a");
  place(9, 4, RED, "k");
  place(9, 5, RED, "a");
  place(9, 6, RED, "b");
  place(9, 7, RED, "n");
  place(9, 8, RED, "r");
  place(7, 1, RED, "c");
  place(7, 7, RED, "c");
  place(6, 0, RED, "p");
  place(6, 2, RED, "p");
  place(6, 4, RED, "p");
  place(6, 6, RED, "p");
  place(6, 8, RED, "p");

  state.board = empty;
}

function resetGame() {
  initBoard();
  state.turn = RED;
  state.selected = null;
  state.legalMoves = [];
  state.history = [];
  state.timers = { red: 600, black: 600 };
  state.gameOver = false;
  state.lastMove = null;
  state.lastMoveAt = 0;
  state.anim = null;
  state.ai.thinking = false;
  updateClocks();
  updateHint("红方先走");
  scheduleRender();
  saveState();
  maybeAIMove();
}

function setupCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawBoard() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const margin = Math.min(w, h) * 0.07;
  const cellW = (w - 2 * margin) / (COLS - 1);
  const cellH = (h - 2 * margin) / (ROWS - 1);

  ctx.clearRect(0, 0, w, h);

  const wood = ctx.createLinearGradient(0, 0, w, h);
  wood.addColorStop(0, "#e8c992");
  wood.addColorStop(1, "#d7b077");
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#8a5a2e";
  ctx.lineWidth = 2;

  for (let r = 0; r < ROWS; r++) {
    const y = margin + r * cellH;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(w - margin, y);
    ctx.stroke();
  }

  for (let c = 0; c < COLS; c++) {
    const x = margin + c * cellW;
    ctx.beginPath();
    if (c === 0 || c === COLS - 1) {
      ctx.moveTo(x, margin);
      ctx.lineTo(x, h - margin);
    } else {
      ctx.moveTo(x, margin);
      ctx.lineTo(x, margin + 4 * cellH);
      ctx.moveTo(x, margin + 5 * cellH);
      ctx.lineTo(x, h - margin);
    }
    ctx.stroke();
  }

  drawPalace(margin, cellW, cellH, 0);
  drawPalace(margin, cellW, cellH, 7);

  ctx.fillStyle = "#8a5a2e";
  ctx.font = `bold ${Math.floor(cellH * 0.6)}px ${getComputedStyle(document.body).fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("楚河", margin + cellW * 2, margin + cellH * 4.5);
  ctx.fillText("汉界", margin + cellW * 6, margin + cellH * 4.5);

  return { margin, cellW, cellH };
}

function drawPalace(margin, cellW, cellH, startRow) {
  const startCol = 3;
  const endCol = 5;
  const x1 = margin + startCol * cellW;
  const x2 = margin + endCol * cellW;
  const y1 = margin + startRow * cellH;
  const y2 = margin + (startRow + 2) * cellH;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.moveTo(x2, y1);
  ctx.lineTo(x1, y2);
  ctx.stroke();
}

function drawLastMove(layout, now) {
  if (!state.lastMove || !state.lastMoveAt) return;
  const age = now - state.lastMoveAt;
  if (age > 1600) return;

  const pulse = 0.5 + 0.5 * Math.sin(age / 120 * Math.PI);
  const alpha = 0.2 + pulse * 0.5;
  const { margin, cellW, cellH } = layout;
  const radius = Math.min(cellW, cellH) * 0.48;

  ctx.save();
  ctx.strokeStyle = `rgba(242, 180, 71, ${alpha})`;
  ctx.lineWidth = 6;

  const fromX = margin + state.lastMove.from.col * cellW;
  const fromY = margin + state.lastMove.from.row * cellH;
  const toX = margin + state.lastMove.to.col * cellW;
  const toY = margin + state.lastMove.to.row * cellH;

  ctx.beginPath();
  ctx.arc(fromX, fromY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(toX, toY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function shouldFlipPiece(side) {
  return state.ai.enabled === false && side === BLACK;
}

function drawPieceText(x, y, piece, flip) {
  ctx.fillStyle = piece.side === RED ? "#c7372d" : "#2c3e50";
  if (!flip) {
    ctx.fillText(piece.name, x, y + 1);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI);
  ctx.fillText(piece.name, 0, 1);
  ctx.restore();
}

function drawPieces(layout, now) {
  const { margin, cellW, cellH } = layout;
  const radius = Math.min(cellW, cellH) * 0.42;

  let animActive = false;
  let animT = 1;
  let animMove = null;
  let animPiece = null;

  if (state.anim) {
    const elapsed = now - state.anim.start;
    if (elapsed < state.anim.duration) {
      animActive = true;
      animT = elapsed / state.anim.duration;
      animMove = state.anim.move;
      animPiece = state.anim.piece;
    } else {
      state.anim = null;
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.floor(radius * 0.9)}px ${getComputedStyle(document.body).fontFamily}`;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (animActive && animMove && animMove.to.row === r && animMove.to.col === c) {
        continue;
      }
      const piece = state.board[r][c];
      if (!piece) continue;
      const x = margin + c * cellW;
      const y = margin + r * cellH;

      drawPieceCircle(x, y, radius, piece.side);
      drawPieceText(x, y, piece, shouldFlipPiece(piece.side));
    }
  }

  if (animActive && animMove && animPiece) {
    const ease = 1 - Math.pow(1 - animT, 3);
    const fromX = margin + animMove.from.col * cellW;
    const fromY = margin + animMove.from.row * cellH;
    const toX = margin + animMove.to.col * cellW;
    const toY = margin + animMove.to.row * cellH;
    const x = fromX + (toX - fromX) * ease;
    const y = fromY + (toY - fromY) * ease;

    drawPieceCircle(x, y, radius, animPiece.side);
    drawPieceText(x, y, animPiece, shouldFlipPiece(animPiece.side));
  }

  if (state.selected) {
    const { row, col } = state.selected;
    const x = margin + col * cellW;
    const y = margin + row * cellH;
    ctx.strokeStyle = "#f2b447";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const move of state.legalMoves) {
    const x = margin + move.to.col * cellW;
    const y = margin + move.to.row * cellH;
    if (move.capture) {
      ctx.strokeStyle = "#f04b3a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPieceCircle(x, y, r, side) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#f3e1b6";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 4;
  ctx.strokeStyle = side === RED ? "#c7372d" : "#2c3e50";
  ctx.stroke();
}

function render(now = performance.now()) {
  const layout = drawBoard();
  drawLastMove(layout, now);
  drawPieces(layout, now);
}

function scheduleRender() {
  if (rafId) return;
  rafId = requestAnimationFrame(renderFrame);
}

function renderFrame(now) {
  rafId = null;
  render(now);
  if (shouldAnimate(now)) {
    scheduleRender();
  }
}

function shouldAnimate(now) {
  if (state.anim && now - state.anim.start < state.anim.duration) return true;
  if (state.lastMoveAt && now - state.lastMoveAt < 1600) return true;
  return false;
}

function inBounds(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function cloneBoard(board) {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

function getLegalMoves(row, col) {
  const piece = state.board[row][col];
  if (!piece || piece.side !== state.turn) return [];

  const pseudo = getPseudoMoves(piece, row, col, state.board);
  const legal = [];

  for (const move of pseudo) {
    const boardCopy = cloneBoard(state.board);
    applyMove(boardCopy, move);
    if (!isInCheck(piece.side, boardCopy)) {
      legal.push(move);
    }
  }

  return legal;
}

function getPseudoMoves(piece, row, col, board) {
  switch (piece.type) {
    case "r":
      return rookMoves(piece, row, col, board);
    case "n":
      return horseMoves(piece, row, col, board);
    case "b":
      return elephantMoves(piece, row, col, board);
    case "a":
      return advisorMoves(piece, row, col, board);
    case "k":
      return kingMoves(piece, row, col, board);
    case "c":
      return cannonMoves(piece, row, col, board);
    case "p":
      return pawnMoves(piece, row, col, board);
    default:
      return [];
  }
}
function rookMoves(piece, row, col, board) {
  const moves = [];
  const dirs = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 }
  ];

  for (const { dr, dc } of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      if (board[r][c]) {
        if (board[r][c].side !== piece.side) {
          moves.push(makeMove(row, col, r, c, true));
        }
        break;
      }
      moves.push(makeMove(row, col, r, c, false));
      r += dr;
      c += dc;
    }
  }
  return moves;
}

function cannonMoves(piece, row, col, board) {
  const moves = [];
  const dirs = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 }
  ];

  for (const { dr, dc } of dirs) {
    let r = row + dr;
    let c = col + dc;
    let screenFound = false;
    while (inBounds(r, c)) {
      if (!screenFound) {
        if (board[r][c]) {
          screenFound = true;
        } else {
          moves.push(makeMove(row, col, r, c, false));
        }
      } else if (board[r][c]) {
        if (board[r][c].side !== piece.side) {
          moves.push(makeMove(row, col, r, c, true));
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return moves;
}

function horseMoves(piece, row, col, board) {
  const moves = [];
  const steps = [
    { dr: -2, dc: -1, lr: -1, lc: 0 },
    { dr: -2, dc: 1, lr: -1, lc: 0 },
    { dr: 2, dc: -1, lr: 1, lc: 0 },
    { dr: 2, dc: 1, lr: 1, lc: 0 },
    { dr: -1, dc: -2, lr: 0, lc: -1 },
    { dr: 1, dc: -2, lr: 0, lc: -1 },
    { dr: -1, dc: 2, lr: 0, lc: 1 },
    { dr: 1, dc: 2, lr: 0, lc: 1 }
  ];

  for (const { dr, dc, lr, lc } of steps) {
    const legR = row + lr;
    const legC = col + lc;
    const r = row + dr;
    const c = col + dc;
    if (!inBounds(r, c)) continue;
    if (board[legR][legC]) continue;
    if (!board[r][c]) {
      moves.push(makeMove(row, col, r, c, false));
    } else if (board[r][c].side !== piece.side) {
      moves.push(makeMove(row, col, r, c, true));
    }
  }
  return moves;
}

function elephantMoves(piece, row, col, board) {
  const moves = [];
  const steps = [
    { dr: -2, dc: -2 },
    { dr: -2, dc: 2 },
    { dr: 2, dc: -2 },
    { dr: 2, dc: 2 }
  ];

  for (const { dr, dc } of steps) {
    const r = row + dr;
    const c = col + dc;
    const mr = row + dr / 2;
    const mc = col + dc / 2;
    if (!inBounds(r, c)) continue;
    if (board[mr][mc]) continue;

    if (piece.side === RED && r <= 4) continue;
    if (piece.side === BLACK && r >= 5) continue;

    if (!board[r][c]) {
      moves.push(makeMove(row, col, r, c, false));
    } else if (board[r][c].side !== piece.side) {
      moves.push(makeMove(row, col, r, c, true));
    }
  }
  return moves;
}

function advisorMoves(piece, row, col, board) {
  const moves = [];
  const steps = [
    { dr: -1, dc: -1 },
    { dr: -1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: 1, dc: 1 }
  ];

  for (const { dr, dc } of steps) {
    const r = row + dr;
    const c = col + dc;
    if (!inBounds(r, c)) continue;
    if (!inPalace(piece.side, r, c)) continue;

    if (!board[r][c]) {
      moves.push(makeMove(row, col, r, c, false));
    } else if (board[r][c].side !== piece.side) {
      moves.push(makeMove(row, col, r, c, true));
    }
  }
  return moves;
}

function kingMoves(piece, row, col, board) {
  const moves = [];
  const steps = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 }
  ];

  for (const { dr, dc } of steps) {
    const r = row + dr;
    const c = col + dc;
    if (!inBounds(r, c)) continue;
    if (!inPalace(piece.side, r, c)) continue;

    if (!board[r][c]) {
      moves.push(makeMove(row, col, r, c, false));
    } else if (board[r][c].side !== piece.side) {
      moves.push(makeMove(row, col, r, c, true));
    }
  }
  return moves;
}

function pawnMoves(piece, row, col, board) {
  const moves = [];
  const forward = piece.side === RED ? -1 : 1;
  const rForward = row + forward;

  if (inBounds(rForward, col)) {
    if (!board[rForward][col]) {
      moves.push(makeMove(row, col, rForward, col, false));
    } else if (board[rForward][col].side !== piece.side) {
      moves.push(makeMove(row, col, rForward, col, true));
    }
  }

  const crossed = piece.side === RED ? row <= 4 : row >= 5;
  if (crossed) {
    for (const dc of [-1, 1]) {
      const c = col + dc;
      if (!inBounds(row, c)) continue;
      if (!board[row][c]) {
        moves.push(makeMove(row, col, row, c, false));
      } else if (board[row][c].side !== piece.side) {
        moves.push(makeMove(row, col, row, c, true));
      }
    }
  }

  return moves;
}

function inPalace(side, row, col) {
  if (col < 3 || col > 5) return false;
  if (side === RED) return row >= 7 && row <= 9;
  return row >= 0 && row <= 2;
}

function makeMove(fromRow, fromCol, toRow, toCol, capture) {
  return {
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    capture
  };
}

function applyMove(board, move) {
  const piece = board[move.from.row][move.from.col];
  board[move.from.row][move.from.col] = null;
  board[move.to.row][move.to.col] = piece;
}

function undoBoardMove(board, move, captured) {
  const piece = board[move.to.row][move.to.col];
  board[move.to.row][move.to.col] = captured;
  board[move.from.row][move.from.col] = piece;
}

function findKing(side, board) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (piece && piece.side === side && piece.type === "k") {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

function isInCheck(side, board) {
  const king = findKing(side, board);
  if (!king) return true;
  const enemy = side === RED ? BLACK : RED;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (!piece || piece.side !== enemy) continue;
      if (attacksSquare(piece, r, c, king.row, king.col, board)) {
        return true;
      }
    }
  }
  return false;
}

function attacksSquare(piece, pr, pc, tr, tc, board) {
  switch (piece.type) {
    case "r":
      return attacksRook(pr, pc, tr, tc, board);
    case "c":
      return attacksCannon(pr, pc, tr, tc, board);
    case "n":
      return attacksHorse(pr, pc, tr, tc, board);
    case "b":
      return attacksElephant(piece.side, pr, pc, tr, tc, board);
    case "a":
      return attacksAdvisor(piece.side, pr, pc, tr, tc);
    case "k":
      return attacksKing(pr, pc, tr, tc, board);
    case "p":
      return attacksPawn(piece.side, pr, pc, tr, tc);
    default:
      return false;
  }
}

function attacksRook(pr, pc, tr, tc, board) {
  if (pr !== tr && pc !== tc) return false;
  const dr = tr === pr ? 0 : tr > pr ? 1 : -1;
  const dc = tc === pc ? 0 : tc > pc ? 1 : -1;
  let r = pr + dr;
  let c = pc + dc;
  while (r !== tr || c !== tc) {
    if (board[r][c]) return false;
    r += dr;
    c += dc;
  }
  return true;
}

function attacksCannon(pr, pc, tr, tc, board) {
  if (pr !== tr && pc !== tc) return false;
  const dr = tr === pr ? 0 : tr > pr ? 1 : -1;
  const dc = tc === pc ? 0 : tc > pc ? 1 : -1;
  let r = pr + dr;
  let c = pc + dc;
  let screens = 0;
  while (r !== tr || c !== tc) {
    if (board[r][c]) screens++;
    r += dr;
    c += dc;
  }
  return screens === 1;
}

function attacksHorse(pr, pc, tr, tc, board) {
  const dr = tr - pr;
  const dc = tc - pc;
  const absR = Math.abs(dr);
  const absC = Math.abs(dc);
  if (!((absR === 2 && absC === 1) || (absR === 1 && absC === 2))) return false;
  const legR = pr + (absR === 2 ? dr / 2 : 0);
  const legC = pc + (absC === 2 ? dc / 2 : 0);
  return !board[legR][legC];
}

function attacksElephant(side, pr, pc, tr, tc, board) {
  const dr = tr - pr;
  const dc = tc - pc;
  if (Math.abs(dr) !== 2 || Math.abs(dc) !== 2) return false;
  const mr = pr + dr / 2;
  const mc = pc + dc / 2;
  if (board[mr][mc]) return false;
  if (side === RED && tr <= 4) return false;
  if (side === BLACK && tr >= 5) return false;
  return true;
}

function attacksAdvisor(side, pr, pc, tr, tc) {
  const dr = Math.abs(tr - pr);
  const dc = Math.abs(tc - pc);
  if (dr !== 1 || dc !== 1) return false;
  return inPalace(side, tr, tc);
}

function attacksKing(pr, pc, tr, tc, board) {
  const dr = Math.abs(tr - pr);
  const dc = Math.abs(tc - pc);
  if (dr + dc === 1) return true;
  if (pc !== tc) return false;
  let r = pr + (tr > pr ? 1 : -1);
  while (r !== tr) {
    if (board[r][pc]) return false;
    r += tr > pr ? 1 : -1;
  }
  return true;
}

function attacksPawn(side, pr, pc, tr, tc) {
  const dr = tr - pr;
  const dc = tc - pc;
  const forward = side === RED ? -1 : 1;
  if (dr === forward && dc === 0) return true;
  const crossed = side === RED ? pr <= 4 : pr >= 5;
  if (crossed && dr === 0 && Math.abs(dc) === 1) return true;
  return false;
}
function listAllLegalMoves(side, board) {
  const moves = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (!piece || piece.side !== side) continue;
      const pseudo = getPseudoMoves(piece, r, c, board);
      for (const move of pseudo) {
        const captured = board[move.to.row][move.to.col];
        applyMove(board, move);
        if (!isInCheck(side, board)) {
          moves.push(move);
        }
        undoBoardMove(board, move, captured);
      }
    }
  }
  return moves;
}

function handlePointer(evt) {
  if (state.gameOver) return;
  if (state.ai.enabled && state.turn === state.ai.side) return;

  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const margin = Math.min(w, h) * 0.07;
  const cellW = (w - 2 * margin) / (COLS - 1);
  const cellH = (h - 2 * margin) / (ROWS - 1);

  const col = Math.round((x - margin) / cellW);
  const row = Math.round((y - margin) / cellH);
  if (!inBounds(row, col)) return;

  const distanceX = Math.abs(x - (margin + col * cellW));
  const distanceY = Math.abs(y - (margin + row * cellH));
  if (distanceX > cellW * 0.45 || distanceY > cellH * 0.45) return;

  const targetPiece = state.board[row][col];

  if (state.selected) {
    const move = state.legalMoves.find(m => m.to.row === row && m.to.col === col);
    if (move) {
      commitMove(move);
      return;
    }
  }

  if (targetPiece && targetPiece.side === state.turn) {
    state.selected = { row, col };
    state.legalMoves = getLegalMoves(row, col);
  } else {
    state.selected = null;
    state.legalMoves = [];
  }

  scheduleRender();
}

function commitMove(move) {
  const piece = state.board[move.from.row][move.from.col];
  const captured = state.board[move.to.row][move.to.col];

  state.history.push({ move, captured, piece });
  applyMove(state.board, move);

  state.selected = null;
  state.legalMoves = [];
  state.turn = state.turn === RED ? BLACK : RED;
  state.lastMove = move;
  state.lastMoveAt = performance.now();
  state.anim = {
    start: performance.now(),
    duration: 180,
    move,
    piece: { ...piece }
  };

  const isCheckNow = isInCheck(state.turn, state.board);
  playMoveSound(!!captured, isCheckNow, false);

  updateHint();
  switchTimer();
  scheduleRender();

  checkGameOver();
  if (!state.gameOver && state.ai.enabled && piece.side === state.ai.side) {
    flashHint(`AI走子：${formatMoveLabel(move)}`, 1200);
  }

  saveState();
  maybeAIMove();
}

function undoMove() {
  if (!state.history.length || state.gameOver) return;

  doUndo();
  if (state.ai.enabled && state.turn === state.ai.side && state.history.length) {
    doUndo();
  }

  updateHint();
  switchTimer();
  scheduleRender();
  saveState();
}

function doUndo() {
  const last = state.history.pop();
  const { move, captured } = last;
  const piece = state.board[move.to.row][move.to.col];
  state.board[move.to.row][move.to.col] = captured;
  state.board[move.from.row][move.from.col] = piece;
  state.turn = state.turn === RED ? BLACK : RED;
  state.selected = null;
  state.legalMoves = [];
  state.gameOver = false;
  state.lastMove = move;
  state.lastMoveAt = performance.now();
}

function updateHint(extra) {
  const sideLabel = state.turn === RED ? "红方" : "黑方";
  hintEl.textContent = extra || `${sideLabel}走棋`;
}

function flashHint(text, duration = 1200) {
  if (hintTimer) clearTimeout(hintTimer);
  hintEl.textContent = text;
  hintTimer = setTimeout(() => {
    updateHint();
  }, duration);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateClocks() {
  clockRedEl.textContent = formatTime(state.timers.red);
  clockBlackEl.textContent = formatTime(state.timers.black);
}

function startTimer() {
  if (state.timerId) return;
  state.timerId = setInterval(() => {
    if (state.gameOver) return;
    const key = state.turn === RED ? "red" : "black";
    state.timers[key] = Math.max(0, state.timers[key] - 1);
    updateClocks();
    if (state.timers[key] === 0) {
      state.gameOver = true;
      showResult(`${state.turn === RED ? state.names.black : state.names.red}胜`, "超时判负");
      playMoveSound(false, false, true);
      saveState();
    }
  }, 1000);
}

function switchTimer() {
  startTimer();
}

function checkGameOver() {
  const moves = listAllLegalMoves(state.turn, state.board);
  if (moves.length === 0) {
    const checked = isInCheck(state.turn, state.board);
    state.gameOver = true;
    const winner = state.turn === RED ? state.names.black : state.names.red;
    showResult(`${winner}胜`, checked ? "将死" : "无子可走");
    playMoveSound(false, checked, true);
  } else if (isInCheck(state.turn, state.board)) {
    hintEl.textContent = `${state.turn === RED ? "红方" : "黑方"}将军！`;
  }
}

function showResult(title, sub) {
  resultTitle.textContent = title;
  resultSub.textContent = sub;
  resultOverlay.classList.add("active");
  resultOverlay.setAttribute("aria-hidden", "false");
}

function hideResult() {
  resultOverlay.classList.remove("active");
  resultOverlay.setAttribute("aria-hidden", "true");
}

function evaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      let val = VALUES[piece.type] || 0;
      if (piece.type === "p") {
        val += piece.side === RED ? (6 - r) * 8 : (r - 3) * 8;
      }
      score += piece.side === RED ? val : -val;
    }
  }
  return score;
}

function orderMoves(moves, board) {
  return moves
    .map(m => {
      const captured = board[m.to.row][m.to.col];
      const capVal = captured ? VALUES[captured.type] : 0;
      return { move: m, score: capVal };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.move);
}

function getTimeLimit(level) {
  const limits = [150, 300, 600, 1000, 1600];
  return limits[Math.max(0, Math.min(4, level - 1))];
}

function getDepth(level) {
  const depths = [1, 2, 3, 4, 5];
  return depths[Math.max(0, Math.min(4, level - 1))];
}

function computeBestMove(side) {
  const level = state.ai.level;
  const maxDepth = getDepth(level);
  const timeLimit = getTimeLimit(level);
  const start = Date.now();

  let bestMove = null;

  const board = state.board;
  const moves = orderMoves(listAllLegalMoves(side, board), board);
  if (moves.length === 0) return null;

  for (let depth = 1; depth <= maxDepth; depth++) {
    let localBest = null;
    let localScore = -Infinity;

    for (const move of moves) {
      const captured = board[move.to.row][move.to.col];
      applyMove(board, move);
      const score = -negamax(side === RED ? BLACK : RED, depth - 1, -Infinity, Infinity, start, timeLimit);
      undoBoardMove(board, move, captured);

      if (score > localScore) {
        localScore = score;
        localBest = move;
      }

      if (Date.now() - start > timeLimit) break;
    }

    if (Date.now() - start > timeLimit) break;
    if (localBest) {
      bestMove = localBest;
    }
  }

  if (level <= 2 && moves.length > 1) {
    const randomPool = orderMoves(moves, board).slice(0, level === 1 ? 5 : 3);
    if (randomPool.length) {
      bestMove = randomPool[Math.floor(Math.random() * randomPool.length)];
    }
  }

  return bestMove || moves[0];
}

function negamax(side, depth, alpha, beta, start, limit) {
  if (Date.now() - start > limit) {
    return (side === RED ? 1 : -1) * evaluateBoard(state.board);
  }

  if (depth === 0) {
    return (side === RED ? 1 : -1) * evaluateBoard(state.board);
  }

  const moves = orderMoves(listAllLegalMoves(side, state.board), state.board);
  if (!moves.length) {
    if (isInCheck(side, state.board)) {
      return -10000 - depth;
    }
    return 0;
  }

  let best = -Infinity;
  for (const move of moves) {
    const captured = state.board[move.to.row][move.to.col];
    applyMove(state.board, move);
    const score = -negamax(side === RED ? BLACK : RED, depth - 1, -beta, -alpha, start, limit);
    undoBoardMove(state.board, move, captured);

    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
    if (Date.now() - start > limit) break;
  }

  return best;
}

function maybeAIMove() {
  if (!state.ai.enabled) return;
  if (state.gameOver) return;
  if (state.turn !== state.ai.side) return;
  if (state.ai.thinking) return;

  state.ai.thinking = true;
  updateHint("AI思考中...");

  setTimeout(() => {
    const move = computeBestMove(state.ai.side);
    state.ai.thinking = false;
    if (move && !state.gameOver && state.turn === state.ai.side) {
      commitMove(move);
    } else {
      updateHint();
    }
  }, 80);
}

function setMode(mode) {
  state.ai.enabled = mode === "ai";
  updateModeUI();
  updateHint();
  scheduleRender();
  saveState();
  maybeAIMove();
}

function setLevel(level) {
  state.ai.level = level;
  updateLevelUI();
  saveState();
}

function updateModeUI() {
  const buttons = [...modeOptions.querySelectorAll(".segment-btn")];
  buttons.forEach(btn => {
    const active = btn.dataset.mode === (state.ai.enabled ? "ai" : "pvp");
    btn.classList.toggle("active", active);
  });
  difficultyGroup.style.display = state.ai.enabled ? "grid" : "none";
}

function updateLevelUI() {
  const buttons = [...levelOptions.querySelectorAll(".segment-btn")];
  buttons.forEach(btn => {
    const active = Number(btn.dataset.level) === state.ai.level;
    btn.classList.toggle("active", active);
  });
}

function applyNames() {
  const redName = inputRed.value.trim() || "红方";
  const blackName = inputBlack.value.trim() || "黑方";
  state.names.red = redName;
  state.names.black = blackName;
  nameRedEl.textContent = redName;
  nameBlackEl.textContent = blackName;
  saveState();
}

function formatMoveLabel(move) {
  const from = `${move.from.col + 1}-${10 - move.from.row}`;
  const to = `${move.to.col + 1}-${10 - move.to.row}`;
  return `${from}→${to}`;
}

function ensureAudio() {
  if (!sound.enabled) return;
  if (!sound.ctx) {
    sound.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sound.ctx.state === "suspended") {
    sound.ctx.resume();
  }
}

function playTone(freq, duration, type = "sine") {
  if (!sound.enabled) return;
  ensureAudio();
  if (!sound.ctx) return;
  const ctxAudio = sound.ctx;
  const osc = ctxAudio.createOscillator();
  const gain = ctxAudio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.0001;
  osc.connect(gain).connect(ctxAudio.destination);
  const now = ctxAudio.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
  osc.start(now);
  osc.stop(now + duration / 1000 + 0.05);
}

function playMoveSound(capture, check, gameOver) {
  if (!sound.enabled) return;
  if (gameOver) {
    playTone(220, 400, "square");
    setTimeout(() => playTone(180, 300, "square"), 120);
    return;
  }
  if (capture) {
    playTone(520, 140, "triangle");
    return;
  }
  if (check) {
    playTone(760, 160, "sawtooth");
    return;
  }
  playTone(420, 100, "sine");
}

function toggleSound() {
  sound.enabled = !sound.enabled;
  btnSound.textContent = sound.enabled ? "🔊" : "🔈";
  if (sound.enabled) {
    ensureAudio();
    playTone(440, 80, "sine");
  }
  saveState();
}

function openSettings() {
  settingsOverlay.classList.add("active");
  settingsOverlay.setAttribute("aria-hidden", "false");
}

function closeSettings() {
  settingsOverlay.classList.remove("active");
  settingsOverlay.setAttribute("aria-hidden", "true");
}
function saveState() {
  const payload = {
    board: state.board,
    turn: state.turn,
    history: state.history,
    timers: state.timers,
    gameOver: state.gameOver,
    lastMove: state.lastMove,
    lastMoveAt: state.lastMoveAt,
    ai: state.ai,
    names: state.names,
    sound: { enabled: sound.enabled }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    if (!data || !data.board) return false;
    state.board = data.board;
    state.turn = data.turn || RED;
    state.history = data.history || [];
    state.timers = data.timers || { red: 600, black: 600 };
    state.gameOver = !!data.gameOver;
    state.lastMove = data.lastMove || null;
    state.lastMoveAt = data.lastMoveAt || 0;
    state.ai = data.ai || state.ai;
    state.names = data.names || state.names;
    sound.enabled = data.sound ? !!data.sound.enabled : true;
    return true;
  } catch {
    return false;
  }
}

function hydrateUI() {
  inputRed.value = state.names.red || "红方";
  inputBlack.value = state.names.black || "黑方";
  nameRedEl.textContent = state.names.red || "红方";
  nameBlackEl.textContent = state.names.black || "黑方";
  btnSound.textContent = sound.enabled ? "🔊" : "🔈";
  updateModeUI();
  updateLevelUI();
}

modeOptions.addEventListener("click", (evt) => {
  const btn = evt.target.closest(".segment-btn");
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (!mode) return;
  setMode(mode);
});

levelOptions.addEventListener("click", (evt) => {
  const btn = evt.target.closest(".segment-btn");
  if (!btn) return;
  const level = Number(btn.dataset.level);
  if (!Number.isFinite(level)) return;
  setLevel(level);
});

inputRed.addEventListener("input", () => {
  applyNames();
});

inputBlack.addEventListener("input", () => {
  applyNames();
});

btnUndo.addEventListener("click", () => {
  undoMove();
});

btnSettings.addEventListener("click", () => {
  openSettings();
});

btnSound.addEventListener("click", () => {
  toggleSound();
});

btnNew.addEventListener("click", () => {
  resetGame();
});

btnSwap.addEventListener("click", () => {
  state.ai.side = state.ai.side === RED ? BLACK : RED;
  resetGame();
});

btnClose.addEventListener("click", () => {
  closeSettings();
});

btnCloseBottom.addEventListener("click", () => {
  closeSettings();
});

btnResultClose.addEventListener("click", () => {
  hideResult();
});

settingsOverlay.addEventListener("click", (evt) => {
  if (evt.target === settingsOverlay) {
    closeSettings();
  }
});

resultOverlay.addEventListener("click", (evt) => {
  if (evt.target === resultOverlay) {
    hideResult();
  }
});

canvas.addEventListener("pointerdown", handlePointer);
window.addEventListener("resize", () => {
  setupCanvas();
  scheduleRender();
});

document.body.addEventListener("pointerdown", () => {
  ensureAudio();
}, { once: true });

function init() {
  setupCanvas();
  if (!loadState()) {
    initBoard();
  }
  hydrateUI();
  updateClocks();
  if (state.gameOver) {
    updateHint("对局已结束");
  } else if (state.history.length === 0 && state.turn === RED) {
    updateHint("红方先走");
  } else {
    updateHint();
  }
  scheduleRender();
  if (state.gameOver) {
    showResult("对局结束", "继续可开始新局");
  } else {
    maybeAIMove();
  }
}

init();
