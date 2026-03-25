# TASK-0014: ZoneDrawTool テストケース定義書

**タスクID**: TASK-0014
**機能名**: kuhl-hvac-editor
**要件名**: ZoneDrawTool（ポリゴン描画ツール）
**作成日**: 2026-03-25

---

## テスト方針

ZoneDrawTool は React Three Fiber / DOM イベントに強く依存するコンポーネントであるため、**純粋関数（`calculatePolygonArea`, `isValidPolygon`, `snapToGrid`）のテストを中心**に構成する。これらの関数は `apps/kuhl-editor/lib/zone-draw-utils.ts` に分離し、R3F 環境なしで高速に単体テスト可能とする。

コンポーネントテスト（ZoneDrawTool 本体）は Raycaster モック等の環境構築コストが高いため、最小限に留める。`HvacZoneNode.parse()` によるノード生成は `@kuhl/core` のスキーマテストとして実施する。

### テストファイル構成

| テストファイル | テスト対象 | 環境 |
|-------------|-----------|------|
| `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts` | 純粋関数（calculatePolygonArea, isValidPolygon, snapToGrid） | node（R3F 不要） |
| `apps/kuhl-editor/__tests__/components/tools/zone-draw-tool.test.tsx` | HvacZoneNode.parse() ノード生成 | node（R3F 不要） |

### テストパターン

- 既存テスト `apps/kuhl-editor/__tests__/store/use-editor.test.ts` のパターンに準拠
- `vitest` + `describe/it/expect` 構文
- `afterEach` でストア・モックのリセット

---

## テストケース一覧

### 正常系テストケース（純粋関数）

#### TC-001: calculatePolygonArea - 矩形（10x5=50m2）

- **テストID**: TC-001
- **カテゴリ**: 正常系
- **テスト対象**: `calculatePolygonArea`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 矩形の頂点配列 `[[0,0], [10,0], [10,5], [0,5]]`
- **When**: `calculatePolygonArea(vertices)` を呼び出す
- **Then**: 戻り値が `50` である
- **検証式**: `expect(calculatePolygonArea([[0,0],[10,0],[10,5],[0,5]])).toBe(50)`
- **根拠**: 要件定義 3.1 - Shoelace formula による面積自動算出

---

#### TC-002: calculatePolygonArea - 三角形

- **テストID**: TC-002
- **カテゴリ**: 正常系
- **テスト対象**: `calculatePolygonArea`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 三角形の頂点配列 `[[0,0], [10,0], [0,5]]`
- **When**: `calculatePolygonArea(vertices)` を呼び出す
- **Then**: 戻り値が `25` である（底辺10 x 高さ5 / 2）
- **検証式**: `expect(calculatePolygonArea([[0,0],[10,0],[0,5]])).toBe(25)`
- **根拠**: 要件定義 3.1 - Shoelace formula は任意の多角形に対応

---

#### TC-003: calculatePolygonArea - 不規則多角形（L字型）

- **テストID**: TC-003
- **カテゴリ**: 正常系
- **テスト対象**: `calculatePolygonArea`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: L字型の6頂点 `[[0,0], [10,0], [10,5], [5,5], [5,10], [0,10]]`
- **When**: `calculatePolygonArea(vertices)` を呼び出す
- **Then**: 戻り値が `75` である（10x5 + 5x5 = 75）
- **検証式**: `expect(calculatePolygonArea([[0,0],[10,0],[10,5],[5,5],[5,10],[0,10]])).toBe(75)`
- **根拠**: UC-02 L字型ゾーン描画の面積自動算出

---

#### TC-004: isValidPolygon - 3点以上で true

- **テストID**: TC-004
- **カテゴリ**: 正常系
- **テスト対象**: `isValidPolygon`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 3点の頂点配列 `[[0,0], [5,0], [5,5]]`
- **When**: `isValidPolygon(vertices)` を呼び出す
- **Then**: 戻り値が `true` である
- **検証式**: `expect(isValidPolygon([[0,0],[5,0],[5,5]])).toBe(true)`
- **根拠**: 要件定義 3.2 - 判定条件 `vertices.length >= 3`

---

#### TC-005: isValidPolygon - 4点矩形で true

- **テストID**: TC-005
- **カテゴリ**: 正常系
- **テスト対象**: `isValidPolygon`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 4点の矩形頂点配列 `[[0,0], [10,0], [10,5], [0,5]]`
- **When**: `isValidPolygon(vertices)` を呼び出す
- **Then**: 戻り値が `true` である
- **検証式**: `expect(isValidPolygon([[0,0],[10,0],[10,5],[0,5]])).toBe(true)`
- **根拠**: 要件定義 3.2 - 4点以上も有効

---

#### TC-006: snapToGrid - 基本動作（gridSize=1.0）

- **テストID**: TC-006
- **カテゴリ**: 正常系
- **テスト対象**: `snapToGrid`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 座標 `[3.3, 7.8]`、gridSize `1.0`
- **When**: `snapToGrid([3.3, 7.8], 1.0)` を呼び出す
- **Then**: 戻り値が `[3, 8]` である
- **検証式**: `expect(snapToGrid([3.3, 7.8], 1.0)).toEqual([3, 8])`
- **根拠**: 要件定義 3.3 - `Math.round(x / gridSize) * gridSize`

---

#### TC-007: HvacZoneNode.parse() でノード生成確認

- **テストID**: TC-007
- **カテゴリ**: 正常系
- **テスト対象**: `HvacZoneNode.parse()`
- **テストファイル**: `apps/kuhl-editor/__tests__/components/tools/zone-draw-tool.test.tsx`
- **Given**: `{ zoneName: 'Test Zone', usage: 'office', floorArea: 50, boundary: [[0,0],[10,0],[10,5],[0,5]] }`
- **When**: `HvacZoneNode.parse(input)` を呼び出す
- **Then**:
  - `zone.id` が `/^zone_/` にマッチする
  - `zone.type` が `'hvac_zone'` である
  - `zone.zoneName` が `'Test Zone'` である
  - `zone.usage` が `'office'` である
  - `zone.floorArea` が `50` である
  - `zone.boundary` が `[[0,0],[10,0],[10,5],[0,5]]` である
  - `zone.designConditions.summerDryBulb` がデフォルト値 `26` である
- **検証式**:
  ```typescript
  const zone = HvacZoneNode.parse({ zoneName: 'Test Zone', usage: 'office', floorArea: 50, boundary: [[0,0],[10,0],[10,5],[0,5]] })
  expect(zone.id).toMatch(/^zone_/)
  expect(zone.type).toBe('hvac_zone')
  expect(zone.zoneName).toBe('Test Zone')
  expect(zone.designConditions.summerDryBulb).toBe(26)
  ```
- **根拠**: TASK-0014 テストケース4、要件定義 2.3

---

### 異常系テストケース

#### TC-008: calculatePolygonArea - 空配列で 0

- **テストID**: TC-008
- **カテゴリ**: 異常系
- **テスト対象**: `calculatePolygonArea`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 空配列 `[]`
- **When**: `calculatePolygonArea([])` を呼び出す
- **Then**: 戻り値が `0` である
- **検証式**: `expect(calculatePolygonArea([])).toBe(0)`
- **根拠**: 要件定義 3.1 エッジケース - 空配列 → 0

---

#### TC-009: calculatePolygonArea - 1点で 0

- **テストID**: TC-009
- **カテゴリ**: 異常系
- **テスト対象**: `calculatePolygonArea`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 1点の配列 `[[5, 3]]`
- **When**: `calculatePolygonArea([[5, 3]])` を呼び出す
- **Then**: 戻り値が `0` である
- **検証式**: `expect(calculatePolygonArea([[5, 3]])).toBe(0)`
- **根拠**: 要件定義 3.1 エッジケース - 1点 → 0

---

#### TC-010: calculatePolygonArea - 2点で 0

- **テストID**: TC-010
- **カテゴリ**: 異常系
- **テスト対象**: `calculatePolygonArea`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 2点の配列 `[[0, 0], [10, 0]]`
- **When**: `calculatePolygonArea([[0, 0], [10, 0]])` を呼び出す
- **Then**: 戻り値が `0` である
- **検証式**: `expect(calculatePolygonArea([[0,0],[10,0]])).toBe(0)`
- **根拠**: 要件定義 3.1 エッジケース - 2点 → 0

---

#### TC-011: isValidPolygon - 空配列で false

- **テストID**: TC-011
- **カテゴリ**: 異常系
- **テスト対象**: `isValidPolygon`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 空配列 `[]`
- **When**: `isValidPolygon([])` を呼び出す
- **Then**: 戻り値が `false` である
- **検証式**: `expect(isValidPolygon([])).toBe(false)`
- **根拠**: 要件定義 3.2 - `vertices.length >= 3` 未満は false; EDGE-001

---

#### TC-012: isValidPolygon - 2点で false

- **テストID**: TC-012
- **カテゴリ**: 異常系
- **テスト対象**: `isValidPolygon`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 2点の配列 `[[0, 0], [5, 5]]`
- **When**: `isValidPolygon([[0, 0], [5, 5]])` を呼び出す
- **Then**: 戻り値が `false` である
- **検証式**: `expect(isValidPolygon([[0,0],[5,5]])).toBe(false)`
- **根拠**: 要件定義 3.2 - 3点未満は Enter 確定不可; EDGE-001

---

#### TC-013: isValidPolygon - undefined で false

- **テストID**: TC-013
- **カテゴリ**: 異常系
- **テスト対象**: `isValidPolygon`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: `undefined` 入力
- **When**: `isValidPolygon(undefined as any)` を呼び出す
- **Then**: 戻り値が `false` である（例外を投げない）
- **検証式**: `expect(isValidPolygon(undefined as any)).toBe(false)`
- **根拠**: 防御的プログラミング - 不正入力に対する安全なフォールバック

---

### 境界値テストケース

#### TC-014: calculatePolygonArea - 3点（最小有効ポリゴン）

- **テストID**: TC-014
- **カテゴリ**: 境界値
- **テスト対象**: `calculatePolygonArea`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 3点の三角形 `[[0,0], [4,0], [0,3]]`（最小有効ポリゴン）
- **When**: `calculatePolygonArea(vertices)` を呼び出す
- **Then**: 戻り値が `6` である（底辺4 x 高さ3 / 2）
- **検証式**: `expect(calculatePolygonArea([[0,0],[4,0],[0,3]])).toBe(6)`
- **根拠**: 3点は `isValidPolygon` が `true` を返す最小頂点数。面積計算の最小有効入力。

---

#### TC-015: calculatePolygonArea - 反時計回り頂点で正の値

- **テストID**: TC-015
- **カテゴリ**: 境界値
- **テスト対象**: `calculatePolygonArea`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 反時計回りの矩形 `[[0,0], [0,5], [10,5], [10,0]]`
- **When**: `calculatePolygonArea(vertices)` を呼び出す
- **Then**: 戻り値が `50` である（正の値。巡回方向に依存しない）
- **検証式**: `expect(calculatePolygonArea([[0,0],[0,5],[10,5],[10,0]])).toBe(50)`
- **根拠**: 要件定義 3.1 - 絶対値を返す（頂点の巡回方向に依存しない）

---

#### TC-016: snapToGrid - gridSize=0.5（500mm グリッド）

- **テストID**: TC-016
- **カテゴリ**: 境界値
- **テスト対象**: `snapToGrid`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 座標 `[3.3, 7.6]`、gridSize `0.5`
- **When**: `snapToGrid([3.3, 7.6], 0.5)` を呼び出す
- **Then**: 戻り値が `[3.5, 7.5]` である
- **検証式**: `expect(snapToGrid([3.3, 7.6], 0.5)).toEqual([3.5, 7.5])`
- **根拠**: 要件定義 3.3 - デフォルト gridSize 0.5 での動作確認

---

#### TC-017: calculatePolygonArea - 非常に大きな座標値

- **テストID**: TC-017
- **カテゴリ**: 境界値
- **テスト対象**: `calculatePolygonArea`
- **テストファイル**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`
- **Given**: 大きな座標値の矩形 `[[0,0], [10000,0], [10000,10000], [0,10000]]`
- **When**: `calculatePolygonArea(vertices)` を呼び出す
- **Then**: 戻り値が `100000000`（1億 m2）である
- **検証式**: `expect(calculatePolygonArea([[0,0],[10000,0],[10000,10000],[0,10000]])).toBe(100000000)`
- **根拠**: 浮動小数点精度の境界確認。大規模建物や敷地でのオーバーフローがないことを保証。

---

## テストケースサマリー

| テストID | カテゴリ | テスト対象 | 概要 |
|---------|---------|-----------|------|
| TC-001 | 正常系 | calculatePolygonArea | 矩形 10x5=50m2 |
| TC-002 | 正常系 | calculatePolygonArea | 三角形 25m2 |
| TC-003 | 正常系 | calculatePolygonArea | L字型不規則多角形 75m2 |
| TC-004 | 正常系 | isValidPolygon | 3点 → true |
| TC-005 | 正常系 | isValidPolygon | 4点矩形 → true |
| TC-006 | 正常系 | snapToGrid | gridSize=1.0 基本動作 |
| TC-007 | 正常系 | HvacZoneNode.parse() | ノード生成・ID・デフォルト値確認 |
| TC-008 | 異常系 | calculatePolygonArea | 空配列 → 0 |
| TC-009 | 異常系 | calculatePolygonArea | 1点 → 0 |
| TC-010 | 異常系 | calculatePolygonArea | 2点 → 0 |
| TC-011 | 異常系 | isValidPolygon | 空配列 → false |
| TC-012 | 異常系 | isValidPolygon | 2点 → false |
| TC-013 | 異常系 | isValidPolygon | undefined → false |
| TC-014 | 境界値 | calculatePolygonArea | 3点（最小有効ポリゴン） |
| TC-015 | 境界値 | calculatePolygonArea | 反時計回り → 正の値 |
| TC-016 | 境界値 | snapToGrid | gridSize=0.5 |
| TC-017 | 境界値 | calculatePolygonArea | 非常に大きな座標値 |

### カバレッジ見込み

| テスト対象関数 | テストケース数 | 想定カバレッジ |
|--------------|-------------|-------------|
| `calculatePolygonArea` | 8件（TC-001〜003, 008〜010, 014〜015, 017） | 100% |
| `isValidPolygon` | 5件（TC-004〜005, 011〜013） | 100% |
| `snapToGrid` | 2件（TC-006, 016） | 100% |
| `HvacZoneNode.parse()` | 1件（TC-007） | スキーマ検証 |
| **合計** | **17件** | **純粋関数 100%、全体 60%+** |

---

## 参照ドキュメント

- **タスク定義**: `docs/tasks/kuhl-hvac-editor/TASK-0014.md`
- **要件定義**: `docs/implements/kuhl-hvac-editor/TASK-0014/kuhl-hvac-editor-requirements.md`
- **実装メモ**: `docs/implements/kuhl-hvac-editor/TASK-0014/kuhl-hvac-editor-memo.md`
- **HvacZoneNode スキーマ**: `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`
- **既存テストパターン**: `apps/kuhl-editor/__tests__/store/use-editor.test.ts`
- **vitest 設定**: `apps/kuhl-editor/vitest.config.ts`（environment: node）
