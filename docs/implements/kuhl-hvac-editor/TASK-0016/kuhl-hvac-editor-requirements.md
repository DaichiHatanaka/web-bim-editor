# TASK-0016: IFC読込（web-ifc WASM）+ ArchitectureRefRenderer 要件定義書

**タスクID**: TASK-0016
**機能名**: kuhl-hvac-editor
**要件名**: IFC読込（web-ifc WASM）+ ArchitectureRefRenderer
**作成日**: 2026-03-25
**信頼性評価**: 要改善（web-ifc API統合部分に技術検証要素あり）

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🔵 **何をする機能か**: web-ifc（WASM）を使用してIFCファイルをブラウザ内でパースし、建築躯体（IfcWall, IfcSlab, IfcBeam, IfcColumn, IfcCovering）のジオメトリを抽出する。抽出したジオメトリを ArchitectureRefNode としてシーンストアに保存し、ArchitectureRefRenderer で半透明・編集不可の参照表示として3Dビューに描画する。
- 🔵 **どのような問題を解決するか**: 空調設備設計者が建築躯体の位置・形状を把握できないと、ゾーニングや機器配置が困難になる。IFC建築データを参照表示することで、建築躯体との整合性を視覚的に確認しながら空調設計が行える。
- 🔵 **想定されるユーザー**: 社内の空調設備設計担当者。建築設計者からIFCファイルを受領し、それを参照しながら空調ゾーニング・機器配置を行う。
- 🔵 **システム内での位置づけ**: IFCパースロジックは `packages/kuhl-core/src/systems/ifc/ifc-import.ts` に配置（純粋ロジック、React/Three.js非依存）。ArchitectureRefRenderer は `packages/kuhl-viewer/src/components/renderers/architecture-ref-renderer.tsx` に配置（Viewer層）。
- **参照したEARS要件**: REQ-106, REQ-107, REQ-108, EDGE-001
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - レンダラーパターン、ノード階層; `docs/spec/kuhl-hvac-editor/requirements.md` - Phase 1要件

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 IFCパースモジュール（ifc-import.ts）

#### 2.1.1 initIfcApi

- 🔵 **シグネチャ**: `initIfcApi(wasmPath?: string): Promise<IfcAPI>`
- 🟡 **処理内容**:
  1. `new IfcAPI()` でインスタンス生成
  2. `ifcApi.SetWasmPath(wasmPath)` でWASMファイルパスを設定（デフォルト: `/wasm/`）
  3. `await ifcApi.Init()` でWASM初期化
  4. 初期化済み `IfcAPI` インスタンスを返す
- 🟡 **エラーハンドリング**: Init() 失敗時は `IfcInitError` をスロー
- **参照**: web-ifc API ドキュメント - `IfcAPI.Init()`

#### 2.1.2 parseIfcFile

- 🔵 **シグネチャ**: `parseIfcFile(ifcApi: IfcAPI, buffer: Uint8Array): IfcParseResult`
- 🟡 **処理内容**:
  1. `ifcApi.OpenModel(buffer)` でモデルをオープン（`modelID: number` を取得）
  2. `ifcApi.StreamAllMeshes(modelID, callback)` でメッシュを列挙
  3. 各 `FlatMesh` から `PlacedGeometry` を取得し、`ifcApi.GetGeometry(modelID, geometryExpressID)` で頂点・インデックスを抽出
  4. 抽出したジオメトリを `ParsedGeometry[]` に変換
  5. `ifcApi.CloseModel(modelID)` でモデルをクローズ
  6. `IfcParseResult` を返す
- 🟡 **フィルタリング**: 対象IFCエンティティタイプのみ抽出
  - `IFCWALL` / `IFCWALLSTANDARDCASE`
  - `IFCSLAB`
  - `IFCBEAM`
  - `IFCCOLUMN`
  - `IFCCOVERING`
- 🟡 **エラーハンドリング**: パース失敗時は部分読込を試行し、読み込めた要素のみ返す。完全失敗時は `IfcParseError` をスロー。

#### 2.1.3 ParsedGeometry 型定義

- 🔵 **型定義**:

  ```typescript
  type ParsedGeometry = {
    expressID: number
    ifcType: string           // 'IFCWALL' | 'IFCSLAB' | 'IFCBEAM' | 'IFCCOLUMN' | 'IFCCOVERING'
    vertices: Float32Array    // [x, y, z, x, y, z, ...] 頂点座標
    indices: Uint32Array      // 三角形インデックス
    color: { r: number; g: number; b: number; a: number }
    flatTransformation: number[]  // 4x4変換行列（フラット配列、16要素）
  }
  ```

#### 2.1.4 IfcParseResult 型定義

- 🔵 **型定義**:

  ```typescript
  type IfcParseResult = {
    geometries: ParsedGeometry[]
    storeys: ParsedStorey[]
    errors: string[]          // パース中に発生した警告・エラーメッセージ
  }
  ```

#### 2.1.5 extractStoreys（階高・天井高取得）

- 🟡 **シグネチャ**: `extractStoreys(ifcApi: IfcAPI, modelID: number): ParsedStorey[]`
- 🟡 **処理内容**:
  1. `ifcApi.GetAllLines(modelID, IFCBUILDINGSTOREY)` で全 IfcBuildingStorey を取得
  2. 各 Storey から `Name`、`Elevation` プロパティを抽出
  3. `ParsedStorey[]` を返す
- 🟡 **エラーハンドリング**: Elevation が取得できない場合はスキップ（エラーにしない）

#### 2.1.6 ParsedStorey 型定義

- 🔵 **型定義**:

  ```typescript
  type ParsedStorey = {
    expressID: number
    name: string | null
    elevation: number | null  // メートル単位。取得不可の場合は null
  }
  ```

- **参照したEARS要件**: REQ-106, REQ-107, REQ-108, EDGE-001
- **参照した設計文書**: web-ifc API ドキュメント - `IfcAPI.OpenModel()`, `StreamAllMeshes()`, `GetGeometry()`, `GetAllLines()`, `GetLine()`; `packages/kuhl-core/src/schema/nodes/architecture-ref.ts` - ArchitectureRefNode スキーマ

---

### 2.2 ArchitectureRefNode 生成

- 🔵 **既存スキーマ**: `packages/kuhl-core/src/schema/nodes/architecture-ref.ts`

  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | `id` | `arch_xxx` | Yes（auto） | objectId('arch') で自動生成 |
  | `type` | `'architecture_ref'` | Yes（auto） | nodeType('architecture_ref') |
  | `ifcFilePath` | `string` | Yes | IFCファイルのパスまたは名称 |
  | `ifcModelId` | `string` | No | 外部参照用モデルID |
  | `geometryData` | `any` | No | パース済みジオメトリデータ（ParsedGeometry[]を格納） |
  | `levelMapping` | `Record<string, string>` | No | IFC Storey expressID → LevelNode ID マッピング |

- 🔵 **ノード作成フロー**:
  1. `parseIfcFile()` でジオメトリとStoreyを抽出
  2. `ArchitectureRefNode.parse({ ifcFilePath, geometryData, levelMapping })` でノード生成
  3. `useScene.getState().createNode(archNode, buildingId)` でシーンストアに追加
  4. ArchitectureRefNode は Building の直下に配置（ノード階層: Building → ArchitectureRef）

- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - ノード階層; `packages/kuhl-core/src/schema/nodes/architecture-ref.ts`

---

### 2.3 ArchitectureRefRenderer コンポーネント

- 🔵 **ファイルパス**: `packages/kuhl-viewer/src/components/renderers/architecture-ref-renderer.tsx`
- 🔵 **props**: `{ nodeId: AnyNodeId }`
- 🔵 **責務**: ArchitectureRefNode の geometryData を Three.js メッシュとして描画する

#### 2.3.1 ジオメトリ描画

- 🔵 **描画内容**: ParsedGeometry[] の各エントリについて Three.js BufferGeometry + Mesh を生成
- 🔵 **頂点データ**: `ParsedGeometry.vertices` (Float32Array) を `BufferAttribute` として設定
- 🔵 **インデックスデータ**: `ParsedGeometry.indices` (Uint32Array) を `BufferAttribute` として設定
- 🔵 **変換行列**: `ParsedGeometry.flatTransformation` (number[16]) を `THREE.Matrix4` に変換し、メッシュに適用

#### 2.3.2 マテリアル・表示設定

- 🔵 **半透明表示**: `MeshBasicMaterial` または `MeshStandardMaterial` で `transparent: true`, `opacity: 0.3`
- 🔵 **カラー**: IFCエンティティタイプ別の固定カラーマップ

  | IFCタイプ | カラー | 説明 |
  |-----------|--------|------|
  | IFCWALL | `#B0B0B0` | 壁（グレー） |
  | IFCSLAB | `#C8C8C8` | 床（ライトグレー） |
  | IFCBEAM | `#A0A0A0` | 梁（ダークグレー） |
  | IFCCOLUMN | `#909090` | 柱（ダークグレー） |
  | IFCCOVERING | `#D0D0D0` | 天井（ライトグレー） |

- 🔵 **depthWrite**: `false`（半透明描画のZバッファ書き込み無効）
- 🔵 **side**: `THREE.DoubleSide`（両面表示）

#### 2.3.3 編集不可（raycast無効）

- 🔵 **raycast無効化**: メッシュの `raycast` メソッドを空関数 `() => {}` でオーバーライド
- 🔵 **イベント無し**: `useNodeEvents` を使用しない。クリック・ホバーイベントを発火しない。
- 🔵 **選択不可**: SelectionManager の対象外とする

#### 2.3.4 sceneRegistry 登録

- 🔵 **登録**: `sceneRegistry.nodes.set(nodeId, groupRef)` で登録
- 🔵 **タイプ登録**: `sceneRegistry.byType.architecture_ref.add(nodeId)` で登録
- 🔵 **クリーンアップ**: unmount 時に登録解除

#### 2.3.5 レイヤー設定

- 🔵 **レイヤー**: `SCENE_LAYER` (0) に配置（通常ジオメトリと同じレイヤー）

#### 2.3.6 GPUリソース管理

- 🔵 **ジオメトリ破棄**: unmount 時またはノード更新時に `BufferGeometry.dispose()` を呼び出す
- 🔵 **マテリアル破棄**: unmount 時またはノード更新時に `Material.dispose()` を呼び出す

- **参照したEARS要件**: REQ-006, REQ-106
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - レンダラーパターン; ZoneRenderer 実装パターン; `packages/kuhl-viewer/src/constants/layers.ts` - SCENE_LAYER

---

### 2.4 NodeRenderer へのディスパッチ統合

- 🔵 **変更ファイル**: `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx`
- 🔵 **変更内容**: `case 'architecture_ref':` を FallbackRenderer から ArchitectureRefRenderer に置換

  ```typescript
  case 'architecture_ref':
    return <ArchitectureRefRenderer nodeId={node.id} />
  ```

- **参照した設計文書**: 既存 node-renderer.tsx のディスパッチパターン

---

## 3. テスト可能な純粋関数の分離

IFCパースロジックのうち、web-ifc API依存部分とそれ以外を分離し、テスト可能性を最大化する。

### 3.1 filterTargetGeometries

- 🔵 **シグネチャ**: `filterTargetGeometries(geometries: ParsedGeometry[], targetTypes: string[]): ParsedGeometry[]`
- 🔵 **処理**: geometries から targetTypes に含まれる ifcType のみをフィルタリング
- 🔵 **デフォルト targetTypes**: `['IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCSLAB', 'IFCBEAM', 'IFCCOLUMN', 'IFCCOVERING']`
- 🔵 **用途**: パース結果から建築躯体のみを抽出する純粋関数

### 3.2 flatTransformationToMatrix4

- 🔵 **シグネチャ**: `flatTransformationToMatrix4(flat: number[]): number[]`
- 🔵 **処理**: web-ifc の `PlacedGeometry.flatTransformation`（行優先 4x4、16要素）をそのまま返す（Three.js の Matrix4.fromArray() で直接利用可能）
- 🔵 **バリデーション**: 配列長が16でない場合は単位行列を返す
- 🔵 **エッジケース**: null/undefined 入力 → 単位行列

### 3.3 isValidIfcBuffer

- 🔵 **シグネチャ**: `isValidIfcBuffer(buffer: Uint8Array): boolean`
- 🔵 **処理**: バッファの先頭バイトが `ISO-10303-21` ヘッダーを含むか簡易チェック
- 🔵 **用途**: parseIfcFile 呼び出し前のバリデーション

### 3.4 createArchitectureRefNodeData

- 🔵 **シグネチャ**: `createArchitectureRefNodeData(filePath: string, parseResult: IfcParseResult): { ifcFilePath: string; geometryData: ParsedGeometry[]; levelMapping: Record<string, string> | undefined }`
- 🔵 **処理**: パース結果から ArchitectureRefNode.parse() に渡すデータオブジェクトを構築
- 🔵 **levelMapping**: storeys が存在する場合のみ生成（expressID.toString() → storey.name のマッピング）

### 3.5 IFC_TYPE_COLOR_MAP

- 🔵 **定数**: IFCエンティティタイプ別カラーマップ

  ```typescript
  const IFC_TYPE_COLOR_MAP: Record<string, string> = {
    IFCWALL: '#B0B0B0',
    IFCWALLSTANDARDCASE: '#B0B0B0',
    IFCSLAB: '#C8C8C8',
    IFCBEAM: '#A0A0A0',
    IFCCOLUMN: '#909090',
    IFCCOVERING: '#D0D0D0',
  }
  ```

### 3.6 TARGET_IFC_TYPES

- 🔵 **定数**: 抽出対象IFCエンティティタイプ一覧

  ```typescript
  const TARGET_IFC_TYPES = [
    'IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCSLAB', 'IFCBEAM', 'IFCCOLUMN', 'IFCCOVERING'
  ] as const
  ```

### 3.7 実装ファイル

- 🔵 **ファイルパス**: `packages/kuhl-core/src/systems/ifc/ifc-import.ts`
- 🔵 **テストファイルパス**: `packages/kuhl-core/src/__tests__/systems/ifc/ifc-import.test.ts`
- 🔵 **Rendererテストファイルパス**: `packages/kuhl-viewer/src/__tests__/components/renderers/architecture-ref-renderer.test.tsx`（コンポーネントテスト、R3F環境必要）

- **参照した設計文書**: TASK-0016.md - 実装ファイル; web-ifc API ドキュメント

---

## 4. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 4.1 パッケージ配置原則

- 🔵 **Core層（`@kuhl/core`）**: IFCパースロジック（`ifc-import.ts`）は純粋ロジックとして Core 層に配置。React/Three.js に依存しない。web-ifc のみに依存。
- 🔵 **Viewer層（`@kuhl/viewer`）**: ArchitectureRefRenderer は Viewer 層に配置。React Three Fiber に依存。
- 🔵 **Viewer Isolation**: `@kuhl/viewer` は `apps/kuhl-editor` からインポートしない。

### 4.2 web-ifc WASM 配置

- 🟡 **WASMファイル配置**: `apps/kuhl-editor/public/wasm/` ディレクトリに `web-ifc.wasm` を配置
- 🟡 **パス設定**: `IfcAPI.SetWasmPath('/wasm/')` でパスを指定（Next.js public/ からの相対パス）
- 🟡 **代替案**: CDN配置（unpkg / jsdelivr）も将来的に検討可能

### 4.3 メインスレッド処理

- 🟡 **現行方針**: メインスレッドでIFCパースを実行。UIブロックの可能性あり。
- 🟡 **制約**: 100MB以下のIFCファイルを対象とする（NFR-003）
- 🟡 **将来対応**: 大規模ファイル対応として Web Worker 化を検討（TASK-0016 スコープ外）

### 4.4 IFC形式互換性

- 🟡 **対応形式**: IFC 2x3 および IFC 4（NFR-302）。web-ifc が両形式をサポートしているため、追加の形式判定ロジックは不要。

### 4.5 テスト要件

- 🔵 **カバレッジ**: 60% 以上
- 🔵 **純粋関数テスト**: `filterTargetGeometries`, `flatTransformationToMatrix4`, `isValidIfcBuffer`, `createArchitectureRefNodeData` は jsdom 環境で web-ifc モック不要でテスト可能
- 🟡 **web-ifc統合テスト**: `initIfcApi`, `parseIfcFile`, `extractStoreys` は web-ifc API のモックが必要。WASM ランタイムはテスト環境で利用不可のため、`IfcAPI` をモックする。
- 🟡 **Rendererコンポーネントテスト**: ArchitectureRefRenderer は R3F Canvas 環境またはモックが必要。Three.js のジオメトリ・マテリアル生成をテスト。

### 4.6 レンダラー規約

- 🔵 **useRegistry**: sceneRegistry に登録する
- 🔵 **useNodeEvents**: 使用しない（編集不可のため）
- 🔵 **ジオメトリ破棄**: unmount 時に `dispose()` を呼び出す
- 🔵 **レイヤー**: SCENE_LAYER (0) に配置

- **参照したEARS要件**: REQ-009, NFR-003, NFR-302
- **参照した設計文書**: CLAUDE.md - Viewer Isolation, Renderer規約; `docs/design/kuhl-hvac-editor/architecture.md` - パッケージ配置

---

## 5. 想定される使用例（EARSEdgeケース・データフローベース）

### 5.1 基本的な使用パターン

- 🔵 **UC-01: IFCファイル読込・建築躯体表示**
  - ユーザーがIFCファイルをアップロードする（ファイル選択ダイアログ）
  - `initIfcApi()` でweb-ifcを初期化する
  - `parseIfcFile(ifcApi, buffer)` でIFCをパースする
  - `ArchitectureRefNode.parse()` でノードを生成する
  - `useScene.createNode(archNode, buildingId)` でストアに追加する
  - ArchitectureRefRenderer が建築躯体を半透明で3Dビューに描画する
  - ユーザーは建築躯体を参照しながらゾーン描画を行う

- 🔵 **UC-02: 階高情報の自動取得**
  - IFCファイルに IfcBuildingStorey が含まれている場合
  - `extractStoreys()` で階名・Elevation を抽出する
  - LevelNode の elevation フィールドに反映する（手動または自動マッピング）

- 🔵 **UC-03: 建築躯体の参照表示（編集不可）**
  - 建築躯体メッシュはクリックしても選択されない（raycast 無効）
  - ホバーイベントも発火しない
  - 半透明表示により空調設備との重なりが視覚的に確認できる

### 5.2 データフロー

- 🔵 **IFC読込フロー**:
  ```
  File input → ArrayBuffer → Uint8Array
    → isValidIfcBuffer(buffer) → バリデーション
    → initIfcApi(wasmPath) → IfcAPI インスタンス
    → parseIfcFile(ifcApi, buffer) → IfcParseResult
    → createArchitectureRefNodeData(filePath, result) → nodeData
    → ArchitectureRefNode.parse(nodeData) → ArchitectureRefNode
    → useScene.createNode(archNode, buildingId) → ストア永続化
    → NodeRenderer ディスパッチ → ArchitectureRefRenderer 描画
  ```

- 🔵 **Renderer描画フロー**:
  ```
  ArchitectureRefNode.geometryData (ParsedGeometry[])
    → 各 ParsedGeometry について:
      → new THREE.BufferGeometry() + setAttribute('position', vertices)
      → setIndex(indices)
      → new THREE.Matrix4().fromArray(flatTransformation)
      → mesh.applyMatrix4(matrix)
      → new THREE.MeshStandardMaterial({ transparent, opacity: 0.3, color })
      → <mesh> を <group> に追加
    → <group> を SCENE_LAYER に配置
    → sceneRegistry 登録
  ```

### 5.3 エッジケース

- 🟡 **EDGE-001: 不正なIFCファイル**
  - `isValidIfcBuffer()` が `false` を返す場合、パース処理をスキップしエラーメッセージを表示する
  - `parseIfcFile()` 内でエラーが発生した場合、部分的に読み込めた要素は `IfcParseResult.geometries` に含め、エラーは `IfcParseResult.errors` に記録する
  - 完全にパース不可能な場合は `IfcParseError` をスローする

- 🟡 **EDGE-002: ジオメトリが空のIFCファイル**
  - 建築エンティティが含まれていないIFCファイル（設備のみ等）
  - `IfcParseResult.geometries` が空配列で返る
  - ArchitectureRefNode は作成されるが geometryData が空
  - ArchitectureRefRenderer は何も描画しない（null を返す）

- 🟡 **EDGE-003: IfcBuildingStorey が存在しない**
  - Elevation 情報が取得できない場合
  - `IfcParseResult.storeys` が空配列で返る
  - levelMapping は undefined（LevelNode への反映はスキップ）

- 🟡 **EDGE-004: 大規模IFCファイル（パフォーマンス）**
  - 100MB 超のファイルはメインスレッドでのパースでUIがブロックする可能性
  - MVP ではユーザーに警告表示のみ。処理完了までローディングインジケーターを表示。
  - 将来の Web Worker 化で対応予定。

- 🔵 **EDGE-005: geometryData が undefined/null のノード**
  - ArchitectureRefNode の geometryData がオプショナルフィールドのため未設定の場合がある
  - ArchitectureRefRenderer は geometryData が falsy の場合 null を返す（何も描画しない）

- 🔵 **EDGE-006: web-ifc WASM初期化失敗**
  - WASMファイルが見つからない、またはネットワークエラーの場合
  - `initIfcApi()` が `IfcInitError` をスローする
  - 呼び出し元でキャッチしてエラーメッセージを表示する

- **参照したEARS要件**: EDGE-001
- **参照した設計文書**: TASK-0016.md - 注意事項; NFR-003 - IFCファイルサイズ制限

---

## 6. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- 空調設備設計者が建築設計者から受領したIFCファイルを読み込み、建築躯体を参照しながら空調設計（ゾーニング・機器配置）を行うストーリー

### 参照した機能要件
- **REQ-006**: ArchitectureRefNode として IFC 建築躯体データを表示のみ（編集不可）で参照 🔵
- **REQ-106**: IFC 建築躯体ファイルを読み込み、壁・床・梁・柱・天井を表示 🔵
- **REQ-107**: IFC 読込は web-ifc（WASM）を使用し、ブラウザ内でパース 🔵
- **REQ-108**: IFC 読込時に階高・天井高を自動取得できる場合、Level 情報に反映（条件付き） 🟡

### 参照した非機能要件
- **NFR-001**: 3D ビューポートは 60fps 以上（1000 ノード以下） 🟡
- **NFR-003**: IFC ファイルの読込は 100MB 以下のファイルに対応 🟡
- **NFR-302**: IFC 2x3 および IFC 4 形式の読込に対応 🟡

### 参照したEdgeケース
- **EDGE-001**: IFC ファイルが不正またはパース不可能な場合、エラーメッセージ表示、部分読込試行 🟡

### 参照した受け入れ基準
- IFC ファイルのパース・ジオメトリ抽出が動作する
- 建築躯体が 3D ビューに表示される（編集不可）
- エラー時にメッセージ表示される
- テスト 60% 以上カバレッジ

### 参照した設計文書

- **タスク定義**: `docs/tasks/kuhl-hvac-editor/TASK-0016.md`
- **ArchitectureRefNode スキーマ**: `packages/kuhl-core/src/schema/nodes/architecture-ref.ts`
  - id: objectId('arch'), type: 'architecture_ref', ifcFilePath, geometryData, levelMapping
- **LevelNode スキーマ**: `packages/kuhl-core/src/schema/nodes/level.ts`
  - floorHeight, ceilingHeight, elevation, children
- **NodeRenderer**: `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx`
  - `case 'architecture_ref':` を FallbackRenderer から ArchitectureRefRenderer に置換
- **ZoneRenderer パターン**: `packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx`
  - sceneRegistry 登録/解除、ジオメトリ/マテリアル破棄、useScene セレクターの使い方
- **レイヤー定数**: `packages/kuhl-viewer/src/constants/layers.ts`
  - SCENE_LAYER (0), EDITOR_LAYER (1), ZONE_LAYER (2)
- **useScene ストア**: `packages/kuhl-core/src/store/use-scene.ts`
  - `createNode(node: AnyNode, parentId?: AnyNodeId)` API
- **web-ifc API**:
  - `IfcAPI.Init()` - WASM初期化
  - `IfcAPI.OpenModel(buffer)` - モデルオープン（modelID 返却）
  - `IfcAPI.StreamAllMeshes(modelID, callback)` - 全メッシュ列挙
  - `IfcAPI.GetGeometry(modelID, expressID)` - ジオメトリ取得（vertices + indices）
  - `IfcAPI.GetAllLines(modelID, type)` - エンティティ列挙
  - `IfcAPI.GetLine(modelID, expressID)` - エンティティ取得
  - `IfcAPI.CloseModel(modelID)` - モデルクローズ
  - `FlatMesh` - expressID + geometries (Vector<PlacedGeometry>)
  - `PlacedGeometry` - color + flatTransformation + geometryExpressID
  - `IfcGeometry` - vertices + indices

---

## 7. 実装ファイル一覧

| ファイルパス | 種別 | 説明 |
|-------------|------|------|
| `packages/kuhl-core/src/systems/ifc/ifc-import.ts` | 新規作成 | IFCパースモジュール（initIfcApi, parseIfcFile, extractStoreys, 純粋関数群） |
| `packages/kuhl-viewer/src/components/renderers/architecture-ref-renderer.tsx` | 新規作成 | ArchitectureRefRenderer コンポーネント |
| `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` | 変更 | architecture_ref ケースを ArchitectureRefRenderer に置換 |
| `packages/kuhl-core/src/__tests__/systems/ifc/ifc-import.test.ts` | 新規作成 | IFCパース純粋関数・統合テスト |

---

## 8. 信頼性レベルサマリー

| セクション | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|-----------|-------|-------|-------|------|
| 1. 機能の概要 | 4 | 0 | 0 | 4 |
| 2. 入出力の仕様 | 22 | 7 | 0 | 29 |
| 3. 純粋関数の分離 | 14 | 0 | 0 | 14 |
| 4. 制約条件 | 6 | 7 | 0 | 13 |
| 5. 想定される使用例 | 6 | 4 | 0 | 10 |
| **合計** | **52** | **18** | **0** | **70** |

### 全体評価

- **総項目数**: 70項目
- 🔵 **青信号**: 52項目 (74%)
- 🟡 **黄信号**: 18項目 (26%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 要改善 -- 黄信号は主に web-ifc API の具体的な呼び出しパターン（WASM初期化パス、StreamAllMeshes のコールバック処理、IfcBuildingStorey プロパティ抽出の詳細手順）、メインスレッド処理のパフォーマンス制約、IFC形式互換性の実装詳細に起因する。赤信号なし。ArchitectureRefNode スキーマ・NodeRenderer ディスパッチ・ZoneRenderer パターンの既存実装が強い裏付けとなっている。web-ifc API ドキュメント（Context7）で `IfcAPI.Init()`, `OpenModel()`, `StreamAllMeshes()`, `GetGeometry()`, `GetAllLines()`, `FlatMesh`, `PlacedGeometry` の型・シグネチャを確認済み。
