# Redフェーズ記録: TASK-0017 IFC読込UI・ファイルアップロード

**タスクID**: TASK-0017
**機能名**: kuhl-hvac-editor
**フェーズ**: Red
**作成日**: 2026-03-25

---

## 作成したテストケース一覧

| TC-ID | テスト名 | カテゴリ | 信頼性 |
|-------|---------|---------|--------|
| TC-001 | 有効な.ifcファイル（50MB）で { valid: true } を返す | validateIfcFile 正常系 | 🔵 |
| TC-002 | 大文字拡張子.IFCで { valid: true } を返す | validateIfcFile 正常系 | 🔵 |
| TC-003 | 混在ケース.Ifcで { valid: true } を返す | validateIfcFile 正常系 | 🔵 |
| TC-004 | 非IFC拡張子（.obj）でエラーを返す | validateIfcFile 異常系 | 🔵 |
| TC-005 | 非IFC拡張子（.step）でエラーを返す | validateIfcFile 異常系 | 🔵 |
| TC-006 | 100MB超のファイル（150MB）でサイズエラーを返す | validateIfcFile 異常系 | 🔵 |
| TC-007 | 拡張子なしファイルでエラーを返す | validateIfcFile 異常系 | 🔵 |
| TC-008 | ちょうど100MB（境界値）で { valid: true } を返す | validateIfcFile 境界値 | 🔵 |
| TC-009 | 100MB+1バイト（境界超過）でエラーを返す | validateIfcFile 境界値 | 🔵 |
| TC-010 | 0バイトファイルで { valid: true } を返す | validateIfcFile 境界値 | 🔵 |
| TC-011 | 500バイト → "500B" | formatFileSize 正常系 | 🔵 |
| TC-012 | 1024バイト → "1.0KB" | formatFileSize 正常系 | 🔵 |
| TC-013 | 50MB → "50.0MB" | formatFileSize 正常系 | 🔵 |
| TC-014 | 100MB → "100.0MB" | formatFileSize 正常系 | 🔵 |
| TC-015 | 1GB → "1.0GB" | formatFileSize 正常系 | 🔵 |
| TC-016 | 0バイト → "0B" | formatFileSize 境界値 | 🔵 |
| TC-017 | 1023バイト（KB未満）→ "1023B" | formatFileSize 境界値 | 🔵 |
| TC-018 | 1.5MB → "1.5MB" | formatFileSize 境界値 | 🔵 |
| TC-019 | IFC2X3バッファで 'IFC2X3' を返す | detectIfcVersion 正常系 | 🟡 |
| TC-020 | IFC4バッファで 'IFC4' を返す | detectIfcVersion 正常系 | 🟡 |
| TC-021 | IFC4X1バッファで 'IFC4' を返す（IFC4系として検出） | detectIfcVersion 正常系 | 🟡 |
| TC-022 | FILE_SCHEMAが無いバッファで null を返す | detectIfcVersion 異常系 | 🟡 |
| TC-023 | 空バッファで null を返す | detectIfcVersion 異常系 | 🟡 |
| TC-024 | 不明なスキーマで null を返す | detectIfcVersion 異常系 | 🟡 |
| TC-025 | 定数値が100MB（104857600バイト）であること | MAX_FILE_SIZE_BYTES | 🔵 |
| TC-026 | 有効なIFCファイルの完全処理フローで archNodeData, parseResult, buffer を返す | processIfcUpload 正常系 | 🔵 |
| TC-027 | onProgressコールバックが複数回呼ばれ進捗値が単調増加する | processIfcUpload 正常系 | 🔵 |
| TC-028 | 非IFCファイルでエラーをスローする | processIfcUpload 異常系 | 🔵 |
| TC-029 | IFCバッファ検証失敗でエラーをスローする | processIfcUpload 異常系 | 🔵 |
| TC-030 | WASM初期化失敗でエラーをスローする | processIfcUpload 異常系 | 🟡 |
| TC-031 | パース失敗でエラーをスローする | processIfcUpload 異常系 | 🟡 |
| TC-032 | ジオメトリ空のIFCで正常完了し geometryData が空配列 | processIfcUpload エッジ | 🔵 |
| TC-033 | ストーリー無しのIFCで正常完了し levelMapping が undefined | processIfcUpload エッジ | 🔵 |
| TC-034 | 部分エラー有りのパース結果で正常完了（成功扱い） | processIfcUpload エッジ | 🟡 |

**合計**: 34テストケース（🔵 24件、🟡 10件）

---

## テストファイル

`apps/kuhl-editor/__tests__/components/panels/ifc-upload-panel.test.tsx`

（既存ファイルをそのまま使用 - テスト内容は TASK-0017 テストケース定義書に完全準拠）

---

## スタブファイル

`apps/kuhl-editor/components/panels/ifc-upload-panel.tsx`

全エクスポート（`validateIfcFile`, `formatFileSize`, `detectIfcVersion`, `processIfcUpload`, `MAX_FILE_SIZE_BYTES`）が `throw new Error('...は未実装です')` または不正な値を返すスタブとして実装済み。

---

## テスト実行結果（Redフェーズ確認済み）

```
Test Files  1 failed (1)
Tests       34 failed (34)
Start at    10:15:xx
```

全34テストが「○○は未実装です」エラーで失敗していることを確認済み。

### 期待される失敗メッセージ例

- `validateIfcFile は未実装です`
- `formatFileSize は未実装です`
- `detectIfcVersion は未実装です`
- `processIfcUpload は未実装です`
- `MAX_FILE_SIZE_BYTES` が `0`（期待値は `104857600`）

---

## Greenフェーズで実装すべき内容

### 1. `MAX_FILE_SIZE_BYTES` 定数

```typescript
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024 // 104857600
```

### 2. `validateIfcFile(file: File): IfcValidationOutcome`

- 拡張子チェック（`.ifc` 大文字小文字不問）
- サイズチェック（100MB以下）
- 拡張子エラー: `'IFCファイル（.ifc）のみアップロード可能です'`
- サイズエラー: `'ファイルサイズが100MBを超えています（{actualMB}MB）'`

### 3. `formatFileSize(bytes: number): string`

- 0-1023B → `{n}B`
- 1024B-1023KB → `{n.1}KB`
- 1024KB-1023MB → `{n.1}MB`
- 1024MB以上 → `{n.1}GB`

### 4. `detectIfcVersion(buffer: Uint8Array): string | null`

- バッファを先頭部分をテキストデコードして `FILE_SCHEMA(('IFC2X3'))` 等を正規表現マッチ
- `IFC2X3` → `'IFC2X3'`
- `IFC4`, `IFC4X*` → `'IFC4'`
- マッチなし → `null`

### 5. `processIfcUpload(file: File, options: ProcessIfcUploadOptions): Promise<ProcessIfcUploadResult>`

- `validateIfcFile(file)` でファイル検証（失敗時スロー）
- `file.arrayBuffer()` でバッファ取得
- `isValidIfcBuffer(buffer)` で IFC 検証（失敗時スロー）
- `onProgress(0, ...)` 呼び出し
- `initIfcApi()` で WASM 初期化（失敗時 `'WASMの初期化に失敗しました'` をスロー）
- `onProgress(30, ...)` 呼び出し
- `parseIfcFile(ifcApi, buffer)` でパース（失敗時 `'IFCファイルのパースに失敗しました'` をスロー）
- `onProgress(70, ...)` 呼び出し
- `createArchitectureRefNodeData(file.name, parseResult)` でノードデータ構築
- `onProgress(90, ...)` 呼び出し
- `{ archNodeData, parseResult, buffer }` を返す
