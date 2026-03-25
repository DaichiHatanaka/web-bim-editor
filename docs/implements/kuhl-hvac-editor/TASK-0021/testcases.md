# TASK-0021: EquipmentRenderer（LOD100 ボックス表示）- テストケース仕様書

**作成日**: 2026-03-25
**タスクID**: TASK-0021
**テストファイル**: `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-renderer.test.tsx`
**テストフレームワーク**: Vitest
**カバレッジ目標**: 60% 以上（line coverage）

---

## テスト環境・方針

### テスト環境

- **純粋関数テスト**: `node` 環境（Three.js オブジェクト生成のみ、DOM 不要）
- **コンポーネントテスト**: `jsdom` 環境（vitest.config.ts の `environmentMatchGlobs` で `.tsx` に自動適用）

### モック対象

| 対象 | モック方法 | 理由 |
|------|-----------|------|
| `@react-three/fiber` | `vi.mock` | Node 環境では WebGL/WebGPU が使用できない |
| `@react-three/drei` | `vi.mock` | `Html` コンポーネントの DOM 出力を代替検証 |
| `useScene` | Zustand ストア直接操作 | テスト用ノードの登録・参照 |
| `sceneRegistry` | `@kuhl/core` から直接インポート | 登録/解除の動作検証 |

### テストデータ

```typescript
// 標準テスト用 AHU ノード
const testAhuNode = AhuNode.parse({
  tag: 'AHU-101',
  equipmentName: 'テスト空調機',
  position: [1, 2, 3],
  rotation: [0, Math.PI / 2, 0],
  dimensions: [2.5, 1.8, 1.2],
  lod: '100',
  status: 'planned',
  ports: [
    {
      id: 'port_0',
      name: 'Supply Air Out',
      medium: 'supply_air',
      direction: 'out',
      position: [1.25, 0, 0],
      connectedTo: null,
    },
    {
      id: 'port_1',
      name: 'Return Air In',
      medium: 'return_air',
      direction: 'in',
      position: [-1.25, 0, 0],
      connectedTo: null,
    },
  ],
})
```

---

## 正常系テストケース（Happy Path）

### TC-HP-001: LOD100 BoxGeometry が正しい寸法で描画される

| 項目 | 内容 |
|------|------|
| **ID** | TC-HP-001 |
| **対象** | EquipmentRenderer / BoxGeometry 生成 |
| **信頼性** | 🔵 |
| **優先度** | P0 |
| **参照要件** | FR-001.1, FR-001.4 |

**Given（前提条件）**:
- useScene に `dimensions: [2.5, 1.8, 1.2]` を持つ AHU ノードが登録されている
- ノードの `lod` が `'100'` である

**When（操作）**:
- `getEquipmentColor` に `'ahu'` を渡す（純粋関数テスト）
- または EquipmentRenderer が当該ノードをレンダリングする

**Then（期待結果）**:
- `THREE.BoxGeometry` が `(2.5, 1.8, 1.2)` の引数で生成される
- geometry の `parameters.width === 2.5`, `parameters.height === 1.8`, `parameters.depth === 1.2`

**アサーション**:
```typescript
expect(geometry).toBeInstanceOf(THREE.BoxGeometry)
expect(geometry.parameters.width).toBe(2.5)
expect(geometry.parameters.height).toBe(1.8)
expect(geometry.parameters.depth).toBe(1.2)
```

---

### TC-HP-002: 機器タイプ別カラーマップが各タイプに正しい色を返す

| 項目 | 内容 |
|------|------|
| **ID** | TC-HP-002 |
| **対象** | getEquipmentColor / EQUIPMENT_COLOR_MAP |
| **信頼性** | 🔵 |
| **優先度** | P0 |
| **参照要件** | FR-002.1 |

**Given（前提条件）**:
- `EQUIPMENT_COLOR_MAP` が全13種の機器タイプのカラーを定義している

**When（操作）**:
- `getEquipmentColor(type)` を全13タイプに対して呼び出す

**Then（期待結果）**:
- 各タイプに対して以下のカラーが返される:

| type | 期待カラー |
|------|-----------|
| `ahu` | `#4A90E2` |
| `pac` | `#7ED321` |
| `fcu` | `#F39C12` |
| `vrf_outdoor` | `#2C3E50` |
| `vrf_indoor` | `#3498DB` |
| `diffuser` | `#E74C3C` |
| `damper` | `#95A5A6` |
| `fan` | `#9B59B6` |
| `pump` | `#1ABC9C` |
| `chiller` | `#27AE60` |
| `boiler` | `#E67E22` |
| `cooling_tower` | `#16A085` |
| `valve` | `#34495E` |

**アサーション**:
```typescript
expect(getEquipmentColor('ahu')).toBe('#4A90E2')
expect(getEquipmentColor('pac')).toBe('#7ED321')
// ... 全13タイプ
expect(Object.keys(EQUIPMENT_COLOR_MAP).length).toBe(13)
```

---

### TC-HP-003: 未知の機器タイプにフォールバックカラーが返される

| 項目 | 内容 |
|------|------|
| **ID** | TC-HP-003 |
| **対象** | getEquipmentColor |
| **信頼性** | 🔵 |
| **優先度** | P1 |
| **参照要件** | FR-002.2 |

**Given（前提条件）**:
- `EQUIPMENT_COLOR_MAP` に存在しないタイプ文字列

**When（操作）**:
- `getEquipmentColor('unknown_type')` を呼び出す

**Then（期待結果）**:
- フォールバックカラー `#CCCCCC` が返される

**アサーション**:
```typescript
expect(getEquipmentColor('unknown_type')).toBe('#CCCCCC')
expect(getEquipmentColor('')).toBe('#CCCCCC')
```

---

### TC-HP-004: TagLabel がタグテキストを表示する

| 項目 | 内容 |
|------|------|
| **ID** | TC-HP-004 |
| **対象** | TagLabel コンポーネント |
| **信頼性** | 🔵 |
| **優先度** | P0 |
| **参照要件** | FR-003.1, FR-003.2 |

**Given（前提条件）**:
- `tag: 'AHU-101'` を持つノードが存在する
- `dimensions: [2.5, 1.8, 1.2]` でオフセットが `[0, 1.2, 0]`（`dimensions[1]/2 + 0.3 = 0.9 + 0.3 = 1.2`）

**When（操作）**:
- TagLabel コンポーネントが `tag='AHU-101'` と `offset=[0, 1.2, 0]` でレンダリングされる

**Then（期待結果）**:
- テキスト `'AHU-101'` が DOM 上に表示される
- オフセット位置 `[0, 1.2, 0]` が適用される

**アサーション**:
```typescript
// Html(drei) モック経由で検証
expect(screen.getByText('AHU-101')).toBeDefined()
```

---

### TC-HP-005: PortMarkers が各ポートに球メッシュを描画する

| 項目 | 内容 |
|------|------|
| **ID** | TC-HP-005 |
| **対象** | PortMarkers コンポーネント |
| **信頼性** | 🔵 |
| **優先度** | P0 |
| **参照要件** | FR-004.1, FR-004.2 |

**Given（前提条件）**:
- ノードが2つのポートを持つ:
  - `port_0`: position `[1.25, 0, 0]`, medium `supply_air`, direction `out`
  - `port_1`: position `[-1.25, 0, 0]`, medium `return_air`, direction `in`

**When（操作）**:
- PortMarkers コンポーネントが `ports` 配列でレンダリングされる

**Then（期待結果）**:
- 2つの球メッシュが生成される
- 各球の `radius` が `0.05`
- 各球の `name` がポート ID（`port_0`, `port_1`）に設定される

**アサーション**:
```typescript
// SphereGeometry の引数確認
expect(sphereGeometry.parameters.radius).toBe(0.05)
// ポート数分のメッシュが存在
expect(portMeshes).toHaveLength(2)
```

---

### TC-HP-006: ポート medium カラーマッピングが正しく動作する

| 項目 | 内容 |
|------|------|
| **ID** | TC-HP-006 |
| **対象** | getPortColor / PORT_MEDIUM_COLOR_MAP |
| **信頼性** | 🔵 |
| **優先度** | P0 |
| **参照要件** | FR-004.3 |

**Given（前提条件）**:
- `PORT_MEDIUM_COLOR_MAP` が全12種の medium カラーを定義している

**When（操作）**:
- `getPortColor(medium)` を各 medium タイプに対して呼び出す

**Then（期待結果）**:
- 空気系統（`supply_air`, `return_air`, `outside_air`, `exhaust_air`）: `#5DADE2`（水色）
- 水系統（`chilled_water`, `hot_water`, `condenser_water`）: `#2874A6`（濃青）
- 冷媒系統（`refrigerant_liquid`, `refrigerant_gas`）: `#28A745`（緑）
- 排水（`drain`）: `#999999`（グレー）
- 電気・信号（`electric`, `signal`）: `#FFD700`（金色）

**アサーション**:
```typescript
// 空気系統
expect(getPortColor('supply_air')).toBe('#5DADE2')
expect(getPortColor('return_air')).toBe('#5DADE2')
expect(getPortColor('outside_air')).toBe('#5DADE2')
expect(getPortColor('exhaust_air')).toBe('#5DADE2')
// 水系統
expect(getPortColor('chilled_water')).toBe('#2874A6')
expect(getPortColor('hot_water')).toBe('#2874A6')
expect(getPortColor('condenser_water')).toBe('#2874A6')
// 冷媒系統
expect(getPortColor('refrigerant_liquid')).toBe('#28A745')
expect(getPortColor('refrigerant_gas')).toBe('#28A745')
// 排水
expect(getPortColor('drain')).toBe('#999999')
// 電気・信号
expect(getPortColor('electric')).toBe('#FFD700')
expect(getPortColor('signal')).toBe('#FFD700')
```

---

### TC-HP-007: useRegistry がノード ID とタイプで正しく呼び出される

| 項目 | 内容 |
|------|------|
| **ID** | TC-HP-007 |
| **対象** | EquipmentRenderer / sceneRegistry 登録 |
| **信頼性** | 🟡 |
| **優先度** | P0 |
| **参照要件** | FR-005.1, FR-005.2 |

**Given（前提条件）**:
- useScene に AHU ノード（ID: `ahu_xxx`）が登録されている
- sceneRegistry がクリーンな状態

**When（操作）**:
- EquipmentRenderer がマウントされる

**Then（期待結果）**:
- `sceneRegistry.nodes.set(nodeId, meshRef.current)` が呼ばれる
- `sceneRegistry.byType.ahu.add(nodeId)` が呼ばれる

**アサーション**:
```typescript
expect(sceneRegistry.nodes.has(nodeId)).toBe(true)
expect(sceneRegistry.byType.ahu.has(nodeId)).toBe(true)
```

---

### TC-HP-008: useNodeEvents がノードタイプのイベントを購読する

| 項目 | 内容 |
|------|------|
| **ID** | TC-HP-008 |
| **対象** | EquipmentRenderer / useNodeEvents |
| **信頼性** | 🟡 |
| **優先度** | P0 |
| **参照要件** | FR-005.4 |

**Given（前提条件）**:
- useScene に AHU ノードが登録されている

**When（操作）**:
- EquipmentRenderer がマウントされる

**Then（期待結果）**:
- `useNodeEvents` が `(node, 'ahu')` の引数パターンで呼び出される
- click/hover イベントリスナーが登録される

**アサーション**:
```typescript
// useNodeEvents モックの呼び出し検証
expect(mockUseNodeEvents).toHaveBeenCalledWith(
  expect.objectContaining({ id: nodeId, type: 'ahu' }),
  'ahu'
)
```

---

## 異常系テストケース（Error Cases）

### TC-ERR-009: dimensions が [0, 0, 0] の場合デフォルト値 [0.01, 0.01, 0.01] にクランプされる

| 項目 | 内容 |
|------|------|
| **ID** | TC-ERR-009 |
| **対象** | validateDimensions / EquipmentRenderer |
| **信頼性** | 🔵 |
| **優先度** | P1 |
| **参照要件** | EC-002 |

**Given（前提条件）**:
- ノードの `dimensions` が `[0, 0, 0]` である

**When（操作）**:
- `validateDimensions([0, 0, 0])` を呼び出す
- または EquipmentRenderer が当該ノードをレンダリングする

**Then（期待結果）**:
- `validateDimensions` が `false` を返す（無効な寸法）
- レンダリング時はゼロ以下の次元値が最小値 `0.01` にクランプされる
- クラッシュしない

**アサーション**:
```typescript
expect(validateDimensions([0, 0, 0])).toBe(false)
// クランプ後の BoxGeometry パラメータ
expect(geometry.parameters.width).toBeGreaterThanOrEqual(0.01)
expect(geometry.parameters.height).toBeGreaterThanOrEqual(0.01)
expect(geometry.parameters.depth).toBeGreaterThanOrEqual(0.01)
```

---

### TC-ERR-010: 空の ports 配列でマーカーが描画されない

| 項目 | 内容 |
|------|------|
| **ID** | TC-ERR-010 |
| **対象** | PortMarkers コンポーネント |
| **信頼性** | 🔵 |
| **優先度** | P1 |
| **参照要件** | FR-004.7, EC-003 |

**Given（前提条件）**:
- ノードの `ports` が空配列 `[]` である

**When（操作）**:
- PortMarkers コンポーネントが `ports: []` でレンダリングされる

**Then（期待結果）**:
- PortMarkers が `null` を返す（何もレンダリングされない）
- エラーが発生しない

**アサーション**:
```typescript
// PortMarkers が null を返すか、子要素が0
expect(portMarkerOutput).toBeNull()
// または
expect(container.querySelectorAll('[data-port-marker]')).toHaveLength(0)
```

---

### TC-ERR-011: tag が空文字の場合 TagLabel が描画されない

| 項目 | 内容 |
|------|------|
| **ID** | TC-ERR-011 |
| **対象** | TagLabel / EquipmentRenderer |
| **信頼性** | 🔵 |
| **優先度** | P1 |
| **参照要件** | FR-003.4, EC-004 |

**Given（前提条件）**:
- ノードの `tag` が `''`（空文字）である

**When（操作）**:
- EquipmentRenderer が tag 空文字のノードをレンダリングする

**Then（期待結果）**:
- TagLabel コンポーネントがレンダリングされない
- エラーが発生しない

**アサーション**:
```typescript
// tag テキストが DOM に存在しないこと
expect(screen.queryByText('')).toBeNull()
// TagLabel の Html 要素が生成されないこと
```

---

### TC-ERR-012: 未知の port medium でフォールバックカラーが適用される

| 項目 | 内容 |
|------|------|
| **ID** | TC-ERR-012 |
| **対象** | getPortColor |
| **信頼性** | 🔵 |
| **優先度** | P1 |
| **参照要件** | EC-005 |

**Given（前提条件）**:
- `PORT_MEDIUM_COLOR_MAP` に存在しない medium 文字列

**When（操作）**:
- `getPortColor('unknown_medium')` を呼び出す

**Then（期待結果）**:
- フォールバックカラー `#AAAAAA` が返される

**アサーション**:
```typescript
expect(getPortColor('unknown_medium')).toBe('#AAAAAA')
expect(getPortColor('')).toBe('#AAAAAA')
```

---

## 境界値テストケース（Edge Cases）

### TC-EDGE-013: 非常に大きな dimensions（100m x 100m x 100m）

| 項目 | 内容 |
|------|------|
| **ID** | TC-EDGE-013 |
| **対象** | EquipmentRenderer / BoxGeometry 生成 |
| **信頼性** | 🟡 |
| **優先度** | P2 |
| **参照要件** | NFR-001 |

**Given（前提条件）**:
- ノードの `dimensions` が `[100, 100, 100]` である

**When（操作）**:
- BoxGeometry が `(100, 100, 100)` で生成される

**Then（期待結果）**:
- `THREE.BoxGeometry` が正常に生成される
- geometry の `parameters` が正しい値を持つ
- クラッシュしない

**アサーション**:
```typescript
const geometry = new THREE.BoxGeometry(100, 100, 100)
expect(geometry.parameters.width).toBe(100)
expect(geometry.parameters.height).toBe(100)
expect(geometry.parameters.depth).toBe(100)
expect(geometry.attributes.position.count).toBeGreaterThan(0)
geometry.dispose()
```

---

### TC-EDGE-014: 負の dimensions がクランプされる

| 項目 | 内容 |
|------|------|
| **ID** | TC-EDGE-014 |
| **対象** | validateDimensions / EquipmentRenderer |
| **信頼性** | 🔵 |
| **優先度** | P1 |
| **参照要件** | EC-002 |

**Given（前提条件）**:
- ノードの `dimensions` が `[-1, 2, -3]` である

**When（操作）**:
- `validateDimensions([-1, 2, -3])` を呼び出す

**Then（期待結果）**:
- `validateDimensions` が `false` を返す（負の値は無効）
- レンダリング時は負の次元値が最小値 `0.01` にクランプされる

**アサーション**:
```typescript
expect(validateDimensions([-1, 2, -3])).toBe(false)
// クランプ後
expect(geometry.parameters.width).toBe(0.01)   // -1 → 0.01
expect(geometry.parameters.height).toBe(2)      // 2 はそのまま
expect(geometry.parameters.depth).toBe(0.01)    // -3 → 0.01
```

---

### TC-EDGE-015: 多数のポート（20個以上）が正常に描画される

| 項目 | 内容 |
|------|------|
| **ID** | TC-EDGE-015 |
| **対象** | PortMarkers コンポーネント |
| **信頼性** | 🟡 |
| **優先度** | P2 |
| **参照要件** | NFR-001, NFR-002.2 |

**Given（前提条件）**:
- ノードが20個のポートを持つ（各ポートの position, medium, direction が設定済み）

**When（操作）**:
- PortMarkers コンポーネントが 20 要素の `ports` 配列でレンダリングされる

**Then（期待結果）**:
- 20個の球メッシュが生成される
- 球ジオメトリが共有インスタンスとして1つだけ生成される（NFR-002.2）
- エラーが発生しない

**アサーション**:
```typescript
// 20個のポートマーカーが生成される
expect(portMeshes).toHaveLength(20)
// パフォーマンス: 共有ジオメトリの検証（useMemo により単一インスタンス）
// クラッシュしないことの確認
```

---

## 補足テストケース

### TC-SUP-016: 存在しないノード ID で null が返される

| 項目 | 内容 |
|------|------|
| **ID** | TC-SUP-016 |
| **対象** | EquipmentRenderer |
| **信頼性** | 🔵 |
| **優先度** | P1 |
| **参照要件** | FR-005.5, EC-001 |

**Given（前提条件）**:
- useScene に存在しないノード ID

**When（操作）**:
- EquipmentRenderer が存在しない `nodeId` でレンダリングされる

**Then（期待結果）**:
- `null` が返される（何もレンダリングされない）
- 例外が発生しない

**アサーション**:
```typescript
const { container } = render(<EquipmentRenderer nodeId={'nonexistent_id' as AnyNodeId} />)
expect(container.firstChild).toBeNull()
```

---

### TC-SUP-017: アンマウント時に sceneRegistry から削除される

| 項目 | 内容 |
|------|------|
| **ID** | TC-SUP-017 |
| **対象** | EquipmentRenderer / クリーンアップ |
| **信頼性** | 🟡 |
| **優先度** | P0 |
| **参照要件** | FR-005.3, NFR-002.1, NFR-002.3, EC-008 |

**Given（前提条件）**:
- EquipmentRenderer がマウント済みで、sceneRegistry に登録されている

**When（操作）**:
- EquipmentRenderer がアンマウントされる（`unmount()` 呼び出し）

**Then（期待結果）**:
- `sceneRegistry.nodes.delete(nodeId)` が呼ばれる
- `sceneRegistry.byType[type].delete(nodeId)` が呼ばれる
- `geometry.dispose()` が呼ばれる
- `material.dispose()` が呼ばれる

**アサーション**:
```typescript
// アンマウント後
expect(sceneRegistry.nodes.has(nodeId)).toBe(false)
expect(sceneRegistry.byType.ahu.has(nodeId)).toBe(false)
```

---

### TC-SUP-018: direction による emissiveIntensity の違い

| 項目 | 内容 |
|------|------|
| **ID** | TC-SUP-018 |
| **対象** | PortMarkers / direction 別表示 |
| **信頼性** | 🔵 |
| **優先度** | P1 |
| **参照要件** | FR-004.4, FR-004.5 |

**Given（前提条件）**:
- `direction: 'in'` のポートと `direction: 'out'` のポートが存在する

**When（操作）**:
- PortMarkers がレンダリングされる

**Then（期待結果）**:
- `direction: 'in'` のマーカーの `emissiveIntensity` が `0.3`
- `direction: 'out'` のマーカーの `emissiveIntensity` が `0.6`

**アサーション**:
```typescript
expect(inPortMaterial.emissiveIntensity).toBe(0.3)
expect(outPortMaterial.emissiveIntensity).toBe(0.6)
```

---

## テストケースサマリー

| カテゴリ | ID 範囲 | テスト数 | 信頼性 |
|---------|---------|---------|--------|
| 正常系（Happy Path） | TC-HP-001 ~ TC-HP-008 | 8 | 🔵 6件, 🟡 2件 |
| 異常系（Error Cases） | TC-ERR-009 ~ TC-ERR-012 | 4 | 🔵 4件 |
| 境界値（Edge Cases） | TC-EDGE-013 ~ TC-EDGE-015 | 3 | 🔵 1件, 🟡 2件 |
| 補足 | TC-SUP-016 ~ TC-SUP-018 | 3 | 🔵 2件, 🟡 1件 |
| **合計** | | **18** | 🔵 13件 (72%), 🟡 5件 (28%) |

### 純粋関数テスト（モック不要、優先実装）

| 関数 | テストケース | 信頼性 |
|------|-------------|--------|
| `getEquipmentColor(type)` | TC-HP-002, TC-HP-003 | 🔵 |
| `getPortColor(medium)` | TC-HP-006, TC-ERR-012 | 🔵 |
| `validateDimensions(dims)` | TC-ERR-009, TC-EDGE-014 | 🔵 |

### コンポーネントテスト（モック必要）

| コンポーネント | テストケース | 信頼性 |
|---------------|-------------|--------|
| EquipmentRenderer | TC-HP-001, TC-HP-007, TC-HP-008, TC-SUP-016, TC-SUP-017 | 🔵/🟡 |
| TagLabel | TC-HP-004, TC-ERR-011 | 🔵 |
| PortMarkers | TC-HP-005, TC-ERR-010, TC-EDGE-015, TC-SUP-018 | 🔵/🟡 |

---

## describe/it 構造案

```
describe('EquipmentRenderer テスト')
  describe('純粋関数テスト')
    describe('getEquipmentColor')
      it('TC-HP-002: 全13タイプのカラーが正しく返される')
      it('TC-HP-003: 未知タイプでフォールバックカラーが返される')
    describe('getPortColor')
      it('TC-HP-006: 全12 medium のカラーが正しく返される')
      it('TC-ERR-012: 未知 medium でフォールバックカラーが返される')
    describe('validateDimensions')
      it('TC-ERR-009: ゼロ dimensions で false を返す')
      it('TC-EDGE-014: 負の dimensions で false を返す')
      it('TC-EDGE-013: 大きな dimensions で true を返す')
  describe('BoxGeometry 生成')
    it('TC-HP-001: dimensions から正しい BoxGeometry が生成される')
  describe('TagLabel コンポーネント')
    it('TC-HP-004: tag テキストが表示される')
    it('TC-ERR-011: 空文字 tag で非表示')
  describe('PortMarkers コンポーネント')
    it('TC-HP-005: ポート数分の球メッシュが生成される')
    it('TC-ERR-010: 空 ports で何も描画されない')
    it('TC-EDGE-015: 20個以上のポートが正常に描画される')
    it('TC-SUP-018: direction 別 emissiveIntensity')
  describe('sceneRegistry 統合')
    it('TC-HP-007: マウント時に sceneRegistry に登録される')
    it('TC-HP-008: useNodeEvents が正しい引数で呼ばれる')
    it('TC-SUP-017: アンマウント時に sceneRegistry から削除される')
    it('TC-SUP-016: 存在しないノード ID で null が返される')
```
