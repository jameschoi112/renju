/**
 * AI 계산 전용 Web Worker — 메인 스레드 블로킹 방지
 */
import { bestMove, resetAI } from './ai.js';

self.onmessage = ({ data }) => {
  if (data.type === 'reset') {
    resetAI();
    return;
  }
  const { board, aiColor, moveHistory } = data;
  const move = bestMove(board, aiColor, moveHistory || []);
  self.postMessage(move);
};
