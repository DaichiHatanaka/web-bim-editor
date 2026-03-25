# TASK-0021: EquipmentRenderer（LOD100 ボックス表示）- Redフェーズ記録

**作成日**: 2026-03-25
**タスクID**: TASK-0021
**フェーズ**: Red（失敗するテスト作成完了）
**テストファイル**: `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-renderer.test.tsx`

---

## 作成したテストケース一覧

| ID | テスト名 | 対象 | 信頼性 | 優先度 |
|----|---------|------|-------|-------|
| TC-HP-002 | 全13タイプのカラーが正しく返される | getEquipmentColor | 🔵 | P0 |
| TC-HP-003 | 未知タイプでフォールバックカラーが返される | getEquipmentColor | 🔵 | P1 |
| TC-HP-006 | 全12 medium のカラーが正しく返される | getPortColor | 🔵 | P0 |
| TC-ERR-012 | 未知 medium でフォールバックカラーが返される | getPortColor | 🔵 | P1 |
| TC-HP-001 | 有効な dimensions で true を返す | validateDimensions | 🔵 | P0 |
| TC-ERR-009 | ゼロ dimensions で false を返す | validateDimensions | 🔵 | P1 |
| TC-EDGE-014 | 負の dimensions で false を返す | validateDimensions | 🔵 | P1 |
| TC-EDGE-013 | 大きな dimensions で true を返す | validateDimensions | 🟡 | P2 |
| TC-HP-001b | BoxGeometry が正しい寸法で生成される（Three.js直接） | BoxGeometry | 🔵 | P0 |
| TC-EDGE-013b | 大きな dimensions でも BoxGeometry が正常生成 | BoxGeometry | 🟡 | P2 |
| TC-HP-004 | tag テキストが表示される | TagLabel | 🔵 | P0 |
| TC-ERR-011 | 空文字 tag で TagLabel が描画されない | TagLabel | 🔵 | P1 |
| TC-HP-005 | ポート数分の球メッシュが生成される | PortMarkers | 🔵 | P0 |
| TC-ERR-010 | 空 ports 配列で何も描画されない | PortMarkers | 🔵 | P1 |
| TC-EDGE-015 | 20個以上のポートが正常に描画される | PortMarkers | 🟡 | P2 |
| TC-SUP-016 | 存在しないノードIDで null が返される | EquipmentRenderer | 🔵 | P1 |
| TC-HP-007 | マウント時に sceneRegistry に登録される | sceneRegistry統合 | 🟡 | P0 |
| TC-SUP-017 | アンマウント時に sceneRegistry から削除される | sceneRegistry統合 | 🟡 | P0 |
| TC-HP-004b | TagLabel が tag テキストを表示する（EquipmentRenderer統合） | EquipmentRenderer | 🔵 | P0 |
| TC-ERR-011b | 空文字 tag で TagLabel 非表示（EquipmentRenderer統合） | EquipmentRenderer | 🔵 | P1 |
| sceneReg-1 | sceneRegistry.nodes への手動操作テスト | sceneRegistry | 🔵 | P0 |
| sceneReg-2 | sceneRegistry.byType.ahu への操作テスト | sceneRegistry | 🔵 | P0 |

**合計**: 22テストケース（目標10以上を達成）
**信頼性分布**: 🔵 16件 (73%), 🟡 6件 (27%)

---

## 実装ファイル一覧（Greenフェーズで作成すべき）

| ファイル | 主な責務 |
|---------|---------|
| `packages/kuhl-viewer/src/constants/equipment-colors.ts` | EQUIPMENT_COLOR_MAP, EQUIPMENT_FALLBACK_COLOR, getEquipmentColor() |
| `packages/kuhl-viewer/src/constants/port-styles.ts` | PORT_MEDIUM_COLOR_MAP, PORT_FALLBACK_COLOR, getPortColor() |
| `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx` | EquipmentRenderer コンポーネント, validateDimensions(), isEquipmentNode() |
| `packages/kuhl-viewer/src/components/renderers/parts/tag-label.tsx` | TagLabel コンポーネント（Drei Html 使用） |
| `packages/kuhl-viewer/src/components/renderers/parts/port-markers.tsx` | PortMarkers コンポーネント（球マーカー）|

---

## テストが失敗する理由（期待される失敗）

```
Error: Failed to resolve import "../../../constants/equipment-colors"
  → packages/kuhl-viewer/src/constants/equipment-colors.ts が未作成

Error: Failed to resolve import "../../../constants/port-styles"
  → packages/kuhl-viewer/src/constants/port-styles.ts が未作成

Error: Failed to resolve import "../../../components/renderers/equipment-renderer"
  → packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx が未作成

Error: Failed to resolve import "../../../components/renderers/parts/tag-label"
  → packages/kuhl-viewer/src/components/renderers/parts/tag-label.tsx が未作成

Error: Failed to resolve import "../../../components/renderers/parts/port-markers"
  → packages/kuhl-viewer/src/components/renderers/parts/port-markers.tsx が未作成
```

---

## テスト実行結果（Redフェーズ確認）

```
FAIL  src/__tests__/components/renderers/equipment-renderer.test.tsx
Error: Failed to resolve import "../../../constants/equipment-colors"
  Plugin: vite:import-analysis
  → 実装ファイルが存在しないため正しく失敗している（Redフェーズとして正常）

Test Files  1 failed (1)
Tests       no tests
Start at    12:41:54
Duration    1.48s
```

---

## Greenフェーズで実装すべき内容

### 1. `packages/kuhl-viewer/src/constants/equipment-colors.ts`

```typescript
export const EQUIPMENT_COLOR_MAP: Record<string, string> = {
  ahu: '#4A90E2',
  pac: '#7ED321',
  fcu: '#F39C12',
  vrf_outdoor: '#2C3E50',
  vrf_indoor: '#3498DB',
  diffuser: '#E74C3C',
  damper: '#95A5A6',
  fan: '#9B59B6',
  pump: '#1ABC9C',
  chiller: '#27AE60',
  boiler: '#E67E22',
  cooling_tower: '#16A085',
  valve: '#34495E',
}
export const EQUIPMENT_FALLBACK_COLOR = '#CCCCCC'
export function getEquipmentColor(type: string): string {
  return EQUIPMENT_COLOR_MAP[type] ?? EQUIPMENT_FALLBACK_COLOR
}
```

### 2. `packages/kuhl-viewer/src/constants/port-styles.ts`

```typescript
export const PORT_MEDIUM_COLOR_MAP: Record<string, string> = {
  supply_air: '#5DADE2',
  return_air: '#5DADE2',
  outside_air: '#5DADE2',
  exhaust_air: '#5DADE2',
  chilled_water: '#2874A6',
  hot_water: '#2874A6',
  condenser_water: '#2874A6',
  refrigerant_liquid: '#28A745',
  refrigerant_gas: '#28A745',
  drain: '#999999',
  electric: '#FFD700',
  signal: '#FFD700',
}
export const PORT_FALLBACK_COLOR = '#AAAAAA'
export function getPortColor(medium: string): string {
  return PORT_MEDIUM_COLOR_MAP[medium] ?? PORT_FALLBACK_COLOR
}
```

### 3. `packages/kuhl-viewer/src/components/renderers/parts/tag-label.tsx`

- `tag` が空文字の場合は `null` を返す
- Drei `Html` コンポーネントで tag テキストを表示する
- `distanceFactor={10}`, `zIndexRange={[0, 0]}` を指定

### 4. `packages/kuhl-viewer/src/components/renderers/parts/port-markers.tsx`

- `ports` が空配列の場合は `null` を返す
- 各ポートの `position` に球メッシュ（radius: 0.05）を配置する
- `medium` から `getPortColor()` でカラーを取得する
- `direction` に応じて `emissiveIntensity` を設定（in: 0.3, out: 0.6）

### 5. `packages/kuhl-viewer/src/components/renderers/equipment-renderer.tsx`

- `validateDimensions(dims)`: 全次元が正の値か検証し `boolean` を返す
- `EquipmentRenderer`: `nodeId` → `useScene` → BoxGeometry → TagLabel + PortMarkers を統合
- `useEffect` で `sceneRegistry` への登録/解除を行う
- ノードが存在しない場合は `null` を返す

---

## 品質評価

- **テスト実行**: 正常に失敗することを確認（Redフェーズとして適正）
- **期待値**: 明確で具体的（カラーコードの文字列比較、boolean値など）
- **アサーション**: 適切（expect.toBe, toBeNull, toBeDefined, toBeGreaterThan）
- **実装方針**: Greenフェーズで作成すべきファイルが明確
- **信頼性レベル**: 🔵 73%（青信号多数）
- **判定**: ✅ 高品質
