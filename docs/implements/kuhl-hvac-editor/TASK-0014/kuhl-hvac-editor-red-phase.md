# TASK-0014: ZoneDrawTool Red Phase 記録

**タスクID**: TASK-0014
**機能名**: kuhl-hvac-editor
**フェーズ**: Red Phase（テスト失敗確認）
**実施日**: 2026-03-25

---

## 実施内容

### 作成したテストファイル

#### ファイル1: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`

純粋関数（`calculatePolygonArea`, `isValidPolygon`, `snapToGrid`）の単体テスト 16件。

- TC-001: calculatePolygonArea - 矩形（10x5=50m2）
- TC-002: calculatePolygonArea - 三角形 25m2
- TC-003: calculatePolygonArea - L字型不規則多角形 75m2
- TC-004: isValidPolygon - 3点以上で true
- TC-005: isValidPolygon - 4点矩形で true
- TC-006: snapToGrid - gridSize=1.0 基本動作
- TC-008: calculatePolygonArea - 空配列で 0
- TC-009: calculatePolygonArea - 1点で 0
- TC-010: calculatePolygonArea - 2点で 0
- TC-011: isValidPolygon - 空配列で false
- TC-012: isValidPolygon - 2点で false
- TC-013: isValidPolygon - undefined で false
- TC-014: calculatePolygonArea - 3点（最小有効ポリゴン） 6m2
- TC-015: calculatePolygonArea - 反時計回り頂点で正の値 50m2
- TC-016: snapToGrid - gridSize=0.5（500mmグリッド）
- TC-017: calculatePolygonArea - 非常に大きな座標値 100000000m2

#### ファイル2: `apps/kuhl-editor/__tests__/components/tools/zone-draw-tool.test.ts`

`HvacZoneNode.parse()` によるノード生成確認テスト 1件。

- TC-007: HvacZoneNode.parse() でノード生成確認（id, type, zoneName, usage, floorArea, boundary, designConditions.summerDryBulb のデフォルト値）

---

## テスト実行結果

```
コマンド: cd apps/kuhl-editor && node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts

Test Files  1 failed | 2 passed (3)
      Tests  16 passed (16)
   Duration  589ms
```

### 詳細

| テストファイル | 結果 | 理由 |
|-------------|------|------|
| `__tests__/lib/zone-draw-utils.test.ts` | **FAIL** | `../../lib/zone-draw-utils` モジュール未実装（Cannot find module） |
| `__tests__/components/tools/zone-draw-tool.test.ts` | PASS | TC-007 は `@kuhl/core` の `HvacZoneNode` が TASK-0012 で実装済みのためPASS |
| `__tests__/store/use-editor.test.ts` | PASS | 既存テスト（影響なし） |

### FAIL 詳細

```
FAIL __tests__/lib/zone-draw-utils.test.ts
Error: Cannot find module '../../lib/zone-draw-utils' imported from
  C:/Users/畠中大地/web-bim-editor/apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts
```

---

## Red Phase 判定

- **`zone-draw-utils.test.ts`**: 16件のテストケース全て → **Red（実装ファイル未作成のためモジュール解決エラー）**
- **`zone-draw-tool.test.ts`**: TC-007 → **Green（`@kuhl/core` HvacZoneNode は既存実装）**

`lib/zone-draw-utils.ts` が未実装であることが確認できた。Red Phase 完了。

---

## 次フェーズへの指針

### Green Phase で実装するファイル

**`apps/kuhl-editor/lib/zone-draw-utils.ts`**:

```typescript
// calculatePolygonArea: Shoelace formula
// A = 0.5 * |sum(x_i * z_{i+1} - x_{i+1} * z_i)|
export function calculatePolygonArea(vertices: [number, number][]): number {
  if (vertices.length < 3) return 0
  // Shoelace formula 実装
}

// isValidPolygon: Array.isArray && length >= 3
export function isValidPolygon(vertices: [number, number][]): boolean {
  return Array.isArray(vertices) && vertices.length >= 3
}

// snapToGrid: Math.round(value / gridSize) * gridSize
export function snapToGrid(point: [number, number], gridSize: number): [number, number] {
  return [
    Math.round(point[0] / gridSize) * gridSize,
    Math.round(point[1] / gridSize) * gridSize,
  ]
}
```

### 期待する Green Phase 結果

```
Test Files  3 passed (3)
      Tests  17 passed (17)
```

---

## 参照ドキュメント

- **テストケース**: `docs/implements/kuhl-hvac-editor/TASK-0014/kuhl-hvac-editor-testcases.md`
- **要件定義**: `docs/implements/kuhl-hvac-editor/TASK-0014/kuhl-hvac-editor-requirements.md`
- **HvacZoneNode スキーマ**: `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`
- **vitest 設定**: `apps/kuhl-editor/vitest.config.ts`（environment: node）
