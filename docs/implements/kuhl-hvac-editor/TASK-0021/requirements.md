# TASK-0021: EquipmentRenderer（LOD100 ボックス表示）- 詳細要件定義

**作成日**: 2026-03-25
**タスクID**: TASK-0021
**フェーズ**: Phase 3 - 機器配置
**関連要件**: REQ-201, REQ-203, REQ-206
**カバレッジ目標**: 60% 以上

---

## 1. 機能要件（Functional Requirements）

### FR-001: LOD100 ボックスジオメトリ レンダリング

**概要**: HvacEquipmentBase を継承する全機器ノードを BoxGeometry で描画する。

**受入条件（EARS notation）**:

- **FR-001.1**: When EquipmentRenderer receives a node with `lod === '100'`, the system shall create a `THREE.BoxGeometry` with arguments `(dimensions[0], dimensions[1], dimensions[2])`.
- **FR-001.2**: When a node has `position: [x, y, z]`, the system shall set the mesh position to `(x, y, z)`.
- **FR-001.3**: When a node has `rotation: [rx, ry, rz]`, the system shall set the mesh rotation to `(rx, ry, rz)` in radians (Euler order XYZ).
- **FR-001.4**: When `dimensions` changes on a node, the system shall regenerate the BoxGeometry via `useMemo` dependency tracking.
- **FR-001.5**: The mesh shall be assigned to `SCENE_LAYER (0)`.

**対象ノードタイプ（全13種）**:

| type | 説明 |
|------|------|
| `ahu` | 中央空調機 |
| `pac` | パッケージエアコン |
| `fcu` | ファンコイルユニット |
| `vrf_outdoor` | VRF 室外機 |
| `vrf_indoor` | VRF 室内機 |
| `diffuser` | 吹出口 |
| `damper` | ダンパー |
| `fan` | 送風機 |
| `pump` | ポンプ |
| `chiller` | チラー |
| `boiler` | ボイラー |
| `cooling_tower` | 冷却塔 |
| `valve` | 弁 |

### FR-002: 機器タイプ別カラーマップ

**概要**: `node.type` に基づいて EQUIPMENT_COLOR_MAP から色を選択し MeshStandardMaterial に適用する。

**受入条件**:

- **FR-002.1**: When EquipmentRenderer renders a node, the system shall look up the node's `type` in `EQUIPMENT_COLOR_MAP` and apply the corresponding hex color to the material.
- **FR-002.2**: When a node type is not found in the color map, the system shall apply a fallback color `#CCCCCC` (light gray).
- **FR-002.3**: The material shall use `MeshStandardMaterial` with the following properties:
  - `color`: EQUIPMENT_COLOR_MAP[type]
  - `transparent`: `false`
  - `roughness`: `0.7`
  - `metalness`: `0.1`

**カラーマップ定義**:

```typescript
export const EQUIPMENT_COLOR_MAP: Record<string, string> = {
  ahu: '#4A90E2',           // 青（中央空調機）
  pac: '#7ED321',           // 緑（パッケージエアコン）
  fcu: '#F39C12',           // 橙（ファンコイルユニット）
  vrf_outdoor: '#2C3E50',   // 濃紺（VRF 室外機）
  vrf_indoor: '#3498DB',    // 明るい青（VRF 室内機）
  diffuser: '#E74C3C',      // 赤（吹出口）
  damper: '#95A5A6',        // グレー（ダンパー）
  fan: '#9B59B6',           // 紫（送風機）
  pump: '#1ABC9C',          // ティール（ポンプ）
  chiller: '#27AE60',       // 深緑（チラー）
  boiler: '#E67E22',        // オレンジ（ボイラー）
  cooling_tower: '#16A085', // 深ティール（冷却塔）
  valve: '#34495E',         // 濃グレー（弁）
}

export const EQUIPMENT_FALLBACK_COLOR = '#CCCCCC'
```

**実装ファイル**: `packages/kuhl-viewer/src/constants/equipment-colors.ts`

### FR-003: TagLabel コンポーネント

**概要**: Drei の `Html` コンポーネントで機器タグ名（例: "AHU-101"）を 3D ビュー上に表示する。

**受入条件**:

- **FR-003.1**: When a node has a `tag` property, the system shall render the tag text above the equipment mesh using Drei `Html`.
- **FR-003.2**: The label shall be positioned at an offset of `[0, dimensions[1] / 2 + 0.3, 0]` relative to the equipment mesh center (above the top face with 0.3m margin).
- **FR-003.3**: The label shall have the following CSS properties:
  - `font-size`: `12px`
  - `font-weight`: `600`
  - `color`: `#333333`
  - `background`: `rgba(255, 255, 255, 0.85)`
  - `padding`: `2px 6px`
  - `border-radius`: `3px`
  - `white-space`: `nowrap`
  - `pointer-events`: `none`
  - `user-select`: `none`
- **FR-003.4**: When `tag` is empty or undefined, the system shall not render the TagLabel.
- **FR-003.5**: The `Html` element shall use `distanceFactor={10}` for consistent scaling across camera distances.
- **FR-003.6**: The `Html` element shall use `zIndexRange={[0, 0]}` to prevent z-fighting with other HTML overlays.

**Props 仕様**:

```typescript
export interface TagLabelProps {
  tag: string
  offset: [number, number, number]  // Y オフセット（dimensions依存）
}
```

**実装ファイル**: `packages/kuhl-viewer/src/components/renderers/parts/tag-label.tsx`

### FR-004: PortMarkers コンポーネント

**概要**: `node.ports` 配列から各ポートの相対位置に球マーカーを表示し、medium 別カラーと direction 別の視覚表現を適用する。

**受入条件**:

- **FR-004.1**: When a node has a `ports` array with one or more entries, the system shall render a sphere mesh at each port's `position` (relative to equipment center).
- **FR-004.2**: Each port marker sphere shall have `radius: 0.05` (meters).
- **FR-004.3**: The port marker color shall be determined by the port's `medium` according to the PORT_MEDIUM_COLOR_MAP.
- **FR-004.4**: When the port `direction` is `'in'`, the marker material `emissiveIntensity` shall be `0.3` (subdued glow).
- **FR-004.5**: When the port `direction` is `'out'`, the marker material `emissiveIntensity` shall be `0.6` (brighter glow).
- **FR-004.6**: Port markers shall be assigned to `EDITOR_LAYER (1)`.
- **FR-004.7**: When `ports` is empty or undefined, the system shall not render any PortMarkers.
- **FR-004.8**: Each port marker shall have its `name` property set to the port `id` for raycasting identification.

**ポート medium カラーマップ**:

```typescript
export const PORT_MEDIUM_COLOR_MAP: Record<string, string> = {
  // 空気系統
  supply_air: '#5DADE2',
  return_air: '#5DADE2',
  outside_air: '#5DADE2',
  exhaust_air: '#5DADE2',
  // 水系統
  chilled_water: '#2874A6',
  hot_water: '#2874A6',
  condenser_water: '#2874A6',
  // 冷媒系統
  refrigerant_liquid: '#28A745',
  refrigerant_gas: '#28A745',
  // 排水
  drain: '#999999',
  // 電気・信号
  electric: '#FFD700',
  signal: '#FFD700',
}

export const PORT_FALLBACK_COLOR = '#AAAAAA'
```

**Props 仕様**:

```typescript
import type { PortDef } from '@kuhl/core'

export interface PortMarkersProps {
  ports: PortDef[]
}
```

**実装ファイル**: `packages/kuhl-viewer/src/components/renderers/parts/port-markers.tsx`

### FR-005: EquipmentRenderer メインコンポーネント

**概要**: useScene からノードを取得し、FR-001〜FR-004 を統合する React Three Fiber コンポーネント。useRegistry と useNodeEvents で sceneRegistry に登録しイベントを購読する。

**受入条件**:

- **FR-005.1**: When EquipmentRenderer mounts with a valid `nodeId`, the system shall register the mesh ref in `sceneRegistry.nodes.set(nodeId, meshRef.current)`.
- **FR-005.2**: When EquipmentRenderer mounts, the system shall register the node type in `sceneRegistry.byType[node.type].add(nodeId)`.
- **FR-005.3**: When EquipmentRenderer unmounts, the system shall unregister from `sceneRegistry.nodes.delete(nodeId)` and `sceneRegistry.byType[node.type].delete(nodeId)`.
- **FR-005.4**: When EquipmentRenderer mounts, the system shall set up event listeners via `useNodeEvents(node, node.type)` for click/hover events.
- **FR-005.5**: When the node does not exist in useScene (deleted or invalid ID), the system shall return `null`.
- **FR-005.6**: EquipmentRenderer shall compose the following child components:
  - `<mesh>` with BoxGeometry and colored MeshStandardMaterial (FR-001, FR-002)
  - `<TagLabel>` with tag text and vertical offset (FR-003)
  - `<PortMarkers>` with ports array (FR-004)
- **FR-005.7**: When the node's `visible` property is `false`, the mesh group's `visible` property shall be set to `false`.

**Props 仕様**:

```typescript
import type { AnyNodeId } from '@kuhl/core'

export interface EquipmentRendererProps {
  nodeId: AnyNodeId
}
```

**実装ファイル**: `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx`

### FR-006: NodeRenderer 統合

**概要**: 既存の NodeRenderer のディスパッチで、機器タイプ（13種）を FallbackRenderer から EquipmentRenderer に切り替える。

**受入条件**:

- **FR-006.1**: When NodeRenderer receives a node with type in the 13 equipment types, the system shall dispatch to `<EquipmentRenderer nodeId={node.id} />` instead of `<FallbackRenderer>`.

---

## 2. 非機能要件（Non-Functional Requirements）

### NFR-001: パフォーマンス

- **NFR-001.1**: BoxGeometry と MeshStandardMaterial は `useMemo` で生成し、`dimensions` または `node.type` の変更時のみ再生成すること。
- **NFR-001.2**: 100 台の機器ノードを同時描画した際に、フレームレートが 30fps を下回らないこと（WebGPU 環境、標準的な GPU）。
- **NFR-001.3**: TagLabel の `Html` コンポーネントは `distanceFactor` を指定し、遠距離カメラ時に過度な DOM 要素生成を回避すること。

### NFR-002: メモリ管理

- **NFR-002.1**: `useEffect` クリーンアップで `geometry.dispose()` および `material.dispose()` を呼び出し、GPU メモリリークを防止すること。
- **NFR-002.2**: PortMarkers の球ジオメトリは共有インスタンス（`useMemo` で生成した単一 `SphereGeometry`）を使用し、ポート数分のジオメトリ生成を回避すること。
- **NFR-002.3**: sceneRegistry のクリーンアップは unmount 時に確実に実行されること（メモリリーク防止）。

### NFR-003: Viewer Isolation

- **NFR-003.1**: EquipmentRenderer、TagLabel、PortMarkers は全て `packages/kuhl-viewer/` 内に配置すること。
- **NFR-003.2**: `apps/kuhl-editor` からのインポートは一切行わないこと。
- **NFR-003.3**: editor 固有のロジック（tool interactions 等）は props/callbacks/children injection で受け取ること。

### NFR-004: 型安全性

- **NFR-004.1**: 全ての公開関数・コンポーネントに TypeScript 型定義を付与すること。
- **NFR-004.2**: `node.type` による分岐は TypeScript の discriminated union を活用すること。
- **NFR-004.3**: EQUIPMENT_COLOR_MAP のキーは `AnyNodeType` のサブセットとして型チェックされること。

---

## 3. インターフェース仕様（Interface Specifications）

### 3.1 EquipmentRenderer

```typescript
// packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx

import type { AnyNodeId } from '@kuhl/core'
import type { FC } from 'react'

export interface EquipmentRendererProps {
  nodeId: AnyNodeId
}

export const EquipmentRenderer: FC<EquipmentRendererProps>
```

**内部フロー**:

```
nodeId
  → useScene(state => state.nodes[nodeId])
  → node type guard (HvacEquipmentBase check)
  → useMemo: BoxGeometry(dimensions[0], dimensions[1], dimensions[2])
  → useMemo: MeshStandardMaterial({ color: EQUIPMENT_COLOR_MAP[type] })
  → useEffect: sceneRegistry.nodes.set / byType.add
  → useEffect: cleanup → dispose geometry/material, registry.delete
  → return <group position={position} rotation={rotation} visible={visible}>
       <mesh ref={meshRef} geometry material layers={SCENE_LAYER} />
       <TagLabel tag={tag} offset={[0, dimensions[1]/2 + 0.3, 0]} />
       <PortMarkers ports={ports} />
     </group>
```

### 3.2 TagLabel

```typescript
// packages/kuhl-viewer/src/components/renderers/parts/tag-label.tsx

import type { FC } from 'react'

export interface TagLabelProps {
  tag: string
  offset: [number, number, number]
}

export const TagLabel: FC<TagLabelProps>
```

### 3.3 PortMarkers

```typescript
// packages/kuhl-viewer/src/components/renderers/parts/port-markers.tsx

import type { PortDef } from '@kuhl/core'
import type { FC } from 'react'

export interface PortMarkersProps {
  ports: PortDef[]
}

export const PortMarkers: FC<PortMarkersProps>
```

### 3.4 定数ファイル

```typescript
// packages/kuhl-viewer/src/constants/equipment-colors.ts
export const EQUIPMENT_COLOR_MAP: Record<string, string>
export const EQUIPMENT_FALLBACK_COLOR: string
export function getEquipmentColor(type: string): string

// packages/kuhl-viewer/src/constants/port-styles.ts
export const PORT_MEDIUM_COLOR_MAP: Record<string, string>
export const PORT_FALLBACK_COLOR: string
export function getPortColor(medium: string): string
```

---

## 4. 純粋関数の分離（テスト容易性向上）

ZoneRenderer パターンに倣い、以下の純粋関数を export する:

### 4.1 equipment-renderer.tsx から export

```typescript
/** 機器ノードかどうかを判定する型ガード */
export function isEquipmentNode(node: unknown): node is HvacEquipmentBase

/** dimensions から BoxGeometry 引数を返す（バリデーション付き） */
export function validateDimensions(dimensions: [number, number, number]): boolean
```

### 4.2 equipment-colors.ts から export

```typescript
/** 機器タイプからカラーを取得する（fallback付き） */
export function getEquipmentColor(type: string): string
```

### 4.3 port-styles.ts から export

```typescript
/** ポート medium からカラーを取得する（fallback付き） */
export function getPortColor(medium: string): string
```

---

## 5. エッジケース・エラーハンドリング

### EC-001: 存在しないノードID

- **条件**: `nodeId` が useScene に存在しない（削除直後の race condition 含む）
- **期待動作**: `null` を返す（クラッシュしない）
- **テスト**: TC-005

### EC-002: dimensions がゼロまたは負の値

- **条件**: `dimensions` が `[0, 0, 0]` や `[-1, 2, 3]`
- **期待動作**: ゼロ以下の次元値は最小値 `0.01` にクランプする
- **テスト**: TC-002 のサブケース

### EC-003: 空の ports 配列

- **条件**: `ports` が空配列 `[]` または `undefined`
- **期待動作**: PortMarkers コンポーネントを描画しない（null を返す）
- **テスト**: TC-004

### EC-004: 空文字 tag

- **条件**: `tag` が `''`（空文字）
- **期待動作**: TagLabel コンポーネントを描画しない
- **テスト**: TC-003

### EC-005: 未知の medium タイプ

- **条件**: `port.medium` が PORT_MEDIUM_COLOR_MAP に存在しない
- **期待動作**: `PORT_FALLBACK_COLOR (#AAAAAA)` を適用する
- **テスト**: TC-004 のサブケース

### EC-006: 未知の機器タイプ

- **条件**: `node.type` が EQUIPMENT_COLOR_MAP に存在しない
- **期待動作**: `EQUIPMENT_FALLBACK_COLOR (#CCCCCC)` を適用する
- **テスト**: TC-002 のサブケース

### EC-007: node.visible === false

- **条件**: ノードの `visible` プロパティが `false`
- **期待動作**: group の `visible` を `false` に設定（sceneRegistry 登録は維持）
- **テスト**: TC-001 のサブケース

### EC-008: コンポーネント Unmount 時のクリーンアップ

- **条件**: EquipmentRenderer がアンマウントされる
- **期待動作**: geometry.dispose(), material.dispose() が呼ばれ、sceneRegistry から削除される
- **テスト**: TC-005

---

## 6. テスト要件

### 6.1 テストファイル

`packages/kuhl-viewer/src/__tests__/components/renderers/equipment-renderer.test.tsx`

### 6.2 テストケース一覧

| TC | テスト名 | 対象 | 信頼性 | 優先度 |
|----|---------|------|-------|-------|
| TC-001 | LOD100 BoxGeometry 描画 | EquipmentRenderer | 🔵 | P0 |
| TC-001a | dimensions → BoxGeometry 引数一致 | EquipmentRenderer | 🔵 | P0 |
| TC-001b | position/rotation 適用 | EquipmentRenderer | 🔵 | P0 |
| TC-001c | SCENE_LAYER 割当 | EquipmentRenderer | 🔵 | P1 |
| TC-001d | visible=false 時に非表示 | EquipmentRenderer | 🔵 | P1 |
| TC-002 | 機器タイプ別カラー適用 | getEquipmentColor | 🔵 | P0 |
| TC-002a | 全13タイプのカラー取得 | EQUIPMENT_COLOR_MAP | 🔵 | P0 |
| TC-002b | 未知タイプで fallback 色 | getEquipmentColor | 🔵 | P1 |
| TC-003 | TagLabel 表示 | TagLabel | 🔵 | P0 |
| TC-003a | tag テキストが表示される | TagLabel | 🔵 | P0 |
| TC-003b | offset 位置が正しい | TagLabel | 🔵 | P1 |
| TC-003c | 空文字 tag で非表示 | TagLabel | 🔵 | P1 |
| TC-004 | PortMarkers 表示 | PortMarkers | 🔵 | P0 |
| TC-004a | ポート数分の球メッシュ生成 | PortMarkers | 🔵 | P0 |
| TC-004b | medium 別カラー適用 | PortMarkers | 🔵 | P0 |
| TC-004c | direction 別 emissiveIntensity | PortMarkers | 🔵 | P1 |
| TC-004d | 空 ports 配列で非表示 | PortMarkers | 🔵 | P1 |
| TC-005 | useRegistry/useNodeEvents | EquipmentRenderer | 🟡 | P0 |
| TC-005a | sceneRegistry に登録される | EquipmentRenderer | 🟡 | P0 |
| TC-005b | unmount 時に削除される | EquipmentRenderer | 🟡 | P0 |
| TC-005c | 存在しないノードID → null | EquipmentRenderer | 🔵 | P1 |

### 6.3 テスト方針

- **テストフレームワーク**: Vitest
- **3D テスト**: React Three Test Renderer（`@react-three/test-renderer`）で Three.js シーングラフを検証
- **DOM テスト**: React Testing Library で TagLabel の HTML 出力を検証
- **モック対象**:
  - `useScene` - Zustand ストアの状態を制御
  - `sceneRegistry` - 登録/解除の呼び出しを検証
  - `@react-three/drei` の `Html` コンポーネント - DOM 出力の代替検証
- **カバレッジ目標**: 60% 以上（line coverage）

### 6.4 純粋関数テスト（単体テスト、モック不要）

以下の純粋関数はモックなしで直接テスト可能:

| 関数 | テスト内容 |
|------|-----------|
| `getEquipmentColor(type)` | 全13タイプのカラー値、fallback 値 |
| `getPortColor(medium)` | 全12 medium のカラー値、fallback 値 |
| `isEquipmentNode(node)` | 型ガード正否判定 |
| `validateDimensions(dims)` | ゼロ・負値チェック |

---

## 7. ファイル構成

### 新規作成ファイル

| ファイル | 行数目安 | 責務 |
|---------|---------|------|
| `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx` | ~200行 | メインレンダラーコンポーネント |
| `packages/kuhl-viewer/src/components/renderers/parts/tag-label.tsx` | ~80行 | タグラベル表示 |
| `packages/kuhl-viewer/src/components/renderers/parts/port-markers.tsx` | ~150行 | ポートマーカー表示 |
| `packages/kuhl-viewer/src/constants/equipment-colors.ts` | ~30行 | 機器カラーマップ定数 |
| `packages/kuhl-viewer/src/constants/port-styles.ts` | ~30行 | ポートカラーマップ定数 |
| `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-renderer.test.tsx` | ~300行 | テストスイート |

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` | 13機器タイプのディスパッチを FallbackRenderer → EquipmentRenderer に変更 |

---

## 8. 依存関係

### 外部パッケージ依存

| パッケージ | 用途 | 既存/新規 |
|-----------|------|----------|
| `three` | BoxGeometry, MeshStandardMaterial, SphereGeometry | 既存 |
| `@react-three/fiber` | React Three Fiber hooks (useFrame等) | 既存 |
| `@react-three/drei` | Html コンポーネント（TagLabel用） | 既存 |
| `@kuhl/core` | useScene, sceneRegistry, PortDef, AnyNodeId | 既存 |

### 内部タスク依存

| タスク | 状態 | 依存内容 |
|--------|------|---------|
| TASK-0006 | 完了 | HvacEquipmentBase, PortDef スキーマ |
| TASK-0010 | 完了 | sceneRegistry, EventEmitter |
| TASK-0012 | 完了 | Viewer Canvas, layers 定数 |
