# 技術スタック定義 — Pascal Editor V2

## プロジェクト概要

Pascal Editor V2 — React Three Fiber と WebGPU による3D建築エディタ。Turborepo モノレポ、Bun で管理。

## アーキテクチャ

### モノレポ構成

```
apps/editor          → Next.js 16 アプリケーション（エディタUI）
packages/core        → スキーマ、状態管理、システム、空間ロジック（純粋ロジック）
packages/viewer      → 3Dキャンバス、レンダラー、ビューアシステム
packages/editor      → エディタUIコンポーネントパッケージ
packages/ui          → 共有UIコンポーネント (@repo/ui)
```

### パッケージ依存関係

```
apps/editor
  ├── @pascal-app/core
  ├── @pascal-app/viewer → @pascal-app/core (peer)
  ├── @pascal-app/editor
  └── @repo/ui
```

## フロントエンド

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| 3Dエンジン | Three.js (WebGPU) | — |
| 3Dフレームワーク | React Three Fiber + Drei | — |
| フレームワーク | Next.js | 16 |
| UIライブラリ | React | 19 |
| 状態管理 | Zustand | 5 |
| Undo/Redo | Zundo | — |
| バリデーション | Zod | 4 |
| UIコンポーネント | Radix UI | — |
| スタイリング | Tailwind CSS | 4 |

## バックエンド

| カテゴリ | 技術 |
|---------|------|
| データベース | Supabase PostgreSQL |
| ORM | Drizzle ORM |
| 認証 | better-auth |

## 開発ツール

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| 言語 | TypeScript | 5.9 |
| パッケージマネージャー | Bun | — |
| モノレポ管理 | Turborepo | — |
| リンター/フォーマッター | Biome | — |

## 状態管理アーキテクチャ

| ストア | パッケージ | 用途 |
|--------|-----------|------|
| `useScene` | `@pascal-app/core` | シーンデータ: フラットノード辞書、CRUD、ダーティ追跡。IndexedDB永続化、Zundoによるundo/redo |
| `useViewer` | `@pascal-app/viewer` | プレゼンテーション状態: 選択パス、カメラ/レベル/壁モード、テーマ、表示トグル |
| `useEditor` | `apps/editor` | エディタ状態: アクティブツール、フェーズ、モード |

## データフロー

```
ユーザー入力 → Tool (apps/editor/components/tools/)
  → useScene mutations (createNode/updateNode/deleteNode)
  → Node marked dirty
  → Core systems recompute geometry (useFrame)
  → Renderers re-render THREE meshes
  → useViewer updates selection/hover
```

## Three.js レイヤー

| レイヤー | 定数 | 用途 |
|---------|------|------|
| 0 | `SCENE_LAYER` | 通常ジオメトリ |
| 1 | `EDITOR_LAYER` | エディタヘルパー |
| 2 | `ZONE_LAYER` | ゾーンオーバーレイ（ポストプロセッシング） |

## デプロイ

| カテゴリ | 技術 |
|---------|------|
| ホスティング | Vercel |
| データベース | Supabase |

## コマンド一覧

```bash
bun install          # 依存関係インストール
bun dev              # パッケージビルド + Next.js dev サーバー起動 (port 3002)
bun build            # 全パッケージビルド (Turbo)
bun lint             # Biome lint
bun lint:fix         # Biome lint + 自動修正
bun format           # Biome format
bun check-types      # TypeScript 型チェック (Turbo)
```

## 品質基準

- **型安全性**: TypeScript strict mode
- **リンティング**: Biome（ESLint/Prettier の代替）
- **バリデーション**: Zod スキーマによるランタイム型検証
- **ノード作成**: 必ず `.parse()` を使用（raw オブジェクト構築禁止）
