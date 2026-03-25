/* ════════════════════════════════════════════
   js/main.js  —  앱 진입점
   Signal-Fog  /  팀 LNG

   ▸ 역할: index.html의 <script type="module"> 진입점.
           - Phaser 게임 인스턴스 생성 + Scene 등록
           - UI 매니저(HUD, ChatUI) 초기화
           - 이 파일 이외 어떤 JS도 index.html에서
             직접 로드하지 않음.

   ▸ import 체인:
       main.js
       ├── scenes/BootScene.js
       ├── scenes/LobbyScene.js
       ├── scenes/GameScene.js   ← HexGrid, TurnManager 등 내부 import
       ├── ui/HUD.js             ← EventBus 구독
       ├── ui/ChatUI.js          ← EventBus 구독
       └── EventBus.js (싱글턴)

   ▸ 규칙: 게임 로직 없음 — 조립(wiring)만.
════════════════════════════════════════════ */

import { BootScene  } from './scenes/BootScene.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { GameScene  } from './scenes/GameScene.js';
import { HUD        } from './ui/HUD.js';
import { ChatUI     } from './ui/ChatUI.js';

// ── UI 매니저 초기화 (DOM 준비 후) ──────────
// HUD와 ChatUI는 EventBus를 구독하기만 하면 됨.
// 어떤 씬도 HUD/ChatUI를 직접 import하지 않음.
const hud    = new HUD();     // eslint-disable-line no-unused-vars
const chatUI = new ChatUI();  // eslint-disable-line no-unused-vars

// ── Phaser 게임 설정 ─────────────────────────
const config = {
  type: Phaser.AUTO,
  parent: 'game-canvas-container',
  backgroundColor: '#040604',
  scale: {
    mode:       Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // 씬은 배열로 등록 — 첫 번째가 자동 시작됨
  scene: [BootScene, LobbyScene, GameScene],
};

window.phaserGame = new Phaser.Game(config);
