# Refactor フェーズ記録: TASK-0017 IFC読込UI・ファイルアップロード

**タスクID**: TASK-0017
**機能名**: kuhl-hvac-editor
**フェーズ**: Refactor（品質改善）
**作成日**: 2026-03-25

---

## テスト実行結果（リファクタ後）

```
TEMP=/c/tmp TMPDIR=/c/tmp bun run --cwd apps/kuhl-editor test -- --reporter=verbose ifc-upload-panel

Test Files  1 passed (1)
      Tests  34 passed (34)
   Start at  10:27:48
   Duration  336ms (transform 89ms, setup 34ms, import 80ms, tests 16ms, environment 0ms)
```

**全34テストケース（TC-001〜TC-034）がリファクタ後も PASS**

---

## セキュリティレビュー結果

| 項目 | 状況 | 詳細 |
|------|------|------|
| 入力値検証 | ✅ 対応済み | `validateIfcFile` で拡張子・サイズを検証 |
| バッファ検証 | ✅ 対応済み | `isValidIfcBuffer` で ISO-10303-21 ヘッダーを確認 |
| エラーメッセージ | ✅ 適切 | 内部情報を漏洩させない日本語メッセージ |
| XSS対策 | ✅ 対応済み | React JSX の自動エスケープで対応 |
| ファイルサイズ制限 | ✅ 対応済み | 100MB 制限を定数 `MAX_FILE_SIZE_BYTES` で管理 |
| 重大な脆弱性 | ✅ なし | - |

---

## パフォーマンスレビュー結果

| 関数 | 計算量 | 備考 |
|------|--------|------|
| `validateIfcFile` | O(n) → n は拡張子長 | 早期リターンで効率的 |
| `formatFileSize` | O(1) | 固定分岐のみ |
| `detectIfcVersion` | O(4096) = O(1) | 先頭4096バイトのみデコード |
| `processIfcUpload` | 非同期・I/O支配 | WASM 初期化が主なコスト |

重大なパフォーマンス課題: なし

---

## 改善内容

### 1. 🔵 `@kuhl/core` への ifc-import エクスポート追加

**改善前**: `initIfcApi`, `parseIfcFile`, `createArchitectureRefNodeData`, `isValidIfcBuffer`, `IfcParseResult` 型が `@kuhl/core` の index.ts にエクスポートされていなかった

**改善後**: `packages/kuhl-core/src/index.ts` に ifc-import 関連のエクスポートを追加

```ts
// IFC Import
export {
  createArchitectureRefNodeData,
  filterTargetGeometries,
  flatTransformationToMatrix4,
  IFC_TYPE_COLOR_MAP,
  initIfcApi,
  isValidIfcBuffer,
  parseIfcFile,
  TARGET_IFC_TYPES,
  type IfcParseResult,
  type ParsedGeometry,
  type ParsedStorey,
} from './systems/ifc/ifc-import'
```

### 2. 🔵 `ProcessIfcUploadResult` の型安全化（unknown 型の解消）

**改善前**:
```ts
export interface ProcessIfcUploadResult {
  archNodeData: unknown
  parseResult: unknown
  buffer: Uint8Array
}
```

**改善後**:
```ts
export interface ProcessIfcUploadResult {
  archNodeData: ReturnType<typeof createArchitectureRefNodeData>
  parseResult: IfcParseResult
  buffer: Uint8Array
}
```

### 3. 🔵 `as never` 型キャストの解消

**改善前**:
```ts
let ifcApi: unknown
// ...
parseResult = parseIfcFile(ifcApi as never, buffer)
// ...
const archNodeData = createArchitectureRefNodeData(file.name, parseResult as never)
```

**改善後**:
```ts
let ifcApi: IfcAPI  // web-ifc の型を明示
// ...
parseResult = parseIfcFile(ifcApi, buffer)  // 型キャスト不要
// ...
const archNodeData = createArchitectureRefNodeData(file.name, parseResult)  // 型キャスト不要
```

### 4. 🟡 `IfcUploadPanel` コンポーネントの UI 実装

**改善前**: null 返却のみ

**改善後**: `ifc-upload-panel-view.tsx` に分離して実装
- ドラッグ＆ドロップ + ファイル選択ダイアログ
- アップロード進捗バー表示
- エラーメッセージ表示
- 成功メッセージ表示

### 5. 🔵 ファイル分離による設計改善

| ファイル | 役割 |
|---------|------|
| `ifc-upload-panel.tsx` | 純粋関数・型定義（JSX なし、テスト対象） |
| `ifc-upload-panel-view.tsx` | JSX UI コンポーネント（Next.js アプリで利用） |

vitest の node 環境（`jsx: preserve`）での JSX パースエラーを回避するための設計分離。

---

## ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `apps/kuhl-editor/components/panels/ifc-upload-panel.tsx` | 更新 | unknown/as never 型の解消、JSX 分離 |
| `apps/kuhl-editor/components/panels/ifc-upload-panel-view.tsx` | 新規 | JSX UIコンポーネント実装 |
| `packages/kuhl-core/src/index.ts` | 更新 | ifc-import 関連エクスポート追加 |

---

## 品質判定

```
✅ 高品質:
- テスト結果: 全34テストが継続PASS
- セキュリティ: 重大な脆弱性なし
- パフォーマンス: 重大な性能課題なし
- リファクタ品質: 目標達成（unknown解消, as never解消, UI実装, ファイル分離）
- コード品質: 型安全性が向上
- ファイルサイズ: 280行（500行制限以内）
- ドキュメント: 完成
```
