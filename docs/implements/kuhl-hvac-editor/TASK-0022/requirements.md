# TASK-0022: EquipmentRenderer（LOD200 プロシージャル・GLB）- 詳細要件定義

**作成日**: 2026-03-25
**タスクID**: TASK-0022
**フェーズ**: Phase 3 - 機器配置
**関連要件**: REQ-201, REQ-208, REQ-209
**前提タスク**: TASK-0021（LOD100 EquipmentRenderer 完了）
**カバレッジ目標**: 60% 以上

---

## 1. 機能要件（Functional Requirements）

### FR-001: LOD 切替ロジック

**概要**: EquipmentRenderer が node.lod 属性に基づいて LOD100（既存 BoxGeometry）と LOD200（ProceduralEquipment または GlbModelRenderer）を切り替える。

**受入条件（EARS notation）**:

- **FR-001.1**: When `node.lod === '100'`, the system shall render the node using the existing LOD100 BoxGeometry implementation from TASK-0021.
- **FR-001.2**: When `node.lod === '200'` and `node.modelSrc` is defined, the system shall render the node using `GlbModelRenderer` wrapped in `Suspense`.
- **FR-001.3**: When `node.lod === '200'` and `node.modelSrc` is undefined, the system shall render the node using `ProceduralEquipment`.
- **FR-001.4**: When `node.lod` is undefined or not one of `'100'` | `'200'` | `'300'`, the system shall default to LOD100 BoxGeometry rendering.
- **FR-001.5**: When `node.lod === '300'`, the system shall default to LOD100 BoxGeometry rendering (future extension placeholder).
- **FR-001.6**: Regardless of LOD level, the system shall render `TagLabel` and `PortMarkers` as child components.
- **FR-001.7**: The LOD switching logic shall be integrated into the existing `EquipmentRenderer` component without breaking TASK-0021 LOD100 tests.

**切替フロー**:

```
EquipmentRenderer(nodeId)
├─ node.lod === '100' (or undefined/unknown)
│  └─ LOD100 BoxGeometry (TASK-0021 existing)
│
└─ node.lod === '200'
   ├─ node.modelSrc defined?
   │  ├─ Yes → <Suspense fallback={<Lod100Fallback />}>
   │  │           <GlbModelRenderer modelSrc={modelSrc} dimensions={dimensions} />
   │  │        </Suspense>
   │  └─ No  → <ProceduralEquipment type={node.type} dimensions={dimensions} color={color} />
   │
   └─ TagLabel + PortMarkers (always rendered)
```

---

### FR-002: GlbModelRenderer

**概要**: `node.modelSrc` が定義されている場合に、Drei の `useGLTF` フックで GLB/GLTF モデルを非同期読込する。

**受入条件（EARS notation）**:

- **FR-002.1**: When `modelSrc` is a valid URL string, the system shall load the GLB/GLTF model using `useGLTF(modelSrc)` from `@react-three/drei`.
- **FR-002.2**: When the GLB model is loaded, the system shall compute the model's bounding box via `THREE.Box3().setFromObject(scene)` and scale the model to fit within `node.dimensions`.
- **FR-002.3**: The system shall clone the loaded GLTF scene (`scene.clone()`) to avoid mutating the cached original.
- **FR-002.4**: When the GLB model is loading (Suspense pending), the system shall display the `Lod100Fallback` component as a fallback.
- **FR-002.5**: When the GLB file fails to load (network error, 404, corrupt file), the system shall fall back to LOD100 BoxGeometry rendering via an ErrorBoundary.
- **FR-002.6**: The scaling shall be computed as `[dimensions[0] / bboxSize.x, dimensions[1] / bboxSize.y, dimensions[2] / bboxSize.z]` to fit the model within the node dimensions.
- **FR-002.7**: The system shall render the loaded model using `<primitive object={clonedScene} />`.

**Props 仕様**:

```typescript
export interface GlbModelRendererProps {
  /** GLB/GLTF file URL */
  modelSrc: string
  /** Target dimensions [width, height, depth] for scaling */
  dimensions: [number, number, number]
}
```

**実装ファイル**: `packages/kuhl-viewer/src/components/renderers/parts/glb-model-renderer.tsx`

---

### FR-003: ProceduralEquipment

**概要**: `node.modelSrc` が未定義かつ `lod === '200'` の場合、機器タイプ別に簡易 3D 形状をプロシージャル生成する。

**受入条件（EARS notation）**:

- **FR-003.1**: When equipment type is `ahu`, the system shall generate a box shape with the full `dimensions` plus cylindrical intake/exhaust openings on the front and rear faces.
- **FR-003.2**: When equipment type is `pac`, the system shall generate a flat rectangular shape with dimensions `[width, height * 0.25, depth]` representing a ceiling-mounted cassette unit.
- **FR-003.3**: When equipment type is `fcu`, the system shall generate a compact box shape with dimensions `[width, height * 0.6, depth]` representing a fan coil unit.
- **FR-003.4**: When equipment type is not `ahu`, `pac`, or `fcu`, the system shall fall back to a LOD100-style BoxGeometry using the full `dimensions`.
- **FR-003.5**: The system shall apply the equipment color from `EQUIPMENT_COLOR_MAP` (via `getEquipmentColor(type)`) to the generated geometry material.
- **FR-003.6**: The system shall use `MeshStandardMaterial` with `roughness: 0.7` and `metalness: 0.1` consistent with LOD100 material properties.
- **FR-003.7**: The generated geometry and material shall be wrapped in `useMemo` to avoid unnecessary recomputation.

**タイプ別形状仕様**:

| Equipment Type | LOD200 Shape | Geometry Details |
|---------------|-------------|-----------------|
| `ahu` | Box + intake/exhaust openings | Main box: `dimensions[0] x dimensions[1] x dimensions[2]`; Cylindrical ports: `radius=0.05, height=0.1` on front/rear faces |
| `pac` | Flat rectangular (ceiling cassette) | `dimensions[0] x (dimensions[1] * 0.25) x dimensions[2]` |
| `fcu` | Compact box | `dimensions[0] x (dimensions[1] * 0.6) x dimensions[2]` |
| Other types | LOD100 box (fallback) | `dimensions[0] x dimensions[1] x dimensions[2]` |

**Props 仕様**:

```typescript
export interface ProceduralEquipmentProps {
  /** Equipment type (e.g., 'ahu', 'pac', 'fcu') */
  type: string
  /** Dimensions [width, height, depth] */
  dimensions: [number, number, number]
  /** Color hex code from EQUIPMENT_COLOR_MAP */
  color: string
}
```

**実装ファイル**: `packages/kuhl-viewer/src/components/renderers/parts/procedural-equipment.tsx`

---

### FR-004: Suspense Fallback (Lod100Fallback)

**概要**: GLB モデルの非同期読込中にユーザに対して即座に 3D 表示を提供するための LOD100 ボックスフォールバック。

**受入条件（EARS notation）**:

- **FR-004.1**: When GLB loading is in progress (Suspense pending state), the system shall display a `Lod100Fallback` component rendering a `THREE.BoxGeometry` with the node's `dimensions`.
- **FR-004.2**: The fallback box shall use the same `EQUIPMENT_COLOR_MAP` color as the target equipment type.
- **FR-004.3**: The fallback shall use `MeshStandardMaterial` with `roughness: 0.7`, `metalness: 0.1`, and `transparent: false`.
- **FR-004.4**: When GLB loading completes successfully, the fallback shall be replaced by the loaded GLB model.

**Props 仕様**:

```typescript
export interface Lod100FallbackProps {
  /** Dimensions [width, height, depth] */
  dimensions: [number, number, number]
  /** Color hex code */
  color: string
}
```

**実装ファイル**: `packages/kuhl-viewer/src/components/renderers/parts/lod100-fallback.tsx`

---

## 2. 非機能要件（Non-Functional Requirements）

### NFR-001: メモリ管理

- **NFR-001.1**: When `ProceduralEquipment` unmounts, the system shall call `geometry.dispose()` and `material.dispose()` via `useEffect` cleanup to prevent GPU memory leaks.
- **NFR-001.2**: When `GlbModelRenderer` unmounts, the system shall rely on `useGLTF`'s internal cache management for model disposal.
- **NFR-001.3**: When `Lod100Fallback` unmounts, the system shall dispose its BoxGeometry and MeshStandardMaterial.
- **NFR-001.4**: The system shall not create new geometry/material instances on every render cycle.

### NFR-002: パフォーマンス

- **NFR-002.1**: ProceduralEquipment geometry generation shall be wrapped in `useMemo` with `[type, dimensions[0], dimensions[1], dimensions[2]]` as dependencies.
- **NFR-002.2**: GlbModelRenderer bounding box computation and scaling shall be wrapped in `useMemo` with `[gltfScene, dimensions]` as dependencies.
- **NFR-002.3**: Multiple instances of the same GLB model (same `modelSrc`) shall share the cached GLTF data via `useGLTF`'s internal cache (URL-based deduplication).
- **NFR-002.4**: The LOD switching conditional shall not cause unnecessary re-renders when unrelated node properties change.

### NFR-003: Viewer Isolation

- **NFR-003.1**: All new components (`GlbModelRenderer`, `ProceduralEquipment`, `Lod100Fallback`) shall reside within `packages/kuhl-viewer/`.
- **NFR-003.2**: No imports from `apps/kuhl-editor` shall exist in any of these components.
- **NFR-003.3**: LOD switching logic shall be entirely within the viewer package, controlled by the `node.lod` data field.

### NFR-004: 型安全性

- **NFR-004.1**: All new components and functions shall have complete TypeScript type definitions.
- **NFR-004.2**: `ProceduralEquipmentProps.type` shall accept `string` (not a union type) to maintain extensibility for future equipment types.
- **NFR-004.3**: `GlbModelRendererProps.modelSrc` shall be typed as `string` (non-optional, validated before passing).

---

## 3. インターフェース仕様（Interface Specifications）

### 3.1 EquipmentRenderer (Modified)

```typescript
// packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx
// MODIFIED: Add LOD switching logic

export const EquipmentRenderer: FC<EquipmentRendererProps> = ({ nodeId }) => {
  // ... existing useScene, isEquipmentNode logic (TASK-0021) ...

  // NEW: LOD branch
  const lod = equipmentNode.lod ?? '100'

  if (lod === '200') {
    if (equipmentNode.modelSrc) {
      // GlbModelRenderer path
      return (
        <group position={...} rotation={...} visible={...}>
          <Suspense fallback={<Lod100Fallback dimensions={dimensions} color={color} />}>
            <GlbModelRenderer modelSrc={equipmentNode.modelSrc} dimensions={dimensions} />
          </Suspense>
          <TagLabel tag={equipmentNode.tag} offset={tagLabelOffset} />
          <PortMarkers ports={equipmentNode.ports ?? []} />
        </group>
      )
    }
    // ProceduralEquipment path
    return (
      <group position={...} rotation={...} visible={...}>
        <ProceduralEquipment type={equipmentNode.type} dimensions={dimensions} color={color} />
        <TagLabel tag={equipmentNode.tag} offset={tagLabelOffset} />
        <PortMarkers ports={equipmentNode.ports ?? []} />
      </group>
    )
  }

  // LOD100 path (existing TASK-0021 code, also default for unknown LOD values)
  return (
    <group position={...} rotation={...} visible={...}>
      <mesh ref={meshRef} geometry={geometry} material={material} ... />
      <TagLabel tag={equipmentNode.tag} offset={tagLabelOffset} />
      <PortMarkers ports={equipmentNode.ports ?? []} />
    </group>
  )
}
```

### 3.2 GlbModelRenderer

```typescript
// packages/kuhl-viewer/src/components/renderers/parts/glb-model-renderer.tsx

import { useGLTF } from '@react-three/drei'
import type { FC } from 'react'
import { useMemo } from 'react'
import * as THREE from 'three'

export interface GlbModelRendererProps {
  modelSrc: string
  dimensions: [number, number, number]
}

export const GlbModelRenderer: FC<GlbModelRendererProps>
```

### 3.3 ProceduralEquipment

```typescript
// packages/kuhl-viewer/src/components/renderers/parts/procedural-equipment.tsx

import type { FC } from 'react'

export interface ProceduralEquipmentProps {
  type: string
  dimensions: [number, number, number]
  color: string
}

export const ProceduralEquipment: FC<ProceduralEquipmentProps>
```

### 3.4 Lod100Fallback

```typescript
// packages/kuhl-viewer/src/components/renderers/parts/lod100-fallback.tsx

import type { FC } from 'react'

export interface Lod100FallbackProps {
  dimensions: [number, number, number]
  color: string
}

export const Lod100Fallback: FC<Lod100FallbackProps>
```

---

## 4. 純粋関数の分離（テスト容易性向上）

### 4.1 procedural-equipment.tsx から export

```typescript
/** AHU 用 LOD200 形状を生成する（box + intake/exhaust ports） */
export function generateAhuGeometry(dimensions: [number, number, number]): THREE.BufferGeometry

/** PAC 用 LOD200 形状を生成する（flat ceiling cassette） */
export function generatePacGeometry(dimensions: [number, number, number]): THREE.BufferGeometry

/** FCU 用 LOD200 形状を生成する（compact box） */
export function generateFcuGeometry(dimensions: [number, number, number]): THREE.BufferGeometry
```

### 4.2 glb-model-renderer.tsx から export

```typescript
/** GLTF scene を dimensions に合わせたスケール値を計算する */
export function computeModelScale(
  bboxSize: THREE.Vector3,
  dimensions: [number, number, number],
): [number, number, number]
```

---

## 5. エッジケース・エラーハンドリング

### EC-001: 無効な modelSrc パス

- **条件**: `modelSrc` が空文字列、または存在しない URL パスを参照
- **期待動作**: `useGLTF` の読込が失敗し、ErrorBoundary でキャッチ。LOD100 BoxGeometry にフォールバックする
- **テスト**: TC-LOD200-008

### EC-002: 破損した GLB ファイル

- **条件**: `modelSrc` が指す GLB ファイルが破損または不正なフォーマット
- **期待動作**: `useGLTF` がエラーをスローし、ErrorBoundary で LOD100 BoxGeometry にフォールバックする。コンソールにエラーログを出力する
- **テスト**: TC-LOD200-008

### EC-003: LOD 値が '100' でも '200' でもない

- **条件**: `node.lod` が `'300'`、未知の文字列、または `undefined`
- **期待動作**: LOD100 BoxGeometry レンダリングにデフォルトフォールバックする
- **テスト**: TC-LOD200-001

### EC-004: GLTF scene の bounding box サイズがゼロ

- **条件**: GLB モデルの bounding box の一次元以上がゼロ（空のシーンなど）
- **期待動作**: ゼロ除算を回避し、スケール値を `1.0` にフォールバックする
- **テスト**: TC-LOD200-008 サブケース

### EC-005: ProceduralEquipment に不明な機器タイプ

- **条件**: `type` が `ahu`, `pac`, `fcu` のいずれでもない
- **期待動作**: LOD100 スタイルの BoxGeometry（フル dimensions）で描画する
- **テスト**: TC-LOD200-006

### EC-006: dimensions にゼロまたは負の値（LOD200 時）

- **条件**: `dimensions` の一次元以上がゼロまたは負
- **期待動作**: TASK-0021 の `validateDimensions` と同様にハンドリング。ProceduralEquipment では最小値 `0.01` にクランプする
- **テスト**: TC-LOD200-007

### EC-007: Suspense fallback 表示中のノード更新

- **条件**: GLB 読込中にノードの dimensions/position/rotation が変更される
- **期待動作**: Lod100Fallback が新しい dimensions で再描画され、GLB 読込完了後に新 dimensions でスケーリングされる

---

## 6. テスト要件

### 6.1 テストファイル

`packages/kuhl-viewer/src/__tests__/components/renderers/equipment-lod200.test.tsx`

### 6.2 テストケース一覧

| TC | テスト名 | 対象 | 信頼性 | 優先度 |
|----|---------|------|-------|-------|
| TC-LOD200-001 | LOD='100' で既存 BoxGeometry 描画（後方互換性） | EquipmentRenderer | 🔵 | P0 |
| TC-LOD200-002 | LOD 未定義で LOD100 にデフォルトフォールバック | EquipmentRenderer | 🔵 | P0 |
| TC-LOD200-003 | LOD='200' + modelSrc 有で GlbModelRenderer 呼出 | EquipmentRenderer | 🟡 | P0 |
| TC-LOD200-004 | LOD='200' + modelSrc 無で ProceduralEquipment 呼出 | EquipmentRenderer | 🟡 | P0 |
| TC-LOD200-005 | Suspense fallback で Lod100Fallback が表示される | GlbModelRenderer | 🟡 | P0 |
| TC-LOD200-006 | ProceduralEquipment: AHU タイプ形状生成 | ProceduralEquipment | 🟡 | P1 |
| TC-LOD200-007 | ProceduralEquipment: PAC タイプ形状生成 | ProceduralEquipment | 🟡 | P1 |
| TC-LOD200-008 | ProceduralEquipment: FCU タイプ形状生成 | ProceduralEquipment | 🟡 | P1 |
| TC-LOD200-009 | ProceduralEquipment: 不明タイプで BoxGeometry フォールバック | ProceduralEquipment | 🔵 | P1 |
| TC-LOD200-010 | GLB 読込エラーで LOD100 フォールバック | GlbModelRenderer | 🟡 | P1 |
| TC-LOD200-011 | LOD200 でも TagLabel・PortMarkers が表示される | EquipmentRenderer | 🔵 | P0 |
| TC-LOD200-012 | computeModelScale: bounding box → scale 計算 | computeModelScale | 🔵 | P0 |
| TC-LOD200-013 | computeModelScale: bounding box ゼロサイズ対応 | computeModelScale | 🔵 | P1 |

### 6.3 テスト方針

- **テストフレームワーク**: Vitest
- **3D テスト**: React Three Test Renderer (`@react-three/test-renderer`) で Three.js シーングラフを検証
- **モック対象**:
  - `useScene` - Zustand ストアの状態を制御
  - `useGLTF` - Drei GLB ローダーのモック（Suspense テスト用）
  - `@react-three/drei` の `useGLTF` - 非同期読込の模擬
- **カバレッジ目標**: 60% 以上（line coverage）

### 6.4 純粋関数テスト（単体テスト、モック不要）

以下の純粋関数はモックなしで直接テスト可能:

| 関数 | テスト内容 |
|------|-----------|
| `generateAhuGeometry(dimensions)` | AHU 形状生成、正しい dimensions |
| `generatePacGeometry(dimensions)` | PAC 形状生成、height * 0.25 |
| `generateFcuGeometry(dimensions)` | FCU 形状生成、height * 0.6 |
| `computeModelScale(bboxSize, dimensions)` | スケール計算、ゼロサイズ対応 |

---

## 7. ファイル構成

### 新規作成ファイル

| ファイル | 行数目安 | 責務 |
|---------|---------|------|
| `packages/kuhl-viewer/src/components/renderers/parts/procedural-equipment.tsx` | ~250行 | LOD200 プロシージャル形状生成（AHU/PAC/FCU） |
| `packages/kuhl-viewer/src/components/renderers/parts/glb-model-renderer.tsx` | ~150行 | LOD200 GLB 読込（useGLTF + Suspense） |
| `packages/kuhl-viewer/src/components/renderers/parts/lod100-fallback.tsx` | ~80行 | Suspense fallback（LOD100 ボックス） |
| `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-lod200.test.tsx` | ~350行 | LOD200 テストスイート |

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx` | LOD 切替ロジック追加、Suspense 統合、ProceduralEquipment/GlbModelRenderer import |

### 既存再利用ファイル（変更なし）

| ファイル | 再利用内容 |
|---------|-----------|
| `packages/kuhl-viewer/src/constants/equipment-colors.ts` | `getEquipmentColor()`, `EQUIPMENT_COLOR_MAP` |
| `packages/kuhl-viewer/src/constants/layers.ts` | `SCENE_LAYER` |
| `packages/kuhl-viewer/src/components/renderers/parts/tag-label.tsx` | TagLabel コンポーネント |
| `packages/kuhl-viewer/src/components/renderers/parts/port-markers.tsx` | PortMarkers コンポーネント |

---

## 8. 依存関係

### 外部パッケージ依存

| パッケージ | 用途 | 既存/新規 |
|-----------|------|----------|
| `three` | BoxGeometry, CylinderGeometry, MeshStandardMaterial, Box3 | 既存 |
| `@react-three/fiber` | React Three Fiber hooks | 既存 |
| `@react-three/drei` | `useGLTF` (GLB 読込) | 既存 |
| `@kuhl/core` | useScene, HvacEquipmentBase, AnyNodeId | 既存 |
| `react` | Suspense, useMemo, useEffect | 既存 |

### 内部タスク依存

| タスク | 状態 | 依存内容 |
|--------|------|---------|
| TASK-0006 | 完了 | HvacEquipmentBase スキーマ（lod, modelSrc フィールド） |
| TASK-0010 | 完了 | sceneRegistry, EventEmitter |
| TASK-0012 | 完了 | Viewer Canvas, layers 定数 |
| TASK-0021 | 完了 | EquipmentRenderer LOD100 実装、TagLabel、PortMarkers、equipment-colors |

---

## 9. 信頼性評価

| 項目 | 信頼性 | 根拠 |
|------|-------|------|
| FR-001: LOD 切替ロジック | 🔵 | シンプルな条件分岐、TASK-0021 既存コード拡張 |
| FR-002: GlbModelRenderer | 🔵 | Drei useGLTF 実績あり、ドキュメント充実 |
| FR-003: ProceduralEquipment | 🟡 | REQ-208 から推測、具体的形状仕様は未確定 |
| FR-004: Suspense Fallback | 🔵 | React Suspense + R3F の標準パターン |
| NFR-001: メモリ管理 | 🟡 | 複数 GLB 読込時のメモリ確認が必要 |
| NFR-002: パフォーマンス | 🟡 | useMemo 戦略は標準だが、ProceduralEquipment のコスト要測定 |
| NFR-003: Viewer Isolation | 🔵 | packages/kuhl-viewer 内に完結 |

**総合信頼度**: 🟡 中程度 -- ProceduralEquipment の具体的形状定義と Suspense テスト実装の確認が重要

---

**作成者**: Claude Code
**最終更新**: 2026-03-25
