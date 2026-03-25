# TASK-0020: LevelVisibilitySystem・InteractiveSystem — Red フェーズ記録

**タスクID**: TASK-0020
**機能名**: kuhl-hvac-editor
**作成日**: 2026-03-25
**フェーズ**: Red（失敗テスト作成完了）

---

## 作成したテストケース一覧

| TC番号 | テスト対象 | テスト名 | 信頼性 |
|--------|-----------|---------|--------|
| TC-001 | isDescendantOfLevel | 直接の子ノード（parentId === levelId）で true を返す | 🔵 |
| TC-002 | isDescendantOfLevel | 孫ノード（zone配下のequipment）で true を返す | 🔵 |
| TC-003 | isDescendantOfLevel | 別レベル配下のノードで false を返す | 🔵 |
| TC-004 | isDescendantOfLevel | parentId が null のノード（ルートノード）で false を返す | 🔵 |
| TC-005 | isDescendantOfLevel | 深いネスト（3段以上）で正しく辿る | 🟡 |
| TC-006 | isDescendantOfLevel | 存在しない nodeId で false を返す | 🔵 |
| TC-007 | isDescendantOfLevel | 循環参照でも無限ループしない（最大深度制限） | 🟡 |
| TC-008 | processLevelVisibility | levelId=null で全ノード visible=true | 🔵 |
| TC-009 | processLevelVisibility | 選択レベル配下のノードのみ visible=true | 🔵 |
| TC-010 | processLevelVisibility | plant/building ノードは常に visible=true | 🔵 |
| TC-011 | processLevelVisibility | 選択レベル自体は visible=true、他レベルは visible=false | 🔵 |
| TC-012 | processLevelVisibility | registryNodes に未登録のノードはスキップ | 🔵 |
| TC-013 | processLevelVisibility | レベル切替時に前レベル配下が非表示になる | 🔵 |
| TC-014 | processLevelVisibility | 空の registryNodes で正常動作 | 🔵 |
| TC-015 | resolveSelectionPath | equipment → hvac_zone → level → building → plant の完全パスを解決 | 🟡 |
| TC-016 | resolveSelectionPath | level ノード直接選択時のパス解決 | 🟡 |
| TC-017 | resolveSelectionPath | hvac_zone ノード選択時のパス解決 | 🟡 |
| TC-018 | resolveSelectionPath | building ノード選択時（levelId, zoneId は null） | 🟡 |
| TC-019 | resolveSelectionPath | 存在しない nodeId でデフォルトパスを返す | 🔵 |
| TC-020 | resolveHoveredNodeId | intersection.object から registryNodes を逆引きして nodeId を返す | 🟡 |
| TC-021 | resolveHoveredNodeId | intersection.object の parent を辿って nodeId を返す | 🟡 |
| TC-022 | resolveHoveredNodeId | registryNodes に一致しない場合 null を返す | 🟡 |
| TC-023 | resolveHoveredNodeId | intersection が null/undefined の場合 null を返す | 🔵 |

**合計**: 23テストケース（🔵 青信号: 14 / 🟡 黄信号: 9 / 🔴 赤信号: 0）

---

## テスト実行結果（RED確認済み）

```
Test Files  1 failed (1)
      Tests  23 failed (23)
   Start at  11:06:47
   Duration  441ms
```

全23テストが `Error: Not implemented` で失敗。REDフェーズ確認済み。

---

## スタブファイル

### packages/kuhl-viewer/src/systems/level-visibility-system.tsx

```typescript
export function isDescendantOfLevel(_nodeId, _levelId, _nodes): boolean {
  throw new Error('Not implemented')
}

export function processLevelVisibility(_nodes, _levelId, _registryNodes): void {
  throw new Error('Not implemented')
}

export function LevelVisibilitySystem(): null {
  return null
}
```

### packages/kuhl-viewer/src/systems/interactive-system.tsx

```typescript
export function resolveSelectionPath(_nodeId, _nodes): SelectionPath {
  throw new Error('Not implemented')
}

export function resolveHoveredNodeId(_intersection, _registryNodes): string | null {
  throw new Error('Not implemented')
}

export function InteractiveSystem(): null {
  return null
}
```

---

## Green フェーズで実装すべき内容

### isDescendantOfLevel(nodeId, levelId, nodes)

- `nodes[nodeId]` が存在しない場合 → `false`
- `node.parentId === levelId` → `true`（直接の子）
- `node.parentId === null` → `false`（ルートノード）
- `node.parentId` を再帰的に辿り、`levelId` に一致したら `true`
- 循環参照防止: visited Set または最大深度 (10) で打ち切り → `false`

### processLevelVisibility(nodes, levelId, registryNodes)

- `levelId === null` → registryNodes の全エントリを `visible = true`
- `levelId` が設定されている場合:
  - `type === 'plant' || type === 'building'` → `visible = true`（常時）
  - `id === levelId` → `visible = true`（選択レベル自体）
  - `type === 'level' && id !== levelId` → `visible = false`（他レベル）
  - その他: `isDescendantOfLevel(id, levelId, nodes)` の結果で visible を設定
  - registryNodes に未登録（undefined）の場合はスキップ（エラーなし）

### resolveSelectionPath(nodeId, nodes)

- 初期パス: `{ plantId: null, buildingId: null, levelId: null, zoneId: null, selectedIds: [nodeId] }`
- `nodes[nodeId]` が存在しない場合 → 初期パスをそのまま返す
- `nodes[nodeId]` から親を辿り:
  - `type === 'plant'` → `path.plantId = id`
  - `type === 'building'` → `path.buildingId = id`
  - `type === 'level'` → `path.levelId = id`
  - `type === 'hvac_zone'` → `path.zoneId = id`
  - 選択ノード自身の type も判定対象
- `parentId === null` でループ終了

### resolveHoveredNodeId(intersection, registryNodes)

- `intersection === null || undefined` → `null`
- `intersection.object` が registryNodes の値に直接一致 → 対応する key (nodeId) を返す
- 一致しない場合: `intersection.object.parent` を辿って registryNodes の値を探す
- どの registryNode にも一致しない場合 → `null`
