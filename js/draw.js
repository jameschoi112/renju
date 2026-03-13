/**
 * 캔버스 그리기: 보드, 돌, 금수, 승리선
 */
import { N, SIZE, BLACK } from './constants.js';
import { pt } from './board.js';
import { forbidden } from './rules.js';

const CELL = 38;

export function draw(ctx, board, lastMoveHuman, lastMoveAI, turn, gameOver) {
  ctx.clearRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = '#c8a060';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = '#7a5a20';
  ctx.lineWidth = 1;
  for (let i = 0; i < N; i++) {
    ctx.beginPath();
    ctx.moveTo(pt(i), pt(0));
    ctx.lineTo(pt(i), pt(N - 1));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pt(0), pt(i));
    ctx.lineTo(pt(N - 1), pt(i));
    ctx.stroke();
  }

  ctx.fillStyle = '#7a5a20';
  for (const i of [3, 7, 11]) {
    for (const j of [3, 7, 11]) {
      ctx.beginPath();
      ctx.arc(pt(j), pt(i), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (turn === BLACK && !gameOver) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (board[r][c] !== 0) continue;
        if (!forbidden(board, r, c)) continue;
        const x = pt(c), y = pt(r), s = 6;
        ctx.strokeStyle = '#cc2222';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - s, y - s);
        ctx.lineTo(x + s, y + s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + s, y - s);
        ctx.lineTo(x - s, y + s);
        ctx.stroke();
      }
    }
  }

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] === 0) continue;
      drawStone(ctx, pt(c), pt(r), board[r][c] === BLACK);
    }
  }

  // 마지막 수 표시: 돌을 그린 뒤에 돌 주변 원으로 표시 (돌에 가리지 않음)
  const markRad = CELL * 0.52;
  if (lastMoveHuman) {
    const [lr, lc] = lastMoveHuman;
    const x = pt(lc), y = pt(lr);
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, markRad, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (lastMoveAI) {
    const [lr, lc] = lastMoveAI;
    const x = pt(lc), y = pt(lr);
    ctx.strokeStyle = '#00b4d8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, markRad, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawStone(ctx, x, y, isBlack) {
  const rad = CELL * 0.44;
  const g = ctx.createRadialGradient(
    x - rad * 0.3, y - rad * 0.3, rad * 0.05,
    x, y, rad
  );
  if (isBlack) {
    g.addColorStop(0, '#666');
    g.addColorStop(1, '#000');
  } else {
    g.addColorStop(0, '#fff');
    g.addColorStop(1, '#ccc');
  }
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = isBlack ? '#000' : '#999';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

export function drawWinLine(ctx, board, r, c, color) {
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of DIRS) {
    const cells = [[r, c]];
    for (let d = 1; d < 6; d++) {
      const nr = r + dr * d, nc = c + dc * d;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === color) {
        cells.push([nr, nc]);
      } else break;
    }
    for (let d = 1; d < 6; d++) {
      const nr = r - dr * d, nc = c - dc * d;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === color) {
        cells.unshift([nr, nc]);
      } else break;
    }
    if (cells.length >= 5) {
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(pt(cells[0][1]), pt(cells[0][0]));
      for (let i = 1; i < cells.length; i++) {
        ctx.lineTo(pt(cells[i][1]), pt(cells[i][0]));
      }
      ctx.stroke();
      return;
    }
  }
}
