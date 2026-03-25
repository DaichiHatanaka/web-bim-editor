# TASK-0013 実装メモ: HvacZoneRenderer（半透明床面ポリゴン）

**作成日**: 2026-03-25
**タスクID**: TASK-0013
**ステータス**: 実装準備完了
**推定工数**: 8時間
**信頼性レベル**: 🔵 青信号（86% — 6/7項目）

---

## 1. タスク概要

HvacZoneRenderer コンポーネントを実装。HvacZoneNode の boundary ポリゴンから THREE.ShapeGeometry を生成し、usage 別のカラーマップで半透明着色して ZONE_LAYER(2) に描画。useRegistry / useNodeEvents 登録、ゾーンラベル表示を含む。

**完了条件**:
- ゾーンポリゴンが半透明で描画される
- usage 別に色分けされる
- ZONE_LAYER に配置される
- テスト60%以上カバレッジ

---

## 2. 依存タスク実装状況

### TASK-0005: HvacZoneNodeスキーマ ✅ 完了

**実装位置**: `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`

**提供物**:
- `HvacZoneNode` Zod スキーマ
- `ZoneUsage` 列挙型（11種: office, meeting, server_room, lobby, corridor, toilet, kitchen, warehouse, mechanical_room, electrical_room, other）
- `boundary: z.array(z.tuple([z.number(), z.number()]))` — 2D座標配列（[x,z] 形式、Level座標系）
- `floorHeight`フィールド（ゾーンの Y 座標を決定）
- `loadResult?: LoadCalcResult` — オプショナル

**利用方法**:
```ts
import { HvacZoneNode } from '@kuhl/core'
const zone = HvacZoneNode.parse({
  zoneName: 'Zone-A',
  usage: 'office',
  floorArea: 100,
  boundary: [[0,0], [10,0], [10,5], [0,5]],
})
```

### TASK-0010: イベントバス・sceneRegistry ✅ 完了

**実装位置**:
- イベントバス: `packages/kuhl-core/src/events/bus.ts`
- sceneRegistry: `packages/kuhl-core/src/hooks/scene-registry/scene-registry.ts`

**提供物**:
- `KuhlEvents` 型 — 全HVACノードタイプ + イベントサフィックス（click, move, enter, leave, pointerdown, pointerup, context-menu, double-click）
- `emitter: mitt<KuhlEvents>()` — mitt ベースイベントバス
- `eventKey(nodeType, suffix)` ヘルパー — 正しいキー形式（`hvac_zone:click`等）を生成
- `sceneRegistry.nodes: Map<string, unknown>` — ノードID → Object3D マッピング
- `sceneRegistry.byType: Record<AnyNodeType, Set<string>>` — ノードタイプ別IDセット

**ノードタイプ別イベント例**:
```ts
// hvac_zone のイベント
emitter.on('hvac_zone:click', (event: NodeEvent) => {
  console.log(event.node, event.position)
})
```

### TASK-0012: Viewer基盤コンポーネント ✅ 完了

**実装位置**:
- Viewer: `packages/kuhl-viewer/src/components/viewer.tsx`
- レイヤー定数: `packages/kuhl-viewer/src/constants/layers.ts`
- NodeRenderer: `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx`

**提供物**:
- `SCENE_LAYER = 0 as const` — 通常ジオメトリ用
- `EDITOR_LAYER = 1 as const` — エディタヘルパー用
- `ZONE_LAYER = 2 as const` — ゾーンオーバーレイ用（**TASK-0013で使用**）
- `Viewer` コンポーネント — R3F Canvas, WebGPU, Grid, OrbitControls, Lighting
- `NodeRenderer` ディスパッチャー — nodeType で適切なレンダラーに切替

**NodeRenderer の流れ**:
1. `useScene()` Hook で対象ノードを取得
2. `node.type` でスイッチ
3. `hvac_zone` → FallbackRenderer（**TASK-0013で HvacZoneRenderer に置換予定**）

---

## 3. 実装に必要な既存コードの要点

### 3.1 インターフェース・型定義

**HvacZoneNode 型** (`@kuhl/core`):
```ts
export type HvacZoneNode = {
  id: string  // 'zone_xxx' 形式
  type: 'hvac_zone'
  parentId: string  // Level ID
  zoneName: string
  usage: ZoneUsage  // 'office' | 'meeting' | ... | 'other'
  floorArea: number
  ceilingHeight: number  // default: 2.7
  boundary?: Array<[number, number]>  // [x,z] 座標配列
  loadResult?: LoadCalcResult
  // その他...
}
```

**ZoneUsage 列挙型**:
```ts
type ZoneUsage = 'office' | 'meeting' | 'server_room' | 'lobby' |
                 'corridor' | 'toilet' | 'kitchen' | 'warehouse' |
                 'mechanical_room' | 'electrical_room' | 'other'
```

**NodeEvent 型** (`@kuhl/core/events/bus.ts`):
```ts
export interface NodeEvent<T extends AnyNode = AnyNode> {
  node: T
  position: [number, number, number]
  localPosition: [number, number, number]
  normal?: [number, number, number]
  stopPropagation: () => void
  nativeEvent: unknown
}
```

### 3.2 sceneRegistry パターン

**登録**（マウント時）:
```ts
import { useRegistry } from '@kuhl/viewer'  // TODO: 実装予定

const ref = useRef<THREE.Mesh>(null)
useRegistry(node.id, 'hvac_zone', ref)
// → sceneRegistry.nodes.set(node.id, ref.current)
// → sceneRegistry.byType.hvac_zone.add(node.id)
```

**取得**:
```ts
const mesh = sceneRegistry.nodes.get('zone_abc123') as THREE.Mesh
const zoneIds = sceneRegistry.byType.hvac_zone  // Set<string>
```

### 3.3 useNodeEvents パターン

**イベント購読**（コンポーネント内）:
```ts
import { useNodeEvents } from '@kuhl/viewer'  // TODO: 実装予定

const handlers = useNodeEvents(node, 'hvac_zone')
// → { onClick, onPointerEnter, ... }

// Mesh に attach:
// <mesh {...handlers}>
```

**イベント発火**（Renderer内 or Tool内）:
```ts
import { emitter, eventKey } from '@kuhl/core/events/bus'

const onMeshClick = (e: ThreeEvent<MouseEvent>) => {
  emitter.emit(eventKey('hvac_zone', 'click'), {
    node,
    position: [e.point.x, e.point.y, e.point.z],
    nativeEvent: e,
  })
}
```

### 3.4 レイヤー設定パターン

```ts
import { ZONE_LAYER } from '@kuhl/viewer/constants/layers'

const mesh = new THREE.Mesh(geometry, material)
mesh.layers.set(ZONE_LAYER)  // レイヤー2に配置
mesh.layers.disable(0)        // オプション: レイヤー0を無効化
```

### 3.5 boundary → ShapeGeometry 変換パターン

**入力**: `boundary: [[0,0], [10,0], [10,5], [0,5]]`（2D、[x,z]）

**出力処理**:
```ts
import * as THREE from 'three'

function boundaryToShape(boundary: Array<[number, number]>): THREE.Shape {
  const shape = new THREE.Shape()
  boundary.forEach((point, idx) => {
    if (idx === 0) {
      shape.moveTo(point[0], point[1])  // z→y に変換（XY平面で）
    } else {
      shape.lineTo(point[0], point[1])
    }
  })
  shape.closePath()
  return shape
}

// ShapeGeometry 生成
const geometry = new THREE.ShapeGeometry(boundaryToShape(boundary))
```

**座標系変換**:
- boundary: 2D [x, z] — Level座標系（建築平面）
- ShapeGeometry: XY平面（Three.js）
- 変換: boundary[x,z] → ShapeGeometry(x, z) — **z座標は Y に**
- 高さ: floorHeight を mesh.position.y に設定

### 3.6 usage 別カラーマップ（設計文書 §6 Phase 1）

**定義** (実装で定める):
```ts
const usageColorMap: Record<ZoneUsage, { color: string; opacity: number }> = {
  office: { color: '#4A90E2', opacity: 0.3 },           // 青系
  meeting: { color: '#7ED321', opacity: 0.3 },          // 緑系
  server_room: { color: '#FF4757', opacity: 0.3 },      // 赤系
  lobby: { color: '#A8A8A8', opacity: 0.3 },            // 灰色
  corridor: { color: '#C8C8C8', opacity: 0.3 },         // 淡灰色
  toilet: { color: '#9B59B6', opacity: 0.3 },           // 紫系
  kitchen: { color: '#F39C12', opacity: 0.3 },          // オレンジ
  warehouse: { color: '#795548', opacity: 0.3 },        // 茶色
  mechanical_room: { color: '#34495E', opacity: 0.3 },  // 濃灰
  electrical_room: { color: '#E74C3C', opacity: 0.3 },  // 濃赤
  other: { color: '#BDC3C7', opacity: 0.3 },            // ニュートラルグレー
}
```

**マテリアル作成**:
```ts
import * as THREE from 'three'

const { color, opacity } = usageColorMap[zone.usage]
const material = new THREE.MeshBasicMaterial({
  color: new THREE.Color(color),
  transparent: true,
  opacity: opacity,
})
```

### 3.7 useScene Hook パターン

**Reactive ノード取得**:
```ts
import { useScene } from '@kuhl/core'

// Renderer コンポーネント内
const node = useScene((state) => state.nodes[nodeId]) as HvacZoneNode | undefined

// ノード更新時に自動再レンダー
```

---

## 4. 実装ファイルパスと構造

### 実装対象ファイル

**1. HvacZoneRenderer コンポーネント**
```
📁 packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx
```

**責務**:
- boundary → ShapeGeometry 変換
- usage 別マテリアル適用（半透明着色）
- ZONE_LAYER に配置
- useRegistry / useNodeEvents 登録
- ゾーンラベル表示（Canvas テキスト）

**インターフェース**（推定):
```ts
type ZoneRendererProps = {
  nodeId: AnyNodeId
}

export const ZoneRenderer: React.FC<ZoneRendererProps> = ({ nodeId }) => {
  // 実装
}
```

**テストファイル**
```
📁 packages/kuhl-viewer/src/__tests__/components/renderers/zone-renderer.test.tsx
```

**テストケース**:
1. boundary → ShapeGeometry 変換（4頂点のジオメトリ生成）
2. usage 別カラーマップ適用（office → 青系）
3. ZONE_LAYER 配置（layers に 2 が設定）
4. useRegistry 登録（registry に ノードが登録）

### 依存関係マップ

```
ZoneRenderer
├── 入力: nodeId (AnyNodeId)
├── 依存: useScene (@kuhl/core)
├── 依存: useRegistry (@kuhl/viewer/hooks) — TODO: TASK-0010で実装予定
├── 依存: useNodeEvents (@kuhl/viewer/hooks) — TODO: TASK-0010で実装予定
├── 依存: emitter (@kuhl/core/events)
├── 依存: ZONE_LAYER (@kuhl/viewer/constants)
├── 出力: <group> | <mesh> (R3F)
└── 副作用:
    ├── sceneRegistry.nodes.set(nodeId, ref)
    ├── sceneRegistry.byType.hvac_zone.add(nodeId)
    └── emitter.emit('hvac_zone:click', ...)
```

### NodeRenderer での統合

**現在** (TASK-0012で完了):
```tsx
case 'hvac_zone':
  return <FallbackRenderer nodeId={node.id} nodeType={node.type} />
```

**置換予定** (TASK-0013):
```tsx
case 'hvac_zone':
  return <ZoneRenderer nodeId={node.id} />
```

---

## 5. 実装パターンと注意事項

### 5.1 座標系変換（重要）

**問題**: boundary は 2D [x,z]（建築平面座標）だが、ShapeGeometry は XY 平面を想定

**解決**:
```ts
// boundary: [[0,0], [10,0], [10,5], [0,5]] — 2D [x,z]
// ShapeGeometry: XY 平面上に作成
// Z座標をYに読み替える必要はなく、単に ShapeGeometry(x,z) → 平面
// 高さは mesh.position.y = floorHeight で設定

const shape = new THREE.Shape()
for (const [x, z] of boundary) {
  shape.lineTo(x, z)  // Shape 内では XY で扱う（z を y に見立てる）
}

const mesh = new THREE.Mesh(geometry)
mesh.position.y = zone.floorHeight  // 高さ情報は Z → Y で対応
```

### 5.2 R3F 内での mesh 参照取得

```tsx
export const ZoneRenderer: React.FC<ZoneRendererProps> = ({ nodeId }) => {
  const meshRef = useRef<THREE.Mesh>(null)

  // 登録
  useEffect(() => {
    if (meshRef.current) {
      sceneRegistry.nodes.set(nodeId, meshRef.current)
      sceneRegistry.byType.hvac_zone.add(nodeId)
    }
    return () => {
      sceneRegistry.nodes.delete(nodeId)
      sceneRegistry.byType.hvac_zone.delete(nodeId)
    }
  }, [nodeId])

  return <mesh ref={meshRef} {...} />
}
```

### 5.3 イベントハンドラの登録（クリーンアップ必須）

```tsx
useEffect(() => {
  const handleClick = (e: NodeEvent) => {
    if (e.node.id === nodeId) {
      console.log('Zone clicked:', e.node)
    }
  }

  emitter.on('hvac_zone:click', handleClick)

  return () => {
    emitter.off('hvac_zone:click', handleClick)  // 必須: クリーンアップ
  }
}, [nodeId])
```

### 5.4 ラベル表示（オプション、後続タスク・詳細設計で確定）

**候補1**: HTML Overlay（DOM)
```tsx
<Html position={[centerX, floorHeight, centerZ]}>
  <div className="zone-label">{zone.zoneName}</div>
</Html>
```

**候補2**: Canvas テキストレンダラー（Canvas ベース）
```tsx
// Drei の <Text> コンポーネント
<Text position={[centerX, floorHeight, centerZ]} fontSize={1}>
  {zone.zoneName}
</Text>
```

**TASK-0013 実装範囲**: 基本構造（メッシュ+着色）を優先。ラベル表示は詳細設計で確定。

### 5.5 テストアプローチ（推奨）

**Unit Tests**:
1. boundary → ShapeGeometry 変換テスト（ジオメトリ頂点数）
2. マテリアル カラー検証テスト（usage 別色の確認）
3. レイヤー設定検証（ZONE_LAYER=2）
4. Registry 登録テスト（マウント/アンマウント時の動作）

**Integration Tests** (後続):
- Viewer コンポーネント内でのレンダリング確認
- イベント発火の確認

---

## 6. 既存コード参照ポイント

### 参照1: HvacZoneNode の属性構造

**ファイル**: `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`

```ts
export const HvacZoneNode = BaseNode.extend({
  id: objectId('zone'),
  type: nodeType('hvac_zone'),
  children: z.array(z.string()).default([]),
  zoneName: z.string(),
  zoneCode: z.string().optional(),
  usage: ZoneUsage,
  floorArea: z.number(),
  ceilingHeight: z.number().default(2.7),
  boundary: z.array(z.tuple([z.number(), z.number()])).optional(),
  // ...
})
```

### 参照2: EventBus の使用パターン

**ファイル**: `packages/kuhl-core/src/events/bus.ts`

```ts
export type KuhlEvents = GridEvents &
  NodeEvents<'hvac_zone', NodeEvent> &
  // ...

export const emitter = mitt<KuhlEvents>()
```

### 参照3: sceneRegistry の構造

**ファイル**: `packages/kuhl-core/src/hooks/scene-registry/scene-registry.ts`

```ts
export const sceneRegistry = {
  nodes: new Map<string, unknown>(),
  byType: createByType(),  // { hvac_zone: Set<string>, ... }
}
```

### 参照4: レイヤー定数

**ファイル**: `packages/kuhl-viewer/src/constants/layers.ts`

```ts
export const SCENE_LAYER = 0 as const
export const EDITOR_LAYER = 1 as const
export const ZONE_LAYER = 2 as const
```

### 参照5: NodeRenderer ディスパッチ

**ファイル**: `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx`

```tsx
case 'hvac_zone':
  return <FallbackRenderer nodeId={node.id} nodeType={node.type} />
  // → TASK-0013で <ZoneRenderer nodeId={node.id} /> に置換
```

---

## 7. TDD 実装ステップ

### Phase 1: Red（テスト失敗）— `/tsumiki:tdd-red`

**テストファイル**: `packages/kuhl-viewer/src/__tests__/components/renderers/zone-renderer.test.tsx`

テストケース例:
```ts
describe('ZoneRenderer', () => {
  it('should convert boundary to ShapeGeometry with 4 vertices', () => {
    // Given: boundary=[[0,0],[10,0],[10,5],[0,5]]
    // When: ZoneRenderer マウント
    // Then: ジオメトリ頂点数=4
  })

  it('should apply office color (blue) for office usage', () => {
    // Given: usage='office'
    // When: レンダリング
    // Then: color=#4A90E2, opacity=0.3
  })

  it('should set ZONE_LAYER on mesh', () => {
    // Given: ZoneRenderer マウント
    // When: mesh.layers 確認
    // Then: layers.isEnabled(ZONE_LAYER) === true
  })

  it('should register node in sceneRegistry', () => {
    // Given: nodeId='zone_xyz'
    // When: コンポーネントマウント
    // Then: sceneRegistry.nodes.has('zone_xyz') === true
  })
})
```

### Phase 2: Green（最小実装）— `/tsumiki:tdd-green`

**実装対象**:
1. boundary → ShapeGeometry 変換関数
2. usage 別カラーマップ
3. Mesh レイアウト（位置、レイヤー）
4. useRegistry / useNodeEvents 統合
5. テスト全通過

### Phase 3: Refactor（リファクタリング）— `/tsumiki:tdd-refactor`

**改善ポイント**:
- 座標変換ロジックの抽出（`boundaryToShape()` 関数化）
- カラーマップの定数化
- コンポーネント構成の最適化
- テストカバレッジ 60% 以上確保

---

## 8. 注意事項・制約

### 8.1 Renderer 設計原則との関係

**原則**: Renderer はジオメトリ生成を行わない

**例外**: HvacZoneRenderer の場合、boundary から直接 ShapeGeometry を生成することが必要

**理由**: ゾーン境界はユーザー入力（ZoneDrawTool で描画）に基づく動的データで、スキーマに含まれる情報そのもの

**対応**: この例外を設計文書に明記し、後続タスク（TASK-0014 ZoneDrawTool）でのジオメトリ生成パターンと区別

### 8.2 useRegistry / useNodeEvents Hook の実装状況

**現状**: TASK-0010（イベントバス・sceneRegistry）で emitter と sceneRegistry.nodes は完成

**未実装**:
- `useRegistry()` フック（マウント/アンマウント時の自動登録・解除）
- `useNodeEvents()` フック（イベントハンドラ生成）

**TASK-0013での対応**:
- TASK-0010の完成度を確認し、これらフックが必要な場合は TASK-0010 のタスク拡張として実装するか、
- TASK-0013 内で実装するかを判断する

### 8.3 floorHeight と Y 座標の対応

**設計**: HvacZoneNode.ceilingHeight はゾーンの高さ（デフォルト 2.7）

**boundary 配置**: floorHeight（実装で定める属性）が ゾーン床面の Y 座標

**TASK-0013実装**: boundary のある場合のみ ShapeGeometry を生成。boundary がない場合は何も描画しない（オプショナル属性）

### 8.4 半透明レンダリングの順序

**注意**: 複数ゾーンが重複した場合、半透明マテリアルの描画順序によって見た目が変わる可能性

**対応**: Three.js の `renderOrder` プロパティで描画順序制御

```ts
mesh.renderOrder = 1  // 後ろから順に 0, 1, 2, ...
```

---

## 9. 参考資料・リンク

- **TASK-0005**: HvacZoneNode スキーマ定義 → `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`
- **TASK-0010**: イベントバス・sceneRegistry → `packages/kuhl-core/src/events/bus.ts`
- **TASK-0012**: Viewer 基盤 → `packages/kuhl-viewer/src/components/viewer.tsx`
- **要件定義**: `docs/spec/kuhl-hvac-editor/requirements.md` — REQ-101
- **設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` — §6 Phase 1
- **CLAUDE.md**: プロジェクトルール → `CLAUDE.md`（Viewer Isolation, Three.js Layers 等）

---

## 10. チェックリスト（実装前確認）

- [ ] TASK-0005 (HvacZoneNodeスキーマ) の実装が完了している
- [ ] TASK-0010 (イベントバス) の実装が完了している
- [ ] TASK-0012 (Viewer基盤) の実装が完了している
- [ ] `packages/kuhl-viewer/src/constants/layers.ts` に ZONE_LAYER が定義されている
- [ ] `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` で hvac_zone ケースが存在している
- [ ] `packages/kuhl-core/src/schema/nodes/hvac-zone.ts` で HvacZoneNode 型が確認できる
- [ ] boundary 型が `Array<[number, number]>` であることが確認できる
- [ ] ZoneUsage 型の 11 種が確認できる
- [ ] useScene Hook の利用パターンが理解できている
- [ ] Three.js ShapeGeometry の基本的な使い方が理解できている
- [ ] テストフレームワーク（Vitest）のセットアップが確認できている

---

**備考**: このメモは実装開始前のリサーチ結果です。実装中に新しい情報や調整事項が発生した場合は、逐次更新してください。
