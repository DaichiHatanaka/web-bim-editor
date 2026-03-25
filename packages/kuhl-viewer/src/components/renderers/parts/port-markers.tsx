/**
 * TASK-0021: EquipmentRenderer - PortMarkers コンポーネント
 *
 * 【機能概要】: node.ports 配列から各ポートの相対位置に球マーカーを表示するコンポーネント
 * 【実装方針】: Three.js の SphereGeometry と MeshStandardMaterial を使用して
 *              ポート位置に小さな球を描画する。medium 別カラーと direction 別 emissiveIntensity を適用
 * 【リファクタ改善】: PortMarkersInner 内部コンポーネントを削除し、単一コンポーネントに統合。
 *                    SphereGeometry を useMemo でフック呼び出し後に early return する構造に変更
 * 【テスト対応】: TC-HP-005, TC-ERR-010, TC-EDGE-015
 * 🔵 青信号: 要件定義書 FR-004.1〜FR-004.8 から直接確認済み
 */

import type { PortDef } from '@kuhl/core'
import type { FC } from 'react'
import { useMemo } from 'react'
import * as THREE from 'three'
import { EDITOR_LAYER } from '../../../constants/layers'
import { getPortColor } from '../../../constants/port-styles'

// 【型定義】: PortMarkers コンポーネントの Props 型
// 🔵 青信号: 要件定義書 FR-004 Props 仕様から直接確認済み
export interface PortMarkersProps {
  /** ポート定義配列 */
  ports: PortDef[]
}

/**
 * PortMarkers: ポート位置に球マーカーを表示する
 *
 * 【機能概要】: ports 配列の各ポートに対して相対位置に球マーカーを描画する
 * 【実装方針】: SphereGeometry インスタンスを useMemo で1つ生成して全ポートで共有し、
 *              メモリを節約する。各ポートの MeshStandardMaterial は medium 別カラーと
 *              direction 別 emissiveIntensity を持つ
 * 【改善内容】: PortMarkersInner 内部コンポーネントを廃止し、単一コンポーネントに統合した。
 *              useMemo を early return の前に配置して React Hooks ルールに準拠
 * 【テスト対応】: TC-HP-005 (ポート数分の球メッシュ生成), TC-ERR-010 (空配列で非表示),
 *               TC-EDGE-015 (20個以上のポート)
 * 🔵 青信号: 要件定義書 FR-004.1〜FR-004.8 に基づく実装
 */
export const PortMarkers: FC<PortMarkersProps> = ({ ports }) => {
  // 【球ジオメトリ生成】: radius 0.05m の球ジオメトリを1つ生成して全ポートで共有
  // 【メモリ最適化】: ポート数分のジオメトリ生成を回避（NFR-002.2）
  // 【注意】: React Hooks ルール遵守のため early return の前に配置
  // 🔵 青信号: 要件定義書 FR-004.2 radius: 0.05m, NFR-002.2 から確認済み
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.05, 8, 6), [])

  // 【空配列チェック】: ports が空配列の場合は何も描画しない
  // 【テスト対応】: TC-ERR-010, EC-003 - 空 ports 配列で PortMarkers が描画されないこと
  // 🔵 青信号: 要件定義書 FR-004.7 から直接確認済み
  if (!ports || ports.length === 0) return null

  return (
    <>
      {ports.map((port) => {
        // 【カラー取得】: ポートの medium からカラーを取得する
        // 🔵 青信号: 要件定義書 FR-004.3 から確認済み
        const color = getPortColor(port.medium)

        // 【emissiveIntensity 設定】: direction 別に emissiveIntensity を設定
        // 【in方向】: emissiveIntensity = 0.3（控えめな発光）
        // 【out方向】: emissiveIntensity = 0.6（明るい発光）
        // 🔵 青信号: 要件定義書 FR-004.4, FR-004.5 から直接確認済み
        const emissiveIntensity = port.direction === 'out' ? 0.6 : 0.3

        return (
          <mesh
            key={port.id}
            name={port.id}
            position={port.position}
            geometry={sphereGeometry}
            onUpdate={(self) => {
              // 【レイヤー設定】: ポートマーカーを EDITOR_LAYER(1) に割り当てる
              // 🔵 青信号: 要件定義書 FR-004.6 EDITOR_LAYER 割り当てから確認済み
              self.layers.set(EDITOR_LAYER)
            }}
          >
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
        )
      })}
    </>
  )
}
