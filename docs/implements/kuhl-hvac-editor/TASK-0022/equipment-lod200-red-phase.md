# TASK-0022: equipment-lod200 Redフェーズ記録

**作成日**: 2026-03-25
**タスクID**: TASK-0022
**フェーズ**: Red（失敗テスト作成完了）
**テストファイル**: `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-lod200.test.tsx`

---

## 作成したテストケース一覧（19件）

| TC ID | テスト名 | 信頼性 | 結果 |
|-------|---------|-------|------|
| TC-LOD200-001a | getLodRenderer('100') が 'lod100' を返す | 🟡 | ✅ 合格（スタブがたまたま通る） |
| TC-LOD200-001b | getLodRenderer('200') が 'lod200' を返す | 🟡 | ❌ 失敗（スタブが常に 'lod100' を返す） |
| TC-LOD200-001c | getLodRenderer(undefined) が lod100 にデフォルトフォールバック | 🔵 | ✅ 合格（スタブが通る） |
| TC-LOD200-001d | getLodRenderer('300') / 未知値 が lod100 にフォールバック | 🔵 | ✅ 合格（スタブが通る） |
| TC-LOD200-002a | getProceduralShape('ahu') が heightScale: 1.0 を返す | 🟡 | ❌ 失敗（スタブが常に null を返す） |
| TC-LOD200-002b | getProceduralShape('pac') が heightScale: 0.25 を返す | 🟡 | ❌ 失敗（スタブが常に null を返す） |
| TC-LOD200-002c | getProceduralShape('fcu') が heightScale: 0.6 を返す | 🟡 | ❌ 失敗（スタブが常に null を返す） |
| TC-LOD200-003 | getProceduralShape('unknown') が null を返す | 🔵 | ✅ 合格（スタブが通る） |
| TC-LOD200-009 | AHU タイプがフル寸法のメッシュで描画される | 🟡 | ❌ 失敗（null を返す） |
| TC-LOD200-010 | PAC タイプが薄型形状（height * 0.25）で描画される | 🟡 | ❌ 失敗（null を返す） |
| TC-LOD200-011 | FCU タイプがコンパクト形状（height * 0.6）で描画される | 🟡 | ❌ 失敗（null を返す） |
| TC-LOD200-012 | 未知タイプが LOD100 ボックスにフォールバックする | 🔵 | ❌ 失敗（null を返す） |
| TC-LOD200-013a | GlbModelRenderer コンポーネントが存在しインポートできる | 🔵 | ✅ 合格（スタブ存在） |
| TC-LOD200-006 | LOD200 + modelSrc 有り → GlbModelRenderer パスが選択される | 🟡 | ❌ 失敗（null を返す） |
| TC-LOD200-014 | Lod100Fallback が BoxGeometry mesh を描画する | 🔵 | ❌ 失敗（null を返す） |
| TC-LOD200-016 | LOD200 でも TagLabel テキストが表示される | 🔵 | ❌ 失敗（LOD200 分岐未実装） |
| TC-LOD200-010b | PAC タイプの BoxGeometry が height * 0.25 の高さで生成される | 🟡 | ✅ 合格（Three.js 直接テスト） |
| TC-LOD200-011b | FCU タイプの BoxGeometry が height * 0.6 の高さで生成される | 🟡 | ✅ 合格（Three.js 直接テスト） |
| TC-LOD200-009b | AHU タイプの BoxGeometry がフル寸法で生成される | 🟡 | ✅ 合格（Three.js 直接テスト） |

**結果サマリー**: 10 失敗 / 9 合格 / 合計 19テスト

---

## テストコードファイルパス

- **テストファイル**: `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-lod200.test.tsx`

---

## 作成したスタブファイル

テストがインポートエラーなく実行できるよう、以下のスタブファイルを作成した（Greenフェーズで正式実装する）:

| ファイル | 状態 | 内容 |
|---------|------|------|
| `packages/kuhl-viewer/src/components/renderers/equipment-lod-utils.ts` | スタブ | `getLodRenderer` は常に 'lod100' を返す。`getProceduralShape` は常に null を返す |
| `packages/kuhl-viewer/src/components/renderers/parts/procedural-equipment.tsx` | スタブ | null を返すコンポーネント |
| `packages/kuhl-viewer/src/components/renderers/parts/glb-model-renderer.tsx` | スタブ | null を返すコンポーネント |
| `packages/kuhl-viewer/src/components/renderers/parts/lod100-fallback.tsx` | スタブ | null を返すコンポーネント |

---

## 期待される失敗内容

### TC-LOD200-001b: getLodRenderer('200')
```
expected 'lod100' to be 'lod200'
```
- **原因**: スタブが常に 'lod100' を返す

### TC-LOD200-002a/002b/002c: getProceduralShape
```
expected null not to be null
```
- **原因**: スタブが常に null を返す（ahu/pac/fcu の形状設定が未実装）

### TC-LOD200-009/010/011/012: ProceduralEquipment DOM 検証
```
expected null not to be null
```
- **原因**: ProceduralEquipment が null を返し、DOM に要素が存在しない

### TC-LOD200-006: GlbModelRenderer DOM 検証
```
expected null not to be null
```
- **原因**: GlbModelRenderer が null を返す

### TC-LOD200-014: Lod100Fallback DOM 検証
```
expected null not to be null
```
- **原因**: Lod100Fallback が null を返し、`data-testid="lod100-fallback"` が存在しない

### TC-LOD200-016: LOD200 TagLabel 表示
```
Unable to find an element with the text: AHU-201
```
- **原因**: EquipmentRenderer に LOD200 分岐が未実装

---

## Greenフェーズで実装すべき内容

### 1. equipment-lod-utils.ts

```typescript
export function getLodRenderer(lod: string | undefined): LodRendererType {
  if (lod === '200') return 'lod200'
  return 'lod100' // default, undefined, '300', unknown
}

export function getProceduralShape(type: string): ProceduralShapeConfig | null {
  switch (type) {
    case 'ahu': return { heightScale: 1.0 }
    case 'pac': return { heightScale: 0.25 }
    case 'fcu': return { heightScale: 0.6 }
    default: return null
  }
}
```

### 2. procedural-equipment.tsx

- `data-testid="procedural-equipment"` を持つラッパー要素
- `data-equipment-type={type}` 属性
- タイプ別 BoxGeometry 生成（ahu: フル、pac: height*0.25、fcu: height*0.6）
- 未知タイプはフォールバックボックス

### 3. glb-model-renderer.tsx

- `useGLTF(modelSrc)` で GLB 読込
- GLTF scene をクローンしてスケーリング
- `<primitive object={clonedScene} />` で描画

### 4. lod100-fallback.tsx

- `data-testid="lod100-fallback"` を持つラッパー要素
- BoxGeometry + MeshStandardMaterial での描画

### 5. equipment-renderer.tsx の LOD200 分岐追加

```typescript
if (lod === '200') {
  if (equipmentNode.modelSrc) {
    return (
      <group ...>
        <Suspense fallback={<Lod100Fallback dimensions={dimensions} color={color} />}>
          <GlbModelRenderer modelSrc={equipmentNode.modelSrc} dimensions={dimensions} />
        </Suspense>
        <TagLabel tag={equipmentNode.tag} offset={tagLabelOffset} />
        <PortMarkers ports={equipmentNode.ports ?? []} />
      </group>
    )
  }
  return (
    <group ...>
      <ProceduralEquipment type={equipmentNode.type} dimensions={dimensions} color={color} />
      <TagLabel tag={equipmentNode.tag} offset={tagLabelOffset} />
      <PortMarkers ports={equipmentNode.ports ?? []} />
    </group>
  )
}
```

---

**作成者**: Claude Code
**最終更新**: 2026-03-25
