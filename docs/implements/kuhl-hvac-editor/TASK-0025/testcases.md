# TASK-0025: AhuPlaceTool・PacPlaceTool テストケース

## 純粋関数テスト

### TC-001: generateNextTag - 既存ノード0件
- prefix: "AHU", existingTags: []
- 期待: "AHU-101"

### TC-002: generateNextTag - 既存1件
- prefix: "AHU", existingTags: ["AHU-101"]
- 期待: "AHU-102"

### TC-003: generateNextTag - ギャップあり
- prefix: "AHU", existingTags: ["AHU-101", "AHU-103"]
- 期待: "AHU-104"

### TC-004: generateNextTag - PAC prefix
- prefix: "PAC", existingTags: []
- 期待: "PAC-101"

### TC-005: createDefaultAhuPorts - 4ポート生成
- 期待: supply_air(out), return_air(in), chilled_water(in), chilled_water(out)

### TC-006: createDefaultAhuPorts - ポート位置がオフセット値を持つ
- 各ポートの position が [number, number, number]

### TC-007: createDefaultPacPorts - ceiling_cassette
- 期待: 冷媒2ポート + 給気/還気 = 4ポート

### TC-008: createDefaultPacPorts - outdoor_unit
- 期待: 冷媒2ポート（方向逆転）= 2ポート

### TC-009: createDefaultPacPorts - wall_mount
- 期待: 冷媒2ポート + 給気 = 3ポート

## コンポーネントテスト

### TC-010: AhuPlaceTool - 非アクティブ時 null
- tool !== 'ahu_place' → null

### TC-011: AhuPlaceTool - アクティブ時 描画
- tool === 'ahu_place' → 非null

### TC-012: PacPlaceTool - 非アクティブ時 null
- tool !== 'pac_place' → null

### TC-013: PacPlaceTool - アクティブ時 描画
- tool === 'pac_place' → 非null

### TC-014: AhuPlaceTool - confirmPlacement で AhuNode 作成
- confirmPlacement 呼び出し後、useScene にノードが追加される

### TC-015: PacPlaceTool - confirmPlacement で PacNode 作成
- confirmPlacement 呼び出し後、useScene にノードが追加される
