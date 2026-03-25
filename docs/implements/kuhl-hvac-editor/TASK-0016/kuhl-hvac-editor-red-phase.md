# TASK-0016: Red Phase 記録 - IFC読込（web-ifc WASM）+ ArchitectureRefRenderer

**作成日**: 2026-03-25
**フェーズ**: Red（失敗するテスト作成）
**テストファイル**: `packages/kuhl-core/src/__tests__/systems/ifc/ifc-import.test.ts`
**スタブファイル**: `packages/kuhl-core/src/systems/ifc/ifc-import.ts`

---

## 作成したテストケース一覧（TC-001〜TC-033）

| TC番号 | グループ | テスト内容 | 信頼性 | 状態 |
|--------|---------|-----------|--------|------|
| TC-001 | filterTargetGeometries | TARGET_IFC_TYPES に含まれる ifcType のみ返す | 🔵 | FAIL |
| TC-002 | filterTargetGeometries | IFCWALLSTANDARDCASE がフィルタ対象に含まれる | 🔵 | FAIL |
| TC-003 | filterTargetGeometries | 空配列 → 空配列を返す | 🔵 | FAIL |
| TC-004 | filterTargetGeometries | 全6種の対象タイプがフィルタを通過する | 🔵 | FAIL |
| TC-005 | filterTargetGeometries | カスタム targetTypes でフィルタ可能 | 🔵 | FAIL |
| TC-006 | flatTransformationToMatrix4 | 16要素の配列はそのまま返す | 🔵 | FAIL |
| TC-007 | flatTransformationToMatrix4 | 配列長 < 16 → 単位行列を返す | 🔵 | FAIL |
| TC-008 | flatTransformationToMatrix4 | 配列長 > 16 → 単位行列を返す | 🔵 | FAIL |
| TC-009 | flatTransformationToMatrix4 | null 入力 → 単位行列を返す | 🔵 | FAIL |
| TC-010 | flatTransformationToMatrix4 | undefined 入力 → 単位行列を返す | 🔵 | FAIL |
| TC-011 | flatTransformationToMatrix4 | 単位行列入力 → 単位行列を返す | 🔵 | FAIL |
| TC-012 | isValidIfcBuffer | ISO-10303-21 ヘッダーを含む Uint8Array → true | 🔵 | FAIL |
| TC-013 | isValidIfcBuffer | ランダムバイト列 → false | 🔵 | FAIL |
| TC-014 | isValidIfcBuffer | 空の Uint8Array → false | 🔵 | FAIL |
| TC-015 | isValidIfcBuffer | BOM + ISO-10303-21 ヘッダー → true | 🔵 | FAIL |
| TC-016 | isValidIfcBuffer | ISO-10303 のみで -21 が無い → false | 🔵 | FAIL |
| TC-017 | createArchitectureRefNodeData | ジオメトリとストーリーを含む → 全フィールド正しく設定 | 🔵 | FAIL |
| TC-018 | createArchitectureRefNodeData | storeys が空配列 → levelMapping は undefined | 🔵 | FAIL |
| TC-019 | createArchitectureRefNodeData | geometries が空配列 → geometryData は空配列 | 🔵 | FAIL |
| TC-020 | createArchitectureRefNodeData | storey.name が null → levelMapping の値が null | 🔵 | FAIL |
| TC-021 | IFC_TYPE_COLOR_MAP | 全6種の IFC タイプにカラーが定義されている | 🔵 | FAIL |
| TC-022 | IFC_TYPE_COLOR_MAP | 各タイプのカラーが仕様の値と一致する | 🔵 | FAIL |
| TC-023 | TARGET_IFC_TYPES | 全6種の IFC エンティティタイプが含まれる | 🔵 | FAIL |
| TC-024 | initIfcApi | 正常初期化 → IfcAPI インスタンスを返す | 🟡 | FAIL |
| TC-025 | initIfcApi | Init() 失敗 → IfcInitError をスロー | 🟡 | PASS (偶発的) |
| TC-026 | initIfcApi | wasmPath 省略時にデフォルト /wasm/ が使用される | 🟡 | FAIL |
| TC-027 | parseIfcFile | 有効な IFC バッファ → IfcParseResult を返す | 🟡 | FAIL |
| TC-028 | parseIfcFile | IFCDOOR, IFCWINDOW 等の非対象タイプは含まれない | 🟡 | FAIL |
| TC-029 | parseIfcFile | 一部ジオメトリでエラー → 部分読込 + errors に記録 | 🟡 | FAIL |
| TC-030 | parseIfcFile | パース完了後に CloseModel が必ず呼ばれる | 🟡 | FAIL |
| TC-031 | extractStoreys | IfcBuildingStorey が存在 → ParsedStorey[] を返す | 🟡 | FAIL |
| TC-032 | extractStoreys | IfcBuildingStorey が無い IFC → 空配列 | 🟡 | FAIL |
| TC-033 | extractStoreys | Elevation が無い Storey → elevation: null として返す | 🟡 | FAIL |

**合計**: 33テスト / 32 FAIL / 1 PASS（TC-025 偶発的PASS）

---

## テスト実行結果

```
Test Files: 1 failed (1)
      Tests: 32 failed | 1 passed (33)
   Duration: ~27ms
```

**期待される失敗内容**:
- TC-001〜TC-023: `Error: [関数名]: not implemented` - スタブが throw する
- TC-024, TC-026: `Error: IfcInitError: initIfcApi not implemented` - initIfcApi スタブが throw する
- TC-027〜TC-030: `Error: parseIfcFile: not implemented` - parseIfcFile スタブが throw する
- TC-031〜TC-033: `Error: extractStoreys: not implemented` - extractStoreys スタブが throw する

---

## スタブファイル（実装ファイル）

**ファイルパス**: `packages/kuhl-core/src/systems/ifc/ifc-import.ts`

スタブは以下のエクスポートを提供し、全て `throw new Error('not implemented')` で実装:

- **型定義**: `ParsedGeometry`, `ParsedStorey`, `IfcParseResult`
- **定数（空）**: `TARGET_IFC_TYPES = [] as const`, `IFC_TYPE_COLOR_MAP = {}`
- **純粋関数（throw）**: `filterTargetGeometries`, `flatTransformationToMatrix4`, `isValidIfcBuffer`, `createArchitectureRefNodeData`
- **web-ifc統合関数（throw）**: `initIfcApi`, `parseIfcFile`, `extractStoreys`

---

## Greenフェーズで実装すべき内容

### 1. 定数の実装

```typescript
export const TARGET_IFC_TYPES = [
  'IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCSLAB', 'IFCBEAM', 'IFCCOLUMN', 'IFCCOVERING'
] as const

export const IFC_TYPE_COLOR_MAP: Record<string, string> = {
  IFCWALL: '#B0B0B0',
  IFCWALLSTANDARDCASE: '#B0B0B0',
  IFCSLAB: '#C8C8C8',
  IFCBEAM: '#A0A0A0',
  IFCCOLUMN: '#909090',
  IFCCOVERING: '#D0D0D0',
}
```

### 2. 純粋関数の実装

- `filterTargetGeometries`: `geometries.filter(g => targetTypes.includes(g.ifcType))`
- `flatTransformationToMatrix4`: 長さ16バリデーション + 単位行列フォールバック
- `isValidIfcBuffer`: テキストデコードして `ISO-10303-21` 文字列を含むか確認
- `createArchitectureRefNodeData`: storeys → levelMapping (expressID.toString() → name)

### 3. web-ifc統合関数の実装（vi.mock('web-ifc') でモック）

- `initIfcApi`: `new IfcAPI()` → `SetWasmPath()` → `Init()` → インスタンス返却
- `parseIfcFile`: `OpenModel()` → `StreamAllMeshes()` → `GetGeometry()` → `CloseModel()` (try/finally)
- `extractStoreys`: `GetAllLines(modelID, IFCBUILDINGSTOREY)` → `GetLine()` → ParsedStorey[]

### 4. TC-025 の偶発的PASS対応

TC-025 は Green Phase で `vi.mock('web-ifc')` を使用し、`/invalid/` パスで Init() が reject するモックを設定することで正しく動作するようにする。

---

## 品質評価

- **テスト実行**: 成功（失敗することを確認済み）
- **期待値**: 明確で具体的（型定義・カラーコード・配列長など）
- **アサーション**: 適切（toBe, toEqual, toHaveLength, toContain, toBeInstanceOf）
- **実装方針**: 明確（要件定義書に詳細記載）
- **信頼性レベル**: 🔵 青信号が多い（TC-001〜TC-023 は全て 🔵）
