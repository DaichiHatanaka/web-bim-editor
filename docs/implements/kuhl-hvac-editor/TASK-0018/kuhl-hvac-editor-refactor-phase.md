# TASK-0018: ゾーン一覧パネル・負荷集計表示 — Refactorフェーズ記録

**タスクID**: TASK-0018
**機能名**: kuhl-hvac-editor
**フェーズ**: Refactor（品質改善）
**作成日**: 2026-03-25

---

## テスト実行結果（リファクタリング後）

```
 RUN  v4.1.0 C:/Users/畠中大地/web-bim-editor/apps/kuhl-editor

 Test Files  1 passed (1)
       Tests  17 passed (17)
   Start at  10:44:50
   Duration  345ms
```

**全17テスト通過** — リファクタリング前後ともに全件パス ✅

---

## 実施したリファクタリング

### 改善1: `getZonesFromScene` の nodes パラメータ型精緻化

**信頼性**: 🔵 要件定義書 §4.1 に基づく確実な改善

**変更内容**:
- 変更前: `Record<string, { type: string; parentId?: string | null; [key: string]: unknown }>`
- 変更後: `Record<string, AnyNode>`

**理由**:
- Green フェーズでは vitest の node 環境を通すために拡張オブジェクト型で仮実装していた
- `@kuhl/core` の `AnyNode` union 型と直接互換性を持たせることで、useScene.nodes を直接渡せるようになり型安全性が向上
- `AnyNode` のインポートを `zone-list-panel.tsx` の import 文に追加

**影響範囲**: `apps/kuhl-editor/components/panels/zone-list-panel.tsx` のみ

---

### 改善2: `zone-list-panel-view.tsx` の実装（JSX UIコンポーネント）

**信頼性**: 🔵 要件定義書 §2, §3 に基づく確実な実装

**新規ファイル**: `apps/kuhl-editor/components/panels/zone-list-panel-view.tsx`

**実装内容**:

| 機能 | 実装方法 | 信頼性 |
|------|---------|--------|
| ゾーン一覧テーブル | `<table>` + `zones.map()` | 🔵 |
| 選択ハイライト | `useViewer(s => s.selection)` で `isSelected` 判定 | 🔵 |
| クリック選択連動 | `setSelection({ zoneId })` + `onZoneSelect?.(zoneId)` | 🔵 |
| 集計行 | `calculateZoneSummary` の返値を最終行に表示 | 🔵 |
| ダブルクリック編集 | `editingZoneId` state + テキスト入力/セレクト表示 | 🔵 |
| Enter確定/Escape キャンセル | `onKeyDown` ハンドラ | 🔵 |
| 確定時 updateNode 呼び出し | `useScene(s => s.updateNode)` | 🔵 |
| ゾーン0件時の空状態表示 | `"ゾーンがありません"` メッセージ（EDGE-1対応） | 🔵 |
| 用途セレクトボックス | `Object.entries(ZONE_USAGE_LABELS)` でオプション生成 | 🔵 |

**設計方針**:
- TASK-0017 の `ifc-upload-panel-view.tsx` と同様の設計分離パターン
- `'use client'` ディレクティブ付き（Next.js Client Component）
- `useCallback` で各イベントハンドラをメモ化してパフォーマンスを最適化

---

## セキュリティレビュー

| 観点 | 評価 | 詳細 |
|------|------|------|
| XSS対策 | ✅ 問題なし | React の JSX エスケープ機構により安全 |
| 入力検証 | ✅ 問題なし | `updateNode` 前の `editValues` 存在チェック実施。Zod スキーマ側でバリデーション |
| CSRF | ✅ 該当なし | フロントエンド内のストア操作のみ、外部リクエストなし |
| データ漏洩 | ✅ 問題なし | useScene/useViewer の状態はクライアントサイドのみ |

**重大な脆弱性**: なし

---

## パフォーマンスレビュー

| 観点 | 評価 | 詳細 |
|------|------|------|
| `getZonesFromScene` 計算量 | ✅ O(n) | nodes 辞書全体を一度走査 — 許容範囲 |
| `calculateZoneSummary` 計算量 | 🟡 O(3n) | reduce を3回実行。100件以上では1パス化を検討 |
| ゾーン大量表示 | 🟡 全件表示 | EDGE-5 要件は「スクロール対応のみ」で仮想スクロール不要 |
| `useCallback` メモ化 | ✅ 実施済み | 全イベントハンドラに useCallback 適用 |
| テスト実行時間 | ✅ 345ms | 2秒未満 — 問題なし |

---

## コード品質評価

| 観点 | 評価 |
|------|------|
| ファイルサイズ | ✅ `zone-list-panel.tsx` 212行 / `zone-list-panel-view.tsx` 215行（両ファイルとも500行未満） |
| 日本語コメント | ✅ 全関数・定数・JSXブロックに日本語コメント付与 |
| 型安全性 | ✅ `Record<string, AnyNode>` に精緻化済み |
| 設計分離 | ✅ ロジック(tsx) / View(view.tsx) の分離維持 |
| Viewer Isolation | ✅ `@pascal-app/viewer` から `apps/editor` へのインポートなし |

---

## ファイル変更サマリー

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `apps/kuhl-editor/components/panels/zone-list-panel.tsx` | 変更 | `AnyNode` インポート追加、`getZonesFromScene` nodes 型精緻化、設計メモ更新 |
| `apps/kuhl-editor/components/panels/zone-list-panel-view.tsx` | 新規 | ZoneListPanel JSX UIコンポーネント実装 |
