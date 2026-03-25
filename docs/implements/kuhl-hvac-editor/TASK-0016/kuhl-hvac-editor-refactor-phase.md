# TASK-0016: Refactor Phase 記録 - IFC読込（web-ifc WASM）+ ArchitectureRefRenderer

**作成日**: 2026-03-25
**フェーズ**: Refactor（品質改善）
**実装ファイル**: `packages/kuhl-core/src/systems/ifc/ifc-import.ts`
**テストファイル**: `packages/kuhl-core/src/__tests__/systems/ifc/ifc-import.test.ts`

---

## テスト実行結果（Refactor後）

```
Test Files: 11 passed (11)
      Tests: 283 passed (283)
   Duration: ~891ms
```

**対象テスト（TC-001〜TC-033）: 33/33 PASS（全283テスト継続 PASS）**

---

## セキュリティレビュー結果

- **入力値検証**: `isValidIfcBuffer()` がパース前にIFCヘッダーを検証している
- **バッファ処理**: `buffer.slice(0, 256)` で先頭バイトのみデコードし、メモリ効率を確保
- **エラー隔離**: 個別ジオメトリのパースエラーを catch して errors 配列に記録し、他の処理を継続
- **リソース解放**: `geometry.delete()` で IfcGeometry の WASMメモリを適切に解放
- **重大な脆弱性**: なし

---

## パフォーマンスレビュー結果

- **O(n)計算量**: `filterTargetGeometries` は geometries を1回スキャン
- **バッファスライス**: `isValidIfcBuffer` で先頭256バイトのみデコード（大ファイルでの効率化）
- **WASMリソース管理**: `geometry.delete()` で逐次解放し、メモリ蓄積を防止
- **extractStoreys の呼び出し順序**: CloseModel 前に呼び出すよう修正（モデルが有効な間に実行）
- **重大な性能課題**: なし（100MB以下のIFCファイルを対象とする設計方針通り）

---

## リファクタリング内容

### 改善1: IFCBUILDINGSTOREY 型コードのハードコード除去 🔵

**Before（Greenフェーズ）**:
```typescript
const IFCBUILDINGSTOREY = 3124254112 // web-ifc の IFCBUILDINGSTOREY 型コード
const storeyLines = ifcApi.GetAllLines(modelID, IFCBUILDINGSTOREY)
```

**After（Refactorフェーズ）**:
```typescript
import * as WEBIFC from 'web-ifc'
// ...
const storeyLines = ifcApi.GetLineIDsWithType(modelID, WEBIFC.IFCBUILDINGSTOREY)
```

**理由**:
- `IFCBUILDINGSTOREY = 3124254112` は `web-ifc/ifc-schema` でエクスポートされた定数。ハードコードを避け、ライブラリ定数を参照することでライブラリバージョン更新時の追随が容易になる。
- `GetAllLines(modelID)` は1引数のみのAPI（型フィルタなし）。型フィルタリングには `GetLineIDsWithType(modelID, type)` が正しい API であることを型定義で確認した。

### 改善2: GetLineIDsWithType への修正 🔵

`GetAllLines` は `web-ifc` の型定義で `GetAllLines(modelID: number): Vector<number>` と1引数のみ。IFCタイプでフィルタリングするには `GetLineIDsWithType(modelID: number, type: number): Vector<number>` を使用する必要がある。

**テストモックも同期更新**:
- TC-030: `GetAllLines` → `GetLineIDsWithType`
- TC-032: `GetAllLines` → `GetLineIDsWithType`

### 改善3: extractStoreys 呼び出し位置の修正 🔵

**Before（Greenフェーズ）**:
```typescript
// CloseModel の後で extractStoreys を呼び出していた（modelID が無効）
} finally {
  ifcApi.CloseModel(modelID)
}
// ... ← ここで extractStoreys を呼んでいた（問題あり）
const storeys = modelID !== null ? extractStoreys(ifcApi, modelID) : []
```

**After（Refactorフェーズ）**:
```typescript
// CloseModel の前に extractStoreys を呼び出す（modelID が有効な間）
      storeys = extractStoreys(ifcApi, modelID)  // ← CloseModel 前
    } finally {
      ifcApi.CloseModel(modelID)
    }
```

**理由**: `CloseModel()` 後は `modelID` が無効になり、`extractStoreys` での `GetLineIDsWithType` 呼び出しが失敗する可能性がある。`try/finally` の `finally` の前（`try` ブロック内）で呼び出すことで、モデルが有効な状態で実行できる。

### 改善4: IFCタイプ取得の改善 🔵

**Before**: `GetLine(modelID, expressID).type` でタイプコードを取得していた（GetLine はプロパティ全体を取得するため過剰）

**After**: `GetLineType(modelID, expressID)` でタイプコードのみを取得（APIドキュメントで確認済み）

```typescript
// Before
const ifcTypeLine = ifcApi.GetLine(modelID as number, flatMesh.expressID)
const ifcType = ifcTypeLine?.type ?? 'UNKNOWN'
const ifcTypeName =
  typeof ifcType === 'number'
    ? ifcApi.GetNameFromTypeCode(ifcType)
    : String(ifcType)

// After
const ifcTypeCode = ifcApi.GetLineType(modelID as number, flatMesh.expressID)
const ifcTypeName =
  typeof ifcTypeCode === 'number'
    ? ifcApi.GetNameFromTypeCode(ifcTypeCode)
    : 'UNKNOWN'
```

**GetNameFromTypeCode の存在確認**: 🔵 `web-ifc` 型定義で `GetNameFromTypeCode(type: number): string` として確認済み。

### 改善5: エラーメッセージの統一 🔵

エラーメッセージのフォーマットを統一した:

| エラー種別 | Before | After |
|-----------|--------|-------|
| ジオメトリパースエラー | `"Geometry parse error at expressID N: msg"` | `"IFC geometry parse error (expressID=N): msg"` |
| モデルオープンエラー | `"IFC model open error: msg"` | `"IFC model open error: msg"` (変更なし) |

### 改善6: 日本語コメントの充実 🔵

- モジュールヘッダーに設計方針・参照要件を追記
- `parseIfcFile` コメントに「改善内容」「実装フロー」セクションを追加
- `extractStoreys` コメントに「設計詳細」セクションを追加（CloseModel前に呼ぶ理由を明記）
- インポート変更（`WEBIFC.*` 使用）の理由をインラインコメントで説明

---

## 品質判定結果

```
✅ 高品質:
- テスト結果: 283/283 PASS（全テスト継続成功）
- セキュリティ: 重大な脆弱性なし
- パフォーマンス: 重大な性能課題なし
- リファクタ品質: 全4候補（ハードコード除去・API修正・順序修正・エラー統一）達成
- コード品質: 429行（500行制限内）、マジックナンバーなし、エラーメッセージ統一
- ドキュメント: 完成
```

---

## 信頼性評価サマリー

| 改善項目 | 信頼性 | 根拠 |
|---------|--------|------|
| WEBIFC.IFCBUILDINGSTOREY 使用 | 🔵 | ifc-schema.d.ts で `export declare const IFCBUILDINGSTOREY = 3124254112` を確認 |
| GetLineIDsWithType 使用 | 🔵 | web-ifc-api.d.ts で `GetLineIDsWithType(modelID, type): Vector<number>` を確認 |
| extractStoreys 呼び出し順序修正 | 🔵 | CloseModel後にmodelIDが無効になる設計上の必然的な修正 |
| GetLineType 使用 | 🔵 | web-ifc-api.d.ts で `GetLineType(modelID, expressID): any` を確認 |
| GetNameFromTypeCode の実在確認 | 🔵 | web-ifc-api.d.ts で `GetNameFromTypeCode(type: number): string` を確認 |
| エラーメッセージ統一 | 🔵 | コード品質向上のための明確な改善 |
