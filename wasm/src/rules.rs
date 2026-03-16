//! 렌주 규칙: 라인 분석, 승리 판정, 금수 판정 (JS rules.js 대응)

use crate::board::{Board, get, set, in_bound};
use crate::constants::{N, EMPTY, BLACK, DIRS};

/// 한 방향 라인 정보
pub struct LineInfo {
    pub cnt: u8,
    pub open_f: u8,
    pub open_b: u8,
}

/// 한 방향 라인 분석
pub fn scan_line(board: &Board, r: i32, c: i32, dr: i32, dc: i32, color: u8) -> LineInfo {
    let mut cnt = 1u8;
    let mut fr = r + dr;
    let mut fc = c + dc;
    while in_bound(fr, fc) && get(board, fr as usize, fc as usize) == color {
        cnt += 1;
        fr += dr;
        fc += dc;
    }
    let open_f = if in_bound(fr, fc) && get(board, fr as usize, fc as usize) == EMPTY {
        1
    } else {
        0
    };

    let mut br = r - dr;
    let mut bc = c - dc;
    while in_bound(br, bc) && get(board, br as usize, bc as usize) == color {
        cnt += 1;
        br -= dr;
        bc -= dc;
    }
    let open_b = if in_bound(br, bc) && get(board, br as usize, bc as usize) == EMPTY {
        1
    } else {
        0
    };

    LineInfo { cnt, open_f, open_b }
}

/// 라인 종류
pub enum LineType {
    Overline,
    Five,
    Open4,
    Close4,
    Open3,
    Close3,
    Open2,
    Close2,
    None,
}

/// 가짜 열린3 제거: 4로 확장 시 실제 open4가 되는지 확인
pub fn is_real_open3(board: &mut Board, r: i32, c: i32, dr: i32, dc: i32, color: u8) -> bool {
    let fr = r + dr;
    let fc = c + dc;
    if in_bound(fr, fc) && get(board, fr as usize, fc as usize) == EMPTY {
        set(board, fr as usize, fc as usize, color);
        let t = line_type(board, r, c, dr, dc, color);
        set(board, fr as usize, fc as usize, EMPTY);
        if matches!(t, LineType::Open4) {
            return true;
        }
    }
    let br = r - dr;
    let bc = c - dc;
    if in_bound(br, bc) && get(board, br as usize, bc as usize) == EMPTY {
        set(board, br as usize, bc as usize, color);
        let t = line_type(board, r, c, dr, dc, color);
        set(board, br as usize, bc as usize, EMPTY);
        if matches!(t, LineType::Open4) {
            return true;
        }
    }
    false
}

/// 한 방향 라인 종류 분류
pub fn line_type(board: &mut Board, r: i32, c: i32, dr: i32, dc: i32, color: u8) -> LineType {
    let info = scan_line(board, r, c, dr, dc, color);
    let opens = info.open_f + info.open_b;
    if info.cnt >= 6 {
        return LineType::Overline;
    }
    if info.cnt == 5 {
        return LineType::Five;
    }
    if info.cnt == 4 {
        return if opens >= 1 {
            LineType::Open4
        } else {
            LineType::Close4
        };
    }
    if info.cnt == 3 {
        if opens == 2 {
            return if is_real_open3(board, r, c, dr, dc, color) {
                LineType::Open3
            } else {
                LineType::None
            };
        }
        return LineType::Close3;
    }
    if info.cnt == 2 {
        return if opens == 2 {
            LineType::Open2
        } else {
            LineType::Close2
        };
    }
    LineType::None
}

/// 승리 여부: 정확히 5목만
pub fn check_win(board: &Board, r: usize, c: usize, color: u8) -> bool {
    for (dr, dc) in DIRS.iter() {
        let info = scan_line(board, r as i32, c as i32, *dr as i32, *dc as i32, color);
        if info.cnt == 5 {
            return true;
        }
    }
    false
}

/// (r,c)에 color를 둔 뒤 4목 라인 개수
pub fn count_fours(board: &Board, r: usize, c: usize, color: u8) -> u8 {
    let mut n = 0u8;
    for (dr, dc) in DIRS.iter() {
        let info = scan_line(board, r as i32, c as i32, *dr as i32, *dc as i32, color);
        if info.cnt == 4 {
            n += 1;
        }
    }
    n
}

/// 열린 4목만
pub fn count_open_fours(board: &Board, r: usize, c: usize, color: u8) -> u8 {
    let mut n = 0u8;
    for (dr, dc) in DIRS.iter() {
        let info = scan_line(board, r as i32, c as i32, *dr as i32, *dc as i32, color);
        if info.cnt == 4 && (info.open_f + info.open_b) >= 1 {
            n += 1;
        }
    }
    n
}

/// 한 수에 5목 또는 더블포면 true
pub fn is_instant_win(board: &Board, r: usize, c: usize, color: u8) -> bool {
    if check_win(board, r, c, color) {
        return true;
    }
    count_fours(board, r, c, color) >= 2
}

/// 열린 4목에 대한 필수 응수 위치
pub fn forced_replies_open_four(board: &Board, r: usize, c: usize, color: u8) -> Vec<(usize, usize)> {
    let mut set = std::collections::HashSet::new();
    for (dr, dc) in DIRS.iter() {
        let info = scan_line(board, r as i32, c as i32, *dr as i32, *dc as i32, color);
        if info.cnt != 4 || (info.open_f + info.open_b) < 1 {
            continue;
        }
        let mut rr = r as i32 + *dr as i32;
        let mut rc = c as i32 + *dc as i32;
        while in_bound(rr, rc) && get(board, rr as usize, rc as usize) == color {
            rr += *dr as i32;
            rc += *dc as i32;
        }
        if in_bound(rr, rc) && get(board, rr as usize, rc as usize) == EMPTY {
            set.insert((rr as usize, rc as usize));
        }
        rr = r as i32 - *dr as i32;
        rc = c as i32 - *dc as i32;
        while in_bound(rr, rc) && get(board, rr as usize, rc as usize) == color {
            rr -= *dr as i32;
            rc -= *dc as i32;
        }
        if in_bound(rr, rc) && get(board, rr as usize, rc as usize) == EMPTY {
            set.insert((rr as usize, rc as usize));
        }
    }
    set.into_iter().collect()
}

/// 열린 3목 방어점 (VCT용)
pub fn forced_replies_open_three(board: &mut Board, r: usize, c: usize, color: u8) -> Vec<(usize, usize)> {
    let mut set = std::collections::HashSet::new();
    for (dr, dc) in DIRS.iter() {
        if !matches!(line_type(board, r as i32, c as i32, *dr as i32, *dc as i32, color), LineType::Open3) {
            continue;
        }
        let mut rr = r as i32 + *dr as i32;
        let mut rc = c as i32 + *dc as i32;
        while in_bound(rr, rc) && get(board, rr as usize, rc as usize) == color {
            rr += *dr as i32;
            rc += *dc as i32;
        }
        if in_bound(rr, rc) && get(board, rr as usize, rc as usize) == EMPTY {
            set.insert((rr as usize, rc as usize));
        }
        rr = r as i32 - *dr as i32;
        rc = c as i32 - *dc as i32;
        while in_bound(rr, rc) && get(board, rr as usize, rc as usize) == color {
            rr -= *dr as i32;
            rc -= *dc as i32;
        }
        if in_bound(rr, rc) && get(board, rr as usize, rc as usize) == EMPTY {
            set.insert((rr as usize, rc as usize));
        }
    }
    set.into_iter().collect()
}

/// 렌주 금수 판정 (흑만)
pub fn forbidden(board: &mut Board, r: usize, c: usize) -> bool {
    set(board, r, c, BLACK);

    // 장목
    for (dr, dc) in DIRS.iter() {
        let info = scan_line(board, r as i32, c as i32, *dr as i32, *dc as i32, BLACK);
        if info.cnt >= 6 {
            set(board, r, c, EMPTY);
            return true;
        }
    }

    // 정확히 5목이면 금수 아님
    for (dr, dc) in DIRS.iter() {
        let info = scan_line(board, r as i32, c as i32, *dr as i32, *dc as i32, BLACK);
        if info.cnt == 5 {
            set(board, r, c, EMPTY);
            return false;
        }
    }

    let mut fours = 0u8;
    let mut threes = 0u8;
    for (dr, dc) in DIRS.iter() {
        let t = line_type(board, r as i32, c as i32, *dr as i32, *dc as i32, BLACK);
        if matches!(t, LineType::Open4 | LineType::Close4) {
            fours += 1;
        }
        if matches!(t, LineType::Open3) {
            threes += 1;
        }
    }

    set(board, r, c, EMPTY);
    if fours >= 2 || threes >= 2 {
        return true;
    }
    false
}

