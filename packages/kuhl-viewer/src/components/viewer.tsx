/**
 * 【機能概要】: Kuhl HVAC Editor の3DビューポートメインコンポーネントViewer
 * 【改善内容】: selectionManager propsの将来拡張意図をコメントで明確化。
 *              Canvas設定（dpr制限、カメラ位置）の設計根拠を追記。
 * 【設計方針】: React Three Fiber の Canvas をラップし、OrbitControls、Grid、
 *              ライティング等の基本構成要素を含む。Viewer Isolation原則に基づき、
 *              children injection により apps/kuhl-editor から固有UIを注入できる設計。
 * 【保守性】: Viewer自体はエディタ固有ロジックを持たない。全てのエディタ機能は
 *              children経由で注入するパターンを維持する（REQ-009）。
 * 【テスト対応】:
 *   - TC-010: children injection で子コンポーネントを描画する
 *   - children なしでも正常にレンダリングされる
 *   - R3F Canvas 要素を含む
 *   - perf=true の場合に Stats を表示する
 *   - perf=false の場合に Stats を表示しない
 * 🔵 青信号: 既存 packages/viewer/src/components/viewer/index.tsx パターンから確認済み
 *
 * 参照要件: REQ-003, REQ-007, REQ-009
 * 参照設計文書: docs/design/kuhl-hvac-editor/architecture.md — Viewer Isolation原則
 *              docs/design/kuhl-hvac-editor/dataflow.md — コアデータフローサイクル
 */

import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls, Stats } from '@react-three/drei'

type ViewerProps = {
  /**
   * 【プロパティ】: children injection用。エディタ固有ツール・UIを注入
   * 【設計意図】: Viewer Isolation原則（REQ-009）に基づき、Viewer自体はエディタロジックを持たない。
   *              ツール、SelectionManager等のエディタ固有コンポーネントはchildren経由で注入する。
   * 🔵 青信号: REQ-009 Viewer Isolation原則から確認済み
   */
  children?: React.ReactNode
  /**
   * 【プロパティ】: 選択マネージャーの制御
   * 【設計意図】: 将来的にカスタム選択マネージャーをサポートするための拡張ポイント。
   *              Phase 1では 'default' のみ実装。'custom' は後続タスクで実装予定。
   * 🟡 黄信号: 要件定義書 セクション2.1 に定義。'custom'の実装は後続タスク。
   * @default 'default'
   */
  selectionManager?: 'default' | 'custom'
  /**
   * 【プロパティ】: パフォーマンスモニター表示フラグ
   * 【用途】: 開発・デバッグ時にFPS、メモリ使用量等のメトリクスを表示する。
   *          本番環境では false（デフォルト）にして不要なオーバーヘッドを削除する。
   * 🔵 青信号: 要件定義書 セクション2.1 Viewer props 定義から確認済み
   * @default false
   */
  perf?: boolean
}

/**
 * 【機能概要】: 3DビューポートのメインコンポーネントViewer
 * 【改善内容】: ViewerPropsの各プロパティにより詳細なJSDocを追加。
 *              Canvas設定値（カメラ位置、dpr制限）の設計根拠をコメントで明文化。
 * 【設計方針】: R3F Canvas をラップし、基本的な3Dシーン構成要素（Grid, OrbitControls,
 *              ライティング）を提供する。perf prop でパフォーマンスモニターを制御。
 *              Viewer自体はステートレスに保ち、状態は useViewer/useScene に委譲する。
 * 【パフォーマンス】: dpr={[1, 1.5]} でデバイスピクセル比を制限し、高DPIディスプレイでの
 *              レンダリング負荷を抑制する（NFR-001: 60fps維持）。
 * 【テスト対応】: TC-010 および Viewer基本構造テストケース群を通す
 * 🔵 青信号: 既存Pascal Viewerパターンと要件定義書 セクション2.1 から確認済み
 * @param props.children - children injection用（Viewer Isolation原則に基づく）
 * @param props.selectionManager - 選択マネージャーの制御（'default'|'custom'）。Phase 1では 'default' のみ。
 * @param props.perf - パフォーマンスモニター表示フラグ（デフォルト: false）
 * @returns R3F Canvas要素（3Dビューポート）
 */
export const Viewer: React.FC<ViewerProps> = ({
  children,
  // 【将来拡張用prop】: Phase 1では未使用。後続タスクでカスタム選択マネージャーを実装する際に使用する。
  // 🟡 黄信号: アンダースコアプレフィックスにより「意図的に未使用」であることを明示
  selectionManager: _selectionManager = 'default',
  perf = false,
}) => {
  // 【Canvas設定】: WebGPURenderer用の基本設定
  // 【カメラ位置】: [50, 50, 50] — 典型的なHVAC設備（建物スケール）を俯瞰できるデフォルト位置
  // 【FOV】: 50 — 建築CAD用途に適した視野角。広角すぎず歪みが少ない。
  // 【dpr制限】: [1, 1.5] — 高DPIディスプレイで最大1.5倍に制限し、60fps維持（NFR-001）
  // 🔵 青信号: 要件定義書 セクション2.1 内部構成要素から確認済み
  return (
    <Canvas
      camera={{ position: [50, 50, 50], fov: 50 }}
      dpr={[1, 1.5]}
      shadows
    >
      {/* 【ライティング】: 基本ライティング設定 */}
      {/* 🔵 青信号: 要件定義書 セクション2.1 内部構成要素（AmbientLight + DirectionalLight）から確認 */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.0}
        castShadow
      />

      {/* 【グリッド】: XZ平面上のグリッド表示 */}
      {/* 🔵 青信号: 要件定義書 セクション2.1 内部構成要素（GridHelper）から確認済み */}
      <Grid
        infiniteGrid
        cellSize={1}
        sectionSize={10}
        fadeDistance={200}
      />

      {/* 【カメラ制御】: マウス操作による3Dカメラ制御 */}
      {/* 🔵 青信号: 要件定義書 セクション2.1 内部構成要素（OrbitControls）から確認済み */}
      <OrbitControls />

      {/* 【パフォーマンスモニター】: perf=true の場合のみ表示 */}
      {/* 【テスト対応】: perf=true → Stats表示、perf=false → Stats非表示 */}
      {/* 🟡 黄信号: 要件定義書 Viewer props 定義より perf prop が存在することを確認 */}
      {perf && <Stats />}

      {/* 【children injection】: Viewer Isolation原則に基づくエディタ固有機能の注入ポイント */}
      {/* 【テスト対応】: TC-010 — children injection で子コンポーネントを描画する */}
      {/* 🔵 青信号: REQ-009 Viewer Isolation原則から確認済み */}
      {children}
    </Canvas>
  )
}
