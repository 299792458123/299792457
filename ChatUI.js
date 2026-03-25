/* ════════════════════════════════════════════
   js/ui/ChatUI.js  —  채팅 패널 UI 관리자
   Signal-Fog  /  팀 LNG

   ▸ 역할: 채팅 로그 렌더링, 채널 전환, 메시지 전송.
           구버전 chat.js의 addLog() 전역 함수를
           EventBus 구독으로 교체.
           어떤 모듈도 이 파일을 직접 import하지 않아도
           bus.emit(EVT.LOG, ...) 한 줄로 로그 추가 가능.

   ▸ 의존: EventBus, config(EVT)
   ▸ DOM 의존: #chat-log, #chat-input, #chat-send, .ch-tab
════════════════════════════════════════════ */

import bus from '../EventBus.js';
import { EVT } from '../config.js';

export class ChatUI {
  /** @param {firebase.database.Database|null} db — 나중에 주입 */
  constructor(db = null) {
    this._db       = db;
    this._channel  = '지휘';  // 현재 활성 채널
    this._logEl    = document.getElementById('chat-log');
    this._inputEl  = document.getElementById('chat-input');

    this._bindDOM();
    this._subscribeEvents();
  }

  // ── DOM 이벤트 연결 ───────────────────────

  _bindDOM() {
    // SEND 버튼
    document.getElementById('chat-send')
      ?.addEventListener('click', () => this.sendChat());

    // Enter 키
    this._inputEl
      ?.addEventListener('keydown', e => {
        if (e.key === 'Enter') this.sendChat();
      });

    // 채널 탭 — index.html의 onclick을 제거하고 여기서 관리
    document.querySelectorAll('.ch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchChannel(tab, tab.dataset.channel ?? tab.textContent.trim());
      });
    });
  }

  // ── EventBus 구독 ─────────────────────────

  _subscribeEvents() {
    // 어느 모듈에서든 bus.emit(EVT.LOG, payload) 로 로그 추가
    bus.on(EVT.LOG, ({ sender = null, time = null, text, type = '' }) => {
      this.addLog(sender, time, text, type);
    });
  }

  // ── 공개 API ──────────────────────────────

  /**
   * 로그 엔트리를 채팅 패널에 추가
   * @param {string|null} sender
   * @param {string|null} time   - 'HH:MM' | null → 현재 시각
   * @param {string}      text
   * @param {string}      type   - '' | 'system' | 'distort'
   */
  addLog(sender, time, text, type = '') {
    const t  = time ?? new Date().toTimeString().slice(0, 5);
    const el = document.createElement('div');
    el.className          = 'log-entry';
    el.style.animationDelay = '0s';

    if (type === 'system') {
      el.innerHTML =
        `<span class="log-time">[${t}]</span>` +
        `<span class="log-system">${this._escape(text)}</span>`;

    } else if (type === 'distort') {
      const safe = this._escape(text);
      el.innerHTML =
        `<span class="log-time">[${t}]</span>` +
        `<span class="log-sender">${this._escape(sender ?? '')}</span>` +
        `<span class="log-distort" data-raw="${safe}">${safe}</span>`;

    } else {
      el.innerHTML =
        `<span class="log-time">[${t}]</span>` +
        `<span class="log-sender">${this._escape(sender ?? '')}</span>` +
        `<span class="log-text">${this._escape(text)}</span>`;
    }

    this._logEl.appendChild(el);
    this._logEl.scrollTop = this._logEl.scrollHeight;
  }

  /** 채팅 전송 */
  sendChat() {
    const text = this._inputEl.value.trim();
    if (!text) return;

    // 로컬 즉시 표시
    this.addLog('나 >', null, text);
    this._inputEl.value = '';

    // TODO: Firebase chatManager 연동 후 실제 전송으로 교체
    // this._db?.ref(`rooms/${roomId}/chatLog/${this._channel}`).push(...)
  }

  /** 채널 탭 전환 */
  switchChannel(tab, name) {
    document.querySelectorAll('.ch-tab')
      .forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    this._channel = name;

    bus.emit(EVT.LOG, {
      text: `채널 전환 → [${name}]`,
      type: 'system',
    });

    // TODO: Firebase에서 해당 채널 히스토리 로드
  }

  // ── 내부 유틸 ─────────────────────────────

  /** XSS 방지 */
  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
