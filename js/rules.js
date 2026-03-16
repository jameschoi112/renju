/**
 * 렌주 규칙: 라인 분석, 승리 판정, 금수 판정
 */
import { N, EMPTY, BLACK, WHITE, DIRS } from './constants.js';
import { inBound } from './board.js';

/**
 * 한 방향 라인 분석
 * @returns { cnt, openF, openB }
 *   cnt: 연속 돌 수 (자기 포함)
 *   openF/openB: 앞/뒤 열린 칸(1 또는 0)
 */
export function scanLine(b, r, c, dr, dc, color) {
  let cnt = 1;
  let fr = r + dr, fc = c + dc;
  while (inBound(fr, fc) && b[fr][fc] === color) {
    cnt++;
    fr += dr;
    fc += dc;
  }
  const openF = inBound(fr, fc) && b[fr][fc] === EMPTY ? 1 : 0;

  let br = r - dr, bc = c - dc;
  while (inBound(br, bc) && b[br][bc] === color) {
    cnt++;
    br -= dr;
    bc -= dc;
  }
  const openB = inBound(br, bc) && b[br][bc] === EMPTY ? 1 : 0;

  return { cnt, openF, openB };
}

/**
 * 한 방향 라인 종류 분류
 */
export function lineType(b, r, c, dr, dc, color) {
  const { cnt, openF, openB } = scanLine(b, r, c, dr, dc, color);
  const opens = openF + openB;
  if (cnt >= 6) return 'overline';
  if (cnt === 5) return 'five';
  if (cnt === 4) return opens >= 1 ? 'open4' : 'close4';
  if (cnt === 3) {
    if (opens === 2) return isRealOpen3(b, r, c, dr, dc, color) ? 'open3' : 'none';
    return 'close3';
  }
  if (cnt === 2) return opens === 2 ? 'open2' : 'close2';
  return 'none';
}

/** 가짜 열린 3 제거: 4로 확장 시 실제 open4가 되는지 확인 */
export function isRealOpen3(b, r, c, dr, dc, color) {
  const fr = r + dr, fc = c + dc;
  if (inBound(fr, fc) && b[fr][fc] === EMPTY) {
    b[fr][fc] = color;
    const t = lineType(b, r, c, dr, dc, color);
    b[fr][fc] = EMPTY;
    if (t === 'open4') return true;
  }
  const br = r - dr, bc = c - dc;
  if (inBound(br, bc) && b[br][bc] === EMPTY) {
    b[br][bc] = color;
    const t = lineType(b, r, c, dr, dc, color);
    b[br][bc] = EMPTY;
    if (t === 'open4') return true;
  }
  return false;
}

/** 승리 여부: 흑·백 모두 정확히 5목일 때만 승리 (6목 이상은 무효) */
export function checkWin(b, r, c, color) {
  for (const [dr, dc] of DIRS) {
    const { cnt } = scanLine(b, r, c, dr, dc, color);
    if (cnt === 5) return true;
  }
  return false;
}

/** (r,c)에 color를 둔 뒤 4목(열린/닫힌) 라인 개수. 2 이상이면 더블포(한 수 승) */
export function countFours(b, r, c, color) {
  let n = 0;
  for (const [dr, dc] of DIRS) {
    const { cnt } = scanLine(b, r, c, dr, dc, color);
    if (cnt === 4) n++;
  }
  return n;
}

/** 열린 4목만 셈 (VCF: 렌주에서 강제응수는 열린 4만) */
export function countOpenFours(b, r, c, color) {
  let n = 0;
  for (const [dr, dc] of DIRS) {
    const { cnt, openF, openB } = scanLine(b, r, c, dr, dc, color);
    if (cnt === 4 && (openF + openB) >= 1) n++;
  }
  return n;
}

/** 열린 4목에 대한 필수 응수만 반환 (닫힌 4는 상대가 막지 않아도 됨) */
export function forcedRepliesOpenFour(b, r, c, color) {
  const set = new Set();
  for (const [dr, dc] of DIRS) {
    const { cnt, openF, openB } = scanLine(b, r, c, dr, dc, color);
    if (cnt !== 4 || (openF + openB) < 1) continue;
    let rr = r + dr, rc = c + dc;
    while (inBound(rr, rc) && b[rr][rc] === color) { rr += dr; rc += dc; }
    if (inBound(rr, rc) && b[rr][rc] === EMPTY) set.add(rr * N + rc);
    rr = r - dr; rc = c - dc;
    while (inBound(rr, rc) && b[rr][rc] === color) { rr -= dr; rc -= dc; }
    if (inBound(rr, rc) && b[rr][rc] === EMPTY) set.add(rr * N + rc);
  }
  return Array.from(set).map(key => [(key / N) | 0, key % N]);
}

/** 열린 3목에 대한 방어점(끝 막기) 반환 — VCT에서 상대 응수 후보 */
export function forcedRepliesOpenThree(b, r, c, color) {
  const set = new Set();
  for (const [dr, dc] of DIRS) {
    if (lineType(b, r, c, dr, dc, color) !== 'open3') continue;
    let rr = r + dr, rc = c + dc;
    while (inBound(rr, rc) && b[rr][rc] === color) { rr += dr; rc += dc; }
    if (inBound(rr, rc) && b[rr][rc] === EMPTY) set.add(rr * N + rc);
    rr = r - dr; rc = c - dc;
    while (inBound(rr, rc) && b[rr][rc] === color) { rr -= dr; rc -= dc; }
    if (inBound(rr, rc) && b[rr][rc] === EMPTY) set.add(rr * N + rc);
  }
  return Array.from(set).map(key => [(key / N) | 0, key % N]);
}

/** 한 수에 5목 또는 더블포(4목 2개 이상)면 true */
export function isInstantWin(b, r, c, color) {
  if (checkWin(b, r, c, color)) return true;
  return countFours(b, r, c, color) >= 2;
}

/**
 * 렌주 금수 판정 (흑만)
 * - 장목(6+)
 * - 4-4 (활사사)
 * - 3-3 (활삼삼, 가짜 3 제외)
 */
export function forbidden(b, r, c) {
  b[r][c] = BLACK;

  for (const [dr, dc] of DIRS) {
    const { cnt } = scanLine(b, r, c, dr, dc, BLACK);
    if (cnt >= 6) {
      b[r][c] = EMPTY;
      return true;
    }
  }

  for (const [dr, dc] of DIRS) {
    const { cnt } = scanLine(b, r, c, dr, dc, BLACK);
    if (cnt === 5) {
      b[r][c] = EMPTY;
      return false;
    }
  }

  let fours = 0, threes = 0;
  for (const [dr, dc] of DIRS) {
    const t = lineType(b, r, c, dr, dc, BLACK);
    if (t === 'open4' || t === 'close4') fours++;
    if (t === 'open3') threes++;
  }

  b[r][c] = EMPTY;
  if (fours >= 2) return true;
  if (threes >= 2) return true;
  return false;
}
