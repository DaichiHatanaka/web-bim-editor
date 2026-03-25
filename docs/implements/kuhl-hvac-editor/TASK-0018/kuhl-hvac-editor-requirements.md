# TASK-0018: ゾーン一覧パネル・負荷集計表示 要件定義書

**タスクID**: TASK-0018
**機能名**: kuhl-hvac-editor
**要件名**: ゾーン一覧パネル・負荷集計表示
**作成日**: 2026-03-25
**信頼性評価**: 高品質（TASK-0014 ZoneDrawTool、TASK-0015 LoadCalcSystem 完了を前提とするUI層タスク）

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- **何をする機能か**: useScene から hvac_zone ノード一覧を取得し、各ゾーンの zoneName, usage（日本語ラベル）, floorArea（m2）, coolingLoad（kW）, heatingLoad（kW）を表形式で表示するパネルコンポーネント。集計行で合計面積・合計負荷を表示し、ゾーンクリックで3Dビュー選択と連動、ダブルクリックで属性編集モードに入り updateNode で反映する。
- **どのような問題を解決するか**: TASK-0014/0015 で実装されたゾーン描画・負荷計算の結果を、設計者が一覧・集計形式で確認する手段がない。本タスクにより、全ゾーンの負荷状況を俯瞰し、属性変更による再計算結果を即座に確認できるようになる。
- **想定されるユーザー**: 社内の空調設備設計担当者。ゾーニング完了後に負荷バランスを確認し、用途変更や面積調整を行う。
- **システム内での位置づけ**: `apps/kuhl-editor/components/panels/zone-list-panel.tsx` に配置。Editor層のUIコンポーネントとして、`@kuhl/core` の useScene（ノード取得・更新）と `@kuhl/viewer` の useViewer（選択連動）を使用する。Viewer Isolation原則に準拠。
- **参照したEARS要件**: REQ-105, REQ-110, EDGE-101
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` - モノレポ構成・3ストアアーキテクチャ; `docs/spec/kuhl-hvac-editor/note.md` - TASK-0018 コンテキスト

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 ZoneListPanel コンポーネント

- **ファイルパス**: `apps/kuhl-editor/components/panels/zone-list-panel.tsx`
- **テストファイルパス**: `apps/kuhl-editor/__tests__/components/panels/zone-list-panel.test.tsx`

#### 2.1.1 Props定義

- **型定義**:

  ```typescript
  export interface ZoneListPanelProps {
    levelId?: string              // フィルタリング用（オプション）
    onZoneSelect?: (zoneId: string) => void
    onZoneEdit?: (zoneId: string) => void
  }
  ```

- **levelId**: 指定された場合、そのレベルに属する hvac_zone ノードのみを表示。未指定の場合は全ゾーンを表示。
- **onZoneSelect**: ゾーン行クリック時に呼び出されるコールバック（任意）。内部で useViewer.setSelection も呼ぶ。
- **onZoneEdit**: 属性編集完了時に呼び出されるコールバック（任意）。

#### 2.1.2 内部状態

- **editingZoneId**: 属性編集中のゾーンID（string | null）。ダブルクリックで設定、確定/キャンセルで null に戻す。
- **editValues**: 編集中の値を保持するオブジェクト `{ zoneName?: string; usage?: ZoneUsage }`。

### 2.2 ZoneUsage 日本語ラベルマッピング

- **型定義**:

  ```typescript
  export const ZONE_USAGE_LABELS: Record<ZoneUsage, string> = {
    office: '事務所',
    meeting: '会議室',
    server_room: 'サーバー室',
    lobby: 'ロビー',
    corridor: '廊下',
    toilet: 'トイレ',
    kitchen: '厨房',
    warehouse: '倉庫',
    mechanical_room: '機械室',
    electrical_room: '電気室',
    other: 'その他',
  }
  ```

- 全 ZoneUsage 値に対して日本語ラベルが定義されていること。

### 2.3 ゾーン一覧テーブルの列定義

| 列名 | フィールド | 表示形式 | 信頼性 |
|------|-----------|---------|--------|
| ゾーン名 | zoneName | 文字列そのまま | 🔵 |
| 用途 | usage | ZONE_USAGE_LABELS[usage] で日本語変換 | 🔵 |
| 面積 | floorArea | 小数点1桁 + "m2" 単位表示 | 🔵 |
| 冷房負荷 | loadResult.coolingLoad | W→kW変換（/1000）、小数点1桁 + "kW" 単位。未計算時は "-" | 🔵 |
| 暖房負荷 | loadResult.heatingLoad | W→kW変換（/1000）、小数点1桁 + "kW" 単位。未計算時は "-" | 🔵 |

**重要**: LoadCalcSystem の calculateZoneLoad は W 単位で結果を返す（load-calc.ts: `unitTable.cooling * floorArea * orientationFactor * glazingFactor`、原単位テーブルが W/m2）。表示時に kW に変換する（/1000）。

### 2.4 集計行

- **合計面積**: 全表示ゾーンの floorArea の合計。小数点1桁 + "m2"。
- **合計冷房負荷**: 全表示ゾーンの coolingLoad の合計（W→kW変換後）。小数点1桁 + "kW"。未計算ゾーンは 0 として扱う。
- **合計暖房負荷**: 全表示ゾーンの heatingLoad の合計（W→kW変換後）。小数点1桁 + "kW"。未計算ゾーンは 0 として扱う。

### 2.5 ゾーン選択連動

- **クリック**: 行クリック時に `useViewer.getState().setSelection({ zoneId })` を呼び出し、3Dビューの選択と連動する。
- **コールバック**: `onZoneSelect?.(zoneId)` も呼び出す。
- **ハイライト**: 現在選択中のゾーン（`useViewer.selection.zoneId === zone.id`）の行に視覚的ハイライトを適用。

### 2.6 属性編集

- **トリガー**: 行ダブルクリックで `editingZoneId` を設定。
- **編集可能フィールド**: `zoneName`（テキスト入力）、`usage`（セレクトボックス）。
- **確定**: Enter キーまたは確定ボタンで `useScene.getState().updateNode(zoneId, { zoneName, usage })` を呼び出す。updateNode 内部で markDirty が呼ばれ、LoadCalcSystem が再計算を実行する。
- **キャンセル**: Escape キーまたはキャンセルボタンで `editingZoneId = null` に戻す。
- **コールバック**: 確定時に `onZoneEdit?.(zoneId)` を呼び出す。

---

## 3. 処理フロー

### 3.1 ゾーン一覧取得

```
useScene(nodes) → Object.values(nodes).filter(n => n.type === 'hvac_zone')
  → levelId が指定されている場合: さらに n.parentId === levelId でフィルタ
  → zones: HvacZoneNode[]
```

### 3.2 集計計算

```
totalArea = zones.reduce((sum, z) => sum + z.floorArea, 0)
totalCoolingLoad = zones.reduce((sum, z) => sum + (z.loadResult?.coolingLoad ?? 0), 0)
totalHeatingLoad = zones.reduce((sum, z) => sum + (z.loadResult?.heatingLoad ?? 0), 0)
```

### 3.3 選択連動

```
行クリック → useViewer.setSelection({ zoneId: zone.id })
         → onZoneSelect?.(zone.id)
```

### 3.4 属性編集

```
行ダブルクリック → editingZoneId = zone.id, editValues = { zoneName, usage }
Enter/確定 → useScene.updateNode(zoneId, editValues)
           → editingZoneId = null
           → onZoneEdit?.(zoneId)
Escape/キャンセル → editingZoneId = null
```

---

## 4. 純粋関数の仕様

### 4.1 getZonesFromScene

```typescript
export function getZonesFromScene(
  nodes: Record<string, AnyNode>,
  levelId?: string,
): HvacZoneNode[]
```

- **入力**: useScene の nodes 辞書と任意の levelId
- **出力**: hvac_zone 型のノード配列
- **ロジック**: `Object.values(nodes).filter(n => n.type === 'hvac_zone')` + levelId フィルタ

### 4.2 calculateZoneSummary

```typescript
export interface ZoneSummary {
  totalArea: number          // m2
  totalCoolingLoad: number   // W（内部単位）
  totalHeatingLoad: number   // W（内部単位）
  zoneCount: number
}

export function calculateZoneSummary(zones: HvacZoneNode[]): ZoneSummary
```

- **入力**: HvacZoneNode 配列
- **出力**: 集計結果
- **ロジック**: reduce で合計。loadResult が undefined のゾーンは 0 として扱う。

### 4.3 formatLoadValue

```typescript
export function formatLoadValue(watts: number | undefined): string
```

- **入力**: W 単位の負荷値（undefined 可）
- **出力**: kW 単位の文字列（"15.0kW"）。undefined の場合は "-"。
- **ロジック**: `watts !== undefined ? (watts / 1000).toFixed(1) + 'kW' : '-'`

### 4.4 formatAreaValue

```typescript
export function formatAreaValue(area: number): string
```

- **入力**: m2 単位の面積
- **出力**: 小数点1桁の文字列 + "m2"（"50.0m2"）

### 4.5 ZONE_USAGE_LABELS

- **型**: `Record<ZoneUsage, string>`
- **内容**: 2.2 節参照

---

## 5. テスト要件の概要

### 5.1 テストカテゴリ

| カテゴリ | テストケース数 | 信頼性 |
|---------|-------------|--------|
| 純粋関数: getZonesFromScene | 4 | 🔵 |
| 純粋関数: calculateZoneSummary | 4 | 🔵 |
| 純粋関数: formatLoadValue / formatAreaValue | 4 | 🔵 |
| 純粋関数: ZONE_USAGE_LABELS | 2 | 🔵 |
| 統合: ゾーンクリック→選択連動 | 2 | 🔵 |
| 統合: 属性編集→updateNode | 3 | 🔵 |

### 5.2 テスト方針

- **純粋関数テスト**: JSX を含まない関数を直接テスト（vitest node 環境対応）
- **統合テスト**: useScene/useViewer のモックを使用し、クリック・編集フローを検証
- **カバレッジ目標**: 60% 以上

---

## 6. エッジケース

| ID | ケース | 対応方針 | 信頼性 |
|----|--------|---------|--------|
| EDGE-1 | ゾーンが0件の場合 | "ゾーンがありません" メッセージを表示 | 🔵 |
| EDGE-2 | loadResult が undefined のゾーン | coolingLoad/heatingLoad を "-" で表示、集計では 0 扱い | 🔵 |
| EDGE-3 | floorArea が 0 以下のゾーン | 一覧には表示するが、loadResult は undefined（LoadCalcSystem がスキップ） | 🔵 |
| EDGE-4 | zoneName が空文字のゾーン | 空文字のまま表示（バリデーションは Zod スキーマ側） | 🟡 |
| EDGE-5 | 大量ゾーン（100件超） | 表示は全件（スクロール対応）。パフォーマンスは NFR-002 準拠 | 🟡 |

---

## 7. 実装ファイル構成

### 7.1 ロジックファイル（JSX なし）

- **パス**: `apps/kuhl-editor/components/panels/zone-list-panel.tsx`
- **エクスポート**:
  - `ZONE_USAGE_LABELS` — 用途日本語ラベル定数
  - `getZonesFromScene()` — ゾーン一覧取得純粋関数
  - `calculateZoneSummary()` — 集計計算純粋関数
  - `formatLoadValue()` — 負荷値フォーマット
  - `formatAreaValue()` — 面積フォーマット
  - `ZoneListPanelProps` — Props 型
  - `ZoneSummary` — 集計結果型

### 7.2 UI コンポーネントファイル（JSX あり）

- **パス**: `apps/kuhl-editor/components/panels/zone-list-panel-view.tsx`
- **エクスポート**: `ZoneListPanel` — React コンポーネント（デフォルトエクスポート）
- **設計メモ**: TASK-0017 の ifc-upload-panel と同様に、ロジックとJSXを分離してテスト環境との互換性を確保。

### 7.3 テストファイル

- **パス**: `apps/kuhl-editor/__tests__/components/panels/zone-list-panel.test.tsx`

---

## 8. 依存関係

### 8.1 使用するストア

| ストア | パッケージ | 使用目的 |
|--------|-----------|---------|
| useScene | @kuhl/core | hvac_zone ノード取得、updateNode による属性更新 |
| useViewer | @kuhl/viewer | setSelection によるゾーン選択連動、selection.zoneId による選択状態取得 |

### 8.2 使用するスキーマ

| スキーマ | パッケージ | 使用目的 |
|---------|-----------|---------|
| HvacZoneNode | @kuhl/core | ゾーンノードの型定義 |
| ZoneUsage | @kuhl/core | 用途 enum（ラベルマッピングのキー） |
| LoadCalcResult | @kuhl/core | loadResult の型定義 |

### 8.3 前提タスク

- TASK-0014: ZoneDrawTool（hvac_zone ノードの作成が可能であること）
- TASK-0015: LoadCalcSystem（loadResult が自動計算されること）

---

## 9. 信頼性レベルサマリー

- **総項目数**: 19項目
- **青信号**: 17項目 (89%)
- **黄信号**: 2項目 (11%)
- **赤信号**: 0項目 (0%)

**品質評価**: 高品質 -- REQ-105、HvacZoneNode スキーマ、LoadCalcSystem の既存実装に基づく確実な設計。黄信号は空文字 zoneName 処理と大量ゾーンのパフォーマンスのみ。
