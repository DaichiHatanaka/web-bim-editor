# TASK-0012: Refactorフェーズ記録 — Viewer基盤コンポーネント・Canvas・Grid

**タスクID**: TASK-0012
**機能名**: kuhl-hvac-editor
**フェーズ**: Refactor（品質改善）
**実施日**: 2026-03-25

---

## 1. リファクタリング概要

Greenフェーズで全35テスト通過を達成した実装コードに対して、品質改善を実施した。
主な改善点は NodeRenderer の React Hooks ルール遵守（`useScene.getState()` → `useScene()` Hook化）と型安全性の強化。

---

## 2. 実施した改善内容

### 2.1 `packages/kuhl-viewer/src/constants/layers.ts` — `as const` によるリテラル型化

**改善前:**
```typescript
export const SCENE_LAYER = 0
export const EDITOR_LAYER = 1
export const ZONE_LAYER = 2
```

**改善後:**
```typescript
export const SCENE_LAYER = 0 as const  // リテラル型 0
export const EDITOR_LAYER = 1 as const // リテラル型 1
export const ZONE_LAYER = 2 as const   // リテラル型 2
```

**改善ポイント:**
- `as const` を追加することで型が `number` から `0 | 1 | 2` のリテラル型に絞り込まれる
- 誤った値の代入を TypeScript がコンパイル時に検出できるようになった
- 🔵 青信号: TypeScript 型安全性の標準パターン

---

### 2.2 `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` — Hook化（最重要改善）

**改善前（問題のある実装）:**
```typescript
export const NodeRenderer: React.FC<NodeRendererProps> = ({ nodeId }) => {
  if (!nodeId) return null  // ← 条件分岐の後にHook呼び出し（Rules of Hooks違反）

  // eslint-disable-next-line react-hooks/rules-of-hooks  ← 警告を抑制
  const node = useScene.getState().nodes[nodeId]  // ← 同期取得、Reactive更新なし
  ...
}
```

**改善後（正しい実装）:**
```typescript
export const NodeRenderer: React.FC<NodeRendererProps> = ({ nodeId }) => {
  // Hookをトップレベルで呼び出し（React Hooks Rulesに完全準拠）
  const node = useScene((state) => (nodeId ? state.nodes[nodeId] : undefined))

  if (!node) return null  // ← nullチェックはHook呼び出し後に実施
  ...
}
```

**改善ポイント:**
- `useScene.getState()`（同期取得）→ `useScene()` Hook化でReactiveになった
- `eslint-disable-next-line react-hooks/rules-of-hooks` を完全削除
- React Hooks Rulesを遵守: 条件分岐の前にHookを呼び出す
- Zustandセレクター `(state) => state.nodes[nodeId]` で対象ノードのみサブスクライブ
- `nodeId` が falsy の場合は `undefined` を返してnullチェックで捕捉
- 🔵 青信号: React Hooks Rules公式ドキュメントに基づく修正

**default ケースの型アサーション整理:**

**改善前:**
```typescript
default:
  return <FallbackRenderer nodeId={(node as { id: string }).id} nodeType={(node as { type: string }).type} />
```

**改善後:**
```typescript
default: {
  const unknownNode = node as { id: string; type: string }
  return <FallbackRenderer nodeId={unknownNode.id} nodeType={unknownNode.type} />
}
```

- 型アサーションを変数に抽出して冗長な記述を1回にまとめた
- 🟡 黄信号: 型安全のための防御的実装

---

### 2.3 `packages/kuhl-viewer/src/components/renderers/fallback-renderer.tsx` — コメント充実

**改善ポイント:**
- `_nodeId`/`_nodeType` が「意図的に未使用」であることをコメントで明文化
- 後続タスクでの拡張を想定した設計意図を記述
- `wireframe` 表示により「未実装」を視覚的に区別する意図を明文化
- 🟡 黄信号: Phase 1プレースホルダーの設計意図の明確化

---

### 2.4 `packages/kuhl-viewer/src/components/viewer.tsx` — コメント充実と設計根拠の明文化

**改善ポイント:**
- `selectionManager` props が「Phase 1では未使用」であることを明示（`_selectionManager`）
- Canvas設定値（dpr制限、カメラ位置、FOV）の設計根拠をコメントに追記
- Viewer がステートレスであるべき設計方針をコメントで明文化
- 🔵 青信号: 既存Pascal Viewerパターンと要件定義書からの確認

---

## 3. セキュリティレビュー結果

| 観点 | 評価 | 詳細 |
|------|------|------|
| 入力値検証 | ✅ 良好 | `nodeId` の undefined/null は Hookレベルとnullチェックで二重防御 |
| XSS対策 | ✅ 問題なし | Three.js JSXのみ。DOM文字列操作なし |
| 外部入力 | ✅ 問題なし | `useScene` ストアは内部管理 |
| データ漏洩 | ✅ 問題なし | ログ出力なし、秘匿情報なし |

---

## 4. パフォーマンスレビュー結果

| 観点 | 評価 | 詳細 |
|------|------|------|
| NodeRenderer Reactive更新 | ✅ 改善済み | `useScene.getState()` → `useScene()` Hookで自動再レンダー |
| セレクター最適化 | ✅ 良好 | `state.nodes[nodeId]` のみをサブスクライブ、無関係な更新では再レンダーしない |
| Canvas dpr制限 | ✅ 良好 | `[1, 1.5]` で高DPIの描画負荷を制限（NFR-001対応） |
| プリミティブ選択 | ✅ 良好 | FallbackRenderer は BoxGeometry（最軽量プリミティブ）を使用 |

---

## 5. テスト実行結果

```
Test Files  4 passed (4)
     Tests  35 passed (35)
   Start at  08:02:46
   Duration  2.07s
```

| テストファイル | 結果 | テスト数 |
|--------------|------|---------|
| `layers.test.ts` | ✅ 全通過 | 7/7 |
| `node-renderer.test.tsx` | ✅ 全通過 | 8/8 |
| `viewer.test.tsx` | ✅ 全通過 | 5/5 |
| `use-viewer.test.ts`（既存） | ✅ 全通過 | 15/15 |

### テスト実行時の警告（テスト失敗には影響なし）

1. **`act(...)` 警告**: Zustand Hookのサブスクリプション初期化時に非同期更新が発生するが、テスト結果には影響しない。Hook化に伴い発生するが、機能的には正しい動作。
2. **jsdomでのThree.js JSX警告**: `<mesh>`, `<boxGeometry>`, `<meshBasicMaterial>` はjsdom環境では認識されないため警告が出るが、テスト結果には影響しない（R3F Canvas外でレンダリングしているため）。

---

## 6. 改善されたコードの最終形

### `packages/kuhl-viewer/src/constants/layers.ts`（27行）

`as const` でリテラル型化。コメント充実。

### `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx`（114行）

- `useScene((state) => ...)` Hook化
- `eslint-disable` コメント削除
- default ケースの型アサーション整理
- 日本語コメント充実

### `packages/kuhl-viewer/src/components/renderers/fallback-renderer.tsx`（67行）

- Props の役割と将来拡張意図を明文化

### `packages/kuhl-viewer/src/components/viewer.tsx`（120行）

- Canvas設定値の設計根拠を追記
- `selectionManager` の将来拡張意図を明文化

---

## 7. 品質評価

| 項目 | 評価 |
|------|------|
| テスト結果 | ✅ 35/35 全テスト継続成功 |
| セキュリティ | ✅ 重大な脆弱性なし |
| パフォーマンス | ✅ Reactive更新対応、重大な性能課題なし |
| リファクタ品質 | ✅ 主要目標達成（Hook化、eslint-disable削除、型安全化） |
| コード品質 | ✅ React Hooks Rules遵守、型安全性向上 |
| ファイルサイズ | ✅ 全ファイル500行以下（最大120行） |
| 日本語コメント | ✅ 改善・充実済み |

**総合評価**: ✅ 高品質
