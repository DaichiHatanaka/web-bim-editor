# TASK-0012: Redフェーズ記録 — Viewer基盤コンポーネント・Canvas・Grid

**タスクID**: TASK-0012
**機能名**: kuhl-hvac-editor
**フェーズ**: Red（失敗テスト作成）
**作成日**: 2026-03-24

---

## 1. 作成したテストケース一覧

| TC | テストファイル | テスト名 | 信頼性 | 状態 |
|----|--------------|---------|--------|------|
| TC-001 | `layers.test.ts` | SCENE_LAYERの値が0である | 🔵 | 失敗（未実装） |
| TC-002 | `layers.test.ts` | EDITOR_LAYERの値が1である | 🔵 | 失敗（未実装） |
| TC-003 | `layers.test.ts` | ZONE_LAYERの値が2である | 🔵 | 失敗（未実装） |
| TC-004 | `layers.test.ts` | レイヤー定数が全て異なる値を持つ | 🟡 | 失敗（未実装） |
| TC-014 | `layers.test.ts` | レイヤー定数が全てnumber型である | 🟡 | 失敗（未実装） |
| TC-015 | `layers.test.ts` | レイヤー定数がThree.jsの有効範囲内（0-31）にある | 🟡 | 失敗（未実装） |
| TC-016 | `layers.test.ts` | レイヤー定数が全て整数値である | 🟡 | 失敗（未実装） |
| TC-005 | `node-renderer.test.tsx` | NodeRendererがhvac_zoneノードに対してディスパッチする | 🟡 | 失敗（未実装） |
| TC-006 | `node-renderer.test.tsx` | NodeRendererがahuノードに対してディスパッチする | 🟡 | 失敗（未実装） |
| TC-007 | `node-renderer.test.tsx` | NodeRendererがplantノードに対してレンダリングしない | 🔵 | 失敗（未実装） |
| TC-008 | `node-renderer.test.tsx` | NodeRendererがbuildingノードに対してレンダリングしない | 🔵 | 失敗（未実装） |
| TC-009 | `node-renderer.test.tsx` | NodeRendererがlevelノードに対してレンダリングしない | 🔵 | 失敗（未実装） |
| TC-012 | `node-renderer.test.tsx` | 存在しないノードIDでNodeRendererがnullを返す | 🔵 | 失敗（未実装） |
| TC-013 | `node-renderer.test.tsx` | null/undefinedのnodeIdでNodeRendererがクラッシュしない | 🟡 | 失敗（未実装） |
| TC-017 | `node-renderer.test.tsx` | 全ノードタイプでNodeRendererがクラッシュしない | 🟡 | 失敗（未実装） |
| TC-010 | `viewer.test.tsx` | Viewerがchildren injectionで子コンポーネントを描画する | 🟡 | 失敗（未実装） |
| - | `viewer.test.tsx` | Viewerがchildrenなしでも正常にレンダリングされる | 🟡 | 失敗（未実装） |
| - | `viewer.test.tsx` | ViewerがR3F Canvas要素を含む | 🟡 | 失敗（未実装） |
| - | `viewer.test.tsx` | perf=trueの場合にStatsを表示する | 🟡 | 失敗（未実装） |
| - | `viewer.test.tsx` | perf=falseの場合にStatsを表示しない | 🟡 | 失敗（未実装） |

**合計テストケース数**: 20

**信頼性レベル分布**:
- 🔵 青信号: 7件（35%）— 既存実装・設計文書から直接確認済み
- 🟡 黄信号: 13件（65%）— R3F環境制約・設計文書からの推測を含む
- 🔴 赤信号: 0件

---

## 2. テストファイルの構成

### テストファイル一覧

| テストファイル | テスト対象（未実装） | テストフレームワーク |
|--------------|-----------------|----------------|
| `packages/kuhl-viewer/src/__tests__/constants/layers.test.ts` | `packages/kuhl-viewer/src/constants/layers.ts` | Vitest |
| `packages/kuhl-viewer/src/__tests__/components/renderers/node-renderer.test.tsx` | `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx` | Vitest + @testing-library/react |
| `packages/kuhl-viewer/src/__tests__/components/viewer.test.tsx` | `packages/kuhl-viewer/src/components/viewer.tsx` | Vitest + @testing-library/react |

---

## 3. テスト実行結果（Redフェーズ確認）

### layers.test.ts

```
FAIL src/__tests__/constants/layers.test.ts
Error: Cannot find module '../../constants/layers'
  → packages/kuhl-viewer/src/constants/layers.ts が未作成のため失敗
```

### node-renderer.test.tsx

```
FAIL src/__tests__/components/renderers/node-renderer.test.tsx
Error: Cannot find module '/src/components/renderers/node-renderer'
  → packages/kuhl-viewer/src/components/renderers/node-renderer.tsx が未作成のため失敗
```

### viewer.test.tsx

```
FAIL src/__tests__/components/viewer.test.tsx
Error: Cannot find module '/src/components/viewer'
  → packages/kuhl-viewer/src/components/viewer.tsx が未作成のため失敗
```

---

## 4. テスト実行コマンド

```bash
# レイヤー定数テスト
cd packages/kuhl-viewer && node ../../node_modules/vitest/vitest.mjs run --reporter=verbose src/__tests__/constants/layers.test.ts

# NodeRendererテスト
cd packages/kuhl-viewer && node ../../node_modules/vitest/vitest.mjs run --reporter=verbose src/__tests__/components/renderers/node-renderer.test.tsx

# Viewerテスト
cd packages/kuhl-viewer && node ../../node_modules/vitest/vitest.mjs run --reporter=verbose src/__tests__/components/viewer.test.tsx

# 全テスト（kuhl-viewerパッケージ）
cd packages/kuhl-viewer && node ../../node_modules/vitest/vitest.mjs run
```

---

## 5. Greenフェーズで実装すべき内容

### 5.1 `packages/kuhl-viewer/src/constants/layers.ts`

```typescript
export const SCENE_LAYER = 0   // 通常ジオメトリ（機器、ダクト、配管）
export const EDITOR_LAYER = 1  // エディタヘルパー（ポートマーカー、寸法線）
export const ZONE_LAYER = 2    // ゾーンオーバーレイ（半透明着色）
```

### 5.2 `packages/kuhl-viewer/src/components/renderers/fallback-renderer.tsx`

- BoxGeometry を使った FallbackRenderer コンポーネント
- 未実装のノードタイプに対してフォールバック表示

### 5.3 `packages/kuhl-viewer/src/components/renderers/node-renderer.tsx`

- `nodeId` を受け取り、`useScene` からノードを取得
- `node.type` に基づいてディスパッチ
  - `plant`, `building`, `level` → null
  - `hvac_zone` → （Phase 1: FallbackRenderer）
  - `ahu` 等の機器 → FallbackRenderer
  - その他 → FallbackRenderer
- nodeId が存在しない場合 → null を返す

### 5.4 `packages/kuhl-viewer/src/components/viewer.tsx`

- R3F Canvas をラップした Viewer コンポーネント
- props: `children`, `selectionManager`, `perf`
- 内部構成: Canvas, OrbitControls, Grid, AmbientLight, DirectionalLight, SceneRenderer, GPUDeviceWatcher
- `perf=true` の場合に Stats コンポーネントを表示

---

## 6. 品質評価

| 項目 | 評価 |
|------|------|
| テスト実行 | ✅ 実行可能で失敗することを確認済み |
| 期待値 | ✅ 明確で具体的 |
| アサーション | ✅ 適切（toBe, toBeNull, toEqual 等） |
| 実装方針 | ✅ 明確（既存 Pascal Viewer パターンに基づく） |
| 信頼性レベル | 🔵 35% / 🟡 65% / 🔴 0% |

**総合評価**: 高品質（実装方針が既存パターンに基づき明確。R3F環境制約によりモック化が必要な部分は🟡）
