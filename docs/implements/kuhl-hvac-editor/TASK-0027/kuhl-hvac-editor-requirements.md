# TASK-0027: SpecSheetPanel 要件定義

## 概要

SpecSheetPanel（右パネル）: 選択中機器の性能諸元を表示・編集するパネル。

## 機能要件

### 1. SpecSheetPanel メイン

- **REQ-027-001**: useViewer.selection.selectedIds から選択中ノードを取得
- **REQ-027-002**: ノードタイプ判定 → 対応フォーム表示（AHU/PAC/Diffuser/Fan/その他）
- **REQ-027-003**: 未選択時は「機器を選択してください」表示
- **REQ-027-004**: 複数選択時は最初の1件のみ表示

### 2. 共通フィールド

- **REQ-027-005**: tag（タグ名）編集 → updateNode
- **REQ-027-006**: equipmentName（機器名称）編集 → updateNode
- **REQ-027-007**: manufacturer（メーカー）編集 → updateNode
- **REQ-027-008**: systemId（系統ID）選択 → updateNode
- **REQ-027-009**: status（状態: planned/existing/demolished）選択 → updateNode

### 3. AHUフォーム

- **REQ-027-010**: coolingCapacity, heatingCapacity, airflowRate, staticPressure, motorPower, filterGrade, voltage, phase

### 4. PACフォーム

- **REQ-027-011**: coolingCapacity, cop, refrigerantType, ratedPower

### 5. Diffuserフォーム

- **REQ-027-012**: airflowRate, neckSize, throwDistance, noiseLevel

## パターン

zone-list-panel.tsx / zone-list-panel-view.tsx と同じパターン:
- spec-sheet-panel.tsx: 純粋関数群（JSXなし、node環境テスト可能）
- spec-sheet-panel-view.tsx: UIコンポーネント（JSX）

## 実装ファイル

- `apps/kuhl-editor/components/panels/spec-sheet-panel.tsx`
- `apps/kuhl-editor/components/panels/spec-sheet-panel-view.tsx`

## テストファイル

- `apps/kuhl-editor/__tests__/components/panels/spec-sheet-panel.test.tsx`
