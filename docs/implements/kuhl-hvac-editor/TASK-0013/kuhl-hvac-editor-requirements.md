# TASK-0013: HvacZoneRenderer（半透明床面ポリゴン）要件定義書

**タスクID**: TASK-0013
**機能名**: kuhl-hvac-editor
**要件名**: HvacZoneRenderer -- boundary ポリゴンから半透明着色ゾーンを描画
**作成日**: 2026-03-25
**信頼性評価**: 高品質

---

## 1. 機能の概要

- 🔵 **何をする機能か**: HvacZoneNode の `boundary` ポリゴン座標から THREE.ShapeGeometry を生成し、usage 別カラーマップで半透明着色したメッシュを ZONE_LAYER(2) に描画する React Three Fiber コンポーネント。sceneRegistry への登録、イベントバスとの連携、ゾーンラベル表示を含む。
- 🔵 **どのような問題を解決するか**: 空調設備設計において、建築フロア上に定義された空調ゾーン（オフィス、会議室、サーバー室など）を視覚的に識別可能な半透明オーバーレイとして3Dビューポートに描画する。usage 別の色分けにより、ゾーンの用途を一目で判別できる。
- 🔵 **想定されるユーザー**: 社内の空調設備設計担当者。3Dビューポート上でゾーンの範囲と用途を確認しながら設計を行う。
- 🔵 **システム内での位置づけ**: `@kuhl/viewer` パッケージのレンダラーコンポーネント。NodeRenderer ディスパッチャーから `hvac_zone` タイプのノードに対して呼び出される。現在の FallbackRenderer を置換する。Viewer Isolation 原則に従い、`apps/kuhl-editor` からのインポートは禁止。
- **参照したEARS要件**: REQ-101, REQ-003, REQ-007, REQ-009
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` -- 6 Phase 1、レンダラーパターン

---

## 2. 入力・出力の仕様

### 2.1 ZoneRenderer コンポーネント Props

- 🔵 **入力パラメータ**:

  | パラメータ | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | `nodeId` | `AnyNodeId` | Yes | 描画対象の HvacZoneNode ID（`zone_xxx` 形式） |

- 🔵 **内部で取得するデータ**:

  | データ | 取得元 | 型 | 説明 |
  |--------|--------|-----|------|
  | `node` | `useScene((s) => s.nodes[nodeId])` | `HvacZoneNode \| undefined` | ゾーンノードデータ |
  | `node.boundary` | HvacZoneNode | `Array<[number, number]> \| undefined` | 2D座標配列 [x, z]（Level座標系） |
  | `node.usage` | HvacZoneNode | `ZoneUsage` | ゾーン用途（11種） |
  | `node.zoneName` | HvacZoneNode | `string` | ゾーン名称（ラベル表示用） |

### 2.2 boundary から ShapeGeometry への変換

- 🔵 **入力**: `boundary: Array<[number, number]>` -- 2D座標配列。各要素は `[x, z]` で Level座標系（建築平面）上の点。
- 🔵 **変換処理**:
  1. `boundary` の各 `[x, z]` 座標から `THREE.Shape` を構築する。Shape は XY 平面上で作成するため、boundary の `[x, z]` を Shape の `(x, z)` として扱う（z を Shape の y 軸に読み替え）。
  2. 最初の点で `shape.moveTo(x, z)` を呼び出し、以降の点で `shape.lineTo(x, z)` を呼び出す。
  3. `shape.closePath()` でパスを閉じる。
  4. `new THREE.ShapeGeometry(shape)` でジオメトリを生成する。
- 🔵 **出力**: `THREE.ShapeGeometry` -- XY 平面上の平面メッシュ。
- 🔵 **座標系変換**: ShapeGeometry は XY 平面上に生成されるため、mesh を X 軸周りに `-Math.PI / 2` 回転させて XZ 平面（建築平面）に配置する。mesh の `position.y` にフロア高さを設定する。

### 2.3 usage 別カラーマップ

- 🔵 **定義**: 全 11 種の ZoneUsage に対して色と透明度を定義する。

  | usage | カラーコード | 系統色 | opacity |
  |-------|-------------|--------|---------|
  | `office` | `#4A90E2` | 青系 | 0.3 |
  | `meeting` | `#7ED321` | 緑系 | 0.3 |
  | `server_room` | `#FF4757` | 赤系 | 0.3 |
  | `lobby` | `#A8A8A8` | 灰色 | 0.3 |
  | `corridor` | `#C8C8C8` | 淡灰色 | 0.3 |
  | `toilet` | `#9B59B6` | 紫系 | 0.3 |
  | `kitchen` | `#F39C12` | オレンジ | 0.3 |
  | `warehouse` | `#795548` | 茶色 | 0.3 |
  | `mechanical_room` | `#34495E` | 濃灰 | 0.3 |
  | `electrical_room` | `#E74C3C` | 濃赤 | 0.3 |
  | `other` | `#BDC3C7` | ニュートラルグレー | 0.3 |

- 🔵 **マテリアル**: `THREE.MeshBasicMaterial` を使用。`transparent: true`, `opacity: 0.3`, `side: THREE.DoubleSide`（両面描画）, `depthWrite: false`（半透明の描画順序問題を回避）。
- 🔵 **型定義**: `Record<ZoneUsage, { color: string; opacity: number }>` として定数化しエクスポートする。

### 2.4 ZONE_LAYER 配置

- 🔵 **レイヤー設定**: mesh の `layers.set(ZONE_LAYER)` を呼び出し、レイヤー 2 に配置する。
- 🔵 **定数参照**: `packages/kuhl-viewer/src/constants/layers.ts` の `ZONE_LAYER` 定数を使用する。レイヤー番号のハードコードは禁止。

### 2.5 sceneRegistry 登録

- 🔵 **登録処理**: コンポーネントマウント時に以下を実行する。
  - `sceneRegistry.nodes.set(nodeId, meshRef.current)` -- mesh の Object3D 参照を登録
  - `sceneRegistry.byType.hvac_zone.add(nodeId)` -- タイプ別 ID セットに追加
- 🔵 **解除処理**: コンポーネントアンマウント時に以下を実行する。
  - `sceneRegistry.nodes.delete(nodeId)` -- 登録解除
  - `sceneRegistry.byType.hvac_zone.delete(nodeId)` -- タイプ別セットから削除
- 🔵 **タイミング**: `useEffect` フック内で実行。nodeId を依存配列に含める。

### 2.6 イベントハンドラ（useNodeEvents）

- 🟡 **イベント発火**: mesh への R3F イベント（onClick, onPointerEnter, onPointerLeave, onPointerMove 等）をフックし、`emitter.emit(eventKey('hvac_zone', suffix), payload)` でイベントバスに発火する。
- 🟡 **NodeEvent ペイロード**: `{ node, position, localPosition, normal, stopPropagation, nativeEvent }` 形式。
- 🟡 **実装方針**: useNodeEvents フックが未実装の場合、ZoneRenderer 内で直接 emitter.emit を呼び出すインライン実装とする。後続タスクで共通フックに抽出する。

### 2.7 ゾーンラベル表示

- 🟡 **表示内容**: `node.zoneName` をゾーンポリゴンの重心位置に表示する。
- 🟡 **表示方式**: Drei の `<Text>` コンポーネントを使用し、3D空間内にテキストを描画する。
- 🟡 **配置位置**: boundary の重心座標（全頂点の平均値）を算出し、フロア高さ + 微小オフセット（0.01）の Y 座標に配置する。
- 🟡 **スタイル**: フォントサイズ、色はカラーマップの色に合わせるか、白文字 + 黒縁で視認性を確保する。詳細は実装時に確定。
- 🟡 **レイヤー**: ラベルも ZONE_LAYER に配置する。

### 2.8 NodeRenderer 統合

- 🔵 **変更箇所**: `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` の `case 'hvac_zone':` を FallbackRenderer から ZoneRenderer に置換する。

  ```tsx
  // 変更前
  case 'hvac_zone':
    return <FallbackRenderer nodeId={node.id} nodeType={node.type} />

  // 変更後
  case 'hvac_zone':
    return <ZoneRenderer nodeId={node.id} />
  ```

- **参照したEARS要件**: REQ-101, REQ-003
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` -- レンダラーパターン、カラーマップ

---

## 3. 制約条件

### 3.1 パフォーマンス要件

- 🟡 **NFR-001**: 100ゾーン同時描画で60fps以上を維持する。ShapeGeometry とマテリアルはメモ化（`useMemo`）し、boundary/usage が変更されない限り再生成しない。
- 🔵 **メモ化対象**:
  - `THREE.Shape` 生成: `useMemo(() => boundaryToShape(boundary), [boundary])`
  - `THREE.ShapeGeometry` 生成: `useMemo(() => new THREE.ShapeGeometry(shape), [shape])`
  - `THREE.MeshBasicMaterial` 生成: `useMemo(() => new MeshBasicMaterial({...}), [usage])`
  - カラーマップ参照: 静的定数のため再計算不要
- 🔵 **ジオメトリ/マテリアル破棄**: コンポーネントアンマウント時に `geometry.dispose()` と `material.dispose()` を呼び出し、GPUメモリリークを防止する。

### 3.2 アーキテクチャ制約

- 🔵 **Viewer Isolation原則（REQ-009）**: ZoneRenderer は `@kuhl/viewer` パッケージ内に配置する。`apps/kuhl-editor` からのインポートは禁止。
- 🔵 **レイヤー番号ハードコード禁止**: `ZONE_LAYER` 定数を使用する。`layers.set(2)` のような直接指定は禁止。
- 🔵 **既存基盤パターン踏襲（REQ-007）**: useScene セレクター、sceneRegistry 登録/解除、emitter によるイベント発火の既存パターンを踏襲する。
- 🔵 **Renderer 例外**: 通常 Renderer はジオメトリ生成を行わないが、HvacZoneRenderer は boundary から直接 ShapeGeometry を生成する例外的なレンダラーである。ゾーン境界はユーザー入力に基づく動的データであり、System による事前計算の対象ではないため。

### 3.3 テスト要件

- 🔵 **カバレッジ**: テスト60%以上カバレッジ。
- 🟡 **R3Fテスト環境**: R3F Canvas のレンダリングテストは jsdom 環境でのモック化が必要。Three.js オブジェクト（ShapeGeometry, MeshBasicMaterial, Layers）の生成・設定は純粋関数として抽出し、単体テスト可能にする。
- 🔵 **テスト対象**: boundary 変換ロジック、カラーマップ参照、レイヤー設定、sceneRegistry 登録/解除。

### 3.4 座標系制約

- 🔵 **boundary 座標系**: 2D `[x, z]` -- Level座標系（建築平面）。
- 🔵 **ShapeGeometry 座標系**: XY 平面（Three.js デフォルト）。
- 🔵 **変換**: ShapeGeometry 生成後、mesh を X 軸周りに `-Math.PI / 2` 回転して XZ 平面に配置。Y 座標にフロア高さを設定。

- **参照したEARS要件**: REQ-003, REQ-007, REQ-009, NFR-001
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` -- Viewer Isolation原則、Three.jsレイヤー

---

## 4. 想定される使用例

### 4.1 基本的な使用パターン

- 🔵 **UC-01: 単一ゾーンの描画**
  - HvacZoneNode が useScene に追加される（boundary 定義済み、usage='office'）
  - NodeRenderer が `hvac_zone` タイプを検出し ZoneRenderer にディスパッチする
  - ZoneRenderer が boundary から ShapeGeometry を生成する
  - 青系半透明（#4A90E2, opacity 0.3）のメッシュが ZONE_LAYER に描画される
  - ゾーンラベル（zoneName）がポリゴン重心に表示される

- 🔵 **UC-02: 複数ゾーンの同時描画**
  - 複数の HvacZoneNode（office, meeting, server_room 等）が存在する
  - 各ゾーンが usage 別の色で描画される
  - ユーザーが3Dビューポート上でゾーンの用途を色で識別できる

- 🔵 **UC-03: ゾーンクリックイベント**
  - ユーザーがゾーンポリゴンをクリックする
  - `hvac_zone:click` イベントがイベントバスに発火される
  - ツールやSelectionManagerがイベントを受信して選択状態を更新する

### 4.2 エッジケース

- 🔵 **EDGE-01: boundary が undefined（未定義）**
  - HvacZoneNode の boundary フィールドはオプショナル（`z.array(...).optional()`）
  - boundary が `undefined` の場合、ZoneRenderer はメッシュを描画しない（`null` を返す）
  - sceneRegistry への登録も行わない

- 🔵 **EDGE-02: boundary が空配列（`[]`）**
  - boundary が空配列の場合、有効なポリゴンを構成できない
  - ZoneRenderer はメッシュを描画しない（`null` を返す）

- 🔵 **EDGE-03: boundary が1点（`[[0,0]]`）**
  - 1点ではポリゴンを構成できない
  - ZoneRenderer はメッシュを描画しない（`null` を返す）

- 🔵 **EDGE-04: boundary が2点（`[[0,0],[10,0]]`）**
  - 2点ではポリゴンを構成できない（線分であり面積を持たない）
  - ZoneRenderer はメッシュを描画しない（`null` を返す）

- 🔵 **EDGE-05: boundary が3点以上（有効なポリゴン）**
  - 3点以上であれば有効なポリゴンとして ShapeGeometry を生成する
  - 最小有効ケース: 三角形（3点）

- 🟡 **EDGE-06: nodeId に対応するノードが存在しない**
  - useScene セレクターが `undefined` を返す
  - ZoneRenderer は `null` を返す（既存 NodeRenderer パターンと同様）

- 🟡 **EDGE-07: ノードの usage が変更された場合**
  - useScene のリアクティブ更新によりコンポーネントが再レンダーされる
  - 新しい usage に対応するカラーマップが適用される
  - マテリアルの useMemo 依存配列に usage を含めることで対応

- 🟡 **EDGE-08: boundary が動的に更新された場合**
  - boundary 変更時に ShapeGeometry を再生成する
  - 旧ジオメトリは dispose する（useMemo のクリーンアップ、または useEffect で管理）

- 🟡 **EDGE-09: 半透明ゾーンの重なり**
  - 複数ゾーンが重なった場合、半透明マテリアルの描画順序により見た目が変わる可能性がある
  - `depthWrite: false` を設定し、描画順序の問題を軽減する
  - 完全な解決は後続タスクで対応（renderOrder 制御等）

- **参照したEARS要件**: REQ-101, REQ-003
- **参照した設計文書**: `docs/design/kuhl-hvac-editor/architecture.md` -- レンダラーパターン

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- 空調設備設計者が3Dビューポート上でゾーンの範囲と用途を視覚的に確認できるストーリー

### 参照した機能要件
- **REQ-101**: HVACゾーンの可視化（boundary ポリゴン描画、usage 別カラーマップ） 🔵
- **REQ-003**: `@kuhl/viewer` パッケージとしてレンダラーを提供 🔵
- **REQ-007**: 既存 BaseNode, useScene, event bus, sceneRegistry パターンを踏襲 🔵
- **REQ-009**: Viewer Isolation 原則（`apps/editor` からのインポート禁止） 🔵

### 参照した非機能要件
- **NFR-001**: 60fps以上で描画（100ゾーン同時描画） 🟡

### 参照したEdgeケース
- boundary undefined/空配列/点数不足のハンドリング
- ノード存在確認の安全処理

### 参照した受け入れ基準
- ゾーンポリゴンが半透明で描画される
- usage 別に色分けされる
- ZONE_LAYER に配置される
- テスト60%以上カバレッジ

### 参照した設計文書

- **アーキテクチャ**: `docs/design/kuhl-hvac-editor/architecture.md`
  - Phase 1 カラーマップ定義
  - レンダラーパターン（EquipmentRenderer 設計例）
  - Viewer Isolation 原則
  - Three.js レイヤー定義
- **既存実装（参照）**:
  - `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` -- NodeRenderer ディスパッチパターン
  - `packages/kuhl-viewer/src/components/renderers/fallback-renderer.tsx` -- FallbackRenderer（置換対象）
  - `packages/kuhl-viewer/src/constants/layers.ts` -- ZONE_LAYER 定数
  - `packages/kuhl-core/src/schema/nodes/hvac-zone.ts` -- HvacZoneNode スキーマ
  - `packages/kuhl-core/src/hooks/scene-registry/scene-registry.ts` -- sceneRegistry
  - `packages/kuhl-core/src/events/bus.ts` -- emitter, eventKey, NodeEvent

---

## 6. 実装ファイル一覧

| ファイルパス | 種別 | 説明 |
|-------------|------|------|
| `packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx` | 新規作成 | HvacZoneRenderer コンポーネント |
| `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` | 変更 | hvac_zone ケースを ZoneRenderer にディスパッチ |
| `packages/kuhl-viewer/src/__tests__/components/renderers/zone-renderer.test.tsx` | 新規作成 | ZoneRenderer テスト |

---

## 7. 信頼性レベルサマリー

| セクション | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|-----------|-------|-------|-------|------|
| 1. 機能の概要 | 4 | 0 | 0 | 4 |
| 2. 入出力の仕様 | 14 | 6 | 0 | 20 |
| 3. 制約条件 | 8 | 2 | 0 | 10 |
| 4. 想定される使用例 | 8 | 4 | 0 | 12 |
| **合計** | **34** | **12** | **0** | **46** |

### 全体評価

- **総項目数**: 46項目
- 🔵 **青信号**: 34項目 (74%)
- 🟡 **黄信号**: 12項目 (26%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 高品質 -- 黄信号はイベントハンドラ実装方式（useNodeEvents フック未実装）、ラベル表示の詳細スタイル、R3Fテスト環境の制約、動的更新時のジオメトリ再生成タイミングに起因する。赤信号なし。HvacZoneNode スキーマ、sceneRegistry、イベントバス、レイヤー定数の既存実装に強く裏付けられている。
