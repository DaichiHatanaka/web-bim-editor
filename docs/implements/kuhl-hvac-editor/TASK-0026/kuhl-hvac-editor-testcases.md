# TASK-0026: テストケース定義

## 純粋関数テスト

### createDefaultDiffuserPorts
- **TC-001**: anemo subTypeで1ポート（supply_air in）を生成
- **TC-002**: ceiling_return subTypeで1ポート（return_air out）を生成
- **TC-003**: weather_louver subTypeでexhaust_airポートを生成
- **TC-004**: 全ポートにposition [x,y,z] が存在する

### getDiffuserDefaultDimensions
- **TC-005**: anemo → [0.6, 0.15, 0.6]
- **TC-006**: line → [1.2, 0.1, 0.2]
- **TC-007**: slot → [1.0, 0.08, 0.15]

### createDefaultFanPorts
- **TC-008**: 4ポート生成（supply_air, return_air, electric, signal）
- **TC-009**: 各ポートにpositionが存在する

### generateNextTag（再利用確認）
- **TC-010**: DIFF prefix で DIFF-101 を返す
- **TC-011**: FAN prefix で FAN-101 を返す

## コンポーネントテスト

### DiffuserPlaceTool
- **TC-012**: 非アクティブ時は null を返す
- **TC-013**: アクティブ時にツール状態が正しい

### FanPlaceTool
- **TC-014**: 非アクティブ時は null を返す
- **TC-015**: アクティブ時にツール状態が正しい

## 統合テスト

### confirmDiffuserPlacement
- **TC-016**: DiffuserNode が作成される（type === 'diffuser'）
- **TC-017**: subType が正しく設定される
- **TC-018**: ceilingMounted が true
- **TC-019**: タグが DIFF-xxx 形式

### confirmFanPlacement
- **TC-020**: FanNode が作成される（type === 'fan'）
- **TC-021**: タグが FAN-xxx 形式
- **TC-022**: ポートが4つ存在する
