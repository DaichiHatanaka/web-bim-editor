# TASK-0018: ゾーン一覧パネル・負荷集計表示 — Redフェーズ記録

**タスクID**: TASK-0018
**機能名**: kuhl-hvac-editor
**フェーズ**: Red（失敗テスト作成）
**作成日**: 2026-03-25

---

## 作成したテストケース一覧

| TC-ID | テストケース名 | 対象関数 | 信頼性 |
|-------|---------------|---------|--------|
| TC-001 | hvac_zone ノードのみ抽出される | `getZonesFromScene` | 🔵 |
| TC-002 | levelId 指定で該当レベルのゾーンのみ返す | `getZonesFromScene` | 🔵 |
| TC-003 | 空の nodes 辞書で空配列を返す | `getZonesFromScene` | 🔵 |
| TC-004 | hvac_zone が存在しない nodes で空配列を返す | `getZonesFromScene` | 🔵 |
| TC-005 | 複数ゾーンの面積・負荷を正しく合計する | `calculateZoneSummary` | 🔵 |
| TC-006 | loadResult が undefined のゾーンは負荷 0 として合計する | `calculateZoneSummary` | 🔵 |
| TC-007 | 空配列で全て 0 を返す | `calculateZoneSummary` | 🔵 |
| TC-008 | loadResult の coolingLoad/heatingLoad が個別に undefined でも正しく合計 | `calculateZoneSummary` | 🔵 |
| TC-009 | W を kW に変換して小数点1桁で表示する | `formatLoadValue` | 🔵 |
| TC-010 | 小数点以下が発生する値の変換 | `formatLoadValue` | 🔵 |
| TC-011 | undefined の場合 "-" を返す | `formatLoadValue` | 🔵 |
| TC-012 | 0W の場合 "0.0kW" を返す | `formatLoadValue` | 🔵 |
| TC-013 | 面積を小数点1桁 + "m2" で表示する | `formatAreaValue` | 🔵 |
| TC-014 | 小数点以下の面積を正しくフォーマットする | `formatAreaValue` | 🔵 |
| TC-015 | 0 の場合 "0.0m2" を返す | `formatAreaValue` | 🔵 |
| TC-016 | 全11種の ZoneUsage に日本語ラベルが定義されている | `ZONE_USAGE_LABELS` | 🔵 |
| TC-017 | ZoneUsage の全キーが ZONE_USAGE_LABELS に存在する | `ZONE_USAGE_LABELS` | 🔵 |

**合計**: 17件（全て 🔵 青信号）

---

## テストファイルパス

`apps/kuhl-editor/__tests__/components/panels/zone-list-panel.test.tsx`

---

## 期待される失敗内容

実装ファイル `apps/kuhl-editor/components/panels/zone-list-panel.tsx` が存在しないため、
import 時点でモジュール解決エラーが発生し、全17テストが失敗する。

```
Error: Cannot find module '../../../components/panels/zone-list-panel'
```

### 実際のテスト実行結果

```
 ❯ __tests__/components/panels/zone-list-panel.test.tsx (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  __tests__/components/panels/zone-list-panel.test.tsx
Error: Cannot find module '../../../components/panels/zone-list-panel' imported from C:/Users/.../zone-list-panel.test.tsx

 Test Files  1 failed (1)
       Tests  no tests
```

---

## Greenフェーズで実装すべき内容

### 実装ファイル

`apps/kuhl-editor/components/panels/zone-list-panel.tsx`

### エクスポートすべき関数・定数・型

1. **`ZONE_USAGE_LABELS`**: `Record<ZoneUsage, string>` — 11種の ZoneUsage に対する日本語ラベルマップ
2. **`getZonesFromScene(nodes, levelId?)`**: `HvacZoneNode[]` — nodes 辞書から hvac_zone 型のみ抽出、levelId 指定時は parentId でフィルタ
3. **`calculateZoneSummary(zones)`**: `ZoneSummary` — totalArea/totalCoolingLoad/totalHeatingLoad/zoneCount を集計。loadResult undefined は 0 扱い
4. **`formatLoadValue(watts?)`**: `string` — W→kW変換、小数点1桁+"kW"。undefined → "-"
5. **`formatAreaValue(area)`**: `string` — 小数点1桁+"m2"
6. **`ZoneListPanelProps`** インタフェース
7. **`ZoneSummary`** インタフェース

### 実装上の注意

- loadResult?.coolingLoad が `undefined` の場合は `0` として扱う（`?? 0`）
- W単位を kW に変換: `watts / 1000`
- `toFixed(1)` で小数点1桁固定
- ZoneUsage: `office | meeting | server_room | lobby | corridor | toilet | kitchen | warehouse | mechanical_room | electrical_room | other`
