/* ════════════════════════════════════════════
   js/EventBus.js  —  모듈 간 통신 허브
   Signal-Fog  /  팀 LNG

   ▸ 역할: game.js → chat.js의 addLog() 직접 호출처럼
           파일 간 직접 의존을 없애는 발행/구독 버스.
           모든 모듈은 EventBus만 import하면 서로
           연결 없이도 통신 가능.

   ▸ 사용법:
       // 발행 (어느 파일에서든)
       import bus from '../EventBus.js';
       import { EVT } from '../config.js';
       bus.emit(EVT.LOG, { sender: 'OC/T', text: '훈련 시작' });

       // 구독 (ChatUI 등)
       bus.on(EVT.LOG, ({ sender, text, type }) => { ... });

       // 단발성 구독 (한 번만 수신)
       bus.once(EVT.TURN_START, () => startAnimation());

   ▸ 규칙: 비즈니스 로직 없음 — 순수 이벤트 라우팅만.
════════════════════════════════════════════ */

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * 이벤트 구독
   * @param {string}   event
   * @param {Function} fn
   * @returns {Function} 구독 해제 함수 (cleanup용)
   */
  on(event, fn) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(fn);

    // 구독 해제 함수 반환 → Scene destroy()에서 메모리 누수 방지
    return () => this.off(event, fn);
  }

  /**
   * 단발성 구독 — 첫 번째 수신 후 자동 해제
   */
  once(event, fn) {
    const wrapper = (data) => {
      fn(data);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  /**
   * 구독 해제
   */
  off(event, fn) {
    this._listeners.get(event)?.delete(fn);
  }

  /**
   * 이벤트 발행
   * @param {string} event
   * @param {*}      data
   */
  emit(event, data) {
    this._listeners.get(event)?.forEach(fn => {
      try { fn(data); }
      catch (e) { console.error(`[EventBus] ${event} 핸들러 오류:`, e); }
    });
  }

  /**
   * 특정 이벤트의 모든 구독 해제 (Scene 전환 시 cleanup)
   */
  clear(event) {
    this._listeners.delete(event);
  }
}

// 앱 전체에서 단일 인스턴스 사용 (싱글턴)
const bus = new EventBus();
export default bus;
