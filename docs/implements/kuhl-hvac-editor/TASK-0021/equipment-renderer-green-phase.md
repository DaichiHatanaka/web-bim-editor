# TASK-0021: EquipmentRenderer（LOD100 ボックス表示）- Greenフェーズ記録

**実施日**: 2026-03-25
**フェーズ**: Green（最小実装）
**ステータス**: 完了（22/22 テスト通過）

---

## 実装概要

TDD Greenフェーズとして、Redフェーズで作成した22個のテストを全て通す最小実装を行った。

---

## 実装ファイル一覧

| ファイル | 役割 | 行数 |
|---------|------|------|
| `packages/kuhl-viewer/src/constants/equipment-colors.ts` | 機器タイプ別カラーマップ定数 | ~50行 |
| `packages/kuhl-viewer/src/constants/port-styles.ts` | ポート medium 別カラーマップ定数 | ~55行 |
| `packages/kuhl-viewer/src/components/renderers/parts/tag-label.tsx` | TagLabel コンポーネント | ~65行 |
| `packages/kuhl-viewer/src/components/renderers/parts/port-markers.tsx` | PortMarkers コンポーネント | ~90行 |
| `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx` | EquipmentRenderer メインコンポーネント | ~175行 |

---

## 実装方針

### 1. フック呼び出し順序の遵守（React Rules of Hooks）

**問題**: 初期実装で `isEquipmentNode` チェック後に early return を設置していたため、
`useMemo` / `useEffect` がフック呼び出し後に配置されてしまい "Rendered fewer hooks than expected" エラーが発生。

**解決策**: フック（`useMemo`, `useEffect`）を全て early return の前に移動。
`equipmentNode` 変数を early return フラグとして使用し、フック内で null チェックを行う。

```typescript
// ✅ 正しい実装（フックをearly returnより前に配置）
const equipmentNode = isEquipmentNode(node) ? node : null
const geometry = useMemo(() => ..., [dimensions])  // フック：早期リターン前
const material = useMemo(() => ..., [node.type])   // フック：早期リターン前
useEffect(() => ..., [nodeId, equipmentNode])       // フック：早期リターン前

if (!equipmentNode) return null  // 早期リターンは最後
```

### 2. zone-renderer.tsx パターンの踏襲

- `useMemo` で geometry/material の再生成を最適化
- `useEffect` で sceneRegistry 登録/解除とGPUメモリ解放
- `useScene` で Zustand ストアからノードを取得

### 3. コンポーネント分割

- `TagLabel`: Drei Html を使った3Dラベル表示
- `PortMarkers`: ポート位置への球マーカー表示（空配列で null 返却）
- `EquipmentRenderer`: 上記を統合するメインコンポーネント

---

## テスト実行結果

```
Test Files  1 passed (1)
      Tests  22 passed (22)
   Start at  12:47:51
   Duration  2.68s
```

全22テストが通過。`stderr` の警告は JSDOM が R3F/Three.js 要素（`<mesh>`, `<group>`, `<meshStandardMaterial>`）を認識しないという環境上の警告であり、テスト結果には影響しない。

---

## リファクタリング候補（次フェーズ）

1. **PortMarkers の内部コンポーネント分離**: `PortMarkersInner` を削除してシンプル化
2. **useScene セレクタ最適化**: セレクタをコンポーネント外に切り出し
3. **TagLabel の position prop**: HTML position を Three.js group position で管理
4. **型安全性向上**: `node.type as keyof typeof sceneRegistry.byType` の型アサーション改善
5. **PortMarkers の SphereGeometry 共有**: `useMemo` を外に引き出してメモリ最適化

---

## 品質評価

| 評価基準 | 結果 |
|---------|------|
| テスト成功 | ✅ 22/22 |
| 実装シンプルさ | ✅ zone-renderer パターン踏襲 |
| ファイルサイズ | ✅ 全ファイル 800行未満 |
| モック使用 | ✅ 実装コードにモック・スタブなし |
| コンパイルエラー | ✅ なし |
| リファクタ箇所 | ✅ 明確に特定済み |

**総合評価**: ✅ 高品質
