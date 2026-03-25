# TASK-0030: プロジェクトCRUD・シーン永続化 - 要件定義

## 機能要件

### REQ-030-001: プロジェクトCRUD操作
- プロジェクト一覧を取得できる（ownerId でフィルタ）
- プロジェクトを新規作成できる（name, description）
- プロジェクト名を更新できる
- プロジェクトを削除できる（CASCADE でシーン・ファイルも削除）

### REQ-030-002: シーン永続化
- useScene.nodes をJSONBとしてSupabase kuhl_scenes テーブルに保存できる
- kuhl_scenes から読み込んで useScene に復元できる
- バージョン番号が保存ごとにインクリメントされる
- root_node_ids と collections も保存・復元される

### REQ-030-003: 自動保存
- useScene の変更を検知し、debounce 5秒後に自動保存する
- 保存中は二重保存しない
- エラー時はリトライする

### REQ-030-004: IndexedDBキャッシュ
- シーンデータをIndexedDBにローカルキャッシュする
- 起動時にIndexedDBからuseSceneを復元する
- Supabase同期後にIndexedDBを更新する
- オフライン時のリカバリに使用する

## 実装ファイル

- `apps/kuhl-editor/lib/scene-persistence.ts` - シーン保存・読込ロジック
- `apps/kuhl-editor/lib/indexeddb-cache.ts` - IndexedDBキャッシュ
- `apps/kuhl-editor/lib/project-actions.ts` - プロジェクトCRUD
- `apps/kuhl-editor/__tests__/lib/scene-persistence.test.ts`
- `apps/kuhl-editor/__tests__/lib/indexeddb-cache.test.ts`
- `apps/kuhl-editor/__tests__/lib/project-actions.test.ts`
