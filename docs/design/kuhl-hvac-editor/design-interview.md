# Kühl HVAC Editor 設計ヒアリング記録

**作成日**: 2026-03-23
**ヒアリング実施**: step4 既存情報ベースの差分ヒアリング

## ヒアリング目的

既存の要件定義・設計文書・実装（Pascal Editor V2）を確認し、技術設計に必要な不明点や設計判断を明確化するためのヒアリングを実施しました。

---

## 質問と回答

### Q1: リポジトリ構成

**質問日時**: 2026-03-23
**カテゴリ**: アーキテクチャ
**背景**: ヒアリング記録で `@kuhl/*` 新規スコープは確定済みだが、物理的なリポジトリ構成（新規リポジトリ vs 同一モノレポ）が未決定。ビルド設定・CI/CD・共通パッケージの扱いに大きく影響する。

**回答**: **同一モノレポ内に追加** — 既存の web-bim-editor モノレポに `packages/kuhl-core`, `packages/kuhl-viewer`, `apps/kuhl-editor` を追加。

**信頼性への影響**:
- モノレポ構成の設計が 🟡 → 🔵 に向上
- Turborepo設定、共有UI（@repo/ui）の再利用方針が確定
- 既存のCI/CDパイプラインを活用可能

---

### Q2: 共通基盤の扱い

**質問日時**: 2026-03-23
**カテゴリ**: アーキテクチャ
**背景**: BaseNode, useScene, event bus, sceneRegistry等の共通基盤を、@pascal-app/coreから参照するか、@kuhl/coreにフォーク・コピーするかで、保守性と独立性のトレードオフがある。

**回答**: **フォークしてコピー** — 共通基盤を `@kuhl/core` にコピーし、完全独立。建築ノードを削除して空調ノードに置き換え。

**信頼性への影響**:
- `@kuhl/core` の独立性が確定（🔵）
- `@pascal-app/core` の変更が `@kuhl/*` に影響しない設計
- BaseNode, useScene, event bus, sceneRegistryの空調版を作成する方針が確定

---

### Q3: 並存方針

**質問日時**: 2026-03-23
**カテゴリ**: アーキテクチャ
**背景**: Phase 0で建築ノードを削除する際、既存の `@pascal-app/*` パッケージをどう扱うか。並存なら両エディタが同時に動作可能。

**回答**: **並存** — `@pascal-app/*` はそのまま残し、`@kuhl/*` を新規追加。建築エディタも引き続き動作。

**信頼性への影響**:
- パッケージ間の依存関係設計が明確化（🔵）
- `@kuhl/*` は `@pascal-app/*` に依存しない完全独立パッケージ
- 同一モノレポ内で2つのエディタが並存する設計

---

### Q4: IFC処理のスレッド方式

**質問日時**: 2026-03-23
**カテゴリ**: 技術選択
**背景**: web-ifc WASMでのIFC読込は、大規模ファイル（50-100MB）でメインスレッドをブロックする可能性がある。Web Worker利用の要否を確認。

**回答**: **メインスレッドでOK** — 当面はメインスレッド処理で十分。大規模ファイル対応は後で。

**信頼性への影響**:
- IFC読込のアーキテクチャがシンプルに確定（🔵）
- 将来のWorker化の余地は残す（🟡 拡張性考慮）
- NFR-003（100MB制限）の対応はファイルサイズチェックのみ

---

### Q5: ダクト3Dジオメトリ生成方式

**質問日時**: 2026-03-23
**カテゴリ**: 技術選択
**背景**: ダクト・配管の3D表現で、Three.jsのExtrudeGeometry（シンプル）とBufferGeometry直接生成（高速・柔軟）の選択が必要。

**回答**: **ExtrudeGeometry** — 断面形状を中心線に沿って押し出す方式。シンプルで実装しやすい。

**信頼性への影響**:
- DuctRenderer, PipeRendererの実装方針が確定（🔵）
- ExtrudeGeometryのextrudePathオプションで中心線ルーティング
- 矩形断面: Shape.moveTo/lineTo、円形断面: Shape.arc

---

## ヒアリング結果サマリー

### 確認できた事項
- リポジトリ: 同一モノレポ（web-bim-editor）内に `@kuhl/*` を追加
- 共通基盤: `@kuhl/core` にフォーク・コピーして完全独立
- 並存方針: `@pascal-app/*` は残存、`@kuhl/*` と並存
- IFC処理: メインスレッドで処理（Worker化は将来）
- ダクト描画: ExtrudeGeometryで断面押し出し

### 設計方針の決定事項
- `@kuhl/core`, `@kuhl/viewer` は `@pascal-app/*` に依存しない
- 共有UIコンポーネント（@repo/ui）のみ共用
- BaseNode, useScene, event bus, sceneRegistryを空調用にカスタマイズ
- ダクト/配管はExtrudeGeometryベースのレンダリング

### 残課題
- Supabase Edge FunctionsでのIfcOpenShell実行可否（技術検証）
- LOD200プロシージャル生成の具体的な形状仕様
- N-BOM連携のAPI仕様（MVPスコープ外だがスキーマ準備必要）
- マルチテナント対応の時期と方式

### 信頼性レベル分布

**ヒアリング前**:
- 🔵 青信号: 35件
- 🟡 黄信号: 10件
- 🔴 赤信号: 3件

**ヒアリング後**:
- 🔵 青信号: 42件 (+7)
- 🟡 黄信号: 6件 (-4)
- 🔴 赤信号: 0件 (-3)

---

## 関連文書

- **アーキテクチャ設計**: [architecture.md](architecture.md)
- **データフロー**: [dataflow.md](dataflow.md)
- **型定義**: [interfaces.ts](interfaces.ts)
- **DBスキーマ**: [database-schema.sql](database-schema.sql)
- **API仕様**: [api-endpoints.md](api-endpoints.md)
- **要件定義**: [requirements.md](../../spec/kuhl-hvac-editor/requirements.md)
- **要件ヒアリング記録**: [interview-record.md](../../spec/kuhl-hvac-editor/interview-record.md)
