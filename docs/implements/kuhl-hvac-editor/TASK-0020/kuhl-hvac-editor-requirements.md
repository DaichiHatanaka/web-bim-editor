# TASK-0020: LevelVisibilitySystem・InteractiveSystem 要件定義書

**タスクID**: TASK-0020
**機能名**: kuhl-hvac-editor
**要件名**: LevelVisibilitySystem・InteractiveSystem
**作成日**: 2026-03-25
**信頼性評価**: 高品質

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🔵 **何をする機能か**: 2つのビューアシステムを提供する。LevelVisibilitySystemはuseViewer.selection.levelIdに基づき、選択レベル配下のノードのみ表示し他レベルのノードを非表示にする。InteractiveSystemはマウスホバー時にObject3Dをハイライト表示し、クリック時にuseViewer.setSelectionで選択パスを更新する。
- 🔵 **どのような問題を解決するか**: 多層階の空調設備データを扱う際に、現在作業中のレベルのみを表示することで視認性を向上させる。また、3Dビューポート上でのマウスインタラクション（ホバー・クリック）を提供し、ノード選択操作を可能にする。
- 🔵 **想定されるユーザー**: 社内の空調設備設計担当者。3Dビュー上でレベルを切り替えながら機器やゾーンを選択・確認する。
- 🔵 **システム内での位置づけ**: `@kuhl/viewer` パッケージのシステム層（`packages/kuhl-viewer/src/systems/`）に配置。Viewer Isolation原則に基づき、エディタ固有ロジックを持たない。useViewer/useScene/sceneRegistryの既存基盤を活用する。
- **参照したEARS要件**: REQ-003, REQ-007, REQ-009
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - ビューアシステム、Viewer Isolation原則

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 LevelVisibilitySystem

#### 2.1.1 processLevelVisibility() 純粋関数

- 🔵 **入力**: なし（useScene、useViewer、sceneRegistryのストアから直接取得）

  取得するストア値:

  | ストア | フィールド | 型 | 説明 |
  |--------|-----------|-----|------|
  | `useViewer` | `selection.levelId` | `string \| null` | 現在選択中のレベルID |
  | `useScene` | `nodes` | `Record<AnyNodeId, AnyNode>` | 全ノード辞書 |
  | `sceneRegistry` | `nodes` | `Map<string, unknown>` | ID→Object3Dマッピング |

- 🔵 **出力**: なし（副作用としてObject3D.visibleを直接変更）

- 🔵 **処理ロジック**:
  1. `useViewer.getState().selection.levelId` を取得
  2. `levelId` が `null` の場合、全ノードを visible = true にする（レベル未選択時は全表示）
  3. `levelId` が設定されている場合、`sceneRegistry.nodes` を走査:
     - 各ノードの `parentId` チェーンを辿り、選択 `levelId` の配下かどうかを判定
     - 配下の場合: `object3D.visible = true`
     - 配下でない場合: `object3D.visible = false`
     - レベルノード自体: 選択レベルのみ `visible = true`、他レベルは `visible = false`
     - 空間ノード（plant, building）: 常に `visible = true`（階層の親は常時表示）

- **参照したEARS要件**: REQ-003, REQ-007
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - ビューアシステム

#### 2.1.2 parentId チェーン判定

- 🔵 **判定方法**: ノードの `parentId` を再帰的に辿り、`levelId` に一致する祖先が存在するかを判定する

  ```
  isDescendantOfLevel(nodeId, levelId, nodes):
    node = nodes[nodeId]
    if node.parentId === levelId → true
    if node.parentId === null → false
    return isDescendantOfLevel(node.parentId, levelId, nodes)
  ```

- 🔵 **特殊ケース**:
  - `parentId === levelId` の直接の子ノード → visible = true
  - レベル配下のゾーン配下の機器 → parentId チェーンを辿り visible = true
  - 別レベル配下のノード → visible = false
  - plant / building ノード → 常に visible = true（type による判定）

- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - ノード階層

#### 2.1.3 LevelVisibilitySystem コンポーネント

- 🔵 **種別**: React コンポーネント（Systemパターン）。`null` を返す（描画なし）。
- 🔵 **useFrame実行**: `priority=1` で毎フレーム実行（レベル表示切替は高優先度）
- 🔵 **R3Fフォールバック**: `@react-three/fiber` が利用不可の環境（テスト等）では空コンポーネントを返す。LoadCalcSystemと同様のtry/catchパターンを採用。

- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - システムパターン

### 2.2 InteractiveSystem

#### 2.2.1 processInteraction() イベントリスナーベース

- 🟡 **設計方針**: 既存Pascal Editorの InteractiveSystem はアイテムコントロールUIのオーバーレイ表示用であり、Kuhl HVAC Editorでは用途が異なる。Kuhlでは以下の2つのインタラクションを提供する:
  1. **ホバーハイライト**: マウスホバー時にObject3Dのemissive色を変更してハイライト表示
  2. **クリック選択**: クリック時にuseViewer.setSelectionで選択パスを更新

- 🟡 **実装方式**: R3Fのイベントシステム（onPointerOver/onPointerOut/onClick）ではなく、useFrame内でのRaycaster走査ベースとする。sceneRegistryに登録された全Object3Dを対象にRaycastし、最も近いヒットオブジェクトを検出する。

  **理由**: sceneRegistryに登録されたノードのみを対象にインタラクションを行うため。R3Fのイベントシステムは個々のコンポーネントに分散するが、SystemパターンではsceneRegistryを一元的に走査する方が整合性が高い。

- **参照したEARS要件**: REQ-003, REQ-009

#### 2.2.2 ホバーハイライト

- 🟡 **入力**: Three.js Raycaster による intersect 結果
- 🟡 **処理ロジック**:
  1. カメラからマウス位置へのRayを生成（`useThree().camera`, `useThree().pointer`）
  2. sceneRegistry.nodes の全Object3Dに対してRaycast実行
  3. 最も近いhitオブジェクトのnodeIdを特定
  4. `useViewer.getState().setHoveredId(nodeId)` を呼び出し
  5. 前フレームのhoveredIdと異なる場合、前Object3DのemissiveをリセットしてnewObject3Dにemissiveハイライトを適用

- 🟡 **ハイライト表現**:
  - ホバー時: Object3Dの全MeshのMeshStandardMaterial.emissiveを `#444444` に設定
  - ホバー解除時: emissiveを `#000000`（デフォルト）にリセット
  - MeshStandardMaterial以外のマテリアル（MeshBasicMaterial等）はスキップ

- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - InteractiveSystem

#### 2.2.3 クリック選択

- 🟡 **入力**: R3Fの onClick イベント（Canvas レベルで処理）
- 🟡 **処理ロジック**:
  1. Raycasterの最も近いhitオブジェクトのnodeIdを特定
  2. `useScene.getState().nodes[nodeId]` からノード情報を取得
  3. ノードの `parentId` チェーンを辿り、levelId, zoneId を推定
  4. `useViewer.getState().setSelection({ levelId, zoneId, selectedIds: [nodeId] })` を呼び出し
  5. hitがない場合（空クリック）: `useViewer.getState().setSelection({ selectedIds: [] })` で選択解除

- 🟡 **選択パス推定**: ノードのparentIdチェーンから適切な階層を抽出

  ```
  resolveSelectionPath(nodeId, nodes):
    path = { levelId: null, zoneId: null, selectedIds: [nodeId] }
    current = nodes[nodeId]
    while current:
      if current.type === 'level' → path.levelId = current.id
      if current.type === 'hvac_zone' → path.zoneId = current.id
      if current.type === 'building' → path.buildingId = current.id
      if current.type === 'plant' → path.plantId = current.id
      current = nodes[current.parentId]
    return path
  ```

- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - SelectionPath

#### 2.2.4 InteractiveSystem コンポーネント

- 🟡 **種別**: React コンポーネント（Systemパターン）。`null` を返す（描画なし）。
- 🟡 **useFrame実行**: `priority=2` でフレームごとにRaycaster走査を実行（ホバー処理）
- 🟡 **クリック処理**: useFrame内ではなく、R3F Canvasレベルの onPointerDown/onClick イベントをsubscribeして処理する。useThreeのgl.domElement経由でイベントリスナーを登録。
- 🔵 **R3Fフォールバック**: テスト環境では空コンポーネントを返す。

- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - システムパターン

#### 2.2.5 アウトラインエフェクト

- 🟡 **設計方針**: 選択ノードのアウトライン表示はuseViewer.outliner配列を使用する。outliner.selectedObjectsにObject3D参照を追加し、外部のポストプロセスエフェクト（後続タスク）がアウトラインを描画する。
- 🟡 **本タスクの責務**: selectedIds変更時にoutliner.selectedObjectsを更新する処理を実装する。ポストプロセスエフェクト自体は後続タスクのスコープ。

  ```
  useViewer.selection.selectedIds → sceneRegistry.nodes.get(id) → outliner.selectedObjects に push
  ```

- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - アウトラインエフェクト

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 アーキテクチャ制約

- 🔵 **Viewer Isolation原則**: 両システムとも `@kuhl/viewer` パッケージ内に配置。`apps/kuhl-editor` からのインポートは禁止。エディタ固有のロジック（ツール、フェーズ判定等）を含めない。
- 🔵 **Systemパターン遵守**: `null` を返すReactコンポーネント。useFrame内でのみロジックを実行。
- 🔵 **既存基盤維持**: useScene, useViewer, sceneRegistry の既存APIを使用。独自のストアやレジストリを作成しない。
- 🔵 **純粋関数分離**: テスト容易性のため、コアロジック（`processLevelVisibility`, `resolveSelectionPath`, `isDescendantOfLevel`）を純粋関数として分離しエクスポートする。

### 3.2 パフォーマンス要件

- 🔵 **useFrame制約**: useFrame内の処理は16ms以内に収める。
- 🟡 **Raycaster最適化**: InteractiveSystemのRaycaster走査は、sceneRegistry.nodesの全エントリを対象とする。1000ノード以下で60fps維持（NFR-001）。大規模シーンでは空間インデックス（Octree等）の導入を後続タスクで検討。
- 🔵 **LevelVisibility最適化**: levelId変更時のみfull走査を実行し、変更がない場合はスキップする（前フレームのlevelIdをrefで保持して比較）。

### 3.3 Three.jsレイヤー制約

- 🔵 **visible制御対象**: LevelVisibilitySystemは `SCENE_LAYER(0)` のオブジェクトのvisibleを制御。`EDITOR_LAYER(1)` や `ZONE_LAYER(2)` には直接影響しない。ただし、ゾーンレンダラーのvisibleもparentIdチェーンで制御される（ZONE_LAYERに属するObject3DもsceneRegistry経由でvisible制御対象）。

### 3.4 テスト要件

- 🔵 **カバレッジ**: テスト60%以上カバレッジ。
- 🔵 **テスト戦略**: 純粋関数（`processLevelVisibility`, `isDescendantOfLevel`, `resolveSelectionPath`）は単体テストで網羅。コンポーネント（`LevelVisibilitySystem`, `InteractiveSystem`）はR3F非依存の純粋関数テスト中心で実装。
- 🔵 **テストファイル**: `packages/kuhl-viewer/src/__tests__/systems/level-visibility.test.tsx`

- **参照したEARS要件**: REQ-003, REQ-007, REQ-009, NFR-001
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - Viewer Isolation原則、パフォーマンス要件

---

## 4. 想定される使用例（EARSエッジケース・データフローベース）

### 4.1 基本的な使用パターン

- 🔵 **UC-01: レベル選択時のノード表示切替**
  - ユーザーがレベル一覧から「2F」を選択
  - `useViewer.setSelection({ levelId: 'level_xxx' })` が呼ばれる
  - 次フレームでLevelVisibilitySystemが検出
  - 2F配下のノード（ゾーン、機器、ダクト）が visible = true に
  - 1F, 3F 配下のノードが visible = false に
  - plant, building ノードは常に visible = true

- 🔵 **UC-02: レベル切替時の表示更新**
  - ユーザーが「2F」→「3F」に切り替え
  - `useViewer.setSelection({ levelId: 'level_yyy' })` が呼ばれる
  - 2F配下 → visible = false, 3F配下 → visible = true に更新

- 🟡 **UC-03: ノードホバーでハイライト表示**
  - マウスがAHU機器上に移動
  - Raycasterがhitを検出 → nodeId を特定
  - `useViewer.setHoveredId('ahu_xxx')` が呼ばれる
  - AHUのObject3DのMesh emissive が `#444444` に変更
  - マウスが離れると emissive が `#000000` にリセット

- 🟡 **UC-04: ノードクリックで選択パス更新**
  - ユーザーがHvacZone上のFCU機器をクリック
  - Raycasterがhitを検出 → nodeId = 'fcu_xxx'
  - parentIdチェーンを辿り: fcu → hvac_zone → level → building → plant
  - `useViewer.setSelection({ plantId, buildingId, levelId, zoneId, selectedIds: ['fcu_xxx'] })`
  - outliner.selectedObjects に FCU の Object3D が追加

- 🔵 **UC-05: 空クリックで選択解除**
  - ユーザーが3Dビューの空間をクリック（ノードなし）
  - Raycasterのhitなし
  - `useViewer.setSelection({ selectedIds: [] })` で選択解除

### 4.2 データフロー

- 🔵 **LevelVisibility フロー**:
  ```
  useViewer.setSelection({ levelId }) → useViewer state更新
    → useFrame(priority=1) → LevelVisibilitySystem
      → sceneRegistry.nodes走査
        → parentIdチェーン判定 → Object3D.visible = true/false
  ```

- 🟡 **Interactive フロー（ホバー）**:
  ```
  マウス移動 → useFrame(priority=2) → InteractiveSystem
    → Raycaster.intersectObjects(sceneRegistryのObject3D群)
      → hitあり → setHoveredId(nodeId) → emissiveハイライト
      → hitなし → setHoveredId(null) → emissiveリセット
  ```

- 🟡 **Interactive フロー（クリック）**:
  ```
  マウスクリック → イベントリスナー → InteractiveSystem
    → Raycaster.intersectObjects
      → hitあり → resolveSelectionPath(nodeId) → setSelection(path)
                → outliner.selectedObjects更新
      → hitなし → setSelection({ selectedIds: [] })
  ```

### 4.3 エッジケース

- 🔵 **EDGE-01: levelId = null（レベル未選択）**
  - 全ノードを visible = true にする
  - 初期状態やレベル選択解除時に全ノードが表示される

- 🔵 **EDGE-02: sceneRegistryにObject3Dが未登録**
  - レンダラーがまだマウントされていない場合、sceneRegistry.nodes.get(id) が undefined を返す
  - undefined の場合はスキップ（visible設定しない）

- 🟡 **EDGE-03: Raycaster hitなし**
  - マウスがノード上にない場合、hoveredIdをnullに設定
  - 前フレームでhoveredだったObject3Dのemissiveをリセット

- 🟡 **EDGE-04: MeshStandardMaterial以外のマテリアル**
  - MeshBasicMaterial等のemissiveプロパティを持たないマテリアルはハイライト処理をスキップ
  - traverse時にmaterial.emissiveが存在するかチェック

- 🟡 **EDGE-05: 深いネスト（ゾーン配下の機器配下のポート等）**
  - parentIdチェーンの再帰走査で最大深度を制限する（10レベル）
  - 無限ループ防止のためvisitedセットを使用

- 🔵 **EDGE-06: plant/buildingノード**
  - 空間ノード（type === 'plant' || type === 'building'）は常にvisible = true
  - LevelVisibilitySystemの走査対象外として特別処理

- **参照したEARS要件**: REQ-003, REQ-007
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - ノード階層

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- 空調設備設計者がレベルを切り替えて、該当階の機器・ゾーンのみを確認するストーリー
- 3Dビュー上で機器をマウスオーバー/クリックして選択するストーリー

### 参照した機能要件
- **REQ-003**: 3Dビューポートと空調ノード用レンダラー 🔵
- **REQ-007**: 共通基盤（sceneRegistry, event bus）の維持 🔵
- **REQ-009**: Viewer Isolation原則 🔵

### 参照した非機能要件
- **NFR-001**: 60fps以上の描画（1000ノード以下） 🟡

### 参照した受け入れ基準
- レベルベースの表示/非表示が動作する
- ホバー・クリックインタラクションが動作する
- テスト60%以上カバレッジ

### 参照した設計文書
- **アーキテクチャ**: `docs/design/kuhl-hvac-editor/architecture.md`
  - ビューアシステム（level-visibility-system, interactive-system）
  - Viewer Isolation原則
  - Three.jsレイヤー定義
  - SelectionPath構造
  - sceneRegistryパターン
- **ノート**: `docs/spec/kuhl-hvac-editor/note.md` - TASK-0020コンテキスト
- **既存実装参照**:
  - `packages/viewer/src/systems/level/level-system.tsx` — Pascal Editor LevelSystem
  - `packages/kuhl-core/src/systems/zone/load-calc-system.ts` — LoadCalcSystem（Systemパターン参照）

---

## 6. 実装ファイル一覧

| ファイルパス | 種別 | 説明 |
|-------------|------|------|
| `packages/kuhl-viewer/src/systems/level-visibility-system.tsx` | 新規作成 | processLevelVisibility + isDescendantOfLevel + LevelVisibilitySystem |
| `packages/kuhl-viewer/src/systems/interactive-system.tsx` | 新規作成 | resolveSelectionPath + InteractiveSystem（ホバー・クリック・アウトライン） |
| `packages/kuhl-viewer/src/__tests__/systems/level-visibility.test.tsx` | 新規作成 | 両システムの単体テスト |
| `packages/kuhl-viewer/src/index.ts` | 変更 | LevelVisibilitySystem, InteractiveSystem のエクスポート追加 |

---

## 7. 信頼性レベルサマリー

| セクション | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|-----------|-------|-------|-------|------|
| 1. 機能の概要 | 4 | 0 | 0 | 4 |
| 2. 入出力の仕様 | 12 | 11 | 0 | 23 |
| 3. 制約条件 | 7 | 1 | 0 | 8 |
| 4. 想定される使用例 | 6 | 6 | 0 | 12 |
| **合計** | **29** | **18** | **0** | **47** |

### 全体評価

- **総項目数**: 47項目
- 🔵 **青信号**: 29項目 (62%)
- 🟡 **黄信号**: 18項目 (38%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 高品質 -- 黄信号はInteractiveSystemの具体的実装方式（Raycasterベース vs R3Fイベントベース）、ホバーハイライトのemissive色設定、クリック選択のselectionPath推定ロジック、アウトラインエフェクトの責務分担に起因する。これらは既存Pascal EditorのLevelSystem/InteractiveSystemパターンから推測した妥当な設計であり、実装時の調整余地は限定的。LevelVisibilitySystemは既存パターンの踏襲であり高信頼性。赤信号なし。
