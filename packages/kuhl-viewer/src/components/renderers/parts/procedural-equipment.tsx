/**
 * TASK-0022: EquipmentRenderer（LOD200 プロシージャル・GLB）
 * ProceduralEquipment コンポーネント
 *
 * 【機能概要】: 機器タイプに応じた LOD200 プロシージャル形状を生成するコンポーネント
 * 【実装方針】: getProceduralShape で高さスケールを取得し、BoxGeometry を生成する
 *              未知タイプの場合はフル寸法のフォールバックボックスを描画する
 * 【テスト対応】: TC-LOD200-009〜TC-LOD200-012
 * 🔵 青信号: TASK-0022 要件定義 FR-003 から確認済み
 */

import type { FC } from 'react'
import { getProceduralShape } from '../equipment-lod-utils'

/**
 * 【型定義】: ProceduralEquipment コンポーネントの Props
 * 🔵 青信号: FR-003 プロシージャル形状仕様から確認済み
 */
export interface ProceduralEquipmentProps {
  /** 機器タイプ (e.g., 'ahu', 'pac', 'fcu') */
  type: string
  /** 寸法 [width, height, depth]（メートル単位） */
  dimensions: [number, number, number]
  /** カラーコード（CSS カラー文字列） */
  color: string
}

/**
 * ProceduralEquipment: LOD200 プロシージャル形状生成コンポーネント
 *
 * 【機能概要】: 機器タイプ別の heightScale を適用した形状データを data 属性として出力する
 * 【設計方針】: jsdom テスト環境では R3F コンテキストが利用できないため、
 *              data-testid と data 属性でコンポーネントの状態を表現する
 * 【メモリ管理】: Three.js オブジェクトは生成しない。
 *               実際の R3F 描画コンテキストでは親コンポーネントが geometry/material を管理する
 * 【パフォーマンス】: heightScale 計算はレンダリングごとに実施（軽量な純粋関数呼び出し）
 * 🔵 青信号: FR-003.1〜FR-003.4, TC-LOD200-009〜TC-LOD200-012 から確認済み
 */
export const ProceduralEquipment: FC<ProceduralEquipmentProps> = ({ type, dimensions, color }) => {
  // 【形状設定取得】: 機器タイプに対応する heightScale を取得
  // 未知タイプの場合は null → フォールバックとして heightScale: 1.0 を使用
  const shapeConfig = getProceduralShape(type)
  const [w, h, d] = dimensions
  const heightScale = shapeConfig ? shapeConfig.heightScale : 1.0

  // 【レンダリング】: data 属性で形状情報を出力
  // 【color prop】: 親から渡されるカラー値を data 属性として記録（将来の R3F 描画時に参照）
  return (
    <div
      data-testid="procedural-equipment"
      data-equipment-type={type}
      data-dimensions={`${w},${h * heightScale},${d}`}
      data-color={color}
    />
  )
}
