# TASK-0020: LevelVisibilitySystem・InteractiveSystem テストケース定義書

**タスクID**: TASK-0020
**テストファイル**: `packages/kuhl-viewer/src/__tests__/systems/level-visibility.test.tsx`
**テスト環境**: node（純粋関数のため jsdom 不要）
**作成日**: 2026-03-25

---

## テスト対象関数

| 関数名 | 実装ファイル | 種別 |
|--------|-------------|------|
| `processLevelVisibility(nodes, levelId, registryNodes)` | `level-visibility-system.tsx` | 純粋関数 |
| `isDescendantOfLevel(nodeId, levelId, nodes)` | `level-visibility-system.tsx` | 純粋関数 |
| `resolveSelectionPath(nodeId, nodes)` | `interactive-system.tsx` | 純粋関数 |
| `resolveHoveredNodeId(intersection, registryNodes)` | `interactive-system.tsx` | 純粋関数 |

---

## 1. isDescendantOfLevel テストケース

### TC-001: 直接の子ノード（parentId === levelId）で true を返す
- **信頼性**: 🔵
- **入力**: nodeId=`zone_001`, levelId=`level_001`, nodes に zone_001.parentId = `level_001`
- **期待結果**: `true`
- **参照要件**: 要件定義書 セクション2.1.2 parentIdチェーン判定

### TC-002: 孫ノード（zone配下のequipment）で true を返す
- **信頼性**: 🔵
- **入力**: nodeId=`ahu_001`, nodes に ahu_001.parentId=`zone_001`, zone_001.parentId=`level_001`
- **期待結果**: `true`
- **参照要件**: 要件定義書 セクション2.1.2 特殊ケース

### TC-003: 別レベル配下のノードで false を返す
- **信頼性**: 🔵
- **入力**: nodeId=`zone_002`, nodes に zone_002.parentId=`level_002`, levelId=`level_001`
- **期待結果**: `false`
- **参照要件**: 要件定義書 セクション2.1.2 特殊ケース

### TC-004: parentId が null のノード（ルートノード）で false を返す
- **信頼性**: 🔵
- **入力**: nodeId=`plant_001`, nodes に plant_001.parentId=null, levelId=`level_001`
- **期待結果**: `false`
- **参照要件**: 要件定義書 セクション2.1.2

### TC-005: 深いネスト（3段以上）で正しく辿る
- **信頼性**: 🟡
- **入力**: nodeId=`diffuser_001`, nodes に diffuser.parentId=`ahu_001`, ahu.parentId=`zone_001`, zone.parentId=`level_001`
- **期待結果**: `true`
- **参照要件**: 要件定義書 セクション4.3 EDGE-05

### TC-006: 存在しないnodeIdで false を返す
- **信頼性**: 🔵
- **入力**: nodeId=`nonexistent`, levelId=`level_001`, nodes に該当なし
- **期待結果**: `false`
- **参照要件**: 防御的プログラミング

### TC-007: 循環参照でも無限ループしない（最大深度制限）
- **信頼性**: 🟡
- **入力**: nodeA.parentId=nodeB, nodeB.parentId=nodeA（循環参照）
- **期待結果**: `false`（最大深度で打ち切り）
- **参照要件**: 要件定義書 セクション4.3 EDGE-05

---

## 2. processLevelVisibility テストケース

### TC-008: levelId=null で全ノード visible=true
- **信頼性**: 🔵
- **入力**: levelId=null, nodes に複数のノード, registryNodes にObject3Dモック
- **期待結果**: 全Object3D.visible = true
- **参照要件**: 要件定義書 セクション2.1.1 処理ロジック、セクション4.3 EDGE-01

### TC-009: 選択レベル配下のノードのみ visible=true
- **信頼性**: 🔵
- **入力**: levelId=`level_001`, level_001配下のzone, 別level_002配下のzone
- **期待結果**: level_001配下 visible=true, level_002配下 visible=false
- **参照要件**: 要件定義書 セクション2.1.1 処理ロジック、UC-01

### TC-010: plant/building ノードは常に visible=true
- **信頼性**: 🔵
- **入力**: levelId=`level_001`, plant_001, building_001
- **期待結果**: plant, building ともに visible=true
- **参照要件**: 要件定義書 セクション2.1.1 空間ノード、セクション4.3 EDGE-06

### TC-011: 選択レベル自体は visible=true、他レベルは visible=false
- **信頼性**: 🔵
- **入力**: levelId=`level_001`, registryNodes に level_001, level_002
- **期待結果**: level_001 visible=true, level_002 visible=false
- **参照要件**: 要件定義書 セクション2.1.1 処理ロジック

### TC-012: registryNodes に未登録のノードはスキップ
- **信頼性**: 🔵
- **入力**: nodes に zone_001 が存在, registryNodes に zone_001 が未登録
- **期待結果**: エラーなし（スキップ）
- **参照要件**: 要件定義書 セクション4.3 EDGE-02

### TC-013: レベル切替時に前レベル配下が非表示になる
- **信頼性**: 🔵
- **入力**: 1回目 levelId=`level_001` → 2回目 levelId=`level_002`
- **期待結果**: 2回目で level_001配下 visible=false, level_002配下 visible=true
- **参照要件**: 要件定義書 UC-02

### TC-014: 空のregistryNodes で正常動作
- **信頼性**: 🔵
- **入力**: levelId=`level_001`, registryNodes=空Map
- **期待結果**: エラーなし
- **参照要件**: 防御的プログラミング

---

## 3. resolveSelectionPath テストケース

### TC-015: equipment → hvac_zone → level → building → plant の完全パスを解決
- **信頼性**: 🟡
- **入力**: nodeId=`fcu_001`, nodes に fcu→zone→level→building→plant の階層
- **期待結果**: `{ plantId, buildingId, levelId, zoneId, selectedIds: ['fcu_001'] }`
- **参照要件**: 要件定義書 セクション2.2.3 resolveSelectionPath

### TC-016: level ノード直接選択時のパス解決
- **信頼性**: 🟡
- **入力**: nodeId=`level_001`, nodes に level→building→plant
- **期待結果**: `{ plantId, buildingId, levelId: 'level_001', zoneId: null, selectedIds: ['level_001'] }`
- **参照要件**: 要件定義書 セクション2.2.3

### TC-017: hvac_zone ノード選択時のパス解決（zoneId が設定される）
- **信頼性**: 🟡
- **入力**: nodeId=`zone_001`, nodes に zone→level→building→plant
- **期待結果**: `{ plantId, buildingId, levelId, zoneId: 'zone_001', selectedIds: ['zone_001'] }`
- **参照要件**: 要件定義書 セクション2.2.3

### TC-018: building ノード選択時（levelId, zoneId は null）
- **信頼性**: 🟡
- **入力**: nodeId=`building_001`, nodes に building→plant
- **期待結果**: `{ plantId, buildingId: 'building_001', levelId: null, zoneId: null, selectedIds: ['building_001'] }`
- **参照要件**: 要件定義書 セクション2.2.3

### TC-019: 存在しない nodeId でデフォルトパスを返す
- **信頼性**: 🔵
- **入力**: nodeId=`nonexistent`, nodes=空
- **期待結果**: `{ plantId: null, buildingId: null, levelId: null, zoneId: null, selectedIds: ['nonexistent'] }`
- **参照要件**: 防御的プログラミング

---

## 4. resolveHoveredNodeId テストケース

### TC-020: intersection.object から registryNodes を逆引きして nodeId を返す
- **信頼性**: 🟡
- **入力**: intersection.object = mockObject3D, registryNodes に `ahu_001` → mockObject3D
- **期待結果**: `'ahu_001'`
- **参照要件**: 要件定義書 セクション2.2.1 ホバーハイライト

### TC-021: intersection.object の parent を辿って registryNodes に一致する nodeId を返す
- **信頼性**: 🟡
- **入力**: intersection.object = childMesh, childMesh.parent = parentGroup, registryNodes に `ahu_001` → parentGroup
- **期待結果**: `'ahu_001'`
- **参照要件**: 要件定義書 セクション2.2.1（Object3Dのtraverse/parent辿り）

### TC-022: registryNodes に一致しない場合 null を返す
- **信頼性**: 🟡
- **入力**: intersection.object = unknownMesh, registryNodes に該当なし
- **期待結果**: `null`
- **参照要件**: 要件定義書 セクション4.3 EDGE-03

### TC-023: intersection が null/undefined の場合 null を返す
- **信頼性**: 🔵
- **入力**: intersection = null
- **期待結果**: `null`
- **参照要件**: 防御的プログラミング

---

## テストケースサマリー

| グループ | テストケース数 | 🔵 青 | 🟡 黄 |
|---------|-------------|-------|-------|
| isDescendantOfLevel | 7 | 5 | 2 |
| processLevelVisibility | 7 | 7 | 0 |
| resolveSelectionPath | 5 | 1 | 4 |
| resolveHoveredNodeId | 4 | 1 | 3 |
| **合計** | **23** | **14** | **9** |
