/**
 * 보드 평가: 패턴 점수, evalBoard
 */
import { N, WHITE, BLACK, DIRS, S } from './constants.js';
import { scanLine } from './rules.js';

/** 한 패턴의 점수 (열린/닫힌 구분). 승리는 정확히 5목만 */
export function patternScore(cnt, opens, isAI) {
  if (cnt === 5) return S.WIN;
  if (cnt === 4) {
    if (opens === 2) return S.O4;
    if (opens === 1) return S.C4;  // 한쪽 열림 → 한 수에 5 가능
    return S.D4;                   // 양쪽 막힘 → 죽은 4
  }
  if (cnt === 3) {
    if (opens === 2) return S.O3;
    if (opens === 1) return S.H3;  // 반열린 3
    return S.C3;
  }
  if (cnt === 2) return opens === 2 ? S.O2 : S.C2;
  return 0;
}

/** 한 방향이 강한 패턴(열린3·반열린3·열린4·5목)인지 — 주도권 보너스용 */
function isStrongPattern(cnt, opens) {
  if (cnt >= 5) return true;
  if (cnt === 4 && opens >= 1) return true;
  if (cnt === 3 && opens >= 1) return true;  // 열린3·반열린3 모두 위협으로 간주
  return false;
}

/** 보드 전체 평가 (백 기준, 양수=백 유리). 다중 위협 시 보너스 + 주도권(반격) 보너스 */
export function evalBoard(b) {
  let score = 0;
  let whiteInitiative = 0;
  let blackInitiative = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = b[r][c];
      if (cell === 0) continue;
      let strongDirs = 0;
      for (const [dr, dc] of DIRS) {
        const pr = r - dr, pc = c - dc;
        if (pr >= 0 && pr < N && pc >= 0 && pc < N && b[pr][pc] === cell) continue;
        const { cnt, openF, openB } = scanLine(b, r, c, dr, dc, cell);
        if (cnt < 2) continue;
        const opens = openF + openB;
        const s = patternScore(cnt, opens, cell === WHITE);
        score += cell === WHITE ? s : -s;
        if (isStrongPattern(cnt, opens)) {
          strongDirs++;
          if (cell === BLACK) blackInitiative++;
          else whiteInitiative++;
        }
      }
      if (strongDirs >= 2) score += cell === WHITE ? S.DOUBLE_THREAT : -S.DOUBLE_THREAT;
    }
  }
  score += (whiteInitiative - blackInitiative) * S.INITIATIVE;
  return score;
}
