# TASK-0013: HvacZoneRenderer Green Phase 記録

**タスクID**: TASK-0013
**フェーズ**: Green（最小実装・全テストパス）
**実施日**: 2026-03-25

---

## 1. 実装したファイル

| ファイルパス | 種別 | 説明 |
|-------------|------|------|
| `packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx` | 新規作成 | HvacZoneRenderer コンポーネントと純粋関数群 |
| `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` | 変更 | `case 'hvac_zone'` を `ZoneRenderer` にディスパッチ |

---

## 2. テスト実行結果

```
RUN  v4.1.0 C:/Users/畠中大地/web-bim-editor/packages/kuhl-viewer

 Test Files  1 passed (1)
       Tests  23 passed (23)
    Start at  08:25:51
    Duration  691ms (transform 282ms, setup 38ms, import 434ms, tests 13ms, environment 0ms)
```

全テストスイート（kuhl-viewer 全体）:

```
 Test Files  5 passed (5)
       Tests  58 passed (58)
    Start at  08:25:55
    Duration  1.96s
```

既存テストの破壊なし。

---

## 3. 実装内容

### zone-renderer.tsx エクスポート一覧

| エクスポート | 種別 | 説明 |
|-------------|------|------|
| `ZONE_COLOR_MAP` | 定数 | `Record<ZoneUsage, { color: string; opacity: number }>` — 全11種 |
| `isValidBoundary(boundary)` | 純粋関数 | 3点以上の配列かバリデーション |
| `boundaryToShape(boundary)` | 純粋関数 | `[number, number][]` → `THREE.Shape`（XY平面） |
| `getZoneColor(usage)` | 純粋関数 | usage 別カラーエントリを返す |
| `computeCentroid(boundary)` | 純粋関数 | ポリゴン重心 `[x, z]` を計算 |
| `ZoneRenderer` | R3F コンポーネント | props: `{ nodeId: AnyNodeId }` |

### 実装方針

- **純粋関数の分離**: `boundaryToShape`, `getZoneColor`, `computeCentroid`, `isValidBoundary` を純粋関数として抽出し、node 環境でのテスト可能性を確保。
- **コンポーネント分割**: `ZoneRenderer`（null ガード担当）と `ZoneRendererInner`（useMemo/useEffect 担当）に分割。
- **メモ化**: `THREE.Shape`, `THREE.ShapeGeometry`, `THREE.MeshBasicMaterial` を `useMemo` でメモ化。
- **sceneRegistry 登録/解除**: `useEffect` でマウント時に登録、アンマウント時に解除。
- **ZONE_LAYER**: `packages/kuhl-viewer/src/constants/layers.ts` から `ZONE_LAYER` をインポート（ハードコード禁止）。
- **座標系変換**: `rotation={[-Math.PI / 2, 0, 0]}` で ShapeGeometry（XY平面）を XZ平面（建築平面）に変換。
- **防御的実装**: `boundaryToShape` に `undefined`/空配列を渡した場合も例外を投げずに空の Shape を返す。

### node-renderer.tsx 変更内容

```tsx
// 変更前
case 'hvac_zone':
case 'ahu':
  ...
  return <FallbackRenderer nodeId={node.id} nodeType={node.type} />

// 変更後
case 'hvac_zone':
  return <ZoneRenderer nodeId={node.id} />

case 'ahu':
  ...
  return <FallbackRenderer nodeId={node.id} nodeType={node.type} />
```

---

## 4. テストケース通過確認

| TC-ID | テスト名 | 結果 |
|-------|---------|------|
| TC-001 | boundaryToShapeが4頂点の矩形からShapeを生成する | PASS |
| TC-002 | boundaryToShapeがmoveTo→lineTo→closePathの順序でShapeを構築する | PASS |
| TC-003 | getZoneColorがofficeに対して青系カラーを返す | PASS |
| TC-004 | getZoneColorがmeetingに対して緑系カラーを返す | PASS |
| TC-005 | getZoneColorがserver_roomに対して赤系カラーを返す | PASS |
| TC-006 | カラーマップが全11種のZoneUsageに対して定義されている | PASS |
| TC-007 | ShapeGeometryがXY平面上に生成される | PASS |
| TC-008 | computeCentroidがboundaryの重心座標を正しく計算する | PASS |
| TC-009 | カラーマップの全エントリが要件定義書の仕様と一致する | PASS |
| TC-010 | isValidBoundaryがundefined boundaryに対してfalseを返す | PASS |
| TC-011 | isValidBoundaryが空配列boundaryに対してfalseを返す | PASS |
| TC-012 | isValidBoundaryが1点boundaryに対してfalseを返す | PASS |
| TC-013 | isValidBoundaryが2点boundaryに対してfalseを返す | PASS |
| TC-014 | boundaryToShapeがundefined入力で例外を投げないこと | PASS |
| TC-015 | boundaryToShapeが3点（三角形）から有効なShapeを生成する | PASS |
| TC-016 | boundaryToShapeが大きなポリゴンから有効なShapeを生成する | PASS |
| TC-017 | computeCentroidが三角形の重心を正しく計算する | PASS |
| TC-018 | 全usageのopacityが0.3である | PASS |
| TC-019 | ZONE_LAYERが2であること | PASS |
| TC-020 | sceneRegistryにnodeIdでオブジェクトが登録される | PASS |
| TC-021 | sceneRegistry.byType.hvac_zoneにnodeIdが追加される | PASS |
| TC-022 | sceneRegistryからの登録解除が正しく動作する | PASS |
| - | 3点以上のboundaryにisValidBoundaryがtrueを返す | PASS |

合計: 23 / 23 PASS

---

## 5. 信頼性サマリー

| 信頼性 | 件数 |
|--------|------|
| 🔵 青信号 | 15 |
| 🟡 黄信号 | 4 |
| 🔴 赤信号 | 0 |
| **合計** | **19** （テスト定義と同数） |

---

## 6. 次のステップ（Refactor Phase）

- `ZoneRendererInner` の `useEffect` 依存配列の精査（`meshRef` はオブジェクト参照であるため安定性検討）
- ゾーンラベル表示（Drei `<Text>` コンポーネント）の実装（🟡 黄信号項目）
- イベントハンドラ（`useNodeEvents` フック）の共通化（🟡 黄信号項目）
- `geometry.dispose()` の useEffect クリーンアップタイミング最適化（boundary 変更時の旧ジオメトリ廃棄）
