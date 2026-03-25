/**
 * TASK-0022: EquipmentRenderer（LOD200 プロシージャル・GLB）
 * LOD ユーティリティ純粋関数
 *
 * 【機能概要】: LOD 値と機器タイプに基づくレンダリング設定を決定する純粋関数群
 * 【設計方針】: 副作用なし・テスト容易性・再利用性を重視した純粋関数として実装
 * 🔵 青信号: TASK-0022 要件定義 FR-001〜FR-003 から確認済み
 */

/**
 * 【型定義】: LOD レンダラータイプ
 * - 'lod100': シンプルな BoxGeometry による低詳細表示
 * - 'lod200': プロシージャル形状または GLB モデルによる高詳細表示
 * 🔵 青信号: FR-001.1〜FR-001.5 から確認済み
 */
export type LodRendererType = 'lod100' | 'lod200'

/**
 * 【型定義】: プロシージャル形状設定
 *
 * 【設計方針】: 機器タイプごとに異なる寸法比率を保持し、
 *              BoxGeometry の高さ方向スケーリングに使用する
 * 🔵 青信号: FR-003.1〜FR-003.4 から確認済み
 */
export interface ProceduralShapeConfig {
  /**
   * 高さスケール係数
   * - 1.0: フル寸法（AHU）
   * - 0.25: 薄型（PAC）
   * - 0.6: コンパクト（FCU）
   */
  heightScale: number
}

/**
 * LOD 値からレンダラータイプ文字列を返す純粋関数
 *
 * 【機能概要】: node.lod 属性の値を LodRendererType 文字列にマッピングする
 * 【フォールバック戦略】: '200' 以外の値（undefined・'100'・未知値）は 'lod100' にデフォルト
 * 【設計方針】: 未知の LOD 値に対して安全にフォールバックし、
 *              描画エラーを防ぐ防御的実装
 * 🔵 青信号: FR-001.1〜FR-001.5 から確認済み
 * @param lod - LOD 値文字列（例: '100', '200'）または undefined
 * @returns LodRendererType - レンダラータイプ文字列
 */
export function getLodRenderer(lod: string | undefined): LodRendererType {
  // 【LOD200 判定】: '200' の場合のみ lod200 を返し、その他はすべて lod100 にフォールバック
  if (lod === '200') return 'lod200'
  return 'lod100'
}

/**
 * 機器タイプから LOD200 プロシージャル形状設定を返す純粋関数
 *
 * 【機能概要】: 機器タイプに対応する heightScale を含む形状設定を返す
 * 【対応タイプ】:
 *   - 'ahu': フル寸法（heightScale: 1.0）
 *   - 'pac': 薄型（heightScale: 0.25）
 *   - 'fcu': コンパクト（heightScale: 0.6）
 * 【フォールバック】: 未知タイプは null を返し、呼び出し側でフォールバック処理を行う
 * 🔵 青信号: FR-003.1〜FR-003.4 から確認済み
 * @param type - 機器タイプ文字列（例: 'ahu', 'pac', 'fcu'）
 * @returns ProceduralShapeConfig | null - 対応タイプなら設定オブジェクト、未知タイプなら null
 */
export function getProceduralShape(type: string): ProceduralShapeConfig | null {
  switch (type) {
    case 'ahu':
      // 【AHU】: フル寸法で描画（heightScale: 1.0）
      return { heightScale: 1.0 }
    case 'pac':
      // 【PAC】: 天井カセット型で薄型描画（heightScale: 0.25）
      return { heightScale: 0.25 }
    case 'fcu':
      // 【FCU】: ファンコイルユニットのコンパクト描画（heightScale: 0.6）
      return { heightScale: 0.6 }
    default:
      // 【未知タイプ】: null を返して呼び出し側でフォールバック処理
      return null
  }
}
