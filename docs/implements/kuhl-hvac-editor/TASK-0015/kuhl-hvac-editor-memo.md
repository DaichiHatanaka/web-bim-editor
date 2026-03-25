# TASK-0015: LoadCalcSystem（m²単価法負荷概算） - 実装メモ

**作成日**: 2026-03-25
**調査対象タスク**: TASK-0015
**依存タスク**: TASK-0005 (HvacZoneNode), TASK-0009 (useScene)

---

## 1. タスク概要

### TASK-0015 の目的
LoadCalcSystem（useFrame ベースのReactコンポーネント）により、HvacZoneノードの負荷概算を自動化する。

**実装内容**:
- m²単価法による冷暖房負荷計算（用途別負荷原単位テーブル）
- 方位補正（N=0.9, S=1.15, E=1.05, W=1.1）
- ガラス面積補正
- floorArea=0のゾーンをスキップ
- dirtyNodes から hvac_zone を検出→calculateZoneLoad()→updateNode で自動再計算

**推定工数**: 8時間（TDD）
**フェーズ**: Phase 2 - ゾーニング＋負荷概算
**信頼性レベル**: 🔵 青信号（設計文書 §3.2・REQ-103, REQ-104）

---

## 2. 依存タスク実装状況サマリー

### TASK-0005: HvacZoneNodeスキーマ ✅ 完了
**実装ファイル**: `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`

**実装内容**:
- ZoneUsage: 11種類 (office, meeting, server_room, lobby, corridor, toilet, kitchen, warehouse, mechanical_room, electrical_room, other)
- HvacType: 8種類 (single_duct, dual_duct, fcu_oa, vrf, pac, radiant, displacement, none)
- DesignConditions: summerDryBulb(26), summerHumidity(50), winterDryBulb(22), winterHumidity(40)等（デフォルト値設定）
- LoadCalcResult: coolingLoad?, heatingLoad?, latentLoad?, sensibleLoad?, requiredAirflow?（全フィールドオプショナル）
- HvacZoneNode: zone_xxx ID、zoneName、zoneCode、usage、floorArea、ceilingHeight(default:2.7)、occupancy、lightingDensity、equipmentDensity、designConditions、loadResult?、hvacType?、systemId?、boundary?

**TASK-0015で使用する属性**:
- `usage`: 用途別負荷原単位テーブルの参照キー
- `floorArea`: m²単価法の計算ベース（W/m²×floorArea）
- `designConditions`: 温度差ΔTの計算に使用
- `loadResult`: 計算結果の保存先

---

### TASK-0009: useSceneストアフォーク・CRUD・Zundo ✅ 完了
**実装ファイル**: `packages/kuhl-core/src/store/use-scene.ts`

**実装内容**:
- Zustand + Zundo temporal middleware
- フラットノード辞書管理 (Record<AnyNodeId, AnyNode>)
- CRUD操作: createNode(), updateNode(), deleteNode()
- dirtyNodes: Set<AnyNodeId> 管理
- markDirty(id): 変更フラグ追加
- clearDirty(id): 変更フラグ削除
- undo/redo 機能（max 50 snapshots）

**TASK-0015で使用するAPI**:
```typescript
useScene.getState().dirtyNodes          // 変更されたノードID一覧
useScene.getState().nodes               // フラットノード辞書
useScene.getState().updateNode(id, data) // ノード部分更新→markDirty自動実行
useScene.getState().clearDirty(id)      // dirtyフラグクリア
```

---

## 3. 既存コードの要点

### HvacZoneNode型定義
```typescript
// packages/kuhl-core/src/schema/nodes/hvac-zone.ts

export type HvacZoneNode = {
  id: string                    // zone_xxx
  type: 'hvac_zone'
  zoneName: string
  usage: ZoneUsage              // 11種用途
  floorArea: number             // m² (負荷計算の基本単位)
  ceilingHeight: number         // default:2.7
  designConditions: {
    summerDryBulb: number       // default:26℃
    winterDryBulb: number       // default:22℃
    // ...
  }
  loadResult?: LoadCalcResult   // 計算結果（System が設定）
  boundary?: [number, number][] // ポリゴン頂点
}
```

### ZoneUsage列挙型
```typescript
type ZoneUsage =
  | 'office'                    // オフィス: cooling=150W/m², heating=100W/m²
  | 'meeting'                   // 会議室: cooling=180W/m², heating=120W/m²
  | 'server_room'               // サーバー室: cooling=300W/m², heating=50W/m²
  | 'lobby'                     // ロビー: cooling=120W/m², heating=80W/m²
  // ... その他7種類
```

### LoadCalcResult型
```typescript
export type LoadCalcResult = {
  coolingLoad?: number          // 冷房負荷 [W]
  heatingLoad?: number          // 暖房負荷 [W]
  latentLoad?: number           // 潜熱負荷 [W]
  sensibleLoad?: number         // 顕熱負荷 [W]
  requiredAirflow?: number      // 必要給気量 [m³/h]
}
```

### useSceneの dirtyNodes・updateNode
```typescript
// dirtyNodesは useFrame内でシステムが反復処理
const { dirtyNodes, nodes } = useScene.getState()
for (const nodeId of dirtyNodes) {
  const node = nodes[nodeId]
  if (node.type === 'hvac_zone') {
    // 負荷計算実行
    const result = calculateZoneLoad(node)
    // 結果を保存
    useScene.getState().updateNode(nodeId, { loadResult: result })
    // markDirtyは updateNode内で自動実行
  }
}
```

---

## 4. 実装ファイル構成

### 実装予定パス

```
packages/kuhl-core/src/systems/zone/
├── load-calc.ts                       # 純粋関数（負荷計算ロジック）
├── load-calc-system.ts                # useFrameコンポーネント
└── __tests__/
    └── load-calc.test.ts              # テストケース

packages/kuhl-core/src/__tests__/systems/zone/
└── load-calc.test.ts                  # テストファイル（vitest）
```

### load-calc.ts（純粋関数）
**責務**: ユーザー入力またはシーン属性から負荷を計算し、不変な結果を返す。

```typescript
/**
 * 用途別負荷原単位テーブル [W/m²]
 * { usage: { cooling, heating } }
 */
const LOAD_UNIT_TABLE = {
  office: { cooling: 150, heating: 100 },
  meeting: { cooling: 180, heating: 120 },
  server_room: { cooling: 300, heating: 50 },
  lobby: { cooling: 120, heating: 80 },
  // ... 全11種
}

/**
 * 方位補正係数テーブル
 */
const ORIENTATION_FACTORS = {
  N: 0.9,
  S: 1.15,
  E: 1.05,
  W: 1.1,
  // default or unknown
}

/**
 * ゾーン負荷を計算する純粋関数
 * @param zone HvacZoneNode
 * @returns LoadCalcResult（または undefined if floorArea=0）
 */
export function calculateZoneLoad(zone: HvacZoneNode): LoadCalcResult | undefined {
  // floorArea=0 のスキップ
  if (zone.floorArea <= 0) {
    return undefined
  }

  // 用途別原単位取得
  const unitData = LOAD_UNIT_TABLE[zone.usage]
  if (!unitData) {
    return undefined
  }

  // 方位補正係数取得（boundary から推測 or designConditions から）
  // → TASK-0015では未実装、TASK-0009以降で追加可能

  // 冷房負荷計算: 原単位 × 面積 × 方位補正 × ガラス補正
  const coolingLoad = unitData.cooling * zone.floorArea // [W]

  // 暖房負荷計算
  const heatingLoad = unitData.heating * zone.floorArea // [W]

  // 必要給気量計算
  // requiredAirflow = coolingLoad / (1.2 × 1006 × ΔT) × 3600
  // ΔT = summerDryBulb - 室内設定温度(デフォルト24℃) = 26 - 24 = 2K
  const deltaT = zone.designConditions.summerDryBulb - 24
  const requiredAirflow = (coolingLoad / (1.2 * 1006 * deltaT)) * 3600 // [m³/h]

  return {
    coolingLoad,
    heatingLoad,
    requiredAirflow,
  }
}
```

### load-calc-system.ts（useFrameコンポーネント）
**責務**: React コンポーネント。useFrame 内で dirtyNodes を走査→calculateZoneLoad()→updateNode()→clearDirty を実行。

```typescript
import useScene from '@kuhl/core'
import { useFrame } from '@react-three/fiber'
import { calculateZoneLoad } from './load-calc'

/**
 * LoadCalcSystem コンポーネント
 * - useFrame priority=2 で実行
 * - dirtyNodes から hvac_zone を検出
 * - calculateZoneLoad() で負荷計算
 * - updateNode() で結果保存（自動markDirty）
 * - clearDirty() で完了
 */
export function LoadCalcSystem() {
  useFrame(() => {
    const { nodes, dirtyNodes } = useScene.getState()

    for (const nodeId of dirtyNodes) {
      const node = nodes[nodeId]
      if (node?.type === 'hvac_zone') {
        // 純粋関数で計算
        const loadResult = calculateZoneLoad(node)

        // 結果を保存（updateNode内で markDirty が自動実行）
        useScene.getState().updateNode(nodeId, { loadResult })

        // 処理完了をマーク
        useScene.getState().clearDirty(nodeId)
      }
    }
  }, 2) // priority=2（システムレベル実行）

  return null // System コンポーネントは描画しない
}
```

### load-calc.test.ts（テストケース）
**テストフレームワーク**: Vitest + Zustand mock

```typescript
import { describe, expect, it } from 'vitest'
import { HvacZoneNode } from '@kuhl/core'
import { calculateZoneLoad } from './load-calc'

describe('calculateZoneLoad', () => {
  // テストケース1: office用途の冷暖房負荷計算
  it('calculates cooling and heating load for office usage', () => {
    const zone = HvacZoneNode.parse({
      zoneName: 'Office Zone A',
      usage: 'office',
      floorArea: 100,
    })
    const result = calculateZoneLoad(zone)
    expect(result).toBeDefined()
    expect(result?.coolingLoad).toBeCloseTo(100 * 150, 1)  // 15000W
    expect(result?.heatingLoad).toBeCloseTo(100 * 100, 1)  // 10000W
  })

  // テストケース2: 用途別原単位テーブル正確性
  it('supports all 11 usage types in unit table', () => {
    const usages: ZoneUsage[] = [
      'office', 'meeting', 'server_room', 'lobby', 'corridor',
      'toilet', 'kitchen', 'warehouse', 'mechanical_room', 'electrical_room', 'other',
    ]
    for (const usage of usages) {
      const zone = HvacZoneNode.parse({
        zoneName: `Zone-${usage}`,
        usage,
        floorArea: 100,
      })
      const result = calculateZoneLoad(zone)
      expect(result).toBeDefined()
      expect(result?.coolingLoad).toBeGreaterThan(0)
    }
  })

  // テストケース3: 方位補正（TODO: 将来実装）
  // → TASK-0015では未実装。boundary または orientation 属性追加後に実装

  // テストケース4: ガラス面積補正（TODO: 将来実装）
  // → TASK-0015では未実装。glazingRatio 属性追加後に実装

  // テストケース5: floorArea=0 スキップ
  it('skips load calculation when floorArea is 0', () => {
    const zone = HvacZoneNode.parse({
      zoneName: 'Empty Zone',
      usage: 'office',
      floorArea: 0,
    })
    const result = calculateZoneLoad(zone)
    expect(result).toBeUndefined()
  })

  // テストケース6: dirtyNodes検出→再計算
  // → Integration test（useScene + LoadCalcSystem連携テスト）

  // テストケース7: 属性変更→自動再計算
  // → Integration test（useScene.updateNode → markDirty → System → clearDirty）
})
```

---

## 5. 注意事項

### 純粋関数として実装
- `calculateZoneLoad()` は入力値のみに依存し、副作用なし
- 同じ入力に対して常に同じ出力（テスト容易性、デバッグ容易性）
- useScene などのストアに直接依存しない

### useFrame ベースのSystem
- `LoadCalcSystem` は React コンポーネント（`null` を返す）
- priority=2 で実行（他のシステムより後）
- `dirtyNodes` のみを走査し、全ノード反復を避ける
- `updateNode()` 呼び出しで自動的に markDirty が実行されるため、`clearDirty()` で完了マークを行う

### 計算式の根拠
- **冷房負荷**: `coolingLoad = 原単位(W/m²) × floorArea(m²) × 方位補正係数 × ガラス補正係数`
- **暖房負荷**: `heatingLoad = 原単位(W/m²) × floorArea(m²) × 方位補正係数`（方位補正は寒冷地仕様で調整）
- **必要給気量**: `requiredAirflow = coolingLoad / (1.2 kg/m³ × 1006 J/kgK × ΔT(K)) × 3600(s/h)`
  - 空気密度: 1.2 kg/m³（常温）
  - 空気比熱: 1006 J/kgK
  - ΔT: summerDryBulb - 室内設定温度（デフォルト24℃）

### 将来拡張性
- 方位補正・ガラス面積補正: 現在未実装、TASK-0016 以降で boundary 処理完成後に追加
- ピーク負荷計算（時刻別）: NFR-401 で要件追加時に拡張可能な設計を維持

### テストカバレッジ目標
- 目標: 60%以上
- 対象:
  - calculateZoneLoad() の全用途（11種類）
  - floorArea=0, 負のケース
  - 必要給気量計算の精度
  - System の dirtyNodes 走査・updateNode 連携

---

## 6. 関連ファイル一覧

| ファイルパス | 説明 | ステータス |
|-------------|------|----------|
| `packages/kuhl-core/src/schema/nodes/hvac-zone.ts` | HvacZoneNode型定義 | ✅ 完了 |
| `packages/kuhl-core/src/store/use-scene.ts` | useScene ストア（CRUD・dirtyNodes） | ✅ 完了 |
| `packages/kuhl-core/src/schema/types.ts` | AnyNode ユニオン型 | ✅ 完了 |
| `packages/kuhl-core/vitest.config.ts` | テスト設定 | ✅ 完了 |
| `packages/kuhl-core/src/systems/zone/load-calc.ts` | **純粋関数（m²単価法計算）** | ⏳ TASK-0015実装予定 |
| `packages/kuhl-core/src/systems/zone/load-calc-system.ts` | **useFrameコンポーネント** | ⏳ TASK-0015実装予定 |
| `packages/kuhl-core/src/__tests__/systems/zone/load-calc.test.ts` | **テストケース** | ⏳ TASK-0015実装予定 |

---

## 7. TDD実装ステップ

1. **要件定義**: `/tsumiki:tdd-requirements TASK-0015`
2. **テストケース作成**: `/tsumiki:tdd-testcases`
3. **Red（テスト実装・失敗）**: `/tsumiki:tdd-red`
4. **Green（最小実装）**: `/tsumiki:tdd-green`
5. **Refactor**: `/tsumiki:tdd-refactor`
6. **品質確認**: `/tsumiki:tdd-verify-complete`

---

## 8. 完了条件チェックリスト

- [ ] m²単価法での負荷概算が動作する
- [ ] 方位補正・ガラス面積補正が適用される（将来実装）
- [ ] floorArea=0 のゾーンをスキップする
- [ ] ゾーン属性変更時に自動再計算される（dirtyNodes → System → updateNode）
- [ ] テスト60%以上カバレッジ

---

**資料作成**: Claude Code Agent
**調査日時**: 2026-03-25
