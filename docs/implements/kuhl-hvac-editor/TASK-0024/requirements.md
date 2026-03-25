# TASK-0024: EquipmentSystem（ポート位置計算）要件定義

## 概要

EquipmentSystem は useFrame(priority=3) で動作するコアシステム。dirtyNodes から機器ノードを検出し、ポート位置をワールド座標で計算してノードを更新する。

## 参照要件

- REQ-203: ポート定義の可視化
- EDGE-003: ポート接続検証

## 機能要件

### FR-001: ポート位置計算（純粋関数）

- `calculatePortWorldPosition(portLocalOffset, equipmentPosition, equipmentRotation)`: ポートのローカルオフセットを機器の position + rotation で変換しワールド座標を返す
- rotation は Euler角（[rx, ry, rz]）として適用

### FR-002: ポート接続検証（純粋関数）

- `validatePortConnections(ports, allNodes)`: connectedTo が有効なノードIDかチェック
- 無効な connectedTo は警告レベル（将来の警告UI用に結果を返す）

### FR-003: dirtyNodes → ポート更新処理（processEquipmentSystem）

- dirtyNodes を走査し、機器ノード（isEquipmentNode）を検出
- 各ポートの position をワールド座標で再計算
- updateNode で ports を更新
- clearDirty で無限ループ防止

### FR-004: 未接続ポート検出

- `getUnconnectedPorts(node)`: connectedTo === null のポートリストを返す

## 非機能要件

- NFR-001: processEquipmentSystem は LoadCalcSystem と同様のパターン（useFrame priority=3）
- NFR-002: コアパッケージ（React/Three.js非依存）の純粋関数として実装

## エッジケース

- EC-001: ポートが空配列の機器ノード → スキップ
- EC-002: rotation が [0,0,0] → 位置変換なし（offset + position のみ）
- EC-003: connectedTo が削除済みノードID → 未接続として報告

## 実装ファイル

- `packages/kuhl-core/src/systems/equipment/equipment-system.ts`
- テスト: `packages/kuhl-core/src/__tests__/systems/equipment/equipment-system.test.ts`
