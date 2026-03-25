# TASK-0023: DiffuserRenderer テストケース

## 純粋関数テスト

### TC-001: parseNeckSize - 円形 "Φ200"
- 入力: "Φ200"
- 期待: { type: 'circular', diameter: 0.2 }

### TC-002: parseNeckSize - 矩形 "300×150"
- 入力: "300×150"
- 期待: { type: 'rectangular', width: 0.3, height: 0.15 }

### TC-003: parseNeckSize - undefined
- 入力: undefined
- 期待: { type: 'rectangular', width: 0.3, height: 0.3 } (デフォルト)

### TC-004: parseNeckSize - 不正文字列
- 入力: "invalid"
- 期待: デフォルトサイズ

### TC-005: getDiffuserGeometryParams - anemo (円形)
- subType: 'anemo', circular size
- 期待: CylinderGeometry パラメータ

### TC-006: getDiffuserGeometryParams - line (矩形)
- subType: 'line', rectangular size
- 期待: BoxGeometry パラメータ (W大, H小, D小)

### TC-007: getDiffuserGeometryParams - universal
- subType: 'universal'
- 期待: BoxGeometry パラメータ (W == D)

### TC-008: getDiffuserGeometryParams - slot
- subType: 'slot'
- 期待: BoxGeometry パラメータ (W大, D小, H小)

### TC-009: getDiffuserGeometryParams - 全8種が非null
- 全subType で結果が返ること

### TC-010: isDiffuserNode - 有効なDiffuserNode
- DiffuserNode.parse() したノード → true

### TC-011: isDiffuserNode - AhuNode
- AhuNode → false

### TC-012: isDiffuserNode - null/undefined
- null → false

## コンポーネントテスト

### TC-013: DiffuserRenderer - 有効ノードで描画
- DiffuserNode を useScene に設定
- DiffuserRenderer がレンダリングされること

### TC-014: DiffuserRenderer - sceneRegistry 登録
- マウント時に sceneRegistry.nodes に登録

### TC-015: DiffuserRenderer - sceneRegistry 解除
- アンマウント時に sceneRegistry から削除

### TC-016: DiffuserRenderer - 存在しないノードID
- 存在しないID → null を返す

### TC-017: DiffuserRenderer - TagLabel 表示
- tag が設定されていれば TagLabel が表示される

### TC-018: DiffuserRenderer - PortMarkers 表示
- ports が設定されていれば PortMarkers が表示される

### TC-019: DiffuserRenderer - position/rotation 適用
- group に position, rotation が設定されること
