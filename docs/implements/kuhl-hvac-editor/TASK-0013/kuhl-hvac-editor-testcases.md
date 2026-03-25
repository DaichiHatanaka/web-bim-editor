# TASK-0013: HvacZoneRenderer（半透明床面ポリゴン）テストケース定義書

**タスクID**: TASK-0013
**機能名**: kuhl-hvac-editor
**要件名**: HvacZoneRenderer -- boundary ポリゴンから半透明着色ゾーンを描画
**作成日**: 2026-03-25
**出力ファイル**: `docs/implements/kuhl-hvac-editor/TASK-0013/kuhl-hvac-editor-testcases.md`

---

## 4. 開発言語・フレームワーク

- **プログラミング言語**: TypeScript 5.9
  - **言語選択の理由**: プロジェクト全体がTypeScriptで統一されており、`@kuhl/viewer` パッケージも `tsconfig.json` で構成済み。Zod スキーマの型推論と合わせてテストの正確性を保証できる。
  - **テストに適した機能**: ZoneUsage のリテラル型による網羅性検証、boundary 配列の型安全な操作。
- **テストフレームワーク**: Vitest
  - **フレームワーク選択の理由**: `packages/kuhl-viewer/vitest.config.ts` が既に存在し、既存テスト（`layers.test.ts`, `node-renderer.test.tsx`）がVitestで記述済み。プロジェクト標準のテストランナー。
  - **テスト実行環境**: Node環境（`environment: 'node'`）を基本とする。boundary→Shape変換ロジック、カラーマップ参照、レイヤー設定は純粋関数として抽出し、Node環境で単体テスト可能にする。R3Fコンポーネントのレンダリングテストは限定的に行い、jsdom環境で実行する。
- **テスト方針**: R3F Canvas のレンダリングテストはモック化のコストが高いため、テスト対象ロジックを純粋関数として抽出し、単体テストを中心に構成する。具体的には以下の関数をエクスポートしてテストする:
  - `boundaryToShape(boundary)` -- boundary 配列から THREE.Shape を生成する純粋関数
  - `getZoneColor(usage)` -- usage からカラーマップを参照する純粋関数
  - `computeCentroid(boundary)` -- boundary の重心座標を計算する純粋関数
  - `isValidBoundary(boundary)` -- boundary の有効性を判定する純粋関数
- 🔵 **青信号**: 既存の `vitest.config.ts` 設定、`layers.test.ts` / `node-renderer.test.tsx` のテストパターンから確認済み

---

## テストファイル構成

| テストファイル | テスト対象 | 環境 |
|---------------|-----------|------|
| `packages/kuhl-viewer/src/__tests__/components/renderers/zone-renderer.test.ts` | boundary変換ロジック、カラーマップ、バリデーション（純粋関数） | node |
| `packages/kuhl-viewer/src/__tests__/components/renderers/zone-renderer-integration.test.tsx` | ZoneRendererコンポーネント統合テスト（限定的） | jsdom |

---

## 1. 正常系テストケース（基本的な動作）

### TC-001: boundary（4頂点の矩形）から ShapeGeometry を正しく生成する

- **テスト名**: boundaryToShapeが4頂点の矩形からShapeを生成する
  - **何をテストするか**: `boundaryToShape()` 関数が4頂点の矩形 boundary 配列から `THREE.Shape` を正しく生成すること
  - **期待される動作**: boundary の各座標が Shape のパス上の点として設定される
- **入力値**: `boundary = [[0, 0], [10, 0], [10, 5], [0, 5]]`
  - **入力データの意味**: 10m x 5m の矩形ゾーン。Level座標系の [x, z] 形式。最も基本的な4頂点ポリゴン
- **期待される結果**: `THREE.Shape` が生成され、`new THREE.ShapeGeometry(shape)` から得られるジオメトリの position 属性に4頂点以上の座標が含まれる（ShapeGeometry は三角形分割により頂点数が増える場合がある）
  - **期待結果の理由**: ShapeGeometry は Shape のパスから三角形メッシュを生成する。4頂点の矩形は2つの三角形に分割され、6頂点（重複含む）になる
- **テストの目的**: boundary→ShapeGeometry の基本変換パイプラインが動作すること
  - **確認ポイント**: Shape が生成されること、ShapeGeometry の頂点数が0でないこと、position 属性が存在すること
- 🔵 **青信号**: REQ-101、要件定義書 セクション2.2 boundary→ShapeGeometry変換仕様から確認済み

### TC-002: boundaryToShape が moveTo/lineTo/closePath の順序で Shape を構築する

- **テスト名**: boundaryToShapeがmoveTo→lineTo→closePathの順序でShapeを構築する
  - **何をテストするか**: 生成された Shape の curves（パスセグメント）が正しい数であること
  - **期待される動作**: 最初の点で moveTo、以降の点で lineTo、最後に closePath が呼ばれる
- **入力値**: `boundary = [[0, 0], [10, 0], [10, 5], [0, 5]]`
  - **入力データの意味**: 4頂点の標準矩形
- **期待される結果**: Shape の `currentPoint` が最初の点に戻っている（closePath による閉パス）。Shape の curves 配列の長さが boundary 点数に対応する
  - **期待結果の理由**: THREE.Shape は moveTo で開始点を設定し、lineTo でパスを構築、closePath で閉じるパターン。要件定義書 セクション2.2 に明記
- **テストの目的**: Shape 構築の順序と閉パスの正確性を保証する
  - **確認ポイント**: curves 配列の長さ、autoClose 状態
- 🔵 **青信号**: 要件定義書 セクション2.2 の変換処理仕様から確認済み

### TC-003: usage='office' に対して青系カラー（#4A90E2）が返される

- **テスト名**: getZoneColorがofficeに対して青系カラーを返す
  - **何をテストするか**: `getZoneColor('office')` が正しいカラーコードとopacityを返すこと
  - **期待される動作**: `{ color: '#4A90E2', opacity: 0.3 }` が返される
- **入力値**: `usage = 'office'`
  - **入力データの意味**: 最も一般的なゾーン用途。カラーマップの基本エントリ
- **期待される結果**: `{ color: '#4A90E2', opacity: 0.3 }`
  - **期待結果の理由**: 要件定義書 セクション2.3 のカラーマップ定義に基づく
- **テストの目的**: カラーマップの基本参照が正しく動作すること
  - **確認ポイント**: color が '#4A90E2'、opacity が 0.3
- 🔵 **青信号**: 要件定義書 セクション2.3 usage別カラーマップ定義から確認済み

### TC-004: usage='meeting' に対して緑系カラー（#7ED321）が返される

- **テスト名**: getZoneColorがmeetingに対して緑系カラーを返す
  - **何をテストするか**: `getZoneColor('meeting')` が正しいカラーコードとopacityを返すこと
  - **期待される動作**: `{ color: '#7ED321', opacity: 0.3 }` が返される
- **入力値**: `usage = 'meeting'`
  - **入力データの意味**: 会議室用途。office とは異なる色系統であることを確認
- **期待される結果**: `{ color: '#7ED321', opacity: 0.3 }`
  - **期待結果の理由**: 要件定義書 セクション2.3 のカラーマップ定義に基づく
- **テストの目的**: office 以外の usage でもカラーマップが正しく参照されること
  - **確認ポイント**: color が '#7ED321'、opacity が 0.3
- 🔵 **青信号**: 要件定義書 セクション2.3 usage別カラーマップ定義から確認済み

### TC-005: usage='server_room' に対して赤系カラー（#FF4757）が返される

- **テスト名**: getZoneColorがserver_roomに対して赤系カラーを返す
  - **何をテストするか**: `getZoneColor('server_room')` が正しいカラーコードとopacityを返すこと
  - **期待される動作**: `{ color: '#FF4757', opacity: 0.3 }` が返される
- **入力値**: `usage = 'server_room'`
  - **入力データの意味**: サーバー室用途。赤系は注意を要するエリアを視覚的に強調する
- **期待される結果**: `{ color: '#FF4757', opacity: 0.3 }`
  - **期待結果の理由**: 要件定義書 セクション2.3 のカラーマップ定義に基づく
- **テストの目的**: 異なる色系統の usage が正しくマッピングされること
  - **確認ポイント**: color が '#FF4757'、opacity が 0.3
- 🔵 **青信号**: 要件定義書 セクション2.3 usage別カラーマップ定義から確認済み

### TC-006: 全11種の ZoneUsage に対してカラーマップが定義されている

- **テスト名**: カラーマップが全11種のZoneUsageに対して定義されている
  - **何をテストするか**: `ZONE_COLOR_MAP` 定数が全ての ZoneUsage 値に対するエントリを持つこと
  - **期待される動作**: 11種全ての usage に対して color と opacity が定義されている
- **入力値**: ZoneUsage の全値: `['office', 'meeting', 'server_room', 'lobby', 'corridor', 'toilet', 'kitchen', 'warehouse', 'mechanical_room', 'electrical_room', 'other']`
  - **入力データの意味**: HvacZoneNode スキーマで定義された全 usage 列挙値
- **期待される結果**: 全 11 エントリが存在し、各エントリに `color`（string）と `opacity`（number）が含まれる
  - **期待結果の理由**: 未定義の usage がある場合、ランタイムエラーや undefined 参照が発生する。全値の網羅性を保証する
- **テストの目的**: カラーマップの網羅性を保証するガードテスト
  - **確認ポイント**: Object.keys の長さが 11、各エントリに color/opacity が存在
- 🔵 **青信号**: 要件定義書 セクション2.3 カラーマップ全定義、HvacZoneNode スキーマの ZoneUsage 列挙から確認済み

### TC-007: ShapeGeometry が XY 平面上に生成される（Z座標が0）

- **テスト名**: ShapeGeometryがXY平面上に生成される
  - **何をテストするか**: `boundaryToShape()` から生成した `ShapeGeometry` の全頂点の Z 座標が 0 であること
  - **期待される動作**: ShapeGeometry の position 属性の z 成分が全て 0
- **入力値**: `boundary = [[0, 0], [10, 0], [10, 5], [0, 5]]`
  - **入力データの意味**: 2D boundary を XY 平面上の Shape に変換する際、Z=0 で生成されること
- **期待される結果**: geometry.attributes.position の z 成分（stride 3 の 3番目）が全て 0
  - **期待結果の理由**: ShapeGeometry は XY 平面上に生成されるため Z=0。実際の XZ 平面への配置は mesh の回転（-PI/2）で行う
- **テストの目的**: 座標系変換の前提条件（XY 平面上の生成）を保証する
  - **確認ポイント**: 全頂点の z 座標が 0 であること
- 🔵 **青信号**: 要件定義書 セクション2.2 座標系変換仕様、セクション3.4 座標系制約から確認済み

### TC-008: ゾーンラベルの重心座標が正しく計算される

- **テスト名**: computeCentroidがboundaryの重心座標を正しく計算する
  - **何をテストするか**: `computeCentroid()` 関数が boundary 全頂点の平均座標を返すこと
  - **期待される動作**: 矩形 boundary の重心が中心座標になる
- **入力値**: `boundary = [[0, 0], [10, 0], [10, 5], [0, 5]]`
  - **入力データの意味**: 10m x 5m の矩形。重心は (5, 2.5)
- **期待される結果**: `[5, 2.5]`（全頂点の x, z 各成分の平均値）
  - **期待結果の理由**: 要件定義書 セクション2.7 で「boundary の重心座標（全頂点の平均値）」と定義
- **テストの目的**: ゾーンラベル配置位置の計算が正確であること
  - **確認ポイント**: x 成分の平均、z 成分の平均がそれぞれ正しいこと
- 🟡 **黄信号**: 要件定義書 セクション2.7 ゾーンラベル表示のスタイル詳細は実装時確定

### TC-009: 各 usage のカラーマップ値が要件定義と一致する

- **テスト名**: カラーマップの全エントリが要件定義書の仕様と一致する
  - **何をテストするか**: 全11種の usage に対するカラーコードと opacity が要件定義書 セクション2.3 の仕様と一致すること
  - **期待される動作**: 各 usage のカラーコードと opacity が仕様通り
- **入力値**: 全 ZoneUsage 値
  - **入力データの意味**: カラーマップの全エントリを網羅的に検証
- **期待される結果**:
  - `office`: `{ color: '#4A90E2', opacity: 0.3 }`
  - `meeting`: `{ color: '#7ED321', opacity: 0.3 }`
  - `server_room`: `{ color: '#FF4757', opacity: 0.3 }`
  - `lobby`: `{ color: '#A8A8A8', opacity: 0.3 }`
  - `corridor`: `{ color: '#C8C8C8', opacity: 0.3 }`
  - `toilet`: `{ color: '#9B59B6', opacity: 0.3 }`
  - `kitchen`: `{ color: '#F39C12', opacity: 0.3 }`
  - `warehouse`: `{ color: '#795548', opacity: 0.3 }`
  - `mechanical_room`: `{ color: '#34495E', opacity: 0.3 }`
  - `electrical_room`: `{ color: '#E74C3C', opacity: 0.3 }`
  - `other`: `{ color: '#BDC3C7', opacity: 0.3 }`
  - **期待結果の理由**: 要件定義書 セクション2.3 の仕様を忠実に実装していることの保証
- **テストの目的**: カラーマップの正確性を網羅的に検証する
  - **確認ポイント**: 全11エントリの color と opacity の値
- 🔵 **青信号**: 要件定義書 セクション2.3 のカラーマップ全定義から確認済み

---

## 2. 異常系テストケース（エラー・例外処理）

### TC-010: boundary が undefined の場合 isValidBoundary が false を返す

- **テスト名**: isValidBoundaryがundefined boundaryに対してfalseを返す
  - **何をテストするか**: `isValidBoundary(undefined)` が `false` を返すこと
  - **期待される動作**: undefined は有効なポリゴンを構成できないため false
- **入力値**: `boundary = undefined`
  - **入力データの意味**: HvacZoneNode の boundary はオプショナル（`z.array(...).optional()`）。boundary 未定義のゾーンは描画対象外
- **期待される結果**: `false`
  - **期待結果の理由**: 要件定義書 セクション4.2 EDGE-01: boundary が undefined の場合、メッシュを描画しない
- **テストの目的**: boundary 未定義時の安全なガード処理を保証する
  - **確認ポイント**: 例外が発生しないこと、false が返されること
- 🔵 **青信号**: 要件定義書 セクション4.2 EDGE-01 から確認済み

### TC-011: boundary が空配列の場合 isValidBoundary が false を返す

- **テスト名**: isValidBoundaryが空配列boundaryに対してfalseを返す
  - **何をテストするか**: `isValidBoundary([])` が `false` を返すこと
  - **期待される動作**: 空配列は有効なポリゴンを構成できないため false
- **入力値**: `boundary = []`
  - **入力データの意味**: 空の座標配列。頂点がないためポリゴンを形成できない
- **期待される結果**: `false`
  - **期待結果の理由**: 要件定義書 セクション4.2 EDGE-02: boundary が空配列の場合、メッシュを描画しない
- **テストの目的**: 空配列 boundary の安全なガード処理を保証する
  - **確認ポイント**: 例外が発生しないこと、false が返されること
- 🔵 **青信号**: 要件定義書 セクション4.2 EDGE-02 から確認済み

### TC-012: boundary が1点の場合 isValidBoundary が false を返す

- **テスト名**: isValidBoundaryが1点boundaryに対してfalseを返す
  - **何をテストするか**: `isValidBoundary([[0, 0]])` が `false` を返すこと
  - **期待される動作**: 1点ではポリゴンを構成できないため false
- **入力値**: `boundary = [[0, 0]]`
  - **入力データの意味**: 単一の点座標。面積を持つポリゴンを形成できない
- **期待される結果**: `false`
  - **期待結果の理由**: 要件定義書 セクション4.2 EDGE-03: 1点ではポリゴンを構成できない
- **テストの目的**: 点数不足 boundary のガード処理を保証する
  - **確認ポイント**: 例外が発生しないこと、false が返されること
- 🔵 **青信号**: 要件定義書 セクション4.2 EDGE-03 から確認済み

### TC-013: boundary が2点の場合 isValidBoundary が false を返す

- **テスト名**: isValidBoundaryが2点boundaryに対してfalseを返す
  - **何をテストするか**: `isValidBoundary([[0, 0], [10, 0]])` が `false` を返すこと
  - **期待される動作**: 2点は線分であり面積を持たないため false
- **入力値**: `boundary = [[0, 0], [10, 0]]`
  - **入力データの意味**: 2点の座標配列。線分を構成するが、面積を持たない
- **期待される結果**: `false`
  - **期待結果の理由**: 要件定義書 セクション4.2 EDGE-04: 2点ではポリゴンを構成できない（線分であり面積を持たない）
- **テストの目的**: 線分（2点）boundary のガード処理を保証する
  - **確認ポイント**: 例外が発生しないこと、false が返されること
- 🔵 **青信号**: 要件定義書 セクション4.2 EDGE-04 から確認済み

### TC-014: boundaryToShape に undefined を渡した場合の安全性

- **テスト名**: boundaryToShapeがundefined入力で例外を投げないこと
  - **何をテストするか**: `boundaryToShape()` に undefined が渡された場合、例外がスローされないこと（isValidBoundary でガードされる前提だが、防御的プログラミングとして検証）
  - **期待される動作**: null を返すか、空の Shape を返す（実装による）
- **入力値**: `boundary = undefined`
  - **入力データの意味**: 型安全性を超えた防御的テスト。isValidBoundary の前段でのガードが想定されるが、直接呼び出しされた場合の安全性
- **期待される結果**: 例外がスローされない
  - **期待結果の理由**: ランタイムエラーによるクラッシュを防止する防御的プログラミング
- **テストの目的**: 防御的プログラミングの観点で、不正入力に対するクラッシュ耐性を確認する
  - **確認ポイント**: try/catch で例外が捕捉されないこと
- 🟡 **黄信号**: 要件定義書に明示されていないが、既存 NodeRenderer パターンの防御的テストに倣う

---

## 3. 境界値テストケース

### TC-015: boundary が3点（最小有効ポリゴン）の場合 ShapeGeometry を生成する

- **テスト名**: boundaryToShapeが3点（三角形）から有効なShapeを生成する
  - **何をテストするか**: 最小有効ポリゴン（三角形、3点）から `THREE.Shape` が正しく生成されること
  - **期待される動作**: 3点の boundary から有効な ShapeGeometry が生成される
- **入力値**: `boundary = [[0, 0], [10, 0], [5, 8]]`
  - **入力データの意味**: 三角形。ポリゴンを構成できる最小点数（3点）。境界値
- **期待される結果**: `isValidBoundary()` が `true` を返し、`boundaryToShape()` が有効な Shape を生成し、`ShapeGeometry` の頂点数が0より大きい
  - **期待結果の理由**: 要件定義書 セクション4.2 EDGE-05: 3点以上であれば有効なポリゴン。最小有効ケースは三角形
- **テストの目的**: 最小有効ポリゴンの境界値テスト
  - **確認ポイント**: isValidBoundary が true、ShapeGeometry の頂点数 > 0
- 🔵 **青信号**: 要件定義書 セクション4.2 EDGE-05 から確認済み

### TC-016: 大きなポリゴン（100m x 100m = 10000m2 超）から ShapeGeometry を生成する

- **テスト名**: boundaryToShapeが大きなポリゴンから有効なShapeを生成する
  - **何をテストするか**: 非常に大きな boundary（1000m2 超）でも `boundaryToShape()` が正常に動作すること
  - **期待される動作**: 大きな座標値でも Shape/ShapeGeometry が正しく生成される
- **入力値**: `boundary = [[0, 0], [100, 0], [100, 100], [0, 100]]`
  - **入力データの意味**: 100m x 100m = 10,000m2 の大きなポリゴン。工場やデータセンター等の大規模施設を想定
- **期待される結果**: `boundaryToShape()` が有効な Shape を生成し、`ShapeGeometry` の頂点数が0より大きい。position 属性の最大値が 100 付近であること
  - **期待結果の理由**: Three.js の ShapeGeometry は座標値のスケールに制約がないため、大きな値でも正常に動作するはず
- **テストの目的**: 大規模ゾーンでの境界値テスト。座標値のオーバーフローや精度問題がないことを確認
  - **確認ポイント**: ShapeGeometry が生成されること、頂点座標値が入力と一致すること
- 🟡 **黄信号**: 要件定義書にサイズ上限の明示的な定義なし。NFR-001（100ゾーン同時描画で60fps）から合理的にテスト

### TC-017: 三角形の重心座標が正しく計算される

- **テスト名**: computeCentroidが三角形の重心を正しく計算する
  - **何をテストするか**: 3点（三角形）の boundary に対して `computeCentroid()` が正しい重心を返すこと
  - **期待される動作**: 3頂点の座標平均が返される
- **入力値**: `boundary = [[0, 0], [10, 0], [5, 8]]`
  - **入力データの意味**: 三角形。重心 = (5, 8/3) ≒ (5, 2.667)
- **期待される結果**: `[5, 8/3]`（x 平均 = (0+10+5)/3 = 5, z 平均 = (0+0+8)/3 ≒ 2.667）
  - **期待結果の理由**: 全頂点の平均値による重心計算
- **テストの目的**: 非矩形ポリゴンでの重心計算の正確性を検証する
  - **確認ポイント**: 浮動小数点の近似比較（toBeCloseTo）
- 🟡 **黄信号**: 要件定義書 セクション2.7 のラベル配置位置仕様

### TC-018: 全 opacity が 0.3 であること

- **テスト名**: 全usageのopacityが0.3である
  - **何をテストするか**: カラーマップの全エントリで opacity が統一的に 0.3 であること
  - **期待される動作**: 11種全ての opacity が 0.3
- **入力値**: 全 ZoneUsage 値
  - **入力データの意味**: カラーマップの opacity 一貫性を検証。全 usage で同一の opacity が適用される設計
- **期待される結果**: 全エントリの `opacity === 0.3`
  - **期待結果の理由**: 要件定義書 セクション2.3 で全 usage の opacity が 0.3 と統一的に定義されている
- **テストの目的**: opacity の一貫性ガードテスト。将来的に usage ごとに opacity を変える場合のリグレッション検出
  - **確認ポイント**: 全11エントリの opacity 値
- 🔵 **青信号**: 要件定義書 セクション2.3 カラーマップ全定義から確認済み

---

## 4. ZONE_LAYER 配置テストケース

### TC-019: ZONE_LAYER 定数が 2 であること（前提条件確認）

- **テスト名**: ZONE_LAYERが2であること
  - **何をテストするか**: ZoneRenderer が参照する ZONE_LAYER 定数の値が 2 であること
  - **期待される動作**: ZONE_LAYER === 2
- **入力値**: なし（定数の直接参照）
  - **入力データの意味**: ZoneRenderer の前提条件確認。TASK-0012 で定義済みの定数
- **期待される結果**: `ZONE_LAYER === 2`
  - **期待結果の理由**: 要件定義書 セクション2.4 で ZONE_LAYER に配置すると定義。TASK-0012 の layers.ts で ZONE_LAYER = 2 as const と定義済み
- **テストの目的**: ZoneRenderer が正しいレイヤー定数を参照していることの前提条件テスト
  - **確認ポイント**: 値が 2、型が number
- 🔵 **青信号**: packages/kuhl-viewer/src/constants/layers.ts から直接確認済み。TASK-0012 の TC-003 と重複するが、ZoneRenderer テストの文脈で再確認

---

## 5. sceneRegistry 登録テストケース

### TC-020: sceneRegistry.nodes に nodeId でオブジェクトを登録・取得できる

- **テスト名**: sceneRegistryにnodeIdでオブジェクトが登録される
  - **何をテストするか**: `sceneRegistry.nodes.set(nodeId, obj)` で登録した後、`sceneRegistry.nodes.get(nodeId)` で取得できること
  - **期待される動作**: set/get のラウンドトリップが成功する
- **入力値**: `nodeId = 'zone_test123'`, `obj = { type: 'Mesh' }`（モックオブジェクト）
  - **入力データの意味**: ZoneRenderer がマウント時に sceneRegistry に mesh 参照を登録する動作のシミュレーション
- **期待される結果**: `sceneRegistry.nodes.get('zone_test123') === obj`
  - **期待結果の理由**: 要件定義書 セクション2.5 の sceneRegistry 登録処理仕様
- **テストの目的**: sceneRegistry の基本的な登録・取得動作を確認する
  - **確認ポイント**: has() が true、get() が登録したオブジェクトと同一であること
- 🔵 **青信号**: 要件定義書 セクション2.5、既存 scene-registry.test.ts のパターンから確認済み

### TC-021: sceneRegistry.byType.hvac_zone に nodeId を追加・確認できる

- **テスト名**: sceneRegistry.byType.hvac_zoneにnodeIdが追加される
  - **何をテストするか**: `sceneRegistry.byType.hvac_zone.add(nodeId)` で追加した後、`has(nodeId)` が true を返すこと
  - **期待される動作**: タイプ別セットへの追加と確認が成功する
- **入力値**: `nodeId = 'zone_test456'`
  - **入力データの意味**: ZoneRenderer がマウント時にタイプ別 ID セットに追加する動作のシミュレーション
- **期待される結果**: `sceneRegistry.byType.hvac_zone.has('zone_test456') === true`
  - **期待結果の理由**: 要件定義書 セクション2.5 の sceneRegistry タイプ別登録仕様
- **テストの目的**: タイプ別セットの登録動作を確認する
  - **確認ポイント**: has() が true であること
- 🔵 **青信号**: 要件定義書 セクション2.5、既存 scene-registry.test.ts のパターンから確認済み

### TC-022: sceneRegistry からの登録解除が正しく動作する

- **テスト名**: sceneRegistryからの登録解除が正しく動作する
  - **何をテストするか**: `sceneRegistry.nodes.delete(nodeId)` と `sceneRegistry.byType.hvac_zone.delete(nodeId)` で登録解除した後、has() が false を返すこと
  - **期待される動作**: 登録解除後に get/has が false を返す
- **入力値**: 登録済み `nodeId = 'zone_test789'`
  - **入力データの意味**: ZoneRenderer がアンマウント時に登録を解除する動作のシミュレーション
- **期待される結果**: `sceneRegistry.nodes.has('zone_test789') === false` かつ `sceneRegistry.byType.hvac_zone.has('zone_test789') === false`
  - **期待結果の理由**: 要件定義書 セクション2.5 の解除処理仕様。GPUメモリリーク防止とスレッドセーフティのため
- **テストの目的**: アンマウント時の登録解除が正しく動作することを確認する
  - **確認ポイント**: delete 後に has() が false であること
- 🔵 **青信号**: 要件定義書 セクション2.5、既存 scene-registry.test.ts のパターンから確認済み

---

## 6. 統合テストケース（限定的 R3F コンポーネントテスト）

### TC-023: ZoneRenderer が boundary 未定義時に null を返す（コンポーネントレベル）

- **テスト名**: ZoneRendererがboundary未定義時にnullを返す
  - **何をテストするか**: boundary が undefined の HvacZoneNode に対して ZoneRenderer が何も描画しないこと
  - **期待される動作**: レンダリング結果が空（null）
- **入力値**: `nodeId` — boundary が undefined の HvacZoneNode の ID
  - **入力データの意味**: EDGE-01 のコンポーネントレベルでの動作確認
- **期待される結果**: `container.firstChild === null`
  - **期待結果の理由**: 要件定義書 セクション4.2 EDGE-01
- **テストの目的**: 純粋関数テスト（TC-010）のコンポーネント統合確認
  - **確認ポイント**: レンダリング結果が空であること
- 🟡 **黄信号**: R3F モック化が必要。node-renderer.test.tsx のモックパターンを踏襲

### TC-024: ZoneRenderer が存在しない nodeId に対して null を返す

- **テスト名**: ZoneRendererが存在しないnodeIdに対してnullを返す
  - **何をテストするか**: useScene に登録されていない nodeId が渡された場合に ZoneRenderer が安全に null を返すこと
  - **期待される動作**: レンダリング結果が空（null）
- **入力値**: `nodeId = 'zone_nonexistent' as AnyNodeId`
  - **入力データの意味**: 要件定義書 セクション4.2 EDGE-06: ノードが存在しない場合
- **期待される結果**: `container.firstChild === null`
  - **期待結果の理由**: 既存 NodeRenderer パターン（`if (!node) return null`）に従う
- **テストの目的**: 存在しないノードに対する安全性を保証する
  - **確認ポイント**: 例外がスローされないこと、レンダリング結果が空であること
- 🟡 **黄信号**: R3F モック化が必要。node-renderer.test.tsx の TC-012 パターンを踏襲

---

## テストケースサマリー

| TC-ID | カテゴリ | テスト対象 | テスト環境 | 信頼性 |
|-------|---------|-----------|-----------|--------|
| TC-001 | 正常系 | boundary→ShapeGeometry変換（4頂点） | node | 🔵 |
| TC-002 | 正常系 | Shape構築順序（moveTo/lineTo/closePath） | node | 🔵 |
| TC-003 | 正常系 | usage='office' カラーマップ | node | 🔵 |
| TC-004 | 正常系 | usage='meeting' カラーマップ | node | 🔵 |
| TC-005 | 正常系 | usage='server_room' カラーマップ | node | 🔵 |
| TC-006 | 正常系 | 全11種 ZoneUsage カラーマップ網羅性 | node | 🔵 |
| TC-007 | 正常系 | ShapeGeometry XY平面生成（Z=0） | node | 🔵 |
| TC-008 | 正常系 | ゾーンラベル重心座標計算 | node | 🟡 |
| TC-009 | 正常系 | 全カラーマップ値の仕様一致 | node | 🔵 |
| TC-010 | 異常系 | boundary undefined ガード | node | 🔵 |
| TC-011 | 異常系 | boundary 空配列ガード | node | 🔵 |
| TC-012 | 異常系 | boundary 1点ガード | node | 🔵 |
| TC-013 | 異常系 | boundary 2点ガード | node | 🔵 |
| TC-014 | 異常系 | boundaryToShape 防御的テスト | node | 🟡 |
| TC-015 | 境界値 | 3点（最小有効ポリゴン） | node | 🔵 |
| TC-016 | 境界値 | 大きなポリゴン（10000m2超） | node | 🟡 |
| TC-017 | 境界値 | 三角形の重心座標 | node | 🟡 |
| TC-018 | 境界値 | 全opacity一貫性（0.3） | node | 🔵 |
| TC-019 | レイヤー | ZONE_LAYER定数確認 | node | 🔵 |
| TC-020 | Registry | sceneRegistry 登録 | node | 🔵 |
| TC-021 | Registry | byType.hvac_zone 追加 | node | 🔵 |
| TC-022 | Registry | 登録解除 | node | 🔵 |
| TC-023 | 統合 | ZoneRenderer boundary未定義 | jsdom | 🟡 |
| TC-024 | 統合 | ZoneRenderer 存在しないnodeId | jsdom | 🟡 |

---

## 信頼性レベルサマリー

| カテゴリ | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|---------|-------|-------|-------|------|
| 正常系 | 8 | 1 | 0 | 9 |
| 異常系 | 4 | 1 | 0 | 5 |
| 境界値 | 2 | 2 | 0 | 4 |
| レイヤー | 1 | 0 | 0 | 1 |
| Registry | 3 | 0 | 0 | 3 |
| 統合 | 0 | 2 | 0 | 2 |
| **合計** | **18** | **6** | **0** | **24** |

### 全体評価

- **総テストケース数**: 24件
- 🔵 **青信号**: 18件 (75%)
- 🟡 **黄信号**: 6件 (25%)
- 🔴 **赤信号**: 0件 (0%)

**品質評価**: 高品質 -- 黄信号はR3Fコンポーネント統合テスト（jsdom モック化必要）、ラベル重心計算の詳細仕様未確定、防御的テスト、大規模ポリゴンの性能境界に起因する。純粋関数テスト中心の方針により、テストの安定性と実行速度を確保。

---

## エクスポート対象関数（テスタビリティのための設計）

ZoneRenderer コンポーネントから以下の純粋関数をエクスポートし、単体テスト可能にする:

```ts
// packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx

/** boundary 配列から THREE.Shape を生成する */
export function boundaryToShape(boundary: Array<[number, number]>): THREE.Shape

/** usage からカラーマップを参照する */
export function getZoneColor(usage: ZoneUsage): { color: string; opacity: number }

/** boundary の重心座標を計算する */
export function computeCentroid(boundary: Array<[number, number]>): [number, number]

/** boundary の有効性を判定する（3点以上で有効） */
export function isValidBoundary(boundary: Array<[number, number]> | undefined): boolean

/** usage 別カラーマップ定数 */
export const ZONE_COLOR_MAP: Record<ZoneUsage, { color: string; opacity: number }>
```
