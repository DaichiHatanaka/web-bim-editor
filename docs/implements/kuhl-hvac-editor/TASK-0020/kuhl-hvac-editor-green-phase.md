# TASK-0020: LevelVisibilitySystem・InteractiveSystem — Green フェーズ記録

**タスクID**: TASK-0020
**機能名**: kuhl-hvac-editor
**作成日**: 2026-03-25
**フェーズ**: Green（最小実装完了）

---

## テスト実行結果

```
Test Files  1 passed (1)
      Tests  23 passed (23)
   Start at  11:09:35
   Duration  336ms
```

全23テストが通過。Green フェーズ完了。

---

## 実装方針

### isDescendantOfLevel

- 再帰の代わりにループ + visited Set で循環参照を検出
- MAX_DEPTH=50 で打ち切り（要件定義書 EDGE-05 より推測）
- 先に `visited.has(currentId)` チェックを行い、その後 `nodes[currentId]` 存在チェック

### processLevelVisibility

1. registryNodes が空なら即 return
2. levelId === null なら全ノード visible=true（EDGE-01）
3. levelId 設定時: plant/building は常時 true → levelId 自身は true → type=level かつ非選択は false → その他は isDescendantOfLevel の結果

### resolveSelectionPath

- selectedIds: [nodeId] を初期値に設定し、nodes[nodeId] が存在しない場合はそのまま返す
- nodeId 自身から始め parentId を辿る。type に応じて plantId/buildingId/levelId/zoneId を埋める

### resolveHoveredNodeId

- intersection === null/undefined → null
- registryNodes を線形スキャンして current === registryObj を探す
- 見つからなければ current = current.parent に進む（最大50段）

---

## 実装ファイル

### packages/kuhl-viewer/src/systems/level-visibility-system.tsx

```typescript
export function isDescendantOfLevel(
  nodeId: string,
  levelId: string,
  nodes: Record<string, NodeLike>,
): boolean {
  const MAX_DEPTH = 50
  const visited = new Set<string>()
  let currentId: string | null = nodeId
  let depth = 0

  while (currentId !== null && depth < MAX_DEPTH) {
    if (visited.has(currentId)) return false
    visited.add(currentId)

    const node = nodes[currentId]
    if (!node) return false
    if (node.parentId === levelId) return true
    if (node.parentId === null) return false

    currentId = node.parentId
    depth++
  }
  return false
}

export function processLevelVisibility(
  nodes: Record<string, NodeLike>,
  levelId: string | null,
  registryNodes: Map<string, unknown>,
): void {
  if (registryNodes.size === 0) return

  if (levelId === null) {
    for (const [, obj] of registryNodes) {
      const o = obj as { visible: boolean }
      if (o != null) o.visible = true
    }
    return
  }

  for (const [nodeId, obj] of registryNodes) {
    if (obj == null) continue
    const o = obj as { visible: boolean }
    const node = nodes[nodeId]
    if (!node) continue

    if (node.type === 'plant' || node.type === 'building') {
      o.visible = true
    } else if (nodeId === levelId) {
      o.visible = true
    } else if (node.type === 'level') {
      o.visible = false
    } else {
      o.visible = isDescendantOfLevel(nodeId, levelId, nodes)
    }
  }
}
```

### packages/kuhl-viewer/src/systems/interactive-system.tsx

```typescript
export function resolveSelectionPath(
  nodeId: string,
  nodes: Record<string, NodeLike>,
): SelectionPath {
  const path: SelectionPath = {
    plantId: null, buildingId: null, levelId: null, zoneId: null,
    selectedIds: [nodeId],
  }
  if (!nodes[nodeId]) return path

  let currentId: string | null = nodeId
  let depth = 0
  while (currentId !== null && depth < 50) {
    const node = nodes[currentId]
    if (!node) break
    if (node.type === 'plant') path.plantId = node.id
    else if (node.type === 'building') path.buildingId = node.id
    else if (node.type === 'level') path.levelId = node.id
    else if (node.type === 'hvac_zone') path.zoneId = node.id
    currentId = node.parentId
    depth++
  }
  return path
}

export function resolveHoveredNodeId(
  intersection: { object: unknown } | null | undefined,
  registryNodes: Map<string, unknown>,
): string | null {
  if (intersection == null) return null
  let current: unknown = intersection.object
  let depth = 0
  while (current != null && depth < 50) {
    for (const [nodeId, registryObj] of registryNodes) {
      if (registryObj === current) return nodeId
    }
    const obj = current as { parent?: unknown }
    current = obj.parent ?? null
    depth++
  }
  return null
}
```

---

## 品質評価

| 項目 | 結果 |
|------|------|
| テスト成功状況 | ✅ 23/23 通過 |
| 実装のシンプルさ | ✅ ループ+visitedSet、型キャストも最小限 |
| リファクタリング箇所 | processLevelVisibility の分岐を関数分割できる |
| 機能的問題 | なし |
| ファイルサイズ | level-visibility: ~130行、interactive: ~120行（800行以下） |
| モック使用 | 実装コードにモック・スタブなし |

---

## Refactor フェーズの候補

1. `processLevelVisibility` 内のノード判定ロジックをヘルパー関数に分割
2. `resolveHoveredNodeId` の線形スキャンを Map.entries イテレータ最適化
3. 型を `NodeLike` から `@kuhl/core` の `AnyNode` に変更
