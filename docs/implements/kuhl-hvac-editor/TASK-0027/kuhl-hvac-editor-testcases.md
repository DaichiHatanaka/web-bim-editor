# TASK-0027: テストケース定義

## 純粋関数テスト

### getSelectedEquipment
- **TC-001**: selectedIds にAHU IDがある場合、AHUノードを返す
- **TC-002**: selectedIds が空の場合、null を返す
- **TC-003**: selectedIds に非機器ノードがある場合、null を返す

### getEquipmentFormType
- **TC-004**: AHUノード → 'ahu' を返す
- **TC-005**: PACノード → 'pac' を返す
- **TC-006**: Diffuserノード → 'diffuser' を返す
- **TC-007**: Fanノード → 'fan' を返す

### getCommonFields
- **TC-008**: AHUノードから共通フィールド（tag, equipmentName, manufacturer, systemId, status）を抽出

### getAhuSpecFields
- **TC-009**: AHUノードからAHU固有フィールド（coolingCapacity, heatingCapacity等）を抽出

### getPacSpecFields
- **TC-010**: PACノードからPAC固有フィールド（coolingCapacity, cop等）を抽出

### getDiffuserSpecFields
- **TC-011**: DiffuserノードからDiffuser固有フィールド（airflowRate, neckSize等）を抽出

## 統合テスト

### updateEquipmentField
- **TC-012**: tag更新→updateNodeが呼ばれる
- **TC-013**: coolingCapacity更新→updateNodeが呼ばれる
- **TC-014**: 数値フィールドの文字列→数値変換
