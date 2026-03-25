# TDD開発メモ: equipment-lod200

## 概要

- 機能名: equipment-lod200（EquipmentRenderer LOD200 拡張）
- 開発開始: 2026-03-25
- 現在のフェーズ: Red（失敗テスト作成完了）

## 関連ファイル

- 元タスクファイル: `docs/tasks/kuhl-hvac-editor/TASK-0022.md`
- 要件定義: `docs/implements/kuhl-hvac-editor/TASK-0022/requirements.md`
- テストケース定義: `docs/implements/kuhl-hvac-editor/TASK-0022/testcases.md`
- テストファイル: `packages/kuhl-viewer/src/__tests__/components/renderers/equipment-lod200.test.tsx`
- スタブ実装ファイル:
  - `packages/kuhl-viewer/src/components/renderers/equipment-lod-utils.ts`
  - `packages/kuhl-viewer/src/components/renderers/parts/procedural-equipment.tsx`
  - `packages/kuhl-viewer/src/components/renderers/parts/glb-model-renderer.tsx`
  - `packages/kuhl-viewer/src/components/renderers/parts/lod100-fallback.tsx`

## Redフェーズ（失敗するテスト作成）

### 作成日時

2026-03-25

### テストケース概要（19件）

**純粋関数テスト（getLodRenderer）**:
- TC-LOD200-001a: '100' → 'lod100' ✅ 合格
- TC-LOD200-001b: '200' → 'lod200' ❌ 失敗（スタブ）
- TC-LOD200-001c: undefined → 'lod100' ✅ 合格
- TC-LOD200-001d: '300'/未知 → 'lod100' ✅ 合格

**純粋関数テスト（getProceduralShape）**:
- TC-LOD200-002a: 'ahu' → { heightScale: 1.0 } ❌ 失敗（スタブ null）
- TC-LOD200-002b: 'pac' → { heightScale: 0.25 } ❌ 失敗（スタブ null）
- TC-LOD200-002c: 'fcu' → { heightScale: 0.6 } ❌ 失敗（スタブ null）
- TC-LOD200-003: 'unknown' → null ✅ 合格

**ProceduralEquipment コンポーネント**:
- TC-LOD200-009: AHU フル寸法 ❌ 失敗
- TC-LOD200-010: PAC 薄型 (height*0.25) ❌ 失敗
- TC-LOD200-011: FCU コンパクト (height*0.6) ❌ 失敗
- TC-LOD200-012: 未知タイプフォールバック ❌ 失敗

**GlbModelRenderer**:
- TC-LOD200-013a: コンポーネント存在確認 ✅ 合格
- TC-LOD200-006: LOD200+modelSrc 描画 ❌ 失敗

**Lod100Fallback**:
- TC-LOD200-014: BoxGeometry 描画 ❌ 失敗

**共通子コンポーネント**:
- TC-LOD200-016: LOD200 TagLabel 表示 ❌ 失敗

**Three.js 直接テスト**:
- TC-LOD200-009b: AHU フル寸法 ✅ 合格
- TC-LOD200-010b: PAC height*0.25 ✅ 合格
- TC-LOD200-011b: FCU height*0.6 ✅ 合格

**テスト実行結果**: 10 失敗 / 9 合格 / 合計 19テスト

### 品質評価

- **信頼性レベル分布**: 🔵 青信号 6件, 🟡 黄信号 13件, 🔴 赤信号 0件
- **テスト戦略**: 純粋関数テスト + コンポーネント DOM 検証 + Three.js 直接テスト
- **品質判定**: ✅ 高品質（期待通り失敗、アサーション明確、実装方針明確）

### 次のフェーズへの要求事項

**Greenフェーズ（最小実装）で実装すべき内容**:

1. `equipment-lod-utils.ts`:
   - `getLodRenderer('200')` → `'lod200'` を返す
   - `getProceduralShape('ahu')` → `{ heightScale: 1.0 }`
   - `getProceduralShape('pac')` → `{ heightScale: 0.25 }`
   - `getProceduralShape('fcu')` → `{ heightScale: 0.6 }`

2. `procedural-equipment.tsx`:
   - `data-testid="procedural-equipment"` 属性を持つ要素を描画
   - `data-equipment-type={type}` 属性を設定
   - AHU/PAC/FCU のタイプ別形状（heightScale 適用）

3. `glb-model-renderer.tsx`:
   - `useGLTF` で GLB 読込（Suspense 対応）
   - モデルクローン + スケーリング

4. `lod100-fallback.tsx`:
   - `data-testid="lod100-fallback"` 属性を持つ要素を描画
   - BoxGeometry + MeshStandardMaterial

5. `equipment-renderer.tsx`:
   - `lod === '200'` の分岐追加
   - modelSrc 有り → GlbModelRenderer
   - modelSrc 無し → ProceduralEquipment
   - TagLabel・PortMarkers は LOD200 でも表示

## Greenフェーズ（最小実装）

### 実装日時

2026-03-25（TASK-0022 Green フェーズ実施済み）

### 実装内容

1. `equipment-lod-utils.ts`: getLodRenderer / getProceduralShape 実装（19テスト → 全通過）
2. `procedural-equipment.tsx`: ProceduralEquipment コンポーネント実装
3. `glb-model-renderer.tsx`: GlbModelRenderer コンポーネント実装
4. `lod100-fallback.tsx`: Lod100Fallback コンポーネント実装
5. `equipment-renderer.tsx`: LOD200 分岐（modelSrc あり/なし）統合

### テスト結果（Greenフェーズ完了時）

- Test Files: 4 passed
- Tests: 72 passed

---

## Refactorフェーズ（品質改善）

### 実施日時

2026-03-25

### 改善内容

1. **equipment-lod-utils.ts**: ヘッダーコメントの「未実装・スタブ・TODO」を実装済みドキュメントに更新 🔵
2. **procedural-equipment.tsx**: 不要な THREE インポートとメモリリークとなる BoxGeometry/MeshStandardMaterial のインスタンス化を削除 🔵
3. **equipment-renderer.tsx**: 冗長な `equipmentDimensions` 変数を削除し `dimensions` を直接使用、ファイルヘッダーをTASK-0022対応に更新 🔵
4. **Biome**: `bunx biome check --write` で7ファイルのフォーマット自動修正

### セキュリティレビュー

- Viewer Isolation: apps/kuhl-editor からのインポートなし ✅
- 入力検証: isEquipmentNode 型ガードが適切に機能
- 重大な脆弱性: なし

### パフォーマンスレビュー

- EQUIPMENT_TYPES Set のモジュールスコープ配置による最適化
- 不要な THREE オブジェクトインスタンス化を削除
- 重大な性能課題: なし

### テスト結果（Refactorフェーズ完了時）

```
Test Files  4 passed (4)
Tests       72 passed (72)
```

### 品質判定

✅ 高品質

- テスト: 72/72 全通過
- Biome チェック: クリア（修正なし）
- ファイルサイズ: 全ファイル 500行未満
- Viewer Isolation: 確認済み

---

## 現在のフェーズ: 完了（Refactorフェーズ完了）

**作成者**: Claude Code
**最終更新**: 2026-03-25
