/* ════════════════════════════════════════════
   js/systems/HexGrid.js  —  헥스 그리드 엔진
   Signal-Fog  /  팀 LNG

   ▸ 역할: 헥스 좌표계 변환, 거리 계산, 인접 타일,
           이동 범위, 시야 계산 등 순수 로직 담당.
           Phaser, DOM, Firebase에 의존하지 않음
           → 단독 테스트 가능.

   ▸ 좌표계: "offset coordinates" 중 Odd-Q 방식
     (열이 홀수일 때 위로 반칸 offset)
     - col(q), row(r) 정수 쌍으로 모든 타일 표현
     - 큐브 좌표(x,y,z)로 중간 계산 후 다시 변환

   ▸ 타일 방향: pointy-top (뾰족한 면이 위)

   ▸ 사용 예시:
       import { HexGrid } from '../systems/HexGrid.js';
       const grid = new HexGrid(20, 20, 40);
       const neighbors = grid.neighbors({ q: 5, r: 5 });
       const reachable = grid.reachable({ q: 0, r: 0 }, 3, costs);
════════════════════════════════════════════ */

import { HEX_SIZE, TERRAIN_COST } from '../config.js';

// ── 정적 유틸: 큐브 좌표 방향 벡터 ──────────
const CUBE_DIRS = [
  { x:  1, y: -1, z:  0 },
  { x:  1, y:  0, z: -1 },
  { x:  0, y:  1, z: -1 },
  { x: -1, y:  1, z:  0 },
  { x: -1, y:  0, z:  1 },
  { x:  0, y: -1, z:  1 },
];

export class HexGrid {
  /**
   * @param {number} cols  - 열 수 (가로)
   * @param {number} rows  - 행 수 (세로)
   * @param {number} size  - 헥스 외접원 반지름(px), 기본 HEX_SIZE
   */
  constructor(cols, rows, size = HEX_SIZE) {
    this.cols = cols;
    this.rows = rows;
    this.size = size;

    /**
     * 타일 데이터 맵: 키 = "q,r"
     * @type {Map<string, HexTile>}
     */
    this._tiles = new Map();

    this._initTiles();
  }

  // ── 초기화 ───────────────────────────────

  _initTiles() {
    for (let q = 0; q < this.cols; q++) {
      for (let r = 0; r < this.rows; r++) {
        this._tiles.set(this._key(q, r), {
          q, r,
          terrain:  'OPEN',
          unit:     null,   // 점유 유닛 참조
          visible:  false,  // 포그 오브 워
          commsOK:  true,   // 통신 가능 여부
        });
      }
    }
  }

  // ── 키 / 접근 ────────────────────────────

  _key(q, r) { return `${q},${r}`; }

  /** @returns {HexTile|undefined} */
  tile(q, r)    { return this._tiles.get(this._key(q, r)); }
  has(q, r)     { return this._tiles.has(this._key(q, r)); }

  setTerrain(q, r, terrain) {
    const t = this.tile(q, r);
    if (t) t.terrain = terrain;
  }

  // ── 좌표 변환 ─────────────────────────────

  /** Offset(q,r) → 큐브(x,y,z) */
  toCube(q, r) {
    const x = q;
    const z = r - (q - (q & 1)) / 2;
    return { x, y: -x - z, z };
  }

  /** 큐브(x,y,z) → Offset(q,r) */
  fromCube(x, y, z) {
    const q = x;
    const r = z + (x - (x & 1)) / 2;
    return { q, r };
  }

  /**
   * Offset 좌표 → 화면 픽셀(중심점)
   * pointy-top 헥스 기준
   */
  toPixel(q, r) {
    const w  = Math.sqrt(3) * this.size;
    const h  = 2 * this.size;
    const px = w * (q + 0.5 * (r & 1));
    const py = h * (3 / 4) * r;
    return { x: px, y: py };
  }

  /**
   * 화면 픽셀 → 가장 가까운 헥스 좌표
   */
  fromPixel(px, py) {
    const w  = Math.sqrt(3) * this.size;
    const h  = 2 * this.size;
    const r  = Math.round(py / (h * 3 / 4));
    const q  = Math.round((px - 0.5 * (r & 1) * w) / w);
    return { q, r };
  }

  // ── 거리 ─────────────────────────────────

  /** 두 Offset 좌표 간 헥스 거리 */
  distance(a, b) {
    const ac = this.toCube(a.q, a.r);
    const bc = this.toCube(b.q, b.r);
    return Math.max(
      Math.abs(ac.x - bc.x),
      Math.abs(ac.y - bc.y),
      Math.abs(ac.z - bc.z),
    );
  }

  // ── 인접 타일 ────────────────────────────

  /**
   * 인접 6타일 배열 반환 (맵 범위 내 것만)
   * @param {{ q:number, r:number }} hex
   * @returns {HexTile[]}
   */
  neighbors({ q, r }) {
    const c = this.toCube(q, r);
    return CUBE_DIRS
      .map(d => this.fromCube(c.x + d.x, c.y + d.y, c.z + d.z))
      .filter(({ q: nq, r: nr }) => this.has(nq, nr))
      .map(({ q: nq, r: nr }) => this.tile(nq, nr));
  }

  // ── 이동 범위 (BFS) ──────────────────────

  /**
   * 지정 AP 예산 내 도달 가능 타일 집합 반환
   * @param {{ q:number, r:number }} from
   * @param {number} budget       - 남은 AP
   * @param {Map<string,number>=}  costOverride  - 타일별 비용 재정의
   * @returns {Map<string, number>}  키="q,r", 값=소모 비용
   */
  reachable(from, budget, costOverride = new Map()) {
    const visited = new Map();   // key → 소모 비용
    const queue   = [{ q: from.q, r: from.r, spent: 0 }];
    visited.set(this._key(from.q, from.r), 0);

    while (queue.length) {
      const cur = queue.shift();
      const tile = this.tile(cur.q, cur.r);
      if (!tile) continue;

      for (const nb of this.neighbors(cur)) {
        const key  = this._key(nb.q, nb.r);
        const cost = costOverride.get(key) ?? TERRAIN_COST[nb.terrain] ?? 1;
        const total = cur.spent + cost;

        if (total <= budget && (!visited.has(key) || visited.get(key) > total)) {
          visited.set(key, total);
          queue.push({ q: nb.q, r: nb.r, spent: total });
        }
      }
    }

    visited.delete(this._key(from.q, from.r)); // 출발지 제외
    return visited;
  }

  // ── 시야 (BFS, 포그 오브 워) ──────────────

  /**
   * 지정 타일에서 반경 내 보이는 타일 집합
   * 장애물(고지·시가지 이면 등) 로직은 추후 확장
   * @param {{ q:number, r:number }} origin
   * @param {number} radius
   * @returns {Set<string>}
   */
  visibleFrom(origin, radius) {
    const visible = new Set();
    const queue   = [{ q: origin.q, r: origin.r, dist: 0 }];
    const seen    = new Set([this._key(origin.q, origin.r)]);

    while (queue.length) {
      const cur = queue.shift();
      visible.add(this._key(cur.q, cur.r));
      if (cur.dist >= radius) continue;

      for (const nb of this.neighbors(cur)) {
        const key = this._key(nb.q, nb.r);
        if (!seen.has(key)) {
          seen.add(key);
          queue.push({ q: nb.q, r: nb.r, dist: cur.dist + 1 });
        }
      }
    }
    return visible;
  }

  // ── 통신 음영 갱신 ───────────────────────

  /**
   * 지형에 따라 각 타일의 commsOK 플래그 갱신
   * GameScene에서 매 턴 시작 시 호출
   */
  refreshCommsZones() {
    this._tiles.forEach(tile => {
      tile.commsOK = tile.terrain !== 'VALLEY';  // 계곡 = 통신 음영
    });
  }

  // ── 직선 (사격 경로) ─────────────────────

  /**
   * a → b 간 헥스 직선 경로 (라인 오브 사이트용)
   * @returns {Array<{q:number,r:number}>}
   */
  line(a, b) {
    const n    = this.distance(a, b);
    const ac   = this.toCube(a.q, a.r);
    const bc   = this.toCube(b.q, b.r);
    const path = [];

    for (let i = 0; i <= n; i++) {
      const t  = n === 0 ? 0 : i / n;
      const rx = Math.round(ac.x + (bc.x - ac.x) * t);
      const rz = Math.round(ac.z + (bc.z - ac.z) * t);
      const ry = -rx - rz;
      path.push(this.fromCube(rx, ry, rz));
    }
    return path;
  }

  // ── Phaser 렌더링 헬퍼 ───────────────────

  /**
   * Phaser Scene의 Graphics 객체로 그리드 그리기
   * @param {Phaser.GameObjects.Graphics} gfx
   * @param {number} offsetX  - 뷰포트 오프셋
   * @param {number} offsetY
   */
  draw(gfx, offsetX = 0, offsetY = 0) {
    gfx.clear();
    gfx.lineStyle(1, 0x1e3a28, 0.6);

    this._tiles.forEach(tile => {
      if (!tile.visible) return; // 포그 숨김

      const { x, y } = this.toPixel(tile.q, tile.r);
      this._drawHex(gfx, x + offsetX, y + offsetY);
    });
  }

  _drawHex(gfx, cx, cy) {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 180 * (60 * i - 30); // pointy-top
      return {
        x: cx + this.size * Math.cos(a),
        y: cy + this.size * Math.sin(a),
      };
    });

    gfx.beginPath();
    gfx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
    gfx.closePath();
    gfx.strokePath();
  }
}

/**
 * @typedef {{ q:number, r:number, terrain:string,
 *             unit:*, visible:boolean, commsOK:boolean }} HexTile
 */
