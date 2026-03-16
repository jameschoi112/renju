/**
 * Zobrist 해시 + Transposition Table (최상급 엔진용)
 */
import { N, BLACK, WHITE } from './constants.js';

const SIZE = N * N * 2;
const zobrist = [];
let seed = 0x12345678;
function nextRand() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) >>> 0;
}
for (let i = 0; i < SIZE; i++) zobrist.push(nextRand());

function index(r, c, color) {
  return (r * N + c) * 2 + (color - 1);
}

/** 보드 전체 Zobrist 해시 계산 */
export function getHash(b) {
  let h = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = b[r][c];
      if (cell !== 0) h ^= zobrist[index(r, c, cell)];
    }
  }
  return h >>> 0;
}

/** 한 수 반영 (놓을 때·없앨 때 동일 호출로 XOR) */
export function updateHash(h, r, c, color) {
  return (h ^ zobrist[index(r, c, color)]) >>> 0;
}

const TT_SIZE = 1 << 22; // 4M 엔트리 (히트율·품질 향상)
const TT_MASK = TT_SIZE - 1;
const Exact = 0;
const Lower = 1;
const Upper = 2;

const tt = new Array(TT_SIZE);

export function ttGet(h, depth, alpha, beta) {
  const e = tt[h & TT_MASK];
  if (!e || e.key !== h) return null;
  if (e.depth < depth) return null;
  const sc = e.score;
  if (e.flag === Exact) return sc;
  if (e.flag === Lower && sc >= beta) return sc;
  if (e.flag === Upper && sc <= alpha) return sc;
  return null;
}

export function ttPut(h, depth, score, flag, move) {
  const i = h & TT_MASK;
  if (!tt[i] || tt[i].depth <= depth) {
    tt[i] = { key: h, depth, score, flag, move };
  }
}

/** 저장된 bestMove 반환 (수 순서용) */
export function ttGetMove(h) {
  const e = tt[h & TT_MASK];
  if (!e || e.key !== h) return null;
  return e.move;
}

export function ttClear() {
  for (let i = 0; i < TT_SIZE; i++) tt[i] = null;
}
