# TASK-0025: AhuPlaceTool・PacPlaceTool 要件定義

## 概要

AHU（空調機）とPAC（パッケージエアコン）の配置ツール。ゴーストプレビュー、クリック確定→.parse()→createNode。ポート自動定義。タグ自動番号。

## 参照要件

- REQ-202: AHU, PAC配置ツール提供
- REQ-203: ポート定義の可視化
- REQ-206: タグ名自動番号

## 機能要件

### FR-001: タグ自動番号（純粋関数）

- `generateNextTag(prefix, existingNodes)`: 既存ノードから最大番号を検出→+1
- "AHU-101", "AHU-102" 形式
- ノードが0件の場合は "AHU-101" から開始

### FR-002: AHU デフォルトポート定義（純粋関数）

- `createDefaultAhuPorts()`: AHU 標準4ポート返す
  - 給気口 (supply_air, out)
  - 還気口 (return_air, in)
  - 冷水入口 (chilled_water, in)
  - 冷水出口 (chilled_water, out)

### FR-003: PAC デフォルトポート定義（純粋関数）

- `createDefaultPacPorts(subType)`: subType別ポート返す
  - 共通: 冷媒液管(in), 冷媒ガス管(out)
  - ceiling_cassette/ceiling_duct: 給気口(out), 還気口(in)
  - wall_mount: 給気口(out)
  - floor_standing: 給気口(out), 還気口(in)
  - outdoor_unit: 冷媒液管(out), 冷媒ガス管(in)

### FR-004: AhuPlaceTool コンポーネント

- useEditor.tool === 'ahu_place' 時のみアクティブ
- confirmPlacement(position, levelId) でノード確定
- AhuNode.parse() で生成、createNode で追加
- unmount 時にクリーンアップ

### FR-005: PacPlaceTool コンポーネント

- useEditor.tool === 'pac_place' 時のみアクティブ
- subType 選択状態を保持
- confirmPlacement(position, levelId, subType) でノード確定
- PacNode.parse() で生成

## エッジケース

- EC-001: 既存ノードが0件の場合 → 番号101から開始
- EC-002: タグにギャップがある場合（101, 103）→ 最大+1 = 104

## 実装ファイル

- `apps/kuhl-editor/components/tools/ahu-place-tool.tsx`
- `apps/kuhl-editor/components/tools/pac-place-tool.tsx`
- テスト: `apps/kuhl-editor/__tests__/components/tools/ahu-place-tool.test.tsx`
