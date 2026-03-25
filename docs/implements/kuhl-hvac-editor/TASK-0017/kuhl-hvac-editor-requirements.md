# TASK-0017: IFC読込UI・ファイルアップロード 要件定義書

**タスクID**: TASK-0017
**機能名**: kuhl-hvac-editor
**要件名**: IFC読込UI・ファイルアップロード
**作成日**: 2026-03-25
**信頼性評価**: 高品質（TASK-0016のifc-import.ts実装済みを前提とするUI層タスク）

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🔵 **何をする機能か**: IFCファイルのアップロードUI（ドラッグ&ドロップ + ファイル選択ボタン）を提供し、ファイルサイズ検証（100MB以下）、web-ifcパース進捗表示、Level情報の自動取得・反映、Supabase Storageへの保存を行うフロントエンドコンポーネントである。
- 🔵 **どのような問題を解決するか**: TASK-0016で実装されたifc-import.ts（パースロジック）をユーザーが利用するためのUIが存在しない。本タスクにより、設計者がIFCファイルをブラウザ上で直感的にアップロードし、建築躯体の参照表示とLevel情報の自動反映を受けられるようになる。
- 🔵 **想定されるユーザー**: 社内の空調設備設計担当者。建築設計者からIFCファイルを受領し、Kuhl Editorにアップロードして空調設計の参照データとする。
- 🔵 **システム内での位置づけ**: `apps/kuhl-editor/components/panels/ifc-upload-panel.tsx` に配置。Editor層（apps/kuhl-editor）のUIコンポーネントとして、TASK-0016で実装済みの `@kuhl/core` のifc-import関数群（`initIfcApi`, `parseIfcFile`, `createArchitectureRefNodeData`, `isValidIfcBuffer`）を呼び出す。Viewer Isolation原則に準拠し、`@kuhl/viewer` には配置しない。
- **参照したEARS要件**: REQ-106, REQ-107, REQ-108, NFR-003, EDGE-001
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - モノレポ構成; `docs/design/kuhl-hvac-editor/dataflow.md` - IFC読込フロー; `docs/design/kuhl-hvac-editor/api-endpoints.md` - IFCファイル管理API

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 IfcUploadPanel コンポーネント

- 🔵 **ファイルパス**: `apps/kuhl-editor/components/panels/ifc-upload-panel.tsx`
- 🔵 **テストファイルパス**: `apps/kuhl-editor/__tests__/components/panels/ifc-upload-panel.test.tsx`

#### 2.1.1 Props定義

- 🔵 **型定義**:

  ```typescript
  export interface IfcUploadPanelProps {
    onUploadStart?: () => void
    onUploadSuccess?: (archRefId: string) => void
    onUploadError?: (error: Error) => void
  }
  ```

- 🔵 **onUploadStart**: アップロード処理開始時に呼び出されるコールバック（任意）
- 🔵 **onUploadSuccess**: パース成功・ArchitectureRefNode作成完了時に、作成されたノードIDを引数に呼び出されるコールバック（任意）
- 🔵 **onUploadError**: エラー発生時に Error オブジェクトを引数に呼び出されるコールバック（任意）

#### 2.1.2 内部状態（useState）

- 🔵 **uploadState**: アップロード状態を管理する

  ```typescript
  type UploadState =
    | { status: 'idle' }
    | { status: 'validating' }
    | { status: 'parsing'; progress: number }   // progress: 0-100
    | { status: 'uploading' }                     // Supabase Storage アップロード中
    | { status: 'success'; archRefId: string }
    | { status: 'error'; message: string }
  ```

- 🔵 **isDragOver**: ドラッグオーバー状態（boolean）。ドロップゾーンのスタイル切替に使用。

#### 2.1.3 責務一覧

| # | 責務 | 信頼性 | 参照要件 |
|---|------|--------|----------|
| R-01 | ドラッグ&ドロップ UI（onDragEnter/Over/Leave/Drop） | 🔵 | TASK-0017.md §1 |
| R-02 | ファイル選択ボタン（input[type=file] .ifc） | 🔵 | TASK-0017.md §1 |
| R-03 | ファイルサイズ検証（100MB以下、NFR-003） | 🔵 | NFR-003 |
| R-04 | IFCバッファ検証（isValidIfcBuffer） | 🔵 | EDGE-001 |
| R-05 | web-ifc パース（initIfcApi + parseIfcFile） | 🔵 | REQ-107 |
| R-06 | ArchitectureRefNode 作成（useScene.createNode） | 🔵 | REQ-106 |
| R-07 | Level情報自動取得・反映（updateNode） | 🟡 | REQ-108 |
| R-08 | プログレスバー表示（パース進捗） | 🟡 | TASK-0017.md §2 |
| R-09 | エラーメッセージ表示 | 🔵 | EDGE-001 |
| R-10 | Supabase Storage アップロード | 🟡 | api-endpoints.md Storage仕様 |
| R-11 | Supabase メタデータ登録（kuhl_ifc_files） | 🟡 | api-endpoints.md |

- **参照したEARS要件**: REQ-106, REQ-107, REQ-108, NFR-003, EDGE-001
- **参照した設計文書**: `docs/spec/kuhl-hvac-editor/note.md` - TASK-0017 コンテキスト; `docs/design/kuhl-hvac-editor/api-endpoints.md` - IFCファイル管理

---

### 2.2 ドラッグ&ドロップ・ファイル選択UI

#### 2.2.1 ドロップゾーン

- 🔵 **HTML構造**: `<div>` 要素にドラッグ&ドロップイベントハンドラを設定
- 🔵 **イベントハンドラ**:
  - `onDragEnter`: `isDragOver = true` に設定。`e.preventDefault()` 呼び出し。
  - `onDragOver`: `e.preventDefault()` 呼び出し（ドロップを許可するため必須）。
  - `onDragLeave`: `isDragOver = false` に設定。
  - `onDrop`: `e.preventDefault()`、`isDragOver = false`。`e.dataTransfer.files[0]` を取得してファイル処理を開始。
- 🔵 **ドロップゾーンスタイル**:
  - **通常時**: 点線ボーダー、アイコン + テキスト（「IFCファイルをドロップ」等）
  - **ドラッグオーバー時**（`isDragOver === true`）: ボーダー色をハイライト、背景色を変更
  - **処理中**（`status !== 'idle'`）: ドロップ無効化（pointer-events: none）

#### 2.2.2 ファイル選択ボタン

- 🔵 **実装**: 非表示の `<input type="file" accept=".ifc" />` + ボタンクリックで `inputRef.click()` を呼び出す
- 🔵 **accept属性**: `.ifc` のみ（IFCファイルに限定）
- 🔵 **onChange**: 選択されたファイルで処理を開始

#### 2.2.3 ファイル拡張子検証

- 🔵 **対象拡張子**: `.ifc`（大文字・小文字不問）
- 🔵 **拒否時**: エラーメッセージ「IFCファイル（.ifc）のみアップロード可能です」

- **参照した設計文書**: `docs/design/kuhl-hvac-editor/dataflow.md` - IFC読込フロー §1

---

### 2.3 ファイルサイズ検証

- 🔵 **上限値**: 100MB（104,857,600バイト）
- 🔵 **定数定義**: `const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024` （テスト容易性のためエクスポート）
- 🔵 **検証タイミング**: ファイル取得直後（パース処理の前）
- 🔵 **超過時の動作**:
  - `uploadState` を `{ status: 'error', message: 'ファイルサイズが100MBを超えています（{actualMB}MB）' }` に設定
  - `onUploadError` コールバック呼び出し
  - パース処理は開始しない
- 🔵 **100MB以下**: 次のステップ（IFCバッファ検証）に進む

- **参照したEARS要件**: NFR-003
- **参照した設計文書**: `docs/spec/kuhl-hvac-editor/requirements.md` - NFR-003

---

### 2.4 IFCバッファ検証

- 🔵 **使用関数**: `isValidIfcBuffer(buffer: Uint8Array)` （TASK-0016 実装済み、`@kuhl/core` からインポート）
- 🔵 **検証タイミング**: ファイルサイズ検証通過後、`File.arrayBuffer()` でバッファ取得後
- 🔵 **無効時の動作**:
  - `uploadState` を `{ status: 'error', message: '有効なIFCファイルではありません' }` に設定
  - `onUploadError` コールバック呼び出し
- 🔵 **有効時**: 次のステップ（web-ifcパース）に進む

- **参照したEARS要件**: EDGE-001
- **参照した設計文書**: `packages/kuhl-core/src/systems/ifc/ifc-import.ts` - isValidIfcBuffer

---

### 2.5 web-ifc パース処理

- 🔵 **使用関数**: `initIfcApi(wasmPath?)` + `parseIfcFile(ifcApi, buffer)` （TASK-0016 実装済み）
- 🔵 **処理フロー**:
  1. `uploadState` を `{ status: 'parsing', progress: 0 }` に設定
  2. `onUploadStart` コールバック呼び出し
  3. `initIfcApi()` で web-ifc WASM を初期化
  4. `uploadState.progress` を 30 に更新（初期化完了）
  5. `parseIfcFile(ifcApi, buffer)` でパース実行
  6. `uploadState.progress` を 70 に更新（パース完了）
  7. `createArchitectureRefNodeData(fileName, parseResult)` でノードデータ構築
  8. `uploadState.progress` を 90 に更新（ノードデータ構築完了）

- 🟡 **進捗表示の実装方針**: web-ifc の `parseIfcFile` は同期的にストリーミングコールバックを呼び出すため、リアルタイムの進捗更新は困難。段階的なマイルストーン進捗（0→30→70→90→100）を表示する方式を採用する。将来のWorker化で真のプログレスが可能になる。

- 🔵 **エラーハンドリング**:
  - `initIfcApi()` 失敗時: `IfcInitError` → `{ status: 'error', message: 'WASMの初期化に失敗しました' }`
  - `parseIfcFile()` 失敗時: `{ status: 'error', message: 'IFCファイルのパースに失敗しました' }`
  - 部分エラー（`parseResult.errors.length > 0`）: パース自体は成功扱いとし、警告として表示

- **参照したEARS要件**: REQ-107, EDGE-001
- **参照した設計文書**: `packages/kuhl-core/src/systems/ifc/ifc-import.ts` - initIfcApi, parseIfcFile

---

### 2.6 ArchitectureRefNode 作成・Level情報反映

#### 2.6.1 ArchitectureRefNode 作成

- 🔵 **使用関数**: `createArchitectureRefNodeData()` （TASK-0016 実装済み）
- 🔵 **ノード作成フロー**:
  1. `createArchitectureRefNodeData(fileName, parseResult)` でノードデータ構築
  2. `ArchitectureRefNode.parse(nodeData)` でZodバリデーション・ノード生成
  3. `useScene.getState().createNode(archNode, buildingId)` でシーンストアに追加
  4. Building の直下に配置（ノード階層: Building → ArchitectureRef）

- 🔵 **buildingId の取得**: 現在のシーンから Building ノードを検索。存在しない場合は事前にデフォルト階層（Plant → Building → Level）を作成する。

  ```typescript
  // 既存の Building を検索
  const nodes = useScene.getState().nodes
  const buildingNode = Object.values(nodes).find(n => n.type === 'building')
  ```

#### 2.6.2 Level情報自動取得・反映

- 🟡 **条件**: `parseResult.storeys.length > 0` の場合のみ実行（REQ-108: 条件付き要件）
- 🟡 **処理フロー**:
  1. `parseResult.storeys` から各ストーリーの `name` と `elevation` を取得
  2. 既存の LevelNode と名前でマッチング、または新規 LevelNode を作成
  3. マッチした LevelNode の `elevation` フィールドを更新

  ```typescript
  for (const storey of parseResult.storeys) {
    if (storey.elevation !== null) {
      // 既存Levelの elevation を更新
      useScene.getState().updateNode(levelId, {
        elevation: storey.elevation
      })
    }
  }
  ```

- 🟡 **Level マッチング戦略**:
  - 既存 LevelNode のリストと storey.name で文字列マッチング
  - マッチしない場合は新規 LevelNode を Building の子として作成
  - 詳細なマッピングロジックは TASK-0020 で検証予定（本タスクでは基本実装）

- **参照したEARS要件**: REQ-106, REQ-108
- **参照した設計文書**: `packages/kuhl-core/src/schema/nodes/architecture-ref.ts`; `packages/kuhl-core/src/schema/nodes/level.ts`

---

### 2.7 Supabase Storage アップロード

- 🟡 **アップロード先バケット**: `kuhl-ifc-files`
- 🟡 **ストレージパス**: `kuhl-ifc-files/{projectId}/{fileName}`
- 🟡 **アップロードタイミング**: パース成功後（ArchitectureRefNode 作成完了後）
- 🟡 **処理フロー**:
  1. `uploadState` を `{ status: 'uploading' }` に設定
  2. Supabase Storage クライアントで `upload(storagePath, file)` を呼び出し
  3. 成功時: `kuhl_ifc_files` テーブルにメタデータ登録

     ```typescript
     {
       project_id: projectId,
       file_name: file.name,
       file_size: file.size,
       storage_path: storagePath,
       ifc_version: detectIfcVersion(buffer),  // 'IFC2X3' or 'IFC4'（推測）
       level_count: parseResult.storeys.length
     }
     ```

  4. 失敗時: ローカルのシーンデータ（ArchitectureRefNode）は維持。Storageアップロードエラーは警告として表示（パース結果は失われない）。

- 🟡 **IFCバージョン検出**: バッファの先頭テキストから `FILE_SCHEMA` を解析して `IFC2X3` / `IFC4` を検出する補助関数。検出不可の場合は `null`。

- 🟡 **Supabaseクライアント依存**: `createClient()` または既存のSupabaseクライアントインスタンスを使用。認証済みセッションのJWTトークンが必要。

- **参照した設計文書**: `docs/design/kuhl-hvac-editor/api-endpoints.md` - IFCファイル管理; `docs/design/kuhl-hvac-editor/database-schema.sql` - kuhl_ifc_files テーブル

---

### 2.8 プログレスバー表示

- 🟡 **表示タイミング**: `uploadState.status` が `'validating'`, `'parsing'`, `'uploading'` の間
- 🟡 **進捗値マッピング**:

  | status | progress | 表示テキスト |
  |--------|----------|------------|
  | `validating` | 10% | ファイルを検証中... |
  | `parsing` (progress=0) | 20% | WASM初期化中... |
  | `parsing` (progress=30) | 40% | IFCファイルをパース中... |
  | `parsing` (progress=70) | 70% | ジオメトリ抽出完了 |
  | `parsing` (progress=90) | 85% | ノード作成中... |
  | `uploading` | 95% | Storageにアップロード中... |
  | `success` | 100% | アップロード完了 |

- 🟡 **UIコンポーネント**: Tailwind CSS でスタイリングされたプログレスバー。`@repo/ui` の共有コンポーネント、または `div` ベースのカスタム実装。

- **参照した設計文書**: TASK-0017.md §2 - パース進捗表示

---

### 2.9 成功・エラーUI

#### 2.9.1 成功時

- 🔵 **表示内容**:
  - 「IFCファイルの読込が完了しました」メッセージ
  - パースされたジオメトリ数
  - 検出されたLevel（storey）数
  - パース警告がある場合はその一覧
- 🔵 **コールバック**: `onUploadSuccess(archRefId)` 呼び出し

#### 2.9.2 エラー時

- 🔵 **表示内容**: エラーメッセージ（ファイルサイズ超過、無効なIFC、パース失敗、WASM初期化失敗 等）
- 🔵 **リトライ**: エラー表示後に「再試行」ボタンで `uploadState` を `idle` にリセット
- 🔵 **コールバック**: `onUploadError(error)` 呼び出し

- **参照したEARS要件**: EDGE-001

---

## 3. テスト可能な純粋関数・ロジックの分離

TASK-0017 は主にUIコンポーネントだが、テスト可能性を高めるためにロジックを分離する。

### 3.1 validateIfcFile（新規純粋関数）

- 🔵 **シグネチャ**: `validateIfcFile(file: File): { valid: true } | { valid: false; error: string }`
- 🔵 **処理**:
  1. ファイル拡張子が `.ifc` であることを確認
  2. ファイルサイズが `MAX_FILE_SIZE_BYTES`（100MB）以下であることを確認
  3. 検証通過時は `{ valid: true }` を返す
  4. 失敗時は `{ valid: false, error: '...' }` を返す
- 🔵 **テスト対応**: File APIのモック不要（File オブジェクトの name と size のみ参照）

### 3.2 MAX_FILE_SIZE_BYTES（定数）

- 🔵 **定数定義**: `export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024`
- 🔵 **用途**: ファイルサイズ検証の上限値。テストで参照可能。

### 3.3 formatFileSize（新規純粋関数）

- 🔵 **シグネチャ**: `formatFileSize(bytes: number): string`
- 🔵 **処理**: バイト数を人間可読な文字列に変換（例: `52428800` → `"50.0MB"`）
- 🔵 **用途**: エラーメッセージのファイルサイズ表示

### 3.4 detectIfcVersion（新規純粋関数）

- 🟡 **シグネチャ**: `detectIfcVersion(buffer: Uint8Array): 'IFC2X3' | 'IFC4' | null`
- 🟡 **処理**: バッファの先頭部分をテキストデコードし、`FILE_SCHEMA` セクションから IFC バージョンを検出
- 🟡 **用途**: Supabase メタデータ登録時の `ifc_version` フィールド

### 3.5 processIfcUpload（新規非同期関数）

- 🔵 **シグネチャ**:

  ```typescript
  export async function processIfcUpload(
    file: File,
    options: {
      onProgress?: (progress: number, message: string) => void
      wasmPath?: string
    }
  ): Promise<{
    archNodeData: ReturnType<typeof createArchitectureRefNodeData>
    parseResult: IfcParseResult
    buffer: Uint8Array
  }>
  ```

- 🔵 **処理**: ファイル検証 → バッファ変換 → IFC検証 → WASM初期化 → パース → ノードデータ構築のフルフローを実行
- 🔵 **テスト対応**: UIコンポーネントから分離されたロジック関数。web-ifc のモックが必要だが、UIレンダリングのモックは不要。

### 3.6 実装ファイル

- 🔵 **ロジック関数ファイル**: `apps/kuhl-editor/components/panels/ifc-upload-panel.tsx` 内、またはユーティリティとして `apps/kuhl-editor/lib/ifc-upload-utils.ts` に分離
- 🔵 **テストファイル**: `apps/kuhl-editor/__tests__/components/panels/ifc-upload-panel.test.tsx`

- **参照した設計文書**: TASK-0016 要件定義書 §3 - テスト可能な純粋関数の分離パターン

---

## 4. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 4.1 パッケージ配置原則

- 🔵 **Editor層（`apps/kuhl-editor`）**: IfcUploadPanel は Editor 層に配置。UI コンポーネントであり、ユーザー操作を受けてシーンストアを変更する。
- 🔵 **Viewer Isolation**: `@kuhl/viewer` には配置しない。IfcUploadPanel は Editor 固有のUI機能であり、read-only Viewer コンテキストでは不要。
- 🔵 **Core層依存**: `@kuhl/core` の ifc-import 関数群（`initIfcApi`, `parseIfcFile`, `createArchitectureRefNodeData`, `isValidIfcBuffer`）をインポートして使用する。
- 🔵 **Core層依存**: `@kuhl/core` の useScene ストアからノードCRUD操作（`createNode`, `updateNode`）を呼び出す。

### 4.2 ファイルサイズ制限

- 🔵 **上限**: 100MB（NFR-003）
- 🔵 **クライアントサイド検証**: ファイルサイズチェックはブラウザ側で即座に実行。サーバー側の Supabase Storage にも制限があるが、クライアントで先に弾く。

### 4.3 web-ifc WASM 配置

- 🟡 **WASMファイル**: `apps/kuhl-editor/public/wasm/web-ifc.wasm` に配置済み（TASK-0016 前提）
- 🟡 **パス**: `initIfcApi('/wasm/')` でデフォルトパスを指定

### 4.4 メインスレッド処理

- 🟡 **現行方針**: パース処理はメインスレッドで実行される。大きなIFCファイル（数十MB）の場合、UIがブロックする可能性がある。
- 🟡 **対策**: パース中はプログレスバーを表示し、ユーザーに処理中であることを示す。ドロップゾーンは無効化してインタラクションを防ぐ。
- 🟡 **将来対応**: Web Worker 化は別タスクのスコープ。

### 4.5 Supabase Storage アクセス

- 🟡 **認証**: 認証済みセッションが必要。未認証状態ではアップロード不可。
- 🟡 **バケット**: `kuhl-ifc-files`。RLSポリシーによりユーザーのプロジェクトに紐づくファイルのみアクセス可能。
- 🟡 **DB未構築時の対応**: TASK-0029（DB設定・Drizzleスキーマ・マイグレーション）が未完了の場合、Supabase Storage アップロードとメタデータ登録は失敗する可能性がある。本タスクではローカルパース・シーンストア保存を主機能とし、Storage アップロードはオプショナルとする。

### 4.6 テスト要件

- 🔵 **カバレッジ**: 60% 以上
- 🔵 **純粋関数テスト**: `validateIfcFile`, `formatFileSize`, `MAX_FILE_SIZE_BYTES` は jsdom 環境でモック不要でテスト可能
- 🟡 **コンポーネントテスト**: IfcUploadPanel は React Testing Library でレンダリング・イベント発火・状態変化をテスト。web-ifc 関数群はモックする。
- 🟡 **Supabase テスト**: Supabase クライアントはモックする。実際のネットワークアクセスはテストしない。

### 4.7 UI 言語

- 🔵 **日本語**: メッセージ・ラベルはすべて日本語で表示（NFR-201: 社内ツール）

- **参照したEARS要件**: REQ-009, NFR-003, NFR-201
- **参照した設計文書**: CLAUDE.md - Viewer Isolation; `docs/design/kuhl-hvac-editor/architecture.md` - パッケージ配置

---

## 5. 想定される使用例（EARS Edgeケース・データフローベース）

### 5.1 基本的な使用パターン

- 🔵 **UC-01: ドラッグ&ドロップでIFCファイルをアップロード**
  1. ユーザーがIFCファイルをブラウザのドロップゾーンにドラッグする
  2. ドロップゾーンがハイライト表示される（isDragOver）
  3. ユーザーがファイルをドロップする
  4. ファイルサイズ検証 → IFCバッファ検証 → パース処理が開始される
  5. プログレスバーが進捗を表示する
  6. パース完了後、ArchitectureRefNode が作成され3Dビューに建築躯体が表示される
  7. Level情報（storeys）が自動的に反映される
  8. 成功メッセージが表示される

- 🔵 **UC-02: ファイル選択ボタンでアップロード**
  1. ユーザーが「ファイルを選択」ボタンをクリックする
  2. ファイル選択ダイアログが表示される（.ifc のみ）
  3. ユーザーがIFCファイルを選択する
  4. UC-01 のステップ4以降と同じフロー

- 🔵 **UC-03: 100MB超のファイルを拒否**
  1. ユーザーが100MBを超えるIFCファイルをアップロードしようとする
  2. ファイルサイズ検証で拒否される
  3. エラーメッセージ「ファイルサイズが100MBを超えています（XXX.XMB）」が表示される
  4. パース処理は開始されない

### 5.2 データフロー

- 🔵 **完全なアップロードフロー**:

  ```
  ユーザー操作（D&D or ファイル選択）
    → File オブジェクト取得
    → validateIfcFile(file) — 拡張子・サイズ検証
    → file.arrayBuffer() → Uint8Array
    → isValidIfcBuffer(buffer) — IFCヘッダー検証
    → initIfcApi('/wasm/') — WASM初期化
    → parseIfcFile(ifcApi, buffer) — IFCパース
    → createArchitectureRefNodeData(fileName, result) — ノードデータ構築
    → ArchitectureRefNode.parse(nodeData) — Zodバリデーション
    → useScene.createNode(archNode, buildingId) — シーンストア追加
    → Level情報反映 — updateNode(levelId, { elevation })
    → Supabase Storage upload — ファイルアップロード（オプション）
    → kuhl_ifc_files INSERT — メタデータ登録（オプション）
    → onUploadSuccess(archRefId) — 成功コールバック
  ```

### 5.3 エッジケース

- 🔵 **EDGE-001: 不正なIFCファイル**
  - `isValidIfcBuffer()` が `false` を返す場合
  - エラーメッセージ「有効なIFCファイルではありません」を表示
  - パース処理は開始しない

- 🔵 **EDGE-002: 100MB超のファイル**
  - `file.size > MAX_FILE_SIZE_BYTES` の場合
  - エラーメッセージを表示しパース処理を開始しない

- 🟡 **EDGE-003: パース中のエラー（部分読込）**
  - `parseResult.errors.length > 0` だが `parseResult.geometries.length > 0` の場合
  - パース成功として扱い、ArchitectureRefNode を作成する
  - 警告メッセージとして errors の一覧を表示する

- 🟡 **EDGE-004: WASM初期化失敗**
  - `initIfcApi()` が例外をスローした場合
  - エラーメッセージ「WASMの初期化に失敗しました。ページを再読み込みしてください。」を表示

- 🟡 **EDGE-005: Supabase Storage アップロード失敗**
  - ネットワークエラーまたは認証エラー
  - ローカルのシーンデータ（ArchitectureRefNode）は維持される
  - 警告メッセージ「Storageへのアップロードに失敗しました。ローカルデータは保存されています。」を表示

- 🔵 **EDGE-006: ジオメトリが空のIFCファイル**
  - `parseResult.geometries.length === 0` の場合
  - 成功扱いだが、メッセージ「建築躯体のジオメトリが検出されませんでした」を表示
  - ArchitectureRefNode は作成されるが geometryData が空

- 🔵 **EDGE-007: Storeyが存在しないIFCファイル**
  - `parseResult.storeys.length === 0` の場合
  - Level情報の反映をスキップ
  - 情報メッセージ「階情報が検出されませんでした」を表示

- 🔵 **EDGE-008: 複数ファイルのドロップ**
  - `e.dataTransfer.files.length > 1` の場合
  - 最初の `.ifc` ファイルのみ処理する（またはエラー「1ファイルずつアップロードしてください」）

- 🔵 **EDGE-009: 処理中に再度ファイルをドロップ**
  - `uploadState.status` が `'idle'` 以外の場合
  - ドロップを無視する（処理中表示のため）

- **参照したEARS要件**: EDGE-001, NFR-003
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/dataflow.md` - エラーハンドリングフロー

---

## 6. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- 空調設備設計者が建築設計者から受領したIFCファイルを、ブラウザのUIからアップロードし、建築躯体を3Dビューに表示するストーリー

### 参照した機能要件

- **REQ-106**: IFC建築躯体ファイルを読み込み、壁・床・梁・柱・天井を表示 🔵
- **REQ-107**: IFC読込はweb-ifc（WASM）を使用し、ブラウザ内でパース 🔵
- **REQ-108**: IFC読込時に階高・天井高を自動取得できる場合、Level情報に反映（条件付き）🟡

### 参照した非機能要件

- **NFR-003**: IFCファイルの読込は100MB以下のファイルに対応 🔵
- **NFR-201**: UIは日本語で提供 🔵
- **NFR-302**: IFC 2x3 および IFC 4 形式の読込に対応 🟡

### 参照したEdgeケース

- **EDGE-001**: IFCファイルが不正またはパース不可能な場合、エラーメッセージ表示 🔵

### 参照した受け入れ基準（TASK-0017 完了条件）

- [ ] IFCファイルのアップロードUIが動作する
- [ ] 100MB超のファイルが拒否される
- [ ] パース成功時にLevel情報が更新される
- [ ] テスト60%以上カバレッジ

### 参照した設計文書

- **タスク定義**: `docs/tasks/kuhl-hvac-editor/TASK-0017.md`
- **要件定義書**: `docs/spec/kuhl-hvac-editor/requirements.md` - REQ-106, REQ-107, REQ-108, NFR-003
- **アーキテクチャ**: `docs/design/kuhl-hvac-editor/architecture.md` - モノレポ構成、パッケージ依存関係
- **API仕様**: `docs/design/kuhl-hvac-editor/api-endpoints.md` - IFCファイル管理（Storage + メタデータ）
- **データフロー**: `docs/design/kuhl-hvac-editor/dataflow.md` - IFC読込フロー
- **DBスキーマ**: `docs/design/kuhl-hvac-editor/database-schema.sql` - kuhl_ifc_files テーブル
- **コンテキストノート**: `docs/spec/kuhl-hvac-editor/note.md` - TASK-0017 コンテキスト
- **TASK-0016 実装**: `packages/kuhl-core/src/systems/ifc/ifc-import.ts` - ifc-import関数群（前提タスク）
- **ArchitectureRefNode**: `packages/kuhl-core/src/schema/nodes/architecture-ref.ts`
- **LevelNode**: `packages/kuhl-core/src/schema/nodes/level.ts`
- **useScene**: `packages/kuhl-core/src/store/use-scene.ts` - createNode, updateNode API

---

## 7. 実装ファイル一覧

| ファイルパス | 種別 | 説明 |
|-------------|------|------|
| `apps/kuhl-editor/components/panels/ifc-upload-panel.tsx` | 新規作成 | IFCアップロードUIコンポーネント（ドラッグ&ドロップ、ファイル選択、プログレス、エラー表示） |
| `apps/kuhl-editor/__tests__/components/panels/ifc-upload-panel.test.tsx` | 新規作成 | IfcUploadPanel コンポーネント・ロジックテスト |

---

## 8. 信頼性レベルサマリー

| セクション | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|-----------|-------|-------|-------|------|
| 1. 機能の概要 | 4 | 0 | 0 | 4 |
| 2. 入出力の仕様 | 30 | 11 | 0 | 41 |
| 3. 純粋関数の分離 | 9 | 1 | 0 | 10 |
| 4. 制約条件 | 7 | 7 | 0 | 14 |
| 5. 想定される使用例 | 9 | 4 | 0 | 13 |
| **合計** | **59** | **23** | **0** | **82** |

### 全体評価

- **総項目数**: 82項目
- 🔵 **青信号**: 59項目 (72%)
- 🟡 **黄信号**: 23項目 (28%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 高品質 -- 黄信号は主にプログレスバーの進捗表示方式（web-ifcの同期的なコールバックによるリアルタイム進捗の制約）、Supabase Storage連携（TASK-0029のDB未構築時のフォールバック）、Level情報マッチング戦略（TASK-0020で検証予定の詳細ロジック）に起因する。TASK-0016で実装済みのifc-import関数群が強い基盤となっており、UI層の実装はその上に構築する形で明確に定義されている。赤信号なし。
