# Kühl HVAC Editor コンテキストノート

**作成日**: 2026-03-23

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| 3D | Three.js (WebGPU), React Three Fiber, Drei |
| フレームワーク | Next.js 16, React 19 |
| 状態管理 | Zustand 5 + Zundo |
| バリデーション | Zod 4 |
| UI | Radix UI, Tailwind CSS 4 |
| DB | Supabase PostgreSQL + Drizzle ORM |
| 認証 | better-auth |
| ツール | Biome, TypeScript 5.9, Turborepo, Bun |
| デプロイ | Vercel |

## 既存プロジェクト構造

```
apps/editor          → Next.js 16 アプリケーション
packages/core        → スキーマ、状態管理、システム（純粋ロジック）
packages/viewer      → 3Dキャンバス、レンダラー
packages/editor      → エディタUIコンポーネント
packages/ui          → 共有UIコンポーネント
```

## 既存ノードタイプ（建築系）

- 空間: Site, Building, Level
- 構造: Wall, Slab, Ceiling, Roof, RoofSegment
- 開口: Door, Window
- その他: Item, Zone, Guide, Scan

## 既存システム（8件）

- wall-system, wall-mitering, slab-system, ceiling-system
- roof-system, door-system, window-system, item-system

## 既存フェーズ・ツール

- Phase: `site` | `structure` | `furnish`
- Mode: `select` | `edit` | `delete` | `build`
- StructureTool: wall, room, custom-room, slab, ceiling, roof, column, stair, item, zone, window, door

## 3ストアアーキテクチャ

| ストア | パッケージ | 用途 |
|--------|-----------|------|
| useScene | @pascal-app/core | フラットノード辞書、CRUD、ダーティ追跡、undo/redo |
| useViewer | @pascal-app/viewer | 選択パス、カメラ、テーマ、表示トグル |
| useEditor | apps/editor | アクティブツール、フェーズ、モード |

## 開発ルール

- Viewer Isolation: `@pascal-app/viewer` は `apps/editor` からインポート禁止
- ノード作成は必ず `.parse()` 使用
- System は `useFrame` 内で実行、`null` を返す React コンポーネント
- Renderer は Three.js オブジェクト生成、`useRegistry` 登録、`useNodeEvents` でイベント発火
- Tool は `useScene` のみ変更、直接 Three.js API 呼び出し禁止

## Kühl 開発で追加予定

### 新規ノードタイプ（空調系）
- 空間: Plant, HvacZone, ArchitectureRef
- 機器: AHU, PAC, FCU, VrfOutdoor, VrfIndoor, Diffuser, Damper, Fan, Pump, Chiller, Boiler, CoolingTower
- ダクト: DuctSegment, DuctFitting
- 配管: PipeSegment, PipeFitting, Valve
- その他: System(系統), Support

### 新規システム
- zone/load-calc-system（空調負荷概算）
- equipment/equipment-system, ahu-selection, pac-selection, pump-selection
- duct/duct-system, duct-sizing, duct-pressure-loss
- pipe/pipe-system, pipe-sizing, pipe-pressure-loss
- takeoff/quantity-takeoff, cost-export
- ifc/ifc-import, ifc-export

### 新規フェーズ・ツール
- Phase: `zone` | `equip` | `route` | `calc` | `takeoff`
- ツール: zone_draw, zone_edit, load_calc, ahu_place, pac_place, diffuser_place, fan_place, duct_route, pipe_route, auto_route, pressure_loss, system_balance, clash_check, takeoff_run, cost_export

### 外部連携
- IFC読込（web-ifc WASM）→ 建築躯体表示
- IFC出力（IfcOpenShell サーバーサイド）→ Rebro/Revit連携
- 積算出力（CSV/Excel/Rebro形式）
- N-BOM連携（機器マスター参照）

## 注意事項

- 既存の建築エディタ（Pascal Editor）をフォーク・拡張する形
- 既存建築ノードは削除し、空調専用に再構成
- ArchitectureRefNode で建築IFCを表示のみ参照
- 基本設計フェーズに特化（施工図レベルの詳細は対象外）

---

## TASK-0016 コンテキスト

**TASK**: IFC読込（web-ifc WASM）+ ArchitectureRefRenderer
**推定工数**: 8時間
**ファーズ**: Phase 2
**要件**: REQ-106, REQ-107, REQ-108, EDGE-001

### 実装内容

#### 1. IFCパース（web-ifc WASM）
- ファイル: `packages/kuhl-core/src/systems/ifc/ifc-import.ts`
- 責務: IfcAPI初期化、IFCバッファパース、ジオメトリ抽出
- 対象エンティティ: IfcWall, IfcSlab, IfcBeam, IfcColumn, IfcCovering
- 処理: メインスレッド（将来Worker化候補）

#### 2. ArchitectureRefRenderer
- ファイル: `packages/kuhl-viewer/src/components/renderers/architecture-ref-renderer.tsx`
- 責務: Three.jsメッシュ描画、表示のみ（raycastDisabled）
- スタイル: 半透明表示（参考表示）
- パターン: 既存レンダラー実装を踏襲

#### 3. 階高・天井高取得（条件付き）
- IfcBuildingStorey から Elevation を抽出
- LevelNode の elevation フィールドに反映
- 取得不可時はスキップ

### 既存基盤

- **useScene**: `packages/kuhl-core/src/store/use-scene.ts` - CRUD・undo/redo管理
- **ArchitectureRefNode**: `packages/kuhl-core/src/schema/nodes/architecture-ref.ts`
  - id: objectId('arch')
  - ifcFilePath: string
  - ifcModelId?: string
  - geometryData?: any
  - levelMapping?: Record<string, string>
- **LevelNode**: `packages/kuhl-core/src/schema/nodes/level.ts`
  - floorHeight: number
  - ceilingHeight: number
  - elevation: number
- **AnyNode ユニオン**: `packages/kuhl-core/src/schema/types.ts`

### テスト要件

- テストファイル: `packages/kuhl-core/src/__tests__/systems/ifc/ifc-import.test.ts`
- カバレッジ: 60%以上
- テストケース: web-ifc初期化、ジオメトリ抽出、ArchitectureRefNode作成、Renderer表示、エラーハンドリング

### 注意事項

- web-ifc WASMファイルのロードパス（Next.js public/ or CDN）
- メインスレッド処理のためUIブロック可能性
- IFC 2x3/IFC 4 両対応予定
- Editor Isolation: Renderer は @kuhl/viewer のみ（apps/kuhl-editor からは不可）

---

## TASK-0017 コンテキスト

**TASK**: IFC読込UI・ファイルアップロード
**推定工数**: 8時間
**フェーズ**: Phase 2
**要件**: REQ-106, REQ-107, REQ-108, NFR-003
**信頼性レベル**: 🔵 高品質 (57% 青信号、43% 黄信号)

### 依存タスク

- **前提**: TASK-0016（IFC読込（web-ifc WASM）+ ArchitectureRefRenderer）✅ 完了済み
- **後続**: TASK-0029（DB設定・Drizzleスキーマ・マイグレーション）

### 実装ファイル

- **実装**: `apps/kuhl-editor/components/panels/ifc-upload-panel.tsx`
- **テスト**: `apps/kuhl-editor/__tests__/components/panels/ifc-upload-panel.test.tsx`

### 要件概要

#### 1. ドラッグ&ドロップ・ファイル選択UI 🔵

- ドロップゾーン + ファイル選択ボタン（HTML5 File API）
- ファイルサイズチェック（≤100MB、NFR-003）
- 超過時はエラーメッセージ表示

#### 2. パース進捗・Level反映 🔵

- web-ifc パース → ArchitectureRefNode作成 → LevelNode更新
- LevelNode フィールド更新: `floorHeight`, `ceilingHeight`, `elevation`
- プログレスバー表示（パース進捗）

#### 3. Supabase Storage保存 🟡

- `kuhl-ifc-files` バケットにアップロード
- `kuhl_ifc_files` テーブルにメタデータ登録（後続タスク）

### テストケース要件

| TC | 概要 | 信頼性 |
|----|------|-------|
| TC-001 | ドラッグ&ドロップUI動作 | 🟡 |
| TC-002 | 100MB超ファイル拒否 | 🔵 |
| TC-003 | パース成功→Level反映 | 🔵 |
| TC-004 | パースエラー→メッセージ | 🟡 |

### 既存基盤の利用

**useScene** (`packages/kuhl-core/src/store/use-scene.ts`)
```typescript
// ノード作成・更新
useScene.getState().createNode(node, parentId)
useScene.getState().updateNode(id, { floorHeight: 3.5 })
```

**ArchitectureRefNode** (`packages/kuhl-core/src/schema/nodes/architecture-ref.ts`)
```typescript
type ArchitectureRefNode = {
  ifcFilePath: string
  ifcModelId?: string
  geometryData?: ParsedGeometry[]
  levelMapping?: Record<string, string>  // expressID → storey.name
}
```

**ifc-import システム** (`packages/kuhl-core/src/systems/ifc/ifc-import.ts`)
- `initIfcApi(wasmPath?)` - web-ifc WASM初期化
- `parseIfcFile(ifcApi, buffer)` - IFC パース（ジオメトリ + ストーリー抽出）
- `createArchitectureRefNodeData(filePath, parseResult)` - ノードデータ構築

### UI コンポーネント設計

**IFC Upload Panel** (`IfcUploadPanel`)
```tsx
export interface IfcUploadPanelProps {
  onUploadStart?: () => void
  onUploadSuccess?: (archRefId: string) => void
  onUploadError?: (error: Error) => void
}

// 責務:
// 1. ドラッグ&ドロップ + ファイル選択 UI
// 2. ファイルサイズ検証（100MB）
// 3. ファイルアップロード（Supabase Storage）
// 4. web-ifc パース（initIfcApi + parseIfcFile）
// 5. ArchitectureRefNode 作成（useScene.createNode）
// 6. Level 情報更新（useScene.updateNode）
// 7. 進捗表示・エラーハンドリング
```

### 実装注意点

1. **Viewer Isolation** - IfcUploadPanel は apps/kuhl-editor 内（@kuhl/viewerに移行不可）
2. **ノード作成** - 常に `.parse()` を使用（Zod バリデーション）
3. **エラーハンドリング** - パース失敗時も UI は反応的（ユーザーに通知）
4. **WASM パス** - Next.js `public/wasm/` に web-ifc.wasm を配置
5. **Level マッピング** - IFC Storey → LevelNode の対応付けは後続タスク（TASK-0020）で検証

### 実装フロー（TDD）

1. **[red]** テストケース実装（失敗）
2. **[green]** 最小実装（テスト合格）
3. **[refactor]** コード整理・UI改善
4. **[verify]** カバレッジ 60% 以上確認

### 関連リソース

- IFC パース実装: `/packages/kuhl-core/src/systems/ifc/ifc-import.ts`
- IFC テスト: `/packages/kuhl-core/src/__tests__/systems/ifc/ifc-import.test.ts`
- Level スキーマ: `/packages/kuhl-core/src/schema/nodes/level.ts`
- Supabase 設定: `/docs/design/kuhl-hvac-editor/api-endpoints.md`

---

## TASK-0018 コンテキスト

**TASK**: ゾーン一覧パネル・負荷集計表示
**推定工数**: 8時間
**フェーズ**: Phase 2
**要件**: REQ-105

### 依存タスク

- **前提**: TASK-0014（ZoneDrawTool完了）✅、TASK-0015（LoadCalcSystem完了）✅
- **後続**: TASK-0019（ToolManager・フェーズ切替バー）

### 実装ファイル

- **実装**: `apps/kuhl-editor/components/panels/zone-list-panel.tsx`
- **テスト**: `apps/kuhl-editor/__tests__/components/panels/zone-list-panel.test.tsx`

### 要件概要

#### 1. ゾーン一覧テーブル 🔵

表形式でゾーン情報を表示:
- **列**: zoneName, usage（日本語ラベル）, floorArea（m²）, coolingLoad（kW）, heatingLoad（kW）
- **データ取得**: useScene から hvac_zone ノード一覧を取得
- **ロード値**: HvacZoneNode.loadResult から取得（coolingLoad, heatingLoad）

#### 2. 集計行 🔵

表の最後に集計行を追加:
- **合計面積**: 全ゾーンの floorArea の合計
- **合計冷房負荷**: 全ゾーンの coolingLoad の合計
- **合計暖房負荷**: 全ゾーンの heatingLoad の合計

#### 3. ゾーン選択連動・属性編集 🔵

インタラクション処理:
- **クリック**: 行クリック → useViewer.setSelection({ zoneId })
- **ダブルクリック**: 属性編集モード有効化
- **編集後**: updateNode(zoneId, { zoneName, usage, ... }) → マークダーティ → 再計算

### 既存基盤の利用

**useScene** (`packages/kuhl-core/src/store/use-scene.ts`)
```typescript
// ゾーン一覧取得
const nodes = useScene.getState().nodes
const zones = Object.values(nodes).filter(n => n.type === 'hvac_zone')

// ノード更新
useScene.getState().updateNode(zoneId, { zoneName: 'NewName' })
```

**HvacZoneNode** (`packages/kuhl-core/src/schema/nodes/hvac-zone.ts`)
```typescript
type HvacZoneNode = {
  id: string                    // 'zone_abc123'
  type: 'hvac_zone'
  zoneName: string
  usage: ZoneUsage              // 'office' | 'meeting' | ...
  floorArea: number             // m²
  ceilingHeight: number         // 2.7 デフォルト
  loadResult?: {                // LoadCalcSystem で計算される
    coolingLoad?: number        // kW
    heatingLoad?: number        // kW
    latentLoad?: number
    sensibleLoad?: number
    requiredAirflow?: number
  }
  // ... その他フィールド
}
```

**useViewer** (`packages/kuhl-viewer/src/store/use-viewer.ts`)
```typescript
// ゾーン選択
useViewer.getState().setSelection({ zoneId: 'zone_abc123' })

// 現在の選択取得
const { selection } = useViewer.getState()
```

### UI コンポーネント設計

**ZoneListPanel**
```tsx
export interface ZoneListPanelProps {
  levelId?: string              // フィルタリング用（オプション）
  onZoneSelect?: (zoneId: string) => void
  onZoneEdit?: (zoneId: string) => void
}

// 責務:
// 1. useScene から hvac_zone ノード一覧を取得
// 2. 表形式でゾーン情報を表示
// 3. 集計行を表示（面積・負荷合計）
// 4. ゾーンクリック → useViewer.setSelection({ zoneId })
// 5. ダブルクリック → 属性編集モード
// 6. 編集内容を updateNode で反映
```

### 実装注意点

1. **ZoneUsage の日本語ラベル** - マッピングテーブルを用意
   - 'office' → '事務所'
   - 'meeting' → '会議室'
   - 'server_room' → 'サーバー室'
   - ... etc.

2. **ロード値の有無確認** - loadResult が undefined の可能性
   - 未計算時は "-" または "計算中..." を表示
   - LoadCalcSystem で計算後に自動更新

3. **表示単位の統一** - floorArea（m²）, Load（kW）

4. **編集前後の比較** - updateNode で部分更新
   - ノード自体は Zod で検証される
   - マークダーティで再計算トリガー

### テストケース要件

| TC | 概要 | 信頼性 |
|----|------|-------|
| TC-001 | ゾーン一覧表示 | 🔵 |
| TC-002 | 集計行計算（面積・負荷） | 🔵 |
| TC-003 | ゾーンクリック → 選択 | 🔵 |
| TC-004 | 属性編集 → updateNode | 🔵 |

### 実装フロー（TDD）

1. **[red]** テストケース実装（失敗）
2. **[green]** 最小実装（テスト合格）
3. **[refactor]** UI改善・エラーハンドリング
4. **[verify]** カバレッジ 60% 以上確認

---

## TASK-0020 コンテキスト

**TASK**: LevelVisibilitySystem・InteractiveSystem
**推定工数**: 8時間
**フェーズ**: Phase 2
**信頼性レベル**: 🔵 既存ビューアシステムパターン (50% 青信号、50% 黄信号)

### 依存タスク

- **前提**: TASK-0010（イベントバス・sceneRegistry完了） ✅
- **前提**: TASK-0012（Viewer基盤完了） ✅
- **後続**: TASK-0021（EquipmentRenderer（LOD100 ボックス表示））

### 実装ファイル

- **LevelVisibilitySystem**: `packages/kuhl-viewer/src/systems/level-visibility-system.tsx`
- **InteractiveSystem**: `packages/kuhl-viewer/src/systems/interactive-system.tsx`
- **テスト**: `packages/kuhl-viewer/src/__tests__/systems/level-visibility.test.tsx`

### 要件概要

#### 1. LevelVisibilitySystem 🔵

**責務**: useViewer.levelId に基づき、ノードの visible フラグを制御する React コンポーネント

**実装ポイント**:
- useViewer から levelId を購読
- sceneRegistry.nodes を走査
- ノード と LevelNode の親子関係を調べ、選択レベル配下のノードのみ visible = true に
- 他レベルのノードは visible = false に
- useFrame(priority=1) で毎フレーム実行

**既存基盤の利用**:
```typescript
// useViewer
import useViewer from '@kuhl/viewer'
const { selection } = useViewer.getState()
const levelId = selection.levelId

// sceneRegistry
import { sceneRegistry } from '@kuhl/core'
sceneRegistry.nodes.get(nodeId)  // Object3D 取得
sceneRegistry.byType.level       // Level ノード一覧

// useScene（ノード情報取得）
import { useScene } from '@kuhl/core'
const { nodes } = useScene.getState()
const node = nodes[nodeId]
if (node.parentId === levelId) { ... }
```

#### 2. InteractiveSystem 🟡

**責務**: マウスホバーとクリックによるインタラクション処理

**実装ポイント**:
- マウスホバー → ノード特定 → Object3D ハイライト（emissive 色付け）
- クリック → useViewer.setSelection({ ... }) で選択パス更新
- Raycaster で実オブジェクト判定
- useFrame(priority=2) で毎フレーム Raycaster 実行
- Viewer Isolation: @kuhl/viewer のみで実装（apps/kuhl-editor からインポート禁止）

**既存基盤の利用**:
```typescript
// useViewer（ホバー・選択状態更新）
useViewer.getState().setHoveredId(nodeId)
useViewer.getState().setSelection({ zoneId, levelId, ... })

// sceneRegistry（クリック対象ノード特定）
const object = sceneRegistry.nodes.get(nodeId) as THREE.Object3D

// EventEmitter（クリックイベント発火） - 将来拡張向け
import { emitter } from '@kuhl/core'
emitter.emit('zone:click', { zoneId })
```

### Three.js レイヤー構成

- `SCENE_LAYER (0)` - 通常ジオメトリ（機器、ダクト、配管）
- `EDITOR_LAYER (1)` - エディタヘルパー（ポートマーカー、寸法線）
- `ZONE_LAYER (2)` - ゾーンオーバーレイ（半透明着色）

参照: `packages/kuhl-viewer/src/constants/layers.ts`

### System パターン

TASK-0015 の LoadCalcSystem を参考にした実装パターン:
```typescript
// packages/kuhl-core/src/systems/zone/load-calc-system.ts の実装方針を踏襲

export function processLevelVisibility(): void {
  // useFrame コールバック内で実行するロジック
  // 毎フレーム、dirty ノードを処理
}

export const LevelVisibilitySystem: React.FC = () => {
  // useFrame(priority=1, processLevelVisibility)
  return null
}
```

- System コンポーネントは null を返す
- ロジックを純粋関数 (`process*`) に分離（テスト可能化）
- 動的 import で useFrame を取得（テスト環境でも動作）

### 既存 ZoneRenderer パターン参考

`packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx`:
- sceneRegistry.nodes.set(nodeId, meshRef.current) で登録
- sceneRegistry.byType.hvac_zone.add(nodeId) で型別分類
- useEffect クリーンアップで削除
- ジオメトリ・マテリアル破棄でメモリリーク防止

### useViewer SelectionPath 構造

```typescript
type SelectionPath = {
  plantId: string | null
  buildingId: string | null
  levelId: string | null
  zoneId: string | null
  selectedIds: string[]
}
```

### テストケース要件

| TC | 概要 | 信頼性 |
|----|------|-------|
| TC-001 | 選択レベルのノードのみ表示 | 🔵 |
| TC-002 | levelId 切替時に表示更新 | 🔵 |
| TC-003 | ホバー → ハイライト表示 | 🟡 |
| TC-004 | クリック → 選択パス更新 | 🟡 |

- カバレッジ: 60% 以上
- テストファイル: `packages/kuhl-viewer/src/__tests__/systems/level-visibility.test.tsx`

### 注意事項

1. **Viewer Isolation** - InteractiveSystem は @kuhl/viewer 内のみ（エディタ固有ロジックなし）
2. **System Fallback** - @react-three/fiber 未利用環境でも空コンポーネント返却
3. **メモリ管理** - Raycaster、マテリアルは useFrame 内で毎回生成・破棄推奨（キャッシュは慎重に）
4. **Layer 分離** - visible 制御は SCENE_LAYER に限定（UI層に影響なし）

### 実装フロー（TDD）

1. **[red]** テストケース実装（失敗）
2. **[green]** 最小実装（テスト合格）
3. **[refactor]** システムロジック整理、パフォーマンス最適化
4. **[verify]** カバレッジ 60% 以上確認
