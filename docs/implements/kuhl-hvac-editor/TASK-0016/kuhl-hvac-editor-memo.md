# kuhl-hvac-editor TASK-0016 TDD開発完了記録

## 確認すべきドキュメント

- `docs/tasks/kuhl-hvac-editor/TASK-0016.md`
- `docs/implements/kuhl-hvac-editor/TASK-0016/kuhl-hvac-editor-requirements.md`
- `docs/implements/kuhl-hvac-editor/TASK-0016/kuhl-hvac-editor-testcases.md`

## 最終結果 (2026-03-25)

- **実装率**: 100% (33/33テストケース)
- **品質判定**: 合格（高品質）
- **テスト結果**: 33/33 PASS（全283テスト継続 PASS）
- **TODO更新**: ✅完了マーク追加

## 重要な技術学習

### 実装パターン

- **web-ifc WASM のテスト環境モック**: `vi.mock('web-ifc')` でIfcAPIをモックし、WASM非依存で統合テストを実施。`/invalid/`パスでInit()を reject させるモック実装が有効。
- **純粋関数分離**: filterTargetGeometries, flatTransformationToMatrix4, isValidIfcBuffer, createArchitectureRefNodeData を web-ifc 非依存の純粋関数として分離し、モックなしで単体テスト可能に。
- **ライブラリ定数の使用**: `WEBIFC.IFCBUILDINGSTOREY`（3124254112）をハードコードせず `import * as WEBIFC from 'web-ifc'` で参照することで定数変更に追随できる。
- **API選択**: `GetAllLines(modelID)` は型フィルタなし。型フィルタリングは `GetLineIDsWithType(modelID, type)` を使用する（型定義で確認済み）。
- **呼び出し順序**: `extractStoreys()` は必ず `CloseModel()` 前に呼び出す（CloseModel後はmodelIDが無効）。

### テスト設計

- 純粋関数（TC-001〜TC-023）: web-ifc 非依存、jest/vitest 標準機能のみで高速テスト
- 統合関数（TC-024〜TC-033）: vi.mock('web-ifc') でIfcAPIをモック化
- TC-030: `vi.fn()` の CloseModel スパイで try/finally 保証を検証
- ヘルパー関数 `createTestGeometry()` と `createTestParseResult()` でテストデータ生成を標準化

### 品質保証

- IFCヘッダーバリデーション（isValidIfcBuffer）で先頭256バイトのみデコード（大ファイル効率化）
- 個別ジオメトリエラーを errors 配列に記録して部分読込継続（EDGE-001対応）
- `geometry.delete()` でWASMメモリを逐次解放

## 注意事項

### 環境固有問題（スコープ外）

- **turborepo経由のテスト実行**: `bun run --filter '@kuhl/core' test` では日本語ユーザー名パス（`畠中大地`）の文字化けにより `EPERM: mkdir 'C:\Users\??????n\AppData\Local\Temp\...\ssr'` が発生。
- **回避方法**: `cd packages/kuhl-core && node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts` で直接実行すれば全283テスト PASS。
- **根本原因**: vitest v4 がWindows Tempフォルダを作成する際に日本語パスを処理できない問題（turborepo経由でのみ発生）。

## スコープ外失敗のmemo

- 全11テストファイル（283テスト）はスコープ内と同一の環境問題で影響を受けているが、直接実行では全PASS。
- 対応推奨: Windows環境でのTEMP変数をASCIIパスに設定するか、vitest configで `cache.dir` を指定する。
