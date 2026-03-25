# TASK-0015: LoadCalcSystem（m²単価法負荷概算） テストケース定義書

**タスクID**: TASK-0015
**機能名**: kuhl-hvac-editor
**テストファイル**: `packages/kuhl-core/src/__tests__/systems/zone/load-calc.test.ts`
**作成日**: 2026-03-25

---

## テスト方針

- **主対象**: `calculateZoneLoad()` 純粋関数のユニットテスト（全16ケース）
- **副対象**: `LoadCalcSystem` useFrameコンポーネントの結合テスト（最小限、TC-007のみ）
- **テストフレームワーク**: Vitest
- **テストデータ**: `HvacZoneNode.parse()` でZodスキーマ経由のノード生成

---

## 定数定義（テスト内で参照する期待値）

### 用途別負荷原単位テーブル（LOAD_UNIT_TABLE）

| ZoneUsage | cooling [W/m²] | heating [W/m²] |
|-----------|---------------|----------------|
| `office` | 150 | 100 |
| `meeting` | 180 | 120 |
| `server_room` | 300 | 50 |
| `lobby` | 120 | 80 |
| `corridor` | 80 | 60 |
| `toilet` | 100 | 70 |
| `kitchen` | 200 | 130 |
| `warehouse` | 60 | 40 |
| `mechanical_room` | 120 | 80 |
| `electrical_room` | 180 | 110 |
| `other` | 120 | 80 |

### 方位補正係数テーブル（ORIENTATION_FACTORS）

| 方位 | 補正係数 |
|------|---------|
| `N` | 0.90 |
| `NE` | 0.95 |
| `E` | 1.05 |
| `SE` | 1.10 |
| `S` | 1.15 |
| `SW` | 1.10 |
| `W` | 1.10 |
| `NW` | 0.95 |
| `undefined` | 1.00 |

### ガラス面積補正式

```
glazingFactor = glazingRatio > 0.3 ? 1.0 + (glazingRatio - 0.3) * 0.5 : 1.0
```

### 必要給気量計算式

```
supplyAirTemperature = 15 [℃]
ΔT = summerDryBulb - supplyAirTemperature
requiredAirflow = coolingLoad / (1.2 × 1006 × ΔT) × 3600 [m³/h]
```

---

## 正常系テストケース

### TC-001: office用途の冷暖房負荷計算

**describe**: `calculateZoneLoad > basic calculation`

| 項目 | 内容 |
|------|------|
| **目的** | 最も基本的な負荷計算が正しく動作することを確認 |
| **Given** | `HvacZoneNode.parse({ zoneName: 'Office A', usage: 'office', floorArea: 100 })` |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | `result.coolingLoad === 15000` (150 W/m² x 100 m²) |
| | `result.heatingLoad === 10000` (100 W/m² x 100 m²) |
| | `result.requiredAirflow` が正の数値 |
| **期待値詳細** | requiredAirflow = 15000 / (1.2 x 1006 x (26 - 15)) x 3600 ≈ 4068.5 m³/h |
| **信頼性** | 🔵 REQ-103 |

---

### TC-002: 全11種のusage別原単位テーブル正確性

**describe**: `calculateZoneLoad > usage unit table`

| 項目 | 内容 |
|------|------|
| **目的** | 全11種のZoneUsageに対して正しい原単位が適用されることを確認 |
| **Given** | 各usageで `HvacZoneNode.parse({ zoneName: 'Zone', usage: <usage>, floorArea: 100 })` |
| **When** | `calculateZoneLoad(zone)` を各usageで実行 |
| **Then** | 各usageに対応するcoolingLoad/heatingLoadが期待値と一致 |
| **信頼性** | 🔵 REQ-103 |

**it.each データ**:

| usage | expectedCooling | expectedHeating |
|-------|----------------|----------------|
| `office` | 15000 | 10000 |
| `meeting` | 18000 | 12000 |
| `server_room` | 30000 | 5000 |
| `lobby` | 12000 | 8000 |
| `corridor` | 8000 | 6000 |
| `toilet` | 10000 | 7000 |
| `kitchen` | 20000 | 13000 |
| `warehouse` | 6000 | 4000 |
| `mechanical_room` | 12000 | 8000 |
| `electrical_room` | 18000 | 11000 |
| `other` | 12000 | 8000 |

※ floorArea=100, orientation=undefined, glazingRatio=undefined（補正なし）での値

---

### TC-003: 方位補正（S=1.15適用）

**describe**: `calculateZoneLoad > orientation correction`

| 項目 | 内容 |
|------|------|
| **目的** | 南面（S）の方位補正が正しく適用されることを確認 |
| **Given** | `usage: 'office', floorArea: 100, orientation: 'S'` |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | `result.coolingLoad === 17250` (150 x 100 x 1.15) |
| | `result.heatingLoad === 11500` (100 x 100 x 1.15) |
| **信頼性** | 🔵 REQ-104, REQ-109 |

**注**: HvacZoneNodeスキーマに `orientation` フィールド（オプショナル）を追加する前提。

---

### TC-004: ガラス面積補正（glazingRatio=0.5適用）

**describe**: `calculateZoneLoad > glazing correction`

| 項目 | 内容 |
|------|------|
| **目的** | ガラス面積補正が正しく適用されることを確認 |
| **Given** | `usage: 'office', floorArea: 100, glazingRatio: 0.5` |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | glazingFactor = 1.0 + (0.5 - 0.3) x 0.5 = 1.1 |
| | `result.coolingLoad === 16500` (150 x 100 x 1.0 x 1.1) |
| | `result.heatingLoad === 11000` (100 x 100 x 1.0 x 1.1) |
| **信頼性** | 🔵 REQ-104, REQ-109 |

**注**: HvacZoneNodeスキーマに `glazingRatio` フィールド（オプショナル）を追加する前提。

---

### TC-005: 必要給気量計算

**describe**: `calculateZoneLoad > required airflow`

| 項目 | 内容 |
|------|------|
| **目的** | 必要給気量の計算式が正しいことを確認 |
| **Given** | `usage: 'office', floorArea: 100` (designConditions.summerDryBulb = 26 デフォルト) |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | ΔT = 26 - 15 = 11 |
| | requiredAirflow = 15000 / (1.2 x 1006 x 11) x 3600 |
| | `result.requiredAirflow ≈ 4068.5` (toBeCloseTo で小数1位まで) |
| **信頼性** | 🔵 REQ-110 |

---

### TC-006: 方位+ガラス複合補正

**describe**: `calculateZoneLoad > combined corrections`

| 項目 | 内容 |
|------|------|
| **目的** | 方位補正とガラス補正が同時に正しく適用されることを確認 |
| **Given** | `usage: 'office', floorArea: 100, orientation: 'S', glazingRatio: 0.5` |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | orientationFactor = 1.15, glazingFactor = 1.1 |
| | `result.coolingLoad === 18975` (150 x 100 x 1.15 x 1.1) |
| | `result.heatingLoad === 12650` (100 x 100 x 1.15 x 1.1) |
| **信頼性** | 🔵 REQ-104 |

---

### TC-007: dirtyNodes検出 → 再計算（LoadCalcSystem）

**describe**: `LoadCalcSystem > dirty node processing`

| 項目 | 内容 |
|------|------|
| **目的** | LoadCalcSystemがdirtyNodesからhvac_zoneを検出し再計算することを確認 |
| **Given** | useSceneにHvacZoneNode（usage='office', floorArea=100）を作成（dirtyNodesに自動追加） |
| **When** | LoadCalcSystemのuseFrameコールバックを実行 |
| **Then** | ノードの`loadResult`が計算結果で更新される |
| | dirtyNodesからノードIDが除去される |
| **テスト手法** | useScene storeを直接操作 + useFrameコールバックのモック実行 |
| **信頼性** | 🔵 設計文書システムパターン |

---

## 異常系テストケース

### TC-008: floorArea=0 → undefined返却

**describe**: `calculateZoneLoad > edge cases`

| 項目 | 内容 |
|------|------|
| **目的** | 面積0のゾーンで計算がスキップされることを確認 |
| **Given** | `usage: 'office', floorArea: 0` |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | `result === undefined` |
| **信頼性** | 🔵 EDGE-101 |

**注**: HvacZoneNodeスキーマは `floorArea: z.number()` で0を許容するため、parse可能。

---

### TC-009: floorArea<0 → undefined返却

**describe**: `calculateZoneLoad > edge cases`

| 項目 | 内容 |
|------|------|
| **目的** | 負の面積で計算がスキップされることを確認 |
| **Given** | `usage: 'office', floorArea: -10` |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | `result === undefined` |
| **信頼性** | 🟡 EDGE-06（物理的に無効） |

---

### TC-010: usage不正値 → デフォルトフォールバック

**describe**: `calculateZoneLoad > edge cases`

| 項目 | 内容 |
|------|------|
| **目的** | ランタイムでusageが不正な場合にフォールバックが機能することを確認 |
| **Given** | ノードオブジェクトを直接構築し `usage: 'invalid_usage' as any` を設定 |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | officeの原単位でフォールバック計算される、または undefinedを返す |
| **テスト手法** | `as any` でZodバリデーションをバイパスしたノードを直接渡す |
| **信頼性** | 🟡 EDGE-02（スキーマ上は発生しないがランタイム防御） |

---

### TC-011: designConditions未定義 → デフォルト値

**describe**: `calculateZoneLoad > edge cases`

| 項目 | 内容 |
|------|------|
| **目的** | designConditionsが未指定でもデフォルト値(summerDryBulb=26)で計算されることを確認 |
| **Given** | `HvacZoneNode.parse({ zoneName: 'Zone', usage: 'office', floorArea: 100 })` （designConditions未指定） |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | ΔT = 26 - 15 = 11 で正常に計算される |
| | `result.coolingLoad === 15000` |
| **信頼性** | 🔵 EDGE-03（Zodデフォルト値による保証） |

---

## 境界値テストケース

### TC-012: 最小floorArea（0.01m²）

**describe**: `calculateZoneLoad > boundary values`

| 項目 | 内容 |
|------|------|
| **目的** | 極小面積でも計算が正常に実行されることを確認 |
| **Given** | `usage: 'office', floorArea: 0.01` |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | `result.coolingLoad === 1.5` (150 x 0.01) |
| | `result.heatingLoad === 1.0` (100 x 0.01) |
| | `result.requiredAirflow > 0` |
| **信頼性** | 🔵 |

---

### TC-013: glazingRatio=0（補正なし）

**describe**: `calculateZoneLoad > boundary values`

| 項目 | 内容 |
|------|------|
| **目的** | glazingRatio=0で補正係数が1.0（補正なし）となることを確認 |
| **Given** | `usage: 'office', floorArea: 100, glazingRatio: 0` |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | glazingFactor = 1.0（0 <= 0.3 なので補正なし） |
| | `result.coolingLoad === 15000` |
| **信頼性** | 🔵 |

---

### TC-014: glazingRatio=0.3（ちょうど閾値）

**describe**: `calculateZoneLoad > boundary values`

| 項目 | 内容 |
|------|------|
| **目的** | glazingRatioが閾値ちょうどの場合に補正が適用されないことを確認 |
| **Given** | `usage: 'office', floorArea: 100, glazingRatio: 0.3` |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | glazingFactor = 1.0（0.3 は `> 0.3` を満たさないため補正なし） |
| | `result.coolingLoad === 15000` |
| **信頼性** | 🔵 |

---

### TC-015: glazingRatio=1.0（最大）

**describe**: `calculateZoneLoad > boundary values`

| 項目 | 内容 |
|------|------|
| **目的** | glazingRatio最大値での補正が正しいことを確認 |
| **Given** | `usage: 'office', floorArea: 100, glazingRatio: 1.0` |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | glazingFactor = 1.0 + (1.0 - 0.3) x 0.5 = 1.35 |
| | `result.coolingLoad === 20250` (150 x 100 x 1.0 x 1.35) |
| | `result.heatingLoad === 13500` (100 x 100 x 1.0 x 1.35) |
| **信頼性** | 🔵 |

---

### TC-016: orientation未定義 → 補正1.0

**describe**: `calculateZoneLoad > boundary values`

| 項目 | 内容 |
|------|------|
| **目的** | orientation未設定時に補正係数1.0が適用されることを確認 |
| **Given** | `usage: 'office', floorArea: 100`（orientationなし） |
| **When** | `calculateZoneLoad(zone)` |
| **Then** | orientationFactor = 1.0 |
| | `result.coolingLoad === 15000`（補正なし） |
| **信頼性** | 🔵 EDGE-05 |

---

## テストファイル構成

```
packages/kuhl-core/src/__tests__/systems/zone/load-calc.test.ts
```

### describe構造

```
describe('calculateZoneLoad')
├── describe('basic calculation')
│   └── TC-001: office用途の冷暖房負荷計算
├── describe('usage unit table')
│   └── TC-002: it.each 全11種のusage別テスト
├── describe('orientation correction')
│   └── TC-003: 方位補正 S=1.15
├── describe('glazing correction')
│   └── TC-004: ガラス面積補正 glazingRatio=0.5
├── describe('required airflow')
│   └── TC-005: 必要給気量計算
├── describe('combined corrections')
│   └── TC-006: 方位+ガラス複合補正
├── describe('edge cases')
│   ├── TC-008: floorArea=0
│   ├── TC-009: floorArea<0
│   ├── TC-010: usage不正値フォールバック
│   └── TC-011: designConditions未定義
└── describe('boundary values')
    ├── TC-012: 最小floorArea
    ├── TC-013: glazingRatio=0
    ├── TC-014: glazingRatio=0.3（閾値）
    ├── TC-015: glazingRatio=1.0（最大）
    └── TC-016: orientation未定義

describe('LoadCalcSystem')
└── describe('dirty node processing')
    └── TC-007: dirtyNodes検出→再計算
```

---

## テストヘルパー

### createTestZone ヘルパー関数

```typescript
function createTestZone(overrides: Partial<{
  zoneName: string
  usage: ZoneUsage
  floorArea: number
  orientation: Orientation
  glazingRatio: number
  designConditions: Partial<DesignConditions>
}> = {}) {
  return HvacZoneNode.parse({
    zoneName: overrides.zoneName ?? 'Test Zone',
    usage: overrides.usage ?? 'office',
    floorArea: overrides.floorArea ?? 100,
    ...(overrides.orientation !== undefined && { orientation: overrides.orientation }),
    ...(overrides.glazingRatio !== undefined && { glazingRatio: overrides.glazingRatio }),
    ...(overrides.designConditions && { designConditions: overrides.designConditions }),
  })
}
```

---

## スキーマ変更の前提条件

本テストケースは、HvacZoneNodeスキーマに以下のオプショナルフィールドが追加される前提で設計している:

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `orientation` | `Orientation` (optional) | ゾーン方位（N, NE, E, SE, S, SW, W, NW） |
| `glazingRatio` | `number` (optional) | ガラス面積比率（0.0 ~ 1.0） |

TC-003, TC-004, TC-006, TC-013, TC-014, TC-015 はこれらのフィールドが存在する前提。フィールド追加前は、orientation/glazingRatioが常にundefinedとなり、補正係数は常に1.0となる。

---

## 信頼性レベルサマリー

| カテゴリ | ケース数 | 🔵 青 | 🟡 黄 |
|---------|---------|-------|-------|
| 正常系 | 7 | 7 | 0 |
| 異常系 | 4 | 2 | 2 |
| 境界値 | 5 | 5 | 0 |
| **合計** | **16** | **14** | **2** |

- 🟡 黄信号: TC-009（負のfloorArea）、TC-010（usage不正フォールバック） -- スキーマ上は発生しないがランタイム防御として検証
