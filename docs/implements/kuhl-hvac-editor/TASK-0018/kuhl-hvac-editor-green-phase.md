# TASK-0018: ゾーン一覧パネル・負荷集計表示 — Greenフェーズ記録

**タスクID**: TASK-0018
**機能名**: kuhl-hvac-editor
**フェーズ**: Green（最小実装）
**作成日**: 2026-03-25

---

## 実装ファイル

`apps/kuhl-editor/components/panels/zone-list-panel.tsx`（新規作成）

---

## テスト実行結果

```
 RUN  v4.1.0 C:/Users/畠中大地/web-bim-editor/apps/kuhl-editor

 Test Files  1 passed (1)
       Tests  17 passed (17)
   Start at  10:40:46
   Duration  303ms
```

**全17テスト通過**

---

## 実装方針と判断理由

### 設計分離パターン

TASK-0017 の ifc-upload-panel と同様に、ロジックとJSXを分離する設計を採用:

- `zone-list-panel.tsx`: 純粋関数・型定義・定数（JSX なし）→ vitest node 環境でテスト可能
- `zone-list-panel-view.tsx`: React コンポーネント（JSX あり）→ 将来実装予定

この分離により vitest の node 環境（`jsx: preserve` 設定下）でもテストが実行可能となる。

### 実装した関数・定数

| エクスポート | 説明 | 信頼性 |
|-------------|------|--------|
| `ZONE_USAGE_LABELS` | 全11種 ZoneUsage の日本語ラベルマップ | 🔵 |
| `getZonesFromScene(nodes, levelId?)` | nodes辞書から hvac_zone 型のみ抽出、levelId フィルタ対応 | 🔵 |
| `calculateZoneSummary(zones)` | totalArea/totalCoolingLoad/totalHeatingLoad/zoneCount 集計 | 🔵 |
| `formatLoadValue(watts?)` | W→kW変換、小数点1桁+"kW"。undefined→"-" | 🔵 |
| `formatAreaValue(area)` | 小数点1桁+"m2" | 🔵 |
| `ZoneListPanelProps` | コンポーネント Props インタフェース | 🔵 |
| `ZoneSummary` | 集計結果インタフェース | 🔵 |

### 主要な実装ポイント

1. **`getZonesFromScene`**: `Object.values(nodes).filter(n => n.type === 'hvac_zone')` で型安全に抽出。levelId 指定時は `parentId === levelId` でさらにフィルタ。

2. **`calculateZoneSummary`**: `loadResult?.coolingLoad ?? 0` パターンで undefined を 0 扱い。空配列の場合は早期返却で全て 0。

3. **`formatLoadValue`**: `watts === undefined` チェックを先行し "-" 返却。それ以外は `(watts / 1000).toFixed(1) + 'kW'`。

4. **`formatAreaValue`**: `area.toFixed(1) + 'm2'` のシンプルな実装。

---

## 課題・改善点（Refactorフェーズで対応）

1. **JSX UI 実装**: `zone-list-panel-view.tsx` として ZoneListPanel コンポーネントを実装（ゾーン一覧テーブル、集計行、クリック選択連動、ダブルクリック属性編集）
2. **型の精緻化**: `getZonesFromScene` の nodes パラメータ型を `Record<string, AnyNode>` に変更（現状は拡張オブジェクト型で対応）
3. **コメント整理**: 日本語コメントの一部を整理してコードをよりスリムに
