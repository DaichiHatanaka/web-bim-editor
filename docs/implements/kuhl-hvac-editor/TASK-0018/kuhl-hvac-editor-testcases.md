# TASK-0018: ゾーン一覧パネル・負荷集計表示 テストケース一覧

**タスクID**: TASK-0018
**機能名**: kuhl-hvac-editor
**要件名**: ゾーン一覧パネル・負荷集計表示
**作成日**: 2026-03-25
**テストファイル**: `apps/kuhl-editor/__tests__/components/panels/zone-list-panel.test.tsx`

---

## テスト対象関数一覧

| # | 関数名 | 種別 | ファイル |
|---|--------|------|---------|
| 1 | `getZonesFromScene` | 純粋関数 | `zone-list-panel.tsx` |
| 2 | `calculateZoneSummary` | 純粋関数 | `zone-list-panel.tsx` |
| 3 | `formatLoadValue` | 純粋関数 | `zone-list-panel.tsx` |
| 4 | `formatAreaValue` | 純粋関数 | `zone-list-panel.tsx` |
| 5 | `ZONE_USAGE_LABELS` | 定数 | `zone-list-panel.tsx` |

---

## 1. getZonesFromScene テストケース

### 1.1 正常系

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-001 | hvac_zone ノードのみ抽出される | nodes に hvac_zone 2件 + level 1件 | hvac_zone 2件の配列 | 🔵 | §4.1 |
| TC-002 | levelId 指定で該当レベルのゾーンのみ返す | nodes に hvac_zone 3件（parentId が異なる） + levelId 指定 | 該当 parentId の hvac_zone のみ | 🔵 | §4.1 |

### 1.2 エッジケース

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-003 | 空の nodes 辞書で空配列を返す | `{}` | `[]` | 🔵 | EDGE-1 |
| TC-004 | hvac_zone が存在しない nodes で空配列を返す | level ノードのみ | `[]` | 🔵 | EDGE-1 |

---

## 2. calculateZoneSummary テストケース

### 2.1 正常系

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-005 | 複数ゾーンの面積・負荷を正しく合計する | floorArea 50/30、coolingLoad 5000/3000、heatingLoad 4000/2000 の2件 | totalArea=80, totalCoolingLoad=8000, totalHeatingLoad=6000, zoneCount=2 | 🔵 | §4.2 |
| TC-006 | loadResult が undefined のゾーンは負荷 0 として合計する | loadResult undefined のゾーン1件 + loadResult あり1件 | loadResult undefined 分は 0 扱い | 🔵 | §4.2, EDGE-2 |

### 2.2 エッジケース

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-007 | 空配列で全て 0 を返す | `[]` | totalArea=0, totalCoolingLoad=0, totalHeatingLoad=0, zoneCount=0 | 🔵 | EDGE-1 |
| TC-008 | loadResult の coolingLoad/heatingLoad が個別に undefined でも正しく合計 | coolingLoad のみ undefined のゾーン | coolingLoad は 0 扱い、heatingLoad は値を合計 | 🔵 | EDGE-2 |

---

## 3. formatLoadValue テストケース

### 3.1 正常系

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-009 | W を kW に変換して小数点1桁で表示する | `15000` | `'15.0kW'` | 🔵 | §4.3 |
| TC-010 | 小数点以下が発生する値の変換 | `1500` | `'1.5kW'` | 🔵 | §4.3 |

### 3.2 エッジケース

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-011 | undefined の場合 "-" を返す | `undefined` | `'-'` | 🔵 | §4.3, EDGE-2 |
| TC-012 | 0W の場合 "0.0kW" を返す | `0` | `'0.0kW'` | 🔵 | §4.3 |

---

## 4. formatAreaValue テストケース

### 4.1 正常系

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-013 | 面積を小数点1桁 + "m2" で表示する | `50` | `'50.0m2'` | 🔵 | §4.4 |
| TC-014 | 小数点以下の面積を正しくフォーマットする | `25.75` | `'25.8m2'` | 🔵 | §4.4 |

### 4.2 エッジケース

| TC-ID | テストケース名 | 入力 | 期待出力 | 信頼性 | 参照要件 |
|-------|---------------|------|---------|--------|----------|
| TC-015 | 0 の場合 "0.0m2" を返す | `0` | `'0.0m2'` | 🔵 | §4.4, EDGE-3 |

---

## 5. ZONE_USAGE_LABELS テストケース

| TC-ID | テストケース名 | 期待値 | 信頼性 | 参照要件 |
|-------|---------------|--------|--------|----------|
| TC-016 | 全11種の ZoneUsage に日本語ラベルが定義されている | office→事務所, meeting→会議室, server_room→サーバー室, lobby→ロビー, corridor→廊下, toilet→トイレ, kitchen→厨房, warehouse→倉庫, mechanical_room→機械室, electrical_room→電気室, other→その他 | 🔵 | §2.2 |
| TC-017 | ZoneUsage の全キーが ZONE_USAGE_LABELS に存在する | ZoneUsage.options の全要素がキーに含まれる | 🔵 | §2.2 |

---

## テストケースサマリー

| カテゴリ | TC数 | 🔵 青 | 🟡 黄 |
|---------|------|-------|-------|
| getZonesFromScene | 4 | 4 | 0 |
| calculateZoneSummary | 4 | 4 | 0 |
| formatLoadValue / formatAreaValue | 5 | 5 | 0 |
| ZONE_USAGE_LABELS | 2 | 2 | 0 |
| **合計** | **17** | **17** | **0** |

---

## テスト実装方針

### モック戦略

- **モック不要**: テスト対象は全て純粋関数・定数であるため、外部モックは不要
- **テストデータ**: HvacZoneNode 型に準拠した最小限のオブジェクトリテラルをヘルパー関数で生成
- **AnyNode 辞書**: `Record<string, AnyNode>` 形式のテストデータを構築し、hvac_zone 以外のノード型も混在させて抽出ロジックを検証

### テストカバレッジ目標

- 純粋関数（getZonesFromScene, calculateZoneSummary, formatLoadValue, formatAreaValue）: 100%
- 定数（ZONE_USAGE_LABELS）: 100%
- 全体: 60%以上（TASK-0018 完了条件）
