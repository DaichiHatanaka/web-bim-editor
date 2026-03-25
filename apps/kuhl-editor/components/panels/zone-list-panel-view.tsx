/**
 * zone-list-panel-view.tsx
 * ゾーン一覧パネル・負荷集計表示 UI コンポーネント（JSX View）
 *
 * 【機能概要】: useScene から hvac_zone ノード一覧を取得し、
 * 各ゾーンの zoneName・usage・floorArea・冷房負荷・暖房負荷を
 * 表形式で表示するパネルコンポーネント。
 * 集計行で合計面積・合計負荷を表示し、
 * ゾーンクリックで3Dビュー選択と連動する。
 * ダブルクリックで属性編集モードに入り updateNode で反映する。
 *
 * 【設計方針】:
 * - 純粋関数・型定義は zone-list-panel.tsx に分離（テスト環境互換のため）
 * - このファイルは JSX を含む View 層のみを担当
 * - ifc-upload-panel-view.tsx と同様の設計分離パターンに準拠
 *
 * 【参照要件】: REQ-105, REQ-110, EDGE-101
 * 🔵 信頼性: 要件定義書 §2, §3 に基づく確実な実装
 */

'use client'

import useScene from '@kuhl/core/store/use-scene'
import type { ZoneUsage } from '@kuhl/core'
import useViewer from '@kuhl/viewer/store/use-viewer'
import { useCallback, useState } from 'react'
import {
  ZONE_USAGE_LABELS,
  calculateZoneSummary,
  formatAreaValue,
  formatLoadValue,
  getZonesFromScene,
  type ZoneListPanelProps,
} from './zone-list-panel'

// ================================================================
// 内部型定義（コンポーネント専用）
// ================================================================

/**
 * 【型定義】: 属性編集中の値を保持する型
 * 🔵 信頼性: 要件定義書 §2.1.2 に基づく
 */
type EditValues = {
  zoneName?: string
  usage?: ZoneUsage
}

/**
 * 【機能概要】: ゾーン一覧パネルUIコンポーネント
 * 【実装方針】:
 * - useScene から hvac_zone ノードを取得してテーブル表示
 * - 集計行で合計面積・合計負荷を表示
 * - クリックで useViewer.setSelection と連動
 * - ダブルクリックで属性編集モード（zoneName, usage）
 * - 確定時に useScene.updateNode を呼び出し、loadResult が再計算される
 * 【保守性】: 状態は useState で管理、副作用は useCallback で分離
 * 🔵 信頼性: 要件定義書 §2, §3 に基づく確実な実装
 */
export function ZoneListPanel({ levelId, onZoneSelect, onZoneEdit }: ZoneListPanelProps) {
  // 【ストア取得】: useScene から nodes を取得し、useViewer から選択状態を取得
  const nodes = useScene((s) => s.nodes)
  const updateNode = useScene((s) => s.updateNode)
  const selection = useViewer((s) => s.selection)
  const setSelection = useViewer((s) => s.setSelection)

  // 【ゾーン一覧取得】: getZonesFromScene で hvac_zone ノードを抽出・フィルタ
  const zones = getZonesFromScene(nodes, levelId)

  // 【集計計算】: calculateZoneSummary で合計面積・負荷を集計
  const summary = calculateZoneSummary(zones)

  // 【内部状態】: 属性編集中のゾーンID と 編集値
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<EditValues>({})

  /**
   * 【イベントハンドラ】: ゾーン行クリック時の選択連動処理
   * 【単一責任】: useViewer の選択状態を更新し onZoneSelect コールバックを呼び出す
   * 🔵 信頼性: 要件定義書 §2.5, §3.3 に基づく
   */
  const handleZoneClick = useCallback(
    (zoneId: string) => {
      // 【選択連動】: useViewer.setSelection で 3Dビューの選択と連動
      setSelection({ zoneId })
      // 【コールバック呼び出し】: 外部コールバックへ通知
      onZoneSelect?.(zoneId)
    },
    [setSelection, onZoneSelect],
  )

  /**
   * 【イベントハンドラ】: ゾーン行ダブルクリック時の属性編集開始
   * 【単一責任】: editingZoneId と editValues を設定して編集モードに入る
   * 🔵 信頼性: 要件定義書 §2.6, §3.4 に基づく
   */
  const handleZoneDoubleClick = useCallback(
    (zoneId: string) => {
      const zone = zones.find((z) => z.id === zoneId)
      if (!zone) return

      // 【編集初期値設定】: 現在の値を editValues に設定
      setEditingZoneId(zoneId)
      setEditValues({ zoneName: zone.zoneName, usage: zone.usage })
    },
    [zones],
  )

  /**
   * 【イベントハンドラ】: 属性編集確定処理
   * 【単一責任】: useScene.updateNode で属性を更新し、編集モードを終了する
   * 【パフォーマンス】: updateNode 内部で markDirty が呼ばれ LoadCalcSystem が再計算を実行
   * 🔵 信頼性: 要件定義書 §2.6, §3.4 に基づく
   */
  const handleEditConfirm = useCallback(
    (zoneId: string) => {
      // 【属性更新】: 編集された zoneName・usage を updateNode で反映
      if (editValues.zoneName !== undefined || editValues.usage !== undefined) {
        updateNode(zoneId as `zone_${string}`, editValues)
      }
      // 【編集終了】: editingZoneId を null に戻す
      setEditingZoneId(null)
      setEditValues({})
      // 【コールバック呼び出し】: 外部コールバックへ通知
      onZoneEdit?.(zoneId)
    },
    [editValues, updateNode, onZoneEdit],
  )

  /**
   * 【イベントハンドラ】: 属性編集キャンセル処理
   * 【単一責任】: editingZoneId を null に戻して編集モードを終了する
   * 🔵 信頼性: 要件定義書 §2.6, §3.4 に基づく
   */
  const handleEditCancel = useCallback(() => {
    // 【編集キャンセル】: 変更を破棄して編集モードを終了
    setEditingZoneId(null)
    setEditValues({})
  }, [])

  /**
   * 【イベントハンドラ】: キーボード操作（Enter確定 / Escape キャンセル）
   * 🔵 信頼性: 要件定義書 §2.6 に基づく
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, zoneId: string) => {
      if (e.key === 'Enter') {
        handleEditConfirm(zoneId)
      } else if (e.key === 'Escape') {
        handleEditCancel()
      }
    },
    [handleEditConfirm, handleEditCancel],
  )

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* 【パネルタイトル】: ゾーン一覧ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">ゾーン一覧</h3>
        <span className="text-xs text-gray-500">{summary.zoneCount} ゾーン</span>
      </div>

      {/* 【ゾーンが0件の場合】: EDGE-1 対応 - 空状態メッセージを表示 */}
      {zones.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">ゾーンがありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            {/* 【テーブルヘッダー】: 列名を表示 */}
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-1 pr-2 font-medium">ゾーン名</th>
                <th className="pb-1 pr-2 font-medium">用途</th>
                <th className="pb-1 pr-2 text-right font-medium">面積</th>
                <th className="pb-1 pr-2 text-right font-medium">冷房</th>
                <th className="pb-1 text-right font-medium">暖房</th>
              </tr>
            </thead>
            <tbody>
              {/* 【ゾーン行】: 各ゾーンの情報を1行ずつ表示 */}
              {zones.map((zone) => {
                // 【選択状態判定】: useViewer.selection.zoneId と一致する行をハイライト
                const isSelected = selection.zoneId === zone.id
                // 【編集中判定】: editingZoneId と一致する行を編集モードで表示
                const isEditing = editingZoneId === zone.id

                return (
                  <tr
                    key={zone.id}
                    onClick={() => handleZoneClick(zone.id)}
                    onDoubleClick={() => handleZoneDoubleClick(zone.id)}
                    onKeyDown={(e) => handleKeyDown(e, zone.id)}
                    tabIndex={0}
                    role="row"
                    aria-selected={isSelected}
                    className={[
                      'cursor-pointer border-b border-gray-100 transition-colors',
                      isSelected
                        ? 'bg-blue-50 text-blue-900'
                        : 'hover:bg-gray-50',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {/* 【ゾーン名セル】: 編集中はテキスト入力、通常はテキスト表示 */}
                    <td className="py-1 pr-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.zoneName ?? ''}
                          onChange={(e) =>
                            setEditValues((prev) => ({ ...prev, zoneName: e.target.value }))
                          }
                          onKeyDown={(e) => handleKeyDown(e, zone.id)}
                          className="w-full rounded border border-blue-400 px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          aria-label="ゾーン名を編集"
                          // biome-ignore lint/a11y/noAutofocus: 編集モード開始時にフォーカスする
                          autoFocus
                        />
                      ) : (
                        <span className="block max-w-[100px] truncate" title={zone.zoneName}>
                          {zone.zoneName}
                        </span>
                      )}
                    </td>

                    {/* 【用途セル】: 編集中はセレクトボックス、通常は日本語ラベル表示 */}
                    <td className="py-1 pr-2">
                      {isEditing ? (
                        <select
                          value={editValues.usage ?? zone.usage}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              usage: e.target.value as ZoneUsage,
                            }))
                          }
                          className="rounded border border-blue-400 px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          aria-label="用途を選択"
                        >
                          {/* 【用途オプション】: ZONE_USAGE_LABELS の全エントリをセレクトボックスに表示 */}
                          {Object.entries(ZONE_USAGE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{ZONE_USAGE_LABELS[zone.usage]}</span>
                      )}
                    </td>

                    {/* 【面積セル】: formatAreaValue で小数点1桁 + "m2" 表示 */}
                    <td className="py-1 pr-2 text-right tabular-nums">
                      {formatAreaValue(zone.floorArea)}
                    </td>

                    {/* 【冷房負荷セル】: formatLoadValue で W→kW変換表示、未計算時は "-" */}
                    <td className="py-1 pr-2 text-right tabular-nums">
                      {formatLoadValue(zone.loadResult?.coolingLoad)}
                    </td>

                    {/* 【暖房負荷セル】: formatLoadValue で W→kW変換表示、未計算時は "-" */}
                    <td className="py-1 text-right tabular-nums">
                      {formatLoadValue(zone.loadResult?.heatingLoad)}
                    </td>
                  </tr>
                )
              })}

              {/* 【集計行】: 合計面積・合計負荷を最終行に表示 */}
              <tr className="border-t-2 border-gray-300 font-semibold text-gray-700">
                <td className="pt-1 pr-2" colSpan={2}>
                  合計
                </td>
                {/* 【合計面積】: totalArea を formatAreaValue でフォーマット */}
                <td className="pt-1 pr-2 text-right tabular-nums">
                  {formatAreaValue(summary.totalArea)}
                </td>
                {/* 【合計冷房負荷】: totalCoolingLoad を formatLoadValue でフォーマット（W単位） */}
                <td className="pt-1 pr-2 text-right tabular-nums">
                  {formatLoadValue(summary.totalCoolingLoad)}
                </td>
                {/* 【合計暖房負荷】: totalHeatingLoad を formatLoadValue でフォーマット（W単位） */}
                <td className="pt-1 text-right tabular-nums">
                  {formatLoadValue(summary.totalHeatingLoad)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 【編集中の確定・キャンセルボタン】: 編集モード時のみ表示 */}
          {editingZoneId && (
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleEditCancel}
                className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleEditConfirm(editingZoneId)}
                className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
              >
                確定
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ZoneListPanel
