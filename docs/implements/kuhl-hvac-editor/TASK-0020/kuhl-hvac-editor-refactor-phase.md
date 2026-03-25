# TASK-0020: LevelVisibilitySystem・InteractiveSystem — Refactor フェーズ記録

**タスクID**: TASK-0020
**機能名**: kuhl-hvac-editor
**作成日**: 2026-03-25
**フェーズ**: Refactor（品質改善完了）

---

## テスト実行結果（リファクタ後）

```
Test Files  1 passed (1)
      Tests  23 passed (23)
   Start at  11:14:07
   Duration  396ms
```

全 23 テストが引き続きパス。

---

## リファクタリング概要

### 改善1: `processLevelVisibility` の分岐ロジックをヘルパー関数に分割

🔵 青信号（要件定義書 セクション2.1.1 処理ロジックを忠実に抽出）

**対象ファイル**: `packages/kuhl-viewer/src/systems/level-visibility-system.tsx`

**改善内容**: `processLevelVisibility` 内の 4 段 if-else 分岐を
`computeNodeVisibility(nodeId, node, levelId, nodes): boolean` ヘルパー関数に抽出した。

- `processLevelVisibility` の責任を「走査と適用」のみに限定
- `computeNodeVisibility` の責任を「1ノードの可視性を決める」のみに限定
- 単一責任原則（SRP）を適用し、分岐ロジックを単体でテスト・再利用しやすくした

**Before**（processLevelVisibility 内の分岐）:
```typescript
if (node.type === 'plant' || node.type === 'building') {
  o.visible = true
} else if (nodeId === levelId) {
  o.visible = true
} else if (node.type === 'level') {
  o.visible = false
} else {
  o.visible = isDescendantOfLevel(nodeId, levelId, nodes)
}
```

**After**（ヘルパー関数に委譲）:
```typescript
o.visible = computeNodeVisibility(nodeId, node, levelId, nodes)
```

---

### 改善2: `resolveHoveredNodeId` の線形スキャン最適化

🟡 黄信号（パフォーマンス改善のため追加。要件定義書 NFR-001 の 60fps 要件から推測）

**対象ファイル**: `packages/kuhl-viewer/src/systems/interactive-system.tsx`

**改善内容**: ネストしたループ O(depth × n) を `buildReverseRegistryMap` による
逆引き Map を事前構築して O(n + depth) に改善した。

- `buildReverseRegistryMap(registryNodes): Map<unknown, string>` ヘルパーを追加
- `for` 内 `for` のネストを排除し、`reverseMap.get(current)` で O(1) ルックアップを実現
- n=1000, depth=50 の想定で最大 50 倍の改善

**Before**（O(depth × n) のネストループ）:
```typescript
while (current != null && depth < MAX_DEPTH) {
  for (const [nodeId, registryObj] of registryNodes) {  // O(n) × depth 回
    if (registryObj === current) return nodeId
  }
  current = (current as { parent?: unknown }).parent ?? null
  depth++
}
```

**After**（O(n + depth)）:
```typescript
const reverseMap = buildReverseRegistryMap(registryNodes)  // O(n) で一度だけ構築
while (current != null && depth < MAX_DEPTH) {
  const nodeId = reverseMap.get(current)                   // O(1) ルックアップ
  if (nodeId !== undefined) return nodeId
  current = (current as { parent?: unknown }).parent ?? null
  depth++
}
```

---

### 改善3: `NodeLike` 型の整理とコメント強化

🟡 黄信号（AnyNode 変更の代替案として構造的互換性維持を選択）

**対象ファイル**: 両ファイル

**改善内容**: リファクタリング候補の「`NodeLike` を `AnyNode` に変更」について検討した結果、
`AnyNode` は Zod discriminatedUnion で type がリテラル型のみ許容されるため、
テストの `MinimalNode`（`type: string`）との互換性が破壊される。

代替として以下の方針を採用した:
- `NodeLike` 型定義に `@kuhl/core` の `BaseNode` との関係を明示するコメントを追加
- 「`BaseNode` が持つ `id/type/parentId` を Pick した型と同等」であることを文書化

これにより将来的に `Pick<BaseNode, 'id' | 'type' | 'parentId'>` への移行も容易になる。

---

### 日本語コメント強化

両ファイルのコメントを `comment_template` に従って強化した:

- `【機能概要】`, `【改善内容】`, `【設計方針】`, `【パフォーマンス】`, `【保守性】` を各関数に追記
- `【ヘルパー関数】`, `【再利用性】`, `【単一責任】` を新規ヘルパー関数に追記
- 信頼性レベル (🔵🟡) をすべての改善箇所に付与

---

## セキュリティレビュー結果

| 項目 | 状態 | 詳細 |
|------|------|------|
| 脆弱性 | ✅ なし | 純粋関数のみ。外部 I/O なし。 |
| 入力検証 | ✅ 適切 | `obj == null` チェック、`!node` チェック、MAX_DEPTH 制限あり |
| XSS/CSRF | ✅ 対象外 | DOM 操作なし、HTTP リクエストなし |
| データ漏洩 | ✅ リスクなし | ユーザーデータを外部に送信しない |

---

## パフォーマンスレビュー結果

| 関数 | Before | After | 改善内容 |
|------|--------|-------|---------|
| `isDescendantOfLevel` | O(depth) | O(depth) | 変更なし（既に最適） |
| `processLevelVisibility` | O(n × depth) | O(n × depth) | 計算量変化なし・可読性向上 |
| `resolveHoveredNodeId` | O(depth × n) | O(n + depth) | 逆引き Map で最大 50 倍改善 |
| `resolveSelectionPath` | O(depth) | O(depth) | 変更なし（既に最適） |

---

## 品質評価

| 項目 | 結果 |
|------|------|
| テスト成功状況 | ✅ 23/23 全テスト継続成功 |
| セキュリティ | ✅ 重大な脆弱性なし |
| パフォーマンス | ✅ resolveHoveredNodeId を最適化 |
| リファクタ品質 | ✅ 3 候補すべて対応 |
| コード品質 | ✅ SRP 適用、日本語コメント強化 |
| ファイルサイズ | ✅ 各 181 行（500 行制限内） |

---

## 最終コード

### packages/kuhl-viewer/src/systems/level-visibility-system.tsx（主要部分）

```typescript
// 追加ヘルパー: computeNodeVisibility
export function computeNodeVisibility(
  nodeId: string,
  node: NodeLike,
  levelId: string,
  nodes: Record<string, NodeLike>,
): boolean {
  if (node.type === 'plant' || node.type === 'building') return true
  if (nodeId === levelId) return true
  if (node.type === 'level') return false
  return isDescendantOfLevel(nodeId, levelId, nodes)
}

// processLevelVisibility のメインループ（簡略化）
o.visible = computeNodeVisibility(nodeId, node, levelId, nodes)
```

### packages/kuhl-viewer/src/systems/interactive-system.tsx（主要部分）

```typescript
// 追加ヘルパー: buildReverseRegistryMap
export function buildReverseRegistryMap(
  registryNodes: Map<string, unknown>,
): Map<unknown, string> {
  const reverseMap = new Map<unknown, string>()
  for (const [nodeId, obj] of registryNodes) {
    if (obj != null) reverseMap.set(obj, nodeId)
  }
  return reverseMap
}

// resolveHoveredNodeId の最適化後ループ
const reverseMap = buildReverseRegistryMap(registryNodes)
while (current != null && depth < MAX_DEPTH) {
  const nodeId = reverseMap.get(current)
  if (nodeId !== undefined) return nodeId
  current = (current as { parent?: unknown }).parent ?? null
  depth++
}
```
