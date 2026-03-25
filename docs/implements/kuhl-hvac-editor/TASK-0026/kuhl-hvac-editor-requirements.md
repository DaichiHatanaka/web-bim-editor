# TASK-0026: DiffuserPlaceTool・FanPlaceTool 要件定義

## 概要

DiffuserPlaceTool（制気口配置ツール）とFanPlaceTool（ファン配置ツール）を実装する。

## 機能要件

### 1. DiffuserPlaceTool

- **REQ-026-001**: 天井面配置（ceilingMounted=true がデフォルト）
- **REQ-026-002**: subType 8種選択（anemo, line, universal, slot, ceiling_return, floor_supply, wall_grille, weather_louver）
- **REQ-026-003**: neckSize入力（"Φ200", "300×150" 等の文字列形式）
- **REQ-026-004**: ゴースト→確定→DiffuserNode.parse()→createNode
- **REQ-026-005**: タグ自動生成 "DIFF-{n}" 形式（101から開始）
- **REQ-026-006**: subType別デフォルトポート定義
  - 給気系（anemo, line, universal, slot, floor_supply）: supply_air in ポート
  - 還気系（ceiling_return）: return_air out ポート
  - 外壁系（wall_grille, weather_louver）: outside_air in or exhaust_air out ポート
- **REQ-026-007**: デフォルト寸法はsubType別に設定

### 2. FanPlaceTool

- **REQ-026-008**: FanNode.parse()→createNode
- **REQ-026-009**: タグ自動生成 "FAN-{n}" 形式（101から開始）
- **REQ-026-010**: デフォルト4ポート（supply_air out, return_air in, electric in, signal in）
- **REQ-026-011**: デフォルト寸法 [0.8, 0.6, 0.8]

### 3. 共通

- **REQ-026-012**: generateNextTag を既存 ahu-place-tool.tsx からインポートして再利用
- **REQ-026-013**: ToolManager に fan_place を登録
- **REQ-026-014**: useEditor に fan_place ツールを追加（equip フェーズ）

## 実装ファイル

- `apps/kuhl-editor/components/tools/diffuser-place-tool.tsx`
- `apps/kuhl-editor/components/tools/fan-place-tool.tsx`
- `apps/kuhl-editor/components/tool-manager.tsx`（fan_place追加）
- `apps/kuhl-editor/store/use-editor.ts`（fan_place追加）

## テストファイル

- `apps/kuhl-editor/__tests__/components/tools/diffuser-place-tool.test.tsx`
