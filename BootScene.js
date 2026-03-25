/* ════════════════════════════════════════════
   js/scenes/BootScene.js  —  부팅 시퀀스 씬
   Signal-Fog  /  팀 LNG

   ▸ 역할: 게임 진입 시 로딩 로그 출력 + 프로그레스 바.
           기존 boot.js의 전역 함수(bootStep) 대신
           Phaser Scene 생명주기(create/update)로 관리.
           완료 후 LobbyScene으로 전환.

   ▸ DOM 의존: #boot-screen, #boot-log, #boot-bar
               (Phaser 캔버스 위 오버레이)
   ▸ 의존: EventBus, config(EVT)
════════════════════════════════════════════ */

import bus from '../EventBus.js';
import { EVT } from '../config.js';

const BOOT_LINES = [
  '> SIGNAL-FOG v0.1 초기화 중...',
  '> Phaser.js 3.90.0 로드 완료',
  '> Firebase SDK 연결 대기...',
  '> Howler.js 사운드 엔진 활성화',
  '> 헥스 그리드 모듈 로드 중...',
  '> TensorFlow.js 봇 엔진 준비',
  '> Firebase Realtime DB 연결...',
  '> 사지방 네트워크 환경 감지',
  '> 로비 씬 진입 준비 완료',
  '> 전술 시뮬레이터 시작',
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
    this._bootIdx = 0;
  }

  // ── Phaser 생명주기 ──────────────────────

  preload() {
    // TODO: 에셋 로딩 (타일·유닛 스프라이트·사운드)
    // this.load.image('tile-open', 'assets/tiles/open.png');
  }

  create() {
    this._logEl = document.getElementById('boot-log');
    this._barEl = document.getElementById('boot-bar');
    this._scrEl = document.getElementById('boot-screen');

    // 시계 시작 (boot.js의 updateClock 이전)
    this._startClock();

    // 첫 줄 출력 시작
    this.time.delayedCall(600, () => this._bootStep());
  }

  // ── 부팅 시퀀스 ──────────────────────────

  _bootStep() {
    if (this._bootIdx >= BOOT_LINES.length) {
      // 모든 줄 출력 완료 → 씬 전환
      this.time.delayedCall(400, () => this._finish());
      return;
    }

    // 줄 추가
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = BOOT_LINES[this._bootIdx];
    line.style.animationDelay = '0s';
    this._logEl.appendChild(line);

    // 프로그레스 바
    this._bootIdx++;
    this._barEl.style.width =
      (this._bootIdx / BOOT_LINES.length * 100) + '%';

    // 다음 줄 딜레이 (220~400ms 랜덤 — 실제 로딩처럼 보이게)
    const delay = 220 + Math.random() * 180;
    this.time.delayedCall(delay, () => this._bootStep());
  }

  _finish() {
    this._scrEl.style.transition = 'opacity .6s';
    this._scrEl.style.opacity    = '0';

    this.time.delayedCall(650, () => {
      this._scrEl.style.display = 'none';
      this.scene.start('LobbyScene');
    });
  }

  // ── 시계 ─────────────────────────────────

  _startClock() {
    const update = () => {
      const now = new Date();
      const el  = document.getElementById('clock');
      if (el) {
        el.textContent =
          String(now.getHours()).padStart(2, '0')   + ':' +
          String(now.getMinutes()).padStart(2, '0') + ':' +
          String(now.getSeconds()).padStart(2, '0') + ' KST';
      }
    };
    update();
    // Phaser time 대신 setInterval — 씬 전환 후에도 계속 동작해야 함
    setInterval(update, 1000);
  }
}
