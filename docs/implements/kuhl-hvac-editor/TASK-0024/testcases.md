# TASK-0024: EquipmentSystem テストケース

## 純粋関数テスト

### TC-001: calculatePortWorldPosition - rotation [0,0,0]
- port offset [0.5, 0, 0], equipment position [1, 0, 0], rotation [0, 0, 0]
- 期待: [1.5, 0, 0]

### TC-002: calculatePortWorldPosition - Y軸90度回転
- port offset [0.5, 0, 0], equipment position [0, 0, 0], rotation [0, Math.PI/2, 0]
- 期待: 約 [0, 0, -0.5]

### TC-003: calculatePortWorldPosition - 任意position + rotation
- port offset [1, 0, 0], equipment position [2, 3, 4], rotation [0, Math.PI, 0]
- 期待: 約 [1, 3, 4]

### TC-004: validatePortConnections - 有効な接続
- connectedTo が存在するノードID → valid

### TC-005: validatePortConnections - 無効な接続
- connectedTo が存在しないノードID → invalid

### TC-006: validatePortConnections - null接続
- connectedTo === null → 未接続（valid）

### TC-007: getUnconnectedPorts - 未接続ポートのリスト
- ports 配列から connectedTo === null のポートのみ返す

### TC-008: getUnconnectedPorts - 全接続済み
- 全ポートが接続済み → 空配列

## システム処理テスト

### TC-009: processEquipmentSystem - 機器ノードのポート位置更新
- dirtyNodes に機器ノードを設定
- processEquipmentSystem 実行後、ポート位置が更新されること

### TC-010: processEquipmentSystem - 非機器ノードはスキップ
- dirtyNodes に hvac_zone ノードを設定 → スキップ

### TC-011: processEquipmentSystem - 空ポートの機器はスキップ
- ports が空の機器ノード → スキップ（updateNode呼ばれない）

### TC-012: processEquipmentSystem - clearDirty が呼ばれる
- 処理後に clearDirty が呼ばれること
