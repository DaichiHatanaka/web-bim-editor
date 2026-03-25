# TASK-0022: EquipmentRenderer（LOD200 プロシージャル・GLB）- テストケース定義

**作成日**: 2026-03-25
**タスクID**: TASK-0022
**フェーズ**: Phase 3 - 機器配置
**テストファイル**: `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-lod200.test.tsx`
**カバレッジ目標**: 60% 以上

---

## 4. 開発言語・フレームワーク

- **プログラミング言語**: TypeScript 5.9
  - **言語選択の理由**: プロジェクト全体で TypeScript を使用しており、型安全性を確保するため
  - **テストに適した機能**: 型推論による補完、インターフェース検証、型ガード関数のテスト
- **テストフレームワーク**: Vitest + @testing-library/react
  - **フレームワーク選択の理由**: TASK-0021 既存テストパターンを踏襲。jsdom 環境で R3F コンポーネントをモック化してテスト
  - **テスト実行環境**: jsdom（`// @vitest-environment jsdom`）。R3F / Drei はモック化して DOM ベースでテスト
- 🔵 青信号: TASK-0021 テストファイルのパターンから直接確認済み

---

## 6. 要件定義との対応関係

- **参照した機能概要**: requirements.md FR-001（LOD 切替ロジック）、FR-002（GlbModelRenderer）、FR-003（ProceduralEquipment）、FR-004（Suspense Fallback）
- **参照した入力・出力仕様**: requirements.md Section 3（インターフェース仕様）、Props 定義
- **参照した制約条件**: requirements.md Section 5（エッジケース EC-001〜EC-006）
- **参照した使用例**: note.md LOD 切替フロー図、ProceduralEquipment タイプ別形状仕様

---

## 1. 正常系テストケース

### TC-LOD200-001: getLodRenderer が LOD 値に応じて正しいレンダラータイプ文字列を返す

- **テスト名**: LOD値からレンダラータイプを判定する純粋関数テスト
  - **何をテストするか**: `getLodRenderer(lod)` 関数が LOD 値 `'100'`、`'200'` に対して正しいレンダラータイプ（`'box'`、`'procedural'` / `'glb'` 等）を返すこと
  - **期待される動作**: `'100'` → LOD100 タイプ、`'200'` → LOD200 タイプ、`undefined` → LOD100 デフォルト
- **入力値**: `'100'`、`'200'`、`'300'`、`undefined`
  - **入力データの意味**: LodLevel スキーマで定義された全 LOD 値 + 未定義ケース
- **期待される結果**: `'100'` → `'lod100'`、`'200'` → `'lod200'`、`'300'` → `'lod100'`（将来拡張のため LOD100 フォールバック）、`undefined` → `'lod100'`
  - **期待結果の理由**: FR-001.1, FR-001.4, FR-001.5 に基づく LOD 切替仕様
- **テストの目的**: LOD 判定ロジックが正しく機能すること
  - **確認ポイント**: 未知の LOD 値が安全に LOD100 にフォールバックすること
- 🟡 黄信号: `getLodRenderer` 関数の具体的な API 名・戻り値は未確定（要件定義書のフロー図から推測）

---

### TC-LOD200-002: getProceduralShape が既知タイプに対して形状設定を返す

- **テスト名**: 既知機器タイプのプロシージャル形状設定取得テスト
  - **何をテストするか**: `getProceduralShape(type)` 関数が `'ahu'`、`'pac'`、`'fcu'` 等の既知タイプに対して正しい形状設定オブジェクトを返すこと
  - **期待される動作**: タイプに応じた形状パラメータ（dimensions 係数等）を含むオブジェクトが返る
- **入力値**: `'ahu'`、`'pac'`、`'fcu'`
  - **入力データの意味**: FR-003.1〜FR-003.3 で定義された LOD200 対応機器タイプ
- **期待される結果**:
  - `'ahu'` → フル dimensions のボックス形状設定（heightScale: 1.0）
  - `'pac'` → 薄型形状設定（heightScale: 0.25）
  - `'fcu'` → コンパクト形状設定（heightScale: 0.6）
  - **期待結果の理由**: FR-003.1（AHU: full dimensions）、FR-003.2（PAC: height * 0.25）、FR-003.3（FCU: height * 0.6）
- **テストの目的**: タイプ別形状パラメータの正確性を検証
  - **確認ポイント**: 各タイプの heightScale が要件定義通りであること
- 🟡 黄信号: `getProceduralShape` 関数名と戻り値構造は推測。FR-003 から heightScale 値は確認済み

---

### TC-LOD200-003: getProceduralShape が未知タイプに対して null/フォールバックを返す

- **テスト名**: 未知機器タイプのフォールバック動作テスト
  - **何をテストするか**: `getProceduralShape(type)` が `'ahu'`、`'pac'`、`'fcu'` 以外のタイプに対して `null` またはデフォルトの BoxGeometry 設定を返すこと
  - **期待される動作**: 未知タイプでは LOD100 互換のフル dimensions ボックスにフォールバック
- **入力値**: `'damper'`、`'valve'`、`'unknown_type'`、`''`（空文字列）
  - **入力データの意味**: FR-003.4 で「ahu, pac, fcu 以外」と定義された未知タイプ
- **期待される結果**: `null` または LOD100 フォールバック形状設定（heightScale: 1.0 のフル dimensions ボックス）
  - **期待結果の理由**: FR-003.4「When equipment type is not ahu, pac, or fcu, the system shall fall back to a LOD100-style BoxGeometry」
- **テストの目的**: 未知タイプでクラッシュしないこと、安全なフォールバック動作
  - **確認ポイント**: エラーがスローされないこと、戻り値が一貫していること
- 🔵 青信号: FR-003.4 のフォールバック仕様から直接確認

---

### TC-LOD200-004: LOD='100' で既存 LOD100 ボックスが描画される（後方互換性）

- **テスト名**: LOD100 後方互換性テスト
  - **何をテストするか**: `lod='100'` のノードに対して、TASK-0021 で実装した BoxGeometry がそのまま描画されること
  - **期待される動作**: EquipmentRenderer が BoxGeometry を生成し、mesh 要素として描画する
- **入力値**: `AhuNode.parse({ ..., lod: '100', ... })` — 標準テスト AHU ノード
  - **入力データの意味**: TASK-0021 既存の LOD100 ノード。拡張後も従来動作を維持することを保証
- **期待される結果**: mesh 要素が DOM に存在すること。ProceduralEquipment / GlbModelRenderer は呼ばれないこと
  - **期待結果の理由**: FR-001.1「lod === '100' → existing LOD100 BoxGeometry」、FR-001.7「without breaking TASK-0021 LOD100 tests」
- **テストの目的**: LOD200 拡張が既存 LOD100 レンダリングを破壊しないことを保証
  - **確認ポイント**: TASK-0021 既存テストとの一貫性
- 🔵 青信号: FR-001.1, FR-001.7 から直接確認。TASK-0021 既存実装のパターン踏襲

---

### TC-LOD200-005: LOD='200' + modelSrc 未指定で ProceduralEquipment が描画される

- **テスト名**: LOD200 プロシージャル描画テスト
  - **何をテストするか**: `lod='200'` かつ `modelSrc` 未指定のノードに対して、ProceduralEquipment コンポーネントが使用されること
  - **期待される動作**: EquipmentRenderer が ProceduralEquipment をレンダリングする
- **入力値**: `AhuNode.parse({ ..., lod: '200', modelSrc: undefined, ... })`
  - **入力データの意味**: modelSrc なしの LOD200 ノード。プロシージャル生成パスをテスト
- **期待される結果**: ProceduralEquipment コンポーネントが描画されること（DOM 内に対応要素が存在）。GlbModelRenderer は呼ばれないこと
  - **期待結果の理由**: FR-001.3「lod === '200' and modelSrc is undefined → ProceduralEquipment」
- **テストの目的**: LOD200 プロシージャルパスの分岐が正しく機能すること
  - **確認ポイント**: modelSrc の有無による分岐が正確に動作すること
- 🟡 黄信号: FR-001.3 の仕様は確認済みだが、ProceduralEquipment のモック方法は TASK-0021 パターンから推測

---

### TC-LOD200-006: LOD='200' + modelSrc 指定時に GlbModelRenderer が描画される

- **テスト名**: LOD200 GLB モデル描画テスト
  - **何をテストするか**: `lod='200'` かつ `modelSrc` が定義されたノードに対して、GlbModelRenderer が Suspense ラッパー内で使用されること
  - **期待される動作**: EquipmentRenderer が Suspense + GlbModelRenderer をレンダリングする
- **入力値**: `AhuNode.parse({ ..., lod: '200', modelSrc: '/models/ahu.glb', ... })`
  - **入力データの意味**: modelSrc ありの LOD200 ノード。GLB 読込パスをテスト
- **期待される結果**: GlbModelRenderer コンポーネントが Suspense 内で描画されること
  - **期待結果の理由**: FR-001.2「lod === '200' and modelSrc is defined → GlbModelRenderer wrapped in Suspense」
- **テストの目的**: LOD200 GLB パスの分岐が正しく機能すること
  - **確認ポイント**: Suspense ラッパーが存在すること、modelSrc が GlbModelRenderer に渡されること
- 🟡 黄信号: FR-001.2 の仕様は確認済み。useGLTF モック方法は Drei モックパターンから推測

---

### TC-LOD200-007: LOD 未定義時に LOD100 にデフォルトフォールバックする

- **テスト名**: LOD 未定義時のデフォルトフォールバックテスト
  - **何をテストするか**: `lod` が `undefined` のノードに対して、LOD100 BoxGeometry でデフォルト描画されること
  - **期待される動作**: `lod ?? '100'` のフォールバックにより LOD100 パスが実行される
- **入力値**: ノードオブジェクトの `lod` フィールドを省略（スキーマのデフォルト値に依存）
  - **入力データの意味**: lod が明示的に設定されていないノード。レガシーデータや初期作成時のケース
- **期待される結果**: LOD100 BoxGeometry が描画される。ProceduralEquipment / GlbModelRenderer は呼ばれない
  - **期待結果の理由**: FR-001.4「lod is undefined → default to LOD100」
- **テストの目的**: デフォルト LOD 値の安全なフォールバック動作
  - **確認ポイント**: undefined → LOD100 の暗黙変換が正しく機能すること
- 🔵 青信号: FR-001.4 から直接確認。`lod ?? '100'` のフォールバックパターン

---

### TC-LOD200-008: 未知の LOD 値（'300' 等）で LOD100 にデフォルトフォールバックする

- **テスト名**: 未知 LOD 値のフォールバックテスト
  - **何をテストするか**: `lod='300'` や他の未知の値に対して、LOD100 でデフォルト描画されること
  - **期待される動作**: 条件分岐の else パスにより LOD100 が実行される
- **入力値**: `lod: '300'` を持つノード（LodLevel スキーマでは有効だが実装未対応）
  - **入力データの意味**: 将来拡張向けの LOD300 値。現時点では LOD100 にフォールバックすべき
- **期待される結果**: LOD100 BoxGeometry が描画される
  - **期待結果の理由**: FR-001.5「lod === '300' → default to LOD100 (future extension placeholder)」
- **テストの目的**: 将来拡張対応の安全性確認
  - **確認ポイント**: LOD300 でクラッシュしないこと
- 🔵 青信号: FR-001.5 から直接確認

---

### TC-LOD200-009: AHU タイプがボックス形状で描画される

- **テスト名**: ProceduralEquipment AHU タイプ形状生成テスト
  - **何をテストするか**: ProceduralEquipment に `type='ahu'` を渡した時、フル dimensions のボックス形状が生成されること
  - **期待される動作**: AHU 用の BoxGeometry（dimensions そのまま）+ ダクト接続口形状が生成される
- **入力値**: `{ type: 'ahu', dimensions: [2.5, 1.8, 1.2], color: '#4A90E2' }`
  - **入力データの意味**: 標準的な AHU サイズ。FR-003.1 の「full dimensions の箱 + cylindrical intake/exhaust」に対応
- **期待される結果**: メイン BoxGeometry のサイズが `[2.5, 1.8, 1.2]` であること
  - **期待結果の理由**: FR-003.1「box shape with the full dimensions」
- **テストの目的**: AHU タイプ固有の形状パラメータが正しいこと
  - **確認ポイント**: dimensions が変形されず、そのまま使用されること
- 🟡 黄信号: FR-003.1 から確認。具体的なジオメトリ検証方法は TASK-0021 パターンから推測

---

### TC-LOD200-010: PAC タイプが薄型四角形で描画される

- **テスト名**: ProceduralEquipment PAC タイプ形状生成テスト
  - **何をテストするか**: ProceduralEquipment に `type='pac'` を渡した時、height が 0.25 倍された薄型形状が生成されること
  - **期待される動作**: PAC 用の BoxGeometry で `[width, height * 0.25, depth]` の薄型が生成される
- **入力値**: `{ type: 'pac', dimensions: [1.0, 0.8, 1.0], color: '#7ED321' }`
  - **入力データの意味**: 天カセ型 PAC の標準サイズ。height が 0.25 倍されて 0.2 になる想定
- **期待される結果**: 生成された BoxGeometry の height パラメータが `0.8 * 0.25 = 0.2` であること
  - **期待結果の理由**: FR-003.2「flat rectangular shape with dimensions [width, height * 0.25, depth]」
- **テストの目的**: PAC タイプの height スケーリングが正確であること
  - **確認ポイント**: height のみが 0.25 倍され、width / depth は変更されないこと
- 🟡 黄信号: FR-003.2 の heightScale: 0.25 は確認済み。具体的なジオメトリ検証方法は推測

---

### TC-LOD200-011: FCU タイプがコンパクトボックスで描画される

- **テスト名**: ProceduralEquipment FCU タイプ形状生成テスト
  - **何をテストするか**: ProceduralEquipment に `type='fcu'` を渡した時、height が 0.6 倍されたコンパクト形状が生成されること
  - **期待される動作**: FCU 用の BoxGeometry で `[width, height * 0.6, depth]` のコンパクト形状が生成される
- **入力値**: `{ type: 'fcu', dimensions: [0.6, 0.5, 0.4], color: '#F39C12' }`
  - **入力データの意味**: 小型 FCU の標準サイズ。height が 0.6 倍されて 0.3 になる想定
- **期待される結果**: 生成された BoxGeometry の height パラメータが `0.5 * 0.6 = 0.3` であること
  - **期待結果の理由**: FR-003.3「compact box shape with dimensions [width, height * 0.6, depth]」
- **テストの目的**: FCU タイプの height スケーリングが正確であること
  - **確認ポイント**: height のみが 0.6 倍され、width / depth は変更されないこと
- 🟡 黄信号: FR-003.3 の heightScale: 0.6 は確認済み。具体的なジオメトリ検証方法は推測

---

### TC-LOD200-012: 未知タイプが LOD100 ボックスにフォールバックする

- **テスト名**: ProceduralEquipment 未知タイプフォールバックテスト
  - **何をテストするか**: `'ahu'`/`'pac'`/`'fcu'` 以外のタイプに対して、フル dimensions の BoxGeometry にフォールバックすること
  - **期待される動作**: 未知タイプでも描画がクラッシュせず、LOD100 互換のボックスが表示される
- **入力値**: `{ type: 'damper', dimensions: [0.3, 0.3, 0.2], color: '#95A5A6' }`
  - **入力データの意味**: ProceduralEquipment で専用形状が定義されていないタイプ
- **期待される結果**: フル dimensions `[0.3, 0.3, 0.2]` の BoxGeometry が生成されること
  - **期待結果の理由**: FR-003.4「fall back to a LOD100-style BoxGeometry using the full dimensions」
- **テストの目的**: 未知タイプの安全なフォールバック
  - **確認ポイント**: dimensions が変形されないこと、エラーがスローされないこと
- 🔵 青信号: FR-003.4 から直接確認

---

### TC-LOD200-013: GlbModelRenderer が Suspense ラッパー内で描画される

- **テスト名**: GlbModelRenderer Suspense 統合テスト
  - **何をテストするか**: GlbModelRenderer が `<Suspense>` 内でレンダリングされ、GLB 読込中に fallback が表示されること
  - **期待される動作**: Suspense の fallback として Lod100Fallback（BoxGeometry）が表示される
- **入力値**: `{ modelSrc: '/models/ahu.glb', dimensions: [2.5, 1.8, 1.2] }`
  - **入力データの意味**: 標準的な GLB モデルパス。Suspense 動作の検証に使用
- **期待される結果**: Suspense fallback 内に Lod100Fallback コンポーネント（BoxGeometry）が描画されること
  - **期待結果の理由**: FR-002.4「Suspense pending → Lod100Fallback」、FR-004.1「display a Lod100Fallback component」
- **テストの目的**: GLB 読込中のユーザ体験（LOD100 ボックスが表示されること）
  - **確認ポイント**: Suspense の fallback prop が Lod100Fallback であること
- 🟡 黄信号: FR-002.4, FR-004.1 の仕様は確認済み。Suspense テストの実装方法は推測

---

### TC-LOD200-014: Suspense fallback が LOD100 ボックスを表示する

- **テスト名**: Suspense fallback LOD100 ボックス表示テスト
  - **何をテストするか**: Lod100Fallback コンポーネントが指定された dimensions と color で BoxGeometry を描画すること
  - **期待される動作**: Lod100Fallback が `dimensions` パラメータの BoxGeometry を MeshStandardMaterial で描画する
- **入力値**: `{ dimensions: [2.5, 1.8, 1.2], color: '#4A90E2' }`
  - **入力データの意味**: EquipmentRenderer から渡される AHU の dimensions と color
- **期待される結果**: BoxGeometry サイズが `[2.5, 1.8, 1.2]`、MeshStandardMaterial の color が `'#4A90E2'` であること
  - **期待結果の理由**: FR-004.1「BoxGeometry with the node's dimensions」、FR-004.2「same EQUIPMENT_COLOR_MAP color」
- **テストの目的**: Fallback の視覚表示が LOD100 と一致すること
  - **確認ポイント**: dimensions と color が正確に反映されること
- 🔵 青信号: FR-004.1〜FR-004.3 から直接確認

---

## 2. 異常系テストケース

### TC-LOD200-015: 無効な modelSrc パスでのエラーハンドリング

- **テスト名**: 無効 GLB パスのエラーハンドリングテスト
  - **エラーケースの概要**: `modelSrc` が存在しないパスや空文字列を参照した場合の動作
  - **エラー処理の重要性**: GLB ファイルが見つからない場合でもアプリケーションがクラッシュしないことが必要
- **入力値**: `{ modelSrc: '/models/nonexistent.glb', dimensions: [1, 1, 1] }` / `{ modelSrc: '', dimensions: [1, 1, 1] }`
  - **不正な理由**: 存在しない GLB ファイルパスまたは空文字列はロードエラーを引き起こす
  - **実際の発生シナリオ**: モデルファイルが削除された場合、URL のタイプミス、ネットワークエラー時
- **期待される結果**: ErrorBoundary が GLB 読込エラーをキャッチし、LOD100 BoxGeometry にフォールバックする。コンソールにエラーログが出力される
  - **エラーメッセージの内容**: `'GLB load failed: ...'` のようなエラーメッセージがコンソールに出力される
  - **システムの安全性**: アプリケーション全体がクラッシュせず、フォールバック表示で動作を継続する
- **テストの目的**: GLB 読込失敗時の安全なフォールバック動作を確認
  - **品質保証の観点**: ネットワーク障害やファイル欠落時のレジリエンス確保
- 🟡 黄信号: EC-001, EC-002, FR-002.5 から確認。ErrorBoundary の具体的な実装パターンは推測

---

## 3. 境界値テストケース

（本タスクでは LOD 値の切替境界が主な境界条件であり、TC-LOD200-007（undefined）、TC-LOD200-008（'300'）で網羅済み。追加の境界値テストケースとして以下を定義する。）

### TC-LOD200-016: LOD200 でも TagLabel・PortMarkers が表示される

- **テスト名**: LOD200 共通子コンポーネント表示テスト
  - **境界値の意味**: LOD100 → LOD200 の切替境界で、共通コンポーネント（TagLabel、PortMarkers）が描画されるかの確認
  - **境界値での動作保証**: LOD レベルに関係なく TagLabel と PortMarkers は常に表示される仕様
- **入力値**: `AhuNode.parse({ ..., lod: '200', tag: 'AHU-201', ports: [...], ... })`
  - **境界値選択の根拠**: FR-001.6「Regardless of LOD level → TagLabel and PortMarkers」
  - **実際の使用場面**: LOD200 表示時にタグ・ポートが消失するとユーザの作業に支障が出る
- **期待される結果**: TagLabel コンポーネントが `'AHU-201'` テキストを表示。PortMarkers がポート数分のマーカーを表示
  - **境界での正確性**: LOD100 と LOD200 で TagLabel/PortMarkers の表示が一貫していること
  - **一貫した動作**: LOD 値を切り替えても TagLabel/PortMarkers の表示が変わらないこと
- **テストの目的**: LOD 切替で共通コンポーネントが失われないことの確認
  - **堅牢性の確認**: 全 LOD レベルで共通子コンポーネントが安定動作すること
- 🔵 青信号: FR-001.6 から直接確認

---

## 5. テストケース実装時の日本語コメント指針

各テストケースの実装時には以下のパターンでコメントを記載する。

#### テストケース開始時のコメント

```typescript
// 【テスト目的】: LOD='200' + modelSrc 未指定時に ProceduralEquipment が描画されること
// 【テスト内容】: useScene に lod='200', modelSrc=undefined のノードを設定し、
//               EquipmentRenderer の描画結果を検証する
// 【期待される動作】: ProceduralEquipment コンポーネントが DOM に存在し、GlbModelRenderer は存在しない
// 🟡 黄信号: FR-001.3 から仕様確認済み、モック方法は推測
```

#### Given（準備フェーズ）のコメント

```typescript
// 【テストデータ準備】: AhuNode.parse で lod='200', modelSrc=undefined の機器ノードを生成
// 【初期条件設定】: useScene モックストアに生成したノードを登録
// 【前提条件確認】: R3F / Drei がモック化され、jsdom 環境でテスト可能であること
```

#### When（実行フェーズ）のコメント

```typescript
// 【実際の処理実行】: EquipmentRenderer を render() で DOM にマウントする
// 【処理内容】: LOD 切替ロジックが実行され、ProceduralEquipment パスが選択される
// 【実行タイミング】: マウント直後のレンダリング結果を検証
```

#### Then（検証フェーズ）のコメント

```typescript
// 【結果検証】: DOM に ProceduralEquipment 対応要素が存在するか確認
// 【期待値確認】: GlbModelRenderer が呼ばれていないこと（Suspense ラッパーが存在しないこと）
// 【品質保証】: LOD200 プロシージャルパスが正しく分岐していることの保証
```

#### 各 expect ステートメントのコメント

```typescript
// 【検証項目】: ProceduralEquipment が DOM に存在すること
// 🟡 黄信号: モック経由の DOM 検証は推測
expect(container.querySelector('[data-testid="procedural-equipment"]')).toBeTruthy()

// 【検証項目】: GlbModelRenderer が DOM に存在しないこと
// 🟡 黄信号: モック経由の DOM 検証は推測
expect(container.querySelector('[data-testid="glb-model-renderer"]')).toBeNull()
```

#### セットアップ・クリーンアップのコメント

```typescript
beforeEach(() => {
  // 【テスト前準備】: useScene ストアを初期状態にリセット
  // 【環境初期化】: sceneRegistry をクリアして前テストの影響を排除
})

afterEach(() => {
  // 【テスト後処理】: vi.clearAllMocks() でモック状態をリセット
  // 【状態復元】: useScene ストアを初期状態に復元
})
```

---

## テストケースサマリー

| TC ID | テスト名 | 分類 | 信頼性 | 対応要件 |
|-------|---------|------|-------|---------|
| TC-LOD200-001 | getLodRenderer が正しいレンダラータイプを返す | 正常系（純粋関数） | 🟡 | FR-001.1, FR-001.4, FR-001.5 |
| TC-LOD200-002 | getProceduralShape が既知タイプの形状設定を返す | 正常系（純粋関数） | 🟡 | FR-003.1〜FR-003.3 |
| TC-LOD200-003 | getProceduralShape が未知タイプでフォールバック | 正常系（純粋関数） | 🔵 | FR-003.4 |
| TC-LOD200-004 | LOD='100' で既存 BoxGeometry 描画 | 正常系（LOD切替） | 🔵 | FR-001.1, FR-001.7 |
| TC-LOD200-005 | LOD='200' + modelSrc 無で ProceduralEquipment | 正常系（LOD切替） | 🟡 | FR-001.3 |
| TC-LOD200-006 | LOD='200' + modelSrc 有で GlbModelRenderer | 正常系（LOD切替） | 🟡 | FR-001.2 |
| TC-LOD200-007 | LOD 未定義で LOD100 デフォルト | 正常系（LOD切替） | 🔵 | FR-001.4 |
| TC-LOD200-008 | 未知 LOD 値で LOD100 フォールバック | 正常系（LOD切替） | 🔵 | FR-001.5 |
| TC-LOD200-009 | AHU タイプ形状生成 | 正常系（Procedural） | 🟡 | FR-003.1 |
| TC-LOD200-010 | PAC タイプ形状生成 | 正常系（Procedural） | 🟡 | FR-003.2 |
| TC-LOD200-011 | FCU タイプ形状生成 | 正常系（Procedural） | 🟡 | FR-003.3 |
| TC-LOD200-012 | 未知タイプフォールバック | 正常系（Procedural） | 🔵 | FR-003.4 |
| TC-LOD200-013 | Suspense ラッパー内描画 | 正常系（GLB） | 🟡 | FR-002.4, FR-004.1 |
| TC-LOD200-014 | Suspense fallback LOD100 ボックス | 正常系（GLB） | 🔵 | FR-004.1〜FR-004.3 |
| TC-LOD200-015 | 無効 modelSrc エラーハンドリング | 異常系 | 🟡 | EC-001, EC-002, FR-002.5 |
| TC-LOD200-016 | LOD200 で TagLabel・PortMarkers 表示 | 境界値 | 🔵 | FR-001.6 |

### 信頼性レベル分布

- 🔵 **青信号**: 7件 (44%) — 要件定義書・既存実装から直接確認
- 🟡 **黄信号**: 9件 (56%) — 要件定義から妥当な推測
- 🔴 **赤信号**: 0件 (0%)

### テストケース分類分布

- **正常系（純粋関数）**: 3件（TC-001〜003）
- **正常系（LOD 切替）**: 5件（TC-004〜008）
- **正常系（ProceduralEquipment）**: 4件（TC-009〜012）
- **正常系（GlbModelRenderer）**: 2件（TC-013〜014）
- **異常系**: 1件（TC-015）
- **境界値**: 1件（TC-016）

---

**作成者**: Claude Code
**最終更新**: 2026-03-25
