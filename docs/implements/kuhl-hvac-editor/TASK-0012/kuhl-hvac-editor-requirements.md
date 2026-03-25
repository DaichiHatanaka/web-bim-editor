# TASK-0012: Viewer基盤コンポーネント・Canvas・Grid 要件定義書

**タスクID**: TASK-0012
**機能名**: kuhl-hvac-editor
**要件名**: Viewer基盤コンポーネント・Canvas・Grid
**作成日**: 2026-03-24
**信頼性評価**: 高品質

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🔵 **何をする機能か**: Kuhl HVAC Editorの3Dビューポート基盤を構築する。R3F（React Three Fiber）Canvasコンポーネント、WebGPUレンダラー、Grid、OrbitControls、基本ライティング、レイヤー定数定義、NodeRendererディスパッチャーを提供する。
- 🔵 **どのような問題を解決するか**: 空調設備の3D BIM編集のための可視化基盤が存在しないため、すべての後続レンダラー（ゾーン、機器、ダクト等）が動作するための土台を構築する。
- 🔵 **想定されるユーザー**: 社内の空調設備設計担当者。3Dビューポート上でゾーン描画・機器配置・ルーティング等の操作を行う。
- 🔵 **システム内での位置づけ**: `@kuhl/viewer` パッケージのメインエントリーポイント。既存Pascal Editor V2の `packages/viewer/src/components/viewer/index.tsx` をフォーク・再構成し、建築ノード関連のシステム・レンダラーを空調設備用に置換する。Viewer Isolation原則に従い、`apps/kuhl-editor` からのインポートは禁止。props、callbacks、children injectionで制御される。
- **参照したEARS要件**: REQ-003, REQ-007, REQ-009
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - モノレポ構成、パッケージ依存関係、Three.jsレイヤー、Viewer Isolation原則

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 Viewer コンポーネント

- 🔵 **入力パラメータ**:

  | パラメータ | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | `children` | `React.ReactNode` | No | children injection用。エディタ固有ツール・UIを注入 |
  | `selectionManager` | `'default' \| 'custom'` | No | 選択マネージャーの制御（デフォルト: `'default'`） |
  | `perf` | `boolean` | No | パフォーマンスモニター表示（デフォルト: `false`） |

- 🔵 **出力**: R3F Canvas要素（3Dビューポート）。WebGPUレンダラーで描画されたシーンを含む。

- 🔵 **内部構成要素**:
  - Canvas: R3F Canvas、WebGPURenderer、カメラ初期位置 `[50, 50, 50]`、FOV 50
  - GridHelper: XZ平面上のグリッド表示
  - OrbitControls: マウス操作による3Dカメラ制御
  - AmbientLight + DirectionalLight: 基本ライティング
  - SceneRenderer: 全ノードの描画を管理
  - GPUDeviceWatcher: WebGPUデバイスロスト監視

### 2.2 レイヤー定数

- 🔵 **出力（定数エクスポート）**:

  | 定数名 | 型 | 値 | 用途 |
  |--------|-----|-----|------|
  | `SCENE_LAYER` | `number` | `0` | 通常ジオメトリ（機器、ダクト、配管） |
  | `EDITOR_LAYER` | `number` | `1` | エディタヘルパー（ポートマーカー、寸法線） |
  | `ZONE_LAYER` | `number` | `2` | ゾーンオーバーレイ（半透明着色） |

### 2.3 NodeRenderer ディスパッチャー

- 🟡 **入力パラメータ**:

  | パラメータ | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | `nodeId` | `AnyNode['id']` | Yes | 描画対象ノードのID |

- 🟡 **出力**: `node.type` に基づいて適切なレンダラーコンポーネントを返す。未実装タイプにはフォールバック（BoxGeometry）を表示。
- 🟡 **ディスパッチマッピング（Phase 1段階）**:

  | node.type | レンダラー | 状態 |
  |-----------|-----------|------|
  | `plant` | （レンダリングなし） | - |
  | `building` | （レンダリングなし） | - |
  | `level` | （レンダリングなし） | - |
  | `hvac_zone` | HvacZoneRenderer | TASK-0013で実装 |
  | `ahu` / `pac` / `fcu` 等 | EquipmentRenderer | TASK-0021で実装 |
  | `diffuser` | DiffuserRenderer | TASK-0023で実装 |
  | `duct_segment` | DuctRenderer | 後続Phase |
  | `pipe_segment` | PipeRenderer | 後続Phase |
  | `architecture_ref` | ArchitectureRefRenderer | TASK-0016で実装 |
  | その他/未実装 | FallbackRenderer（BoxGeometry） | 本タスクで実装 |

- **参照したEARS要件**: REQ-003, REQ-007
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/interfaces.ts` - AnyNode型、AnyNodeType型; `docs/design/kuhl-hvac-editor/architecture.md` - レンダラーパターン、NodeRendererディスパッチャー

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 パフォーマンス要件

- 🟡 **NFR-001**: 3Dビューポートは60fps以上で描画しなければならない（1000ノード以下の場合）。Canvas dprは `[1, 1.5]` に制限。
- 🔵 **useFrame制約**: useFrame内の処理は16ms以内に収める。

### 3.2 互換性要件

- 🔵 **NFR-301**: WebGPU対応ブラウザ（Chrome/Edge最新版）必須。WebGPURenderer を使用。

### 3.3 アーキテクチャ制約

- 🔵 **Viewer Isolation原則（REQ-009）**: `@kuhl/viewer` は `apps/kuhl-editor` からインポートしてはならない。Viewerはprops、callbacks、children injectionで制御される。
- 🔵 **レイヤー番号ハードコード禁止**: `SCENE_LAYER`, `EDITOR_LAYER`, `ZONE_LAYER` 定数を使用する。レイヤー番号の直接指定は禁止。
- 🔵 **既存基盤維持（REQ-007）**: BaseNode、useScene、event bus、sceneRegistryの共通基盤パターンを踏襲する。
- 🔵 **パッケージ依存関係**: `@kuhl/viewer` は `@kuhl/core` に peer依存。`@kuhl/core` はReact/Three.js非依存の純粋ロジック。

### 3.4 テスト要件

- 🔵 **カバレッジ**: テスト60%以上カバレッジ。
- 🟡 **R3Fテスト環境**: R3F Canvas のレンダリングテストは `@react-three/test-renderer` または jsdom環境でのモック化が必要。レイヤー定数テストは純粋な単体テストとして実行可能。

### 3.5 WebGPUレンダラー設定

- 🔵 **トーンマッピング**: `THREE.ACESFilmicToneMapping`、露出 `0.9`
- 🔵 **シャドウ**: `THREE.PCFShadowMap`、enabled: `true`

- **参照したEARS要件**: REQ-003, REQ-007, REQ-009, NFR-001, NFR-301
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - Viewer Isolation原則、Three.jsレイヤー、技術的制約

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン

- 🔵 **UC-01: Viewerの初期表示**
  - ユーザーがKuhl HVACエディタページにアクセスする
  - Viewer が3Dビューポートを表示する（Grid、ライティングが有効）
  - OrbitControlsでカメラを回転・パン・ズーム操作できる

- 🔵 **UC-02: children injection によるエディタ機能注入**
  - `apps/kuhl-editor` が `<Viewer>` に子コンポーネント（ツール、SelectionManager等）を注入する
  - Viewer本体はエディタ固有ロジックを持たず、children経由で拡張される

- 🟡 **UC-03: NodeRenderer によるノード描画**
  - useSceneにノードが追加されると、SceneRendererがNodeRendererにディスパッチする
  - NodeRendererが `node.type` に基づいて適切なレンダラーを選択する
  - 未実装のノードタイプにはFallbackRenderer（BoxGeometry）が表示される

### 4.2 データフロー

- 🔵 **ビューポート描画フロー**:
  ```
  useScene.nodes → SceneRenderer → NodeRenderer(nodeId)
    → node.type判定 → 対応Renderer or FallbackRenderer
    → THREE meshes → 3D Viewport
  ```

- 🔵 **カメラ操作フロー**:
  ```
  ユーザーマウス操作 → OrbitControls → カメラ位置更新 → 再描画
  ```

### 4.3 エッジケース

- 🟡 **EDGE-UC-01: WebGPU非対応ブラウザ**
  - WebGPURendererの初期化に失敗した場合のハンドリング。GPUDeviceWatcherがデバイスロストを監視し、ログ出力する。

- 🟡 **EDGE-UC-02: 存在しないノードIDへのNodeRenderer呼び出し**
  - `useScene` から取得したノードが `null` の場合、NodeRendererは `null` を返す（描画しない）。

- 🟡 **EDGE-UC-03: 大量ノード時のパフォーマンス**
  - 1000ノード以下で60fps維持。BVH（Bounding Volume Hierarchy）によるレイキャスト最適化を適用。

- **参照したEARS要件**: REQ-003, NFR-001
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/dataflow.md` - コアデータフローサイクル

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- 空調設備設計者が3Dビューポート上でゾーン描画・機器配置を行うための基盤ストーリー

### 参照した機能要件
- **REQ-003**: `@kuhl/viewer` パッケージとして3Dビューポートと空調ノード用レンダラーを提供 🔵
- **REQ-007**: 既存のBaseNode, useScene, event bus, sceneRegistry, dirty trackingの共通基盤を維持 🔵
- **REQ-009**: `@kuhl/viewer` は `apps/editor` からインポート禁止（Viewer Isolation原則） 🔵

### 参照した非機能要件
- **NFR-001**: 3Dビューポートは60fps以上で描画（1000ノード以下） 🟡
- **NFR-301**: Chrome/Edge最新版（WebGPU対応）で動作 🔵

### 参照したEdgeケース
- （本タスク固有のEARSエッジケースなし。WebGPUデバイスロストは実装上の考慮事項として追加）

### 参照した受け入れ基準
- Viewer が 3Dビューポートを表示する
- Grid, OrbitControls が動作する
- レイヤー定数（SCENE_LAYER=0, EDITOR_LAYER=1, ZONE_LAYER=2）が定義されている
- NodeRenderer がノードタイプ別にディスパッチする
- テスト60%以上カバレッジ

### 参照した設計文書

- **アーキテクチャ**: `docs/design/kuhl-hvac-editor/architecture.md`
  - モノレポ構成（packages/kuhl-viewer/）
  - パッケージ依存関係（@kuhl/viewer -> @kuhl/core peer）
  - Three.jsレイヤー定義（SCENE_LAYER=0, EDITOR_LAYER=1, ZONE_LAYER=2）
  - レンダラーパターン（EquipmentRenderer等の設計例）
  - Viewer Isolation原則
- **データフロー**: `docs/design/kuhl-hvac-editor/dataflow.md`
  - コアデータフローサイクル（useScene -> Systems -> Renderers -> Viewport）
  - 状態管理フロー（3ストアアーキテクチャ）
- **型定義**: `docs/design/kuhl-hvac-editor/interfaces.ts`
  - AnyNode 型ユニオン（24種のノードタイプ）
  - AnyNodeType 型
  - BaseNode インターフェース
- **既存実装（参考）**:
  - `packages/viewer/src/components/viewer/index.tsx` - 既存Pascal Viewerコンポーネント
  - `packages/viewer/src/lib/layers.ts` - 既存レイヤー定数
  - `packages/viewer/src/components/renderers/node-renderer.tsx` - 既存NodeRendererディスパッチャー

---

## 6. 実装ファイル一覧

| ファイルパス | 種別 | 説明 |
|-------------|------|------|
| `packages/kuhl-viewer/src/components/viewer.tsx` | 新規作成 | Viewerメインコンポーネント |
| `packages/kuhl-viewer/src/constants/layers.ts` | 新規作成 | レイヤー定数定義 |
| `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` | 新規作成 | NodeRendererディスパッチャー |
| `packages/kuhl-viewer/src/components/renderers/fallback-renderer.tsx` | 新規作成 | 未実装ノードタイプ用フォールバック |
| `packages/kuhl-viewer/src/__tests__/components/viewer.test.tsx` | 新規作成 | Viewerコンポーネントテスト |
| `packages/kuhl-viewer/src/__tests__/constants/layers.test.ts` | 新規作成 | レイヤー定数テスト |
| `packages/kuhl-viewer/src/__tests__/components/renderers/node-renderer.test.tsx` | 新規作成 | NodeRendererテスト |

---

## 7. 信頼性レベルサマリー

| セクション | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|-----------|-------|-------|-------|------|
| 1. 機能の概要 | 4 | 0 | 0 | 4 |
| 2. 入出力の仕様 | 5 | 3 | 0 | 8 |
| 3. 制約条件 | 7 | 2 | 0 | 9 |
| 4. 想定される使用例 | 4 | 4 | 0 | 8 |
| **合計** | **20** | **9** | **0** | **29** |

### 全体評価

- **総項目数**: 29項目
- 🔵 **青信号**: 20項目 (69%)
- 🟡 **黄信号**: 9項目 (31%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 高品質 -- 黄信号はNodeRendererのディスパッチマッピング（後続タスクで実装される個別レンダラーへの推測）、R3Fテスト環境の制約、パフォーマンス目標値（既存から推測）に起因する。赤信号なし。既存Pascal Viewerの実装パターンと設計文書に強く裏付けられている。
