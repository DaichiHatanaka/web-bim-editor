/**
 * TASK-0021: EquipmentRenderer - TagLabel コンポーネント
 *
 * 【機能概要】: 機器タグ名（例: "AHU-101"）を3Dビュー上に表示するコンポーネント
 * 【実装方針】: Drei の Html コンポーネントを使用して機器の上方にタグテキストを表示する
 *              tag が空文字の場合は null を返して表示しない
 * 【テスト対応】: TC-HP-004, TC-ERR-011
 * 🔵 青信号: 要件定義書 FR-003.1〜FR-003.6 から直接確認済み
 */

import { Html } from '@react-three/drei'
import type { FC } from 'react'

// 【型定義】: TagLabel コンポーネントの Props 型
// 🔵 青信号: 要件定義書 FR-003 Props 仕様から直接確認済み
export interface TagLabelProps {
  /** タグ名テキスト（例: "AHU-101"）。空文字の場合は非表示 */
  tag: string
  /** 機器中心からの相対位置オフセット [x, y, z] */
  offset: [number, number, number]
}

/**
 * TagLabel: Drei Html コンポーネントで機器上方にタグ名を表示する
 *
 * 【機能概要】: 機器の上方に HTML テキストラベルを3D空間上に表示する
 * 【実装方針】: Drei Html コンポーネントを使用して WebGL レイヤーと同期した
 *              HTML ラベルを表示する。distanceFactor でカメラ距離に依存しない
 *              一定サイズを保つ
 * 【テスト対応】: TC-HP-004 (タグテキスト表示), TC-ERR-011 (空文字で非表示)
 * 🔵 青信号: 要件定義書 FR-003.1, FR-003.4, FR-003.5, FR-003.6 に基づく実装
 */
export const TagLabel: FC<TagLabelProps> = ({ tag, offset }) => {
  // 【空文字チェック】: tag が空文字または undefined の場合は何も描画しない
  // 【テスト対応】: TC-ERR-011, EC-004 - 空文字 tag で TagLabel が描画されないこと
  // 🔵 青信号: 要件定義書 FR-003.4 から直接確認済み
  if (!tag) return null

  // 【ラベル表示】: Drei Html コンポーネントで3D空間内にHTMLを表示
  // 【distanceFactor】: カメラ距離に依存せず一定サイズを保つ（FR-003.5）
  // 【zIndexRange】: z-fighting 防止（FR-003.6）
  // 🔵 青信号: 要件定義書 FR-003.1, FR-003.5, FR-003.6 から確認済み
  return (
    <Html position={offset} distanceFactor={10} zIndexRange={[0, 0]}>
      {/* 【スタイル適用】: 要件定義書 FR-003.3 の CSS プロパティに基づくスタイル */}
      {/* 🔵 青信号: 要件定義書 FR-003.3 から直接確認済み */}
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#333333',
          background: 'rgba(255, 255, 255, 0.85)',
          padding: '2px 6px',
          borderRadius: '3px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {tag}
      </div>
    </Html>
  )
}
