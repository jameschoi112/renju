/**
 * AI 계산 전용 Web Worker — 메인 스레드 블로킹 방지
 * 다중 워커 시 timeLimitMs, returnDepth 전달하면 { move, depthReached } 반환.
 */
import { bestMove, resetAI } from './ai.js';

self.onmessage = ({ data }) => {
  if (data.type === 'reset') {
    resetAI();
    return;
  }
  const { board, aiColor, moveHistory, timeLimitMs, returnDepth } = data;
  const options = {};
  if (timeLimitMs != null) options.timeLimitMs = timeLimitMs;
  if (returnDepth) options.returnDepth = true;
  const result = bestMove(board, aiColor, moveHistory || [], options);
  self.postMessage(result);
};
