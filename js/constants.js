/**
 * 렌주 오목 게임 상수
 */
export const N = 15;
export const CELL = 38;
export const PAD = 28;
export const SIZE = PAD * 2 + CELL * (N - 1);

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

/** 4방향: 우, 하, 우하, 우상 */
export const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

/** 패턴 점수 (한 방향 기준) */
export const S = {
  WIN: 10000000,
  O4: 500000,   // 열린 4
  C4: 50000,    // 닫힌 4
  O3: 10000,    // 열린 3
  C3: 1000,     // 닫힌 3
  O2: 200,
  C2: 20,
  /** 같은 돌에서 열린3/열린4가 2방향 이상일 때 (더블 스레트) */
  DOUBLE_THREAT: 400000,
  /** 주도권 보너스: 위협(열린3/4)이 많은 쪽에 소폭 가산 — 막기만 하지 않고 반격 선호 */
  INITIATIVE: 2000,
};
