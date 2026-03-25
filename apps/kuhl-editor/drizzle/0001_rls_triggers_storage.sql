-- ========================================
-- RLS ポリシー
-- ========================================

-- kuhl_projects RLS
ALTER TABLE kuhl_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
    ON kuhl_projects FOR SELECT
    USING (auth.uid()::text = owner_id);

CREATE POLICY "Users can create own projects"
    ON kuhl_projects FOR INSERT
    WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Users can update own projects"
    ON kuhl_projects FOR UPDATE
    USING (auth.uid()::text = owner_id);

CREATE POLICY "Users can delete own projects"
    ON kuhl_projects FOR DELETE
    USING (auth.uid()::text = owner_id);

-- kuhl_scenes RLS
ALTER TABLE kuhl_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own project scenes"
    ON kuhl_scenes FOR ALL
    USING (
        project_id IN (
            SELECT id FROM kuhl_projects WHERE owner_id = auth.uid()::text
        )
    );

-- kuhl_ifc_files RLS
ALTER TABLE kuhl_ifc_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own project IFC files"
    ON kuhl_ifc_files FOR ALL
    USING (
        project_id IN (
            SELECT id FROM kuhl_projects WHERE owner_id = auth.uid()::text
        )
    );

-- kuhl_takeoff_exports RLS
ALTER TABLE kuhl_takeoff_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own project exports"
    ON kuhl_takeoff_exports FOR ALL
    USING (
        project_id IN (
            SELECT id FROM kuhl_projects WHERE owner_id = auth.uid()::text
        )
    );

-- kuhl_ifc_export_jobs RLS
ALTER TABLE kuhl_ifc_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own project IFC exports"
    ON kuhl_ifc_export_jobs FOR ALL
    USING (
        project_id IN (
            SELECT id FROM kuhl_projects WHERE owner_id = auth.uid()::text
        )
    );

-- ========================================
-- updated_at 自動更新トリガー
-- ========================================

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

-- IFCファイルアップロード用バケット (100MB上限)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('kuhl-ifc-files', 'kuhl-ifc-files', false, 104857600)
ON CONFLICT (id) DO NOTHING;

-- 積算出力・IFC出力ファイル保存用バケット
INSERT INTO storage.buckets (id, name, public)
VALUES ('kuhl-exports', 'kuhl-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS ポリシー: authenticated ユーザーのみ
CREATE POLICY "Authenticated users can upload IFC files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'kuhl-ifc-files'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can read IFC files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'kuhl-ifc-files'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can upload exports"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'kuhl-exports'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can read exports"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'kuhl-exports'
        AND auth.role() = 'authenticated'
    );
