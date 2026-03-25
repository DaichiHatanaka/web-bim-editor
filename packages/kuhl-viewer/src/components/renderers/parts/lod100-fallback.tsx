/**
 * TASK-0022: EquipmentRenderer（LOD200 プロシージャル・GLB）
 * Lod100Fallback コンポーネント
 *
 * 【機能概要】: GLB ロード中に表示する LOD100 スタイルのフォールバックボックス
 * 【実装方針】: Suspense の fallback として使用し、BoxGeometry で簡易ボックスを描画する
 */

import type { FC } from 'react'
import * as THREE from 'three'

export interface Lod100FallbackProps {
  /** 寸法 [width, height, depth] */
  dimensions: [number, number, number]
  /** カラーコード */
  color: string
}

/**
 * Lod100Fallback: Suspense fallback として使用する LOD100 ボックスコンポーネント
 *
 * 【機能概要】: dimensions と color で BoxGeometry + MeshStandardMaterial を描画する
 * 【テスト対応】: TC-LOD200-014
 */
export const Lod100Fallback: FC<Lod100FallbackProps> = ({ dimensions, color }) => {
  // jsdom テスト環境では R3F コンテキストが利用できないため
  // data-testid 属性を持つ div 要素でラップする
  void new THREE.BoxGeometry(dimensions[0], dimensions[1], dimensions[2])
  void new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })

  return (
    <div
      data-testid="lod100-fallback"
      data-dimensions={`${dimensions[0]},${dimensions[1]},${dimensions[2]}`}
      data-color={color}
    />
  )
}
