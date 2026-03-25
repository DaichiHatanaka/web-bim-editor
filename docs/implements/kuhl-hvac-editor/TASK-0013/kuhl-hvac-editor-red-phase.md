# TASK-0013: HvacZoneRenderer Red Phase 記録

**タスクID**: TASK-0013
**フェーズ**: Red（テスト作成・失敗確認）
**実施日**: 2026-03-25

---

## 1. 作成したテストファイル

| ファイルパス | 種別 | テスト環境 |
|-------------|------|-----------|
| `packages/kuhl-viewer/src/__tests__/components/renderers/zone-renderer.test.ts` | 新規作成 | node |

## 2. テスト実行結果

```
RUN  v4.1.0 C:/Users/畠中大地/web-bim-editor/packages/kuhl-viewer

❯ src/__tests__/components/renderers/zone-renderer.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

FAIL  src/__tests__/components/renderers/zone-renderer.test.ts
Error: Cannot find module '../../../components/renderers/zone-renderer' imported from
C:/Users/畠中大地/web-bim-editor/packages/kuhl-viewer/src/__tests__/components/renderers/zone-renderer.test.ts

 Test Files  1 failed (1)
       Tests  no tests
    Start at  08:23:15
    Duration  683ms (transform 216ms, setup 30ms, import 0ms, tests 0ms, environment 0ms)
```

## 3. 失敗の原因

実装ファイル `packages/kuhl-viewer/src/components/renderers/zone-renderer.ts（.tsx）` が存在しないため、import 時にモジュール解決エラーが発生した。これは Red Phase として期待通りの動作。

## 4. テストケース一覧

| TC-ID | テスト名 | 対象関数 | 信頼性 |
|-------|---------|---------|--------|
| TC-001 | boundaryToShapeが4頂点の矩形からShapeを生成する | `boundaryToShape` | 🔵 |
| TC-002 | boundaryToShapeがmoveTo→lineTo→closePathの順序でShapeを構築する | `boundaryToShape` | 🔵 |
| TC-003 | getZoneColorがofficeに対して青系カラーを返す | `getZoneColor` | 🔵 |
| TC-004 | getZoneColorがmeetingに対して緑系カラーを返す | `getZoneColor` | 🔵 |
| TC-005 | getZoneColorがserver_roomに対して赤系カラーを返す | `getZoneColor` | 🔵 |
| TC-006 | カラーマップが全11種のZoneUsageに対して定義されている | `ZONE_COLOR_MAP` | 🔵 |
| TC-007 | ShapeGeometryがXY平面上に生成される | `boundaryToShape` | 🔵 |
| TC-008 | computeCentroidがboundaryの重心座標を正しく計算する | `computeCentroid` | 🟡 |
| TC-009 | カラーマップの全エントリが要件定義書の仕様と一致する | `getZoneColor` | 🔵 |
| TC-010 | isValidBoundaryがundefined boundaryに対してfalseを返す | `isValidBoundary` | 🔵 |
| TC-011 | isValidBoundaryが空配列boundaryに対してfalseを返す | `isValidBoundary` | 🔵 |
| TC-012 | isValidBoundaryが1点boundaryに対してfalseを返す | `isValidBoundary` | 🔵 |
| TC-013 | isValidBoundaryが2点boundaryに対してfalseを返す | `isValidBoundary` | 🔵 |
| TC-014 | boundaryToShapeがundefined入力で例外を投げないこと | `boundaryToShape` | 🟡 |
| TC-015 | boundaryToShapeが3点（三角形）から有効なShapeを生成する | `boundaryToShape` | 🔵 |
| TC-016 | boundaryToShapeが大きなポリゴンから有効なShapeを生成する | `boundaryToShape` | 🟡 |
| TC-017 | computeCentroidが三角形の重心を正しく計算する | `computeCentroid` | 🟡 |
| TC-018 | 全usageのopacityが0.3である | `ZONE_COLOR_MAP` | 🔵 |
| TC-019 | ZONE_LAYERが2であること | `ZONE_LAYER` | 🔵 |
| TC-020 | sceneRegistryにnodeIdでオブジェクトが登録される | `sceneRegistry` | 🔵 |
| TC-021 | sceneRegistry.byType.hvac_zoneにnodeIdが追加される | `sceneRegistry` | 🔵 |
| TC-022 | sceneRegistryからの登録解除が正しく動作する | `sceneRegistry` | 🔵 |

## 5. 実装時に必要なエクスポート

Green Phase で `packages/kuhl-viewer/src/components/renderers/zone-renderer.ts（.tsx）` に以下をエクスポートすること:

```typescript
// 純粋関数
export function boundaryToShape(boundary: [number, number][]): THREE.Shape
export function getZoneColor(usage: ZoneUsage): { color: string; opacity: number }
export function computeCentroid(boundary: [number, number][]): [number, number]
export function isValidBoundary(boundary: [number, number][] | undefined): boolean

// 定数
export const ZONE_COLOR_MAP: Record<ZoneUsage, { color: string; opacity: number }>

// コンポーネント（TC-023, TC-024 用）
export function ZoneRenderer(props: { nodeId: AnyNodeId }): React.ReactElement | null
```

## 6. 次のステップ（Green Phase）

1. `packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx` を作成する
2. 上記の純粋関数と定数をエクスポートする
3. `ZoneRenderer` R3F コンポーネントを実装する
4. `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` の `case 'hvac_zone':` を `ZoneRenderer` に切り替える
5. テストを全て PASS させる

## 7. 信頼性サマリー

| 信頼性 | 件数 |
|--------|------|
| 🔵 青信号 | 15 |
| 🟡 黄信号 | 4 |
| 🔴 赤信号 | 0 |
| **合計** | **19** |

（TC-019〜TC-022 は既存実装の確認であり、実装ファイル不在でも概念的には通過可能）
