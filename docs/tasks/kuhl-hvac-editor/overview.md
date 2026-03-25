# Kühl HVAC Editor タスク概要

**作成日**: 2026-03-24
**プロジェクト期間**: 32日（4フェーズ、Phase 2/3 並行開発で実効約24日）
**推定工数**: 256時間
**総タスク数**: 32件

## 関連文書

- **要件定義書**: [📋 requirements.md](../spec/kuhl-hvac-editor/requirements.md)
- **設計文書**: [📐 architecture.md](../design/kuhl-hvac-editor/architecture.md)
- **API仕様**: [🔌 api-endpoints.md](../design/kuhl-hvac-editor/api-endpoints.md)
- **データベース設計**: [🗄️ database-schema.sql](../design/kuhl-hvac-editor/database-schema.sql)
- **インターフェース定義**: [📝 interfaces.ts](../design/kuhl-hvac-editor/interfaces.ts)
- **データフロー図**: [🔄 dataflow.md](../design/kuhl-hvac-editor/dataflow.md)
- **コンテキストノート**: [📝 note.md](../spec/kuhl-hvac-editor/note.md)

## フェーズ構成

| フェーズ | 期間 | 成果物 | タスク数 | 工数 | ファイル |
|---------|------|--------|----------|------|----------|
| Phase 1 | 12日 | パッケージ基盤・全スキーマ・ストア・Viewer基盤 | 12件 | 96h | [TASK-0001~0012](#phase-1-基盤構築) |
| Phase 2 | 8日 | ゾーン描画・負荷計算・IFC読込・フェーズ切替 | 8件 | 64h | [TASK-0013~0020](#phase-2-ゾーニング負荷概算) |
| Phase 3 | 8日 | 機器レンダラー・配置ツール・諸元パネル・系統 | 8件 | 64h | [TASK-0021~0028](#phase-3-機器配置) |
| Phase 4 | 4日 | DB・永続化・認証・統合テスト | 4件 | 32h | [TASK-0029~0032](#phase-4-統合品質) |

**備考**: Phase 2 と Phase 3 は基盤完了後に並行開発可能（ユーザー選択）

## タスク番号管理

**使用済みタスク番号**: TASK-0001 ~ TASK-0032
**次回開始番号**: TASK-0033

## 全体進捗

- [x] Phase 1: 基盤構築
- [x] Phase 2: ゾーニング＋負荷概算
- [ ] Phase 3: 機器配置
- [ ] Phase 4: 統合・品質

## マイルストーン

- **M1: 基盤完成**: 全パッケージ・スキーマ・ストア・Viewer基盤が動作
- **M2: ゾーニング完成**: ゾーン描画・負荷計算・IFC読込が動作
- **M3: 機器配置完成**: 機器配置・諸元表・系統管理が動作
- **M4: MVP完成**: 全機能統合・永続化・認証・品質確認完了

---

## Phase 1: 基盤構築

**期間**: 12日
**目標**: @kuhl/core, @kuhl/viewer, apps/kuhl-editor の基盤を構築
**成果物**: パッケージ構成、全24ノードスキーマ、3ストア、イベントバス、Viewer基盤

### タスク一覧

- [x] [TASK-0001: モノレポ設定・@kuhl/core パッケージ初期化](TASK-0001.md) - 8h (DIRECT) 🔵
- [x] [TASK-0002: @kuhl/viewer パッケージ初期化・apps/kuhl-editor セットアップ](TASK-0002.md) - 8h (DIRECT) 🔵
- [x] [TASK-0003: BaseNode・共通スキーマフォーク](TASK-0003.md) - 8h (TDD) 🔵
- [x] [TASK-0004: 空間ノードスキーマ（Plant, Building, Level）](TASK-0004.md) - 8h (TDD) 🔵
- [x] [TASK-0005: HvacZoneNodeスキーマ](TASK-0005.md) - 8h (TDD) 🔵
- [x] [TASK-0006: HvacEquipmentBase・PortDef・共通機器型](TASK-0006.md) - 8h (TDD) 🔵
- [x] [TASK-0007: 空調機器ノードスキーマ（全13種）](TASK-0007.md) - 8h (TDD) 🔵
- [x] [TASK-0008: ダクト・配管・System・ArchitectureRef・AnyNodeユニオン](TASK-0008.md) - 8h (TDD) 🔵
- [x] [TASK-0009: useSceneストアフォーク・CRUD・Zundo](TASK-0009.md) - 8h (TDD) 🔵
- [x] [TASK-0010: イベントバス・sceneRegistryフォーク](TASK-0010.md) - 8h (TDD) 🔵
- [x] [TASK-0011: useViewerストア・useEditorストア](TASK-0011.md) - 8h (TDD) 🔵
- [x] [TASK-0012: Viewer基盤コンポーネント・Canvas・Grid](TASK-0012.md) - 8h (TDD) 🔵

### 依存関係

```
TASK-0001 → TASK-0002, TASK-0003
TASK-0003 → TASK-0004, TASK-0005, TASK-0006
TASK-0006 → TASK-0007
TASK-0004 + TASK-0005 + TASK-0007 → TASK-0008
TASK-0008 → TASK-0009
TASK-0002 + TASK-0008 → TASK-0010, TASK-0011
TASK-0010 + TASK-0011 → TASK-0012
```

---

## Phase 2: ゾーニング＋負荷概算

**期間**: 8日
**目標**: ゾーン描画・負荷計算・IFC読込・フェーズ切替を実装
**成果物**: ゾーンレンダラー、描画ツール、負荷計算エンジン、IFC読込、パネルUI

### タスク一覧

- [x] [TASK-0013: HvacZoneRenderer（半透明床面ポリゴン）](TASK-0013.md) - 8h (TDD) 🔵
- [x] [TASK-0014: ZoneDrawTool（ポリゴン描画ツール）](TASK-0014.md) - 8h (TDD) 🔵
- [x] [TASK-0015: LoadCalcSystem（m²単価法負荷概算）](TASK-0015.md) - 8h (TDD) 🔵
- [x] [TASK-0016: IFC読込（web-ifc WASM）+ ArchitectureRefRenderer](TASK-0016.md) - 8h (TDD) 🟡
- [x] [TASK-0017: IFC読込UI・ファイルアップロード](TASK-0017.md) - 8h (TDD) 🔵
- [x] [TASK-0018: ゾーン一覧パネル・負荷集計表示](TASK-0018.md) - 8h (TDD) 🔵
- [x] [TASK-0019: ToolManager・フェーズ切替バー](TASK-0019.md) - 8h (TDD) 🔵
- [x] [TASK-0020: LevelVisibilitySystem・InteractiveSystem](TASK-0020.md) - 8h (TDD) 🔵

### 依存関係

```
TASK-0005 + TASK-0010 + TASK-0012 → TASK-0013
TASK-0005 + TASK-0009 + TASK-0013 → TASK-0014
TASK-0005 + TASK-0009 → TASK-0015
TASK-0008 + TASK-0012 → TASK-0016
TASK-0016 → TASK-0017
TASK-0014 + TASK-0015 → TASK-0018
TASK-0011 → TASK-0019
TASK-0010 + TASK-0012 → TASK-0020
```

---

## Phase 3: 機器配置

**期間**: 8日（Phase 2と並行開発可能）
**目標**: 機器レンダラー・配置ツール・諸元表・系統管理を実装
**成果物**: EquipmentRenderer、配置ツール群、SpecSheetPanel、SystemTreePanel

### タスク一覧

- [x] [TASK-0021: EquipmentRenderer（LOD100 ボックス表示）](TASK-0021.md) - 8h (TDD) 🔵
- [ ] [TASK-0022: EquipmentRenderer（LOD200 プロシージャル・GLB）](TASK-0022.md) - 8h (TDD) 🟡
- [ ] [TASK-0023: DiffuserRenderer](TASK-0023.md) - 8h (TDD) 🔵
- [ ] [TASK-0024: EquipmentSystem（ポート位置計算）](TASK-0024.md) - 8h (TDD) 🔵
- [ ] [TASK-0025: AhuPlaceTool・PacPlaceTool](TASK-0025.md) - 8h (TDD) 🔵
- [ ] [TASK-0026: DiffuserPlaceTool・FanPlaceTool](TASK-0026.md) - 8h (TDD) 🔵
- [ ] [TASK-0027: 諸元表パネル（SpecSheetPanel）](TASK-0027.md) - 8h (TDD) 🔵
- [ ] [TASK-0028: 負荷→機器容量マッチング・系統ツリーパネル](TASK-0028.md) - 8h (TDD) 🔵

### 依存関係

```
TASK-0006 + TASK-0010 + TASK-0012 → TASK-0021
TASK-0021 → TASK-0022, TASK-0023
TASK-0006 + TASK-0009 → TASK-0024
TASK-0019 + TASK-0024 → TASK-0025
TASK-0019 + TASK-0023 → TASK-0026
TASK-0021 + TASK-0025 → TASK-0027
TASK-0015 + TASK-0025 + TASK-0027 → TASK-0028
```

---

## Phase 4: 統合・品質

**期間**: 4日
**目標**: DB設定・永続化・認証・統合テストでMVP品質を確保
**成果物**: DB/RLS、プロジェクトCRUD、認証、統合テスト

### タスク一覧

- [ ] [TASK-0029: DB設定・Drizzleスキーマ・マイグレーション](TASK-0029.md) - 8h (DIRECT) 🔵
- [ ] [TASK-0030: プロジェクトCRUD・シーン永続化](TASK-0030.md) - 8h (TDD) 🔵
- [ ] [TASK-0031: 認証統合・ページ保護](TASK-0031.md) - 8h (DIRECT) 🔵
- [ ] [TASK-0032: 統合テスト・MVP品質確認](TASK-0032.md) - 8h (TDD) 🟡

### 依存関係

```
TASK-0002 → TASK-0029, TASK-0031
TASK-0029 + TASK-0009 → TASK-0030
TASK-0028 + TASK-0030 + TASK-0031 → TASK-0032
```

---

## 信頼性レベルサマリー

### 全タスク統計

- **総タスク数**: 32件
- 🔵 **青信号**: 28件 (88%)
- 🟡 **黄信号**: 4件 (12%)
- 🔴 **赤信号**: 0件 (0%)

### フェーズ別信頼性

| フェーズ | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|---------|-------|-------|-------|------|
| Phase 1 | 12 | 0 | 0 | 12 |
| Phase 2 | 7 | 1 | 0 | 8 |
| Phase 3 | 6 | 2 | 0 | 8 |
| Phase 4 | 3 | 1 | 0 | 4 |

**品質評価**: 高品質 — 88%が設計文書・ヒアリングに裏付け。黄信号はIFC統合(web-ifc)、LOD200プロシージャル生成、統合テスト範囲。

## クリティカルパス

```
TASK-0001 → TASK-0003 → TASK-0008 → TASK-0009 → TASK-0014 → TASK-0015 → TASK-0028 → TASK-0032
```

**クリティカルパス工数**: 64時間（8タスク × 8時間）
**並行作業可能工数**: 192時間

## タスクタイプ分布

| タイプ | 件数 | 工数 |
|-------|------|------|
| TDD | 27件 | 216h |
| DIRECT | 5件 | 40h |

## ヒアリング結果サマリー

| 項目 | 回答 |
|------|------|
| タスク粒度 | 1日（8時間）単位 |
| 優先順位 | 並行開発（基盤後、ゾーン/機器並行） |
| テストカバレッジ | 60%以上 |
| スコープ | MVPのみ（Phase 0-2） |
| UI | デスクトップのみ |
| アーキテクチャ | 新規@kuhl/*パッケージとして並存 |

## 次のステップ

タスクを実装するには:
- 全タスク順番に実装: `/tsumiki:kairo-implement`
- 特定タスクを実装: `/tsumiki:kairo-implement TASK-0001`
