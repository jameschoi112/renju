# 렌주 오목 (Renju Gomoku)

흑(인간) vs 백(AI), 렌주 규칙 적용 오목 게임.

## 실행 방법

ES 모듈 사용으로 인해 로컬 파일 직접 열기(`file://`)는 동작하지 않을 수 있습니다. 로컬 서버로 실행하세요.

```bash
# Python 3
python3 -m http.server 8080

# 또는 npx
npx serve .
```

브라우저에서 `http://localhost:8080` 접속.

## 프로젝트 구조

```
renju-gomoku/
├── index.html       # 진입 HTML
├── css/
│   └── style.css    # 스타일
├── js/
│   ├── main.js      # 진입점, 캔버스·이벤트 바인딩
│   ├── constants.js # 상수 (N, CELL, BLACK/WHITE, 점수 등)
│   ├── board.js     # 보드 생성/복사, 좌표 유틸, boardFull
│   ├── rules.js     # 규칙: scanLine, lineType, checkWin, forbidden(금수)
│   ├── eval.js      # 패턴 점수, evalBoard
│   ├── ai.js        # 후보 수, VCF, minimax, bestMove
│   ├── draw.js      # 캔버스 그리기 (보드, 돌, 금수, 승리선)
│   └── game.js      # 게임 흐름 (착수, 턴, 클릭, AI 턴)
└── README.md
```

## 규칙 요약

- **흑**: 정확히 5목이면 승리. 6목 이상(장목), 4-4, 3-3은 금수.
- **백**: 5목 이상이면 승리 (장목 허용).
