# TASK-0022: EquipmentRenderer（LOD200 プロシージャル・GLB）- 実装タスクノート

**作成日**: 2026-03-25
**タスクID**: TASK-0022
**タスクタイプ**: TDD（テスト駆動開発）
**推定工数**: 8時間
**フェーズ**: Phase 3 - 機器配置
**信頼性レベル**: 🟡 中程度品質 (43% 青信号、57% 黄信号)

---

## タスク概要

EquipmentRenderer の LOD200 拡張実装。node.lod 属性で `'200'` が指定されたとき、以下のいずれかの描画方式で機器を表示する:

1. **modelSrc 指定時** 🔵 - useGLTF + Suspense で GLB/GLTF モデルを読込
2. **modelSrc 未指定時** 🟡 - ProceduralEquipment でタイプ別簡易3D形状を生成（AHU/PAC/FCU等）

LOD 切替ロジックは既存 EquipmentRenderer に統合。Suspense fallback は LOD100 BoxGeometry。

---

## 依存関係

### 前提タスク（完了済み）

- [x] **TASK-0006**: HvacEquipmentBase・PortDef・共通機器型 - スキーマ定義（lod フィールド含む）
- [x] **TASK-0010**: イベントバス・sceneRegistry - イベント・レジストリ基盤
- [x] **TASK-0012**: Viewer基盤コンポーネント・Canvas・Grid - Three.js Canvas環境
- [x] **TASK-0021**: EquipmentRenderer（LOD100 ボックス表示） - LOD100 実装完了

### 後続タスク

- [ ] **TASK-0023**: DiffuserRenderer - diffuser 専用レンダラー
- [ ] **TASK-0024**: EquipmentSystem（ポート位置計算） - ポート動的位置計算
- [ ] **TASK-0025**: AhuPlaceTool・PacPlaceTool - 配置ツール

---

## TASK-0021 との関係性

TASK-0021 で実装した EquipmentRenderer は **LOD100 のみ** に対応している:

```typescript
// TASK-0021: LOD100 BoxGeometry レンダリング
const geometry = useMemo(
  () => new THREE.BoxGeometry(dimensions[0], dimensions[1], dimensions[2]),
  [dimensions[0], dimensions[1], dimensions[2]],
)
```

TASK-0022 では以下を追加:

1. **LOD 切替判定** - `node.lod === '200'` で分岐
2. **ProceduralEquipment** - LOD200 プロシージャル形状（新規コンポーネント）
3. **GlbModelRenderer** - LOD200 GLB読込（新規コンポーネント）
4. **Suspense 統合** - GLB読込中は LOD100 ボックスを表示

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| 3D エンジン | Three.js (WebGPU), React Three Fiber, Drei (useGLTF) |
| フレームワーク | Next.js 16, React 19 |
| 状態管理 | Zustand 5（useScene, useViewer） |
| スキーマ | Zod 4（node validation） |
| UI | Radix UI, Tailwind CSS 4 |
| テスト | Vitest, React Three Test Renderer |

---

## 既存コードベース参照（TASK-0021 実装から）

### 1. EquipmentRenderer（LOD100 実装）

**ファイル**: `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx`

```typescript
// LOD100 のみの現在の実装
export const EquipmentRenderer: FC<EquipmentRendererProps> = ({ nodeId }) => {
  const node = useScene((state) => (nodeId ? state.nodes[nodeId] : undefined))

  // dimensions から BoxGeometry を生成
  const geometry = useMemo(
    () => new THREE.BoxGeometry(dimensions[0], dimensions[1], dimensions[2]),
    [dimensions[0], dimensions[1], dimensions[2]],
  )

  // タグ・ポートマーカー表示
  return (
    <group position={...} rotation={...}>
      <mesh ref={meshRef} geometry={geometry} material={material} />
      <TagLabel tag={equipmentNode.tag} offset={tagLabelOffset} />
      <PortMarkers ports={equipmentNode.ports ?? []} />
    </group>
  )
}
```

### 2. HvacEquipmentBase スキーマ

**ファイル**: `packages/kuhl-core/src/schema/nodes/hvac-equipment-base.ts`

```typescript
export const HvacEquipmentBase = BaseNode.extend({
  position: Vector3Schema,           // [x, y, z]
  rotation: Vector3Schema,           // [rx, ry, rz] (ラジアン)
  dimensions: Vector3Schema,         // [width, height, depth]
  tag: z.string(),
  equipmentName: z.string(),
  ports: z.array(PortDef).default([]),

  // LOD 制御フィールド
  lod: LodLevel,                     // '100' | '200' | '300'
  modelSrc: z.string().optional(),   // GLB/GLTF URL（LOD200以上用）

  // ... 他のフィールド
  status: EquipmentStatus,           // 'planned' | 'existing' | 'demolished'
})
```

### 3. 既存カラーマップ

**ファイル**: `packages/kuhl-viewer/src/constants/equipment-colors.ts`

```typescript
// TASK-0021 で定義済み
export const EQUIPMENT_COLOR_MAP: Record<string, string> = {
  ahu: '#4A90E2',           // 青
  pac: '#7ED321',           // 緑
  fcu: '#F39C12',           // 橙
  vrf_outdoor: '#2C3E50',   // 濃紺
  vrf_indoor: '#3498DB',    // 明るい青
  diffuser: '#E74C3C',      // 赤
  damper: '#95A5A6',        // グレー
  fan: '#9B59B6',           // 紫
  pump: '#1ABC9C',          // ティール
  chiller: '#27AE60',       // 深緑
  boiler: '#E67E22',        // オレンジ
  cooling_tower: '#16A085', // 深ティール
  valve: '#34495E',         // 濃グレー
}
```

---

## LOD 切替ロジック設計

### 概要

```typescript
// TASK-0022 で追加する切替ロジック
if (equipmentNode.lod === '100') {
  // TASK-0021: LOD100 BoxGeometry 描画（既存）
  return <group>
    <mesh geometry={BoxGeometry} ... />
    <TagLabel ... />
    <PortMarkers ... />
  </group>
} else if (equipmentNode.lod === '200') {
  // TASK-0022: LOD200 GLB または Procedural 描画（新規）
  if (modelSrc) {
    // GlbModelRenderer で GLB 読込（Suspense fallback = LOD100）
    return <Suspense fallback={<LOD100Fallback />}>
      <GlbModelRenderer modelSrc={modelSrc} ... />
    </Suspense>
  } else {
    // ProceduralEquipment で簡易3D形状生成
    return <ProceduralEquipment type={equipmentNode.type} ... />
  }
}
```

### フロー図

```
EquipmentRenderer
├─ LOD判定: node.lod
│
├─ LOD100:
│  └─ BoxGeometry + TagLabel + PortMarkers（既存 TASK-0021）
│
└─ LOD200:
   ├─ modelSrc が存在？
   │  ├─ Yes → Suspense で GLB 読込（GlbModelRenderer）
   │  │         fallback: LOD100 BoxGeometry
   │  └─ No  → ProceduralEquipment で簡易形状生成
   │
   └─ タグ・ポートマーカーは LOD200 でも表示
```

---

## ProceduralEquipment コンポーネント要件（黄信号：推測ベース）

**ファイル**: `packages/kuhl-viewer/src/components/renderers/parts/procedural-equipment.tsx`
**信頼性**: 🟡 *要件定義書 REQ-208 から推測、具体的な形状定義は未確定*

### 責務

- タイプ別に簡易3D形状をプロシージャルに生成
- modelSrc が無い場合の LOD200 表示
- TASK-0021 の TagLabel・PortMarkers と互換性を保つ

### タイプ別形状仕様（推測）

| 機器タイプ | LOD200 形状 | パラメータ |
|----------|-----------|----------|
| `ahu` | 箱+ダクト接続口 | width×height×depth の箱に、4面に円形接続口 |
| `pac` | 天カセ薄型 | width×(height×0.3)×depth（薄い四角形） |
| `fcu` | 小型箱 | width×(height×0.5)×depth、より小型 |
| `vrf_outdoor` | 大型箱 | width×1.3height×depth |
| `vrf_indoor` | 小型ユニット | 0.5width×0.5height×0.5depth |
| `chiller` | 直方体+パイプ | 標準箱、サイド2本のパイプ |
| `boiler` | 円筒形 | radius=width/2, height=dimensions[1] |
| `pump` | 直方体+モーター | 小型箱+円筒モーター |
| 他（damper等） | LOD100と同じ | width×height×depth（LOD100と同一） |

### 実装パターン（参考：zone-renderer パターン踏襲）

```typescript
// 純粋関数として形状生成ロジックを分離
export function generateAhuShape(dimensions: [number, number, number]): THREE.Group {
  const group = new THREE.Group()

  // メイン箱
  const mainBox = new THREE.BoxGeometry(dimensions[0], dimensions[1], dimensions[2])
  const mesh = new THREE.Mesh(mainBox, material)
  group.add(mesh)

  // ダクト接続口（各面に円形）
  const portGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16)
  // ... 接続口配置

  return group
}

export const ProceduralEquipment: FC<ProceduralEquipmentProps> = ({
  type,
  dimensions,
  color,
}) => {
  const geometry = useMemo(() => {
    switch (type) {
      case 'ahu':
        return generateAhuShape(dimensions)
      case 'pac':
        return generatePacShape(dimensions)
      // ... 他のタイプ
      default:
        return new THREE.BoxGeometry(...dimensions)
    }
  }, [type, dimensions])

  return <mesh geometry={geometry} material={material} />
}
```

### Props インターフェース（仮）

```typescript
export interface ProceduralEquipmentProps {
  /** 機器タイプ */
  type: string
  /** 寸法 [width, height, depth] */
  dimensions: [number, number, number]
  /** 色コード */
  color: string
}
```

---

## GlbModelRenderer コンポーネント要件（青信号：Drei useGLTF）

**ファイル**: `packages/kuhl-viewer/src/components/renderers/parts/glb-model-renderer.tsx`
**信頼性**: 🔵 *REQ-209 + Drei useGLTF 実績から確認*

### 責務

- `node.modelSrc` から GLB/GLTF モデルを useGLTF で読込
- Suspense 統合で非同期ロード対応
- ロード失敗時のエラーハンドリング
- モデルのスケーリング・位置調整（dimensions に合わせる）

### 実装パターン（Drei useGLTF）

```typescript
import { useGLTF } from '@react-three/drei'

export const GlbModelRenderer: FC<GlbModelRendererProps> = ({
  modelSrc,
  dimensions,
}) => {
  // useGLTF でモデル読込（Suspense 対応）
  const { scene: gltfScene } = useGLTF(modelSrc)

  // モデルのジオメトリから AABB（axis-aligned bounding box）を計算
  const bbox = new THREE.Box3().setFromObject(gltfScene)
  const bboxSize = bbox.getSize(new THREE.Vector3())

  // dimensions に合わせてスケーリング
  const scale = [
    dimensions[0] / bboxSize.x,
    dimensions[1] / bboxSize.y,
    dimensions[2] / bboxSize.z,
  ]

  const modelClone = gltfScene.clone()
  modelClone.scale.set(...scale)

  return <primitive object={modelClone} />
}
```

### Props インターフェース（仮）

```typescript
export interface GlbModelRendererProps {
  /** GLB/GLTF ファイルの URL */
  modelSrc: string
  /** 目標寸法 [width, height, depth] */
  dimensions: [number, number, number]
}
```

### Suspense フォールバック

```typescript
<Suspense fallback={
  // LOD100 BoxGeometry を fallback として使用（TASK-0021 既存実装から再利用）
  <LOD100BoxFallback
    dimensions={dimensions}
    color={getEquipmentColor(equipmentNode.type)}
  />
}>
  <GlbModelRenderer modelSrc={modelSrc} dimensions={dimensions} />
</Suspense>
```

---

## 実装ファイル一覧

### メインファイル

| ファイル | 責務 | サイズ目安 | 信頼性 |
|---------|------|----------|-------|
| `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx` | メインレンダラー。LOD切替判定、既存コード修正 | ~250行（拡張） | 🔵 |
| `packages/kuhl-viewer/src/components/renderers/parts/procedural-equipment.tsx` | LOD200 プロシージャル形状生成 | ~250行 | 🟡 |
| `packages/kuhl-viewer/src/components/renderers/parts/glb-model-renderer.tsx` | LOD200 GLB読込（useGLTF + Suspense） | ~150行 | 🔵 |
| `packages/kuhl-viewer/src/components/renderers/parts/lod100-fallback.tsx` | Suspense fallback（LOD100ボックス） | ~80行 | 🔵 |

### テストファイル

| ファイル | テスト対象 | テストケース数 | 信頼性 |
|---------|-----------|---------------|-------|
| `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-lod200.test.tsx` | ProceduralEquipment, GlbModelRenderer, LOD切替、Suspense | 8-10件 | 🟡 |

### 定数・補助ファイル

| ファイル | 内容 | 信頼性 |
|---------|------|-------|
| `packages/kuhl-viewer/src/constants/equipment-colors.ts` | 既存（TASK-0021）から再利用 | 🔵 |
| `packages/kuhl-viewer/src/constants/layers.ts` | 既存（TASK-0021）から再利用 | 🔵 |

---

## 単体テスト要件

### テストケース一覧

| # | テストケース | 信頼性 | 説明 |
|----|-------------|-------|------|
| 1 | modelSrc → GLB読込動作 | 🟡 | modelSrc 指定時に useGLTF が呼ばれ、GLB が Suspense で読込される |
| 2 | modelSrc 未指定 → ProceduralEquipment | 🟡 | modelSrc なし時に ProceduralEquipment が表示される |
| 3 | Suspense fallback = LOD100 | 🟡 | GLB読込中に LOD100 BoxGeometry が表示される |
| 4 | LOD='100' → BoxGeometry（既存） | 🔵 | lod='100' 時は TASK-0021 既存ロジック実行 |
| 5 | LOD='200' modelSrc有 → GLB | 🟡 | lod='200' かつ modelSrc 有時に GlbModelRenderer が実行 |
| 6 | LOD='200' modelSrc無 → Procedural | 🟡 | lod='200' かつ modelSrc 無時に ProceduralEquipment が実行 |
| 7 | タグ・ポート表示（LOD200） | 🔵 | LOD200 でも TagLabel・PortMarkers が表示される |
| 8 | GLB読込エラーハンドリング | 🟡 | GLB URL無効時にエラーメッセージを表示またはフォールバック |

**テストファイル**: `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-lod200.test.tsx`

**カバレッジ目標**: 60% 以上

**テスト実装方針**:
- Vitest + React Three Test Renderer (RTF) を使用
- mock useScene, useViewer でストア状態を制御
- Suspense テストは `<Suspense>` + `<React.lazy>` パターンで実装
- Three.js オブジェクト の 生成 検証（instanceof THREE.BoxGeometry等）
- useGLTF は mock Drei コンポーネントで代替

---

## 実装時の注意点

### 1. Viewer Isolation（重要）

- EquipmentRenderer の拡張は **`@kuhl/viewer` パッケージに属する**
- `apps/kuhl-editor` からは **インポート禁止**
- editor 固有ロジック（tool、panel等）は editor app に配置

### 2. LOD 判定の堅牢性

```typescript
// 安全な LOD 判定
if (!equipmentNode) return null
if (equipmentNode.lod === '100') {
  // LOD100 処理
} else if (equipmentNode.lod === '200') {
  // LOD200 処理
}
// LOD='300' 以上は将来拡張向け
```

### 3. Suspense 統合のポイント

- GLB読込は Suspense で非同期処理（UI がブロックされない）
- fallback は LOD100 ボックスを使用（loading 中も3D表示）
- lazy component として GlbModelRenderer をラップ検討

```typescript
const GlbModelRendererLazy = lazy(() =>
  import('./glb-model-renderer').then(m => ({ default: m.GlbModelRenderer }))
)
```

### 4. ProceduralEquipment の形状定義

- 具体的な形状は REQ-208 の詳細要件を待つ（現在は推測）
- タイプ別形状は `switch` 文で分岐管理
- 共通パラメータ（color, dimensions）は統一して渡す

### 5. メモリ管理

- useMemo で ProceduralEquipment geometry 再生成を防止
- useEffect cleanup で リソース破棄（geometry.dispose(), material.dispose()）
- GLB モデルのメモリ: useGLTF が内部キャッシュ管理

### 6. エラーハンドリング

```typescript
// GLB読込失敗時
try {
  const { scene } = await useGLTF(modelSrc)
} catch (error) {
  console.error('GLB load failed:', error)
  // フォールバック: LOD100 表示 または エラーメッセージ
}
```

---

## 技術的制約と設計判断

### 制約1: Suspense サポート

- RTF（React Three Fiber Test Renderer）で Suspense テスト可能（最新バージョン）
- fallback 為の LOD100 コンポーネントは TASK-0021 から再利用

### 制約2: ProceduralEquipment の形状多様性

- 全13種の機器タイプに対応する形状定義は複雑（推測ベース）
- MVP では AHU/PAC/FCU に絞って実装を検討

### 制約3: GLB スケーリング

- GLB モデル のアスペクト比とノード dimensions が異なる場合、非均等スケーリング
- モデル制作時に標準化されたスケールを前提とするか、または動的調整が必要

### 制約4: パフォーマンス（複数GLB）

- 複数 GLB を同時読込でのメモリ圧迫を考慮（LOD切替で回避可能）
- キャッシング戦略: useGLTF が自動キャッシュ管理

---

## 依存テクノロジー確認

### Drei useGLTF

- **用途**: GLB/GLTF モデルの非同期読込
- **Suspense 対応**: Yes（自動 throw Promise）
- **キャッシング**: 自動（URL単位でメモリ保持）
- **参考**: https://drei.docs.pmnd.rs/#usegltf

### React Three Fiber Suspense

- **useFrame との組み合わせ**: Suspense は RTF のコンポーネント描画時のみ（useFrame 内では不可）
- **Fallback 表示**: Suspense boundary の fallback prop

---

## 既存実装との互換性

### TASK-0021 EquipmentRenderer との互換性

TASK-0022 では TASK-0021 の EquipmentRenderer を拡張:

1. **現在の処理を保持**: LOD='100' パスは TASK-0021 コードそのまま使用
2. **新規分岐追加**: LOD='200' パスを追加（ProceduralEquipment / GlbModelRenderer）
3. **既存テストを破壊しない**: LOD='100' テストケースはそのまま合格

### TASK-0023 DiffuserRenderer との関係

- DiffuserRenderer は diffuser ノード専用レンダラー（EquipmentRenderer と並行）
- 本タスク（TASK-0022）では diffuser の LOD200 も対応するが、TASK-0023 で仕様変更可能性

---

## 実装ステップ（TDD フロー）

### Step 1: 要件定義（tdd-requirements）

- ProceduralEquipment の具体的形状仕様を確定
- GlbModelRenderer の スケーリング・位置調整の詳細を決定
- テストケースの詳細要件を洗い出し

### Step 2: テストケース作成（tdd-testcases）

- テスト8-10件のテストコード骨組みを作成
- Mock GLB URL、mock useScene 状態を用意
- Suspense テスト環境をセットアップ

### Step 3: テスト実装（tdd-red）

- テストコード記述（失敗状態）
- カバレッジ: 0%（テストのみ）

### Step 4: 最小実装（tdd-green）

- ProceduralEquipment コンポーネント実装（最小形状）
- GlbModelRenderer コンポーネント実装
- EquipmentRenderer に LOD切替ロジック追加
- テスト合格（カバレッジ: 60%以上）

### Step 5: リファクタリング（tdd-refactor）

- ProceduralEquipment 形状ロジックを純粋関数に分離
- GlbModelRenderer のエラーハンドリング改善
- パフォーマンス最適化（useMemo, geometry/material 再生成防止）
- コード品質・可読性向上

### Step 6: 品質確認（tdd-verify-complete）

- テストカバレッジ確認（60%以上）
- 手動テスト: 実機での LOD 切替動作確認
- Suspense 動作確認（GLB読込中に fallback 表示）
- メモリリーク確認（DevTools）

---

## リスク・課題

### リスク1: ProceduralEquipment 形状定義の曖昧性（黄信号）

**内容**: REQ-208 から具体的な形状が不明確
**影響**: 形状実装の工数・品質が不確定
**対策**: ステップ1（要件定義）で設計者にヒアリング、形状スケッチを共有

### リスク2: GLB モデル スケーリング の複雑性（黄信号）

**内容**: GLB モデルが様々なスケール・単位で作成されている可能性
**影響**: dimensions への対応が非均等スケーリング（見た目歪み可能）
**対策**: GLB 制作ガイドライン作成、標準化されたスケール前提を明記

### リスク3: Suspense テストの複雑性（黄信号）

**内容**: RTF で Suspense テストの実装難度が高い
**影響**: テストケース実装に工数超過
**対策**: RTF ドキュメント確認、既存プロジェクトの Suspense テスト例参考

### リスク4: パフォーマンス（複数 GLB 同時読込）

**内容**: 大量の GLB モデル読込でブラウザメモリ圧迫
**影響**: フレームレート低下
**対策**: LOD戦略で回避（LOD100 を通常表示、LOD200 は明示的に有効化）

---

## 信頼性評価

| 項目 | 信頼性 | 根拠 |
|------|-------|------|
| LOD='100' 既存ロジック | 🔵 | TASK-0021 完了 |
| LOD 切替判定ロジック | 🔵 | シンプルな条件分岐 |
| GlbModelRenderer（useGLTF） | 🔵 | Drei 実績、ドキュメント充実 |
| ProceduralEquipment（形状生成） | 🟡 | 要件定義から推測、詳細未確定 |
| Suspense 統合 | 🟡 | RTF サポート確認必要 |
| メモリ管理・最適化 | 🟡 | 複数モデル読込でのテスト必要 |

**総合信頼度**: 🟡 中程度 — ProceduralEquipment 形状定義と Suspense テスト の確認が重要

---

## 次のステップ

本タスクの実装フロー（TDD）:

1. **step-b**: `/tsumiki:tdd-requirements TASK-0022` - 詳細要件定義
2. **step-c**: `/tsumiki:tdd-testcases` - テストケース作成
3. **step-d**: `/tsumiki:tdd-red` - テスト実装（失敗）
4. **step-e**: `/tsumiki:tdd-green` - 最小実装
5. **step-f**: `/tsumiki:tdd-refactor` - リファクタリング
6. **step-g**: `/tsumiki:tdd-verify-complete` - 品質確認

---

## 参考リンク

- **タスク定義**: `docs/tasks/kuhl-hvac-editor/TASK-0022.md`
- **概要**: `docs/tasks/kuhl-hvac-editor/overview.md`
- **スペック**: `docs/spec/kuhl-hvac-editor/note.md`
- **TASK-0021 実装ノート**: `docs/implements/kuhl-hvac-editor/TASK-0021/note.md`
- **HvacEquipmentBase スキーマ**: `packages/kuhl-core/src/schema/nodes/hvac-equipment-base.ts`
- **EquipmentRenderer（TASK-0021）**: `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx`
- **equipment-colors（TASK-0021）**: `packages/kuhl-viewer/src/constants/equipment-colors.ts`
- **Drei useGLTF Doc**: https://drei.docs.pmnd.rs/#usegltf
- **React Three Fiber Suspense**: https://docs.pmnd.rs/react-three-fiber/api/hooks#usesuspense

---

## 付録: ProceduralEquipment タイプ別形状仕様（詳細推測）

### AHU（中央空調機）

```typescript
// メイン: 750×600×400mm の直方体
// サイド: 供給ダクト接続口（前面左+右）
// 裏面: リターンダクト接続口（2個）
// 上面: フィルタ蓋（フラット）
```

### PAC（パッケージエアコン天カセ）

```typescript
// 薄型: width × (height × 0.25) × depth
// 天井埋め込み想定
// 上面: 吹出し格子パターン
```

### FCU（ファンコイルユニット）

```typescript
// 小型: width × (height × 0.6) × depth
// 前面: 吹出し格子
// サイド: 冷水・温水接続口
```

### VRF Outdoor（室外機）

```typescript
// 大型: width × (height × 1.2) × depth
// 底面: 4足スタンド表現
// サイド: 冷媒配管接続ポート
```

### VRF Indoor（室内機）

```typescript
// 小型ユニット: 0.5width × 0.5height × 0.5depth
// 前面: 吹出し格子
```

---

**作成者**: Claude Code
**最終更新**: 2026-03-25
