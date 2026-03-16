//! 보드 표현 및 유틸 (JS board.js 대응)

use crate::constants::{N, EMPTY};

/// 내부 보드 표현: 15×15를 1차원 배열로 직렬화 (row-major)
pub type Board = [u8; N * N];

#[inline]
pub fn idx(r: usize, c: usize) -> usize {
    r * N + c
}

#[inline]
pub fn in_bound(r: i32, c: i32) -> bool {
    r >= 0 && r < N as i32 && c >= 0 && c < N as i32
}

#[inline]
pub fn get(board: &Board, r: usize, c: usize) -> u8 {
    board[idx(r, c)]
}

#[inline]
pub fn set(board: &mut Board, r: usize, c: usize, v: u8) {
    let i = idx(r, c);
    board[i] = v;
}

/// 빈 보드로 초기화
pub fn clear(board: &mut Board) {
    board.fill(EMPTY);
}

/// 빈 칸 하나 반환 (없으면 (7,7))
pub fn get_first_empty_cell(board: &Board) -> (usize, usize) {
    if get(board, 7, 7) == EMPTY {
        return (7, 7);
    }
    for r in 0..N {
        for c in 0..N {
            if get(board, r, c) == EMPTY {
                return (r, c);
            }
        }
    }
    (7, 7)
}

