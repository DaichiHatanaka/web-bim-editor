# TASK-0032: 統合テスト・MVP品質確認 - 詳細要件定義

**作成日**: 2026-03-25
**タスクID**: TASK-0032
**フェーズ**: Phase 4 - 統合・品質
**関連要件**: NFR-001, NFR-002, REQ-008, REQ-101~110, REQ-201~209, EDGE-001, EDGE-002
**前提タスク**: TASK-0028, TASK-0030, TASK-0031
**カバレッジ目標**: 60% 以上
**テストファイル**: `apps/kuhl-editor/__tests__/integration/mvp-workflow.test.tsx`

---

## 1. 機能要件（Functional Requirements）

### FR-001: 新規プロジェクト → 保存ワークフロー（End-to-End）

**概要**: ユーザーが新規プロジェクトを作成し、ゾーン描画 → 負荷計算 → 機器配置 → 保存の一連のフローを完遂できることを検証する。

**受入条件（EARS notation）**:

- **FR-001.1**: When a user creates a new project, the system shall initialize an empty `useScene` store with `nodes: {}` and `rootNodeIds: []`. 🔵
- **FR-001.2**: When the user creates Plant → Building → Level hierarchy via `createNode`, the system shall store each node in the flat dictionary with correct `parentId` references. 🔵
- **FR-001.3**: When the user creates an HvacZone node under a Level, the system shall mark the zone as dirty and trigger `processLoadCalc` to compute `loadResult`. 🔵
- **FR-001.4**: When the zone has `floorArea > 0`, `usage`, and `designConditions`, the `calculateZoneLoad` function shall return valid `coolingLoad`, `heatingLoad`, and `requiredAirflow` values. 🔵
- **FR-001.5**: When the user places an equipment node (AHU/PAC/FCU/Diffuser/Fan) under a Level, the system shall store the node with correct type, dimensions, and parentId. 🔵
- **FR-001.6**: When the scene is saved via `saveScene`, the system shall persist `nodes`, `rootNodeIds`, and `collections` to the database and increment the version number. 🔵
- **FR-001.7**: When the scene is saved, the system shall also update the IndexedDB cache via `updateCache`. 🔵

**検証対象モジュール**:
- `packages/kuhl-core/src/store/use-scene.ts` - createNode, updateNode, markDirty
- `packages/kuhl-core/src/systems/zone/load-calc.ts` - calculateZoneLoad
- `packages/kuhl-core/src/systems/zone/load-calc-system.ts` - processLoadCalc
- `apps/kuhl-editor/lib/scene-persistence.ts` - saveScene
- `apps/kuhl-editor/lib/indexeddb-cache.ts` - updateCache

---

### FR-002: 既存読込 → 再計算ワークフロー

**概要**: 既存プロジェクトをデータベースまたは IndexedDB から読み込み、編集 → 再計算 → 再保存の一連のフローを検証する。

**受入条件（EARS notation）**:

- **FR-002.1**: When a project is loaded via `loadScene`, the system shall restore `nodes` and `rootNodeIds` to `useScene` via `setScene`. 🔵
- **FR-002.2**: When `setScene` is called, the system shall mark all loaded nodes as dirty to trigger system recomputation. 🔵
- **FR-002.3**: When a cached scene exists in IndexedDB via `loadCachedScene`, the system shall restore the scene data from the cache. 🔵
- **FR-002.4**: When the user modifies a zone's `floorArea` or `usage` via `updateNode`, the system shall mark the node dirty and `processLoadCalc` shall recompute the `loadResult`. 🔵
- **FR-002.5**: When the scene is re-saved after editing, the system shall increment the version number beyond the previous value. 🔵

**検証対象モジュール**:
- `apps/kuhl-editor/lib/scene-persistence.ts` - loadScene
- `apps/kuhl-editor/lib/indexeddb-cache.ts` - loadCachedScene
- `packages/kuhl-core/src/store/use-scene.ts` - setScene, updateNode
- `packages/kuhl-core/src/systems/zone/load-calc-system.ts` - processLoadCalc

---

### FR-003: 全フェーズ切替

**概要**: エディタの5フェーズ（zone, equip, route, calc, takeoff）間の切替が正しく動作し、各フェーズで適切なツールが利用可能であることを検証する。

**受入条件（EARS notation）**:

- **FR-003.1**: When the user calls `setPhase(phase)`, the system shall update `phase` to the specified value, reset `mode` to `'select'`, and reset `tool` to `'select'`. 🔵
- **FR-003.2**: When the phase is `'zone'`, `getAvailableTools()` shall return `['select', 'zone_draw', 'zone_edit', 'load_calc']`. 🔵
- **FR-003.3**: When the phase is `'equip'`, `getAvailableTools()` shall return `['select', 'ahu_place', 'pac_place', 'fcu_place', 'diffuser_place', 'fan_place', 'equipment_edit']`. 🔵
- **FR-003.4**: When the phase is `'route'`, `getAvailableTools()` shall return `['select', 'duct_route', 'pipe_route', 'fitting_place', 'route_edit']`. 🔵
- **FR-003.5**: When the phase is `'calc'`, `getAvailableTools()` shall return `['select', 'duct_sizing', 'pipe_sizing']`. 🔵
- **FR-003.6**: When the phase is `'takeoff'`, `getAvailableTools()` shall return `['select', 'quantity_takeoff']`. 🔵
- **FR-003.7**: When `setTool(tool)` is called with a tool valid for the current phase, the system shall update the active tool. 🔵

**検証対象モジュール**:
- `apps/kuhl-editor/store/use-editor.ts` - setPhase, setTool, getAvailableTools, phaseTools

---

### FR-004: Undo/Redo

**概要**: Zundo temporal middleware による undo/redo がシーン操作（CRUD）に対して正しく動作することを検証する。

**受入条件（EARS notation）**:

- **FR-004.1**: When the user creates a node and then calls `undo()`, the system shall restore the scene to the state before the node creation (node removed from `nodes`, id removed from parent's `childIds`). 🔵
- **FR-004.2**: When `undo()` is called after a node creation, the system shall mark affected nodes as dirty for system recomputation. 🔵
- **FR-004.3**: When `redo()` is called after an undo, the system shall restore the node that was undone. 🔵
- **FR-004.4**: When the user calls `updateNode` and then `undo()`, the system shall restore the previous node property values. 🔵
- **FR-004.5**: When the user calls `deleteNode` and then `undo()`, the system shall restore the deleted node. 🔵
- **FR-004.6**: The temporal store shall track up to 50 history entries as configured in the `limit` option. 🔵

**検証対象モジュール**:
- `packages/kuhl-core/src/store/use-scene.ts` - temporal (Zundo), undo, redo
- `packages/kuhl-core/src/store/use-scene.ts` - temporal subscription (dirty tracking on undo/redo)

---

### FR-005: エラーハンドリング

**概要**: 主要なエッジケース（不正入力、計算境界値）に対してシステムが安全に処理することを検証する。

**受入条件（EARS notation）**:

- **FR-005.1**: When a zone has `floorArea <= 0`, `calculateZoneLoad` shall return `undefined` (skip calculation). 🔵
- **FR-005.2**: When a zone has `floorArea === 0` and `processLoadCalc` runs, the system shall set `loadResult` to `undefined` without throwing an error. 🔵
- **FR-005.3**: When an unknown `usage` value is provided, `calculateZoneLoad` shall fall back to `office` load intensities. 🔵
- **FR-005.4**: When `orientation` is undefined, `getOrientationFactor` shall return `1.0` (no correction). 🔵
- **FR-005.5**: When `glazingRatio` is undefined, `getGlazingFactor` shall return `1.0` (no correction). 🔵
- **FR-005.6**: When `glazingRatio > 0.3`, `getGlazingFactor` shall return a value greater than `1.0` applying the formula `1.0 + (ratio - 0.3) * 0.5`. 🔵
- **FR-005.7**: When `deltaT <= 0` (supply air temperature >= summer dry bulb), `requiredAirflow` shall be `0`. 🔵

**検証対象モジュール**:
- `packages/kuhl-core/src/systems/zone/load-calc.ts` - calculateZoneLoad, getOrientationFactor, getGlazingFactor
- `packages/kuhl-core/src/systems/zone/load-calc-system.ts` - processLoadCalc

---

### FR-006: 自動保存メカニズム

**概要**: `createAutoSave` による debounced 自動保存が正しく動作することを検証する。

**受入条件（EARS notation）**:

- **FR-006.1**: When `trigger(data)` is called, the system shall wait `AUTO_SAVE_DELAY` (5秒) before executing `saveScene`. 🔵
- **FR-006.2**: When `trigger(data)` is called multiple times within the delay window, the system shall only execute one save with the latest data. 🔵
- **FR-006.3**: While a save is in progress, the system shall queue subsequent data and execute a follow-up save after the current one completes. 🔵
- **FR-006.4**: When `cancel()` is called, the system shall abort the pending debounce timer. 🔵

**検証対象モジュール**:
- `apps/kuhl-editor/lib/auto-save.ts` - createAutoSave

---

### FR-007: 容量マッチング

**概要**: 冷却負荷から機器容量の推奨値を算出する純粋関数を検証する。

**受入条件（EARS notation）**:

- **FR-007.1**: When `coolingLoadKw > 0`, `matchCapacity` shall return the smallest standard capacity that is >= the input load. 🔵
- **FR-007.2**: When `coolingLoadKw <= 0`, `matchCapacity` shall return the minimum standard capacity (5.6 kW). 🔵
- **FR-007.3**: When `coolingLoadKw` exceeds the maximum standard capacity, `matchCapacity` shall return the maximum standard capacity (140 kW). 🔵
- **FR-007.4**: `getRecommendedCapacities` shall return the matched capacity plus adjacent capacities (up to 3 candidates). 🔵

**検証対象モジュール**:
- `packages/kuhl-core/src/systems/equipment/capacity-matching.ts` - matchCapacity, getRecommendedCapacities

---

## 2. 非機能要件（Non-Functional Requirements）

### NFR-032-001: 描画パフォーマンス

**概要**: 3Dビューポートが十分なフレームレートを維持すること。

**受入条件（EARS notation）**:

- **NFR-032-001.1**: When the scene contains 1000 nodes or fewer, the 3D viewport shall maintain 60fps or higher frame rate. 🟡 *NFR-001 から引用。統合テストでは直接的な fps 計測は困難なため、パフォーマンス回帰を防ぐ代替指標を使用*
- **NFR-032-001.2**: The system shall avoid creating geometry/material instances on every render cycle (useMemo pattern). 🔵
- **NFR-032-001.3**: The performance test shall verify that creating and operating on 100 nodes completes within a reasonable time threshold (< 1000ms for batch operations). 🟡

**テスト方針**:
- 直接的な fps 計測は jsdom/vitest 環境では不可能
- 代替として: ノード一括作成の処理時間計測、メモリ効率の間接検証
- 実際の 60fps 検証は手動テストまたは E2E テスト（Playwright）で補完

---

### NFR-032-002: 負荷計算パフォーマンス

**概要**: 空調負荷計算が大規模ゾーン数に対しても高速に完了すること。

**受入条件（EARS notation）**:

- **NFR-032-002.1**: When the scene contains 100 zones or fewer, `processLoadCalc` shall complete within 1 second. 🟡 *NFR-002 から引用*
- **NFR-032-002.2**: When the scene contains 100 zones, a single `processLoadCalc` invocation shall process all dirty zones and clear their dirty flags. 🔵
- **NFR-032-002.3**: `calculateZoneLoad` (pure function) shall execute in under 1ms per zone for standard inputs. 🔵

**テスト方針**:
- `performance.now()` を使用して `processLoadCalc` の実行時間を計測
- 100 ゾーンのバッチ計算を実行し、1秒以内に完了することを assert

---

### NFR-032-003: データ整合性

- **NFR-032-003.1**: The `useScene` store shall maintain referential integrity: all `parentId` references shall point to existing nodes. 🔵
- **NFR-032-003.2**: After undo/redo operations, the scene state shall be consistent (no orphan nodes, no dangling references). 🔵
- **NFR-032-003.3**: The temporal history shall correctly partition `nodes` and `rootNodeIds` as specified in the `partialize` option. 🔵

---

## 3. テスト要件（Test Requirements）

### 3.1 テストスコープ

統合テストの対象範囲は以下のレイヤーに限定する:

| レイヤー | 範囲 | テスト可能性 |
|---------|------|------------|
| Store (useScene) | CRUD, dirty tracking, undo/redo | 🔵 直接テスト可能（Zustand store） |
| Store (useEditor) | Phase切替, ツール選択 | 🔵 直接テスト可能（Zustand store） |
| Systems (load-calc) | 負荷計算、processLoadCalc | 🔵 純粋関数 + store連携テスト |
| Systems (capacity-matching) | 容量マッチング | 🔵 純粋関数テスト |
| Persistence (scene-persistence) | 保存・読込 | 🟡 DB モック必要 |
| Persistence (indexeddb-cache) | キャッシュ | 🟡 IndexedDB モック必要 |
| Persistence (auto-save) | 自動保存 | 🟡 タイマーモック必要 |
| Persistence (project-actions) | プロジェクトCRUD | 🟡 DB モック必要 |
| 3D Rendering | fps 計測 | 🔴 jsdom では不可。手動検証 |

### 3.2 テストスコープ外

以下は TASK-0032 統合テストのスコープ外とする:

- **3D レンダリングの視覚的検証**: jsdom 環境では WebGL/WebGPU が利用不可
- **IFC ファイル読込テスト**: web-ifc WASM はテスト環境で動作しない
- **ブラウザ E2E テスト**: Playwright による UI テストは別途実施
- **認証フロー**: better-auth のモック範囲外

### 3.3 カバレッジ目標

| パッケージ | 目標 | 根拠 |
|-----------|------|------|
| `packages/kuhl-core/src/store/` | 70% | ストアの CRUD・undo/redo は MVP の中核 |
| `packages/kuhl-core/src/systems/zone/` | 80% | 純粋関数が多く、テスト容易性が高い |
| `packages/kuhl-core/src/systems/equipment/` | 80% | 純粋関数テスト |
| `apps/kuhl-editor/store/` | 70% | フェーズ切替ロジック |
| `apps/kuhl-editor/lib/` | 50% | DB/IndexedDB モックの制約 |
| **全体** | **60%以上** | TASK-0032 完了条件 |

### 3.4 テストフレームワーク・方針

- **フレームワーク**: Vitest
- **モック戦略**:
  - `useScene` store: 実際の Zustand store を使用（リセットは `beforeEach` で `unloadScene`）
  - `useEditor` store: 実際の Zustand store を使用
  - DB (`drizzle`): `vi.mock('../db')` でモック
  - IndexedDB: `fake-indexeddb` またはカスタムモック
  - Timer: `vi.useFakeTimers()` で debounce テスト
- **テスト分類**:
  - **Unit**: 純粋関数テスト（calculateZoneLoad, matchCapacity, etc.）
  - **Integration**: Store + System 連携テスト（createNode → dirty → processLoadCalc）
  - **Workflow**: 複数ステップにまたがる End-to-End シナリオ

---

## 4. テストケース一覧

| TC | テスト名 | 対象 FR | 信頼性 | 優先度 |
|----|---------|--------|-------|-------|
| TC-001 | 新規プロジェクト: 空シーン初期化 → Plant/Building/Level 作成 → Zone 作成 → 負荷計算 → 機器配置 → 保存 | FR-001 | 🟡 | P0 |
| TC-002 | 既存読込: loadScene → setScene → updateNode → processLoadCalc → saveScene (version increment) | FR-002 | 🟡 | P0 |
| TC-003 | 描画パフォーマンス: 100ノード一括作成の処理時間 < 1000ms | NFR-032-001 | 🟡 | P1 |
| TC-004 | 負荷計算パフォーマンス: 100ゾーン processLoadCalc < 1秒 | NFR-032-002 | 🟡 | P0 |
| TC-005 | 全フェーズ切替: zone → equip → route → calc → takeoff の順に切替、各フェーズのツール一覧を検証 | FR-003 | 🔵 | P0 |
| TC-006 | Undo/Redo: createNode → undo → redo、updateNode → undo、deleteNode → undo | FR-004 | 🔵 | P0 |
| TC-007 | エラーハンドリング: floorArea=0, 不明usage, orientation未定義, glazingRatio境界値 | FR-005 | 🔵 | P0 |

---

## 5. 受け入れ基準（Acceptance Criteria）

### AC-001: MVP ワークフロー End-to-End

- [ ] 新規シーン初期化 → ノード階層構築 → ゾーン描画 → 負荷計算実行 → 機器配置 → 保存が一連のテストケースとして通過する
- [ ] 既存シーン読込 → 編集 → 再計算 → 再保存が通過する

### AC-002: パフォーマンス

- [ ] 100ノード一括操作が 1000ms 以内に完了する（store レイヤー）
- [ ] 100ゾーンの `processLoadCalc` が 1秒以内に完了する

### AC-003: 全フェーズ切替

- [ ] 5フェーズ全ての切替が正しく動作し、各フェーズで適切なツールが返される
- [ ] フェーズ切替時に mode と tool が `'select'` にリセットされる

### AC-004: Undo/Redo

- [ ] createNode, updateNode, deleteNode それぞれに対する undo/redo が正しく動作する
- [ ] undo/redo 後に dirty tracking が適切に更新される

### AC-005: エラーハンドリング

- [ ] `calculateZoneLoad` が境界値（floorArea=0, 負値）で安全に処理される
- [ ] 不正な usage/orientation 入力にフォールバックが適用される

### AC-006: カバレッジ

- [ ] テスト全体のカバレッジが 60% 以上を達成する

---

## 6. ファイル構成

### 新規作成ファイル

| ファイル | 行数目安 | 責務 |
|---------|---------|------|
| `apps/kuhl-editor/__tests__/integration/mvp-workflow.test.tsx` | ~500行 | MVP 統合テストスイート（TC-001 ~ TC-007） |

### 検証対象ファイル（変更なし）

| ファイル | テスト対象 |
|---------|-----------|
| `packages/kuhl-core/src/store/use-scene.ts` | CRUD, undo/redo, dirty tracking |
| `packages/kuhl-core/src/store/actions/node-actions.ts` | createNodes, updateNodes, deleteNodes |
| `packages/kuhl-core/src/systems/zone/load-calc.ts` | calculateZoneLoad, getOrientationFactor, getGlazingFactor |
| `packages/kuhl-core/src/systems/zone/load-calc-system.ts` | processLoadCalc |
| `packages/kuhl-core/src/systems/equipment/capacity-matching.ts` | matchCapacity, getRecommendedCapacities |
| `apps/kuhl-editor/store/use-editor.ts` | setPhase, setTool, phaseTools |
| `apps/kuhl-editor/lib/scene-persistence.ts` | saveScene, loadScene, createScene |
| `apps/kuhl-editor/lib/indexeddb-cache.ts` | cacheScene, loadCachedScene, updateCache, clearCache |
| `apps/kuhl-editor/lib/auto-save.ts` | createAutoSave |
| `apps/kuhl-editor/lib/project-actions.ts` | listProjects, createProject, updateProject, deleteProject |

---

## 7. 信頼性評価

| 項目 | 信頼性 | 根拠 |
|------|-------|------|
| FR-001: 新規プロジェクトワークフロー | 🟡 | Store + 純粋関数は確実だが、DB モック範囲は推測 |
| FR-002: 既存読込ワークフロー | 🟡 | setScene + processLoadCalc 連携は確実、DB I/O はモック |
| FR-003: 全フェーズ切替 | 🔵 | useEditor store は単純な状態管理、テスト容易 |
| FR-004: Undo/Redo | 🔵 | Zundo temporal の標準パターン、既存テスト実績あり |
| FR-005: エラーハンドリング | 🔵 | 純粋関数の境界値テスト、高い確実性 |
| FR-006: 自動保存 | 🟡 | タイマーモックは標準だが、非同期フロー検証に注意 |
| FR-007: 容量マッチング | 🔵 | 純粋関数テスト、モック不要 |
| NFR-032-001: 描画パフォーマンス | 🟡 | jsdom では直接 fps 計測不可、代替指標で検証 |
| NFR-032-002: 負荷計算パフォーマンス | 🔵 | processLoadCalc の実行時間は直接計測可能 |

**総合信頼度**: 🟡 中程度 -- Store/純粋関数テストは高信頼だが、DB モック・パフォーマンス計測の手法に推測が含まれる

---

**作成者**: Claude Code
**最終更新**: 2026-03-25
