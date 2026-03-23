# Kühl HVAC Editor コンテキストノート

**作成日**: 2026-03-23

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| 3D | Three.js (WebGPU), React Three Fiber, Drei |
| フレームワーク | Next.js 16, React 19 |
| 状態管理 | Zustand 5 + Zundo |
| バリデーション | Zod 4 |
| UI | Radix UI, Tailwind CSS 4 |
| DB | Supabase PostgreSQL + Drizzle ORM |
| 認証 | better-auth |
| ツール | Biome, TypeScript 5.9, Turborepo, Bun |
| デプロイ | Vercel |

## 既存プロジェクト構造

```
apps/editor          → Next.js 16 アプリケーション
packages/core        → スキーマ、状態管理、システム（純粋ロジック）
packages/viewer      → 3Dキャンバス、レンダラー
packages/editor      → エディタUIコンポーネント
packages/ui          → 共有UIコンポーネント
```

## 既存ノードタイプ（建築系）

- 空間: Site, Building, Level
- 構造: Wall, Slab, Ceiling, Roof, RoofSegment
- 開口: Door, Window
- その他: Item, Zone, Guide, Scan

## 既存システム（8件）

- wall-system, wall-mitering, slab-system, ceiling-system
- roof-system, door-system, window-system, item-system

## 既存フェーズ・ツール

- Phase: `site` | `structure` | `furnish`
- Mode: `select` | `edit` | `delete` | `build`
- StructureTool: wall, room, custom-room, slab, ceiling, roof, column, stair, item, zone, window, door

## 3ストアアーキテクチャ

| ストア | パッケージ | 用途 |
|--------|-----------|------|
| useScene | @pascal-app/core | フラットノード辞書、CRUD、ダーティ追跡、undo/redo |
| useViewer | @pascal-app/viewer | 選択パス、カメラ、テーマ、表示トグル |
| useEditor | apps/editor | アクティブツール、フェーズ、モード |

## 開発ルール

- Viewer Isolation: `@pascal-app/viewer` は `apps/editor` からインポート禁止
- ノード作成は必ず `.parse()` 使用
- System は `useFrame` 内で実行、`null` を返す React コンポーネント
- Renderer は Three.js オブジェクト生成、`useRegistry` 登録、`useNodeEvents` でイベント発火
- Tool は `useScene` のみ変更、直接 Three.js API 呼び出し禁止

## Kühl 開発で追加予定

### 新規ノードタイプ（空調系）
- 空間: Plant, HvacZone, ArchitectureRef
- 機器: AHU, PAC, FCU, VrfOutdoor, VrfIndoor, Diffuser, Damper, Fan, Pump, Chiller, Boiler, CoolingTower
- ダクト: DuctSegment, DuctFitting
- 配管: PipeSegment, PipeFitting, Valve
- その他: System(系統), Support

### 新規システム
- zone/load-calc-system（空調負荷概算）
- equipment/equipment-system, ahu-selection, pac-selection, pump-selection
- duct/duct-system, duct-sizing, duct-pressure-loss
- pipe/pipe-system, pipe-sizing, pipe-pressure-loss
- takeoff/quantity-takeoff, cost-export
- ifc/ifc-import, ifc-export

### 新規フェーズ・ツール
- Phase: `zone` | `equip` | `route` | `calc` | `takeoff`
- ツール: zone_draw, zone_edit, load_calc, ahu_place, pac_place, diffuser_place, fan_place, duct_route, pipe_route, auto_route, pressure_loss, system_balance, clash_check, takeoff_run, cost_export

### 外部連携
- IFC読込（web-ifc WASM）→ 建築躯体表示
- IFC出力（IfcOpenShell サーバーサイド）→ Rebro/Revit連携
- 積算出力（CSV/Excel/Rebro形式）
- N-BOM連携（機器マスター参照）

## 注意事項

- 既存の建築エディタ（Pascal Editor）をフォーク・拡張する形
- 既存建築ノードは削除し、空調専用に再構成
- ArchitectureRefNode で建築IFCを表示のみ参照
- 基本設計フェーズに特化（施工図レベルの詳細は対象外）
