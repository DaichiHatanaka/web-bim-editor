# equipment-renderer TDD開発完了記録

## 確認すべきドキュメント

- `docs/tasks/kuhl-hvac-editor/TASK-0021.md`
- `docs/implements/kuhl-hvac-editor/TASK-0021/requirements.md`
- `docs/implements/kuhl-hvac-editor/TASK-0021/testcases.md`

## 🎯 最終結果 (2026-03-25)
- **実装率**: 100% (22/22 テストケース)
- **品質判定**: 合格（全テストグリーン）
- **TODO更新**: ✅ 完了マーク追加（22テストケース全通過）

## 概要

- 機能名: equipment-renderer（EquipmentRenderer LOD100 ボックス表示）
- 開発開始: 2026-03-25
- 現在のフェーズ: **TDD完了（Verify Complete済み）**

## 関連ファイル

- 元タスクファイル: `docs/tasks/kuhl-hvac-editor/TASK-0021.md`
- 要件定義: `docs/implements/kuhl-hvac-editor/TASK-0021/requirements.md`
- テストケース定義: `docs/implements/kuhl-hvac-editor/TASK-0021/testcases.md`
- 実装ファイル（未作成）:
  - `packages/kuhl-viewer/src/constants/equipment-colors.ts`
  - `packages/kuhl-viewer/src/constants/port-styles.ts`
  - `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx`
  - `packages/kuhl-viewer/src/components/renderers/parts/tag-label.tsx`
  - `packages/kuhl-viewer/src/components/renderers/parts/port-markers.tsx`
- テストファイル: `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-renderer.test.tsx`

---

## Redフェーズ（失敗するテスト作成）

### 作成日時

2026-03-25

### テストケース概要

合計22件のテストケースを実装（目標10以上を達成）。

**純粋関数テスト（モック不要）**:
- `getEquipmentColor(type)`: 全13タイプのカラー取得、fallback値（#CCCCCC）
- `getPortColor(medium)`: 全12 medium のカラー取得、fallback値（#AAAAAA）
- `validateDimensions(dims)`: 有効/ゼロ/負の値の判定
- `BoxGeometry 生成`: 正常寸法・大きな寸法での生成確認

**コンポーネントテスト（モック必要）**:
- `TagLabel`: タグテキスト表示・空文字時の非表示
- `PortMarkers`: ポート数分のマーカー生成・空配列時の非表示・大量ポート対応
- `EquipmentRenderer`: 存在しないノードID時のnull返却・sceneRegistry登録/解除・TagLabel統合

**信頼性分布**: 🔵 16件 (73%), 🟡 6件 (27%)

### テスト実行結果（Redフェーズ確認）

```
FAIL  src/__tests__/components/renderers/equipment-renderer.test.tsx
Error: Failed to resolve import "../../../constants/equipment-colors"
  → 5つの実装ファイルが未作成のため正しく失敗（Redフェーズとして正常）

Test Files  1 failed (1)
Tests       no tests
Duration    1.48s
```

### モック設定

```typescript
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ scene: {...}, camera: {}, gl: {} })),
}))

vi.mock('@react-three/drei', () => ({
  Html: ({ children }) => <div data-testid="drei-html">{children}</div>,
  OrbitControls: () => null,
}))
```

### 期待される失敗

Greenフェーズで以下5ファイルを作成することでテストが通る：

1. `packages/kuhl-viewer/src/constants/equipment-colors.ts`
   - `EQUIPMENT_COLOR_MAP`（全13タイプ）
   - `EQUIPMENT_FALLBACK_COLOR = '#CCCCCC'`
   - `getEquipmentColor(type: string): string`

2. `packages/kuhl-viewer/src/constants/port-styles.ts`
   - `PORT_MEDIUM_COLOR_MAP`（全12 medium）
   - `PORT_FALLBACK_COLOR = '#AAAAAA'`
   - `getPortColor(medium: string): string`

3. `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx`
   - `validateDimensions([w,h,d]): boolean`（全て正の値のとき true）
   - `EquipmentRenderer: FC<{nodeId: AnyNodeId}>`
     - ノード不在時は null を返す
     - BoxGeometry(w,h,d) で描画
     - TagLabel と PortMarkers を子コンポーネントとして使用
     - sceneRegistry への登録/解除を useEffect で管理

4. `packages/kuhl-viewer/src/components/renderers/parts/tag-label.tsx`
   - `TagLabel: FC<{tag: string, offset: [number,number,number]}>`
     - tag 空文字時は null を返す
     - Drei Html でタグテキストを表示

5. `packages/kuhl-viewer/src/components/renderers/parts/port-markers.tsx`
   - `PortMarkers: FC<{ports: PortDef[]}>`
     - 空配列時は null を返す
     - 各ポートに球マーカー（radius: 0.05）を配置
     - medium → getPortColor() でカラー取得
     - direction で emissiveIntensity を分ける（in: 0.3, out: 0.6）

### 次のフェーズへの要求事項

- **Greenフェーズ**: 上記5ファイルを最小実装で作成し、全22テストをパスさせる
- 実装順序の推奨: constants → parts → equipment-renderer の順
- ZoneRenderer（`zone-renderer.tsx`）のパターンを踏襲する

---

## Greenフェーズ（最小実装）

### 実装日時

2026-03-25

### 実装方針

1. **フック呼び出し順序の遵守**: React Rules of Hooks により、`useMemo` / `useEffect` は early return より前に配置
   - `equipmentNode` 変数でノード有効性を判定し、フック内で null チェック
   - 実際の early return はフックの後に配置

2. **zone-renderer.tsx パターンの踏襲**
   - `useMemo` で geometry/material の再生成を最適化
   - `useEffect` で sceneRegistry 登録/解除とGPUメモリ解放

3. **実装順序**: constants → parts (tag-label, port-markers) → equipment-renderer の順で実施

### テスト結果

```
Test Files  1 passed (1)
      Tests  22 passed (22)
   Start at  12:47:51
   Duration  2.68s
```

全22テストが通過。

### 実装した関数・コンポーネント

| 実装 | ファイル | 概要 |
|------|---------|------|
| `EQUIPMENT_COLOR_MAP` | equipment-colors.ts | 全13種の機器タイプカラーマップ |
| `EQUIPMENT_FALLBACK_COLOR` | equipment-colors.ts | フォールバックカラー #CCCCCC |
| `getEquipmentColor(type)` | equipment-colors.ts | 機器タイプからカラー取得 |
| `PORT_MEDIUM_COLOR_MAP` | port-styles.ts | 全12 medium カラーマップ |
| `PORT_FALLBACK_COLOR` | port-styles.ts | フォールバックカラー #AAAAAA |
| `getPortColor(medium)` | port-styles.ts | medium からカラー取得 |
| `TagLabel` | tag-label.tsx | Drei Html を使った3Dラベル |
| `PortMarkers` | port-markers.tsx | ポート位置への球マーカー |
| `isEquipmentNode(node)` | equipment-renderer.tsx | 機器ノード型ガード |
| `validateDimensions(dims)` | equipment-renderer.tsx | 寸法値バリデーション |
| `EquipmentRenderer` | equipment-renderer.tsx | メインレンダラーコンポーネント |

### 課題・改善点（Refactorフェーズで対応）

1. `PortMarkersInner` コンポーネントの整理（不要なら削除）
2. `useScene` セレクタをコンポーネント外に切り出し
3. `node.type as keyof typeof sceneRegistry.byType` の型アサーション改善
4. PortMarkers の `SphereGeometry` 共有インスタンス化の最適化

---

## Refactorフェーズ（品質改善）

### リファクタ日時

2026-03-25

### 改善内容

| # | 改善内容 | 対象ファイル | 信頼性 |
|---|---------|------------|-------|
| 1 | Biome import 順序を自動修正（organizeImports） | equipment-renderer.tsx, port-markers.tsx, tag-label.tsx | 🔵 |
| 2 | Biome フォーマット自動修正（EQUIPMENT_COLOR_MAP の整列、Html props のインライン化） | equipment-colors.ts, tag-label.tsx | 🔵 |
| 3 | `isEquipmentNode` 内の `equipmentTypes` を `EQUIPMENT_TYPES` モジュールスコープ定数に引き上げ（関数呼び出しごとの Set 再生成を防止） | equipment-renderer.tsx | 🔵 |
| 4 | `PortMarkersInner` 内部コンポーネントを廃止し、`PortMarkers` 単体に統合。`useMemo` を early return の前に移動して React Hooks ルールに完全準拠 | port-markers.tsx | 🔵 |

### セキュリティレビュー

- 外部入力値は `useScene` Zustand セレクタ経由のみ。XSS/インジェクションの脆弱性なし 🔵
- TagLabel の `tag` はテキストノードとして描画されるため XSS リスクなし 🔵
- `apps/kuhl-editor` からのインポートなし（Viewer Isolation 準拠） 🔵

### パフォーマンスレビュー

- `EQUIPMENT_TYPES` 定数をモジュールスコープに配置し、`isEquipmentNode` 呼び出しごとの `new Set()` 生成を排除 🔵
- `SphereGeometry` を `useMemo` で1インスタンスに集約し、ポート数分の重複生成を防止 🔵
- `BoxGeometry` / `MeshStandardMaterial` は `useMemo` で依存値変更時のみ再生成 🔵

### テスト結果

```
Test Files  1 passed (1)
      Tests  22 passed (22)
   Start at  12:51:08
   Duration  2.79s
```

### 品質評価

| 評価基準 | 結果 |
|---------|------|
| テスト成功 | ✅ 22/22（リファクタ後も全通過） |
| Biome lint | ✅ エラー 0（6ファイルチェック済み） |
| Viewer Isolation | ✅ apps/kuhl-editor からのインポートなし |
| メモリ管理 | ✅ geometry.dispose(), material.dispose() あり |
| ファイルサイズ | ✅ 全ファイル 200行未満 |
| コード品質 | ✅ 不要な内部コンポーネント削除・定数最適化完了 |

**総合評価**: ✅ 高品質
