# TASK-0014: ZoneDrawTool 実装メモ

**作成日**: 2026-03-25
**タスクID**: TASK-0014
**タスクタイプ**: TDD
**推定工数**: 8時間
**フェーズ**: Phase 2 - ゾーニング＋負荷概算
**関連ファイル**:
- `apps/kuhl-editor/components/tools/zone-draw-tool.tsx` (実装)
- `apps/kuhl-editor/__tests__/components/tools/zone-draw-tool.test.tsx` (テスト)

---

## タスク概要

**ZoneDrawTool**: ポリゴン描画ツール。ユーザーが3D ビュー上をクリックしてゾーンの頂点を追加し、ポリゴンをリアルタイム プレビュー表示。Enter キーで確定して HvacZoneNode.parse() により新規ゾーンノードを作成・useScene.createNode で永続化。ESC キーでキャンセル。unmount 時にクリーンアップ。

### 主要機能

1. **ポリゴン頂点クリック・追加** (レッドフェーズ)
   - 3D ビュー上のクリックで [x, z] 座標を取得
   - ローカル state に頂点配列を保持
   - 半透明ポリゴンでリアルタイムプレビュー（シーン保存しない）

2. **Enter 確定・ノード作成** (グリーンフェーズ)
   - Enter キー → HvacZoneNode.parse({ boundary, zoneName, usage, floorArea, designConditions })
   - useScene.createNode(zone, levelId) で scene store に永続化
   - 面積は boundary から自動算出

3. **ESC キャンセル** (グリーンフェーズ)
   - 入力中断、プレビュークリア、頂点リセット

4. **ゾーン属性入力ダイアログ** (グリーンフェーズ)
   - Enter 確定後にモーダルダイアログ表示
   - ゾーン名 (zoneName)、用途 (ZoneUsage)、設計条件 (DesignConditions) 入力
   - 確定で useScene.updateNode() で追加属性を保存

5. **unmount クリーンアップ** (リファクタリングフェーズ)
   - 未完成ノードの削除
   - イベントリスナーの削除
   - 一時的な プレビュー geometry の破棄

---

## 依存タスク実装状況

### TASK-0005: HvacZoneNode スキーマ ✅

**実装ファイル**: `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`

**概要**: HvacZoneNode Zod スキーマが定義済み。

**重要な型とスキーマ**:
```typescript
// ZoneUsage 列挙型 (11種)
export type ZoneUsage =
  | 'office' | 'meeting' | 'server_room' | 'lobby' | 'corridor'
  | 'toilet' | 'kitchen' | 'warehouse' | 'mechanical_room' | 'electrical_room'
  | 'other'

// DesignConditions: 設計条件
export type DesignConditions = {
  summerDryBulb: number          // default: 26°C
  summerHumidity: number         // default: 50%
  winterDryBulb: number          // default: 22°C
  winterHumidity: number         // default: 40%
  ventilationRate?: number
  freshAirRate?: number
}

// HvacZoneNode
export type HvacZoneNode = {
  id: string                     // zone_xxx
  type: 'hvac_zone'
  zoneName: string
  zoneCode?: string
  usage: ZoneUsage
  floorArea: number
  ceilingHeight: number          // default: 2.7m
  occupancy?: number
  lightingDensity?: number
  equipmentDensity?: number
  designConditions: DesignConditions
  loadResult?: LoadCalcResult
  hvacType?: HvacType
  systemId?: string
  boundary?: [number, number][]  // [[x, z], ...]
  orientation?: Orientation
  glazingRatio?: number
  parentId: string | null        // Level ID
}
```

**使用方法**:
```typescript
const zone = HvacZoneNode.parse({
  zoneName: '会議室 A',
  usage: 'meeting',
  floorArea: 100,
  boundary: [[0, 0], [10, 0], [10, 5], [0, 5]],
  designConditions: { /* ... */ }
})
// → zone.id は自動生成 (zone_abc123...)
```

### TASK-0009: useScene ストア・CRUD ✅

**実装ファイル**:
- `packages/kuhl-core/src/store/use-scene.ts` (ストア定義)
- `packages/kuhl-core/src/store/actions/node-actions.ts` (CRUD アクション)

**概要**: useScene Zustand + Zundo ストア。AnyNode 型でフラット辞書管理。CRUD + undo/redo。

**ストア API**:
```typescript
type SceneState = {
  nodes: Record<AnyNodeId, AnyNode>
  rootNodeIds: AnyNodeId[]
  dirtyNodes: Set<AnyNodeId>

  // Actions
  createNode: (node: AnyNode, parentId?: AnyNodeId) => void
  updateNode: (id: AnyNodeId, data: Partial<AnyNode>) => void
  deleteNode: (id: AnyNodeId) => void
  markDirty: (id: AnyNodeId) => void
  clearDirty: (id: AnyNodeId) => void
}
```

**使用例**:
```typescript
import useScene from '@kuhl/core'

// ノード作成
const zone = HvacZoneNode.parse({ /* ... */ })
useScene.getState().createNode(zone, levelId)
// → nodes[zone.id] に追加、parentId 設定、dirtyNodes にマーク

// ノード更新
useScene.getState().updateNode(zoneId, { zoneName: '新しい名前' })

// 削除
useScene.getState().deleteNode(zoneId)

// undo/redo
useScene.temporal.getState().undo()
useScene.temporal.getState().redo()
```

### TASK-0013: HvacZoneRenderer ✅

**実装ファイル**: `packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx`

**概要**: HvacZoneNode.boundary ポリゴンを半透明着色メッシュで描画する React Three Fiber コンポーネント。

**主要な exported utilities**:
```typescript
// boundary 妥当性判定
export function isValidBoundary(boundary: unknown): boolean

// boundary → THREE.Shape 変換
export function boundaryToShape(boundary: [number, number][]): THREE.Shape

// usage → カラーマップ取得
export function getZoneColor(usage: ZoneUsage): { color: string; opacity: number }

// 重心座標計算
export function computeCentroid(boundary: [number, number][]): [number, number]

// コンポーネント
export const ZoneRenderer: FC<{ nodeId: AnyNodeId }>
```

**カラーマップ** (usage 別):
```
office: 青 (#4A90E2, opacity 0.3)
meeting: 緑 (#7ED321, opacity 0.3)
server_room: 赤 (#FF4757, opacity 0.3)
lobby: 灰色 (#A8A8A8, opacity 0.3)
corridor: 薄灰 (#C8C8C8, opacity 0.3)
toilet: 紫 (#9B59B6, opacity 0.3)
kitchen: 橙 (#F39C12, opacity 0.3)
... 他
```

---

## 既存コード要点

### 1. HvacZoneNode.parse() 使用パターン

**ファイル**: `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`

HvacZoneNode は Zod スキーマ。`.parse()` で入力を検証・型変換し、ID を自動生成。

```typescript
import { HvacZoneNode, type ZoneUsage, type DesignConditions } from '@kuhl/core'

// ZoneDrawTool で使用する際のパターン
const boundary: [number, number][] = [[0,0], [10,0], [10,5], [0,5]]
const zoneName = 'Meeting Room'
const usage: ZoneUsage = 'meeting'
const floorArea = 50  // m²

// boundary から面積を計算 (既存のユーティリティ関数があればそれを使用)
// または HvacZoneNode.parse に boundary を指定すれば自動?

const zone = HvacZoneNode.parse({
  zoneName,
  usage,
  floorArea,
  boundary,
  designConditions: {
    summerDryBulb: 26,
    summerHumidity: 50,
    winterDryBulb: 22,
    winterHumidity: 40,
  },
})
// zone.id は自動生成 (zone_abc123...)
```

### 2. useScene.createNode() CRUD パターン

**ファイル**: `packages/kuhl-core/src/store/use-scene.ts`

```typescript
import useScene from '@kuhl/core'

const state = useScene.getState()

// ノード作成（親指定）
state.createNode(zone, levelId)
// → nodes[zone.id] に追加
// → zone.parentId = levelId
// → dirtyNodes に zone.id をマーク

// ノード更新
state.updateNode(zoneId, { zoneName: '新しい名前' })

// ノード削除
state.deleteNode(zoneId)
```

### 3. useEditor ツール管理

**ファイル**: `apps/kuhl-editor/store/use-editor.ts`

```typescript
import useEditor, { type Tool } from '../store/use-editor'

// 現在のツールを取得
const currentTool = useEditor((state) => state.tool)

// ツールを切り替え
useEditor.getState().setTool('zone_draw')

// 現在のフェーズを取得
const phase = useEditor((state) => state.phase)

// フェーズ内の利用可能ツール一覧
const availableTools = useEditor.getState().getAvailableTools()
// zone フェーズ: ['select', 'zone_draw', 'zone_edit', 'load_calc']
```

---

## 実装ファイル構成

### 実装ファイル

**ファイルパス**: `apps/kuhl-editor/components/tools/zone-draw-tool.tsx`

```typescript
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { HvacZoneNode, useScene, sceneRegistry, type AnyNodeId } from '@kuhl/core'
import useEditor from '../../store/use-editor'

/**
 * ZoneDrawTool: ポリゴン描画ツール
 *
 * 機能:
 * - クリックで頂点追加
 * - Enter で確定（HvacZoneNode 作成）
 * - ESC でキャンセル
 * - unmount でクリーンアップ
 */
export const ZoneDrawTool: FC = () => {
  // ローカル state: 頂点配列（プレビュー用）
  const [vertices, setVertices] = useState<[number, number][]>([])

  // 属性入力ダイアログ表示フラグ
  const [showDialog, setShowDialog] = useState(false)

  // 一時的なプレビューメッシュ ref
  const previewMeshRef = useRef<THREE.Mesh | null>(null)

  // 現在のレベル ID（Viewer から parent context で取得）
  const levelId = useRef<AnyNodeId | null>(null)

  // イベントリスナー登録・クリーンアップ
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // 3D ビュー座標取得、頂点追加
      const [x, z] = getClickCoordinates(e)
      setVertices(prev => [...prev, [x, z]])
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // 確定: HvacZoneNode 作成 → ダイアログ表示
        if (vertices.length >= 3) {
          setShowDialog(true)
        }
      } else if (e.key === 'Escape') {
        // キャンセル: 頂点リセット
        setVertices([])
        // プレビュー破棄
        if (previewMeshRef.current) {
          sceneRegistry.nodes.delete(previewMeshRef.current.uuid as AnyNodeId)
          previewMeshRef.current.geometry.dispose()
          previewMeshRef.current.material.dispose()
          previewMeshRef.current = null
        }
      }
    }

    window.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleKeyDown)
      // cleanup
      if (previewMeshRef.current) {
        previewMeshRef.current.geometry.dispose()
        previewMeshRef.current.material.dispose()
      }
    }
  }, [vertices])

  // ダイアログコンポーネント: 属性入力
  const handleConfirmDialog = (zoneName: string, usage: ZoneUsage) => {
    const floorArea = computePolygonArea(vertices)
    const zone = HvacZoneNode.parse({
      zoneName,
      usage,
      floorArea,
      boundary: vertices,
      designConditions: { /* defaults */ }
    })

    useScene.getState().createNode(zone, levelId.current!)
    setVertices([])
    setShowDialog(false)
  }

  return (
    <>
      {/* プレビューポリゴン（ローカル描画） */}
      {vertices.length >= 3 && (
        <PreviewPolygon vertices={vertices} />
      )}

      {/* 属性入力ダイアログ */}
      {showDialog && (
        <ZoneAttributeDialog
          onConfirm={handleConfirmDialog}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </>
  )
}

// Helper: 3D ビュー座標取得
function getClickCoordinates(e: MouseEvent): [number, number] {
  // raycaster で 3D 座標 [x, z] を返す（実装詳細）
  // ...
}

// Helper: ポリゴン面積計算（Shoelace 公式）
function computePolygonArea(vertices: [number, number][]): number {
  // ...
}

// Helper: プレビューポリゴン描画
const PreviewPolygon: FC<{ vertices: [number, number][] }> = ({ vertices }) => {
  // 半透明ポリゴンで表示（既存 ZoneRenderer 同様）
}

// Helper: 属性入力ダイアログ
const ZoneAttributeDialog: FC<{
  onConfirm: (zoneName: string, usage: ZoneUsage) => void
  onCancel: () => void
}> = ({ onConfirm, onCancel }) => {
  // Radix UI Modal で実装
}
```

### テストファイル

**ファイルパス**: `apps/kuhl-editor/__tests__/components/tools/zone-draw-tool.test.tsx`

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ZoneDrawTool } from '../../../components/tools/zone-draw-tool'
import { HvacZoneNode } from '@kuhl/core'

describe('ZoneDrawTool', () => {
  beforeEach(() => {
    // ストア初期化
  })

  afterEach(() => {
    // ストアリセット
    vi.clearAllMocks()
  })

  describe('テストケース1: クリックで頂点追加', () => {
    it('3点クリックで3頂点のポリゴンプレビュー表示', () => {
      render(<ZoneDrawTool />)
      // 3点クリック
      // → vertices 配列が [x1,z1], [x2,z2], [x3,z3] になる
      // → プレビューポリゴン表示
    })
  })

  describe('テストケース2: Enter確定・createNode', () => {
    it('4頂点のプレビュー状態で Enter → HvacZoneNode作成', () => {
      // 4頂点入力状態
      // → Enter キー押下
      // → createNode(zone, levelId) 呼び出し
      // → useScene.nodes に zone_xxx が追加される
    })
  })

  describe('テストケース3: ESCキャンセル', () => {
    it('描画中に ESC → プレビュークリア・頂点リセット', () => {
      // vertices に3点入力
      // → ESC キー押下
      // → vertices = []
      // → プレビューメッシュ破棄
    })
  })

  describe('テストケース4: HvacZoneNode.parse()', () => {
    it('boundary + usage で zone_xxx ID生成', () => {
      const zone = HvacZoneNode.parse({
        zoneName: 'Test Zone',
        usage: 'office',
        floorArea: 100,
        boundary: [[0,0], [10,0], [10,5], [0,5]]
      })
      expect(zone.id).toMatch(/^zone_/)
    })
  })

  describe('テストケース5: unmount クリーンアップ', () => {
    it('描画中にアンマウント → 未完成ノード削除・geometry破棄', () => {
      const { unmount } = render(<ZoneDrawTool />)
      // vertices 入力状態
      // → unmount
      // → イベントリスナー削除
      // → プレビューメッシュの geometry/material 破棄
    })
  })
})
```

---

## ツール規約（重要）

### 1. useScene のみ変更

**ルール**: Tool は `useScene` のいずれかのアクション（createNode, updateNode, deleteNode）のみでシーンを変更。直接 Three.js API を呼び出してはいけない。

```typescript
// ✅ 良い例
useScene.getState().createNode(zone, levelId)

// ❌ 悪い例
// scene.add(mesh)  // Three.js 直接呼び出し禁止
```

### 2. プレビュー = ローカル state

**ルール**: 描画ツールのプレビュー（確定前の仮表示）はローカル state で管理。scene store に保存しない。

```typescript
// ✅ 良い例
const [vertices, setVertices] = useState<[number, number][]>([])
// PreviewPolygon コンポーネントで vertices を参照して描画

// ❌ 悪い例
// useScene.createNode(previewZone)  // 未確定の zone をストアに入れない
```

### 3. unmount クリーンアップ

**ルール**: コンポーネント unmount 時に以下をクリーンアップ:
- 未完成ノードの削除（作成したが未確定のノード）
- イベントリスナーの削除
- 一時的なジオメトリ・マテリアル破棄

```typescript
useEffect(() => {
  // ... リスナー登録

  return () => {
    // ✅ クリーンアップ
    window.removeEventListener('keydown', handleKeyDown)
    previewMesh?.geometry.dispose()
    previewMesh?.material.dispose()
  }
}, [])
```

---

## 実装チェックリスト

- [ ] `apps/kuhl-editor/components/tools/zone-draw-tool.tsx` 作成
- [ ] クリックで頂点追加機能実装
- [ ] Enter で確定・HvacZoneNode.parse()・createNode() 実装
- [ ] ESC でキャンセル機能実装
- [ ] ゾーン属性入力ダイアログ実装
- [ ] unmount クリーンアップ実装
- [ ] `apps/kuhl-editor/__tests__/components/tools/zone-draw-tool.test.tsx` 作成
- [ ] 5つのテストケース実装・全てパス確認
- [ ] テストカバレッジ 60% 以上
- [ ] useEditor ツール切り替えで zone_draw_tool が使用可能

---

## 関連ドキュメント参照

- **要件定義**: `docs/tasks/kuhl-hvac-editor/TASK-0014.md`
- **概要**: `docs/tasks/kuhl-hvac-editor/overview.md`
- **設計**: `docs/spec/kuhl-hvac-editor/note.md`
- **前提実装**:
  - TASK-0005: HvacZoneNode スキーマ
  - TASK-0009: useScene ストア
  - TASK-0013: HvacZoneRenderer

---

## 次のステップ

1. `/tsumiki:tdd-requirements TASK-0014` → 詳細要件定義
2. `/tsumiki:tdd-testcases` → テストケース作成
3. `/tsumiki:tdd-red` → テスト実装（失敗）
4. `/tsumiki:tdd-green` → 最小実装
5. `/tsumiki:tdd-refactor` → リファクタリング
6. `/tsumiki:tdd-verify-complete` → 品質確認

