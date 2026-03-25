# TASK-0015: LoadCalcSystem Red Phase 記録

**タスクID**: TASK-0015
**フェーズ**: Red Phase
**実施日**: 2026-03-25

---

## 実行コマンド

```bash
cd packages/kuhl-core && node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/__tests__/systems/zone/load-calc.test.ts
```

## 実行結果

```
 RUN  v4.1.0 C:/Users/畠中大地/web-bim-editor/packages/kuhl-core

 ❯ src/__tests__/systems/zone/load-calc.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/systems/zone/load-calc.test.ts [ src/__tests__/systems/zone/load-calc.test.ts ]
Error: Cannot find module '../../../systems/zone/load-calc' imported from ...

 Test Files  1 failed (1)
       Tests  no tests
    Start at  08:53:26
    Duration  378ms (transform 89ms, setup 33ms, import 0ms, tests 0ms, environment 0ms)
```

## 失敗の原因

実装ファイルが存在しないため、import 時点でモジュール解決エラーが発生しスイート全体が失敗。

- `packages/kuhl-core/src/systems/zone/load-calc.ts` → 未作成
- `packages/kuhl-core/src/systems/zone/load-calc-system.ts` → 未作成

## 作成したテストファイル

**パス**: `packages/kuhl-core/src/__tests__/systems/zone/load-calc.test.ts`

### テストケース一覧（全16ケース + 定数/ヘルパー確認テスト）

| TC番号 | describe | 内容 |
|--------|---------|------|
| TC-001 | basic calculation | office 100m² の冷暖房負荷と必要給気量 |
| TC-002 | usage unit table | 全11種のusage別 it.each（冷暖房原単位） |
| TC-003 | orientation correction | orientation=S → 補正係数1.15適用 |
| TC-004 | glazing correction | glazingRatio=0.5 → glazingFactor=1.1 |
| TC-005 | required airflow | 必要給気量≈4068.5 m³/h |
| TC-006 | combined corrections | orientation=S + glazingRatio=0.5 複合補正 |
| TC-007 | dirty node processing | LoadCalcSystem: dirtyNodes検出→再計算 |
| TC-008 | edge cases | floorArea=0 → undefined |
| TC-009 | edge cases | floorArea<0 → undefined |
| TC-010 | edge cases | usage不正値 → officeフォールバックまたはundefined |
| TC-011 | edge cases | designConditions未定義 → デフォルト値で計算 |
| TC-012 | boundary values | 最小floorArea=0.01m² |
| TC-013 | boundary values | glazingRatio=0 → factor=1.0 |
| TC-014 | boundary values | glazingRatio=0.3（閾値ちょうど）→ factor=1.0 |
| TC-015 | boundary values | glazingRatio=1.0（最大）→ factor=1.35 |
| TC-016 | boundary values | orientation未定義 → factor=1.0 |

加えて以下の定数・ヘルパー関数のエクスポート確認テストも含む:
- `LOAD_INTENSITY_TABLE`: 11種のZoneUsage全カバー確認
- `ORIENTATION_FACTORS`: 全方位（N/NE/E/SE/S/SW/W/NW）確認
- `getOrientationFactor()`: undefined→1.0, S→1.15, N→0.90
- `getGlazingFactor()`: undefined→1.0, 0/0.3→1.0, 0.5→1.1, 1.0→1.35

## スキーマ変更について

テストケースで使用する `orientation` および `glazingRatio` フィールドは現スキーマに存在しない。
Red Phase では `as any` キャストで対処し、Green Phase でスキーマ追加を行う。

## Green Phase で作成が必要なファイル

| ファイルパス | 種別 | エクスポート |
|-------------|------|------------|
| `packages/kuhl-core/src/systems/zone/load-calc.ts` | 新規作成 | `calculateZoneLoad`, `LOAD_INTENSITY_TABLE`, `ORIENTATION_FACTORS`, `getOrientationFactor`, `getGlazingFactor` |
| `packages/kuhl-core/src/systems/zone/load-calc-system.ts` | 新規作成 | `processLoadCalc`, `LoadCalcSystem` |
| `packages/kuhl-core/src/schema/nodes/hvac-zone.ts` | 変更 | `orientation` (Orientation optional), `glazingRatio` (number optional) 追加 |

## Red 状態の確認

- テストファイル作成済み: ✅
- 実装ファイル未作成: ✅
- 全テストスイート FAIL（exit code 1）: ✅
- 原因: `Cannot find module '../../../systems/zone/load-calc'`
