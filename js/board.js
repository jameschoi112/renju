/**
 * 보드 상태 및 좌표 유틸
 */
import { N, PAD, CELL, EMPTY } from './constants.js';

/** 픽셀 → 격자 인덱스 */
export function snap(px) {
  return Math.round((px - PAD) / CELL);
}

/** 격자 인덱스 → 픽셀 좌표 */
export function pt(i) {
  return PAD + i * CELL;
}

export function inBound(r, c) {
  return r >= 0 && r < N && c >= 0 && c < N;
}

/** 빈 15x15 보드 생성 */
export function createBoard() {
  return Array.from({ length: N }, () => new Int8Array(N));
}

/** 보드 딥 카피 */
export function copyBoard(board) {
  return board.map((row) => new Int8Array(row));
}

export function boardFull(board) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] !== EMPTY) return false;
    }
  }
  return true;
}
