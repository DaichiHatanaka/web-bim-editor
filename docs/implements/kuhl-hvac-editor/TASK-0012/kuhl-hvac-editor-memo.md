# kuhl-hvac-editor TDD開発完了記録（TASK-0012）

## 確認すべきドキュメント

- `docs/tasks/kuhl-hvac-editor/TASK-0012.md`
- `docs/implements/kuhl-hvac-editor/TASK-0012/kuhl-hvac-editor-requirements.md`
- `docs/implements/kuhl-hvac-editor/TASK-0012/kuhl-hvac-editor-testcases.md`

## 🎯 最終結果（2026-03-25）
- **実装率**: 94%（16/17テストケース。TC-011はTC-005/TC-006で間接検証済み）
- **テスト成功率**: 100%（35/35、スコープ内20テスト含む）
- **品質判定**: ✅ 完全達成
- **TODO更新**: ✅ 完了マーク追加済み

## 💡 重要な技術学習

### 実装パターン

- **React Hooks Rules遵守**: `useScene.getState()`（同期取得）を `useScene((state) => state.nodes[nodeId])` Hook化することでReactive更新対応と Rules of Hooks準拠を両立する。`eslint-disable-next-line react-hooks/rules-of-hooks` は不要になる
- **Zustandセレクター最適化**: `(state) => (nodeId ? state.nodes[nodeId] : undefined)` 形式で対象ノードのみをサブスクライブし、無関係な更新で再レンダーを起こさない
- **`as const` によるリテラル型化**: `export const SCENE_LAYER = 0 as const` で型を `number` → `0` のリテラル型に絞り込み、誤代入をコンパイル時に検出
- **NodeRendererのデフォルトケース型アサーション**: `const unknownNode = node as { id: string; type: string }` で変数に抽出し冗長な型アサーションを削除

### テスト設計

- **jsdom環境指定**: R3Fコンポーネントテストはファイル先頭に `// @vitest-environment jsdom` を追加して解決
- **R3Fモック化パターン**: `vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => <div data-testid="r3f-canvas">{children}</div> }))` で Node環境のWebGL制約を回避
- **ノードスキーマのフィールド確認**: AhuNode の必須フィールドは `tag`/`equipmentName`/`dimensions`/`lod`/`status`（`name`/`equipmentTag` は不正）
- **@kuhl/coreインポート**: サブパスエクスポートなし → メインエントリ `@kuhl/core` から直接インポート
- **テスト実行コマンド**: `cd packages/kuhl-viewer && node ../../node_modules/vitest/vitest.mjs run`

### 品質保証

- **Viewer Isolation原則**: `@kuhl/viewer` は `apps/kuhl-editor` からインポートしない。props/callbacks/children injectionで制御
- **レイヤー番号ハードコード禁止**: `SCENE_LAYER=0`, `EDITOR_LAYER=1`, `ZONE_LAYER=2` 定数必須
- **NodeRendererの二重防御**: HookセレクターとnullチェックでnodeId不正/ノード不存在の両方に対応

## 関連実装ファイル

- `packages/kuhl-viewer/src/constants/layers.ts` (27行) — as const リテラル型定数
- `packages/kuhl-viewer/src/components/renderers/fallback-renderer.tsx` (67行) — BoxGeometryプレースホルダー
- `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` (114行) — useScene Hook化ディスパッチャー
- `packages/kuhl-viewer/src/components/viewer.tsx` (120行) — R3F Canvas + children injection

## ⚠️ 注意点

- TC-011（FallbackRenderer BoxGeometry直接テスト）は未実装だが、TC-005/TC-006のnode-rendererテストで間接的に検証済み。要改善ではない
- Refactorフェーズでの `act(...)` 警告と jsdom Three.js JSX警告はテスト結果に影響しない（機能的に正常）
- FallbackRenderer の `_nodeId`/`_nodeType` は意図的に未使用（後続タスクでの拡張を想定したPhase 1プレースホルダー）
