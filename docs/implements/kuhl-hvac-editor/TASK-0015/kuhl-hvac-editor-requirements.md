# TASK-0015: LoadCalcSystem（m²単価法負荷概算） 要件定義書

**タスクID**: TASK-0015
**機能名**: kuhl-hvac-editor
**要件名**: LoadCalcSystem（m²単価法負荷概算）
**作成日**: 2026-03-25
**信頼性評価**: 高品質

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🔵 **何をする機能か**: HvacZoneノードの冷暖房負荷をm²単価法で自動計算する。用途別負荷原単位テーブル(W/m²)にfloorAreaを掛け、方位補正・ガラス面積補正を適用して冷房負荷・暖房負荷・必要給気量を算出する。
- 🔵 **どのような問題を解決するか**: ゾーン作成・属性変更のたびに手動で負荷計算を行う手間を省き、dirtyNodesトラッキングにより属性変更時に自動で再計算を行う。
- 🔵 **想定されるユーザー**: 社内の空調設備設計担当者。ゾーンの用途・面積を設定すると概算負荷が自動表示される。
- 🔵 **システム内での位置づけ**: `@kuhl/core` パッケージのシステム層（`packages/kuhl-core/src/systems/zone/`）に配置。純粋関数 `calculateZoneLoad()` とuseFrameコンポーネント `LoadCalcSystem` の2ファイル構成。Systemパターンに従い、useFrame内でdirtyNodesを走査→計算→updateNode→clearDirtyの一連の処理を実行する。
- **参照したEARS要件**: REQ-103, REQ-104, REQ-109, REQ-110, EDGE-101
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - §3.2 m²単価法負荷概算、システムパターン

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 calculateZoneLoad() 純粋関数

- 🔵 **入力パラメータ**:

  | パラメータ | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | `zone` | `HvacZoneNode` | Yes | 計算対象のゾーンノード |

  計算に使用するゾーン属性:

  | 属性 | 型 | デフォルト | 説明 |
  |------|-----|----------|------|
  | `usage` | `ZoneUsage` | - | 用途別負荷原単位テーブルの参照キー |
  | `floorArea` | `number` | - | 床面積 [m²]。計算のベース値 |
  | `designConditions.summerDryBulb` | `number` | `26` | 夏期乾球温度 [℃]。ΔT算出に使用 |
  | `orientation` | `Orientation \| undefined` | `undefined` | ゾーンの方位。方位補正に使用 |
  | `glazingRatio` | `number \| undefined` | `undefined` | ガラス面積比率。ガラス補正に使用 |

- 🔵 **出力**: `LoadCalcResult | undefined`

  | フィールド | 型 | 単位 | 説明 |
  |-----------|-----|------|------|
  | `coolingLoad` | `number` | W | 冷房負荷 |
  | `heatingLoad` | `number` | W | 暖房負荷 |
  | `requiredAirflow` | `number` | m³/h | 必要給気量 |

  `undefined` を返す条件: `floorArea <= 0`

- **参照したEARS要件**: REQ-103, REQ-104

### 2.2 用途別負荷原単位テーブル（LOAD_UNIT_TABLE）

- 🔵 **定義**: `Record<ZoneUsage, { cooling: number; heating: number }>` [W/m²]

  | ZoneUsage | cooling [W/m²] | heating [W/m²] | 備考 |
  |-----------|---------------|----------------|------|
  | `office` | 150 | 100 | オフィス |
  | `meeting` | 180 | 120 | 会議室 |
  | `server_room` | 300 | 50 | サーバー室（冷房主体） |
  | `lobby` | 120 | 80 | ロビー |
  | `corridor` | 80 | 60 | 廊下 |
  | `toilet` | 100 | 70 | トイレ |
  | `kitchen` | 200 | 130 | 厨房（高内部発熱） |
  | `warehouse` | 60 | 40 | 倉庫 |
  | `mechanical_room` | 120 | 80 | 機械室 |
  | `electrical_room` | 180 | 110 | 電気室 |
  | `other` | 120 | 80 | その他（ロビー相当） |

  注: ZoneUsageの実装値は `packages/kuhl-core/src/schema/nodes/hvac-zone.ts` のZodスキーマに準拠する。タスク定義書に記載のある `storage`, `parking`, `restaurant`, `retail`, `factory` はスキーマに存在しないため、実スキーマの11種（`kitchen`, `warehouse`, `mechanical_room`, `electrical_room`, `other`）の原単位を上記の通り定義する。

- **参照したEARS要件**: REQ-103

### 2.3 方位補正係数テーブル（ORIENTATION_FACTORS）

- 🔵 **定義**: 方位に基づく冷暖房負荷の補正係数

  | 方位 | 補正係数 | 根拠 |
  |------|---------|------|
  | `N` | 0.90 | 北面：日射が少なく冷房負荷低減 |
  | `NE` | 0.95 | 北東面 |
  | `E` | 1.05 | 東面：午前の日射 |
  | `SE` | 1.10 | 南東面 |
  | `S` | 1.15 | 南面：日射最大 |
  | `SW` | 1.10 | 南西面：午後の日射 |
  | `W` | 1.10 | 西面：西日 |
  | `NW` | 0.95 | 北西面 |
  | `undefined` | 1.00 | 方位未設定時はニュートラル |

- 🟡 **HvacZoneNodeへのorientation属性追加**: 現在のスキーマには `orientation` 属性が存在しない。本タスクでスキーマに `orientation` フィールド（オプショナル）を追加するか、`undefined=1.0` のデフォルト動作のみで対応し、スキーマ拡張は後続タスクとするか判断が必要。本要件では `orientation` が `undefined` の場合は補正係数 `1.0` を適用する。

- **参照したEARS要件**: REQ-104, REQ-109

### 2.4 ガラス面積補正

- 🔵 **計算式**: `glazingFactor = glazingRatio > 0.3 ? 1.0 + (glazingRatio - 0.3) * 0.5 : 1.0`
  - `glazingRatio` が 0.3 を超えた分について、50%の追加負荷が発生する
  - `glazingRatio <= 0.3` の場合は補正なし（係数 1.0）
  - `glazingRatio` が `undefined` の場合は `0` として扱い、補正なし（係数 1.0）

- 🟡 **HvacZoneNodeへのglazingRatio属性追加**: 現在のスキーマには `glazingRatio` 属性が存在しない。`orientation` と同様に、本タスクでオプショナルフィールドとして追加するか後続対応とする。本要件では `glazingRatio` が `undefined` の場合は `0` として扱い補正係数 `1.0` を適用する。

- **参照したEARS要件**: REQ-104, REQ-109

### 2.5 計算式の詳細

- 🔵 **冷房負荷**:
  ```
  coolingLoad = LOAD_UNIT_TABLE[usage].cooling × floorArea × orientationFactor × glazingFactor
  ```
  単位: [W/m²] × [m²] × [-] × [-] = [W]

- 🔵 **暖房負荷**:
  ```
  heatingLoad = LOAD_UNIT_TABLE[usage].heating × floorArea × orientationFactor × glazingFactor
  ```
  単位: [W/m²] × [m²] × [-] × [-] = [W]

- 🔵 **必要給気量**:
  ```
  ΔT = designConditions.summerDryBulb - supplyAirTemperature
  requiredAirflow = coolingLoad / (1.2 × 1006 × ΔT) × 3600
  ```
  - 空気密度: 1.2 kg/m³（標準状態）
  - 空気比熱: 1006 J/(kg·K)
  - ΔT: 夏期室温 - 給気温度。`supplyAirTemperature` はデフォルト `15℃`（一般的な給気温度）とし、`ΔT = summerDryBulb - 15` で計算する
  - 3600: 秒/時 変換係数
  - 単位: [W] / ([kg/m³] × [J/(kg·K)] × [K]) × [s/h] = [m³/h]

- **参照したEARS要件**: REQ-103, REQ-104, REQ-110

### 2.6 LoadCalcSystem コンポーネント

- 🔵 **種別**: React コンポーネント（Systemパターン）。`null` を返す（描画なし）。
- 🔵 **useFrame実行**: `priority=2` でフレームごとに実行
- 🔵 **処理フロー**:
  1. `useScene.getState()` から `dirtyNodes` と `nodes` を取得
  2. `dirtyNodes` を走査
  3. `node.type === 'hvac_zone'` のノードを検出
  4. `calculateZoneLoad(node)` を呼び出し
  5. `updateNode(nodeId, { loadResult })` で結果を保存
  6. `clearDirty(nodeId)` で処理完了をマーク

- 🟡 **無限ループ防止**: `updateNode` は内部で `markDirty` を呼び出すため、`clearDirty` を直後に呼ばないと次フレームで再度処理される。`clearDirty` 呼び出しを確実に行うか、loadResult更新時はmarkDirtyをスキップする仕組みが必要。実装時に `updateNode` の後に即座に `clearDirty` を呼び出すことで対処する。

- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - システムパターン

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 アーキテクチャ制約

- 🔵 **純粋関数設計**: `calculateZoneLoad()` は入力のみに依存し、副作用を持たない。useSceneなどのストアに直接依存しない。テスト容易性・デバッグ容易性を確保する。
- 🔵 **Systemコンポーネントパターン**: `LoadCalcSystem` は `null` を返すReactコンポーネント。useFrame内でのみロジックを実行する。
- 🔵 **パッケージ配置**: `packages/kuhl-core/src/systems/zone/` に配置。`@kuhl/core` パッケージの一部として、React Three Fiberの `useFrame` を使用する。
- 🔵 **既存基盤維持**: useScene の `dirtyNodes`, `updateNode`, `clearDirty` APIを踏襲。独自のdirtyトラッキングを持たない。

### 3.2 パフォーマンス要件

- 🔵 **useFrame制約**: useFrame(priority=2) 内の処理は16ms以内に収める。dirtyNodesのみを走査し、全ノード反復を避ける。

### 3.3 将来拡張性

- 🔵 **NFR-401対応**: 将来的にピーク負荷計算（時刻別）に拡張可能な設計を維持。`calculateZoneLoad()` のインターフェースを拡張可能にする。
- 🔵 **原単位テーブル外部化**: 将来的に原単位テーブルをユーザー設定可能にする拡張を想定し、テーブルを定数として分離する。

### 3.4 テスト要件

- 🔵 **カバレッジ**: テスト60%以上カバレッジ。
- 🔵 **テスト戦略**: `calculateZoneLoad()` は純粋関数のため、単体テストで全パターンを網羅可能。`LoadCalcSystem` はuseScene/useFrameとの結合テストとして実装。

- **参照したEARS要件**: REQ-103, REQ-104, REQ-109, REQ-110, NFR-401
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - システムパターン、パフォーマンス要件

---

## 4. 想定される使用例（EARSエッジケース・データフローベース）

### 4.1 基本的な使用パターン

- 🔵 **UC-01: ゾーン作成時の自動負荷計算**
  - ユーザーがHvacZoneノードを作成する（usage='office', floorArea=100）
  - createNode → markDirty → dirtyNodesにzone_xxxが追加
  - 次フレームでLoadCalcSystemが検出 → calculateZoneLoad実行
  - loadResult = { coolingLoad: 15000, heatingLoad: 10000, requiredAirflow: 計算値 }
  - updateNode → clearDirty

- 🔵 **UC-02: ゾーン属性変更時の自動再計算**
  - ユーザーがusageを 'office' → 'server_room' に変更
  - updateNode → markDirty → dirtyNodesにzone_xxxが追加
  - 次フレームでLoadCalcSystemが検出 → calculateZoneLoad再実行
  - loadResult = { coolingLoad: 30000, heatingLoad: 5000, requiredAirflow: 計算値 }

- 🔵 **UC-03: 方位補正の適用**
  - ゾーンに orientation='S'（南面）が設定されている場合
  - 補正係数 1.15 が冷暖房負荷に乗算される
  - office 100m² 南面: coolingLoad = 150 × 100 × 1.15 × 1.0 = 17250 W

- 🔵 **UC-04: ガラス面積補正の適用**
  - ゾーンに glazingRatio=0.5 が設定されている場合
  - 補正係数 = 1.0 + (0.5 - 0.3) × 0.5 = 1.1
  - office 100m²: coolingLoad = 150 × 100 × 1.0 × 1.1 = 16500 W

### 4.2 データフロー

- 🔵 **負荷計算フロー**:
  ```
  createNode/updateNode → markDirty(zone_xxx)
    → useFrame(priority=2) → LoadCalcSystem
      → dirtyNodes走査 → node.type === 'hvac_zone'
        → calculateZoneLoad(node) → LoadCalcResult
          → updateNode(id, { loadResult }) → clearDirty(id)
  ```

### 4.3 エッジケース

- 🔵 **EDGE-01: floorArea = 0**
  - `calculateZoneLoad()` は `undefined` を返す
  - `updateNode(id, { loadResult: undefined })` で既存のloadResultをクリア
  - 面積未設定のゾーンで無効な計算結果が表示されることを防ぐ

- 🟡 **EDGE-02: usage未定義（フォールバック）**
  - HvacZoneNodeスキーマでusageは必須フィールド（ZoneUsage enum）のため、Zodパース時にバリデーションエラーとなる。スキーマレベルで未定義は発生しない。
  - ただし、ランタイムで不正な値が混入した場合に備え、LOAD_UNIT_TABLEに該当がない場合は `office` にフォールバックする防御的実装とする。

- 🔵 **EDGE-03: designConditions未定義**
  - HvacZoneNodeスキーマで `designConditions` は `.default(() => DesignConditions.parse({}))` が設定されているため、パース後は常にデフォルト値（summerDryBulb=26, winterDryBulb=22）が存在する。
  - `calculateZoneLoad()` 内では追加のnullチェック不要。

- 🔵 **EDGE-04: glazingRatio未定義**
  - `glazingRatio` が `undefined` の場合、`0` として扱う。
  - glazingFactor = 1.0（補正なし）

- 🔵 **EDGE-05: orientation未定義**
  - `orientation` が `undefined` の場合、補正係数 `1.0` を適用。
  - 方位未設定のゾーンは日射の影響を考慮しない。

- 🟡 **EDGE-06: floorArea が負の値**
  - `floorArea <= 0` で `undefined` を返す。負の面積は物理的に無効であり、0と同様にスキップする。

- 🟡 **EDGE-07: ΔTが0以下になるケース**
  - `summerDryBulb` が `supplyAirTemperature(15℃)` 以下の場合、ΔT <= 0 となりゼロ除算が発生する。
  - ΔT <= 0 の場合は `requiredAirflow` を `0` とするか、`undefined` とする防御処理が必要。

- **参照したEARS要件**: EDGE-101
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - システムパターン

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- 空調設備設計者がゾーンの用途・面積を設定すると、冷暖房負荷が自動計算されるストーリー

### 参照した機能要件
- **REQ-103**: m²単価法による冷暖房負荷の概算計算 🔵
- **REQ-104**: 方位補正・ガラス面積補正の適用 🔵
- **REQ-109**: 方位に基づく負荷補正係数テーブル 🔵
- **REQ-110**: 必要給気量の算出 🔵

### 参照した非機能要件
- **NFR-401**: 将来的にピーク負荷計算（時刻別）に拡張可能な設計 🔵

### 参照したエッジケース
- **EDGE-101**: floorArea=0のゾーンはスキップ 🔵

### 参照した受け入れ基準
- m²単価法での負荷概算が動作する
- 方位補正・ガラス面積補正が適用される
- floorArea=0 のゾーンをスキップする
- ゾーン属性変更時に自動再計算される
- テスト60%以上カバレッジ

### 参照した設計文書
- **アーキテクチャ**: `docs/design/kuhl-hvac-editor/architecture.md`
  - §3.2 m²単価法負荷概算
  - システムパターン（useFrame + priority）
  - dirtyNodesトラッキング
- **スキーマ**: `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`
  - HvacZoneNode型定義
  - ZoneUsage列挙型（11種）
  - DesignConditions型（デフォルト値付き）
  - LoadCalcResult型（全フィールドオプショナル）
- **ストア**: `packages/kuhl-core/src/store/use-scene.ts`
  - dirtyNodes: Set<AnyNodeId>
  - updateNode / clearDirty API

---

## 6. 実装ファイル一覧

| ファイルパス | 種別 | 説明 |
|-------------|------|------|
| `packages/kuhl-core/src/systems/zone/load-calc.ts` | 新規作成 | 純粋関数（calculateZoneLoad、原単位テーブル、補正係数テーブル） |
| `packages/kuhl-core/src/systems/zone/load-calc-system.ts` | 新規作成 | LoadCalcSystem useFrameコンポーネント |
| `packages/kuhl-core/src/__tests__/systems/zone/load-calc.test.ts` | 新規作成 | calculateZoneLoad 単体テスト |
| `packages/kuhl-core/src/schema/nodes/hvac-zone.ts` | 変更 | orientation, glazingRatio フィールド追加（オプショナル） |

---

## 7. 信頼性レベルサマリー

| セクション | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|-----------|-------|-------|-------|------|
| 1. 機能の概要 | 4 | 0 | 0 | 4 |
| 2. 入出力の仕様 | 11 | 3 | 0 | 14 |
| 3. 制約条件 | 6 | 0 | 0 | 6 |
| 4. 想定される使用例 | 8 | 3 | 0 | 11 |
| **合計** | **29** | **6** | **0** | **35** |

### 全体評価

- **総項目数**: 35項目
- 🔵 **青信号**: 29項目 (83%)
- 🟡 **黄信号**: 6項目 (17%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 高品質 -- 黄信号はHvacZoneNodeスキーマへの `orientation` / `glazingRatio` フィールド追加の判断（現スキーマに未定義）、usage未定義時のフォールバック動作（スキーマ上は発生しないがランタイム防御）、ΔT=0のエッジケース、負のfloorAreaの扱いに起因する。赤信号なし。計算式・原単位テーブル・補正係数は設計文書REQ-103/104に強く裏付けられている。
