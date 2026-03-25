# TASK-0017: IFC読込UI・ファイルアップロード テストケース一覧

**タスクID**: TASK-0017
**機能名**: kuhl-hvac-editor
**要件名**: IFC読込UI・ファイルアップロード
**作成日**: 2026-03-25
**テストファイル**: `apps/kuhl-editor/__tests__/components/panels/ifc-upload-panel.test.tsx`

---

## テスト対象関数一覧

| # | 関数名 | 種別 | ファイル |
|---|--------|------|---------|
| 1 | `validateIfcFile` | 純粋関数 | `ifc-upload-panel.tsx` |
| 2 | `formatFileSize` | 純粋関数 | `ifc-upload-panel.tsx` |
| 3 | `detectIfcVersion` | 純粋関数 | `ifc-upload-panel.tsx` |
| 4 | `processIfcUpload` | 非同期関数 | `ifc-upload-panel.tsx` |
| 5 | `MAX_FILE_SIZE_BYTES` | 定数 | `ifc-upload-panel.tsx` |

---

## 1. validateIfcFile テストケース

### 1.1 正常系

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-001 | 有効な.ifcファイル（サイズ50MB） | `File('test.ifc', 50MB)` | `{ valid: true }` | 🔵 | NFR-003 |
| TC-002 | 有効な.IFCファイル（大文字拡張子） | `File('test.IFC', 1MB)` | `{ valid: true }` | 🔵 | §2.2.3 |
| TC-003 | 有効な.Ifc ファイル（混在ケース） | `File('model.Ifc', 10MB)` | `{ valid: true }` | 🔵 | §2.2.3 |

### 1.2 異常系

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-004 | 非IFC拡張子（.obj） | `File('model.obj', 1MB)` | `{ valid: false, error: 'IFCファイル（.ifc）のみアップロード可能です' }` | 🔵 | §2.2.3 |
| TC-005 | 非IFC拡張子（.step） | `File('model.step', 1MB)` | `{ valid: false, error: 'IFCファイル（.ifc）のみアップロード可能です' }` | 🔵 | §2.2.3 |
| TC-006 | 100MB超のファイル（150MB） | `File('big.ifc', 150MB)` | `{ valid: false, error: 'ファイルサイズが100MBを超えています（150.0MB）' }` | 🔵 | NFR-003, EDGE-002 |
| TC-007 | 拡張子なしファイル | `File('noextension', 1MB)` | `{ valid: false, error: 'IFCファイル（.ifc）のみアップロード可能です' }` | 🔵 | §2.2.3 |

### 1.3 境界値

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-008 | ちょうど100MB（境界値） | `File('exact.ifc', 100*1024*1024)` | `{ valid: true }` | 🔵 | NFR-003 |
| TC-009 | 100MB+1バイト（境界超過） | `File('over.ifc', 100*1024*1024+1)` | `{ valid: false, error: ... }` | 🔵 | NFR-003 |
| TC-010 | 0バイトファイル | `File('empty.ifc', 0)` | `{ valid: true }` | 🔵 | §2.3 |

---

## 2. formatFileSize テストケース

### 2.1 正常系

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-011 | バイト単位（500B） | `500` | `'500B'` | 🔵 | §3.3 |
| TC-012 | KB単位（1024B） | `1024` | `'1.0KB'` | 🔵 | §3.3 |
| TC-013 | MB単位（50MB） | `52428800` | `'50.0MB'` | 🔵 | §3.3 |
| TC-014 | MB単位（100MB） | `104857600` | `'100.0MB'` | 🔵 | §3.3 |
| TC-015 | GB単位（1GB） | `1073741824` | `'1.0GB'` | 🔵 | §3.3 |

### 2.2 境界値

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-016 | 0バイト | `0` | `'0B'` | 🔵 | §3.3 |
| TC-017 | 1023バイト（KB未満） | `1023` | `'1023B'` | 🔵 | §3.3 |
| TC-018 | 小数点以下の精度（1.5MB） | `1572864` | `'1.5MB'` | 🔵 | §3.3 |

---

## 3. detectIfcVersion テストケース

### 3.1 正常系

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-019 | IFC2X3バッファ | `FILE_SCHEMA(('IFC2X3'))` を含むバッファ | `'IFC2X3'` | 🟡 | §2.7, NFR-302 |
| TC-020 | IFC4バッファ | `FILE_SCHEMA(('IFC4'))` を含むバッファ | `'IFC4'` | 🟡 | §2.7, NFR-302 |
| TC-021 | IFC4X1バッファ | `FILE_SCHEMA(('IFC4X1'))` を含むバッファ | `'IFC4'` | 🟡 | §2.7 |

### 3.2 異常系

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-022 | FILE_SCHEMAが無いバッファ | `ISO-10303-21` のみ含むバッファ | `null` | 🟡 | §2.7 |
| TC-023 | 空バッファ | `new Uint8Array(0)` | `null` | 🟡 | §2.7 |
| TC-024 | 不明なスキーマ | `FILE_SCHEMA(('UNKNOWN'))` を含むバッファ | `null` | 🟡 | §2.7 |

---

## 4. MAX_FILE_SIZE_BYTES テストケース

| TC-ID | テストケース名 | 期待値 | 信頼性 | 参照要件 |
|-------|---------------|--------|--------|----------|
| TC-025 | 定数値が100MBであること | `100 * 1024 * 1024` (104857600) | 🔵 | NFR-003, §3.2 |

---

## 5. processIfcUpload テストケース

### 5.1 正常系

| TC-ID | テストケース名 | 入力 | 期待動作 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-026 | 有効なIFCファイルの完全処理フロー | 有効なIFC File + モックされたweb-ifc | archNodeData, parseResult, buffer を返す | 🔵 | §3.5, REQ-107 |
| TC-027 | onProgressコールバックが呼ばれる | 有効ファイル + onProgress | 複数回呼ばれ、進捗値が単調増加 | 🔵 | §2.5, R-08 |

### 5.2 異常系

| TC-ID | テストケース名 | 入力 | 期待動作 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-028 | ファイル検証失敗（非IFC） | `File('test.obj')` | validateIfcFile のエラーをスロー | 🔵 | §3.5, R-03 |
| TC-029 | IFCバッファ検証失敗 | 無効バッファのIFCファイル | 'IFCファイルではありません' エラーをスロー | 🔵 | §3.5, R-04, EDGE-001 |
| TC-030 | WASM初期化失敗 | initIfcApi がエラーをスロー | 'WASMの初期化に失敗しました' エラーをスロー | 🟡 | §2.5, EDGE-004 |
| TC-031 | パース失敗 | parseIfcFile がエラーをスロー | 'IFCファイルのパースに失敗しました' エラーをスロー | 🟡 | §2.5, EDGE-003 |

### 5.3 境界値・エッジケース

| TC-ID | テストケース名 | 入力 | 期待動作 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-032 | ジオメトリ空のIFC | parseResult.geometries=[] | 正常完了、archNodeData.geometryData が空 | 🔵 | EDGE-006 |
| TC-033 | ストーリー無しのIFC | parseResult.storeys=[] | 正常完了、archNodeData.levelMapping が undefined | 🔵 | EDGE-007 |
| TC-034 | 部分エラー有りのパース結果 | parseResult.errors.length > 0 | 正常完了（成功扱い） | 🟡 | EDGE-003 |

---

## テストケースサマリー

| カテゴリ | TC数 | 🔵 青 | 🟡 黄 |
|---------|------|-------|-------|
| validateIfcFile | 10 | 10 | 0 |
| formatFileSize | 8 | 8 | 0 |
| detectIfcVersion | 6 | 0 | 6 |
| MAX_FILE_SIZE_BYTES | 1 | 1 | 0 |
| processIfcUpload | 9 | 5 | 4 |
| **合計** | **34** | **24** | **10** |

---

## テスト実装方針

### モック戦略

- **web-ifc**: `vi.mock('web-ifc')` で IfcAPI をモック（WASM不要）
- **@kuhl/core ifc-import**: `initIfcApi`, `parseIfcFile`, `createArchitectureRefNodeData`, `isValidIfcBuffer` をモック
- **File API**: `new File(['content'], 'name.ifc', { type: '' })` で File オブジェクトを生成（size は Object.defineProperty でオーバーライド）
- **Uint8Array**: `new TextEncoder().encode('...')` でバッファ生成

### テストカバレッジ目標

- 純粋関数（validateIfcFile, formatFileSize, detectIfcVersion, MAX_FILE_SIZE_BYTES）: 100%
- processIfcUpload: 正常系 + 主要エラー系 = 80%以上
- 全体: 60%以上（TASK-0017 完了条件）
