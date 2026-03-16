//! Zobrist 해시 + Transposition Table (JS hash.js 대응)

use crate::board::Board;
use crate::constants::N;

/// Zobrist 테이블 크기: 각 칸(15x15)에 두 색(흑/백)
const ZOBRIST_SIZE: usize = N * N * 2;

fn zobrist_index(r: usize, c: usize, color: u8) -> usize {
    (r * N + c) * 2 + (color as usize - 1)
}

/// JS의 nextRand와 동일한 XORShift
fn build_zobrist() -> [u32; ZOBRIST_SIZE] {
    let mut arr = [0u32; ZOBRIST_SIZE];
    let mut seed: u32 = 0x1234_5678;
    for i in 0..ZOBRIST_SIZE {
        seed ^= seed.wrapping_shl(13);
        seed ^= seed.wrapping_shr(17);
        seed ^= seed.wrapping_shl(5);
        arr[i] = seed;
    }
    arr
}

static mut ZOBRIST: Option<[u32; ZOBRIST_SIZE]> = None;

fn zobrist_table() -> &'static [u32; ZOBRIST_SIZE] {
    // 간단한 lazy init (단일 스레드 WASM 전제)
    unsafe {
        if ZOBRIST.is_none() {
            ZOBRIST = Some(build_zobrist());
        }
        ZOBRIST.as_ref().unwrap()
    }
}

/// 보드 전체 Zobrist 해시 계산 (JS getHash)
#[inline]
pub fn get_hash(board: &Board) -> u32 {
    let z = zobrist_table();
    let mut h: u32 = 0;
    for r in 0..N {
        for c in 0..N {
            let cell = board[r * N + c];
            if cell != 0 {
                h ^= z[zobrist_index(r, c, cell)];
            }
        }
    }
    h
}

/// 한 수 반영 (놓을 때·없앨 때 동일 XOR) (JS updateHash)
#[inline]
pub fn update_hash(h: u32, r: usize, c: usize, color: u8) -> u32 {
    h ^ zobrist_table()[zobrist_index(r, c, color)]
}

/// TT 크기: 4M 엔트리 (JS와 동일)
const TT_SIZE: usize = 1 << 22;
const TT_MASK: u32 = (TT_SIZE - 1) as u32;

pub const TT_EXACT: u8 = 0;
pub const TT_LOWER: u8 = 1;
pub const TT_UPPER: u8 = 2;

const NO_MOVE: u8 = 255;

#[derive(Clone, Copy)]
struct TtEntry {
    key: u32,
    depth: u8,
    score: i32,
    flag: u8,
    move_r: u8,
    move_c: u8,
}

impl Default for TtEntry {
    fn default() -> Self {
        TtEntry {
            key: 0,
            depth: 0,
            score: 0,
            flag: TT_EXACT,
            move_r: NO_MOVE,
            move_c: NO_MOVE,
        }
    }
}

static mut TT: [TtEntry; TT_SIZE] = [TtEntry {
    key: 0,
    depth: 0,
    score: 0,
    flag: TT_EXACT,
    move_r: NO_MOVE,
    move_c: NO_MOVE,
}; TT_SIZE];

fn tt() -> &'static mut [TtEntry; TT_SIZE] {
    // WASM 단일 스레드 가정
    unsafe { &mut TT }
}

/// TT 조회 (JS ttGet)
pub fn tt_get(h: u32, depth: u8, alpha: i32, beta: i32) -> Option<i32> {
    let idx = (h & TT_MASK) as usize;
    let e = &tt()[idx];
    if e.key != h || e.depth < depth {
        return None;
    }
    let sc = e.score;
    match e.flag {
        TT_EXACT => Some(sc),
        TT_LOWER if sc >= beta => Some(sc),
        TT_UPPER if sc <= alpha => Some(sc),
        _ => None,
    }
}

/// TT 저장 (JS ttPut)
pub fn tt_put(h: u32, depth: u8, score: i32, flag: u8, mv: Option<(u8, u8)>) {
    let idx = (h & TT_MASK) as usize;
    let e = &mut tt()[idx];

    // JS: if (!tt[i] || tt[i].depth <= depth) { tt[i] = ... }
    if e.key != h && e.depth > depth {
        return;
    }

    let (mr, mc) = mv.unwrap_or((NO_MOVE, NO_MOVE));
    e.key = h;
    e.depth = depth;
    e.score = score;
    e.flag = flag;
    e.move_r = mr;
    e.move_c = mc;
}

/// 저장된 bestMove 반환 (JS ttGetMove)
pub fn tt_get_move(h: u32) -> Option<(u8, u8)> {
    let idx = (h & TT_MASK) as usize;
    let e = &tt()[idx];
    if e.key != h || e.move_r == NO_MOVE {
        return None;
    }
    Some((e.move_r, e.move_c))
}

/// TT 전체 초기화 (JS ttClear)
pub fn tt_clear() {
    for e in tt().iter_mut() {
        e.key = 0;
        e.depth = 0;
        e.score = 0;
        e.flag = TT_EXACT;
        e.move_r = NO_MOVE;
        e.move_c = NO_MOVE;
    }
}

