# TASK-0014: ZoneDrawTool Green Phase 記録

**タスクID**: TASK-0014
**機能名**: kuhl-hvac-editor
**フェーズ**: Green Phase（テスト全件パス確認）
**実施日**: 2026-03-25

---

## 実施内容

### 作成したファイル

#### ファイル1: `apps/kuhl-editor/lib/zone-draw-utils.ts`

純粋関数3件を実装。R3F/Three.js 非依存。

- `calculatePolygonArea(vertices: [number, number][]): number`
  - Shoelace formula: `A = 0.5 * |Σ(x_i * z_{i+1} - x_{i+1} * z_i)|`
  - 頂点数が3未満の場合は0を返す
  - `Math.abs()` により巡回方向（時計回り/反時計回り）に依存せず正値を返す

- `isValidPolygon(vertices: unknown): boolean`
  - `Array.isArray(vertices) && vertices.length >= 3`
  - `undefined` を渡しても例外を投げず `false` を返す

- `snapToGrid(point: [number, number], gridSize: number): [number, number]`
  - `Math.round(value / gridSize) * gridSize` で各軸をスナップ

#### ファイル2: `apps/kuhl-editor/components/tools/zone-draw-tool.tsx`

ZoneDrawTool コンポーネントの骨格実装。

- ローカル state で頂点配列（`vertices: [number, number][]`）を管理
- `Enter` キーで `isValidPolygon` 判定後にダイアログ表示フラグを立てる
- `Escape` キーで頂点リセット（ダイアログ表示中はダイアログのみ閉じ、頂点維持）
- unmount 時に頂点・ダイアログ状態をクリーンアップ
- `confirmZone()` で `calculatePolygonArea()` を使って面積算出後 `HvacZoneNode.parse()` を呼び出す
- ツール規約準拠: `useScene` のみ変更（未統合部分はコメントで明示）、直接 Three.js API 呼び出しなし

---

## テスト実行結果

### `apps/kuhl-editor` テスト

```
コマンド: cd apps/kuhl-editor && node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts

Test Files  3 passed (3)
      Tests  32 passed (32)
   Duration  712ms
```

| テストファイル | 結果 | テスト数 |
|-------------|------|--------|
| `__tests__/lib/zone-draw-utils.test.ts` | **PASS** | 16件 |
| `__tests__/components/tools/zone-draw-tool.test.ts` | **PASS** | 1件 (TC-007) |
| `__tests__/store/use-editor.test.ts` | **PASS** | 15件（既存） |

### `packages/kuhl-core` 回帰テスト

```
コマンド: cd packages/kuhl-core && node ../../node_modules/vitest/vitest.mjs run

Test Files  10 passed (10)
      Tests  250 passed (250)
   Duration  834ms
```

回帰なし。

---

## Green Phase 判定

- **`zone-draw-utils.test.ts`** (16件): 全件 **Green**
  - TC-001〜TC-003: calculatePolygonArea 正常系（矩形、三角形、L字型）
  - TC-004〜TC-005: isValidPolygon 正常系
  - TC-006: snapToGrid 基本動作
  - TC-008〜TC-010: calculatePolygonArea 異常系（空配列、1点、2点）
  - TC-011〜TC-013: isValidPolygon 異常系（空配列、2点、undefined）
  - TC-014〜TC-015: calculatePolygonArea 境界値（3点最小、反時計回り）
  - TC-016: snapToGrid 境界値（gridSize=0.5）
  - TC-017: calculatePolygonArea 大座標値

- **`zone-draw-tool.test.ts`** (1件): **Green**（Red Phase から継続 PASS）
  - TC-007: HvacZoneNode.parse() でノード生成確認

**Green Phase 完了。全 17件のテストケースが PASS。**

---

## 実装の方針

- Red Phase 記録の方針通りに最小実装を行った
- 過剰な実装を避け、テストパスに必要な最低限のロジックのみ実装
- `ZoneDrawTool` コンポーネントは TC-007 が既に PASS していたため骨格実装のみ
- `useScene.createNode()` の実際の呼び出しは統合時に追加（現在はコメントで明示）

---

## 参照ドキュメント

- **要件定義**: `docs/implements/kuhl-hvac-editor/TASK-0014/kuhl-hvac-editor-requirements.md`
- **Red Phase 記録**: `docs/implements/kuhl-hvac-editor/TASK-0014/kuhl-hvac-editor-red-phase.md`
- **テストケース**: `docs/implements/kuhl-hvac-editor/TASK-0014/kuhl-hvac-editor-testcases.md`
- **HvacZoneNode スキーマ**: `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`
- **vitest 設定**: `apps/kuhl-editor/vitest.config.ts`
