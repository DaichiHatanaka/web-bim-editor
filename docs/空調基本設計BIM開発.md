# Kühl — 空調設備 基本設計BIMツール

> **Kühl** /kyːl/ — ドイツ語で「涼しい」
>
> Repository: `kuhl-editor`
> Package scope: `@kuhl/core`, `@kuhl/viewer`
> Stack: React Three Fiber + WebGPU + Next.js + Zustand + Zod

---

## 1. スコープ定義

### 1.1 対象業務

**空調設備の基本設計フェーズ**に特化する。

```
対象                              対象外
─────────────────────────────    ─────────────────────────
✓ 空調負荷計算                   ✗ 衛生設備（給排水・ガス）
✓ 機器選定（AHU, PAC, FCU等）    ✗ 電気設備
✓ ダクトルーティング・寸法選定   ✗ 防災設備
✓ 冷温水配管ルーティング         ✗ 施工図レベルの詳細
✓ 冷媒配管ルーティング           ✗ 制御シーケンス設計
✓ 系統構成・ゾーニング           ✗ TAB（試運転調整）
✓ 諸元表・機器表作成
✓ 数量拾い → 積算連携
✓ IFC出力 → Rebro/Revit連携
```

### 1.2 想定ワークフロー

```
1. 建築躯体の読込（IFC）
       ↓
2. 空調ゾーニング（室用途・負荷区分の設定）
       ↓
3. 空調負荷計算（概算 → ゾーン別冷暖房負荷）
       ↓
4. 空調方式選定（単一ダクト / FCU+OA / VRF / PAC 等）
       ↓
5. 機器選定（負荷 → 機器容量 → メーカー型番）
       ↓
6. ダクトルーティング + 寸法選定
       ↓
7. 配管ルーティング（冷温水 / 冷媒 / ドレン）
       ↓
8. 圧損計算・搬送動力確認
       ↓
9. 数量拾い → 積算システム出力
       ↓
10. IFC出力 → Rebro/Revit 連携
```

---

## 2. ノード体系

### 2.1 ノード階層

```
Plant（施設）
└── Building（建物）── ArchitectureRef（IFC建築躯体、表示のみ）
    └── Level（階）
        └── HvacZone（空調ゾーン）
            │
            ├── AirHandlingUnit（空調機: AHU, OHU, HEX）
            ├── PackagedAC（パッケージエアコン: PAC, GHP）
            ├── FanCoilUnit（ファンコイルユニット）
            ├── VrfOutdoorUnit（VRF室外機）
            ├── VrfIndoorUnit（VRF室内機）
            ├── Diffuser（制気口: アネモ, ライン, 吸込口）
            ├── Damper（ダンパー: VD, FD, MD, CD）
            ├── Fan（送風機: 排気ファン, 給気ファン）
            │
            ├── DuctSegment（ダクト区間）
            ├── DuctFitting（ダクト継手: エルボ, T管, レジューサ）
            │
            ├── PipeSegment（配管区間: 冷温水, 冷媒, ドレン）
            ├── PipeFitting（配管継手）
            ├── Valve（バルブ: 仕切弁, 玉形弁, バタフライ弁）
            │
            ├── Pump（ポンプ: 冷温水ポンプ）
            ├── Chiller（冷凍機）
            ├── Boiler（ボイラー）
            ├── CoolingTower（冷却塔）
            │
            └── Support（支持金物）
```

### 2.2 Zodスキーマ定義

#### 空調ゾーン

```typescript
// packages/core/src/schema/nodes/hvac-zone.ts

export const HvacZoneNode = BaseNode.extend({
  id: objectId('zone'),
  type: nodeType('hvac_zone'),
  children: z.array(z.string()).default([]),

  // ゾーン定義
  zoneName: z.string(),                    // "事務室A", "会議室101"
  zoneCode: z.string().optional(),         // "Z-101"
  usage: z.enum([
    'office', 'meeting', 'server_room', 'lobby',
    'corridor', 'toilet', 'kitchen', 'warehouse',
    'mechanical_room', 'electrical_room', 'other',
  ]),

  // 負荷条件
  floorArea: z.number(),                   // m²
  ceilingHeight: z.number().default(2.7),  // m
  occupancy: z.number().optional(),        // 人数
  lightingDensity: z.number().optional(),  // W/m²
  equipmentDensity: z.number().optional(), // W/m²

  // 設計条件
  designConditions: z.object({
    summerDryBulb: z.number().default(26),    // ℃
    summerHumidity: z.number().default(50),    // %RH
    winterDryBulb: z.number().default(22),     // ℃
    winterHumidity: z.number().default(40),    // %RH
    ventilationRate: z.number().optional(),    // m³/h·人
    freshAirRate: z.number().optional(),       // m³/h
  }).default({}),

  // 負荷計算結果（System が自動算出）
  loadResult: z.object({
    coolingLoad: z.number().optional(),    // kW
    heatingLoad: z.number().optional(),    // kW
    latentLoad: z.number().optional(),     // kW（潜熱）
    sensibleLoad: z.number().optional(),   // kW（顕熱）
    requiredAirflow: z.number().optional(),// m³/h
  }).optional(),

  // 空調方式
  hvacType: z.enum([
    'single_duct',     // 単一ダクト方式
    'dual_duct',       // 二重ダクト方式
    'fcu_oa',          // FCU + 外気処理
    'vrf',             // ビル用マルチ（VRF）
    'pac',             // パッケージエアコン
    'radiant',         // 放射空調
    'displacement',    // 置換換気
    'none',            // 空調なし（換気のみ）
  ]).optional(),

  // 系統帰属
  systemId: z.string().optional(),

  // 境界（平面ポリゴン、Level座標系）
  boundary: z.array(z.tuple([z.number(), z.number()])).optional(),
})
```

#### 空調機器（共通ベース）

```typescript
// packages/core/src/schema/nodes/hvac-equipment-base.ts

const PortDef = z.object({
  id: z.string(),
  name: z.string(),             // "給気口", "還気口", "冷水入口", "冷水出口"
  medium: z.enum([
    'supply_air', 'return_air', 'outside_air', 'exhaust_air',
    'chilled_water', 'hot_water', 'condenser_water',
    'refrigerant_liquid', 'refrigerant_gas',
    'drain', 'electric', 'signal',
  ]),
  direction: z.enum(['in', 'out']),
  size: z.string().optional(),   // "400×300", "50A", "Φ200"
  position: z.tuple([z.number(), z.number(), z.number()]),
  connectedTo: z.string().nullable().default(null),
})

const HvacEquipmentBase = BaseNode.extend({
  // 3D配置
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  dimensions: z.tuple([z.number(), z.number(), z.number()]).default([1, 1, 1]),

  // タグ・名称
  tag: z.string(),               // "AHU-101", "PAC-201"
  equipmentName: z.string(),     // "空調機No.1", "パッケージエアコン"

  // ポート
  ports: z.array(PortDef).default([]),

  // 3D表現
  lod: z.enum(['100', '200', '300']).default('100'),
  modelSrc: z.string().optional(),  // GLB URL

  // メーカー
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),

  // 系統
  systemId: z.string().optional(),

  // N-BOM参照
  definitionId: z.string().optional(),

  // 状態
  status: z.enum(['planned', 'existing', 'demolished']).default('planned'),
})
```

#### AHU（空調機）

```typescript
// packages/core/src/schema/nodes/ahu.ts

export const AhuNode = HvacEquipmentBase.extend({
  id: objectId('ahu'),
  type: nodeType('ahu'),
  children: z.array(z.string()).default([]),

  // 性能諸元
  coolingCapacity: z.number().optional(),     // kW
  heatingCapacity: z.number().optional(),     // kW
  airflowRate: z.number().optional(),         // m³/h
  staticPressure: z.number().optional(),      // Pa（機外静圧）
  motorPower: z.number().optional(),          // kW

  // コイル仕様
  coolingCoil: z.object({
    rows: z.number().optional(),
    fpi: z.number().optional(),               // フィン/インチ
    enteringWaterTemp: z.number().optional(),  // ℃
    leavingWaterTemp: z.number().optional(),   // ℃
    waterFlowRate: z.number().optional(),      // L/min
  }).optional(),

  heatingCoil: z.object({
    type: z.enum(['hot_water', 'steam', 'electric']).optional(),
    capacity: z.number().optional(),           // kW
    waterFlowRate: z.number().optional(),      // L/min
  }).optional(),

  // フィルタ
  filterGrade: z.string().optional(),          // "中性能", "HEPA"

  // 加湿器
  humidifier: z.object({
    type: z.enum(['steam', 'spray', 'none']).default('none'),
    capacity: z.number().optional(),           // kg/h
  }).optional(),

  // 全熱交換器
  heatRecovery: z.object({
    type: z.enum(['total_heat', 'sensible', 'none']).default('none'),
    efficiency: z.number().optional(),         // %
  }).optional(),

  // 電気
  voltage: z.enum(['200V', '400V']).optional(),
  phase: z.enum(['single', 'three']).optional(),
})

export type AhuNode = z.infer<typeof AhuNode>
```

#### パッケージエアコン（PAC / VRF室外機）

```typescript
// packages/core/src/schema/nodes/pac.ts

export const PacNode = HvacEquipmentBase.extend({
  id: objectId('pac'),
  type: nodeType('pac'),
  children: z.array(z.string()).default([]),

  // 種別
  subType: z.enum([
    'ceiling_cassette',    // 天井カセット
    'ceiling_duct',        // 天井ダクト
    'wall_mount',          // 壁掛け
    'floor_standing',      // 床置き
    'outdoor_unit',        // 室外機
  ]),

  // 性能
  coolingCapacity: z.number().optional(),     // kW
  heatingCapacity: z.number().optional(),     // kW
  cop: z.number().optional(),                 // COP
  airflowRate: z.number().optional(),         // m³/h

  // 冷媒
  refrigerantType: z.string().optional(),     // "R410A", "R32"
  refrigerantCharge: z.number().optional(),   // kg

  // 電気
  ratedPower: z.number().optional(),          // kW（消費電力）
  ratedCurrent: z.number().optional(),        // A
  voltage: z.enum(['200V', '400V']).optional(),
  phase: z.enum(['single', 'three']).optional(),

  // VRF系統（室内機↔室外機の紐付け）
  vrfSystemId: z.string().optional(),
  connectedIndoorUnitIds: z.array(z.string()).default([]),
})
```

#### 制気口

```typescript
// packages/core/src/schema/nodes/diffuser.ts

export const DiffuserNode = HvacEquipmentBase.extend({
  id: objectId('diff'),
  type: nodeType('diffuser'),

  subType: z.enum([
    'anemo',          // アネモスタット
    'line',           // ラインディフューザー
    'universal',      // ユニバーサル
    'slot',           // スロット
    'ceiling_return',  // 天井吸込口
    'floor_supply',   // 床吹出口
    'wall_grille',    // 壁付ガラリ
    'weather_louver', // ウェザールーバー
  ]),

  // 性能
  airflowRate: z.number().optional(),     // m³/h
  effectiveArea: z.number().optional(),   // m²（有効開口面積）
  neckSize: z.string().optional(),        // "Φ200", "300×150"
  throwDistance: z.number().optional(),   // m（到達距離）
  noiseLevel: z.number().optional(),      // dB(A)

  // 配置
  ceilingMounted: z.boolean().default(true),
  hostDuctId: z.string().optional(),      // 接続先ダクトID
})
```

#### ダクト区間

```typescript
// packages/core/src/schema/nodes/duct-segment.ts

export const DuctSegmentNode = BaseNode.extend({
  id: objectId('duct'),
  type: nodeType('duct_segment'),

  // ルート
  start: z.tuple([z.number(), z.number(), z.number()]),
  end: z.tuple([z.number(), z.number(), z.number()]),

  // 断面
  shape: z.enum(['rectangular', 'circular']),
  width: z.number().optional(),        // mm（矩形）
  height: z.number().optional(),       // mm（矩形）
  diameter: z.number().optional(),     // mm（円形）

  // 仕様
  material: z.enum([
    'galvanized',     // 亜鉛鉄板
    'stainless',      // ステンレス
    'glass_wool_duct',// グラスウールダクト
    'flexible',       // フレキ
    'spiral',         // スパイラルダクト
  ]).default('galvanized'),
  plateThickness: z.number().optional(),  // mm（板厚）
  insulation: z.object({
    type: z.enum(['glass_wool', 'rock_wool', 'polystyrene', 'none']).default('none'),
    thickness: z.number().optional(),      // mm
  }).default({ type: 'none' }),

  // 用途
  medium: z.enum([
    'supply', 'return', 'outside_air', 'exhaust',
  ]),

  // 接続
  startPortId: z.string().nullable().default(null),
  endPortId: z.string().nullable().default(null),

  // 系統
  systemId: z.string().optional(),

  // 計算結果（DuctSystem が自動算出）
  calcResult: z.object({
    velocity: z.number().optional(),         // m/s
    pressureLoss: z.number().optional(),     // Pa
    pressureLossPerM: z.number().optional(), // Pa/m
    equivalentDiameter: z.number().optional(),// mm
    airflowRate: z.number().optional(),      // m³/h
    length: z.number().optional(),           // m（自動計算）
  }).optional(),
})
```

#### 配管区間（冷温水・冷媒・ドレン）

```typescript
// packages/core/src/schema/nodes/pipe-segment.ts

export const PipeSegmentNode = BaseNode.extend({
  id: objectId('pipe'),
  type: nodeType('pipe_segment'),

  start: z.tuple([z.number(), z.number(), z.number()]),
  end: z.tuple([z.number(), z.number(), z.number()]),

  // 仕様
  nominalSize: z.string(),         // "25A", "50A"
  material: z.enum([
    'sgp', 'stpg', 'sus304', 'sus316',
    'vp', 'hivp', 'copper', 'pe',
  ]),
  schedule: z.string().optional(),

  // 用途
  medium: z.enum([
    'chilled_water', 'hot_water', 'condenser_water',
    'refrigerant_liquid', 'refrigerant_gas',
    'drain',
  ]),

  insulation: z.object({
    type: z.enum(['glass_wool', 'polystyrene', 'polyethylene', 'none']).default('none'),
    thickness: z.number().optional(),
  }).default({ type: 'none' }),

  startPortId: z.string().nullable().default(null),
  endPortId: z.string().nullable().default(null),
  systemId: z.string().optional(),

  calcResult: z.object({
    velocity: z.number().optional(),         // m/s
    pressureLoss: z.number().optional(),     // kPa
    pressureLossPerM: z.number().optional(), // kPa/m
    flowRate: z.number().optional(),         // L/min
    length: z.number().optional(),           // m
  }).optional(),
})
```

### 2.3 AnyNode 定義

```typescript
export const AnyNode = z.discriminatedUnion('type', [
  // 空間
  PlantNode,
  BuildingNode,
  LevelNode,
  HvacZoneNode,
  // 空調機器
  AhuNode,
  PacNode,
  FcuNode,
  VrfOutdoorNode,
  VrfIndoorNode,
  DiffuserNode,
  DamperNode,
  FanNode,
  PumpNode,
  ChillerNode,
  BoilerNode,
  CoolingTowerNode,
  // ダクト
  DuctSegmentNode,
  DuctFittingNode,
  // 配管
  PipeSegmentNode,
  PipeFittingNode,
  ValveNode,
  // 系統
  SystemNode,
  // 支持
  SupportNode,
  // 外部参照
  ArchitectureRefNode,
])
```

---

## 3. システム（計算エンジン）

### 3.1 System 構成

```
packages/core/src/systems/
├── zone/
│   └── load-calc-system.ts         # 空調負荷概算
├── equipment/
│   ├── equipment-system.ts         # 配置・ポート位置計算
│   ├── ahu-selection.ts            # AHU機器選定
│   ├── pac-selection.ts            # PAC/VRF機器選定
│   └── pump-selection.ts           # ポンプ選定
├── duct/
│   ├── duct-system.ts              # ダクトジオメトリ生成
│   ├── duct-sizing.ts              # ダクト寸法選定（等速法/等圧法）
│   └── duct-pressure-loss.ts       # ダクト圧損計算
├── pipe/
│   ├── pipe-system.ts              # 配管ジオメトリ生成
│   ├── pipe-sizing.ts              # 配管口径選定
│   └── pipe-pressure-loss.ts       # 配管圧損計算
├── takeoff/
│   ├── quantity-takeoff.ts         # 数量拾い出し
│   └── cost-export.ts             # 積算出力
└── ifc/
    ├── ifc-import.ts               # 建築IFC読込
    └── ifc-export.ts               # 設備IFC出力
```

### 3.2 空調負荷概算

```typescript
// packages/core/src/systems/zone/load-calc-system.ts

interface LoadCalcInput {
  zone: HvacZoneNode
  outdoorCondition: {
    summerDryBulb: number    // ℃（地域別設計外気温）
    summerWetBulb: number
    winterDryBulb: number
  }
  orientation?: string       // "N","S","E","W"（外壁方位）
  hasExteriorWall: boolean
  glazingRatio?: number      // 窓面積比率
}

interface LoadCalcResult {
  coolingLoad: number        // kW
  heatingLoad: number        // kW
  sensibleHeatRatio: number  // SHF
  requiredAirflow: number    // m³/h
  breakdown: {
    transmission: number     // 構造体通過熱 kW
    solar: number            // 日射熱 kW
    internal: number         // 内部発熱 kW
    ventilation: number      // 外気負荷 kW
    infiltration: number     // 隙間風 kW
  }
}

// 概算法（m²単価法 + 補正）
// 基本設計段階では PAL* や省エネ基準の概算値で十分
export function calculateZoneLoad(input: LoadCalcInput): LoadCalcResult {
  const { zone } = input
  const area = zone.floorArea

  // 用途別負荷原単位 (W/m²) — 国交省基準ベース
  const unitLoad: Record<string, { cooling: number; heating: number }> = {
    office:          { cooling: 190, heating: 100 },
    meeting:         { cooling: 230, heating: 110 },
    server_room:     { cooling: 500, heating: 0 },
    lobby:           { cooling: 160, heating: 120 },
    corridor:        { cooling: 80,  heating: 60 },
    // ...
  }

  const base = unitLoad[zone.usage] ?? { cooling: 150, heating: 80 }

  // 方位補正、ガラス面積補正 etc.
  let coolingFactor = 1.0
  if (input.hasExteriorWall && input.glazingRatio && input.glazingRatio > 0.4) {
    coolingFactor += 0.15
  }

  const coolingLoad = (area * base.cooling * coolingFactor) / 1000  // kW
  const heatingLoad = (area * base.heating) / 1000

  return {
    coolingLoad,
    heatingLoad,
    sensibleHeatRatio: 0.8,  // 概算デフォルト
    requiredAirflow: coolingLoad * 3600 / (1.2 * 1.006 * 10),  // ΔT=10℃概算
    breakdown: {
      transmission: coolingLoad * 0.25,
      solar: coolingLoad * 0.30,
      internal: coolingLoad * 0.30,
      ventilation: coolingLoad * 0.10,
      infiltration: coolingLoad * 0.05,
    },
  }
}
```

### 3.3 ダクト寸法選定

```typescript
// packages/core/src/systems/duct/duct-sizing.ts

interface DuctSizingInput {
  airflowRate: number            // m³/h
  method: 'equal_velocity' | 'equal_friction' | 'static_regain'
  targetVelocity?: number        // m/s（等速法時）
  targetFrictionRate?: number    // Pa/m（等圧法時）
  shape: 'rectangular' | 'circular'
  aspectRatioLimit?: number      // 矩形ダクトのアスペクト比上限（デフォルト4）
  standardSizes: number[]        // [100, 150, 200, 250, 300, ...]
}

interface DuctSizingResult {
  // 矩形の場合
  width?: number                 // mm
  height?: number                // mm
  // 円形の場合
  diameter?: number              // mm
  // 共通
  equivalentDiameter: number     // mm（相当直径）
  velocity: number               // m/s
  frictionRate: number           // Pa/m
  alternatives: Array<{
    width?: number; height?: number; diameter?: number
    velocity: number; frictionRate: number
  }>
}

export function selectDuctSize(input: DuctSizingInput): DuctSizingResult {
  const Q = input.airflowRate / 3600  // m³/s

  if (input.method === 'equal_velocity') {
    const V = input.targetVelocity ?? getRecommendedVelocity(input)
    const requiredArea = Q / V  // m²

    if (input.shape === 'circular') {
      const d = Math.sqrt(4 * requiredArea / Math.PI) * 1000  // mm
      const diameter = snapToStandard(d, input.standardSizes)
      // ...
    } else {
      // 矩形：アスペクト比制約内で最適なW×Hを選定
      // ...
    }
  }
  // ...
}

function getRecommendedVelocity(input: DuctSizingInput): number {
  // 用途別推奨風速（m/s）
  // 主ダクト: 6-8, 枝ダクト: 4-6, 制気口接続: 3-4
  return 6.0  // デフォルト
}
```

### 3.4 ダクト圧損計算

```typescript
// packages/core/src/systems/duct/duct-pressure-loss.ts

interface DuctPressureLossInput {
  segments: DuctSegmentNode[]
  fittings: DuctFittingNode[]
  dampers: DamperNode[]
  diffusers: DiffuserNode[]
  systemAirflow: number          // m³/h（系統風量）
}

interface DuctPressureLossResult {
  totalLoss: number              // Pa（最遠経路）
  criticalPath: string[]         // 最遠経路のノードID列
  segmentResults: Array<{
    id: string
    frictionLoss: number         // Pa
    velocity: number             // m/s
    length: number               // m
  }>
  fittingResults: Array<{
    id: string
    localLoss: number            // Pa
    lossCoefficient: number      // ζ
  }>
  requiredFanPressure: number    // Pa（機器（AHU/Fan）必要静圧）
  warnings: string[]
}

export function calculateDuctPressureLoss(
  input: DuctPressureLossInput
): DuctPressureLossResult {
  // 直管部：ダルシー・ワイスバッハ式
  //   ΔP = λ × (L/De) × (ρV²/2)
  //   λ = f(Re, ε/De) — ムーディ線図
  //
  // 局部：ζ × (ρV²/2)
  //   ζ = エルボ/T管/レジューサ/ダンパー別の係数テーブル
  //
  // 最遠経路探索：ダイクストラ or 全経路列挙
  // ...
}
```

### 3.5 配管圧損計算

```typescript
// packages/core/src/systems/pipe/pipe-pressure-loss.ts

// ダクトと同様の構造。
// 配管固有の考慮：
//   - ヘイゼン・ウィリアムス式（冷温水）
//   - 等価長さ法による局部損失
//   - ポンプ揚程 = 配管抵抗 + 機器抵抗 + 高低差

interface PipePressureLossResult {
  totalLoss: number              // kPa
  criticalPath: string[]
  requiredPumpHead: number       // m（必要揚程）
  requiredPumpFlow: number       // L/min
  warnings: string[]
}
```

### 3.6 数量拾い出し

```typescript
// packages/core/src/systems/takeoff/quantity-takeoff.ts

// 空調設備の拾い項目
type TakeoffCategory =
  | 'duct'              // ダクト（面積: m² または重量: kg）
  | 'duct_insulation'   // ダクト保温
  | 'duct_fitting'      // ダクト付属品（エルボ、T管等）
  | 'diffuser'          // 制気口
  | 'damper'            // ダンパー
  | 'pipe'              // 配管（長さ: m）
  | 'pipe_insulation'   // 配管保温
  | 'pipe_fitting'      // 配管継手
  | 'valve'             // バルブ
  | 'equipment'         // 機器（台数）
  | 'support'           // 支持金物
  | 'testing'           // 試運転調整

interface TakeoffItem {
  category: TakeoffCategory
  description: string        // "亜鉛鉄板ダクト 400×300"
  size: string
  unit: string               // "m²", "m", "個", "台", "式"
  quantity: number
  weight?: number            // kg（ダクトの場合）
  costCode?: string          // 積算コード
  sourceNodeIds: string[]    // 根拠ノード
}

export function generateHvacTakeoff(
  nodes: Record<string, AnyNode>,
  options?: { systemFilter?: string; levelFilter?: string }
): TakeoffItem[] {
  const items: TakeoffItem[] = []

  for (const node of Object.values(nodes)) {
    switch (node.type) {
      case 'duct_segment': {
        // ダクト面積 = 周長 × 長さ
        const perimeter = node.shape === 'rectangular'
          ? 2 * ((node.width! + node.height!) / 1000)  // m
          : Math.PI * (node.diameter! / 1000)
        const length = node.calcResult?.length ?? calcSegmentLength(node)
        const area = perimeter * length  // m²

        items.push({
          category: 'duct',
          description: formatDuctDescription(node),
          size: formatDuctSize(node),
          unit: 'm²',
          quantity: Math.round(area * 100) / 100,
          weight: area * getDuctPlateWeight(node.material, node.plateThickness),
          costCode: mapDuctCostCode(node),
          sourceNodeIds: [node.id],
        })

        if (node.insulation.type !== 'none') {
          items.push({
            category: 'duct_insulation',
            description: `${node.insulation.type} ${node.insulation.thickness}mm`,
            size: formatDuctSize(node),
            unit: 'm²',
            quantity: Math.round(area * 1.1 * 100) / 100,  // 継目代10%
            costCode: mapInsulationCostCode(node.insulation),
            sourceNodeIds: [node.id],
          })
        }
        break
      }

      case 'pipe_segment': {
        const length = node.calcResult?.length ?? calcSegmentLength(node)
        items.push({
          category: 'pipe',
          description: `${node.material} ${node.nominalSize}`,
          size: node.nominalSize,
          unit: 'm',
          quantity: Math.round(length * 100) / 100,
          costCode: mapPipeCostCode(node),
          sourceNodeIds: [node.id],
        })
        // 保温...
        break
      }

      case 'ahu':
      case 'pac':
      case 'fcu':
      case 'chiller':
      // ... 各機器は台数1として拾い
    }
  }

  return aggregateTakeoff(items)  // 同一仕様を集約
}
```

---

## 4. エディタ UI

### 4.1 フェーズとツール

```typescript
// apps/editor/store/use-editor.tsx

type Phase = 'zone' | 'equip' | 'route' | 'calc' | 'takeoff'

const phaseTools: Record<Phase, string[]> = {
  zone:    ['select', 'zone_draw', 'zone_edit', 'load_calc'],
  equip:   ['select', 'ahu_place', 'pac_place', 'diffuser_place', 'fan_place'],
  route:   ['select', 'duct_route', 'pipe_route', 'auto_route'],
  calc:    ['select', 'pressure_loss', 'system_balance', 'clash_check'],
  takeoff: ['select', 'takeoff_run', 'cost_export'],
}
```

### 4.2 画面レイアウト

```
┌─[フェーズ: ゾーニング | 機器 | ルート | 計算 | 拾い]──────────────┐
├──────────┬─────────────────────────────────┬───────────────────┤
│ 左パネル │                                 │ 右パネル          │
│          │                                 │                   │
│ [系統]   │         3D ビューポート          │ [プロパティ]      │
│ 冷水系統 │                                 │ AHU-101           │
│  ├ AHU-1 │    ┌──────────────────────┐     │ 冷却能力: 50 kW   │
│  ├ P-1   │    │  建築躯体(IFC)       │     │ 風量: 8,000 m³/h  │
│  └ ダクト │    │  + 空調機器          │     │ 機外静圧: 500 Pa  │
│           │    │  + ダクト/配管       │     │                   │
│ [カタログ]│    │                      │     │ [諸元表]          │
│ メーカー  │    └──────────────────────┘     │ 冷却コイル:       │
│ ダイキン  │                                 │  入口水温 7℃      │
│ 三菱電機  │                                 │  出口水温 12℃     │
│ 日立     │                                 │  水量 143 L/min   │
│ 東芝     │                                 │                   │
│           │                                 │ [接続]            │
│ [機器]    │                                 │ 給気口→duct_xxx   │
│ AHU      │                                 │ 冷水入→pipe_xxx   │
│ PAC      │                                 │                   │
│ 制気口   │                                 │ [計算結果]        │
│ ダンパー  │                                 │ ダクト圧損: 450Pa │
│           │                                 │ 配管圧損: 35kPa  │
├──────────┴─────────────────────────────────┴───────────────────┤
│ 下パネル                                                       │
│ [拾い出し集計]                                                  │
│  亜鉛鉄板ダクト 400×300: 24.5 m² | 保温GW25t: 26.9 m²         │
│  SGP配管 50A: 32.0 m | 保温PE20t: 35.2 m                      │
│  制気口 アネモΦ300: 12個 | VD 200φ: 8個                        │
│ [警告] duct_xxx: 風速 9.2m/s > 推奨 8.0m/s                    │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 ダクトルーティング操作

```
1. [ルート]フェーズ → [ダクトルート]ツール選択
2. 用途選択（給気/還気/外気/排気）+ 系統選択
3. AHU の給気ポートをクリック → 始点確定
4. 天井裏レベルで中間点をクリック
   → リアルタイムでダクト形状プレビュー
   → 寸法自動選定（分岐点での風量按分 → 等速法で即計算）
   → 圧損値をダクト上にオーバーレイ表示
5. 制気口をクリック → 終点確定
6. Enter で確定
   → DuctSegmentNode + DuctFittingNode 自動生成
   → 拾い数量リアルタイム更新
```

---

## 5. 外部連携

### 5.1 IFC読込（建築躯体）

web-ifc (WASM) でブラウザ内パース → ArchitectureRefNode に変換。
壁・床・梁・柱・天井のみ抽出し、階高・天井高を自動取得。

### 5.2 IFC出力（空調設備）

```
ノードタイプ         →  IFCエンティティ
──────────────────      ──────────────────
AhuNode             →  IfcAirToAirHeatRecovery / IfcUnitaryEquipment
PacNode             →  IfcUnitaryEquipment
DiffuserNode        →  IfcAirTerminal
DamperNode          →  IfcDamper
FanNode             →  IfcFan
DuctSegmentNode     →  IfcDuctSegment
DuctFittingNode     →  IfcDuctFitting
PipeSegmentNode     →  IfcPipeSegment
PipeFittingNode     →  IfcPipeFitting
ValveNode           →  IfcValve
PumpNode            →  IfcPump
ChillerNode         →  IfcChiller
BoilerNode          →  IfcBoiler
CoolingTowerNode    →  IfcCoolingTower
SystemNode          →  IfcSystem
HvacZoneNode        →  IfcZone + IfcSpace
```

### 5.3 積算連携

拾い出し結果を以下のフォーマットで出力：
- CSV（汎用）
- Excel（みつもりくん取込形式）
- Rebro データリンク形式

### 5.4 N-BOM連携

機器選定時にN-BOMマスターを参照し、definitionIdで紐付け。
諸元・バリエーション軸を取り込み、EquipmentNode に反映。

---

## 6. 実装ロードマップ

### Phase 0: 骨格準備（2週間）

- [ ] フォーク＆建築ノード削除
- [ ] 全スキーマ定義（HvacZone, AHU, PAC, Diffuser, DuctSegment, PipeSegment等）
- [ ] AnyNode更新、空間階層（Plant→Building→Level）
- [ ] ArchitectureRefNode（IFC表示用）

### Phase 1: ゾーニング＋負荷概算（2週間）

- [ ] HvacZoneRenderer（床面ポリゴンを半透明着色）
- [ ] ZoneDrawTool（ゾーン境界描画）
- [ ] 負荷概算System（m²単価法）
- [ ] ゾーン一覧パネル＋負荷集計表示
- [ ] IFC建築躯体の読込・表示

### Phase 2: 機器配置（3週間）

- [ ] EquipmentRenderer（LOD100=ボックス、LOD200=簡易3D）
- [ ] AHU/PAC/FCU/制気口のPlaceTool
- [ ] ポート定義＋接続口の可視化
- [ ] 諸元表パネル（右パネル）
- [ ] 機器カタログパネル（左パネル、メーカー別検索）
- [ ] 負荷→機器容量の自動マッチング提案

### Phase 3: ダクトルーティング（4週間）

- [ ] DuctSegmentRenderer（矩形/円形ダクトの3D生成）
- [ ] DuctFittingRenderer（エルボ、T管、レジューサ）
- [ ] DuctRouteTool（ポイント→ポイントのルーティング操作）
- [ ] ポートスナップ（AHU/制気口への自動接続）
- [ ] ダクト寸法自動選定（等速法）
- [ ] ダクト圧損リアルタイム表示
- [ ] 分岐点の風量按分ロジック

### Phase 4: 配管ルーティング（3週間）

- [ ] PipeSegmentRenderer（円柱ジオメトリ）
- [ ] PipeRouteTool（冷温水/冷媒/ドレン）
- [ ] 口径自動選定
- [ ] 配管圧損計算
- [ ] ポンプ揚程算出

### Phase 5: 検証＋拾い（2週間）

- [ ] 圧損計算一括実行＋結果表示パネル
- [ ] 警告システム（風速超過、圧損超過、未接続ポート）
- [ ] 数量拾い出しエンジン
- [ ] 拾い出し集計パネル（下パネル）
- [ ] CSV/Excel出力

### Phase 6: 出口戦略（3週間）

- [ ] IFC出力（サーバーサイド IfcOpenShell）
- [ ] Rebro向けIFC最適化
- [ ] 同期ID埋め込み
- [ ] N-BOM連携API
- [ ] 積算システム向けフォーマット出力