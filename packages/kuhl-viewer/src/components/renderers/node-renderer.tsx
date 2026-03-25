/**
 * 【機能概要】: node.type に基づいて適切なレンダラーコンポーネントにディスパッチするNodeRenderer
 * 【実装方針】: useScene からノードを取得し、node.type の switch文でディスパッチする。
 *              plant/building/level は3Dジオメトリを持たないため null を返す。
 *              未実装タイプには FallbackRenderer を使用する。
 * 【テスト対応】:
 *   - TC-005: hvac_zone → FallbackRenderer（Phase 1）
 *   - TC-006: ahu → FallbackRenderer（Phase 1）
 *   - TC-007: plant → null
 *   - TC-008: building → null
 *   - TC-009: level → null
 *   - TC-012: 存在しないID → null
 *   - TC-013: undefined ID → null（クラッシュしない）
 *   - TC-017: 全ノードタイプでクラッシュしない
 * 🔵 青信号: 既存 packages/viewer/src/components/renderers/node-renderer.tsx パターンから確認済み
 *
 * 参照要件: REQ-003, REQ-007
 * 参照設計文書: docs/design/kuhl-hvac-editor/architecture.md — NodeRendererディスパッチャー
 *              docs/design/kuhl-hvac-editor/interfaces.ts — AnyNode型、AnyNodeType型
 */

import type { AnyNodeId } from '@kuhl/core'
import { useScene } from '@kuhl/core'
import type React from 'react'
import { DiffuserRenderer } from './diffuser-renderer'
import { FallbackRenderer } from './fallback-renderer'
import { ZoneRenderer } from './zone-renderer'

type NodeRendererProps = {
  /** 【プロパティ】: 描画対象ノードのID */
  nodeId: AnyNodeId
}

/**
 * 【機能概要】: ノードIDを受け取り、node.type に基づいて適切なレンダラーにディスパッチする
 * 【改善内容】: `useScene.getState()`（同期取得）→ `useScene()` Hook化。
 *              ノード更新時にReactiveに再レンダーされるようになった。
 *              eslint-disable コメントも削除し、React Hooks Rulesを完全遵守。
 * 【設計方針】: Zustandセレクターで必要なノードのみをサブスクライブし、
 *              不要な再レンダーを最小化する。
 * 【パフォーマンス】: セレクター関数で `state.nodes[nodeId]` のみを購読。
 *              全ノード変更ではなく対象ノードの変更時のみ再レンダー。
 * 【保守性】: Hooksルールに準拠することでReact DevToolsでの状態追跡が容易になる。
 * 🔵 青信号: 既存 node-renderer.tsx の useScene Hook使用パターンを踏襲
 * @param props.nodeId - 描画対象ノードのID。undefined/null の場合は安全に null を返す。
 * @returns ノードタイプに対応したReact要素、または null（非表示タイプ・存在しないID・無効なID）
 */
export const NodeRenderer: React.FC<NodeRendererProps> = ({ nodeId }) => {
  // 【Reactiveノード取得】: useScene Hook でノードをサブスクライブ
  // 【改善内容】: getState()の同期取得からHook化へ。ノード更新時に自動再レンダーされる。
  // 【セレクター最適化】: 対象ノードのみをセレクトし、他ノードの変更で再レンダーしない。
  // 【null安全性】: nodeId が falsy の場合は undefined が返るため、後続の if (!node) で捕捉される。
  // 🔵 青信号: Zustand セレクター使用パターン（公式推奨）
  const node = useScene((state) => (nodeId ? state.nodes[nodeId] : undefined))

  // 【存在確認】: ノードが存在しない場合は何も描画しない
  // 【テスト対応】: TC-012（存在しないID → null）、TC-013（undefined ID → null）
  // 【設計意図】: scene からノードが削除された直後の race condition も安全に処理
  // 🔵 青信号: 既存 node-renderer.tsx の if (!node) return null パターン
  if (!node) {
    return null
  }

  // 【ディスパッチ処理】: node.type に基づいて適切なレンダラーを選択
  // 【実装内容】: TypeScript discriminated union を利用した型安全なディスパッチ
  // 【拡張性】: 後続タスク（TASK-0013等）で case を個別レンダラーに置換していく
  // 🟡 黄信号: 要件定義書 セクション2.3 ディスパッチマッピングから推測
  switch (node.type) {
    // 【非表示タイプ】: 階層構造ノードは3Dジオメトリを持たないため null を返す
    // 【テスト対応】: TC-007（plant）, TC-008（building）, TC-009（level）
    // 🔵 青信号: 要件定義書 セクション2.3 で明確に「レンダリングなし」と定義
    case 'plant':
    case 'building':
    case 'level':
      return null

    // 【ZoneRenderer】: TASK-0013 で実装。boundary ポリゴンから半透明着色ゾーンを描画
    // 【テスト対応】: TC-005（hvac_zone → ZoneRenderer）
    // 🔵 青信号: 要件定義書 セクション2.8 NodeRenderer統合
    case 'hvac_zone':
      return <ZoneRenderer nodeId={node.id} />

    // 【FallbackRenderer適用タイプ】: Phase 1段階では個別レンダラーが未実装のため FallbackRenderer を使用
    // 【テスト対応】: TC-006（ahu）
    // 【後続タスク】: TASK-0021（EquipmentRenderer）等で順次置換
    // 🟡 黄信号: Phase 1段階でのFallbackRenderer適用は設計意図に基づく
    case 'diffuser':
      return <DiffuserRenderer nodeId={node.id} />

    case 'ahu':
    case 'pac':
    case 'fcu':
    case 'vrf_outdoor':
    case 'vrf_indoor':
    case 'damper':
    case 'fan':
    case 'pump':
    case 'chiller':
    case 'boiler':
    case 'cooling_tower':
    case 'valve':
    case 'duct_segment':
    case 'duct_fitting':
    case 'pipe_segment':
    case 'pipe_fitting':
    case 'system':
    case 'support':
    case 'architecture_ref':
      // 【FallbackRenderer】: 後続タスクで個別レンダラーに置換予定
      // 🟡 黄信号: Phase 1のプレースホルダーとして明示
      return <FallbackRenderer nodeId={node.id} nodeType={node.type} />

    // 【デフォルトケース】: AnyNode型に含まれない未知のノードタイプに対しても安全に処理
    // 【型安全性】: TypeScriptの exhaustive check 漏れを実行時に補完する防御的実装
    // 【テスト対応】: TC-017 — 全ノードタイプでクラッシュしない
    // 🟡 黄信号: 型安全のための防御的実装。将来的にはnever型チェックに移行可能
    default: {
      // 【型アサーション最小化】: defaultケースの型は never だが実行時に到達する可能性を考慮
      const unknownNode = node as { id: string; type: string }
      return <FallbackRenderer nodeId={unknownNode.id} nodeType={unknownNode.type} />
    }
  }
}
