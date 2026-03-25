/**
 * TASK-0021: EquipmentRenderer（LOD100 ボックス表示）
 *
 * 【機能概要】: HvacEquipmentBase を継承する全機器ノードを LOD100 で BoxGeometry 描画する
 *              React Three Fiber コンポーネント
 * 【実装方針】: zone-renderer.tsx パターンを踏襲し、useScene からノードを取得して
 *              BoxGeometry で描画する。TagLabel と PortMarkers を統合し、
 *              sceneRegistry への登録/解除を行う
 * 【テスト対応】: TC-HP-001〜TC-HP-007, TC-ERR-009〜TC-ERR-012, TC-SUP-016〜TC-SUP-018
 * 🔵 青信号: 要件定義書 FR-001〜FR-005、zone-renderer.tsx パターンから確認済み
 */

import type { AnyNodeId, HvacEquipmentBase } from '@kuhl/core'
import { sceneRegistry, useScene } from '@kuhl/core'
import type { FC } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getEquipmentColor } from '../../constants/equipment-colors'
import { SCENE_LAYER } from '../../constants/layers'
import { PortMarkers } from './parts/port-markers'
import { TagLabel } from './parts/tag-label'

// ─── Props 型定義 ─────────────────────────────────────────────────────────

// 【型定義】: EquipmentRenderer コンポーネントの Props 型
// 🔵 青信号: 要件定義書 FR-005 Props 仕様から直接確認済み
export interface EquipmentRendererProps {
  /** レンダリング対象のノードID */
  nodeId: AnyNodeId
}

// ─── 純粋関数エクスポート ──────────────────────────────────────────────────

// 【機器タイプ集合】: HvacEquipmentBase を継承する全13種の機器タイプを定数として定義
// 【パフォーマンス】: 関数呼び出しごとに Set を生成しないようモジュールスコープに配置
// 🔵 青信号: 要件定義書 FR-001 対象ノードタイプ（全13種）から確認済み
const EQUIPMENT_TYPES = new Set([
  'ahu',
  'pac',
  'fcu',
  'vrf_outdoor',
  'vrf_indoor',
  'diffuser',
  'damper',
  'fan',
  'pump',
  'chiller',
  'boiler',
  'cooling_tower',
  'valve',
])

/**
 * 【機能概要】: ノードが機器ノード（HvacEquipmentBase）かどうかを判定する型ガード
 * 【実装方針】: type プロパティが機器タイプ13種のいずれかであり、
 *              dimensions, position, rotation, tag を持つかチェック
 * 【パフォーマンス】: EQUIPMENT_TYPES はモジュールスコープ定数を参照して毎回の生成を回避
 * 【テスト対応】: isEquipmentNode の型ガード検証
 * 🔵 青信号: 要件定義書 FR-001, HvacEquipmentBase スキーマから確認済み
 * @param node - 検証対象のノードオブジェクト
 * @returns node が HvacEquipmentBase 型ならば true
 */
export function isEquipmentNode(node: unknown): node is HvacEquipmentBase {
  // 【型チェック】: オブジェクトかつ null でないことを確認
  if (!node || typeof node !== 'object') return false
  const n = node as Record<string, unknown>

  // 【必須フィールドチェック】: HvacEquipmentBase の必須フィールドが存在するか確認
  return (
    typeof n.type === 'string' &&
    EQUIPMENT_TYPES.has(n.type) &&
    Array.isArray(n.dimensions) &&
    Array.isArray(n.position) &&
    Array.isArray(n.rotation) &&
    typeof n.tag === 'string'
  )
}

/**
 * 【機能概要】: dimensions の値が有効（全て正の数）かどうかを検証する
 * 【実装方針】: 全ての次元値が 0 より大きい正の数であることを確認する
 *              ゼロや負の値は Three.js のゼロサイズジオメトリ生成を防止するため無効とする
 * 【テスト対応】: TC-HP-001 (有効値), TC-ERR-009 (ゼロ値), TC-EDGE-014 (負の値)
 * 🔵 青信号: 要件定義書 FR-001.1, EC-002 から確認済み
 * @param dimensions - 寸法配列 [width, height, depth]
 * @returns 全次元値が正の数ならば true
 */
export function validateDimensions(dimensions: [number, number, number]): boolean {
  // 【バリデーション】: 全ての次元値が 0 より大きいことを確認
  // 【EC-002 対応】: ゼロまたは負の値は無効として false を返す
  // 🔵 青信号: 要件定義書 EC-002 から直接確認済み
  return dimensions[0] > 0 && dimensions[1] > 0 && dimensions[2] > 0
}

// ─── EquipmentRenderer コンポーネント ────────────────────────────────────

/**
 * EquipmentRenderer: 機器ノードを LOD100 BoxGeometry で描画するコンポーネント
 *
 * 【機能概要】: HvacEquipmentBase を継承する機器ノードを BoxGeometry で描画し、
 *              TagLabel と PortMarkers を統合する
 * 【実装方針】: zone-renderer.tsx のパターンを踏襲し、useMemo で geometry/material を
 *              最適化し、useEffect で sceneRegistry への登録/解除を行う
 * 【テスト対応】: TC-HP-007 (registry登録), TC-SUP-016 (存在しないノード),
 *               TC-SUP-017 (アンマウント時削除), TC-HP-004b (TagLabel統合)
 * 🔵 青信号: 要件定義書 FR-005 および zone-renderer.tsx パターンから確認済み
 */
export const EquipmentRenderer: FC<EquipmentRendererProps> = ({ nodeId }) => {
  // 【ノード取得】: useScene からノードIDでノードを取得する
  // 🔵 青信号: 要件定義書 FR-005.5 から確認済み
  const node = useScene((state) => (nodeId ? state.nodes[nodeId] : undefined))
  const meshRef = useRef<THREE.Mesh>(null)

  // 【equipmentNode 判定】: isEquipmentNode で機器ノードかどうか確認
  const equipmentNode = isEquipmentNode(node) ? node : null

  // 【dimensions 取得】: 機器ノードの寸法を取得（ノードが無効な場合はダミー値）
  // 【注意】: フック呼び出しの前に early return できないため null チェックは後で行う
  const dimensions = equipmentNode
    ? (equipmentNode.dimensions as [number, number, number])
    : ([0.01, 0.01, 0.01] as [number, number, number])

  // 【BoxGeometry 生成】: dimensions から BoxGeometry を useMemo で生成
  // 【最適化】: dimensions が変更された時のみ再生成する
  // 🔵 青信号: 要件定義書 FR-001.1, NFR-001.1 から確認済み
  const geometry = useMemo(
    () => new THREE.BoxGeometry(dimensions[0], dimensions[1], dimensions[2]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dimensions[0], dimensions[1], dimensions[2]],
  )

  // 【MeshStandardMaterial 生成】: 機器タイプ別カラーで MeshStandardMaterial を生成
  // 【最適化】: ノードタイプが変更された時のみ再生成する
  // 🔵 青信号: 要件定義書 FR-002.3 MeshStandardMaterial プロパティから確認済み
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: getEquipmentColor(equipmentNode?.type ?? ''),
        transparent: false,
        roughness: 0.7,
        metalness: 0.1,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipmentNode?.type],
  )

  // 【sceneRegistry 登録/解除】: マウント時に登録し、アンマウント時に解除する
  // 🔵 青信号: 要件定義書 FR-005.1, FR-005.2, FR-005.3 から確認済み
  useEffect(() => {
    if (!equipmentNode) return
    const mesh = meshRef.current
    if (!mesh) return

    // 【登録】: sceneRegistry.nodes と byType に nodeId を登録
    // 🔵 青信号: 要件定義書 FR-005.1, FR-005.2 から確認済み
    sceneRegistry.nodes.set(nodeId, mesh)
    const nodeType = equipmentNode.type as keyof typeof sceneRegistry.byType
    if (sceneRegistry.byType[nodeType]) {
      sceneRegistry.byType[nodeType].add(nodeId)
    }

    return () => {
      // 【解除】: アンマウント時に sceneRegistry から削除
      // 🔵 青信号: 要件定義書 FR-005.3, NFR-002.3 から確認済み
      sceneRegistry.nodes.delete(nodeId)
      if (sceneRegistry.byType[nodeType]) {
        sceneRegistry.byType[nodeType].delete(nodeId)
      }
    }
  }, [nodeId, equipmentNode])

  // 【GPU メモリ解放】: アンマウント時に geometry と material を dispose してメモリリークを防ぐ
  // 🔵 青信号: 要件定義書 NFR-002.1, EC-008 から確認済み
  useEffect(() => {
    return () => {
      geometry?.dispose()
      material?.dispose()
    }
  }, [geometry, material])

  // 【ノード存在確認】: フック呼び出し後にノードの有効性をチェックして早期リターン
  // 【EC-001 対応】: 存在しないノードIDに対してクラッシュしない
  // 🔵 青信号: 要件定義書 FR-005.5, EC-001 から確認済み
  if (!equipmentNode) return null

  // 【TagLabel オフセット計算】: 機器上方のオフセット位置を計算する
  // 【計算式】: [0, dimensions[1] / 2 + 0.3, 0] で機器上面から 0.3m 上
  // 🔵 青信号: 要件定義書 FR-003.2 から確認済み
  const tagLabelOffset: [number, number, number] = [0, dimensions[1] / 2 + 0.3, 0]

  return (
    // 【グループ設定】: position と rotation を group で適用し visible を制御
    // 🔵 青信号: 要件定義書 FR-001.2, FR-001.3, FR-005.7 から確認済み
    <group
      position={equipmentNode.position as [number, number, number]}
      rotation={equipmentNode.rotation as [number, number, number]}
      visible={equipmentNode.visible !== false}
    >
      {/* 【メッシュ描画】: BoxGeometry と MeshStandardMaterial でボックスを描画 */}
      {/* 【SCENE_LAYER 割り当て】: onUpdate で SCENE_LAYER(0) に設定 */}
      {/* 🔵 青信号: 要件定義書 FR-001.5 SCENE_LAYER 割り当てから確認済み */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onUpdate={(self) => {
          self.layers.set(SCENE_LAYER)
        }}
      />

      {/* 【TagLabel 表示】: タグ名を機器上方に表示する */}
      {/* 🔵 青信号: 要件定義書 FR-003, FR-005.6 から確認済み */}
      <TagLabel tag={equipmentNode.tag} offset={tagLabelOffset} />

      {/* 【PortMarkers 表示】: ポートマーカーを表示する */}
      {/* 🔵 青信号: 要件定義書 FR-004, FR-005.6 から確認済み */}
      <PortMarkers ports={equipmentNode.ports ?? []} />
    </group>
  )
}
