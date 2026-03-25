# TASK-0028: テストケース定義

## 容量マッチング純粋関数テスト

### matchCapacity
- **TC-001**: 冷却負荷50kW → 56kW
- **TC-002**: 冷却負荷5kW → 5.6kW
- **TC-003**: 冷却負荷14kW → 14kW（ちょうど）
- **TC-004**: 冷却負荷0kW → 5.6kW
- **TC-005**: 冷却負荷200kW → 140kW（上限）
- **TC-006**: 冷却負荷-10kW → 5.6kW

### getRecommendedCapacities
- **TC-007**: 50kW → [45, 56, 71] を含む
- **TC-008**: 5kW → [5.6] を含む（下限）

### STANDARD_CAPACITIES
- **TC-009**: 11要素の昇順配列

## SystemTreePanel純粋関数テスト

### getSystemsFromScene
- **TC-010**: system型ノードのみ抽出
- **TC-011**: 空のnodesで空配列

### filterBySystemType
- **TC-012**: systemType='supply_air' でフィルタ
- **TC-013**: filterType=undefined で全件

### getSystemMembers
- **TC-014**: memberIds から対応ノードを取得
- **TC-015**: 存在しないIDはスキップ

### SYSTEM_TYPE_LABELS
- **TC-016**: 全8種のラベルが定義されている
