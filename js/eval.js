/**
 * 보드 평가: 패턴 점수, evalBoard
 */
import { N, WHITE, DIRS, S } from './constants.js';
import { scanLine } from './rules.js';

/** 한 패턴의 점수 (열린/닫힌 구분). 승리는 정확히 5목만 */
export function patternScore(cnt, opens, isAI) {
  if (cnt === 5) return S.WIN;
  if (cnt === 4) return opens === 2 ? S.O4 : S.C4;
  if (cnt === 3) return opens === 2 ? S.O3 : S.C3;
  if (cnt === 2) return opens === 2 ? S.O2 : S.C2;
  return 0;
}

/** 보드 전체 평가 (백 기준, 양수=백 유리) */
export function evalBoard(b) {
  let score = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = b[r][c];
      if (cell === 0) continue;
      for (const [dr, dc] of DIRS) {
        const pr = r - dr, pc = c - dc;
        if (pr >= 0 && pr < N && pc >= 0 && pc < N && b[pr][pc] === cell) continue;
        const { cnt, openF, openB } = scanLine(b, r, c, dr, dc, cell);
        if (cnt < 2) continue;
        const opens = openF + openB;
        const s = patternScore(cnt, opens, cell === WHITE);
        score += cell === WHITE ? s : -s;
      }
    }
  }
  return score;
}
