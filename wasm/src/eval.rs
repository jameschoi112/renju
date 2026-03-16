//! 보드 평가: 패턴 점수, eval_board, delta_eval (JS eval.js 대응)

use crate::board::{Board, get, in_bound};
use crate::constants::{N, WHITE, DIRS};
use crate::constants::scores;
use crate::rules::scan_line;

/// 한 패턴의 점수 (열린/닫힌 구분). 승리는 정확히 5목만
#[inline]
pub fn pattern_score(cnt: u8, opens: u8, is_white: bool) -> i32 {
    if cnt == 5 {
        return scores::WIN;
    }
    if cnt == 4 {
        return match opens {
            2 => scores::O4,
            1 => scores::C4,
            _ => scores::D4,
        };
    }
    if cnt == 3 {
        return match opens {
            2 => scores::O3,
            1 => scores::H3,
            _ => scores::C3,
        };
    }
    if cnt == 2 {
        return if opens == 2 { scores::O2 } else { scores::C2 };
    }
    0
}

#[inline]
fn is_strong_pattern(cnt: u8, opens: u8) -> bool {
    if cnt >= 5 {
        return true;
    }
    if cnt == 4 && opens >= 1 {
        return true;
    }
    if cnt == 3 && opens >= 1 {
        return true;
    }
    false
}

const CENTER: i32 = 7;

#[inline]
fn center_bonus(r: usize, c: usize) -> i32 {
    let r = r as i32;
    let c = c as i32;
    let d = (r - CENTER).abs().max((c - CENTER).abs());
    (4 - d).max(0)
}

/// (r,c)에 color를 둔 뒤의 점수 변화량(백 기준). 보드에는 이미 (r,c)=color 반영된 상태.
pub fn delta_eval(board: &Board, r: usize, c: usize, color: u8) -> i32 {
    let mut delta = 0i32;
    let mut open4_dirs = 0u8;
    let mut open3_dirs = 0u8;
    let mut strong_dirs = 0u8;
    let is_white = color == WHITE;
    let sign = if is_white { 1 } else { -1 };
    let r_i = r as i32;
    let c_i = c as i32;

    for (dr, dc) in DIRS.iter() {
        let dr = *dr as i32;
        let dc = *dc as i32;

        let seg_plus = if in_bound(r_i + dr, c_i + dc) {
            scan_line(board, r_i + dr, c_i + dc, dr, dc, color)
        } else {
            crate::rules::LineInfo {
                cnt: 0,
                open_f: 0,
                open_b: 0,
            }
        };
        let seg_minus = if in_bound(r_i - dr, c_i - dc) {
            scan_line(board, r_i - dr, c_i - dc, -dr, -dc, color)
        } else {
            crate::rules::LineInfo {
                cnt: 0,
                open_f: 0,
                open_b: 0,
            }
        };
        let opens_before_p = seg_plus.open_f + seg_plus.open_b;
        let opens_before_m = seg_minus.open_f + seg_minus.open_b;
        let score_before = pattern_score(seg_plus.cnt, opens_before_p, is_white)
            + pattern_score(seg_minus.cnt, opens_before_m, is_white);

        let mut start_r = r_i;
        let mut start_c = c_i;
        while in_bound(start_r - dr, start_c - dc)
            && get(board, (start_r - dr) as usize, (start_c - dc) as usize) == color
        {
            start_r -= dr;
            start_c -= dc;
        }
        let merged = scan_line(board, start_r, start_c, dr, dc, color);
        let opens = merged.open_f + merged.open_b;
        let score_after = pattern_score(merged.cnt, opens, is_white);
        delta += sign * (score_after - score_before);

        if merged.cnt == 4 && opens >= 1 {
            open4_dirs += 1;
        }
        if merged.cnt == 3 && opens >= 2 {
            open3_dirs += 1;
        }
        if is_strong_pattern(merged.cnt, opens) {
            strong_dirs += 1;
        }
    }

    delta += sign * (center_bonus(r, c) * 15);
    if strong_dirs >= 2 {
        delta += sign * scores::DOUBLE_THREAT;
    }
    if open4_dirs >= 1 && open3_dirs >= 1 {
        delta += sign * scores::FORK_OPEN4;
    }
    if open3_dirs >= 2 {
        delta += sign * scores::CROSS_THREAT;
    }
    delta += sign * (strong_dirs as i32) * scores::INITIATIVE;
    delta
}

/// 보드 전체 평가 (백 기준, 양수=백 유리)
pub fn eval_board(board: &Board) -> i32 {
    let mut score = 0i32;
    let mut white_init = 0i32;
    let mut black_init = 0i32;

    for r in 0..N {
        for c in 0..N {
            let cell = get(board, r, c);
            if cell == 0 {
                continue;
            }
            let mut strong_dirs = 0u8;
            let mut open4_dirs = 0u8;
            let mut open3_dirs = 0u8;

            for (dr, dc) in DIRS.iter() {
                let dr = *dr as i32;
                let dc = *dc as i32;
                let pr = r as i32 - dr;
                let pc = c as i32 - dc;
                if pr >= 0
                    && pr < N as i32
                    && pc >= 0
                    && pc < N as i32
                    && get(board, pr as usize, pc as usize) == cell
                {
                    continue;
                }
                let info = scan_line(board, r as i32, c as i32, dr, dc, cell);
                if info.cnt < 2 {
                    continue;
                }
                let opens = info.open_f + info.open_b;
                let s = pattern_score(info.cnt, opens, cell == WHITE);
                if cell == WHITE {
                    score += s;
                } else {
                    score -= s;
                }
                if info.cnt == 4 && opens >= 1 {
                    open4_dirs += 1;
                }
                if info.cnt == 3 && opens >= 2 {
                    open3_dirs += 1;
                }
                if is_strong_pattern(info.cnt, opens) {
                    strong_dirs += 1;
                    if cell == WHITE {
                        white_init += 1;
                    } else {
                        black_init += 1;
                    }
                }
            }

            let cb = center_bonus(r, c) * 15;
            if cell == WHITE {
                score += cb;
            } else {
                score -= cb;
            }
            if strong_dirs >= 2 {
                if cell == WHITE {
                    score += scores::DOUBLE_THREAT;
                } else {
                    score -= scores::DOUBLE_THREAT;
                }
            }
            if cell == WHITE {
                if open4_dirs >= 1 && open3_dirs >= 1 {
                    score += scores::FORK_OPEN4;
                }
                if open3_dirs >= 2 {
                    score += scores::CROSS_THREAT;
                }
            } else {
                if open4_dirs >= 1 && open3_dirs >= 1 {
                    score -= scores::FORK_OPEN4;
                }
                if open3_dirs >= 2 {
                    score -= scores::CROSS_THREAT;
                }
            }
        }
    }
    score += (white_init - black_init) * scores::INITIATIVE;
    score
}

