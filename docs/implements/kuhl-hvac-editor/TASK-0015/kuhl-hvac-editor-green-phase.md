# TASK-0015: LoadCalcSystem Green Phase 記録

**タスクID**: TASK-0015
**フェーズ**: Green Phase
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
    Start at  08:55:51
    Duration  503ms
```

### 全テスト（回帰確認）

```
 RUN  v4.1.0 C:/Users/畠中大地/web-bim-editor/packages/kuhl-core

 Test Files  10 passed (10)
       Tests  250 passed (250)
    Start at  08:55:55
    Duration  752ms
```

回帰なし。全 10 テストファイル、250 テストケースがパス。

---

## 作成・変更したファイル

### 新規作成

| ファイルパス | 種別 | エクスポート |
|-------------|------|------------|
| `packages/kuhl-core/src/systems/zone/load-calc.ts` | 新規作成 | `calculateZoneLoad`, `LOAD_INTENSITY_TABLE`, `ORIENTATION_FACTORS`, `getOrientationFactor`, `getGlazingFactor`, `LoadCalcResult` |
| `packages/kuhl-core/src/systems/zone/load-calc-system.ts` | 新規作成 | `processLoadCalc`, `LoadCalcSystem` |

### 変更

| ファイルパス | 変更内容 |
|-------------|---------|
| `packages/kuhl-core/src/schema/nodes/hvac-zone.ts` | `Orientation` 型（zod enum）追加、`HvacZoneNode` に `orientation`（オプショナル）・`glazingRatio`（オプショナル）フィールド追加 |
| `packages/kuhl-core/src/__tests__/systems/zone/load-calc.test.ts` | TC-001/TC-005 の期待値を実際の計算値（4066.5）に修正、TC-006 の heatingLoad/coolingLoad を `toBeCloseTo` に変更（浮動小数点誤差対応） |

---

## テスト修正の詳細

テストが実装と合わない箇所を修正した（タスク手順の「テストが壊れている場合は修正してよい」に従う）。

### TC-001 / TC-005: requiredAirflow の期待値

- **修正前**: `toBeCloseTo(4068.5, 1)`（コメントの計算値が誤り）
- **修正後**: `toBeCloseTo(4066.5, 1)`
- **根拠**: 実際の計算式 `15000 / (1.2 × 1006 × 11) × 3600 = 4066.51...` が正しい。テストのコメントが誤った近似値を記載していた。

### TC-006: heatingLoad の浮動小数点誤差

- **修正前**: `toBe(12650)`（厳密等値比較）
- **修正後**: `toBeCloseTo(12650)`
- **根拠**: `100 × 100 × 1.15 × 1.1 = 12650.000000000002`（IEEE 754 浮動小数点誤差）が発生。`toBe` では一致しないため `toBeCloseTo` を使用。

---

## 実装の概要

### `packages/kuhl-core/src/systems/zone/load-calc.ts`

- `LOAD_INTENSITY_TABLE`: 全 11 種の `ZoneUsage` をカバーする冷暖房原単位テーブル [W/m²]
- `ORIENTATION_FACTORS`: 8 方位の補正係数テーブル（N: 0.90 〜 S: 1.15）
- `getOrientationFactor(orientation?)`: undefined → 1.0、有効方位 → 対応係数
- `getGlazingFactor(glazingRatio?)`: `glazingRatio > 0.3` の場合のみ `1.0 + (ratio - 0.3) × 0.5` を返す
- `calculateZoneLoad(zone)`: 純粋関数。`floorArea <= 0` で `undefined` を返す。ΔT ≤ 0 の場合は `requiredAirflow = 0` として防御処理。

### `packages/kuhl-core/src/systems/zone/load-calc-system.ts`

- `processLoadCalc()`: `useScene.getState()` から `dirtyNodes` / `nodes` を直接取得し、`hvac_zone` ノードを検出して `calculateZoneLoad` を実行 → `updateNode` → 直後に `clearDirty`（無限ループ防止）
- `LoadCalcSystem`: React コンポーネント。`useFrame(processLoadCalc, 2)` で priority=2 実行。テスト環境など `@react-three/fiber` が利用不可の場合は空コンポーネントにフォールバック。

### `packages/kuhl-core/src/schema/nodes/hvac-zone.ts`

```ts
export const Orientation = z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'])
export type Orientation = z.infer<typeof Orientation>
```

`HvacZoneNode` に追加:
```ts
orientation: Orientation.optional(),
glazingRatio: z.number().optional(),
```

---

## Green Phase 完了確認

- [x] 新規テスト全パス（36/36）
- [x] 既存テスト回帰なし（250/250）
- [x] スキーマ変更後の既存テスト（hvac-zone.test.ts 等）維持
- [x] `calculateZoneLoad` は純粋関数（副作用なし）
- [x] ΔT=11（summerDryBulb=26 - supplyAirTemperature=15）で固定
- [x] `processLoadCalc` は `useScene` から直接状態取得（テスト可能な設計）
