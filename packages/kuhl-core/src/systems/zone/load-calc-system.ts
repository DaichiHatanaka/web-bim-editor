import type { HvacZoneNode } from '../../schema/nodes/hvac-zone'
import useScene from '../../store/use-scene'
import { calculateZoneLoad } from './load-calc'

// -----------------------------------------------------------------
// processLoadCalc: dirtyNodes を走査して hvac_zone ノードの負荷を再計算する
// LoadCalcSystem コンポーネントの useFrame 内ロジック。
// テスト時はこの関数を直接呼び出す。
// -----------------------------------------------------------------
export function processLoadCalc(): void {
  const { dirtyNodes, nodes, updateNode, clearDirty } = useScene.getState()
  const temporal = useScene.temporal.getState()

  // システム再計算による updateNode は undo/redo 履歴に含めない
  temporal.pause()

  try {
    for (const id of Array.from(dirtyNodes)) {
      const node = nodes[id]
      if (!node || node.type !== 'hvac_zone') continue

      const zone = node as HvacZoneNode
      const loadResult = calculateZoneLoad(zone)

      updateNode(id, { loadResult } as Partial<HvacZoneNode>)
      // updateNode が markDirty を呼ぶため、無限ループを防ぐために直後に clearDirty する
      clearDirty(id)
    }
  } finally {
    temporal.resume()
  }
}

// -----------------------------------------------------------------
// LoadCalcSystem: React コンポーネント（System パターン）
// useFrame(priority=2) 内で processLoadCalc を実行する。
// -----------------------------------------------------------------
let LoadCalcSystem: React.FC

try {
  // React Three Fiber の useFrame を動的に使用
  // テスト環境では @react-three/fiber が利用不可のためフォールバック
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import for conditional R3F usage
  const { useFrame } = require('@react-three/fiber') as any
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import for conditional React usage
  const React = require('react') as any

  LoadCalcSystem = function LoadCalcSystemImpl() {
    useFrame(processLoadCalc, 2)
    return null
  }
  LoadCalcSystem.displayName = 'LoadCalcSystem'
} catch {
  // テスト環境など @react-three/fiber が利用できない場合は空コンポーネント
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import for conditional React usage
  const React = require('react') as any
  LoadCalcSystem = function LoadCalcSystemFallback() {
    return null
  }
  LoadCalcSystem.displayName = 'LoadCalcSystem'
}

export { LoadCalcSystem }
