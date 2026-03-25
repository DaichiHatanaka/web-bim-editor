# Green フェーズ記録: TASK-0017 IFC読込UI・ファイルアップロード

**タスクID**: TASK-0017
**機能名**: kuhl-hvac-editor
**フェーズ**: Green（最小実装）
**作成日**: 2026-03-25

---

## テスト実行結果

```
TEMP=/c/tmp TMPDIR=/c/tmp bun run --cwd apps/kuhl-editor test -- --reporter=verbose ifc-upload-panel

Test Files  1 passed (1)
      Tests  34 passed (34)
   Start at  10:20:16
   Duration  475ms (transform 93ms, setup 43ms, import 83ms, tests 21ms, environment 0ms)
```

**全34テストケース（TC-001〜TC-034）が PASS**

---

## 実装ファイル

`apps/kuhl-editor/components/panels/ifc-upload-panel.tsx`

---

## 実装方針と判断理由

### 1. `MAX_FILE_SIZE_BYTES` 定数
- `100 * 1024 * 1024 = 104857600` で定義
- 🔵 信頼性: 要件定義書・TC-025 に明示

### 2. `validateIfcFile`
- `file.name.split('.').pop()?.toLowerCase()` で拡張子を取得し、`'ifc'` と比較（大文字小文字不問）
- サイズチェックは `file.size > MAX_FILE_SIZE_BYTES`（100MB 以下は valid）
- エラーメッセージには `formatFileSize` でフォーマットした実際のサイズを含める
- 🔵 信頼性: TC-001〜TC-010 の期待値に完全準拠

### 3. `formatFileSize`
- GB → MB → KB → B の順にしきい値チェック（`toFixed(1)` でフォーマット）
- 🔵 信頼性: TC-011〜TC-018 の期待値に完全準拠

### 4. `detectIfcVersion`
- バッファ先頭 4096 バイトを UTF-8 デコード
- 正規表現 `FILE_SCHEMA\s*\(\s*\(\s*'(IFC[^']+)'\s*\)\s*\)` でスキーマ名を抽出
- `IFC2X3` → `'IFC2X3'`、`IFC4` 始まり → `'IFC4'`、それ以外 → `null`
- 🟡 信頼性: 要件定義書 §3 から妥当な推測

### 5. `processIfcUpload`
- バリデーション → バッファ取得 → isValidIfcBuffer → initIfcApi → parseIfcFile → createArchitectureRefNodeData の順に実行
- onProgress コールバックを 0%, 30%, 70%, 90% で呼び出し
- WASM 初期化エラーは `'WASMの初期化に失敗しました'` に変換
- パースエラーは `'IFCファイルのパースに失敗しました'` に変換
- 🔵 信頼性: Red フェーズ記録の実装指示に完全準拠

---

## 環境上の注意事項

Windowsの日本語ユーザーディレクトリによって `TEMP` パスに日本語が含まれ、vitest が一時ディレクトリ作成時に `EPERM` エラーを起こす。以下のようにTEMPを変更してテスト実行が必要：

```bash
TEMP=/c/tmp TMPDIR=/c/tmp bun run --cwd apps/kuhl-editor test
```

また `vitest.config.ts` に `cacheDir` を追加済み：

```ts
cacheDir: path.resolve(__dirname, '.vitest-cache'),
```

---

## 課題・改善点（Refactorフェーズで対応）

1. **`IfcUploadPanel` コンポーネント**: Green フェーズでは `null` 返却のみ。Refactor フェーズでドラッグ＆ドロップ UI、進捗表示などを実装予定
2. **型の `unknown` 使用**: `archNodeData` / `parseResult` を `unknown` 型で扱っている。Refactor フェーズで `@kuhl/core` の型を参照して型安全にする
3. **`processIfcUpload` の型キャスト**: `ifcApi as never` などの型キャストが残っている。Refactor フェーズで適切な型定義に修正
4. **テスト実行コマンドの TEMP 設定**: CI/CD 環境では問題ない可能性があるが、Windows 開発環境では `TEMP=/c/tmp` が必要
