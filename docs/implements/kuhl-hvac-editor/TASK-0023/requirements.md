# TASK-0023: DiffuserRenderer 要件定義

## 概要

DiffuserNode（制気口）を3Dビュー上に描画するレンダラーコンポーネント。subType別形状（8種）、天井/壁/床配置、neckSizeからサイズ算出を行う。

## 参照要件

- REQ-201: LOD100/LOD200 機器表示
- REQ-202: Diffuser配置ツール提供
- REQ-203: ポート定義の可視化
- REQ-206: タグ名ラベル表示

## 機能要件

### FR-001: subType別形状レンダリング

DiffuserNode.subType の値に応じて、以下の形状を生成する:

| subType | 形状 | Three.js Geometry |
|---------|------|-------------------|
| anemo | 円形ディスク | CylinderGeometry（低高さ） |
| line | 細長い矩形 | BoxGeometry（W >> H, D小さい） |
| universal | 正方形パネル | BoxGeometry（W == D） |
| slot | スリット | BoxGeometry（W >> D, H小さい） |
| ceiling_return | グリルパネル | BoxGeometry |
| floor_supply | 床吹出口 | CylinderGeometry |
| wall_grille | 壁付ガラリ | BoxGeometry |
| weather_louver | 外気ルーバー | BoxGeometry |

### FR-002: neckSize パース・サイズ算出

- "Φ200" → 直径 0.2m の円形（radius = 0.1）
- "300×150" → 幅 0.3m × 高さ 0.15m の矩形
- neckSize 未指定の場合 → デフォルトサイズ（0.3m × 0.3m）

### FR-003: ceilingMounted 配置

- ceilingMounted=true → Y方向にoffset（ceilingHeightは親ゾーンから取得するが、レンダラーでは position のみ使用）
- ceilingMounted=false → node.position をそのまま使用

### FR-004: 共通描画機能

- TagLabel 表示（機器上方に offset）
- PortMarkers 表示（ports 配列から）
- sceneRegistry 登録/解除
- SCENE_LAYER(0) への割り当て
- dimensions/position/rotation の適用
- visible !== false の場合のみ表示

### FR-005: エクスポート純粋関数

- `parseNeckSize(neckSize: string)`: neckSize文字列からサイズオブジェクトを返す
- `getDiffuserGeometryParams(subType, parsedSize)`: subType とサイズから geometry パラメータを返す
- `isDiffuserNode(node: unknown)`: DiffuserNode型ガード

## 非機能要件

- NFR-001: useMemo で geometry/material を最適化
- NFR-002: アンマウント時に geometry/material を dispose
- NFR-003: sceneRegistry の byType.diffuser に登録

## エッジケース

- EC-001: 存在しないノードID → null を返す
- EC-002: neckSize が不正な文字列 → デフォルトサイズにフォールバック
- EC-003: 空の ports 配列 → PortMarkers非表示
- EC-004: subType が未知の値 → universal 形状にフォールバック

## 実装ファイル

- `packages/kuhl-viewer/src/components/renderers/diffuser-renderer.tsx`
- テスト: `packages/kuhl-viewer/src/__tests__/components/renderers/diffuser-renderer.test.tsx`
