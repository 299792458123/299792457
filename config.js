/* ════════════════════════════════════════════
   js/config.js  —  게임 전역 상수
   Signal-Fog  /  팀 LNG

   ▸ 역할: 게임 전체에서 사용하는 숫자·문자열 상수를
           한 파일에 집결. 밸런스 조정 시 여기만 수정.
   ▸ 규칙: 로직 없음 — export const 만 허용.
════════════════════════════════════════════ */

// ── 턴 시스템 ──────────────────────────────
export const TURN_SEC          = 60;   // 입력 페이즈 제한 시간(초)
export const HANDOVER_SEC      = 30;   // 지휘관 사망 후 인수인계 제한 시간
export const EXEC_TICK_MS      = 400;  // 실행 페이즈 1액션당 애니메이션 딜레이

// ── 맵 ──────────────────────────────────────
export const MAP_COLS_PROTO    = 20;   // 예선 프로토타입 가로 헥스 수
export const MAP_ROWS_PROTO    = 20;   // 예선 프로토타입 세로 헥스 수
export const MAP_COLS_FINAL    = 40;   // 본선 확장
export const MAP_ROWS_FINAL    = 40;
export const HEX_SIZE          = 40;   // 헥스 외접원 반지름(px)

// ── 지형 이동 비용 (턴당 AP 소모) ───────────
export const TERRAIN_COST = Object.freeze({
  OPEN:       1,  // 개활지
  HILL_TOP:   2,  // 고지 정상
  VALLEY:     2,  // 계곡·저지대
  HILL_BACK:  2,  // 고지 이면
  URBAN:      2,  // 시가지
  FOREST:     2,  // 수풀·숲
  RIVER:      3,  // 하천·도하
  BRIDGE:     1,  // 교량
  MINEFIELD: Infinity, // 지뢰지대 (진입 불가)
});

// ── 통신 품질 임계값 ────────────────────────
export const COMMS_QUALITY = Object.freeze({
  DISTORT_THRESHOLD:   70,  // % 이하 → 오청 발생
  DELAY_THRESHOLD:     50,  // % 이하 → 지연 발생
  BLACKOUT_THRESHOLD:   0,  // % → 완전 두절
  BATTERY_WARN:        20,  // % 이하 → 배터리 경고
  INTERCEPT_OPEN:      25,  // 개활지 도청 노출 보정(%)
});

// ── 생존 스탯 기본 감소량 (턴당) ────────────
export const SURVIVAL_DECAY = Object.freeze({
  HUNGER_BASE:   3,   // 배고픔 기본 감소
  FATIGUE_BASE:  2,   // 피로도 기본 감소
  FATIGUE_COMBAT:3,   // 전투·이동 시 추가
  SLEEP_NIGHT:  20,   // 야간 페이즈 미수면 감소
});

// ── 생존 스탯 패널티 임계값 ─────────────────
export const SURVIVAL_PENALTY = Object.freeze({
  HUNGER_MOVE:   50,  // 배고픔 50% 이하 → 이동력 -1
  HUNGER_AP:      0,  // 배고픔 0% → AP -2
  FATIGUE_AIM:   50,  // 피로도 50% 이하 → 명중 -10%, 오청 +10%
  FATIGUE_AP:     0,  // 피로도 0% → AP -3, 오청 +25%
  SLEEP_JUDGE:   50,  // 수면 50% 이하 → 판단 -1, 시야 -1
  SLEEP_DOWN:     0,  // 수면 0% → 행동불능 위험
});

// ── 역할별 기본 AP ────────────────────────
export const ROLE_AP = Object.freeze({
  COMPANY_CO:   3,  // 중대장
  XO:           3,  // 부중대장
  PLATOON_LDR:  4,  // 소대장
  SQUAD_LDR:    5,  // 분대장
  SOLDIER:      6,  // 병사
  RADIOMAN:     4,  // 무전병
  MEDIC:        4,  // 의무병
  ENGINEER:     4,  // 공병
  SUPPLY:       4,  // 보급관
  WEAPONS_LDR:  4,  // 화기소대장
});

// ── 무기 스펙 ──────────────────────────────
export const WEAPON_SPEC = Object.freeze({
  RIFLE:      { range: 5,  acc: 60, damage: 'kill_wound' },
  MG:         { range: 8,  acc: 50, damage: 'kill_wound', suppress: 1 },
  MORTAR:     { range: 15, acc: 40, damage: 'aoe3' },
  AT:         { range: 10, acc: 70, damage: 'vehicle_kill' },
  GRENADE:    { range: 2,  acc: null, damage: 'aoe2' },
  ARTY:       { range: 99, acc: 35, damage: 'aoe5', delay: 3 },
});

// ── Firebase 경로 키 ────────────────────────
export const FB_PATH = Object.freeze({
  ROOMS:       'rooms',
  PLAYERS:     'players',
  GAME_STATE:  'gameState',
  TURN_INPUTS: 'turnInputs',
  CHAT:        'chatLog',
  AAR:         'aarData',
});

// ── 이벤트 버스 이벤트명 (오타 방지용 상수) ──
export const EVT = Object.freeze({
  LOG:             'log',          // ChatUI → 로그 추가
  STATUS:          'status',       // HUD → 하단 상태 텍스트
  TURN_START:      'turn:start',   // TurnManager → 타이머 시작
  TURN_STOP:       'turn:stop',    // TurnManager → 타이머 정지
  TURN_EXPIRED:    'turn:expired', // TurnManager → 시간 초과
  ACTION_HOLD:     'action:hold',
  ACTION_CONFIRM:  'action:confirm',
  ACTION_SURRENDER:'action:surrender',
  UNIT_MOVE:       'unit:move',
  UNIT_FIRE:       'unit:fire',
  UNIT_DEAD:       'unit:dead',
  COMMS_ERROR:     'comms:error',
  SUPPLY_UPDATE:   'supply:update',
});
