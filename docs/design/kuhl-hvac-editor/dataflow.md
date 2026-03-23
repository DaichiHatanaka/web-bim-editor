# Kühl HVAC Editor データフロー図

**作成日**: 2026-03-23
**関連アーキテクチャ**: [architecture.md](architecture.md)
**関連要件定義**: [requirements.md](../../spec/kuhl-hvac-editor/requirements.md)

**【信頼性レベル凡例】**:
- 🔵 **青信号**: EARS要件定義書・設計文書・ユーザヒアリングを参考にした確実なフロー
- 🟡 **黄信号**: EARS要件定義書・設計文書・ユーザヒアリングから妥当な推測によるフロー
- 🔴 **赤信号**: EARS要件定義書・設計文書・ユーザヒアリングにない推測によるフロー

---

## システム全体のデータフロー 🔵

**信頼性**: 🔵 *既存Pascal Editorデータフロー・CLAUDE.md*

```mermaid
flowchart TD
    User["ユーザー操作"] --> Tool["Tool<br/>(apps/kuhl-editor/components/tools/)"]
    Tool --> |"createNode/updateNode/deleteNode"| Scene["useScene<br/>(@kuhl/core)"]
    Scene --> |"dirtyNodes"| System["Core Systems<br/>(@kuhl/core/systems/)"]
    System --> |"geometry recompute"| Registry["sceneRegistry<br/>(@kuhl/core)"]
    Registry --> Renderer["Renderers<br/>(@kuhl/viewer/renderers/)"]
    Renderer --> |"THREE meshes"| Viewport["3D Viewport"]
    Viewport --> |"events"| EventBus["Event Bus<br/>(mitt)"]
    EventBus --> Tool

    Scene --> |"persist"| IndexedDB["IndexedDB"]
    Scene --> |"sync"| Supabase["Supabase PostgreSQL"]

    Viewer["useViewer<br/>(@kuhl/viewer)"] --> |"selection/hover"| Viewport
    Editor["useEditor<br/>(apps/kuhl-editor)"] --> |"phase/mode/tool"| Tool
```

### コアデータフローサイクル 🔵

**信頼性**: 🔵 *CLAUDE.md Data Flow セクション*

```
ユーザー入力 → Tool (apps/kuhl-editor/components/tools/)
  → useScene mutations (createNode/updateNode/deleteNode)
  → Node marked dirty (dirtyNodes Set)
  → Core Systems recompute geometry (useFrame)
  → Renderers re-render THREE meshes
  → useViewer updates selection/hover
```

---

## 主要機能のデータフロー

### 機能1: IFC建築躯体の読込 🔵

**信頼性**: 🔵 *設計文書 §5.1・要件REQ-106, REQ-107*

**関連要件**: REQ-106, REQ-107, REQ-108

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant E as Editor UI
    participant W as web-ifc (WASM)
    participant S as useScene
    participant R as ArchitectureRefRenderer

    U->>E: IFCファイルアップロード
    E->>E: ファイルサイズチェック (≤100MB)
    E->>W: IfcAPI.OpenModel(buffer)
    W->>W: IFCパース (メインスレッド)
    W-->>E: geometry + metadata
    E->>E: 壁・床・梁・柱・天井を抽出
    E->>E: 階高・天井高を取得 (可能な場合)
    E->>S: createNode(ArchitectureRefNode)
    E->>S: updateNode(LevelNode, {floorHeight, ceilingHeight})
    S->>S: markDirty
    S-->>R: ArchitectureRefRenderer描画
    R-->>U: 3Dビューに建築躯体表示 (編集不可)
```

**詳細ステップ**:
1. ユーザーがIFCファイルをドラッグ&ドロップまたはファイル選択でアップロード
2. ファイルサイズを検証（100MB以下）
3. web-ifc WASMでブラウザ内パース（メインスレッド）
4. IfcWall, IfcSlab, IfcBeam, IfcColumn, IfcCovering のジオメトリを抽出
5. IfcBuildingStorey から階高・天井高を取得（REQ-108、条件付き）
6. ArchitectureRefNodeを作成（表示のみ、編集不可）
7. Level情報を更新（階高反映）

### 機能2: ゾーン描画と負荷概算 🔵

**信頼性**: 🔵 *設計文書 §3.2・要件REQ-101~105, REQ-110*

**関連要件**: REQ-101, REQ-102, REQ-103, REQ-104, REQ-105, REQ-110

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant ZT as ZoneDrawTool
    participant S as useScene
    participant LC as LoadCalcSystem
    participant ZR as HvacZoneRenderer
    participant ZP as ZoneListPanel

    U->>ZT: ポリゴン頂点クリック (zone_draw tool)
    ZT->>ZT: ローカルプレビュー表示 (半透明)
    U->>ZT: Enter で確定
    ZT->>S: createNode(HvacZoneNode, { boundary, usage, floorArea })
    S->>S: markDirty(zoneId)
    S-->>LC: dirtyNodes に zone 検出
    LC->>LC: calculateZoneLoad(zone)
    Note over LC: m²単価法 + 方位補正 + ガラス面積補正
    LC->>S: updateNode(zoneId, { loadResult })
    S-->>ZR: HvacZoneRenderer 再描画
    ZR-->>U: 床面ポリゴン半透明着色
    S-->>ZP: ゾーン一覧パネル更新
    ZP-->>U: 用途・面積・冷暖房負荷表示
```

**詳細ステップ**:
1. ゾーニングフェーズで「ゾーン描画」ツールを選択
2. 建築平面上でクリックしてポリゴン頂点を指定
3. ポリゴンが半透明着色でリアルタイムプレビュー
4. Enterで確定、ゾーン名・用途・設計条件を入力
5. HvacZoneNodeが作成され、dirtyNodesにマーク
6. LoadCalcSystemがuseFrame内で検出し、負荷概算を実行
7. 計算結果（coolingLoad, heatingLoad, requiredAirflow等）がノードに保存
8. ゾーン一覧パネルに集計表示

### 機能3: 機器配置 🔵

**信頼性**: 🔵 *設計文書 §6 Phase 2・要件REQ-201~207*

**関連要件**: REQ-201, REQ-202, REQ-203, REQ-204, REQ-205, REQ-206, REQ-207

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant PT as AhuPlaceTool
    participant S as useScene
    participant ES as EquipmentSystem
    participant ER as EquipmentRenderer
    participant PP as PropertyPanel

    U->>PT: 配置位置クリック (ahu_place tool)
    PT->>PT: ゴースト表示 (ローカル)
    PT->>S: createNode(AhuNode, { position, tag, ports })
    S->>S: markDirty(ahuId)
    S-->>ES: dirtyNodes に ahu 検出
    ES->>ES: ポート位置計算 (position + offset)
    ES->>S: updateNode(ahuId, { ports: [位置更新] })
    S-->>ER: EquipmentRenderer 再描画
    ER-->>U: LOD100(ボックス) or LOD200(簡易3D) 表示
    ER-->>U: タグラベル "AHU-101" 表示
    ER-->>U: ポートマーカー表示
    U->>PP: 機器選択 → 諸元表パネル
    PP-->>U: 冷却能力・風量・静圧等を編集
```

**詳細ステップ**:
1. 機器フェーズで配置ツール（AHU/PAC/FCU/制気口）を選択
2. 3Dビュー上でクリックして配置位置を指定（ゴーストプレビュー）
3. 機器ノードが作成、ポートが自動定義（給気口、還気口、冷水入口等）
4. EquipmentSystemがポート位置を計算
5. LOD100（ボックス）またはLOD200（簡易3D）で表示
6. タグ名（"AHU-101"等）がラベル表示
7. 諸元表パネルで性能諸元を入力・編集

### 機能4: 負荷→機器容量自動マッチング 🔵

**信頼性**: 🔵 *設計文書 §6 Phase 2・要件REQ-205*

**関連要件**: REQ-205

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant PT as PlaceTool
    participant S as useScene
    participant LC as LoadCalcResult

    U->>PT: ゾーン上に機器配置を開始
    PT->>S: getState().nodes[zoneId].loadResult
    S-->>PT: { coolingLoad: 50kW }
    PT->>PT: 容量マッチング計算
    Note over PT: 冷却負荷 50kW → 推奨: AHU 56kW級
    PT-->>U: 推奨容量をツールチップ表示
    U->>PT: 配置確定
    PT->>S: createNode(AhuNode, { coolingCapacity: 56 })
```

### 機能5: ダクトルーティング（Phase 3 — 後続） 🔵

**信頼性**: 🔵 *設計文書 §4.3・要件REQ-301~305*

**関連要件**: REQ-301, REQ-302, REQ-303, REQ-304, REQ-305

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant DT as DuctRouteTool
    participant S as useScene
    participant DS as DuctSystem
    participant DSz as DuctSizingSystem
    participant DPL as DuctPressureLossSystem
    participant DR as DuctRenderer

    U->>DT: AHU給気ポートクリック (始点)
    DT->>DT: ルーティングモード開始
    U->>DT: 中間点クリック
    DT->>DT: リアルタイムプレビュー (ExtrudeGeometry)
    U->>DT: 制気口クリック (終点)
    U->>DT: Enter で確定
    DT->>S: createNodes([DuctSegmentNode, DuctFittingNode])
    S->>S: markDirty(ductIds)

    S-->>DS: ダクトジオメトリ生成
    DS->>DS: ExtrudeGeometry (断面→中心線に沿って押し出し)

    S-->>DSz: ダクト寸法選定
    DSz->>DSz: 等速法/等圧法で断面寸法計算
    DSz->>DSz: 規格サイズにスナップ
    DSz->>S: updateNode(ductId, { width, height })

    S-->>DPL: 圧損計算
    DPL->>DPL: ダルシー・ワイスバッハ式
    DPL->>S: updateNode(ductId, { calcResult })

    S-->>DR: DuctRenderer 再描画
    DR-->>U: ダクト3D表示 + 圧損オーバーレイ
```

### 機能6: 数量拾い出し（Phase 5 — 後続） 🔵

**信頼性**: 🔵 *設計文書 §3.6・要件REQ-501, REQ-502*

**関連要件**: REQ-501, REQ-502

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant TT as TakeoffTool
    participant S as useScene
    participant QT as QuantityTakeoff
    participant TP as TakeoffPanel

    U->>TT: 「拾い出し実行」クリック
    TT->>S: getState().nodes (全ノード取得)
    TT->>QT: generateHvacTakeoff(nodes, filters)
    QT->>QT: ダクト面積(m²)集計
    QT->>QT: 配管長さ(m)集計
    QT->>QT: 機器台数集計
    QT->>QT: 保温材・付属品・継手・バルブ集計
    QT->>QT: 同一仕様を集約 (aggregateTakeoff)
    QT-->>TP: TakeoffItem[] 表示
    TP-->>U: 下パネルに集計結果表示

    U->>TP: エクスポート選択
    alt CSV
        TP->>TP: CSV生成 → ダウンロード
    else Excel
        TP->>TP: みつもりくん形式Excel生成
    else Rebro
        TP->>TP: Rebroデータリンク形式生成
    end
    TP-->>U: ファイルダウンロード
```

---

## データ処理パターン

### 同期処理 🔵

**信頼性**: 🔵 *既存useFrameパターン*

- **useFrame内処理**: ダーティノードの検出→計算→更新。1フレーム16ms以内
- **ノードCRUD**: `useScene.createNode/updateNode/deleteNode` は同期
- **undo/redo**: Zundoによる同期的な状態巻き戻し/進め

### 非同期処理 🟡

**信頼性**: 🟡 *IFC処理・DB同期の推測*

- **IFC読込**: web-ifc WASMのパース（メインスレッド、ブロッキング）。将来Worker化候補
- **Supabase同期**: プロジェクトデータの保存・読込は非同期
- **IFC出力**: Supabase Edge Functions呼び出し（非同期）

### バッチ処理 🔵

**信頼性**: 🔵 *設計文書 §3.6*

- **数量拾い出し**: 全ノードを一括走査して集計
- **圧損一括計算**: Phase 5で系統全体の圧損を一括計算
- **積算出力**: 集計結果をCSV/Excel/Rebro形式に一括変換

---

## エラーハンドリングフロー 🟡

**信頼性**: 🟡 *既存実装パターンから妥当な推測*

```mermaid
flowchart TD
    A[エラー発生] --> B{エラー種別}
    B -->|IFCパースエラー| C[エラートースト表示<br/>部分的読込を試行]
    B -->|Zodバリデーションエラー| D[ノード作成拒否<br/>コンソール警告]
    B -->|ファイルサイズ超過| E[アップロード拒否<br/>サイズ制限警告]
    B -->|認証エラー| F[ログインページリダイレクト]
    B -->|DB同期エラー| G[ローカルキャッシュ維持<br/>リトライ]
    B -->|計算エラー| H[警告パネル表示<br/>前回結果を維持]

    C --> I[部分的な建築躯体表示]
    D --> J[ツール操作を再要求]
    H --> K[下パネルに警告一覧]
```

---

## 状態管理フロー

### フロントエンド状態管理 🔵

**信頼性**: 🔵 *既存3ストアアーキテクチャ*

```mermaid
stateDiagram-v2
    [*] --> 初期化: ページロード
    初期化 --> IndexedDB読込: ローカルデータ確認
    IndexedDB読込 --> Supabase同期: サーバーと同期
    Supabase同期 --> エディタ準備完了: データロード完了

    state エディタ準備完了 {
        [*] --> zone: デフォルトフェーズ
        zone --> equip: フェーズ切替
        equip --> route: フェーズ切替
        route --> calc: フェーズ切替
        calc --> takeoff: フェーズ切替
        takeoff --> zone: フェーズ切替

        state "各フェーズ" as phase {
            [*] --> select: デフォルトモード
            select --> build: ツール選択
            select --> edit: ノード編集
            select --> delete: 削除モード
            build --> select: 操作完了/ESC
            edit --> select: 操作完了/ESC
            delete --> select: 操作完了/ESC
        }
    }
```

### undo/redo フロー 🔵

**信頼性**: 🔵 *既存Zundoパターン*

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant S as useScene
    participant Z as Zundo (temporal)
    participant Sys as Systems

    U->>S: createNode / updateNode
    S->>Z: 状態スナップショット保存 (max 50)
    S->>S: markDirty(nodeId)
    S-->>Sys: 再計算

    U->>Z: Ctrl+Z (undo)
    Z->>S: 前の状態に復元
    Z->>S: 差分検出 → markDirty
    S-->>Sys: 影響ノード再計算

    U->>Z: Ctrl+Shift+Z (redo)
    Z->>S: 次の状態に復元
```

---

## 選択パスフロー 🔵

**信頼性**: 🔵 *既存SelectionPath・設計文書 §2.1*

```typescript
// @kuhl/viewer の選択パス
type SelectionPath = {
  plantId: PlantNode['id'] | null
  buildingId: BuildingNode['id'] | null
  levelId: LevelNode['id'] | null
  zoneId: HvacZoneNode['id'] | null
  selectedIds: BaseNode['id'][]  // 機器・ダクト・配管のマルチセレクト
}
```

階層ガード: 親ノード変更時は子の選択をリセット。

---

## データ永続化フロー 🔵

**信頼性**: 🔵 *既存永続化パターン・ユーザヒアリング*

```mermaid
flowchart LR
    Scene["useScene<br/>(Zustand)"] --> |"自動保存"| IDB["IndexedDB<br/>(ローカルキャッシュ)"]
    Scene --> |"明示的保存"| Supa["Supabase<br/>PostgreSQL"]
    Supa --> |"プロジェクト読込"| Scene
    IDB --> |"オフラインリカバリ"| Scene
```

---

## 関連文書

- **アーキテクチャ**: [architecture.md](architecture.md)
- **型定義**: [interfaces.ts](interfaces.ts)
- **DBスキーマ**: [database-schema.sql](database-schema.sql)
- **API仕様**: [api-endpoints.md](api-endpoints.md)

## 信頼性レベルサマリー

- 🔵 青信号: 13件 (81%)
- 🟡 黄信号: 3件 (19%)
- 🔴 赤信号: 0件 (0%)

**品質評価**: 高品質 — ほぼ全てのデータフローが設計文書・既存実装に裏付けられている
