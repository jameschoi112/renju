/**
 * 진입점: 캔버스 설정, 이벤트 바인딩
 */
import { SIZE } from './constants.js';
import {
  resetGame,
  setCanvasContext,
  setupClick,
  toggleFirst,
  setFirstCustom,
} from './game.js';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = canvas.height = SIZE;

setCanvasContext(ctx);
setupClick(canvas);

document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('btnFirst').addEventListener('click', toggleFirst);
document.getElementById('btnFirstCustom').addEventListener('click', setFirstCustom);

resetGame();
