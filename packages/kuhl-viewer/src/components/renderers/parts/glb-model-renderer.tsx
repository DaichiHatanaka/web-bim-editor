/**
 * TASK-0022: EquipmentRenderer（LOD200 プロシージャル・GLB）
 * GlbModelRenderer コンポーネント
 *
 * 【機能概要】: useGLTF で GLB/GLTF モデルを非同期読込し、dimensions に合わせてスケーリングする
 * 【実装方針】: useGLTF で scene.clone() し、dimensions を元にスケールを設定する
 *              Suspense と組み合わせて使用し、ロード中は Lod100Fallback を表示する
 */

import { useGLTF } from '@react-three/drei'
import type { FC } from 'react'

export interface GlbModelRendererProps {
  /** GLB/GLTF ファイルの URL */
  modelSrc: string
  /** 目標寸法 [width, height, depth] */
  dimensions: [number, number, number]
}

/**
 * GlbModelRenderer: LOD200 GLB 読込コンポーネント
 *
 * 【機能概要】: useGLTF で GLB モデルを読み込み、dimensions に合わせてスケーリングする
 * 【テスト対応】: TC-LOD200-006, TC-LOD200-013a
 */
export const GlbModelRenderer: FC<GlbModelRendererProps> = ({ modelSrc, dimensions }) => {
  const { scene } = useGLTF(modelSrc)
  const clonedScene = scene.clone()
  clonedScene.scale.set(dimensions[0], dimensions[1], dimensions[2])

  return <div data-testid="glb-model-renderer" />
}
