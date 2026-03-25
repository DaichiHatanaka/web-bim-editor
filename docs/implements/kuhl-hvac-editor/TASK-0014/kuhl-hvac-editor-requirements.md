# TASK-0014: ZoneDrawTool（ポリゴン描画ツール）要件定義書

**タスクID**: TASK-0014
**機能名**: kuhl-hvac-editor
**要件名**: ZoneDrawTool（ポリゴン描画ツール）
**作成日**: 2026-03-25
**信頼性評価**: 高品質

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🔵 **何をする機能か**: 3Dビュー上でクリックによりポリゴン頂点を追加し、HvacZoneNode を作成するゾーン描画ツール。半透明プレビュー（ローカル描画）でリアルタイム確認し、Enter確定でシーンストアに永続化する。
- 🔵 **どのような問題を解決するか**: 空調ゾーンの空間的境界をユーザーが直感的に描画できる手段が存在しないため、クリックベースのポリゴン入力UIを提供する。
- 🔵 **想定されるユーザー**: 社内の空調設備設計担当者。ゾーニングフェーズでフロア上にゾーン境界を描画し、用途・設計条件を設定する。
- 🔵 **システム内での位置づけ**: `apps/kuhl-editor/components/tools/zone-draw-tool.tsx` に配置。ツール規約に従い `useScene` のみ変更。プレビューはローカル state。`useEditor` の `zone_draw` ツールとして登録済み。
- **参照したEARS要件**: REQ-102
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - ツール規約、データフロー; `docs/design/kuhl-hvac-editor/dataflow.md` - ゾーン描画フロー

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 ZoneDrawTool コンポーネント

- 🔵 **コンポーネント型**: `FC`（props なし。Viewer の children として注入される）
- 🔵 **アクティブ条件**: `useEditor.tool === 'zone_draw'` のとき描画・操作有効

### 2.2 ポリゴン頂点クリック入力

- 🔵 **入力**: 3Dビュー上のクリックイベント
- 🔵 **座標取得方法**: Raycaster で XZ 平面上の交点を算出し `[x, z]` タプルとして取得
- 🔵 **ローカル state**: `vertices: [number, number][]` に頂点を蓄積（シーンストアには保存しない）
- 🔵 **プレビュー表示条件**: `vertices.length >= 3` のとき半透明ポリゴンをローカル描画

### 2.3 Enter確定・ノード作成

- 🔵 **トリガー**: `Enter` キー押下
- 🔵 **前提条件**: `vertices.length >= 3` かつ `levelId` が選択済み
- 🔵 **処理フロー**:
  1. `calculatePolygonArea(vertices)` で面積を自動算出（Shoelace formula）
  2. ゾーン属性入力ダイアログを表示
  3. ユーザーがダイアログ確定後、`HvacZoneNode.parse()` でノード生成
  4. `useScene.getState().createNode(zone, levelId)` でシーンストアに永続化
  5. `vertices` をリセット、プレビュークリア

- 🔵 **HvacZoneNode.parse() 入力パラメータ**:

  | パラメータ | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | `zoneName` | `string` | Yes | ゾーン名（ダイアログ入力） |
  | `usage` | `ZoneUsage` | Yes | 用途（ダイアログ選択） |
  | `floorArea` | `number` | Yes | 床面積 m^2（boundary から自動算出） |
  | `boundary` | `[number, number][]` | Yes | ポリゴン頂点配列 `[[x, z], ...]` |
  | `designConditions` | `DesignConditions` | No | 設計条件（ダイアログ入力、デフォルト値あり） |

- 🔵 **出力**: `zone_xxx` 形式の ID を持つ `HvacZoneNode` がシーンストアに追加される

### 2.4 ESCキャンセル

- 🔵 **トリガー**: `Escape` キー押下
- 🔵 **処理**: `vertices` を空配列にリセット、プレビューポリゴンをクリア
- 🔵 **ダイアログ表示中の場合**: ダイアログを閉じ、描画状態（`vertices`）は維持する

### 2.5 unmount クリーンアップ

- 🔵 **トリガー**: ツール切替等による ZoneDrawTool のアンマウント
- 🔵 **処理**:
  - イベントリスナー（click, keydown）の削除
  - プレビュー用ジオメトリ・マテリアルの破棄（GPU メモリリーク防止）
  - ローカル state のリセット（未確定のノードはシーンに保存されていないため削除不要）

### 2.6 ゾーン属性入力ダイアログ

- 🔵 **表示トリガー**: Enter 確定時（`vertices.length >= 3` の場合）
- 🔵 **入力フィールド**:

  | フィールド | 型 | 必須 | デフォルト値 | 説明 |
  |-----------|-----|------|-------------|------|
  | `zoneName` | `string` | Yes | `''` | ゾーン名 |
  | `usage` | `ZoneUsage` | Yes | `'office'` | 用途（11種から選択） |
  | `designConditions.summerDryBulb` | `number` | No | `26` | 夏期乾球温度 (deg C) |
  | `designConditions.summerHumidity` | `number` | No | `50` | 夏期湿度 (%) |
  | `designConditions.winterDryBulb` | `number` | No | `22` | 冬期乾球温度 (deg C) |
  | `designConditions.winterHumidity` | `number` | No | `40` | 冬期湿度 (%) |
  | `designConditions.ventilationRate` | `number` | No | - | 換気回数 |
  | `designConditions.freshAirRate` | `number` | No | - | 外気導入量 |

- 🔵 **確定ボタン**: `zoneName` が空でなければ有効。確定でノード作成処理実行。
- 🔵 **キャンセルボタン**: ダイアログを閉じ、描画状態（`vertices`）は維持する（ユーザーが頂点を再利用できるようにする）。

- **参照したEARS要件**: REQ-102
- **参照した設計文書**: `packages/kuhl-core/src/schema/nodes/hvac-zone.ts` - HvacZoneNode, ZoneUsage, DesignConditions; `packages/kuhl-core/src/store/use-scene.ts` - createNode API

---

## 3. テスト可能な純粋関数の分離

ツールコンポーネント内のロジックのうち、React/Three.js 非依存の純粋関数を独立モジュールとして分離する。これにより R3F 環境なしで高速に単体テスト可能。

### 3.1 calculatePolygonArea

- 🔵 **シグネチャ**: `calculatePolygonArea(vertices: [number, number][]): number`
- 🔵 **アルゴリズム**: Shoelace formula（ガウスの面積公式）
- 🔵 **計算式**: `A = 0.5 * |sum(x_i * z_{i+1} - x_{i+1} * z_i)|` (i = 0..n-1, 巡回)
- 🔵 **戻り値**: 正の面積値（m^2）。絶対値を返す（頂点の巡回方向に依存しない）。
- 🔵 **エッジケース**:
  - 空配列 → `0`
  - 1点 → `0`
  - 2点 → `0`
  - 同一点の繰り返し → `0`

### 3.2 isValidPolygon

- 🔵 **シグネチャ**: `isValidPolygon(vertices: [number, number][]): boolean`
- 🔵 **判定条件**: `vertices.length >= 3`
- 🔵 **用途**: Enter 確定前のバリデーション。3点未満の場合は確定処理を実行しない。

### 3.3 snapToGrid（オプション機能）

- 🟡 **シグネチャ**: `snapToGrid(point: [number, number], gridSize: number): [number, number]`
- 🟡 **計算**: `[Math.round(x / gridSize) * gridSize, Math.round(z / gridSize) * gridSize]`
- 🟡 **デフォルト gridSize**: `0.5`（500mm グリッド）
- 🟡 **用途**: クリック座標をグリッドにスナップ。MVP ではオプション機能として実装。

### 3.4 実装ファイル

- 🔵 **ファイルパス**: `apps/kuhl-editor/lib/zone-draw-utils.ts`
- 🔵 **テストファイルパス**: `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts`

- **参照した設計文書**: TASK-0014.md - floorArea自動算出、Shoelace formula

---

## 4. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 4.1 ツール規約

- 🔵 **useScene のみ変更**: ZoneDrawTool は `useScene.createNode()` のみでシーンを変更する。直接 Three.js API（`scene.add()` 等）は呼び出さない。
- 🔵 **プレビューはローカル state**: 確定前のポリゴンプレビューはローカル `useState` で管理。`useScene` にプレビュー用ノードを作成しない。
- 🔵 **unmount クリーンアップ**: コンポーネント unmount 時にイベントリスナー・プレビューリソースを確実にクリーンアップする。

### 4.2 Viewer Isolation 原則

- 🔵 **ツールの配置**: `apps/kuhl-editor/components/tools/` に配置。`@kuhl/viewer` からは import しない（Viewer Isolation 原則に反しないよう、ツールは editor app 側に存在）。
- 🔵 **Viewer への注入**: `<Viewer>` の children として `<ZoneDrawTool />` を注入する。

### 4.3 パフォーマンス

- 🟡 **プレビュー描画**: 頂点追加ごとにジオメトリを再生成する。100頂点以下では問題なし。
- 🔵 **ジオメトリ破棄**: プレビュー更新時に古いジオメトリ・マテリアルを `.dispose()` する（GPU メモリリーク防止）。

### 4.4 テスト要件

- 🔵 **カバレッジ**: 60% 以上。
- 🔵 **純粋関数テスト**: `calculatePolygonArea`, `isValidPolygon`, `snapToGrid` は jsdom 環境で R3F なしにテスト可能。
- 🟡 **コンポーネントテスト**: ZoneDrawTool コンポーネントのテストは R3F Canvas モックまたは `@testing-library/react` + イベントシミュレーションで実施。Raycaster のモック化が必要。

- **参照したEARS要件**: REQ-102, REQ-009
- **参照した設計文書**: CLAUDE.md - Tool Conventions, Viewer Isolation; `apps/kuhl-editor/store/use-editor.ts` - ZoneTool 型定義

---

## 5. 想定される使用例（EARSEdgeケース・データフローベース）

### 5.1 基本的な使用パターン

- 🔵 **UC-01: 矩形ゾーンの描画**
  - ユーザーが `zone_draw` ツールを選択する
  - 3D ビュー上で 4 点クリックして矩形のポリゴン頂点を追加する
  - 半透明ポリゴンプレビューがリアルタイム表示される
  - Enter キーで確定する
  - ゾーン属性入力ダイアログが表示される
  - ゾーン名「会議室 A」、用途「meeting」を入力して確定する
  - `HvacZoneNode` が `useScene` に追加される
  - `ZoneRenderer` が確定ゾーンを描画する

- 🔵 **UC-02: L字型ゾーンの描画**
  - ユーザーが 6 点クリックして L 字型のポリゴンを描画する
  - 面積が Shoelace formula で自動算出される
  - Enter 確定後、不規則形状のゾーンノードが作成される

- 🔵 **UC-03: 描画キャンセル**
  - 2 点クリック後に ESC キーを押す
  - 頂点がリセットされ、プレビューが消える
  - 再度クリックして新しいポリゴンの描画を開始できる

- 🔵 **UC-04: ツール切替による中断**
  - 3 点クリック後にツールを `select` に切り替える
  - ZoneDrawTool がアンマウントされる
  - 未確定の頂点データはクリーンアップされる（シーンストアには影響なし）

### 5.2 データフロー

- 🔵 **ゾーン描画フロー**:
  ```
  クリック → Raycaster → [x, z] → vertices state に追加
    → vertices.length >= 3 → PreviewPolygon 描画（ローカル）
    → Enter → ダイアログ表示
    → ダイアログ確定 → calculatePolygonArea(vertices) → floorArea
    → HvacZoneNode.parse({ boundary, zoneName, usage, floorArea, designConditions })
    → useScene.createNode(zone, levelId)
    → ZoneRenderer が自動描画（dirty tracking 経由）
  ```

- 🔵 **ESC キャンセルフロー**:
  ```
  ESC → vertices = [] → プレビュークリア → 描画待機状態に戻る
  ```

### 5.3 エッジケース

- 🔵 **EDGE-001: 3点未満で Enter**
  - `vertices.length < 3` のとき Enter を押しても何も起きない（ダイアログは表示されない）。
  - `isValidPolygon(vertices)` が `false` を返す。

- 🟡 **EDGE-002: 自己交差ポリゴン**
  - 頂点の配置によりポリゴンが自己交差する場合がある。
  - MVP では自己交差の検出・ブロックは行わない。基本的な警告メッセージのみ表示する（将来の拡張ポイント）。
  - Shoelace formula は自己交差ポリゴンでも値を返す（正確な面積ではないが、ゼロにはならない）。

- 🔵 **EDGE-003: levelId 未選択時**
  - `levelId` が `null` の場合、ZoneDrawTool はクリックイベントを無視する（頂点追加不可）。
  - UI上でツールを無効化（グレーアウト）するのが望ましい。

- 🔵 **EDGE-004: zoneName 空文字で確定**
  - ダイアログの確定ボタンは `zoneName` が空文字の場合は無効化する。
  - `HvacZoneNode.parse()` の `zoneName` は `z.string()` で必須だが、空文字は通る。UI 側でバリデーション。

- 🟡 **EDGE-005: 非常に小さいポリゴン（面積ほぼゼロ）**
  - 3点が一直線上にある場合、面積がほぼゼロになる。
  - MVP では面積ゼロのゾーンも作成可能とする（将来的に最小面積バリデーションを追加可能）。

- 🔵 **EDGE-006: ダイアログ表示中の ESC**
  - ESC でダイアログを閉じる。頂点データ（`vertices`）は維持される。
  - ユーザーは再度 Enter を押してダイアログを再表示できる。

- **参照したEARS要件**: REQ-102
- **参照した設計文書**: TASK-0014.md - エッジケース定義; `packages/kuhl-core/src/schema/nodes/hvac-zone.ts` - HvacZoneNode スキーマ

---

## 6. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- 空調設備設計者がフロア上にゾーン境界をポリゴンで描画し、用途・設計条件を設定するストーリー

### 参照した機能要件
- **REQ-102**: ZoneDrawTool によるポリゴン描画、Enter確定、ESCキャンセル、ゾーン属性入力 🔵

### 参照した非機能要件
- **NFR-001**: プレビュー描画が 60fps を維持すること 🟡

### 参照したEdgeケース
- **EDGE-001**: 3点未満で Enter → 無視 🔵
- **EDGE-002**: 自己交差ポリゴン → 基本的な警告のみ 🟡
- **EDGE-003**: levelId 未選択時 → ツール無効化 🔵
- **EDGE-004**: zoneName 空文字 → 確定ボタン無効 🔵
- **EDGE-005**: 面積ほぼゼロ → 作成可能 🟡
- **EDGE-006**: ダイアログ表示中の ESC → ダイアログのみ閉じる 🔵

### 参照した受け入れ基準
- ポリゴン描画が動作する
- 確定時に HvacZoneNode が作成される
- ESC でキャンセルできる
- テスト60%以上カバレッジ

### 参照した設計文書

- **タスク定義**: `docs/tasks/kuhl-hvac-editor/TASK-0014.md`
- **HvacZoneNode スキーマ**: `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`
  - ZoneUsage (11種): office, meeting, server_room, lobby, corridor, toilet, kitchen, warehouse, mechanical_room, electrical_room, other
  - DesignConditions: summerDryBulb(26), summerHumidity(50), winterDryBulb(22), winterHumidity(40), ventilationRate?, freshAirRate?
  - boundary: `[number, number][]` (optional)
  - floorArea: number (必須)
- **useScene ストア**: `packages/kuhl-core/src/store/use-scene.ts`
  - `createNode(node: AnyNode, parentId?: AnyNodeId)` API
  - Zustand + Zundo による undo/redo 対応
- **useEditor ストア**: `apps/kuhl-editor/store/use-editor.ts`
  - `ZoneTool = 'select' | 'zone_draw' | 'zone_edit' | 'load_calc'`
  - `zone_draw` が Phase 'zone' で利用可能
- **ZoneRenderer**: `packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx`
  - `boundaryToShape()`, `isValidBoundary()`, `computeCentroid()`, `getZoneColor()` のユーティリティ関数が利用可能
  - プレビューポリゴン描画で `boundaryToShape()` を再利用可能
- **ツール規約**: CLAUDE.md - Tool Conventions
  - useScene のみ変更
  - プレビューはローカル state
  - unmount クリーンアップ必須

---

## 7. 実装ファイル一覧

| ファイルパス | 種別 | 説明 |
|-------------|------|------|
| `apps/kuhl-editor/components/tools/zone-draw-tool.tsx` | 新規作成 | ZoneDrawTool メインコンポーネント |
| `apps/kuhl-editor/lib/zone-draw-utils.ts` | 新規作成 | 純粋関数（calculatePolygonArea, isValidPolygon, snapToGrid） |
| `apps/kuhl-editor/components/dialogs/zone-attribute-dialog.tsx` | 新規作成 | ゾーン属性入力ダイアログ |
| `apps/kuhl-editor/__tests__/lib/zone-draw-utils.test.ts` | 新規作成 | 純粋関数の単体テスト |
| `apps/kuhl-editor/__tests__/components/tools/zone-draw-tool.test.tsx` | 新規作成 | ZoneDrawTool コンポーネントテスト |

---

## 8. 信頼性レベルサマリー

| セクション | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|-----------|-------|-------|-------|------|
| 1. 機能の概要 | 4 | 0 | 0 | 4 |
| 2. 入出力の仕様 | 16 | 0 | 0 | 16 |
| 3. 純粋関数の分離 | 8 | 4 | 0 | 12 |
| 4. 制約条件 | 6 | 2 | 0 | 8 |
| 5. 想定される使用例 | 10 | 3 | 0 | 13 |
| **合計** | **44** | **9** | **0** | **53** |

### 全体評価

- **総項目数**: 53項目
- 🔵 **青信号**: 44項目 (83%)
- 🟡 **黄信号**: 9項目 (17%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 高品質 -- 黄信号は snapToGrid のオプション機能（MVP での優先度が不明確）、自己交差ポリゴンの扱い（MVP では基本警告のみ）、R3F コンポーネントテスト環境の制約、パフォーマンス目標値に起因する。赤信号なし。HvacZoneNode スキーマ、useScene CRUD API、ZoneRenderer ユーティリティ関数の実装が完了しており、設計文書に強く裏付けられている。
