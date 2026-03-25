# TASK-0012: Viewer基盤コンポーネント・Canvas・Grid テストケース定義書

**タスクID**: TASK-0012
**機能名**: kuhl-hvac-editor
**要件名**: Viewer基盤コンポーネント・Canvas・Grid
**作成日**: 2026-03-24
**出力ファイル**: `docs/implements/kuhl-hvac-editor/TASK-0012/kuhl-hvac-editor-testcases.md`

---

## 4. 開発言語・フレームワーク

- **プログラミング言語**: TypeScript 5.9
  - **言語選択の理由**: プロジェクト全体がTypeScriptで統一されており、`@kuhl/viewer` パッケージも `tsconfig.json` で構成済み。型安全性によりNode型のディスパッチの正確性を保証できる。
  - **テストに適した機能**: discriminated union による型絞り込みがNodeRendererのテスト記述を簡潔にする。
- **テストフレームワーク**: Vitest
  - **フレームワーク選択の理由**: `packages/kuhl-viewer/vitest.config.ts` が既に存在し、既存テスト（`use-viewer.test.ts`）がVitestで記述済み。プロジェクト標準のテストランナー。
  - **テスト実行環境**: Node環境（`environment: 'node'`）。R3Fコンポーネントのレンダリングテストはモック化で対応。レイヤー定数テストは純粋な単体テストとして実行。
- 🔵 **青信号**: 既存の `vitest.config.ts` と `use-viewer.test.ts` から確認済み

---

## テストファイル構成

| テストファイル | テスト対象 |
|---------------|-----------|
| `packages/kuhl-viewer/src/__tests__/constants/layers.test.ts` | レイヤー定数 |
| `packages/kuhl-viewer/src/__tests__/components/renderers/node-renderer.test.tsx` | NodeRendererディスパッチャー |
| `packages/kuhl-viewer/src/__tests__/components/viewer.test.tsx` | Viewerメインコンポーネント |

---

## 1. 正常系テストケース（基本的な動作）

### TC-001: レイヤー定数 SCENE_LAYER の値が 0 である

- **テスト名**: SCENE_LAYERの値が0である
  - **何をテストするか**: `SCENE_LAYER` 定数が正しい値 `0` でエクスポートされていること
  - **期待される動作**: `layers.ts` からインポートした `SCENE_LAYER` が数値 `0` を返す
- **入力値**: なし（定数の直接参照）
  - **入力データの意味**: 定数定義の検証のため、入力は不要
- **期待される結果**: `SCENE_LAYER === 0`
  - **期待結果の理由**: Three.jsのデフォルトレイヤー（レイヤー0）を通常ジオメトリ（機器、ダクト、配管）に使用する設計仕様
- **テストの目的**: レイヤー番号のハードコード禁止ルールの前提となる定数が正しく定義されていること
  - **確認ポイント**: 値が数値型であること、`0` であること
- 🔵 **青信号**: CLAUDE.md Three.jsレイヤー定義、要件定義書 セクション2.2、既存 `packages/viewer/src/lib/layers.ts` から確認済み

### TC-002: レイヤー定数 EDITOR_LAYER の値が 1 である

- **テスト名**: EDITOR_LAYERの値が1である
  - **何をテストするか**: `EDITOR_LAYER` 定数が正しい値 `1` でエクスポートされていること
  - **期待される動作**: `layers.ts` からインポートした `EDITOR_LAYER` が数値 `1` を返す
- **入力値**: なし（定数の直接参照）
  - **入力データの意味**: 定数定義の検証のため、入力は不要
- **期待される結果**: `EDITOR_LAYER === 1`
  - **期待結果の理由**: エディタヘルパー（ポートマーカー、寸法線）専用のレイヤーとして設計仕様で `1` と定義
- **テストの目的**: エディタ用レイヤーの定数が正しく分離されていること
  - **確認ポイント**: 値が数値型であること、`1` であること
- 🔵 **青信号**: CLAUDE.md Three.jsレイヤー定義、要件定義書 セクション2.2 から確認済み

### TC-003: レイヤー定数 ZONE_LAYER の値が 2 である

- **テスト名**: ZONE_LAYERの値が2である
  - **何をテストするか**: `ZONE_LAYER` 定数が正しい値 `2` でエクスポートされていること
  - **期待される動作**: `layers.ts` からインポートした `ZONE_LAYER` が数値 `2` を返す
- **入力値**: なし（定数の直接参照）
  - **入力データの意味**: 定数定義の検証のため、入力は不要
- **期待される結果**: `ZONE_LAYER === 2`
  - **期待結果の理由**: ゾーンオーバーレイ（半透明着色）用のレイヤーとして設計仕様で `2` と定義
- **テストの目的**: ゾーンレイヤーの定数が正しく分離されていること
  - **確認ポイント**: 値が数値型であること、`2` であること
- 🔵 **青信号**: CLAUDE.md Three.jsレイヤー定義、要件定義書 セクション2.2、既存 `packages/viewer/src/lib/layers.ts` から確認済み

### TC-004: 3つのレイヤー定数が全て異なる値を持つ

- **テスト名**: レイヤー定数が全て異なる値を持つ
  - **何をテストするか**: `SCENE_LAYER`、`EDITOR_LAYER`、`ZONE_LAYER` が全て異なる値であること
  - **期待される動作**: 3つの定数がそれぞれ異なる数値を持つ
- **入力値**: なし（3定数の比較）
  - **入力データの意味**: レイヤー値の一意性を検証
- **期待される結果**: `new Set([SCENE_LAYER, EDITOR_LAYER, ZONE_LAYER]).size === 3`
  - **期待結果の理由**: Three.jsレイヤーは重複するとオブジェクトが予期しないレイヤーに描画される。一意でなければレンダリングが破綻する
- **テストの目的**: レイヤー値の衝突を防止するガードテスト
  - **確認ポイント**: Set のサイズが3であること
- 🟡 **黄信号**: 要件定義書に明示的な「一意性制約」は記載されていないが、Three.jsレイヤーの仕組み上、一意であることが必須条件

### TC-005: NodeRenderer が hvac_zone タイプのノードに対して描画コンポーネントを返す

- **テスト名**: NodeRendererがhvac_zoneノードに対してディスパッチする
  - **何をテストするか**: `node.type === 'hvac_zone'` のノードIDが渡された場合、NodeRendererが適切なレンダラー（またはFallbackRenderer）を返すこと
  - **期待される動作**: NodeRendererが `hvac_zone` タイプを認識し、対応するコンポーネント（Phase 1では FallbackRenderer）をレンダリングする
- **入力値**: `nodeId` — useScene に `type: 'hvac_zone'` のノードが登録されたID
  - **入力データの意味**: 空調ゾーンは本エディタの中核ノードタイプであり、ディスパッチの基本動作を確認する
- **期待される結果**: null でないReact要素が返される（FallbackRenderer の BoxGeometry が描画される）
  - **期待結果の理由**: Phase 1段階ではHvacZoneRendererは未実装（TASK-0013）だが、FallbackRendererでフォールバック表示される設計
- **テストの目的**: NodeRendererのtype別ディスパッチ機構が動作すること
  - **確認ポイント**: nullが返されないこと、何らかのレンダラーコンポーネントが呼び出されること
- 🟡 **黄信号**: 要件定義書 セクション2.3 のディスパッチマッピングから推測。Phase 1段階でのFallbackRenderer適用は設計意図に基づく

### TC-006: NodeRenderer が ahu タイプのノードに対して描画コンポーネントを返す

- **テスト名**: NodeRendererがahuノードに対してディスパッチする
  - **何をテストするか**: `node.type === 'ahu'` のノードIDが渡された場合、NodeRendererがFallbackRenderer（Phase 1）を返すこと
  - **期待される動作**: NodeRendererが `ahu` タイプを認識し、FallbackRendererでフォールバック表示する
- **入力値**: `nodeId` — useScene に `type: 'ahu'` のノードが登録されたID
  - **入力データの意味**: AHU（エアハンドリングユニット）は空調機器の代表的なノードタイプ
- **期待される結果**: FallbackRenderer（BoxGeometry）が描画される
  - **期待結果の理由**: EquipmentRendererはTASK-0021で実装予定のため、Phase 1ではフォールバック
- **テストの目的**: 機器系ノードタイプのディスパッチが動作すること
  - **確認ポイント**: nullが返されないこと
- 🟡 **黄信号**: 要件定義書 セクション2.3 のディスパッチマッピングから推測

### TC-007: NodeRenderer が plant タイプのノードに対してレンダリングしない

- **テスト名**: NodeRendererがplantノードに対してレンダリングしない
  - **何をテストするか**: `node.type === 'plant'` のノードIDが渡された場合、NodeRendererがレンダリングを行わないこと
  - **期待される動作**: plantは階層構造ノードであり、3Dジオメトリを持たないため、レンダリングなし（null）
- **入力値**: `nodeId` — useScene に `type: 'plant'` のノードが登録されたID
  - **入力データの意味**: Plantは最上位の空間ノードで、可視的な3D表現を持たない
- **期待される結果**: レンダリング出力がnullまたは空のフラグメント
  - **期待結果の理由**: 要件定義書 セクション2.3 のディスパッチマッピングで `plant` は「レンダリングなし」と定義
- **テストの目的**: 非表示ノードタイプが正しくスキップされること
  - **確認ポイント**: 3Dオブジェクトが生成されないこと
- 🔵 **青信号**: 要件定義書 セクション2.3 で明確に「レンダリングなし」と定義

### TC-008: NodeRenderer が building タイプのノードに対してレンダリングしない

- **テスト名**: NodeRendererがbuildingノードに対してレンダリングしない
  - **何をテストするか**: `node.type === 'building'` のノードIDが渡された場合、レンダリングを行わないこと
  - **期待される動作**: buildingは階層構造ノードであり、3Dジオメトリを持たない
- **入力値**: `nodeId` — useScene に `type: 'building'` のノードが登録されたID
  - **入力データの意味**: Buildingは空間階層の中間ノード
- **期待される結果**: レンダリング出力がnullまたは空のフラグメント
  - **期待結果の理由**: 要件定義書 セクション2.3 で「レンダリングなし」と定義
- **テストの目的**: 非表示ノードタイプが正しくスキップされること
  - **確認ポイント**: 3Dオブジェクトが生成されないこと
- 🔵 **青信号**: 要件定義書 セクション2.3 で明確に「レンダリングなし」と定義

### TC-009: NodeRenderer が level タイプのノードに対してレンダリングしない

- **テスト名**: NodeRendererがlevelノードに対してレンダリングしない
  - **何をテストするか**: `node.type === 'level'` のノードIDが渡された場合、レンダリングを行わないこと
  - **期待される動作**: levelは階層構造ノードであり、3Dジオメトリを持たない
- **入力値**: `nodeId` — useScene に `type: 'level'` のノードが登録されたID
  - **入力データの意味**: Levelはフロアを表す空間階層ノード
- **期待される結果**: レンダリング出力がnullまたは空のフラグメント
  - **期待結果の理由**: 要件定義書 セクション2.3 で「レンダリングなし」と定義
- **テストの目的**: 非表示ノードタイプが正しくスキップされること
  - **確認ポイント**: 3Dオブジェクトが生成されないこと
- 🔵 **青信号**: 要件定義書 セクション2.3 で明確に「レンダリングなし」と定義

### TC-010: Viewer コンポーネントが children を受け取って描画する

- **テスト名**: Viewerがchildren injectionで子コンポーネントを描画する
  - **何をテストするか**: Viewerコンポーネントに `children` prop として渡された要素が、Canvas内部に描画されること
  - **期待される動作**: Viewer Isolation原則に基づき、外部から注入されたコンポーネントが3Dシーン内にマウントされる
- **入力値**: `<Viewer><TestChild /></Viewer>` の形式で子コンポーネントを渡す
  - **入力データの意味**: Viewer Isolation原則の核心であるchildren injection パターンの検証
- **期待される結果**: TestChildコンポーネントがレンダリングされる
  - **期待結果の理由**: REQ-009 Viewer Isolation原則により、エディタ固有機能はchildren経由で注入される設計
- **テストの目的**: children injection パターンが正しく動作すること
  - **確認ポイント**: 子コンポーネントのレンダリングが確認できること
- 🟡 **黄信号**: R3F Canvasのテスト環境制約により、完全なレンダリング検証はモック化が必要。要件定義書 UC-02 に基づく

### TC-011: FallbackRenderer が BoxGeometry で描画する

- **テスト名**: FallbackRendererがBoxGeometryで未実装ノードを描画する
  - **何をテストするか**: 未実装のノードタイプに対してFallbackRendererがBoxGeometryを使った3Dオブジェクトを表示すること
  - **期待される動作**: FallbackRendererが受け取ったノードのposition/rotationに基づいてBoxGeometryのmeshを生成する
- **入力値**: 任意のノードオブジェクト（position, rotation を含む）
  - **入力データの意味**: フォールバック表示のため、最小限のノード情報で動作することを確認
- **期待される結果**: BoxGeometry を持つ mesh 要素がレンダリングされる
  - **期待結果の理由**: 要件定義書 セクション2.3 で「その他/未実装 → FallbackRenderer（BoxGeometry）」と定義
- **テストの目的**: Phase 1段階で全ノードタイプが何らかの形で可視化されること
  - **確認ポイント**: meshが存在し、BoxGeometry型であること
- 🔵 **青信号**: 要件定義書 セクション2.3、タスク定義の完了条件から確認済み

---

## 2. 異常系テストケース（エラーハンドリング）

### TC-012: NodeRenderer に存在しないノードIDを渡した場合 null を返す

- **テスト名**: 存在しないノードIDでNodeRendererがnullを返す
  - **エラーケースの概要**: useScene に存在しない `nodeId` が NodeRenderer に渡された場合の動作
  - **エラー処理の重要性**: シーンからノードが削除された直後にレンダラーが呼び出されるタイミングのrace conditionを防止する
- **入力値**: `nodeId = 'nonexistent_node_abc123'`（useSceneに未登録のID）
  - **不正な理由**: useScene.nodes に該当エントリが存在しないため、`node` が `undefined` になる
  - **実際の発生シナリオ**: ノード削除直後のレンダリングサイクル、またはデータ不整合時
- **期待される結果**: `null` が返される（何も描画されない）
  - **エラーメッセージの内容**: エラーメッセージは不要（サイレントにスキップ）
  - **システムの安全性**: クラッシュせず、他のノードの描画に影響しない
- **テストの目的**: 不正なノードIDに対する安全なフォールバック
  - **品質保証の観点**: ランタイムエラーの防止、ユーザー体験の保護
- 🔵 **青信号**: 既存 `packages/viewer/src/components/renderers/node-renderer.tsx` の `if (!node) return null` パターンから確認済み。要件定義書 EDGE-UC-02 にも明記

### TC-013: NodeRenderer に null/undefined の nodeId を渡した場合の安全性

- **テスト名**: null/undefinedのnodeIdでNodeRendererがクラッシュしない
  - **エラーケースの概要**: `nodeId` が `null` や `undefined` で渡された場合にランタイムエラーが発生しないこと
  - **エラー処理の重要性**: TypeScript型で防げるが、JavaScript実行時の安全性を保証する
- **入力値**: `nodeId = undefined`、`nodeId = null`
  - **不正な理由**: 型定義上は string だが、実行時に不正な値が渡される可能性がある
  - **実際の発生シナリオ**: 親コンポーネントの状態遷移中に一時的にundefinedが渡されるケース
- **期待される結果**: `null` が返される（エラーが throw されない）
  - **エラーメッセージの内容**: なし（サイレントスキップ）
  - **システムの安全性**: 例外が発生せず、React Error Boundary がトリガーされない
- **テストの目的**: 防御的プログラミングの検証
  - **品質保証の観点**: 実行時安全性の保証
- 🟡 **黄信号**: 要件定義書には明示されていないが、既存NodeRendererパターンの `if (!node) return null` で暗黙的にカバーされる。防御的テストとして追加

### TC-014: レイヤー定数が number 型であること

- **テスト名**: レイヤー定数が全てnumber型である
  - **エラーケースの概要**: レイヤー定数が string や undefined で定義された場合、Three.js の `layers.set()` が予期しない動作をする
  - **エラー処理の重要性**: Three.jsレイヤーAPIは number を期待しており、型不一致は silent failure を引き起こす
- **入力値**: `SCENE_LAYER`, `EDITOR_LAYER`, `ZONE_LAYER` の各定数
  - **不正な理由**: 定数定義のリグレッション防止
  - **実際の発生シナリオ**: リファクタリング時に定数の型が変わるケース
- **期待される結果**: `typeof SCENE_LAYER === 'number'`、`typeof EDITOR_LAYER === 'number'`、`typeof ZONE_LAYER === 'number'`
  - **エラーメッセージの内容**: テスト失敗時に型の不一致を検出
  - **システムの安全性**: Three.jsレイヤーAPIとの互換性を保証
- **テストの目的**: 定数の型安全性を保証する
  - **品質保証の観点**: Three.jsとの結合時のsilent failureを防止
- 🟡 **黄信号**: 要件定義書に型制約の明示はないが、Three.jsレイヤーAPIの要件から妥当な推測

---

## 3. 境界値テストケース（最小値、最大値、null等）

### TC-015: レイヤー定数が 0 以上 31 以下の範囲内にある

- **テスト名**: レイヤー定数がThree.jsの有効範囲内（0-31）にある
  - **境界値の意味**: Three.js の `Layers` クラスは 0-31 のレイヤーのみをサポートする（32ビットマスク）
  - **境界値での動作保証**: 範囲外のレイヤー番号を指定すると Three.js が黙って無視する
- **入力値**: `SCENE_LAYER`, `EDITOR_LAYER`, `ZONE_LAYER` の各定数
  - **境界値選択の根拠**: Three.js の `Layers` クラスのソースコードで `0 <= layer <= 31` が有効範囲
  - **実際の使用場面**: `object3d.layers.set(SCENE_LAYER)` 等の呼び出しで使用される
- **期待される結果**: 全定数が `>= 0` かつ `<= 31`
  - **境界での正確性**: Three.jsレイヤーAPIの有効範囲内であること
  - **一貫した動作**: 範囲内であれば `layers.set()` が正常に動作する
- **テストの目的**: Three.jsレイヤーAPIとの互換性境界の保証
  - **堅牢性の確認**: 将来のレイヤー追加時に範囲逸脱を検出できる
- 🟡 **黄信号**: Three.js Layersクラスの内部実装（32ビットマスク）から推測。要件定義書には明示されていないが、Three.jsの技術的制約

### TC-016: レイヤー定数が整数値であること

- **テスト名**: レイヤー定数が全て整数値である
  - **境界値の意味**: Three.js の `Layers.set()` は整数のみをサポートする。小数値は予期しない動作を引き起こす
  - **境界値での動作保証**: 整数であれば `1 << layer` のビットシフト演算が正しく動作する
- **入力値**: `SCENE_LAYER`, `EDITOR_LAYER`, `ZONE_LAYER` の各定数
  - **境界値選択の根拠**: ビットマスク演算は整数のみ正しく動作する
  - **実際の使用場面**: `layers.set(layer)` 内部で `this.mask = 1 << layer` が実行される
- **期待される結果**: `Number.isInteger(SCENE_LAYER) === true` 等
  - **境界での正確性**: 整数判定が厳密であること
  - **一貫した動作**: 全定数が一貫して整数であること
- **テストの目的**: ビットマスク互換性の保証
  - **堅牢性の確認**: 定数変更時のリグレッション検出
- 🟡 **黄信号**: Three.js内部実装の技術的制約から推測

### TC-017: NodeRenderer が全24種のノードタイプに対してクラッシュしない

- **テスト名**: 全ノードタイプでNodeRendererがクラッシュしない
  - **境界値の意味**: AnyNode union の全24タイプに対して、未実装レンダラーも含めてNodeRendererが安全に動作すること
  - **境界値での動作保証**: 全ノードタイプに対して例外が発生しない
- **入力値**: AnyNodeType の全24タイプ（`plant`, `building`, `level`, `hvac_zone`, `ahu`, `pac`, `fcu`, `vrf_outdoor`, `vrf_indoor`, `diffuser`, `damper`, `fan`, `pump`, `chiller`, `boiler`, `cooling_tower`, `valve`, `duct_segment`, `duct_fitting`, `pipe_segment`, `pipe_fitting`, `system`, `support`, `architecture_ref`）
  - **境界値選択の根拠**: `packages/kuhl-core/src/schema/types.ts` の AnyNode discriminated union から全タイプを列挙
  - **実際の使用場面**: useScene にどのタイプのノードが追加されても、NodeRendererが安全に動作する必要がある
- **期待される結果**: 各タイプに対して、レンダリング結果がnull（非表示ノード）またはFallbackRenderer（未実装レンダラー）のいずれか
  - **境界での正確性**: 全タイプが漏れなくハンドリングされること
  - **一貫した動作**: 未知タイプは必ずFallbackRendererに到達すること
- **テストの目的**: ノードタイプの全網羅ディスパッチテスト
  - **堅牢性の確認**: 新しいノードタイプが追加された場合のフォールバック動作
- 🟡 **黄信号**: 要件定義書 セクション2.3 のディスパッチマッピングから推測。個別レンダラーは後続タスクで実装されるため、Phase 1では全てFallbackRendererまたはnullとなる

---

## 5. テストケース実装時の日本語コメント指針

### layers.test.ts のコメント例

```typescript
// 【テスト前準備】: レイヤー定数は純粋な定数エクスポートのため、セットアップ不要
// 【環境初期化】: テスト間の状態共有なし

describe('レイヤー定数', () => {
  // 【テスト目的】: Three.jsレイヤー番号の定数が正しい値で定義されていることを確認
  // 【テスト内容】: SCENE_LAYER, EDITOR_LAYER, ZONE_LAYER の各値と型を検証
  // 【期待される動作】: 設計仕様通りの定数値がエクスポートされること
  // 🔵 青信号

  it('SCENE_LAYER は 0 である', () => {
    // 【実際の処理実行】: 定数の直接参照
    // 【検証項目】: SCENE_LAYERの値が0であること
    // 🔵 青信号
    expect(SCENE_LAYER).toBe(0) // 【確認内容】: 通常ジオメトリ用レイヤーが0であることを確認
  })
})
```

### node-renderer.test.tsx のコメント例

```typescript
// 【テスト前準備】: useScene ストアにテスト用ノードを登録
// 【環境初期化】: 各テスト後にストアをリセット

beforeEach(() => {
  // 【テストデータ準備】: useScene にテスト用ノードを作成・登録
  // 【初期条件設定】: ストアをクリーンな状態にリセット
  // 【前提条件確認】: useScene が正常に動作すること
})

afterEach(() => {
  // 【テスト後処理】: useScene ストアをリセットし、テスト間の干渉を防止
  // 【状態復元】: ストアを初期状態に戻す
})

describe('NodeRenderer ディスパッチ', () => {
  // 【テスト目的】: node.type に基づいて適切なレンダラーが選択されることを確認
  // 【テスト内容】: 各ノードタイプに対するディスパッチ結果を検証
  // 【期待される動作】: 非表示タイプ→null、実装済みタイプ→対応Renderer、未実装タイプ→FallbackRenderer
  // 🟡 黄信号

  it('hvac_zone ノードに対してFallbackRendererが描画される', () => {
    // 【テストデータ準備】: hvac_zone タイプのノードをストアに追加
    // 【実際の処理実行】: NodeRenderer を nodeId 付きでレンダリング
    // 【結果検証】: FallbackRenderer（BoxGeometry）が描画されること
    // 🟡 黄信号
  })
})
```

### viewer.test.tsx のコメント例

```typescript
// 【テスト前準備】: R3F Canvas をモック化（Node環境ではWebGL/WebGPU不可）
// 【環境初期化】: vi.mock で @react-three/fiber をモック

describe('Viewer コンポーネント', () => {
  // 【テスト目的】: Viewer の初期レンダリングとchildren injection を確認
  // 【テスト内容】: Canvas要素の描画、children prop の受け渡し
  // 【期待される動作】: children として渡されたコンポーネントがCanvas内部に描画されること
  // 🟡 黄信号

  it('children を受け取って描画する', () => {
    // 【テストデータ準備】: テスト用の子コンポーネントを定義
    // 【実際の処理実行】: <Viewer><TestChild /></Viewer> をレンダリング
    // 【結果検証】: TestChild がレンダリングされていることを確認
    // 🟡 黄信号
  })
})
```

---

## 6. 要件定義との対応関係

- **参照した機能概要**: 要件定義書 セクション1 — Kuhl HVAC Editorの3Dビューポート基盤構築（R3F Canvas、WebGPUレンダラー、Grid、OrbitControls、レイヤー定数、NodeRendererディスパッチャー）
- **参照した入力・出力仕様**: 要件定義書 セクション2 — Viewerコンポーネントのprops（children, selectionManager, perf）、レイヤー定数（SCENE_LAYER=0, EDITOR_LAYER=1, ZONE_LAYER=2）、NodeRendererの入出力（nodeId → Renderer or null）
- **参照した制約条件**: 要件定義書 セクション3 — Viewer Isolation原則（REQ-009）、レイヤー番号ハードコード禁止、テスト60%カバレッジ、R3Fテスト環境制約
- **参照した使用例**: 要件定義書 セクション4 — UC-01（Viewer初期表示）、UC-02（children injection）、UC-03（NodeRendererディスパッチ）、EDGE-UC-02（存在しないノードID）

---

## テストケースサマリー

| テストID | カテゴリ | テスト名 | 信頼性 | テストファイル |
|---------|---------|---------|--------|--------------|
| TC-001 | 正常系 | SCENE_LAYERの値が0である | 🔵 | `layers.test.ts` |
| TC-002 | 正常系 | EDITOR_LAYERの値が1である | 🔵 | `layers.test.ts` |
| TC-003 | 正常系 | ZONE_LAYERの値が2である | 🔵 | `layers.test.ts` |
| TC-004 | 正常系 | レイヤー定数が全て異なる値を持つ | 🟡 | `layers.test.ts` |
| TC-005 | 正常系 | NodeRendererがhvac_zoneノードに対してディスパッチする | 🟡 | `node-renderer.test.tsx` |
| TC-006 | 正常系 | NodeRendererがahuノードに対してディスパッチする | 🟡 | `node-renderer.test.tsx` |
| TC-007 | 正常系 | NodeRendererがplantノードに対してレンダリングしない | 🔵 | `node-renderer.test.tsx` |
| TC-008 | 正常系 | NodeRendererがbuildingノードに対してレンダリングしない | 🔵 | `node-renderer.test.tsx` |
| TC-009 | 正常系 | NodeRendererがlevelノードに対してレンダリングしない | 🔵 | `node-renderer.test.tsx` |
| TC-010 | 正常系 | Viewerがchildren injectionで子コンポーネントを描画する | 🟡 | `viewer.test.tsx` |
| TC-011 | 正常系 | FallbackRendererがBoxGeometryで未実装ノードを描画する | 🔵 | `node-renderer.test.tsx` |
| TC-012 | 異常系 | 存在しないノードIDでNodeRendererがnullを返す | 🔵 | `node-renderer.test.tsx` |
| TC-013 | 異常系 | null/undefinedのnodeIdでNodeRendererがクラッシュしない | 🟡 | `node-renderer.test.tsx` |
| TC-014 | 異常系 | レイヤー定数が全てnumber型である | 🟡 | `layers.test.ts` |
| TC-015 | 境界値 | レイヤー定数がThree.jsの有効範囲内（0-31）にある | 🟡 | `layers.test.ts` |
| TC-016 | 境界値 | レイヤー定数が全て整数値である | 🟡 | `layers.test.ts` |
| TC-017 | 境界値 | 全ノードタイプでNodeRendererがクラッシュしない | 🟡 | `node-renderer.test.tsx` |

---

## 信頼性レベルサマリー

| カテゴリ | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|---------|-------|-------|-------|------|
| 正常系 | 6 | 5 | 0 | 11 |
| 異常系 | 1 | 2 | 0 | 3 |
| 境界値 | 0 | 3 | 0 | 3 |
| **合計** | **7** | **10** | **0** | **17** |

### 全体評価

- **総テストケース数**: 17件
- 🔵 **青信号**: 7件 (41%)
- 🟡 **黄信号**: 10件 (59%)
- 🔴 **赤信号**: 0件 (0%)

**品質評価**: 高品質 -- 黄信号は主に以下の理由による：
1. R3Fテスト環境の制約（Node環境でのCanvas描画テスト）によるモック化の推測
2. Phase 1段階でのNodeRendererディスパッチ先が全てFallbackRendererとなるため、個別レンダラーの検証は後続タスクに委ねる
3. Three.jsレイヤーAPIの技術的制約に基づく境界値テスト（ドキュメントではなく実装知識に基づく）

赤信号なし。全テストケースが要件定義書、既存実装パターン、または妥当な技術的推測に裏付けられている。
