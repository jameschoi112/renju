//! Renju/Gomoku AI — WASM 엔진 (1단계: 상수/보드/규칙 이식)
//! JS에서 보드(225 u8), ai_color(1=흑,2=백), move_history(flat [r,c,r,c,...]), time_limit_ms 전달.

mod constants;
mod board;
mod rules;
mod eval;
mod hash;

use wasm_bindgen::prelude::*;
use crate::board::{Board, get_first_empty_cell, set};
use crate::constants::{N, EMPTY, BLACK, WHITE};
use crate::eval::eval_board;

/// 보드: 15×15 = 225 바이트 (row-major), 0=빈칸, 1=흑, 2=백
/// move_history: 짝수 길이, [r0,c0,r1,c1,...]
/// time_limit_ms: 현재는 사용하지 않음 (후속 단계에서 검색 타임아웃으로 활용 예정)
/// 반환: [r, c] 2바이트 — 지금은 JS와 독립적인 단순 엔진(첫 빈 칸)만 사용
#[wasm_bindgen]
pub fn best_move(board: &[u8], ai_color: u8, move_history: &[u8], time_limit_ms: u32) -> Vec<u8> {
    let _ = (ai_color, move_history, time_limit_ms);

    // 입력 슬라이스를 내부 Board 타입으로 복사
    let mut b: Board = [EMPTY; N * N];
    let len = core::cmp::min(board.len(), b.len());
    b[..len].copy_from_slice(&board[..len]);

    // 아주 단순한 1-ply 평가: 모든 합법 수 중 eval_board 점수가 최대인 수 선택
    let mut best = get_first_empty_cell(&b);
    let mut best_score = i32::MIN;
    for r in 0..N {
        for c in 0..N {
            if b[r * N + c] != EMPTY {
                continue;
            }
            // 흑 금수는 피하기 (흑일 때만)
            if ai_color == BLACK {
                // rules::forbidden은 &mut Board를 요구하므로, 임시로 두고 호출
                let mut tmp = b;
                if rules::forbidden(&mut tmp, r, c) {
                    continue;
                }
            }
            let mut tmp = b;
            set(&mut tmp, r, c, ai_color);
            let sc = eval_board(&tmp);
            if sc > best_score {
                best_score = sc;
                best = (r, c);
            }
        }
    }
    vec![best.0 as u8, best.1 as u8]
}

/// JS와 인터페이스를 맞추기 위한 reset 함수
#[wasm_bindgen]
pub fn reset_ai() {
    // 아직 유지할 내부 상태 없음 (TT/히스토리는 후속 단계에서 추가 예정)
}

