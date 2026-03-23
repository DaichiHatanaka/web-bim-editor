# Kühl HVAC Editor API エンドポイント仕様

**作成日**: 2026-03-23
**関連設計**: [architecture.md](architecture.md)
**関連要件定義**: [requirements.md](../../spec/kuhl-hvac-editor/requirements.md)

**【信頼性レベル凡例】**:
- 🔵 **青信号**: EARS要件定義書・設計文書・既存API仕様を参考にした確実な定義
- 🟡 **黄信号**: EARS要件定義書・設計文書・既存API仕様から妥当な推測による定義
- 🔴 **赤信号**: EARS要件定義書・設計文書・既存API仕様にない推測による定義

---

## 概要

Kühl HVAC Editorは基本的に**クライアントサイド中心**のアーキテクチャであり、シーンデータの大部分はブラウザ内のZustand + IndexedDBで管理される。サーバーAPIは以下の限定的な用途のみ:

1. **認証**: better-authが提供（既存）
2. **プロジェクト永続化**: Supabase PostgreSQL + Drizzle ORM
3. **IFCファイル管理**: Supabase Storage
4. **IFC出力**: Supabase Edge Functions
5. **積算エクスポート**: クライアントサイド生成（サーバー不要）

**重要**: 空調負荷計算、ダクト寸法選定、圧損計算、数量拾い出し等の計算エンジンはすべて**クライアントサイド**（`@kuhl/core` のuseFrame内）で実行。APIは不要。

---

## 共通仕様

### ベースURL 🔵

**信頼性**: 🔵 *既存Supabase構成*

```
# Supabase REST API
{SUPABASE_URL}/rest/v1

# Supabase Edge Functions
{SUPABASE_URL}/functions/v1
```

### 認証 🔵

**信頼性**: 🔵 *既存better-auth + Supabase*

すべてのエンドポイントは認証が必要。better-authのセッション + Supabase JWT。

```http
Authorization: Bearer {supabase_jwt_token}
```

---

## エンドポイント一覧

### 認証（既存better-auth） 🔵

**信頼性**: 🔵 *既存実装・REQ-011*

better-authが提供するエンドポイントをそのまま使用。Kühl固有の認証APIは不要。

- `POST /api/auth/sign-in` — ログイン
- `POST /api/auth/sign-up` — ユーザー登録
- `POST /api/auth/sign-out` — ログアウト
- `GET /api/auth/session` — セッション確認

---

### プロジェクト管理 🔵

**信頼性**: 🔵 *既存プロジェクト管理パターン*

Supabase REST API（PostgREST）経由でCRUD。Drizzle ORMでクライアント側から直接操作。

#### GET /rest/v1/kuhl_projects 🔵

**説明**: プロジェクト一覧取得（RLSでユーザーの所有プロジェクトのみ）

**レスポンス例**:
```json
[
  {
    "id": "uuid-1",
    "name": "渋谷ビル 空調設計",
    "description": "B1F-10F 空調基本設計",
    "owner_id": "user-uuid",
    "created_at": "2026-03-23T10:00:00Z",
    "updated_at": "2026-03-23T12:00:00Z"
  }
]
```

#### POST /rest/v1/kuhl_projects 🔵

**説明**: プロジェクト作成

**リクエスト**:
```json
{
  "name": "渋谷ビル 空調設計",
  "description": "B1F-10F 空調基本設計"
}
```

#### PATCH /rest/v1/kuhl_projects?id=eq.{id} 🔵

**説明**: プロジェクト更新

#### DELETE /rest/v1/kuhl_projects?id=eq.{id} 🔵

**説明**: プロジェクト削除（CASCADE: 関連シーン・ファイルも削除）

---

### シーンデータ永続化 🔵

**信頼性**: 🔵 *既存シーン保存パターン*

#### GET /rest/v1/kuhl_scenes?project_id=eq.{id} 🔵

**説明**: プロジェクトのシーンデータ取得

**レスポンス例**:
```json
[
  {
    "id": "scene-uuid",
    "project_id": "project-uuid",
    "version": 5,
    "nodes": {
      "plant_abc123": { "type": "plant", "plantName": "渋谷ビル", ... },
      "zone_def456": { "type": "hvac_zone", "zoneName": "事務室A", ... },
      "ahu_ghi789": { "type": "ahu", "tag": "AHU-101", ... }
    },
    "root_node_ids": ["plant_abc123"],
    "collections": {},
    "updated_at": "2026-03-23T12:00:00Z"
  }
]
```

#### POST /rest/v1/kuhl_scenes 🔵

**説明**: シーンデータ保存（新規）

#### PATCH /rest/v1/kuhl_scenes?id=eq.{id} 🔵

**説明**: シーンデータ更新（ノード辞書全体をJSONBで保存）

---

### IFCファイル管理 🔵

**信頼性**: 🔵 *設計文書 §5.1・REQ-106, REQ-107*

#### POST /storage/v1/object/kuhl-ifc-files/{path} 🔵

**説明**: IFCファイルアップロード（Supabase Storage）

**制約**:
- ファイルサイズ上限: 100MB（NFR-003）
- 対応形式: IFC 2x3, IFC 4

#### GET /storage/v1/object/kuhl-ifc-files/{path} 🔵

**説明**: IFCファイルダウンロード

#### POST /rest/v1/kuhl_ifc_files 🔵

**説明**: IFCファイルメタデータ登録

**リクエスト**:
```json
{
  "project_id": "project-uuid",
  "file_name": "building.ifc",
  "file_size": 52428800,
  "storage_path": "kuhl-ifc-files/project-uuid/building.ifc",
  "ifc_version": "IFC4",
  "building_info": { "stories": 10 },
  "level_count": 10
}
```

---

### IFC出力（Edge Functions） 🟡

**信頼性**: 🟡 *REQ-601, REQ-602 + 技術検証待ち*

#### POST /functions/v1/kuhl-ifc-export 🟡

**説明**: 空調設備データをIFC形式に変換して出力

**備考**: Supabase Edge FunctionsでIfcOpenShellが実行可能かは技術検証が必要。不可能な場合は代替アーキテクチャ（専用Pythonサーバー等）に変更。

**リクエスト**:
```json
{
  "project_id": "project-uuid",
  "scene_snapshot": { /* ノード辞書 */ },
  "output_format": "ifc4",
  "options": {
    "rebro_optimized": true,
    "include_sync_ids": true
  }
}
```

**レスポンス（成功）**:
```json
{
  "job_id": "job-uuid",
  "status": "processing"
}
```

#### GET /functions/v1/kuhl-ifc-export-status?job_id={id} 🟡

**説明**: IFC出力ジョブのステータス確認

**レスポンス**:
```json
{
  "job_id": "job-uuid",
  "status": "completed",
  "output_path": "kuhl-exports/project-uuid/export-2026-03-23.ifc",
  "download_url": "https://..."
}
```

---

### 積算エクスポート 🔵

**信頼性**: 🔵 *設計文書 §3.6・REQ-502*

**重要**: 積算エクスポート（CSV/Excel/Rebro形式）は**クライアントサイドで完結**。サーバーAPIは不要。

- **CSV**: ブラウザで生成→ダウンロード
- **Excel**: SheetJS等でブラウザ内生成→ダウンロード
- **Rebro形式**: フォーマット仕様に基づきブラウザ内生成→ダウンロード

エクスポート履歴のみDBに記録:

#### POST /rest/v1/kuhl_takeoff_exports 🔵

**説明**: エクスポート履歴の記録

**リクエスト**:
```json
{
  "project_id": "project-uuid",
  "scene_version": 5,
  "format": "excel",
  "item_count": 250,
  "summary": {
    "duct_area_m2": 450.5,
    "pipe_length_m": 320.0,
    "equipment_count": 45
  }
}
```

---

## CORS設定 🔵

**信頼性**: 🔵 *Supabase標準設定*

Supabaseの標準CORS設定を使用。Vercelドメインからのアクセスを許可。

## レート制限 🟡

**信頼性**: 🟡 *Supabaseデフォルト設定から推測*

Supabaseのデフォルトレート制限を使用:
- REST API: 1000リクエスト/秒（プロジェクト全体）
- Edge Functions: 500リクエスト/秒
- Storage: 100アップロード/秒

社内ツールのため、通常運用では制限に達しない想定。

---

## 関連文書

- **アーキテクチャ**: [architecture.md](architecture.md)
- **型定義**: [interfaces.ts](interfaces.ts)
- **DBスキーマ**: [database-schema.sql](database-schema.sql)
- **データフロー**: [dataflow.md](dataflow.md)
- **要件定義**: [requirements.md](../../spec/kuhl-hvac-editor/requirements.md)

## 信頼性レベルサマリー

- 🔵 青信号: 18件 (82%)
- 🟡 黄信号: 4件 (18%)
- 🔴 赤信号: 0件 (0%)

**品質評価**: 高品質 — クライアントサイド中心アーキテクチャのため、APIは限定的。サーバーサイドで不確定なのはIFC出力（Edge Functions）のみ。
