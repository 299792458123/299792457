/* ════════════════════════════════════════════
   js/scenes/LobbyScene.js  —  로비 씬
   Signal-Fog  /  팀 LNG

   ▸ 역할: Firebase 방 생성·참여, 역할 배정 UI,
           플레이어 준비 상태 동기화.
           모든 플레이어 READY → GameScene 전환.

   ▸ 의존: EventBus, config(EVT, FB_PATH, ROLE_AP)
   ▸ Firebase 경로: rooms/{roomId}/players/{uid}
════════════════════════════════════════════ */

import bus from '../EventBus.js';
import { EVT, FB_PATH, ROLE_AP } from '../config.js';

// 선택 가능 역할 목록 (DOC2 §5 고증)
const ROLES = [
  { id: 'COMPANY_CO',  label: '중대장',    force: 'BLUE', max: 1 },
  { id: 'XO',          label: '부중대장',  force: 'BLUE', max: 1 },
  { id: 'PLATOON_LDR', label: '소대장',    force: 'BLUE', max: 3 },
  { id: 'SQUAD_LDR',   label: '분대장',    force: 'BLUE', max: 9 },
  { id: 'RADIOMAN',    label: '무전병',    force: 'BLUE', max: 2 },
  { id: 'MEDIC',       label: '의무병',    force: 'BLUE', max: 2 },
  { id: 'ENGINEER',    label: '공병',      force: 'BLUE', max: 1 },
  { id: 'SUPPLY',      label: '보급관',    force: 'BLUE', max: 1 },
  { id: 'WEAPONS_LDR', label: '화기소대장',force: 'BLUE', max: 1 },
  { id: 'SOLDIER',     label: '병사',      force: 'BLUE', max: 99 },
];

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
    /** @type {firebase.database.Database|null} */
    this._db     = null;
    this._roomId = null;
    this._uid    = null;
    this._unsub  = [];  // Firebase 리스너 해제 함수 목록
  }

  // ── Phaser 생명주기 ──────────────────────

  create() {
    // EventBus 상태 알림
    bus.emit(EVT.STATUS, '로비 — 역할 배정 대기 중');
    bus.emit(EVT.LOG, {
      sender: 'SYSTEM',
      text:   'Signal-Fog 초기화 완료 — 로비 대기 중',
      type:   'system',
    });
    bus.emit(EVT.LOG, {
      sender: 'OC/T',
      text:   '훈련 시작 준비. 역할 배정 후 입장하십시오.',
    });
    bus.emit(EVT.LOG, {
      sender: '대항군',
      text:   '███ ████ ██ ████████...',
      type:   'distort',
    });

    // TODO: Firebase 익명 로그인 → 방 참여 흐름 연결
    // firebase.auth().signInAnonymously().then(cred => {
    //   this._uid = cred.user.uid;
    //   this._joinOrCreateRoom();
    // });

    // 개발 중 임시: 더미 역할 선택 UI 표시
    this._renderRoleSelect();
  }

  shutdown() {
    // 씬 종료 시 Firebase 리스너 전부 해제 → 메모리 누수 방지
    this._unsub.forEach(fn => fn());
    this._unsub = [];
  }

  // ── 역할 선택 UI ──────────────────────────

  _renderRoleSelect() {
    const container = document.getElementById('game-canvas-container');
    if (!container) return;

    // 이미 렌더된 경우 재생성 방지
    if (document.getElementById('lobby-panel')) return;

    const panel = document.createElement('div');
    panel.id        = 'lobby-panel';
    panel.innerHTML = `
      <div class="lobby-title">▸ 역할 배정</div>
      <div class="lobby-roles" id="lobby-role-list">
        ${ROLES.map(r => `
          <button class="lobby-role-btn" data-role="${r.id}">
            <span class="role-label">${r.label}</span>
            <span class="role-ap">AP ${ROLE_AP[r.id]}</span>
          </button>
        `).join('')}
      </div>
      <button class="btn primary" id="lobby-ready-btn" disabled>준비 완료</button>
    `;
    container.appendChild(panel);

    // 역할 버튼 클릭 → 선택 토글
    panel.querySelectorAll('.lobby-role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.lobby-role-btn')
          .forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this._selectedRole = btn.dataset.role;
        document.getElementById('lobby-ready-btn').disabled = false;
      });
    });

    // 준비 완료 버튼
    document.getElementById('lobby-ready-btn')
      ?.addEventListener('click', () => this._onReady());
  }

  _onReady() {
    if (!this._selectedRole) return;

    bus.emit(EVT.LOG, {
      sender: 'SYSTEM',
      text:   `역할 배정 완료: ${this._selectedRole}`,
      type:   'system',
    });
    bus.emit(EVT.STATUS, '준비 완료 — 다른 플레이어 대기 중');

    // TODO: Firebase players/{uid} = { role, ready: true } 저장
    // 전원 ready 감지 → GameScene 전환
    // 임시: 1초 후 바로 GameScene으로
    this.time.delayedCall(1000, () => {
      document.getElementById('lobby-panel')?.remove();
      this.scene.start('GameScene', {
        role:   this._selectedRole,
        roomId: this._roomId ?? 'DEV_ROOM',
        uid:    this._uid    ?? 'DEV_UID',
      });
    });
  }

  // ── Firebase — 방 생성·참여 ───────────────

  /**
   * 방 참여 또는 신규 생성
   * Firebase 연동 완료 후 주석 해제
   */
  // async _joinOrCreateRoom() { ... }
}
