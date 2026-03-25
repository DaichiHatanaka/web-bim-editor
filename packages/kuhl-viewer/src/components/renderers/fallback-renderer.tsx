/**
 * 【機能概要】: 未実装ノードタイプ用フォールバックレンダラー
 * 【改善内容】: propsの役割とライフサイクル（Phase 1プレースホルダー）を明確化。
 *              後続タスクで個別レンダラーに置換する際の指針をコメントに追記。
 * 【設計方針】: Phase 1段階で個別レンダラー（HvacZoneRenderer等）が未実装のノードに対して
 *              一時的なBoxGeometryを表示するプレースホルダーコンポーネント。
 *              ワイヤーフレーム表示により「未実装」状態を視覚的に明示する。
 * 【保守性】: nodeId/nodeType を受け取ることで、将来のデバッグオーバーレイ表示や
 *              ログ出力に拡張しやすい設計にしている。
 * 【テスト対応】: TC-005（hvac_zone）, TC-006（ahu）の「nullでないReact要素が返される」検証
 * 🟡 黄信号: 要件定義書 セクション2.3 ディスパッチマッピング「FallbackRenderer（BoxGeometry）」から推測
 *
 * 参照要件: REQ-003
 * 参照設計文書: docs/design/kuhl-hvac-editor/architecture.md — レンダラーパターン
 */

import type React from 'react'

type FallbackRendererProps = {
  /**
   * 【プロパティ】: デバッグ・将来拡張用のノードID
   * 【用途】: 現時点では未使用。将来的にデバッグオーバーレイやツールチップ表示に使用予定。
   * 🟡 黄信号: Phase 1では未使用だが、後続タスクでの拡張を想定してプロップとして保持
   */
  nodeId?: string
  /**
   * 【プロパティ】: デバッグ・将来拡張用のノードタイプ
   * 【用途】: 現時点では未使用。将来的にラベル表示やロギングに使用予定。
   * 🟡 黄信号: Phase 1では未使用だが、後続タスクでの拡張を想定してプロップとして保持
   */
  nodeType?: string
}

/**
 * 【機能概要】: 未実装ノードタイプに対するBoxGeometryフォールバック表示
 * 【改善内容】: 将来拡張性を考慮してpropsを受け取る設計を維持しつつ、
 *              現時点では未使用であることをコメントで明示。
 * 【設計方針】: Three.js mesh と BoxGeometry を使用したプレースホルダー。
 *              ワイヤーフレームにより実装済み3Dオブジェクトと視覚的に区別できる。
 * 【パフォーマンス】: BoxGeometry（1x1x1）は最軽量のプリミティブ。
 *              プレースホルダーとして性能オーバーヘッドは最小限。
 * 【保守性】: 後続タスクで各ノードタイプの個別レンダラーが実装されたら、
 *              NodeRenderer の switch-case を更新してこのコンポーネントを削除する。
 * 🟡 黄信号: 要件定義書 セクション2.3 の設計意図に基づく最小限実装
 * @param props.nodeId - デバッグ用のノードID（将来拡張用、現時点では未使用）
 * @param props.nodeType - デバッグ用のノードタイプ（将来拡張用、現時点では未使用）
 * @returns BoxGeometry を持つ mesh要素（ワイヤーフレームで未実装状態を表示）
 */
export const FallbackRenderer: React.FC<FallbackRendererProps> = ({
  // 【将来拡張用props】: 現時点では未使用だが、デバッグオーバーレイ等への拡張を想定して保持
  // 🟡 黄信号: アンダースコアプレフィックスにより「意図的に未使用」であることを明示
  nodeId: _nodeId,
  nodeType: _nodeType,
}) => {
  // 【フォールバック実装】: 未実装タイプにBoxGeometryで仮表示
  // 【実装内容】: Phase 1段階のプレースホルダー。後続タスク（TASK-0013等）で個別レンダラーに置換予定
  return (
    <mesh>
      {/* 【ジオメトリ】: BoxGeometry（デフォルトサイズ1x1x1）でプレースホルダーを表示 */}
      {/* 🔵 青信号: 最軽量プリミティブとして BoxGeometry を選択 */}
      <boxGeometry args={[1, 1, 1]} />
      {/* 【マテリアル】: wireframeで未実装状態を視覚的に区別。グレー（#888888）で中立的な表示 */}
      {/* 🟡 黄信号: wireframe表示による「未実装」の視覚的明示 */}
      <meshBasicMaterial color="#888888" wireframe />
    </mesh>
  )
}
