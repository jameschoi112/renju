/**
 * AI: 최상급 엔진 — TT, 반복적 심화, VCF/VCT, 오프닝 북, 히스토리/킬러
 */
import { N, WHITE, BLACK, S, EMPTY } from './constants.js';
import { inBound, copyBoard, getFirstEmptyCell } from './board.js';
import { scanLine, lineType, checkWin, forbidden, countFours, countOpenFours, isInstantWin, forcedRepliesOpenFour, forcedRepliesOpenThree } from './rules.js';
import { patternScore, evalBoard } from './eval.js';
import { getHash, updateHash, ttGet, ttPut, ttGetMove, ttClear } from './hash.js';

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

// 히스토리 휴리스틱 (착수별 컷오프 기여도)
const history = Array.from({ length: N }, () => new Int32Array(N));
// 킬러 이동 (깊이별 최근 컷오프 수 2개)
const killer = [];
for (let i = 0; i <= 20; i++) killer.push([null, null]);

const MAX_CANDIDATES = 28;
const MAX_DEPTH = 12;
/** LMR: 이 수 이후부터 감소 탐색 시도. 감소 깊이로 컷되면 전깊이 재탐색 */
const LMR_MOVE_THRESHOLD = 3;
const LMR_MIN_DEPTH = 5;
const LMR_REDUCTION = 2;
/** AI 최대 연산 시간(ms). 초과 시 현재까지의 최선수 반환 (늘리면 더 강함, 전문가용 10000~15000) */
const MAX_AI_MS = 12000;
/** 백은 금수 없어 후보가 많아 탐색 폭이 넓음 → 같은 시간에 깊이 부족. 시간 보정 */
const WHITE_TIME_MULTIPLIER = 1.4;
/** 반복적 심화 aspiration window: 이전 깊이 최선 점수 ± 이 값으로 먼저 탐색 후 실패 시 전폭 재탐색 */
const ASPIRATION_MARGIN = 100000;
/** 막으면서 공격하는 수(이중목적) 보너스 — 우리 쪽 형태가 이 점수 이상일 때만 적용 */
const DUAL_PURPOSE_THRESHOLD = S.C2;
const DUAL_PURPOSE_BONUS = 80000;

/** 렌주 정석 오프닝 북 (확장: 26오프닝 + 변주 + 깊은 라인) */
const OPENING_BOOK_ENTRIES = [
  // --- 1수: 천원 ---
  ['', [7, 7]],
  // --- 2수: 직지(7,8) 대비 ---
  ['7,7', [7, 8]],
  ['7,7,7,8', [8, 7]],
  ['7,7,7,8,8,7', [6, 7]],
  ['7,7,7,8,6,7', [8, 7]],
  ['7,7,7,8,8,7,6,7', [8, 8]],
  ['7,7,7,8,8,7,8,8', [6, 6]],
  ['7,7,7,8,8,7,6,6', [6, 7]],
  ['7,7,7,8,8,7,6,7,8,8', [6, 6]],
  ['7,7,7,8,8,7,6,7,6,6', [8, 6]],
  ['7,7,7,8,8,7,8,8,6,6', [6, 7]],
  ['7,7,7,8,8,7,8,8,6,7', [5, 7]],
  ['7,7,7,8,8,7,6,6,6,7', [8, 8]],
  ['7,7,7,8,6,7,8,7', [6, 7]],
  ['7,7,7,8,6,7,8,7,6,7', [8, 8]],
  // 직지 6,6 대진 깊은 라인
  ['7,7,7,8,8,7,6,7,8,8,6,6', [5, 5]],
  ['7,7,7,8,8,7,6,7,8,8,5,5', [7, 7]],
  ['7,7,7,8,8,7,6,7,8,8,6,6,5,5', [6, 5]],
  ['7,7,7,8,8,7,6,7,8,8,6,6,6,5', [4, 6]],
  ['7,7,7,8,8,7,6,7,8,8,6,6,5,5,6,5', [5, 6]],
  ['7,7,7,8,8,7,6,7,8,8,6,6,5,5,5,6', [6, 4]],
  ['7,7,7,8,8,7,6,7,8,8,6,6,6,5,4,6', [5, 5]],
  ['7,7,7,8,8,7,6,7,8,8,6,6,6,5,5,5', [7, 5]],
  // 직지 6,6 8,6 변주
  ['7,7,7,8,8,7,6,7,6,6,8,6', [7, 5]],
  ['7,7,7,8,8,7,6,7,6,6,7,5', [9, 7]],
  ['7,7,7,8,8,7,6,7,6,6,8,6,7,5', [9, 5]],
  ['7,7,7,8,8,7,6,7,6,6,8,6,9,5', [7, 4]],
  ['7,7,7,8,8,7,6,7,6,6,8,6,7,5,9,5', [8, 4]],
  ['7,7,7,8,8,7,6,7,6,6,8,6,7,5,8,4', [6, 4]],
  // 직지 8,8 6,6 이후 추가 변주
  ['7,7,7,8,8,7,6,7,8,8,6,6,5,5,6,5,5,6', [7, 6]],
  ['7,7,7,8,8,7,6,7,8,8,6,6,5,5,6,5,7,6', [4, 7]],
  ['7,7,7,8,8,7,8,8,6,6,6,7', [5, 7]],
  ['7,7,7,8,8,7,8,8,6,6,5,7', [8, 8]],
  ['7,7,7,8,8,7,8,8,6,7,5,7', [6, 6]],
  // --- 2수: 사지(8,7) 대비 ---
  ['7,7,8,7', [7, 8]],
  ['7,7,8,7,7,8', [6, 8]],
  ['7,7,8,7,6,8', [7, 8]],
  ['7,7,8,7,7,8,6,8', [8, 6]],
  ['7,7,8,7,7,8,8,6', [6, 8]],
  ['7,7,8,7,7,8,6,8,8,6', [7, 9]],
  ['7,7,8,7,7,8,6,8,7,9', [5, 9]],
  ['7,7,8,7,7,8,8,6,6,8', [8, 8]],
  ['7,7,8,7,6,8,7,8', [6, 8]],
  ['7,7,8,7,6,8,6,8', [8, 6]],
  ['7,7,8,7,7,8,6,8,8,6,7,9', [6, 7]],
  ['7,7,8,7,7,8,6,8,8,6,6,7', [8, 5]],
  ['7,7,8,7,7,8,6,8,8,6,7,9,6,7', [5, 8]],
  ['7,7,8,7,7,8,6,8,8,6,6,7,8,5', [7, 6]],
  ['7,7,8,7,7,8,6,8,8,6,6,7,7,6', [9, 6]],
  ['7,7,8,7,7,8,8,6,6,8,8,8', [7, 7]],
  ['7,7,8,7,7,8,8,6,6,8,7,7', [9, 7]],
  // --- 2수: 6,6 / 6,8 / 8,8 / 8,6 / 6,7 / 7,6 ---
  ['7,7,6,6', [7, 8]],
  ['7,7,6,6,7,8', [8, 7]],
  ['7,7,6,6,8,7', [7, 8]],
  ['7,7,6,6,7,8,8,7', [6, 7]],
  ['7,7,6,6,8,7,7,8', [6, 8]],
  ['7,7,6,6,7,8,8,7,6,7', [8, 8]],
  ['7,7,6,6,8,7,7,8,6,8', [8, 6]],
  ['7,7,6,8', [7, 8]],
  ['7,7,6,8,7,8', [8, 7]],
  ['7,7,6,8,8,7', [7, 8]],
  ['7,7,6,8,7,8,8,7', [6, 8]],
  ['7,7,6,8,8,7,7,8', [6, 7]],
  ['7,7,8,8', [7, 8]],
  ['7,7,8,8,7,8', [8, 7]],
  ['7,7,8,8,8,7', [7, 8]],
  ['7,7,8,8,7,8,8,7', [6, 8]],
  ['7,7,8,8,8,7,7,8', [6, 7]],
  ['7,7,8,6', [8, 7]],
  ['7,7,8,6,8,7', [7, 8]],
  ['7,7,8,6,7,8', [8, 7]],
  ['7,7,8,6,8,7,7,8', [6, 7]],
  ['7,7,8,6,7,8,8,7', [6, 8]],
  ['7,7,6,7', [7, 8]],
  ['7,7,6,7,7,8', [8, 7]],
  ['7,7,6,7,8,7', [7, 8]],
  ['7,7,6,7,7,8,8,7', [6, 7]],
  ['7,7,6,7,8,7,7,8', [6, 8]],
  ['7,7,7,6', [7, 8]],
  ['7,7,7,6,7,8', [8, 7]],
  ['7,7,7,6,8,7', [7, 8]],
  ['7,7,7,6,7,8,8,7', [6, 7]],
  ['7,7,7,6,8,7,7,8', [6, 8]],
  // --- 2수: 변두리(5,5 / 9,9 / 5,7 등) ---
  ['7,7,5,5', [7, 8]],
  ['7,7,5,5,7,8', [8, 7]],
  ['7,7,9,9', [7, 8]],
  ['7,7,9,9,7,8', [8, 7]],
  ['7,7,5,7', [7, 8]],
  ['7,7,5,7,7,8', [8, 7]],
  ['7,7,9,7', [7, 8]],
  ['7,7,9,7,7,8', [8, 7]],
  ['7,7,7,5', [7, 8]],
  ['7,7,7,5,7,8', [8, 7]],
  ['7,7,7,9', [7, 8]],
  ['7,7,7,9,7,8', [8, 7]],
];

const OPENING_BOOK = new Map(OPENING_BOOK_ENTRIES);
/** 북에서 사용할 최대 수 개수 (이 수까지 북 적용, 그 이후는 엔진) */
const BOOK_MAX_MOVES = 18;

function bookKey(moveHistory) {
  if (!moveHistory || moveHistory.length === 0) return '';
  return moveHistory.map(([r, c]) => `${r},${c}`).join(',');
}

/** 상대 열린 4의 방어점(필수 응수)을 수집 — 후보수에 누락 방지 */
function opponentOpenFourBlocks(b, oppColor) {
  const set = new Set();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (b[r][c] !== oppColor) continue;
      for (const [dr, dc] of DIRS) {
        const pr = r - dr, pc = c - dc;
        if (pr >= 0 && pr < N && pc >= 0 && pc < N && b[pr][pc] === oppColor) continue;
        const { cnt, openF, openB } = scanLine(b, r, c, dr, dc, oppColor);
        if (cnt !== 4 || (openF + openB) < 1) continue;
        let rr = r + dr, rc = c + dc;
        while (inBound(rr, rc) && b[rr][rc] === oppColor) { rr += dr; rc += dc; }
        if (inBound(rr, rc) && b[rr][rc] === EMPTY) set.add(rr * N + rc);
        rr = r - dr; rc = c - dc;
        while (inBound(rr, rc) && b[rr][rc] === oppColor) { rr -= dr; rc -= dc; }
        if (inBound(rr, rc) && b[rr][rc] === EMPTY) set.add(rr * N + rc);
      }
    }
  }
  return set;
}

/** 상대 열린 3의 방어점 수집 — 이중목적(막기+공격) 수 판별용 */
function opponentOpenThreeBlocks(b, oppColor) {
  const set = new Set();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (b[r][c] !== oppColor) continue;
      for (const [dr, dc] of DIRS) {
        const pr = r - dr, pc = c - dc;
        if (pr >= 0 && pr < N && pc >= 0 && pc < N && b[pr][pc] === oppColor) continue;
        if (lineType(b, r, c, dr, dc, oppColor) !== 'open3') continue;
        let rr = r + dr, rc = c + dc;
        while (inBound(rr, rc) && b[rr][rc] === oppColor) { rr += dr; rc += dc; }
        if (inBound(rr, rc) && b[rr][rc] === EMPTY) set.add(rr * N + rc);
        rr = r - dr; rc = c - dc;
        while (inBound(rr, rc) && b[rr][rc] === oppColor) { rr -= dr; rc -= dc; }
        if (inBound(rr, rc) && b[rr][rc] === EMPTY) set.add(rr * N + rc);
      }
    }
  }
  return set;
}

/** 보드에 color 쪽 열린3 또는 열린4가 하나라도 있으면 true (우리 위협 여부 판별) */
function boardHasThreat(b, color) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (b[r][c] !== color) continue;
      for (const [dr, dc] of DIRS) {
        const pr = r - dr, pc = c - dc;
        if (pr >= 0 && pr < N && pc >= 0 && pc < N && b[pr][pc] === color) continue;
        const t = lineType(b, r, c, dr, dc, color);
        if (t === 'open3' || t === 'open4') return true;
      }
    }
  }
  return false;
}

/**
 * 후보 수: 기존 돌 주변 2칸 + 상대 열린4 방어점, 휴리스틱+히스토리+킬러 정렬, 상위 MAX_CANDIDATES개
 */
export function candidates(b, perspective = WHITE, depth = 0, preferMove = null) {
  const set = new Set();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (b[r][c] === 0) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr, nc = c + dc;
          if (inBound(nr, nc) && b[nr][nc] === 0) set.add(nr * N + nc);
        }
      }
    }
  }
  const opp = 3 - perspective;
  for (const key of opponentOpenFourBlocks(b, opp)) set.add(key);
  for (const key of opponentOpenThreeBlocks(b, opp)) set.add(key);
  if (set.size === 0) return [[7, 7]];

  const blockSet = new Set([...opponentOpenFourBlocks(b, opp), ...opponentOpenThreeBlocks(b, opp)]);

  const arr = [];
  for (const key of set) {
    const r = (key / N) | 0, c = key % N;
    let wScore = 0, bScore = 0;
    for (const [dr, dc] of DIRS) {
      b[r][c] = WHITE;
      const { cnt: wc, openF: wf, openB: wb } = scanLine(b, r, c, dr, dc, WHITE);
      wScore += patternScore(wc, wf + wb, true);
      b[r][c] = BLACK;
      const { cnt: bc, openF: bf, openB: bb } = scanLine(b, r, c, dr, dc, BLACK);
      bScore += patternScore(bc, bf + bb, false);
      b[r][c] = 0;
    }
    const hist = history[r][c] || 0;
    const isBlock = blockSet.has(key);
    arr.push([r, c, wScore, bScore, hist, isBlock]);
  }
  const keyPers = perspective === BLACK ? (a) => 2 * a[3] + a[2] : (a) => 2 * a[2] + a[3];
  const hasThreat = boardHasThreat(b, perspective);
  const ourScore = (a) => (perspective === BLACK ? a[3] : a[2]);
  const ATTACK_BONUS_MUL = 5000;
  const killer0 = depth > 0 && killer[depth] ? killer[depth][0] : null;
  const killer1 = depth > 0 && killer[depth] ? killer[depth][1] : null;
  arr.sort((a, b) => {
    if (preferMove && (a[0] === preferMove[0] && a[1] === preferMove[1])) return -1;
    if (preferMove && (b[0] === preferMove[0] && b[1] === preferMove[1])) return 1;
    let boostA = (a[4] || 0), boostB = (b[4] || 0);
    if (killer0 && a[0] === killer0[0] && a[1] === killer0[1]) boostA += 100000;
    if (killer1 && a[0] === killer1[0] && a[1] === killer1[1]) boostA += 50000;
    if (killer0 && b[0] === killer0[0] && b[1] === killer0[1]) boostB += 100000;
    if (killer1 && b[0] === killer1[0] && b[1] === killer1[1]) boostB += 50000;
    if (a[5] && ourScore(a) >= DUAL_PURPOSE_THRESHOLD) boostA += DUAL_PURPOSE_BONUS;
    if (b[5] && ourScore(b) >= DUAL_PURPOSE_THRESHOLD) boostB += DUAL_PURPOSE_BONUS;
    if (hasThreat) {
      boostA += ourScore(a) * ATTACK_BONUS_MUL;
      boostB += ourScore(b) * ATTACK_BONUS_MUL;
    }
    const scoreA = keyPers(a) * 1000 + boostA;
    const scoreB = keyPers(b) * 1000 + boostB;
    return scoreB - scoreA;
  });
  const raw = arr.slice(0, MAX_CANDIDATES).map(([r, c]) => [r, c]);
  if (preferMove && !raw.some(([r, c]) => r === preferMove[0] && c === preferMove[1])) {
    const out = raw.slice(0, -1);
    out.unshift(preferMove);
    return out;
  }
  return raw;
}

/** 4목 위협에 대한 필수 응수 위치 (중복 제거). 즉승·더블포 판정용 */
export function forcedReplies(b, r, c, color) {
  const set = new Set();
  for (const [dr, dc] of DIRS) {
    const { cnt } = scanLine(b, r, c, dr, dc, color);
    if (cnt < 4) continue;
    let rr = r + dr, rc = c + dc;
    while (inBound(rr, rc) && b[rr][rc] === color) { rr += dr; rc += dc; }
    if (inBound(rr, rc) && b[rr][rc] === 0) set.add(rr * N + rc);
    rr = r - dr; rc = c - dc;
    while (inBound(rr, rc) && b[rr][rc] === color) { rr -= dr; rc -= dc; }
    if (inBound(rr, rc) && b[rr][rc] === 0) set.add(rr * N + rc);
  }
  return Array.from(set).map(key => [(key / N) | 0, key % N]);
}

/** 시간 초과 시 true (타임아웃 방지용) */
function isOverTime(startMs, limitMs) {
  return limitMs != null && (Date.now() - startMs) > limitMs;
}

/** VCF — 열린 4만 강제로 간주 (렌주 정석). 즉승·더블포는 기존대로. timeLimit 있으면 초과 시 null 반환 */
export function vcfWin(b, color, depth, candList = null, timeStart = null, timeLimit = null) {
  if (depth <= 0) return null;
  if (isOverTime(timeStart, timeLimit)) return null;
  const opp = 3 - color;
  const order = candList || candidates(b, color, 0).slice(0, 28);

  for (const [r, c] of order) {
    if (isOverTime(timeStart, timeLimit)) return null;
    if (b[r][c] !== 0) continue;
    if (color === BLACK && forbidden(b, r, c)) continue;
    b[r][c] = color;
    if (isInstantWin(b, r, c, color)) {
      b[r][c] = 0;
      return [r, c];
    }
    const openFourCount = countOpenFours(b, r, c, color);
    if (openFourCount >= 1) {
      const defMoves = forcedRepliesOpenFour(b, r, c, color);
      let allWin = true;
      for (const [mr, mc] of defMoves) {
        if (isOverTime(timeStart, timeLimit)) { allWin = false; break; }
        if (b[mr][mc] !== 0) continue;
        b[mr][mc] = opp;
        const w = vcfWin(b, color, depth - 1, null, timeStart, timeLimit);
        b[mr][mc] = 0;
        if (!w) { allWin = false; break; }
      }
      if (allWin && defMoves.length > 0) {
        b[r][c] = 0;
        return [r, c];
      }
    }
    b[r][c] = 0;
  }
  return null;
}

/** VCT — 연속 위협 승리: 열린3 → 상대 방어 → 우리 다음 위협 … (2~3수 앞 읽어 허를 찌르는 수) */
export function vctWin(b, color, depth, candList = null, timeStart = null, timeLimit = null) {
  if (depth <= 0) return null;
  if (isOverTime(timeStart, timeLimit)) return null;
  const opp = 3 - color;
  const order = candList || candidates(b, color, 0).slice(0, 28);

  for (const [r, c] of order) {
    if (isOverTime(timeStart, timeLimit)) return null;
    if (b[r][c] !== 0) continue;
    if (color === BLACK && forbidden(b, r, c)) continue;
    b[r][c] = color;
    if (isInstantWin(b, r, c, color)) {
      b[r][c] = 0;
      return [r, c];
    }
    const openFourDef = forcedRepliesOpenFour(b, r, c, color);
    const openThreeDef = forcedRepliesOpenThree(b, r, c, color);
    const defMoves = openFourDef.length > 0 ? openFourDef : openThreeDef;
    if (defMoves.length === 0) {
      b[r][c] = 0;
      continue;
    }
    let allWin = true;
    for (const [mr, mc] of defMoves) {
      if (isOverTime(timeStart, timeLimit)) {
        allWin = false;
        break;
      }
      if (b[mr][mc] !== 0) continue;
      b[mr][mc] = opp;
      const w = vctWin(b, color, depth - 1, null, timeStart, timeLimit);
      b[mr][mc] = 0;
      if (!w) {
        allWin = false;
        break;
      }
    }
    b[r][c] = 0;
    if (allWin) return [r, c];
  }
  return null;
}

const Exact = 0, Lower = 1, Upper = 2;

/** Minimax + Alpha-Beta + TT + 히스토리/킬러 + LMR */
function minimax(b, depth, alpha, beta, isMax, aiColor, hash) {
  const opp = 3 - aiColor;
  const rawScore = evalBoard(b);
  const score = aiColor === WHITE ? rawScore : -rawScore;

  if (Math.abs(score) >= S.WIN) return score;
  if (depth === 0) return score;

  const cached = ttGet(hash, depth, alpha, beta);
  if (cached !== null) return cached;

  const ttMove = ttGetMove(hash);
  const cands = candidates(b, isMax ? aiColor : opp, depth, ttMove);
  let bestScore = isMax ? -Infinity : Infinity;
  let bestMove = null;
  let flag = Upper;

  const reducedDepth = Math.max(1, depth - LMR_REDUCTION);

  if (isMax) {
    for (let i = 0; i < cands.length; i++) {
      const [r, c] = cands[i];
      if (aiColor === BLACK && forbidden(b, r, c)) continue;
      b[r][c] = aiColor;
      const h2 = updateHash(hash, r, c, aiColor);
      let sc;
      if (depth >= LMR_MIN_DEPTH && i >= LMR_MOVE_THRESHOLD) {
        sc = minimax(b, reducedDepth - 1, alpha, beta, false, aiColor, h2);
        if (sc >= beta) sc = minimax(b, depth - 1, alpha, beta, false, aiColor, h2);
      } else {
        sc = minimax(b, depth - 1, alpha, beta, false, aiColor, h2);
      }
      b[r][c] = 0;
      if (sc > bestScore) {
        bestScore = sc;
        bestMove = [r, c];
        flag = Exact;
        alpha = Math.max(alpha, sc);
      }
      if (beta <= alpha) {
        history[r][c] += depth * depth;
        killer[depth][1] = killer[depth][0];
        killer[depth][0] = [r, c];
        break;
      }
    }
  } else {
    for (let i = 0; i < cands.length; i++) {
      const [r, c] = cands[i];
      if (opp === BLACK && forbidden(b, r, c)) continue;
      b[r][c] = opp;
      const h2 = updateHash(hash, r, c, opp);
      let sc;
      if (depth >= LMR_MIN_DEPTH && i >= LMR_MOVE_THRESHOLD) {
        sc = minimax(b, reducedDepth - 1, alpha, beta, true, aiColor, h2);
        if (sc <= alpha) sc = minimax(b, depth - 1, alpha, beta, true, aiColor, h2);
      } else {
        sc = minimax(b, depth - 1, alpha, beta, true, aiColor, h2);
      }
      b[r][c] = 0;
      if (sc < bestScore) {
        bestScore = sc;
        bestMove = [r, c];
        flag = Exact;
        beta = Math.min(beta, sc);
      }
      if (beta <= alpha) {
        history[r][c] += depth * depth;
        killer[depth][1] = killer[depth][0];
        killer[depth][0] = [r, c];
        break;
      }
    }
  }

  ttPut(hash, depth, bestScore, flag, bestMove);
  return bestScore;
}

/** (r,c)에 color를 둔 뒤 열린3 또는 열린4를 만드는 수이면 true — 공격 라인에서 탐색 깊이 연장용 */
export function isCritical(b, r, c, color = WHITE) {
  for (const [dr, dc] of DIRS) {
    const t = lineType(b, r, c, dr, dc, color);
    if (t === 'open3' || t === 'open4') return true;
  }
  return false;
}

/** 게임 시작 시 TT·히스토리 초기화 (game에서 reset 시 호출 권장) */
export function resetAI() {
  ttClear();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) history[r][c] = 0;
  for (let i = 0; i < killer.length; i++) killer[i][0] = killer[i][1] = null;
}

/**
 * 최선 수 선택 (최상급): 오프닝 → 즉승 → 방어 → VCF → 상대 VCF 방어 → 반복적 심화 Minimax
 * 전체에 MAX_AI_MS 타임아웃 적용해 간헐적 멈춤 방지.
 * try-catch로 예외 시에도 유효한 수 반환해 페이지 크래시 방지.
 */
export function bestMove(board, aiColor, moveHistory = []) {
  try {
    return bestMoveInner(board, aiColor, moveHistory);
  } catch (err) {
    console.error('AI bestMove 오류:', err);
    return getFirstEmptyCell(board);
  }
}

function bestMoveInner(board, aiColor, moveHistory) {
  const opp = 3 - aiColor;
  const b = copyBoard(board);
  const startMs = Date.now();
  const timeLimitMs = aiColor === WHITE ? Math.round(MAX_AI_MS * WHITE_TIME_MULTIPLIER) : MAX_AI_MS;

  const key = bookKey(moveHistory);
  if (moveHistory.length <= BOOK_MAX_MOVES && OPENING_BOOK.has(key)) {
    const bookMove = OPENING_BOOK.get(key);
    if (b[bookMove[0]][bookMove[1]] === 0) return bookMove;
  }

  const cands = candidates(b, aiColor);

  for (const [r, c] of cands) {
    b[r][c] = aiColor;
    if (checkWin(b, r, c, aiColor)) { b[r][c] = 0; return [r, c]; }
    if (countFours(b, r, c, aiColor) >= 2) { b[r][c] = 0; return [r, c]; }
    b[r][c] = 0;
  }

  for (const [r, c] of cands) {
    if (opp === BLACK && forbidden(b, r, c)) continue;
    b[r][c] = opp;
    if (checkWin(b, r, c, opp)) { b[r][c] = 0; return [r, c]; }
    if (countFours(b, r, c, opp) >= 2) { b[r][c] = 0; return [r, c]; }
    b[r][c] = 0;
  }

  if (!isOverTime(startMs, timeLimitMs)) {
    const vcf = vcfWin(b, aiColor, 8, null, startMs, timeLimitMs);
    if (vcf) return vcf;
  }

  /** VCT: 열린4 연속으로 못 이기면, 열린3→방어→다음 위협(2~3수 앞)으로 허를 찌르는 수 탐색 */
  if (!isOverTime(startMs, timeLimitMs)) {
    const vct = vctWin(b, aiColor, 4, null, startMs, timeLimitMs);
    if (vct) return vct;
  }

  for (const [r, c] of cands) {
    if (isOverTime(startMs, timeLimitMs)) break;
    if (aiColor === BLACK && forbidden(b, r, c)) continue;
    const tmp = copyBoard(b);
    tmp[r][c] = opp;
    if (vcfWin(tmp, opp, 6, null, startMs, timeLimitMs)) return [r, c];
  }

  let bestPos = cands[0];
  let bestScore = -Infinity;

  for (let d = 2; d <= MAX_DEPTH; d += 2) {
    if (Date.now() - startMs > timeLimitMs) break;
    const ordered = candidates(b, aiColor, 0, bestPos);
    let depthBest = ordered[0];
    let depthScore = -Infinity;

    for (let i = 0; i < ordered.length; i++) {
      const [r, c] = ordered[i];
      if (Date.now() - startMs > timeLimitMs) break;
      if (aiColor === BLACK && forbidden(b, r, c)) continue;
      b[r][c] = aiColor;
      const h = getHash(b);
      const depthUse = isCritical(b, r, c, aiColor) ? Math.min(d + 2, MAX_DEPTH) : d;
      let sc;
      if (d > 2 && i === 0 && bestPos[0] === r && bestPos[1] === c) {
        const alphaAsp = bestScore - ASPIRATION_MARGIN;
        const betaAsp = bestScore + ASPIRATION_MARGIN;
        sc = minimax(b, depthUse - 1, alphaAsp, betaAsp, false, aiColor, h);
        if (sc <= alphaAsp) sc = minimax(b, depthUse - 1, -Infinity, Infinity, false, aiColor, h);
        if (sc >= betaAsp) sc = minimax(b, depthUse - 1, sc, Infinity, false, aiColor, h);
      } else {
        sc = minimax(b, depthUse - 1, -Infinity, Infinity, false, aiColor, h);
      }
      b[r][c] = 0;
      if (sc > depthScore) {
        depthScore = sc;
        depthBest = [r, c];
      }
    }
    bestScore = depthScore;
    bestPos = depthBest;
  }

  return bestPos;
}
