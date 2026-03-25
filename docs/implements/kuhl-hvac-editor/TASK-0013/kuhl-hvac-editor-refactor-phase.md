# TASK-0013: HvacZoneRenderer Refactor Phase 記録

**タスクID**: TASK-0013
**フェーズ**: Refactor（コード品質向上・テスト全パス継続）
**実施日**: 2026-03-25

---

## 1. リファクタリング対象ファイル

| ファイルパス | 変更種別 |
|-------------|---------|
| `packages/kuhl-viewer/src/components/renderers/zone-renderer.tsx` | リファクタリング |

---

## 2. 変更内容

### 2.1 コンポーネント統合（ZoneRendererInner 削除）

**Before**: `ZoneRenderer`（null ガード）+ `ZoneRendererInner`（useMemo/useEffect）の2コンポーネント分割
**After**: `ZoneRenderer` 単一コンポーネントに統合

**理由**:
- Green Phase では「フックのルールを守るために条件付きフックを避けること」を目的にコンポーネント分割していた
- しかし全フックを条件分岐より前に宣言し、最後に `if (!geometry || !material) return null` とすることで1コンポーネントで対応可能
- `meshRef` の prop バケツ渡し（`ZoneRenderer` → `ZoneRendererInner`）が不要になった

### 2.2 useEffect 依存配列の修正

**Before**: `useEffect(() => { ... }, [nodeId, meshRef])`
**After**: `useEffect(() => { ... }, [nodeId])`

**理由**: `meshRef` は `useRef()` が返す安定したオブジェクト参照であり、依存配列に含める必要がない。含めることで誤解を招く。

### 2.3 import の最適化

**Before**: `import React, { useEffect, useMemo, useRef } from 'react'`（`React.FC` 型を使用）
**After**:
```ts
import type { FC } from 'react'
import { useEffect, useMemo, useRef } from 'react'
```

**理由**: React 17+ の JSX transform では `import React` が不要。`FC` 型のみ named import で取得することでビルド成果物のサイズを最適化。

### 2.4 境界条件ロジックの統一

**Before**: `ZoneRenderer` 内で `node.type !== 'hvac_zone'` と `isValidBoundary(boundary)` を別々にチェックして early return
**After**: `boundary` 変数に null を代入するパターンで useMemo・返り値を統一制御

```ts
const boundary = (node?.type === 'hvac_zone' && isValidBoundary(node.boundary)
  ? (node.boundary as [number, number][])
  : null)
```

**理由**: null ガードを一箇所に集約することで、後続の `useMemo` が `null` を扱うだけでよくなり、コードの流れが線形になった。

### 2.5 コメントの削減

**Before**: 各関数・各ステートメントに `🔵 青信号: 要件定義書 セクションX.X ...` などのフェーズ管理コメントが大量に付加されていた
**After**: 実装意図を1行で説明する簡潔なコメントのみ残留

**理由**: Green Phase のフェーズ管理コメントはリファクタリング後は不要。コードの可読性を下げる冗長コメントを削除。

---

## 3. テスト実行結果

### zone-renderer.test.ts 単体

```
RUN  v4.1.0 C:/Users/畠中大地/web-bim-editor/packages/kuhl-viewer

 Test Files  1 passed (1)
       Tests  23 passed (23)
    Start at  08:39:17
    Duration  727ms
```

### kuhl-viewer 全体テスト

```
 Test Files  5 passed (5)
       Tests  58 passed (58)
    Start at  08:39:32
    Duration  1.87s
```

既存テストの破壊なし。

---

## 4. Biome Lint 結果

```
Checked 1 file in 87ms. No fixes applied.
```

lint 違反なし。

---

## 5. コード量の変化

| 指標 | Before (Green) | After (Refactor) |
|------|---------------|-----------------|
| 行数 | 197行 | 152行 |
| コンポーネント数 | 2（ZoneRenderer + ZoneRendererInner） | 1（ZoneRenderer） |
| useEffect 数 | 2 | 2（同数。役割は変わらず） |
| 冗長コメント | 大量 | 必要最小限 |

---

## 6. リファクタリングしなかった点

- **`ZoneRendererInner` の分割パターンを止めた理由の補足**: useMemo/useEffect を条件分岐後に配置することはフックのルール違反だが、null を返す前に全フックを呼び出すパターンは React ルールに準拠している
- **`geometry.dispose()` の useEffect 分離**: geometry/material 変更時（useMemo 再計算時）の古いオブジェクトの解放は、この useEffect のクリーンアップとして正しく機能しているため変更しない
- **`onUpdate` でレイヤー設定**: `mesh.layers.set(ZONE_LAYER)` を onUpdate コールバックで実行するパターンは、R3F の標準的なレイヤー設定パターンとして維持

---

## 7. 信頼性サマリー

| 確認項目 | 結果 |
|---------|------|
| テスト全パス | 23 / 23（zone-renderer）, 58 / 58（全体） |
| biome lint | 違反なし |
| 機能追加なし | 確認済み（リファクタリングのみ） |
| コード量削減 | 197行 → 152行（−45行） |
