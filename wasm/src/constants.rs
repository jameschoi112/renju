//! 렌주 오목 상수 (JS constants.js 대응)

/// 보드 크기
pub const N: usize = 15;

/// 칸 상태
pub const EMPTY: u8 = 0;
pub const BLACK: u8 = 1;
pub const WHITE: u8 = 2;

/// 4방향: 우, 하, 우하, 우상
pub const DIRS: [(i8, i8); 4] = [
    (0, 1),
    (1, 0),
    (1, 1),
    (1, -1),
];

/// 패턴 점수 — JS `S`와 동일
pub mod scores {
    pub const WIN: i32 = 10_000_000;
    pub const O4: i32 = 500_000;
    pub const C4: i32 = 50_000;
    pub const D4: i32 = 5_000;
    pub const O3: i32 = 10_000;
    pub const H3: i32 = 3_500;
    pub const C3: i32 = 1_000;
    pub const O2: i32 = 200;
    pub const C2: i32 = 20;
    pub const DOUBLE_THREAT: i32 = 400_000;
    pub const CROSS_THREAT: i32 = 600_000;
    pub const FORK_OPEN4: i32 = 1_200_000;
    pub const INITIATIVE: i32 = 2_000;
}

