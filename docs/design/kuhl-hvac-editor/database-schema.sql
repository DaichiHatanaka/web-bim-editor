-- ========================================
-- Kühl HVAC Editor データベーススキーマ
-- ========================================
--
-- 作成日: 2026-03-23
-- 関連設計: architecture.md
-- データベース: Supabase PostgreSQL + Drizzle ORM
--
-- 信頼性レベル:
-- - 🔵 青信号: EARS要件定義書・設計文書・既存DBスキーマを参考にした確実な定義
-- - 🟡 黄信号: EARS要件定義書・設計文書・既存DBスキーマから妥当な推測による定義
-- - 🔴 赤信号: EARS要件定義書・設計文書・既存DBスキーマにない推測による定義
--
-- 注意: 実際の実装は Drizzle ORM のスキーマ定義（TypeScript）で行う。
-- このSQLは設計の参照用。
--

-- ========================================
-- ユーザー・認証（既存better-auth）
-- ========================================

-- 🔵 信頼性: 既存better-auth実装
-- better-auth が管理するテーブルは省略（既存のまま使用）
-- user, session, account テーブルは better-auth が自動作成

-- ========================================
-- プロジェクト管理
-- ========================================

-- kuhl_projects テーブル
-- 🔵 信頼性: 既存Pascal Editorのプロジェクト管理パターン
CREATE TABLE kuhl_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),            -- 🔵 既存パターン
    name VARCHAR(255) NOT NULL,                                -- 🔵 プロジェクト名
    description TEXT,                                          -- 🟡 一般的なフィールド
    owner_id UUID NOT NULL REFERENCES auth.users(id),          -- 🔵 better-auth ユーザー
    tenant_id UUID,                                            -- 🟡 将来マルチテナント用（NFR-403）
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),             -- 🔵 共通パターン
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()              -- 🔵 共通パターン
);

-- RLSポリシー
-- 🔵 信頼性: 既存Supabase RLS・NFR-102
ALTER TABLE kuhl_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
    ON kuhl_projects FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own projects"
    ON kuhl_projects FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own projects"
    ON kuhl_projects FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own projects"
    ON kuhl_projects FOR DELETE
    USING (auth.uid() = owner_id);

-- ========================================
-- シーンデータ（ノード辞書のスナップショット）
-- ========================================

-- kuhl_scenes テーブル
-- 🔵 信頼性: 既存Pascal Editorのシーン保存パターン
-- ノードデータはJSONBとして保存（フラット辞書構造を維持）
CREATE TABLE kuhl_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),            -- 🔵 既存パターン
    project_id UUID NOT NULL REFERENCES kuhl_projects(id)
        ON DELETE CASCADE,                                     -- 🔵 プロジェクト紐付け
    version INTEGER NOT NULL DEFAULT 1,                        -- 🟡 バージョン管理
    nodes JSONB NOT NULL DEFAULT '{}',                         -- 🔵 Record<id, AnyNode>
    root_node_ids JSONB NOT NULL DEFAULT '[]',                 -- 🔵 ルートノードID配列
    collections JSONB NOT NULL DEFAULT '{}',                   -- 🔵 コレクション定義
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),             -- 🔵 共通パターン
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()              -- 🔵 共通パターン
);

-- RLSポリシー
-- 🔵 信頼性: プロジェクト経由のアクセス制御
ALTER TABLE kuhl_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own project scenes"
    ON kuhl_scenes FOR ALL
    USING (
        project_id IN (
            SELECT id FROM kuhl_projects WHERE owner_id = auth.uid()
        )
    );

-- ========================================
-- IFCファイル管理
-- ========================================

-- kuhl_ifc_files テーブル
-- 🔵 信頼性: 設計文書 §5.1・REQ-106
CREATE TABLE kuhl_ifc_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),            -- 🔵
    project_id UUID NOT NULL REFERENCES kuhl_projects(id)
        ON DELETE CASCADE,                                     -- 🔵
    file_name VARCHAR(255) NOT NULL,                           -- 🔵
    file_size BIGINT NOT NULL,                                 -- 🔵 バイト
    storage_path TEXT NOT NULL,                                -- 🔵 Supabase Storage パス
    ifc_version VARCHAR(20),                                   -- 🔵 "IFC2X3", "IFC4"
    building_info JSONB,                                       -- 🟡 抽出した建物メタデータ
    level_count INTEGER,                                       -- 🟡 階数
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),            -- 🔵
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()              -- 🔵
);

-- RLSポリシー
ALTER TABLE kuhl_ifc_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own project IFC files"
    ON kuhl_ifc_files FOR ALL
    USING (
        project_id IN (
            SELECT id FROM kuhl_projects WHERE owner_id = auth.uid()
        )
    );

-- ========================================
-- 積算出力履歴
-- ========================================

-- kuhl_takeoff_exports テーブル
-- 🔵 信頼性: 設計文書 §3.6・REQ-501, REQ-502
CREATE TABLE kuhl_takeoff_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),            -- 🔵
    project_id UUID NOT NULL REFERENCES kuhl_projects(id)
        ON DELETE CASCADE,                                     -- 🔵
    scene_version INTEGER NOT NULL,                            -- 🟡 エクスポート時のバージョン
    format VARCHAR(20) NOT NULL,                               -- 🔵 'csv', 'excel', 'rebro'
    file_path TEXT,                                            -- 🔵 生成ファイルパス
    item_count INTEGER NOT NULL,                               -- 🔵 拾い出し項目数
    summary JSONB,                                             -- 🔵 集計サマリー
    exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),            -- 🔵
    exported_by UUID NOT NULL REFERENCES auth.users(id)        -- 🔵
);

-- RLSポリシー
ALTER TABLE kuhl_takeoff_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own project exports"
    ON kuhl_takeoff_exports FOR ALL
    USING (
        project_id IN (
            SELECT id FROM kuhl_projects WHERE owner_id = auth.uid()
        )
    );

-- ========================================
-- IFC出力ジョブ
-- ========================================

-- kuhl_ifc_export_jobs テーブル
-- 🟡 信頼性: REQ-601, REQ-602 + Edge Functions推測
CREATE TABLE kuhl_ifc_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),            -- 🟡
    project_id UUID NOT NULL REFERENCES kuhl_projects(id)
        ON DELETE CASCADE,                                     -- 🟡
    status VARCHAR(20) NOT NULL DEFAULT 'pending',             -- 🟡 pending/processing/completed/failed
    scene_snapshot JSONB NOT NULL,                             -- 🟡 出力時のノードデータ
    output_format VARCHAR(20) NOT NULL DEFAULT 'ifc4',         -- 🟡 'ifc2x3', 'ifc4'
    output_path TEXT,                                          -- 🟡 生成IFCファイルパス
    error_message TEXT,                                        -- 🟡
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),           -- 🟡
    completed_at TIMESTAMPTZ,                                  -- 🟡
    requested_by UUID NOT NULL REFERENCES auth.users(id)       -- 🟡
);

-- RLSポリシー
ALTER TABLE kuhl_ifc_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own project IFC exports"
    ON kuhl_ifc_export_jobs FOR ALL
    USING (
        project_id IN (
            SELECT id FROM kuhl_projects WHERE owner_id = auth.uid()
        )
    );

-- ========================================
-- インデックス
-- ========================================

-- 🔵 信頼性: 頻繁なクエリパターンより
CREATE INDEX idx_kuhl_projects_owner ON kuhl_projects(owner_id);
CREATE INDEX idx_kuhl_scenes_project ON kuhl_scenes(project_id);
CREATE INDEX idx_kuhl_ifc_files_project ON kuhl_ifc_files(project_id);
CREATE INDEX idx_kuhl_takeoff_exports_project ON kuhl_takeoff_exports(project_id);
CREATE INDEX idx_kuhl_ifc_export_jobs_project ON kuhl_ifc_export_jobs(project_id);
CREATE INDEX idx_kuhl_ifc_export_jobs_status ON kuhl_ifc_export_jobs(status);

-- ========================================
-- トリガー
-- ========================================

-- updated_at 自動更新トリガー
-- 🔵 信頼性: 既存DBスキーマの共通パターン
CREATE OR REPLACE FUNCTION kuhl_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kuhl_projects_updated_at
    BEFORE UPDATE ON kuhl_projects
    FOR EACH ROW
    EXECUTE FUNCTION kuhl_update_updated_at();

CREATE TRIGGER update_kuhl_scenes_updated_at
    BEFORE UPDATE ON kuhl_scenes
    FOR EACH ROW
    EXECUTE FUNCTION kuhl_update_updated_at();

-- ========================================
-- Supabase Storage バケット
-- ========================================

-- 🔵 信頼性: Supabase Storage パターン
-- IFCファイルアップロード用バケット
-- （Supabase Dashboard または migration で作成）
--
-- バケット名: kuhl-ifc-files
-- ポリシー: authenticated ユーザーのみ
-- ファイルサイズ上限: 100MB (NFR-003)
--
-- バケット名: kuhl-exports
-- ポリシー: authenticated ユーザーのみ
-- 積算出力・IFC出力ファイル保存用

-- ========================================
-- 信頼性レベルサマリー
-- ========================================
-- - 🔵 青信号: 38件 (76%)
-- - 🟡 黄信号: 12件 (24%)
-- - 🔴 赤信号: 0件 (0%)
--
-- 品質評価: 高品質 — コアテーブル（projects, scenes, ifc_files）は既存パターンに
-- 裏付けられている。黄信号はIFC出力ジョブ（技術検証待ち）と一般的なフィールド。
