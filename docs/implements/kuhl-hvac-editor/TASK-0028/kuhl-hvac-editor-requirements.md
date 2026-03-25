# TASK-0028: 負荷→機器容量マッチング・系統ツリーパネル 要件定義

## 概要

1. 容量マッチング純粋関数: 冷却負荷→直近上位の標準容量に丸め
2. SystemTreePanel: 系統一覧ツリー表示、系統別フィルタ、系統色表示

## 機能要件

### 1. 容量マッチング純粋関数

- **REQ-028-001**: 標準容量テーブル [5.6, 11.2, 14, 22.4, 28, 45, 56, 71, 90, 112, 140] kW
- **REQ-028-002**: matchCapacity(coolingLoadKw) → 直近上位の標準容量を返す
- **REQ-028-003**: 負荷が0以下の場合、最小値(5.6)を返す
- **REQ-028-004**: 負荷が最大値(140)を超える場合、140を返す
- **REQ-028-005**: getRecommendedCapacities(coolingLoadKw) → 前後の候補を含む配列を返す

### 2. SystemTreePanel

- **REQ-028-006**: SystemNode一覧をuseSceneから取得
- **REQ-028-007**: systemType別フィルタ
- **REQ-028-008**: memberIds→各ノードをリスト表示
- **REQ-028-009**: 系統色(color)表示
- **REQ-028-010**: SYSTEM_TYPE_LABELS: 日本語ラベルマップ

## 実装ファイル

- `packages/kuhl-core/src/systems/equipment/capacity-matching.ts`
- `apps/kuhl-editor/components/panels/system-tree-panel.tsx`
- `apps/kuhl-editor/components/panels/system-tree-panel-view.tsx`

## テストファイル

- `packages/kuhl-core/src/__tests__/systems/equipment/capacity-matching.test.ts`
- `apps/kuhl-editor/__tests__/components/panels/system-tree-panel.test.tsx`
