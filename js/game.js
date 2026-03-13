/**
 * 게임 흐름: 착수, 턴, 클릭 처리
 */
import { BLACK, WHITE } from './constants.js';
import { createBoard, boardFull, snap, inBound, getFirstEmptyCell } from './board.js';
import { checkWin, forbidden } from './rules.js';
import { draw } from './draw.js';
import { drawWinLine } from './draw.js';
import { bestMove, resetAI } from './ai.js';

export let board;
/** 착수 순서 기록 (오프닝 북용) */
export let moveHistory = [];
export let turn;
export let gameOver;
export let aiThinking;
export let aiFirst = false;
/** true면 AI 흑 선공이지만 첫 수 위치는 사용자가 클릭으로 지정 */
export let aiFirstCustom = false;
/** AI 선공(custom) 모드에서 첫 수 위치 대기 중 */
export let waitingForFirstMovePosition = false;
/** 가장 최근에 둔 수 (기존 호환) */
export let lastMove = null;
/** 플레이어가 둔 마지막 수 [r, c] */
export let lastMoveHuman = null;
/** AI가 둔 마지막 수 [r, c] */
export let lastMoveAI = null;

let toastTimerId = null;

function showToast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
}

function hideToast() {
  const el = document.getElementById('toast');
  if (!el) return;
  el.classList.remove('show');
}

/** AI 선공이면 AI=흑, 플레이어=백 / 아니면 AI=백, 플레이어=흑 */
export function getAiColor() {
  return aiFirst ? BLACK : WHITE;
}
export function getHumanColor() {
  return aiFirst ? WHITE : BLACK;
}

export function doPlace(b, r, c, color) {
  b[r][c] = color;
}

export function resetGame() {
  board = createBoard();
  moveHistory = [];
  turn = BLACK; // 선공은 항상 흑
  gameOver = false;
  aiThinking = false;
  lastMove = null;
  lastMoveHuman = null;
  lastMoveAI = null;
  waitingForFirstMovePosition = false;
  hideToast();
  resetAI();
  draw(getCtx(), board, lastMoveHuman, lastMoveAI, turn, gameOver);
  updateLegend();
  updateFirstButtons();
  if (aiFirst && aiFirstCustom) {
    waitingForFirstMovePosition = true;
    setStatus('흑(AI)의 첫 수 위치를 클릭하세요');
  } else if (aiFirst) {
    setStatus('흑(AI) 생각 중...');
    aiTurn();
  } else {
    setStatus('흑의 차례');
  }
}

function updateLegend() {
  const legendEl = document.getElementById('legend');
  const infoEl = document.getElementById('info');
  if (legendEl) {
    legendEl.innerHTML = (aiFirst
      ? '● 흑=AI &nbsp;○ 백=플레이어'
      : '● 흑=플레이어 &nbsp;○ 백=AI')
      + ' &nbsp;✕ 금수 &nbsp;| &nbsp;○ 주황=내 마지막 &nbsp;○ 청록=AI 마지막';
  }
  if (infoEl) {
    infoEl.textContent = aiFirst
      ? '흑(AI) vs 백(플레이어) · 렌주 규칙 · 흑 금수 적용'
      : '흑(플레이어) vs 백(AI) · 렌주 규칙 · 흑 금수 적용';
  }
}

let _ctx = null;
export function setCanvasContext(ctx) {
  _ctx = ctx;
}
function getCtx() {
  return _ctx;
}

export function setStatus(t) {
  document.getElementById('status').textContent = t;
}

export function afterPlace(r, c, color) {
  moveHistory.push([r, c]);
  lastMove = [r, c];
  if (color === getAiColor()) lastMoveAI = [r, c];
  else lastMoveHuman = [r, c];
  draw(getCtx(), board, lastMoveHuman, lastMoveAI, turn, gameOver);
  if (checkWin(board, r, c, color)) {
    gameOver = true;
    const isAiWin = color === getAiColor();
    const colorName = color === BLACK ? '흑' : '백';
    setStatus(`${colorName}(${isAiWin ? 'AI' : '플레이어'}) 승리! 🎉`);
    drawWinLine(getCtx(), board, r, c, color);
    hideToast();
    return;
  }
  if (boardFull(board)) {
    gameOver = true;
    setStatus('무승부!');
    hideToast();
    return;
  }
  turn = 3 - color;
  if (turn === getAiColor()) aiTurn();
  else setStatus(turn === BLACK ? '흑의 차례' : '백의 차례');
}

export function aiTurn() {
  const aiColor = getAiColor();
  setStatus(aiColor === BLACK ? '흑(AI) 생각 중...' : '백(AI) 생각 중...');
  aiThinking = true;
  showToast(aiColor === BLACK ? '흑(AI)이 수를 계산 중입니다…' : '백(AI)이 수를 계산 중입니다…');
  setTimeout(() => {
    try {
      const [r, c] = bestMove(board, aiColor, moveHistory);
      doPlace(board, r, c, aiColor);
      afterPlace(r, c, aiColor);
    } catch (err) {
      console.error('AI 수 계산 중 오류:', err);
      setStatus('AI 오류 발생, 복구 시도…');
      try {
        const [fr, fc] = getFirstEmptyCell(board);
        doPlace(board, fr, fc, aiColor);
        afterPlace(fr, fc, aiColor);
        setStatus(aiColor === BLACK ? '백의 차례' : '흑의 차례');
      } catch (e2) {
        console.error('AI 복구 실패:', e2);
        setStatus('AI 오류 발생');
      }
      aiThinking = false;
      hideToast();
      return;
    }
    aiThinking = false;
    hideToast();
  }, 20);
}

/** 화면 좌표 → 캔버스 좌표 (반응형 스케일 반영) */
function toCanvasCoords(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    canvasX: (clientX - rect.left) * scaleX,
    canvasY: (clientY - rect.top) * scaleY,
  };
}

function handleCanvasPoint(canvas, clientX, clientY) {
  const { canvasX, canvasY } = toCanvasCoords(canvas, clientX, clientY);
  const col = snap(canvasX);
  const row = snap(canvasY);
  if (!inBound(row, col) || board[row][col] !== 0) return;

  // AI 선공(custom): 첫 수 위치만 사용자가 지정
  if (waitingForFirstMovePosition) {
    doPlace(board, row, col, BLACK);
    moveHistory.push([row, col]);
    lastMove = [row, col];
    lastMoveAI = [row, col];
    turn = WHITE;
    waitingForFirstMovePosition = false;
    draw(getCtx(), board, lastMoveHuman, lastMoveAI, turn, gameOver);
    setStatus('백의 차례');
    return;
  }

  const humanColor = getHumanColor();
  if (gameOver || aiThinking || turn !== humanColor) return;
  if (humanColor === BLACK && forbidden(board, row, col)) {
    setStatus('금수! 다른 곳에 두세요 ✕');
    return;
  }
  doPlace(board, row, col, humanColor);
  afterPlace(row, col, humanColor);
}

export function setupClick(canvas) {
  canvas.addEventListener('click', (e) => {
    handleCanvasPoint(canvas, e.clientX, e.clientY);
  });
  canvas.addEventListener(
    'touchend',
    (e) => {
      if (e.changedTouches && e.changedTouches[0]) {
        e.preventDefault();
        const t = e.changedTouches[0];
        handleCanvasPoint(canvas, t.clientX, t.clientY);
      }
    },
    { passive: false }
  );
}

function updateFirstButtons() {
  const btnFirst = document.getElementById('btnFirst');
  const btnFirstCustom = document.getElementById('btnFirstCustom');
  if (btnFirst) btnFirst.textContent = aiFirst && !aiFirstCustom ? '내가 선공' : 'AI 선공';
  if (btnFirstCustom) {
    btnFirstCustom.classList.toggle('active', aiFirstCustom);
  }
}

export function toggleFirst() {
  aiFirst = !aiFirst;
  aiFirstCustom = false;
  resetGame();
}

/** AI 선공 + 첫 수 위치를 사용자가 클릭으로 지정 */
export function setFirstCustom() {
  aiFirst = true;
  aiFirstCustom = true;
  resetGame();
}
