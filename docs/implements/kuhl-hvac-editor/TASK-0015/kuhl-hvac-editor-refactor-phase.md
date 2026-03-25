# TASK-0015: LoadCalcSystem Refactor Phase 記録

**タスクID**: TASK-0015
**フェーズ**: Refactor Phase
**実施日**: 2026-03-25

---

## 実行コマンド

```bash
# ターゲットテスト
cd packages/kuhl-core && node ../../node_modules/vitest/vitest.mjs run src/__tests__/systems/zone/load-calc.test.ts

# 全テスト（回帰確認）
cd packages/kuhl-core && node ../../node_modules/vitest/vitest.mjs run
```

## 実行結果

### ターゲットテスト

```
 RUN  v4.1.0 C:/Users/畠中大地/web-bim-editor/packages/kuhl-core

 Test Files  1 passed (1)
       Tests  36 passed (36)
    Start at  08:58:20
    Duration  522ms
```

### 全テスト（回帰確認）

```
 RUN  v4.1.0 C:/Users/畠中大地/web-bim-editor/packages/kuhl-core

 Test Files  10 passed (10)
       Tests  250 passed (250)
    Start at  08:58:24
    Duration  747ms
```

回帰なし。全 10 テストファイル、250 テストケースがパス。

---

## 変更内容

### `packages/kuhl-core/src/systems/zone/load-calc.ts`

#### 1. インポート型の厳密化

- **変更前**: `import type { HvacZoneNode, ZoneUsage }` — ノード全体をインポート
- **変更後**: `import type { DesignConditions, Orientation, ZoneUsage }` — 必要なフィールド型のみをインポート

#### 2. `ORIENTATION_FACTORS` の型厳密化

- **変更前**: `Record<string, number>` — 任意文字列キーを許容
- **変更後**: `Record<Orientation, number>` — `Orientation` enum 値のみに制限。コンパイル時に漏れを検出可能になった。

#### 3. 方位係数の数値リテラル整理

- `0.90` → `0.9`、`1.10` → `1.1` などの末尾ゼロを除去（一貫したスタイル）。

#### 4. `getOrientationFactor` 引数型の厳密化

- **変更前**: `orientation?: string` — 任意文字列を受け取る
- **変更後**: `orientation?: Orientation` — `Orientation` 型に限定

#### 5. `ZoneLoadInput` 型の導入（引数型の分離）

- **変更前**: `calculateZoneLoad(zone: HvacZoneNode)` — ノード全体を要求
- **変更後**: `calculateZoneLoad(zone: ZoneLoadInput)` — 計算に必要なフィールドだけを持つ構造型を定義
- `ZoneLoadInput = { floorArea, usage, designConditions, orientation?, glazingRatio? }`
- `HvacZoneNode` は `ZoneLoadInput` の構造的サブタイプなので、既存の呼び出しコードは変更不要。

#### 6. `LoadCalcResult` → `ZoneLoadCalcResult` に改名

- **理由**: `hvac-zone.ts` に `LoadCalcResult` という Zod スキーマ型が存在しており、同名の TypeScript 型が `load-calc.ts` にも存在すると混乱を招く。`ZoneLoadCalcResult` に改名して明示的に区別。
- **注意**: `hvac-zone.ts` の `LoadCalcResult`（Zod スキーマ、全フィールド optional）と `ZoneLoadCalcResult`（pure TypeScript 型、全フィールド required）は意味が異なる。計算結果の格納先（`HvacZoneNode.loadResult`）は schema 側の型を使用し、計算関数の戻り値型は `ZoneLoadCalcResult` を使用する。

#### 7. マジックナンバーを定数に抽出

- `SUPPLY_AIR_TEMPERATURE = 15` — 給気温度（単一ダクト標準 15℃）
- `AIR_RHO_CP = 1.2 * 1006` — 空気の ρ × cp（密度 × 比熱）
- **効果**: 数値の意味がコードから明確に読み取れるようになった。

### `packages/kuhl-core/src/systems/zone/load-calc-system.ts`

#### 1. `result ?? undefined` の冗長性を除去

- **変更前**: `updateNode(id, { loadResult: result ?? undefined })`
- **変更後**: `updateNode(id, { loadResult })`
- `calculateZoneLoad` は `ZoneLoadCalcResult | undefined` を返すため、`?? undefined` は何も変えない冗長な記述だった。

#### 2. 変数名を意図が明確な名前に変更

- **変更前**: `const result = calculateZoneLoad(zone)`
- **変更後**: `const loadResult = calculateZoneLoad(zone)`
- オブジェクトショートハンドプロパティ `{ loadResult }` が使えるようになり、キーと値の対応が一目瞭然になった。

### `packages/kuhl-core/src/index.ts`

#### Systems エクスポートを追加

Green Phase で作成したシステムファイルが `index.ts` に未登録だったため追加:

```ts
// Systems
export {
  LOAD_INTENSITY_TABLE,
  ORIENTATION_FACTORS,
  calculateZoneLoad,
  getGlazingFactor,
  getOrientationFactor,
  type ZoneLoadCalcResult,
  type ZoneLoadInput,
} from './systems/zone/load-calc'
export { LoadCalcSystem, processLoadCalc } from './systems/zone/load-calc-system'
```

---

## Refactor Phase 完了確認

- [x] リファクタリング後テスト全パス（36/36）
- [x] 既存テスト回帰なし（250/250）
- [x] `ORIENTATION_FACTORS` の型を `Record<Orientation, number>` に厳密化
- [x] `calculateZoneLoad` 引数型を `ZoneLoadInput`（必要フィールドのみ）に分離
- [x] `LoadCalcResult` → `ZoneLoadCalcResult` に改名（schema 側との名前衝突解消）
- [x] マジックナンバー `15`、`1.2 * 1006` を定数化
- [x] `result ?? undefined` の冗長コードを除去
- [x] `index.ts` に Systems エクスポートを追加
- [x] 機能追加なし（純粋なリファクタリング）
