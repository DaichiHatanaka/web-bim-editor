# TASK-0012: Greenフェーズ記録 — Viewer基盤コンポーネント・Canvas・Grid

**タスクID**: TASK-0012
**機能名**: kuhl-hvac-editor
**フェーズ**: Green（最小実装）
**実装日**: 2026-03-25

---

## 1. 実装ファイル一覧

| ファイルパス | 種別 | 行数 |
|-------------|------|------|
| `packages/kuhl-viewer/src/constants/layers.ts` | 新規作成 | 17行 |
| `packages/kuhl-viewer/src/components/renderers/fallback-renderer.tsx` | 新規作成 | 42行 |
| `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` | 新規作成 | 82行 |
| `packages/kuhl-viewer/src/components/viewer.tsx` | 新規作成 | 76行 |
| `packages/kuhl-viewer/vitest.config.ts` | 更新 | 17行 |
| `packages/kuhl-viewer/src/__tests__/components/renderers/node-renderer.test.tsx` | 更新（AhuNodeフィールド修正 + jsdom環境設定） | - |
| `packages/kuhl-viewer/src/__tests__/components/viewer.test.tsx` | 更新（jsdom環境設定追加） | - |

---

## 2. 実装コード全文

### 2.1 `packages/kuhl-viewer/src/constants/layers.ts`

```typescript
/**
 * 【機能概要】: Three.jsレイヤー番号の定数定義
 * 【実装方針】: レイヤー番号のハードコードを禁止するため、名前付き定数としてエクスポートする
 * 🔵 青信号: CLAUDE.md Three.jsレイヤー定義から確認済み
 */
export const SCENE_LAYER = 0   // 通常ジオメトリ用レイヤー番号（0 = Three.js デフォルト）
export const EDITOR_LAYER = 1  // エディタヘルパー用レイヤー番号
export const ZONE_LAYER = 2    // ゾーンオーバーレイ用レイヤー番号
```

### 2.2 `packages/kuhl-viewer/src/components/renderers/fallback-renderer.tsx`

```typescript
export const FallbackRenderer: React.FC<FallbackRendererProps> = ({ nodeId, nodeType }) => {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#888888" wireframe />
    </mesh>
  )
}
```

### 2.3 `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx`

```typescript
export const NodeRenderer: React.FC<NodeRendererProps> = ({ nodeId }) => {
  if (!nodeId) return null

  const node = useScene.getState().nodes[nodeId]
  if (!node) return null

  switch (node.type) {
    case 'plant':
    case 'building':
    case 'level':
      return null
    default:
      return <FallbackRenderer nodeId={node.id} nodeType={node.type} />
  }
}
```

### 2.4 `packages/kuhl-viewer/src/components/viewer.tsx`

```typescript
export const Viewer: React.FC<ViewerProps> = ({ children, selectionManager, perf = false }) => {
  return (
    <Canvas camera={{ position: [50, 50, 50], fov: 50 }} dpr={[1, 1.5]} shadows>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.0} castShadow />
      <Grid infiniteGrid cellSize={1} sectionSize={10} fadeDistance={200} />
      <OrbitControls />
      {perf && <Stats />}
      {children}
    </Canvas>
  )
}
```

---

## 3. 実装方針と判断理由

### 3.1 vitest.config.ts の環境設定変更

**問題**: Redフェーズで作成されたテストコードが `@testing-library/react` を使用しているが、vitest.config.ts の `environment: 'node'` では `document` が存在しないためテストが失敗する。

**解決策**: テストファイルの先頭に `// @vitest-environment jsdom` コメントを追加し、`.tsx` テストファイルのみ jsdom 環境で実行するようにした。これにより既存の `use-viewer.test.ts`（node環境）には影響を与えない。

### 3.2 AhuNodeテストデータの修正

**問題**: Redフェーズで作成されたテストコードの `AhuNode.parse()` が `name`, `equipmentTag` を渡していたが、実際の `HvacEquipmentBase` スキーマでは `tag`, `equipmentName`, `dimensions`, `lod`, `status` が必須フィールドである。

**解決策**: テストコードの `AhuNode.parse()` 呼び出しを実際のスキーマに合わせて修正した。

### 3.3 NodeRendererのimportパス

`@kuhl/core` はサブパスエクスポート（`@kuhl/core/store/use-scene`）を公開していないため、メインエントリ `@kuhl/core` からインポートする。

---

## 4. テスト実行結果

```
Test Files  4 passed (4)
     Tests  35 passed (35)
   Start at  07:53:35
   Duration  2.43s
```

| テストファイル | 結果 | テスト数 |
|--------------|------|---------|
| `layers.test.ts` | ✅ 全通過 | 7/7 |
| `node-renderer.test.tsx` | ✅ 全通過 | 8/8 |
| `viewer.test.tsx` | ✅ 全通過 | 5/5 |
| `use-viewer.test.ts`（既存） | ✅ 全通過 | 15/15 |

---

## 5. 課題・改善点（Refactorフェーズで対応）

### 5.1 NodeRenderer の Hook Rules 警告

現在の `NodeRenderer` は `useScene.getState()` を同期的に呼び出しているが、React Hook として `useScene()` を使う方が適切。ただし、テストでは R3F Canvas 外でコンポーネントをレンダリングしているため、`useScene()` Hook を使うと `useFrame` コンテキスト外エラーが発生するリスクがある。

**Refactorで対応**: `useScene((state) => state.nodes[nodeId])` を使ったReactive更新へのリファクタリング。

### 5.2 FallbackRendererのjsdom環境での警告

`<boxGeometry>`, `<meshBasicMaterial>`, `<mesh>` はjsdom環境では認識されないため、コンソールに警告が出る。これはThree.js JSX要素がブラウザDOM要素ではないためであり、動作には問題ない。

**Refactorで対応**: テスト時のみ FallbackRenderer をモック化するか、R3F テストレンダラーを使用する。

### 5.3 vitest.config.ts の environmentMatchGlobs

`environmentMatchGlobs` 設定を試みたが、vitest 4.1.0 では機能しなかった（ファイルコメントでの指定に変更）。

---

## 6. 品質評価

| 項目 | 評価 |
|------|------|
| テスト結果 | ✅ 全35テスト通過 |
| 実装品質 | ✅ シンプル・動作する |
| ファイルサイズ | ✅ 全て800行以下 |
| モック使用 | ✅ 実装コードにモック・スタブなし |
| コンパイルエラー | ✅ なし |
| リファクタ箇所 | 明確（NodeRenderer Hook化、FallbackRendererモック改善） |

**総合評価**: ✅ 高品質
