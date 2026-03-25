/* ════════════════════════════════════════════
   js/ui/HUD.js  —  헤더·사이드 패널·푸터 HUD
   Signal-Fog  /  팀 LNG

   ▸ 역할: 턴 타이머, 생존 스탯 바, 자원 현황,
           푸터 상태 텍스트, 액션 버튼을 한 곳에서 관리.
           구버전 timer.js, actions.js의 전역 함수들을
           EventBus 이벤트로 완전 교체.

   ▸ 의존: EventBus, config(EVT, TURN_SEC, SURVIVAL_PENALTY)
   ▸ DOM 의존: #turn-timer, #timer-bar, #footer-status,
               .stat-fill, .resource-val, #hud-turn
════════════════════════════════════════════ */

import bus from '../EventBus.js';
import { EVT, TURN_SEC } from '../config.js';

export class HUD {
  constructor() {
    this._remain   = TURN_SEC;
    this._interval = null;

    this._timerEl  = document.getElementById('turn-timer');
    this._barEl    = document.getElementById('timer-bar');
    this._statusEl = document.getElementById('footer-status');
    this._turnEl   = document.getElementById('hud-turn');

    this._bindActions();
    this._subscribeEvents();
  }

  // ── 푸터 액션 버튼 연결 ───────────────────

  _bindActions() {
    document.querySelector('[data-action="hold"]')
      ?.addEventListener('click', () => this._onHold());

    document.querySelector('[data-action="confirm"]')
      ?.addEventListener('click', () => this._onConfirm());

    document.querySelector('[data-action="surrender"]')
      ?.addEventListener('click', () => this._onSurrender());
  }

  // ── EventBus 구독 ─────────────────────────

  _subscribeEvents() {
    bus.on(EVT.STATUS,      msg  => this.setStatus(msg));
    bus.on(EVT.TURN_START,  ()   => this.startTimer());
    bus.on(EVT.TURN_STOP,   ()   => this.stopTimer());

    // 생존 스탯 업데이트: { hunger, fatigue, sleep, fitness }
    bus.on('stats:update', stats => this._updateStats(stats));

    // 자원 업데이트: { battery, ammo, ap, terrain }
    bus.on('resource:update', res => this._updateResources(res));

    // 턴 번호 업데이트
    bus.on('turn:number', n => {
      if (this._turnEl) {
        this._turnEl.textContent = String(n).padStart(2, '0');
      }
    });
  }

  // ── 타이머 ────────────────────────────────

  startTimer() {
    this.stopTimer();
    this._remain = TURN_SEC;
    this._tick();
    this._interval = setInterval(() => {
      this._remain--;
      this._tick();
      if (this._remain <= 0) {
        this.stopTimer();
        bus.emit(EVT.TURN_EXPIRED, null);
        bus.emit(EVT.LOG, {
          text: '입력 시간 초과 → 자동 대기(HOLD) 처리',
          type: 'system',
        });
        this.setStatus('⚠ 시간 초과 — 자동 HOLD 처리됨');
      }
    }, 1000);
  }

  stopTimer() {
    clearInterval(this._interval);
    this._interval = null;
  }

  _tick() {
    if (!this._timerEl || !this._barEl) return;

    this._timerEl.textContent = this._remain;
    this._barEl.style.width   = (this._remain / TURN_SEC * 100) + '%';

    // 색상 계층
    this._timerEl.className = '';
    if (this._remain <= 10) {
      this._timerEl.classList.add('crit');
      this._barEl.style.background = 'var(--col-red)';
    } else if (this._remain <= 20) {
      this._timerEl.classList.add('warn');
      this._barEl.style.background = 'var(--col-amber)';
    } else {
      this._barEl.style.background = 'var(--col-green)';
    }
  }

  // ── 상태 텍스트 ───────────────────────────

  setStatus(msg) {
    if (this._statusEl) this._statusEl.textContent = msg;
  }

  // ── 생존 스탯 바 ──────────────────────────

  /**
   * @param {{ hunger:number, fatigue:number, sleep:number, fitness:number }} stats
   *   각 값: 0~100
   */
  _updateStats({ hunger, fatigue, sleep, fitness }) {
    const map = { hunger, fatigue, sleep, fitness };
    Object.entries(map).forEach(([key, val]) => {
      const fill = document.querySelector(`[data-stat="${key}"] .stat-fill`);
      const num  = document.querySelector(`[data-stat="${key}"] .stat-val`);
      if (!fill) return;

      fill.style.width = `${val}%`;
      fill.className = 'stat-fill';
      if (val <= 20) fill.classList.add('crit');
      else if (val <= 50) fill.classList.add('warn');

      if (num) num.textContent = val;
    });
  }

  // ── 자원 현황 ─────────────────────────────

  _updateResources({ battery, ammo, ammoMax, ap, apMax, terrain }) {
    this._setRes('battery',  battery != null ? `${battery}%` : null);
    this._setRes('ammo',     ammo    != null ? `${ammo} / ${ammoMax}` : null);
    this._setRes('ap',       ap      != null ? `${ap} / ${apMax}` : null);
    this._setRes('terrain',  terrain ?? null);
  }

  _setRes(key, val) {
    if (val == null) return;
    const el = document.querySelector(`[data-resource="${key}"] .resource-val`);
    if (el) el.textContent = val;
  }

  // ── 액션 버튼 핸들러 ─────────────────────

  _onHold() {
    bus.emit(EVT.ACTION_HOLD, null);
    bus.emit(EVT.LOG, { text: '행동 → HOLD (대기)', type: 'system' });
    this.setStatus('HOLD 선택됨 — 턴 종료 대기');
  }

  _onConfirm() {
    bus.emit(EVT.ACTION_CONFIRM, null);
    bus.emit(EVT.LOG, { text: '입력 확정 — 실행 대기 중', type: 'system' });
    this.setStatus('입력 확정 완료');
    this.stopTimer();
  }

  _onSurrender() {
    bus.emit(EVT.ACTION_SURRENDER, null);
    bus.emit(EVT.LOG, { text: '⚠ 항복 신호 송신됨', type: 'system' });
    this.setStatus('항복 처리 중...');
  }
}
