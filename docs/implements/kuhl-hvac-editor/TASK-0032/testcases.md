# TASK-0032: 統合テスト・MVP品質確認 - テストケース定義

**作成日**: 2026-03-25
**タスクID**: TASK-0032
**要件定義書**: [requirements.md](./requirements.md)

---

## 1. 既存テストとの重複分析

### 既存ユニットテストで既にカバー済み（統合テストでは除外）

| 既存テストファイル | カバー範囲 | 統合テスト対象外の理由 |
|---|---|---|
| `kuhl-core/__tests__/store/use-scene.test.ts` | createNode, updateNode, deleteNode, undo/redo 個別操作, setScene, markDirty/clearDirty | 個別CRUD操作は十分にテスト済み |
| `kuhl-core/__tests__/systems/zone/load-calc.test.ts` | calculateZoneLoad 全usage, 方位補正, ガラス補正, 境界値, processLoadCalc 単体 | 純粋関数・単一System処理は十分にテスト済み |
| `kuhl-core/__tests__/systems/equipment/capacity-matching.test.ts` | matchCapacity, getRecommendedCapacities, STANDARD_CAPACITIES | 純粋関数テスト完了済み |
| `kuhl-editor/__tests__/store/use-editor.test.ts` | setPhase, setMode, setTool, phaseTools, getAvailableTools 個別操作 | 個別状態管理は十分にテスト済み |
| `kuhl-editor/__tests__/lib/scene-persistence.test.ts` | saveScene, loadScene, createScene 個別操作 | DB モック付き単体テスト完了済み |
| `kuhl-editor/__tests__/lib/auto-save.test.ts` | debounce 動作, 二重保存防止 | タイマーモック付き単体テスト完了済み |
| `kuhl-editor/__tests__/lib/indexeddb-cache.test.ts` | cacheScene, loadCachedScene, updateCache, clearCache | IndexedDB 単体テスト完了済み |
| `kuhl-editor/__tests__/lib/project-actions.test.ts` | listProjects, createProject, updateProject, deleteProject | DB モック付き単体テスト完了済み |

### 統合テストで新たにカバーする領域

上記ユニットテストでは **横断的なシナリオ** がカバーされていない:

1. **Store + System 連携**: createNode → dirty → processLoadCalc → updateNode → clearDirty の一連フロー
2. **複数Store横断**: useScene + useEditor の同時操作（フェーズ切替しながらノード操作）
3. **Undo/Redo + System再計算**: undo → dirty再マーク → processLoadCalc 再実行
4. **End-to-End ワークフロー**: 階層構築 → ゾーン作成 → 負荷計算 → 機器配置 → 保存の一貫性
5. **パフォーマンス**: 大量ノード/ゾーンの一括処理時間
6. **エラー伝搬**: 不正データが System を通過した際の安全性

---

## 2. テストケース一覧

| TC-ID | テスト概要 | 対象FR | テストファイル | 優先度 |
|---|---|---|---|---|
| TC-032-001 | MVP ワークフロー E2E: Plant→Building→Level→Zone→負荷計算→Equipment配置→保存 | FR-001 | `mvp-workflow.test.tsx` | P0 |
| TC-032-002 | 既存読込ワークフロー: loadScene→setScene→dirty再マーク→updateNode→processLoadCalc→saveScene | FR-002 | `mvp-workflow.test.tsx` | P0 |
| TC-032-003 | Zone作成→processLoadCalc連携: createNode後のdirtyフラグがprocessLoadCalcでloadResultに反映 | FR-001.3, FR-001.4 | `mvp-workflow.test.tsx` | P0 |
| TC-032-004 | 複数Zone一括計算: 5ゾーンを一括作成→processLoadCalc→全ゾーンのloadResultが計算済み | FR-001.3 | `mvp-workflow.test.tsx` | P1 |
| TC-032-005 | Equipment配置と親子関係: Level下にAHU/PAC/Diffuserを配置し階層整合性を検証 | FR-001.5 | `mvp-workflow.test.tsx` | P1 |
| TC-032-006 | 保存→読込のラウンドトリップ: saveScene→loadScene→setScene→ノード内容一致確認 | FR-001.6, FR-002.1 | `mvp-workflow.test.tsx` | P0 |
| TC-032-007 | バージョンインクリメント: 保存→編集→再保存でversion+1 | FR-002.5 | `mvp-workflow.test.tsx` | P1 |
| TC-032-008 | 全5フェーズ順次切替: zone→equip→route→calc→takeoff→zone の循環切替 | FR-003 | `phase-switching.test.ts` | P0 |
| TC-032-009 | フェーズ切替中のツール操作: zone_draw選択中にequip切替→tool=selectにリセット | FR-003.1, FR-003.7 | `phase-switching.test.ts` | P0 |
| TC-032-010 | フェーズ切替+ノード操作並行: equip切替→AHU配置→zone切替→Zone描画が独立動作 | FR-003 | `phase-switching.test.ts` | P1 |
| TC-032-011 | Undo createNode + dirty再マーク: ノード作成→undo→dirtyNodes更新→processLoadCalc安全 | FR-004.1, FR-004.2 | `undo-redo.test.ts` | P0 |
| TC-032-012 | Undo updateNode + System再計算: Zone floorArea変更→undo→processLoadCalc→元のloadResult | FR-004.4 | `undo-redo.test.ts` | P0 |
| TC-032-013 | Undo deleteNode + 階層復元: 子ノード付き親削除→undo→親子関係復元 | FR-004.5 | `undo-redo.test.ts` | P0 |
| TC-032-014 | Redo後のSystem再計算: undo→redo→processLoadCalc→正しいloadResult | FR-004.3 | `undo-redo.test.ts` | P1 |
| TC-032-015 | 連続Undo/Redo: 5回操作→3回undo→2回redo→状態整合性 | FR-004 | `undo-redo.test.ts` | P1 |
| TC-032-016 | floorArea=0 Zone + processLoadCalc: loadResult=undefined, エラーなし | FR-005.1, FR-005.2 | `error-handling.test.ts` | P0 |
| TC-032-017 | 不正usage + processLoadCalc: officeフォールバック適用確認 | FR-005.3 | `error-handling.test.ts` | P0 |
| TC-032-018 | deltaT<=0（summerDryBulb<=15）: requiredAirflow=0 | FR-005.7 | `error-handling.test.ts` | P0 |
| TC-032-019 | 混在Zoneシナリオ: 正常Zone + floorArea=0 Zone が混在→正常Zoneのみ計算 | FR-005 | `error-handling.test.ts` | P1 |
| TC-032-020 | 存在しないノードIDへのupdateNode: 安全に無視される | FR-005 | `error-handling.test.ts` | P1 |
| TC-032-021 | 100ゾーン processLoadCalc パフォーマンス: < 1秒 | NFR-032-002 | `load-calc-performance.test.ts` | P0 |
| TC-032-022 | 100ノード一括createNodes パフォーマンス: < 1000ms | NFR-032-001 | `load-calc-performance.test.ts` | P1 |
| TC-032-023 | calculateZoneLoad 単一実行パフォーマンス: < 1ms | NFR-032-002.3 | `load-calc-performance.test.ts` | P2 |
| TC-032-024 | データ整合性: parentId参照先が全て存在する | NFR-032-003.1 | `mvp-workflow.test.tsx` | P1 |
| TC-032-025 | 自動保存+キャッシュ連携: trigger→saveScene→updateCache の順序保証 | FR-006 | `mvp-workflow.test.tsx` | P1 |

---

## 3. テストファイル別テストケース割り当て

### 3.1 `apps/kuhl-editor/__tests__/integration/mvp-workflow.test.tsx`

**責務**: MVP End-to-End ワークフローの統合テスト

| TC-ID | テスト名 |
|---|---|
| TC-032-001 | MVP ワークフロー E2E |
| TC-032-002 | 既存読込ワークフロー |
| TC-032-003 | Zone作成→processLoadCalc連携 |
| TC-032-004 | 複数Zone一括計算 |
| TC-032-005 | Equipment配置と親子関係 |
| TC-032-006 | 保存→読込のラウンドトリップ |
| TC-032-007 | バージョンインクリメント |
| TC-032-024 | データ整合性: parentId参照 |
| TC-032-025 | 自動保存+キャッシュ連携 |

### 3.2 `apps/kuhl-editor/__tests__/integration/phase-switching.test.ts`

**責務**: エディタフェーズ切替の統合テスト

| TC-ID | テスト名 |
|---|---|
| TC-032-008 | 全5フェーズ順次切替 |
| TC-032-009 | フェーズ切替中のツール操作 |
| TC-032-010 | フェーズ切替+ノード操作並行 |

### 3.3 `apps/kuhl-editor/__tests__/integration/undo-redo.test.ts`

**責務**: Undo/Redo + System再計算の統合テスト

| TC-ID | テスト名 |
|---|---|
| TC-032-011 | Undo createNode + dirty再マーク |
| TC-032-012 | Undo updateNode + System再計算 |
| TC-032-013 | Undo deleteNode + 階層復元 |
| TC-032-014 | Redo後のSystem再計算 |
| TC-032-015 | 連続Undo/Redo |

### 3.4 `apps/kuhl-editor/__tests__/integration/error-handling.test.ts`

**責務**: エラーハンドリング統合テスト

| TC-ID | テスト名 |
|---|---|
| TC-032-016 | floorArea=0 Zone + processLoadCalc |
| TC-032-017 | 不正usage + processLoadCalc |
| TC-032-018 | deltaT<=0 |
| TC-032-019 | 混在Zoneシナリオ |
| TC-032-020 | 存在しないノードIDへのupdateNode |

### 3.5 `packages/kuhl-core/src/__tests__/integration/load-calc-performance.test.ts`

**責務**: 負荷計算・ストア操作のパフォーマンステスト

| TC-ID | テスト名 |
|---|---|
| TC-032-021 | 100ゾーン processLoadCalc |
| TC-032-022 | 100ノード一括createNodes |
| TC-032-023 | calculateZoneLoad 単一実行 |

---

## 4. 各テストケース詳細

### TC-032-001: MVP ワークフロー E2E

**対象FR**: FR-001
**優先度**: P0

**前提条件**:
- useScene store が空の状態（`unloadScene()` 済み）
- useEditor store がデフォルト状態（zone phase）
- DB モック（`vi.mock('../db')`）が設定済み

**テスト手順**:
1. `PlantNode.parse()` → `useScene.getState().createNode(plant)` で Plant ノード作成
2. `BuildingNode.parse()` → `createNode(building, plant.id)` で Building ノード作成
3. `LevelNode.parse()` → `createNode(level, building.id)` で Level ノード作成
4. `HvacZoneNode.parse({ usage: 'office', floorArea: 100 })` → `createNode(zone, level.id)` で Zone 作成
5. `processLoadCalc()` を実行
6. `AhuNode.parse()` → `createNode(ahu, level.id)` で機器配置
7. `saveScene()` を呼び出す

**期待結果**:
- 手順1-3: 各ノードが nodes に格納、parentId が正しく設定
- 手順4: zone が dirtyNodes に追加
- 手順5: zone の loadResult が `{ coolingLoad: 15000, heatingLoad: 10000, requiredAirflow: ~4066.5 }` に更新
- 手順6: ahu ノードが level の children に含まれる
- 手順7: saveScene が正しいペイロードで呼び出される

---

### TC-032-002: 既存読込ワークフロー

**対象FR**: FR-002
**優先度**: P0

**前提条件**:
- DB モックが既存シーンデータ（Plant + Building + Level + Zone、version=3）を返すよう設定

**テスト手順**:
1. `loadScene('project-1')` でシーン読込
2. `useScene.getState().setScene(scene.nodes, scene.rootNodeIds)` で Store にセット
3. 全ノードが dirtyNodes に追加されていることを確認
4. Zone の `floorArea` を `updateNode(zoneId, { floorArea: 200 })` で更新
5. `processLoadCalc()` を実行
6. `saveScene()` で再保存

**期待結果**:
- 手順2: nodes と rootNodeIds が復元される
- 手順3: 全ノードID が dirtyNodes に含まれる
- 手順5: loadResult.coolingLoad が 30000（200m2 x 150 W/m2）に更新
- 手順6: version が 4 にインクリメント

---

### TC-032-003: Zone作成→processLoadCalc連携

**対象FR**: FR-001.3, FR-001.4
**優先度**: P0

**前提条件**:
- Level ノードが既に作成済み

**テスト手順**:
1. `HvacZoneNode.parse({ usage: 'meeting', floorArea: 50 })` → `createNode(zone, level.id)`
2. `dirtyNodes.has(zone.id)` を確認
3. `processLoadCalc()` を実行
4. `nodes[zone.id].loadResult` を確認
5. `dirtyNodes.has(zone.id)` を再確認

**期待結果**:
- 手順2: `true`
- 手順4: `coolingLoad = 180 * 50 = 9000`, `heatingLoad = 120 * 50 = 6000`
- 手順5: `false`（clearDirty 済み）

---

### TC-032-004: 複数Zone一括計算

**対象FR**: FR-001.3
**優先度**: P1

**前提条件**:
- Level ノードが既に作成済み

**テスト手順**:
1. 5つの HvacZoneNode（各異なる usage: office, meeting, server_room, lobby, corridor）を `createNode` で作成
2. `processLoadCalc()` を1回実行
3. 全5ゾーンの `loadResult` を確認
4. `dirtyNodes` のサイズを確認

**期待結果**:
- 手順3: 全ゾーンの loadResult が定義済み、各 usage の coolingLoad/heatingLoad が正しい
- 手順4: hvac_zone 型の dirtyNodes が 0（他ノード型は除く）

---

### TC-032-005: Equipment配置と親子関係

**対象FR**: FR-001.5
**優先度**: P1

**前提条件**:
- Plant → Building → Level 階層が作成済み

**テスト手順**:
1. `AhuNode.parse()` → `createNode(ahu, level.id)`
2. `PacNode.parse()` → `createNode(pac, level.id)`
3. `DiffuserNode.parse()` → `createNode(diffuser, level.id)`
4. Level ノードの children を確認
5. 各機器の parentId を確認

**期待結果**:
- 手順4: Level の children に ahu.id, pac.id, diffuser.id が含まれる
- 手順5: 全機器の parentId が level.id と一致

---

### TC-032-006: 保存→読込のラウンドトリップ

**対象FR**: FR-001.6, FR-002.1
**優先度**: P0

**前提条件**:
- シーンにノード階層（Plant → Building → Level → Zone + Equipment）が構築済み
- DB モックが saveScene の結果を loadScene で返すよう設定

**テスト手順**:
1. 現在の `useScene.getState().nodes` と `rootNodeIds` をスナップショット
2. `saveScene()` でノードデータを保存
3. `useScene.getState().unloadScene()` でストアをクリア
4. `loadScene()` でデータを読込
5. `setScene()` でストアに復元
6. 復元後の `nodes` と `rootNodeIds` をスナップショットと比較

**期待結果**:
- 手順6: ノード数が一致し、各ノードの `type`, `parentId`, 主要プロパティが一致

---

### TC-032-007: バージョンインクリメント

**対象FR**: FR-002.5
**優先度**: P1

**前提条件**:
- DB モックが version=3 の既存シーンを返し、update 時に version=4 を返すよう設定

**テスト手順**:
1. `saveScene()` を呼び出し（version=3 の既存シーンが存在）
2. 返り値の version を確認
3. zone を updateNode で変更
4. 再度 `saveScene()` を呼び出し

**期待結果**:
- 手順2: version = 4
- 手順4: version がさらにインクリメント

---

### TC-032-008: 全5フェーズ順次切替

**対象FR**: FR-003
**優先度**: P0

**前提条件**:
- useEditor store がデフォルト状態

**テスト手順**:
1. `setPhase('zone')` → `getAvailableTools()` 確認
2. `setPhase('equip')` → `getAvailableTools()` 確認
3. `setPhase('route')` → `getAvailableTools()` 確認
4. `setPhase('calc')` → `getAvailableTools()` 確認
5. `setPhase('takeoff')` → `getAvailableTools()` 確認
6. `setPhase('zone')` → 初期状態に戻ることを確認

**期待結果**:
- 各手順で phase が正しく更新
- 各手順で mode='select', tool='select'
- 各手順で getAvailableTools() が phaseTools[phase] と一致
- 手順6: zone フェーズの初期状態と完全一致

**既存テストとの差異**: 既存テストは個別操作のみ。この統合テストは連続循環切替の状態一貫性を検証。

---

### TC-032-009: フェーズ切替中のツール操作

**対象FR**: FR-003.1, FR-003.7
**優先度**: P0

**前提条件**:
- useEditor store がデフォルト状態

**テスト手順**:
1. `setPhase('zone')` → `setTool('zone_draw')` → `setMode('build')`
2. `setPhase('equip')` に切替
3. state を確認
4. `setTool('ahu_place')` でツール選択
5. `setPhase('zone')` に戻す
6. state を確認

**期待結果**:
- 手順3: mode='select', tool='select'（zone_draw がリセットされている）
- 手順6: mode='select', tool='select'（ahu_place がリセットされている）

---

### TC-032-010: フェーズ切替+ノード操作並行

**対象FR**: FR-003
**優先度**: P1

**前提条件**:
- useScene に Level ノードが作成済み
- useEditor store がデフォルト状態

**テスト手順**:
1. `setPhase('equip')` → `setTool('ahu_place')`
2. `createNode(ahu, level.id)` で AHU 配置
3. `setPhase('zone')` → `setTool('zone_draw')`
4. `createNode(zone, level.id)` で Zone 作成
5. 両ノードが useScene に存在することを確認

**期待結果**:
- 手順5: ahu と zone の両方が nodes に存在し、parentId が level.id

---

### TC-032-011: Undo createNode + dirty再マーク

**対象FR**: FR-004.1, FR-004.2
**優先度**: P0

**前提条件**:
- Level ノード作成済み、Zone ノード作成済み、processLoadCalc 実行済み

**テスト手順**:
1. Zone の loadResult が存在することを確認
2. `useScene.temporal.getState().undo()` を実行
3. Zone ノードが nodes から消えたことを確認
4. dirtyNodes の状態を確認（親 Level が dirty になっている）
5. `processLoadCalc()` を実行してもエラーが発生しないことを確認

**期待結果**:
- 手順2: Zone ノードが削除される
- 手順4: Level の id が dirtyNodes に含まれる
- 手順5: エラーなし（存在しないノードをスキップ）

---

### TC-032-012: Undo updateNode + System再計算

**対象FR**: FR-004.4
**優先度**: P0

**前提条件**:
- Zone ノード（office, floorArea=100）が作成済み、processLoadCalc 実行済み（loadResult.coolingLoad=15000）

**テスト手順**:
1. `updateNode(zone.id, { floorArea: 200 })` で面積変更
2. `processLoadCalc()` → coolingLoad=30000 を確認
3. `useScene.temporal.getState().undo()` を実行
4. nodes[zone.id].floorArea が 100 に戻ったことを確認
5. `processLoadCalc()` を実行
6. loadResult.coolingLoad を確認

**期待結果**:
- 手順4: floorArea = 100
- 手順6: coolingLoad = 15000（元の値に戻る）

---

### TC-032-013: Undo deleteNode + 階層復元

**対象FR**: FR-004.5
**優先度**: P0

**前提条件**:
- Plant → Building → Level → Zone の階層が構築済み

**テスト手順**:
1. `deleteNode(level.id)` でカスケード削除
2. Level, Zone が消えたことを確認
3. `useScene.temporal.getState().undo()` を実行
4. Level, Zone が復元されたことを確認
5. Level の children に Zone が含まれることを確認
6. Zone の parentId が Level を指すことを確認

**期待結果**:
- 手順4-6: 階層が完全に復元される

---

### TC-032-014: Redo後のSystem再計算

**対象FR**: FR-004.3
**優先度**: P1

**前提条件**:
- Zone ノード作成済み、processLoadCalc 実行済み

**テスト手順**:
1. `undo()` → Zone 消失
2. `redo()` → Zone 復元
3. dirtyNodes に zone.id が含まれることを確認
4. `processLoadCalc()` を実行
5. loadResult を確認

**期待結果**:
- 手順3: zone.id が dirtyNodes に含まれる
- 手順5: loadResult が正しく再計算されている

---

### TC-032-015: 連続Undo/Redo

**対象FR**: FR-004
**優先度**: P1

**前提条件**:
- 空の useScene store

**テスト手順**:
1. 5つのノード（Plant, Building, Level, Zone1, Zone2）を順次 createNode
2. `undo()` を 3回実行（Zone2, Zone1, Level が元に戻る）
3. ノード数が 2（Plant, Building）であることを確認
4. `redo()` を 2回実行（Level, Zone1 が復元）
5. ノード数が 4（Plant, Building, Level, Zone1）であることを確認
6. Zone1 の parentId が Level を指すことを確認

**期待結果**:
- 手順3: nodes に Plant と Building のみ
- 手順5: nodes に Plant, Building, Level, Zone1 が存在
- 手順6: parentId の整合性が保たれている

---

### TC-032-016: floorArea=0 Zone + processLoadCalc

**対象FR**: FR-005.1, FR-005.2
**優先度**: P0

**前提条件**:
- Level ノード作成済み

**テスト手順**:
1. `HvacZoneNode.parse({ usage: 'office', floorArea: 0 })` → `createNode(zone, level.id)`
2. `processLoadCalc()` を実行
3. zone の loadResult を確認
4. エラーが発生していないことを確認

**期待結果**:
- 手順3: loadResult = undefined
- 手順4: エラーなし

---

### TC-032-017: 不正usage + processLoadCalc

**対象FR**: FR-005.3
**優先度**: P0

**前提条件**:
- Level ノード作成済み

**テスト手順**:
1. `HvacZoneNode.parse({ usage: 'office', floorArea: 100 })` でゾーン作成
2. Zod バリデーションをバイパスし `usage` を不正値に直接上書き: `updateNode(zone.id, { usage: 'invalid' as any })`
3. `processLoadCalc()` を実行
4. loadResult を確認

**期待結果**:
- 手順4: office フォールバックが適用され coolingLoad=15000, heatingLoad=10000

---

### TC-032-018: deltaT<=0

**対象FR**: FR-005.7
**優先度**: P0

**前提条件**:
- Level ノード作成済み

**テスト手順**:
1. `HvacZoneNode.parse({ usage: 'office', floorArea: 100, designConditions: { summerDryBulb: 15 } })` で Zone 作成
2. `processLoadCalc()` を実行
3. loadResult.requiredAirflow を確認

**期待結果**:
- 手順3: requiredAirflow = 0（deltaT = 15 - 15 = 0）

---

### TC-032-019: 混在Zoneシナリオ

**対象FR**: FR-005
**優先度**: P1

**前提条件**:
- Level ノード作成済み

**テスト手順**:
1. 正常 Zone（office, 100m2）を作成
2. floorArea=0 の Zone を作成
3. `processLoadCalc()` を1回実行
4. 正常 Zone の loadResult を確認
5. floorArea=0 Zone の loadResult を確認

**期待結果**:
- 手順4: coolingLoad=15000（正常に計算）
- 手順5: loadResult = undefined（スキップ）

---

### TC-032-020: 存在しないノードIDへのupdateNode

**対象FR**: FR-005
**優先度**: P1

**前提条件**:
- useScene store に任意のノードが存在

**テスト手順**:
1. `updateNode('nonexistent_id' as AnyNodeId, { name: 'test' })` を実行
2. ストアの状態が変化していないことを確認
3. エラーが発生していないことを確認

**期待結果**:
- 手順2-3: ストア不変、エラーなし

---

### TC-032-021: 100ゾーン processLoadCalc パフォーマンス

**対象FR**: NFR-032-002
**優先度**: P0

**前提条件**:
- Level ノード作成済み

**テスト手順**:
1. 100個の HvacZoneNode（各 floorArea=50~200 ランダム、usage ランダム）を `createNode` で作成
2. `performance.now()` で開始時刻記録
3. `processLoadCalc()` を実行
4. `performance.now()` で終了時刻記録
5. 全ゾーンの loadResult が定義済みであることを確認

**期待結果**:
- 手順4-手順2: < 1000ms
- 手順5: 100ゾーン全ての loadResult が undefined でないこと

---

### TC-032-022: 100ノード一括createNodes パフォーマンス

**対象FR**: NFR-032-001
**優先度**: P1

**前提条件**:
- 空の useScene store

**テスト手順**:
1. Plant, Building, Level を作成
2. 100個の AhuNode を配列で準備
3. `performance.now()` で開始時刻記録
4. `createNodes()` で一括作成
5. `performance.now()` で終了時刻記録
6. nodes 内のノード数を確認

**期待結果**:
- 手順5-手順3: < 1000ms
- 手順6: 103 ノード（Plant + Building + Level + 100 AHU）

---

### TC-032-023: calculateZoneLoad 単一実行パフォーマンス

**対象FR**: NFR-032-002.3
**優先度**: P2

**前提条件**:
- なし（純粋関数）

**テスト手順**:
1. テスト Zone データを作成
2. `performance.now()` で開始時刻記録
3. `calculateZoneLoad(zone)` を 1000回実行
4. `performance.now()` で終了時刻記録
5. 平均実行時間を算出

**期待結果**:
- 手順5: 平均 < 1ms（1000回で < 1000ms）

---

### TC-032-024: データ整合性 parentId参照

**対象FR**: NFR-032-003.1
**優先度**: P1

**前提条件**:
- Plant → Building → Level → Zone + Equipment の階層構築済み

**テスト手順**:
1. 全ノードを走査
2. 各ノードの parentId が nodes 内に存在するか検証
3. rootNodeIds の各ノードが parentId を持たないことを検証

**期待結果**:
- 手順2: 全ての parentId が既存ノードを指す
- 手順3: ルートノードは parentId = undefined

---

### TC-032-025: 自動保存+キャッシュ連携

**対象FR**: FR-006
**優先度**: P1

**前提条件**:
- DB モック、IndexedDB モック設定済み
- `vi.useFakeTimers()` 設定済み

**テスト手順**:
1. `createAutoSave({ sceneId: 'scene-1', projectId: 'project-1' })` を作成
2. useScene で Zone 作成 → processLoadCalc 実行
3. `autoSave.trigger({ nodes, rootNodeIds, collections })` を呼び出し
4. `vi.advanceTimersByTimeAsync(5000)` でタイマー進行
5. `saveScene` モックが呼ばれたことを確認
6. `updateCache` モックが呼ばれたことを確認

**期待結果**:
- 手順5: saveScene が1回呼ばれ、ペイロードに Zone + loadResult が含まれる
- 手順6: updateCache が1回呼ばれる

---

## 5. テスト実装の注意事項

### モック戦略

| 依存 | 戦略 |
|---|---|
| `useScene` store | 実物使用。`beforeEach` で `unloadScene()` + `clearSceneHistory()` |
| `useEditor` store | 実物使用。`afterEach` で `setState({ phase: 'zone', mode: 'select', tool: 'select' })` |
| `processLoadCalc` | 実物使用（`useScene` store を直接参照する純粋ロジック） |
| DB (`drizzle`) | `vi.mock('../../db')` で完全モック |
| IndexedDB | `fake-indexeddb/auto` を使用 |
| Timer | `vi.useFakeTimers()` / `vi.useRealTimers()` |

### テスト実行順序の独立性

- 各テストケースは独立して実行可能であること
- `beforeEach` / `afterEach` でストアをリセット
- テスト間でグローバル状態が漏れないこと

### パフォーマンステストの安定性

- CI 環境での実行速度のばらつきを考慮し、閾値にマージンを設ける
- `< 1000ms` の閾値は `< 2000ms` に緩和する選択肢も検討

---

**作成者**: Claude Code
**最終更新**: 2026-03-25
