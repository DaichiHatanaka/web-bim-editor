# TASK-0021: EquipmentRenderer（LOD100 ボックス表示）- 実装タスクノート

**作成日**: 2026-03-25
**タスクID**: TASK-0021
**タスクタイプ**: TDD（テスト駆動開発）
**推定工数**: 8時間
**フェーズ**: Phase 3 - 機器配置
**信頼性レベル**: 🔵 高品質 (89% 青信号、11% 黄信号)

---

## タスク概要

HvacEquipmentBase を継承する全機器ノード（AHU、PAC、FCU、VRF、ダクト接続部品等）を LOD100（詳細度100）でレンダリングする React Three Fiber コンポーネントを実装する。

**主要機能**:
1. **ボックスジオメトリ レンダリング** - node.dimensions([w,h,d]) から BoxGeometry を生成
2. **機器タイプ別カラーマップ** - equipmentColor マップで視覚的に区別（AHU=青、PAC=緑、FCU=橙等）
3. **TagLabel コンポーネント** - Html（drei）で機器上方に "AHU-101" 等のタグ名を表示
4. **PortMarkers コンポーネント** - ports 配列からポート位置に小さな球/円柱を表示、medium別カラー・direction別アイコン
5. **sceneRegistry・useNodeEvents 統合** - useRegistry でノードを登録、useNodeEvents でイベント購読

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| 3D エンジン | Three.js (WebGPU), React Three Fiber (RTF), Drei |
| フレームワーク | Next.js 16, React 19 |
| 状態管理 | Zustand 5（useScene, useViewer） |
| スキーマ | Zod 4（node validation） |
| UI | Radix UI, Tailwind CSS 4 |
| テスト | Vitest, React Three Test Renderer（RTF） |

---

## 既存コードベース参照

### 1. ノードスキーマ

#### HvacEquipmentBase
**ファイル**: `packages/kuhl-core/src/schema/nodes/hvac-equipment-base.ts`

```typescript
export const HvacEquipmentBase = BaseNode.extend({
  position: Vector3Schema,              // [x, y, z]
  rotation: Vector3Schema,              // [rx, ry, rz] (ラジアン)
  dimensions: Vector3Schema,            // [width, height, depth]
  tag: z.string(),                      // 'AHU-101'
  equipmentName: z.string(),            // '集約空調機 AHU01'
  ports: z.array(PortDef).default([]),  // ポート定義配列
  lod: LodLevel,                        // '100' | '200' | '300'
  modelSrc: z.string().optional(),      // GLB/GLTF モデル URL（LOD200以上）
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  systemId: z.string().optional(),      // 属する系統ID
  definitionId: z.string().optional(),  // マスター機器定義ID
  status: EquipmentStatus,              // 'planned' | 'existing' | 'demolished'
})
```

#### PortDef スキーマ
```typescript
export const PortDef = z.object({
  id: z.string(),                              // 'port_0'
  name: z.string(),                            // 'Supply Air Out'
  medium: PortMedium,                          // 'supply_air', 'chilled_water', etc.
  direction: z.enum(['in', 'out']),
  size: z.string().optional(),                 // 'Ø100', '50x50' 等
  position: Vector3Schema,                     // ポート相対位置 [x, y, z]
  connectedTo: z.string().nullable(),          // 接続先ノードID
})

export const PortMedium = z.enum([
  'supply_air', 'return_air', 'outside_air', 'exhaust_air',
  'chilled_water', 'hot_water', 'condenser_water',
  'refrigerant_liquid', 'refrigerant_gas', 'drain',
  'electric', 'signal'
])
```

#### 機器ノード型の継承例
**ファイル**: `packages/kuhl-core/src/schema/nodes/ahu.ts`

AhuNode が HvacEquipmentBase を拡張し、AHU 固有の属性（coolingCapacity, heatingCoil, humidifier等）を追加している。

### 2. ストア

#### useScene
**ファイル**: `packages/kuhl-core/src/store/use-scene.ts`

```typescript
export type SceneState = {
  nodes: Record<AnyNodeId, AnyNode>     // フラット辞書（全ノード）
  rootNodeIds: AnyNodeId[]               // トップレベルノードID
  dirtyNodes: Set<AnyNodeId>             // 変更フラグ

  // 主要アクション
  createNode(node: AnyNode, parentId?: AnyNodeId): void
  updateNode(id: AnyNodeId, data: Partial<AnyNode>): void
  deleteNode(id: AnyNodeId): void
  markDirty(id: AnyNodeId): void
}
```

**利用パターン**:
```typescript
const node = useScene.getState().nodes[nodeId]
if (node.type === 'ahu') { /* AHUノード処理 */ }
```

#### useViewer
**ファイル**: `packages/kuhl-viewer/src/store/use-viewer.ts`

```typescript
export type ViewerState = {
  selection: SelectionPath       // 現在の選択パス
  hoveredId: AnyNodeId | null    // マウスホバーノード

  setSelection(path: SelectionPath): void
  setHoveredId(id: AnyNodeId | null): void
}

type SelectionPath = {
  plantId: string | null
  buildingId: string | null
  levelId: string | null
  zoneId: string | null
  selectedIds: string[]           // 複数選択対応
}
```

### 3. sceneRegistry（リジストリ）

**ファイル**: `packages/kuhl-core/src/events/scene-registry.ts`

```typescript
export const sceneRegistry = {
  nodes: new Map<AnyNodeId, THREE.Object3D>()        // ノードID → 3Dオブジェクト
  byType: {
    ahu: new Set<AnyNodeId>(),
    pac: new Set<AnyNodeId>(),
    fcu: new Set<AnyNodeId>(),
    // ... 他の型
  }
}
```

**利用パターン**:
```typescript
sceneRegistry.nodes.set(nodeId, meshRef.current)
sceneRegistry.byType.ahu.add(nodeId)

// クリーンアップ
sceneRegistry.nodes.delete(nodeId)
sceneRegistry.byType.ahu.delete(nodeId)
```

### 4. useNodeEvents（イベントバス）

**ファイル**: `packages/kuhl-core/src/events/emitter.ts`

```typescript
// 型付きイベント発火パターン
emitter.emit('ahu:click', { nodeId, event })
emitter.on('ahu:click', (data) => { ... })

// イベント名規約: `<nodeType>:<action>`
// 例: 'fcu:hover', 'ahu:select', 'diffuser:position-change'
```

### 5. Three.js レイヤー構成

**ファイル**: `packages/kuhl-viewer/src/constants/layers.ts`

```typescript
export const SCENE_LAYER = 0         // 通常ジオメトリ（機器、ダクト、配管）
export const EDITOR_LAYER = 1        // エディタヘルパー（ハイライト、ポートマーカー）
export const ZONE_LAYER = 2          // ゾーンオーバーレイ
```

**適用パターン**:
```typescript
mesh.layers.set(SCENE_LAYER)  // または
object.layers.disable(ZONE_LAYER)  // 複数レイヤー制御
```

---

## 既存レンダラーパターン（参考）

**ファイル**: `packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx`

ZoneRenderer の実装は、EquipmentRenderer の設計モデルになる。

**主要特徴**:

1. **純粋関数の分離** - レンダリングロジック（geometry生成、色マップ取得等）を純粋関数として分離
   ```typescript
   export function boundaryToShape(boundary: [number, number][]): THREE.Shape { ... }
   export function getZoneColor(usage: ZoneUsage): { color: string; opacity: number } { ... }
   export function isValidBoundary(boundary: unknown): boolean { ... }
   ```

2. **useMemo による最適化** - geometry, material の再生成を防止
   ```typescript
   const geometry = useMemo(() => new THREE.ShapeGeometry(shape), [shape])
   const material = useMemo(() => new THREE.MeshBasicMaterial(...), [node])
   ```

3. **sceneRegistry 登録/解除** - useEffect でライフサイクル管理
   ```typescript
   useEffect(() => {
     sceneRegistry.nodes.set(nodeId, meshRef.current)
     sceneRegistry.byType.hvac_zone.add(nodeId)
     return () => {
       sceneRegistry.nodes.delete(nodeId)
       sceneRegistry.byType.hvac_zone.delete(nodeId)
     }
   }, [nodeId])
   ```

4. **GPU メモリリーク防止** - dispose() で明示的破棄
   ```typescript
   useEffect(() => {
     return () => {
       geometry?.dispose()
       material?.dispose()
     }
   }, [geometry, material])
   ```

---

## 実装ファイル一覧

### メインファイル

| ファイル | 責務 | サイズ目安 |
|---------|------|----------|
| `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx` | メインレンダラー。ノード情報取得、コンポーネント統合、registry登録 | ~200行 |
| `packages/kuhl-viewer/src/components/renderers/parts/tag-label.tsx` | TagLabel コンポーネント。Html(drei)でテキスト表示 | ~80行 |
| `packages/kuhl-viewer/src/components/renderers/parts/port-markers.tsx` | PortMarkers コンポーネント。ポート位置に球/円柱マーカー表示 | ~150行 |

### テストファイル

| ファイル | テスト対象 | テストケース数 |
|---------|-----------|---------------|
| `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-renderer.test.tsx` | equipment-renderer, tag-label, port-markers の統合テスト | 5件 |

### 定義・定数ファイル

| ファイル | 内容 |
|---------|------|
| `packages/kuhl-viewer/src/constants/equipment-colors.ts` | 機器タイプ別カラーマップ（新規作成） |
| `packages/kuhl-viewer/src/constants/port-styles.ts` | ポート medium 別カラー・direction 別アイコン定義（新規作成） |

---

## 機器タイプ別カラーマップ（design.kuhl-hvac-editor から引用）

**ファイル**: `docs/design/kuhl-hvac-editor/architecture.md` §6.3

```typescript
export const EQUIPMENT_COLOR_MAP: Record<EquipmentType, string> = {
  ahu: '#4A90E2',        // 青（中央空調機）
  pac: '#7ED321',        // 緑（パッケージエアコン）
  fcu: '#F39C12',        // 橙（ファンコイルユニット）
  vrf_outdoor: '#2C3E50', // 濃紺（VRF 室外機）
  vrf_indoor: '#3498DB',  // 明るい青（VRF 室内機）
  diffuser: '#E74C3C',   // 赤（吹出口）
  damper: '#95A5A6',     // グレー（ダンパー）
  fan: '#9B59B6',        // 紫（送風機）
  pump: '#1ABC9C',       // ティール（ポンプ）
  chiller: '#27AE60',    // 深緑（チラー）
  boiler: '#E67E22',     // オレンジ（ボイラー）
  cooling_tower: '#16A085', // 深ティール（冷却塔）
  valve: '#34495E',      // 濃グレー（弁）
}
```

---

## ポート表示仕様

### medium 別カラー

| medium | 色 | 用途 |
|--------|-----|------|
| supply_air, return_air, outside_air, exhaust_air | #5DADE2（水色） | 空気 |
| chilled_water, hot_water, condenser_water | #2874A6（濃青） | 水系統 |
| refrigerant_liquid, refrigerant_gas | #28A745（緑） | 冷媒 |
| drain | #999999（グレー） | 排水 |
| electric, signal | #FFD700（金色） | 電気・信号 |

### direction 別アイコン

| direction | 表示 | 説明 |
|-----------|-----|------|
| in | 矢印（内向き ←） | 入力ポート |
| out | 矢印（外向き →） | 出力ポート |

### ポートマーカー形状

- **基本形**: 小さな球（radius: 0.05m）
- **alternative**: 円柱（height: 0.1m, radius: 0.03m）
- **位置**: node.ports[i].position（機器中心からの相対座標）

---

## 依存タスク

### 前提タスク（完了済み）
- [x] **TASK-0006**: HvacEquipmentBase・PortDef・共通機器型 - スキーマ定義
- [x] **TASK-0010**: イベントバス・sceneRegistry - イベント・レジストリ基盤
- [x] **TASK-0012**: Viewer基盤コンポーネント・Canvas・Grid - Three.js Canvas環境

### 後続タスク
- [ ] **TASK-0022**: EquipmentRenderer（LOD200 プロシージャル・GLB） - より詳細なレンダリング
- [ ] **TASK-0027**: 諸元表パネル（SpecSheetPanel） - EquipmentRenderer と連動する UI パネル

---

## 単体テスト要件

### テストケース一覧

| # | テストケース | 信頼性 | 説明 |
|----|-------------|-------|------|
| 1 | LOD100 BoxGeometry 描画 | 🔵 | dimensions から正しく BoxGeometry が生成される。position/rotation が適用される |
| 2 | 機器タイプ別カラー適用 | 🔵 | node.type に応じて EQUIPMENT_COLOR_MAP から色が選択される |
| 3 | TagLabel 表示 | 🔵 | Html(drei) で node.tag が機器上方に表示される |
| 4 | PortMarkers 表示 | 🔵 | node.ports 配列の各ポートが相対位置に球/円柱として表示される |
| 5 | useRegistry/useNodeEvents | 🟡 | sceneRegistry への登録・イベント購読が正常に動作する |

**テストファイル**: `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-renderer.test.tsx`

**カバレッジ目標**: 60% 以上

**テスト実装方針**:
- Vitest + React Three Test Renderer (RTF) を使用
- mock useScene, useViewer でストア状態を制御
- Three.js オブジェクト の 生成 検証（instanceof THREE.BoxGeometry等）
- DOM/HTML 要素は React Testing Library で検証

---

## 実装時の注意点

### 1. Viewer Isolation（重要）
- EquipmentRenderer は **`@kuhl/viewer` パッケージに属する**
- `apps/kuhl-editor` からは **インポート禁止**
- editor 固有ロジック（tool、panel等）は editor app に配置

### 2. ノード型ガード
```typescript
if (node?.type === 'ahu' && node.lod === '100') {
  // LOD100 レンダリング処理
}
```
すべての equipment type に対応する（全13種の機器ノード）

### 3. ジオメトリ最適化
- **useMemo で再生成防止**: dimensions 変更時のみ BoxGeometry 再生成
- **BufferGeometry 推奨**: 大量ノード描画時のパフォーマンス向上
- **Layer 分離**: SCENE_LAYER と EDITOR_LAYER の使い分け

### 4. エラーハンドリング
```typescript
if (!geometry || !material) return null  // 無効なデータはスキップ
```

### 5. メモリ管理
- **自動破棄**: useEffect cleanup で geometry.dispose(), material.dispose()
- **リスナー削除**: useNodeEvents の unsubscribe を忘れずに

---

## 信頼性評価

| 項目 | 信頼性 | 根拠 |
|------|-------|------|
| LOD100 ボックスレンダリング | 🔵 | architecture.md レンダラーパターン |
| TagLabel 実装 | 🔵 | REQ-206, Drei Html コンポーネント実績 |
| PortMarkers 表示 | 🔵 | REQ-203, Three.js Mesh 生成は既実績 |
| EquipmentRenderer メイン | 🔵 | zone-renderer.tsx パターン踏襲 |
| useRegistry/useNodeEvents | 🟡 | 統合テスト重要（実装依存度高） |

**総合信頼度**: 🔵 高品質

---

## 次のステップ

本タスクの実装フロー（TDD）:

1. **step-b**: `/tsumiki:tdd-requirements TASK-0021` - 詳細要件定義
2. **step-c**: `/tsumiki:tdd-testcases` - テストケース作成
3. **step-d**: `/tsumiki:tdd-red` - テスト実装（失敗）
4. **step-e**: `/tsumiki:tdd-green` - 最小実装
5. **step-f**: `/tsumiki:tdd-refactor` - リファクタリング
6. **step-g**: `/tsumiki:tdd-verify-complete` - 品質確認

---

## 参考リンク

- **タスク定義**: `docs/tasks/kuhl-hvac-editor/TASK-0021.md`
- **概要**: `docs/tasks/kuhl-hvac-editor/overview.md`
- **スペック**: `docs/spec/kuhl-hvac-editor/note.md`
- **設計文書**: `docs/design/kuhl-hvac-editor/architecture.md`
- **HvacEquipmentBase スキーマ**: `packages/kuhl-core/src/schema/nodes/hvac-equipment-base.ts`
- **ZoneRenderer（参考実装）**: `packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx`
- **useScene ストア**: `packages/kuhl-core/src/store/use-scene.ts`
