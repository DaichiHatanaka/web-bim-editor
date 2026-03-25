/**
 * TASK-0021: EquipmentRenderer - 機器タイプ別カラーマップ定数
 *
 * 【機能概要】: 機器タイプに対応する色を定義する定数ファイル
 * 【実装方針】: 要件定義書 FR-002.1, FR-002.2 に基づき、全13種の機器タイプのカラーマップと
 *              フォールバックカラーを定義する
 * 【テスト対応】: TC-HP-002, TC-HP-003
 * 🔵 青信号: 要件定義書 FR-002.1 カラーマップ定義から直接確認済み
 */

// 【定数定義】: 機器タイプ別カラーマップ（全13種の機器タイプに対応）
// 【実装内容】: 要件定義書 FR-002.1 のカラーマップ仕様に基づいて定義
// 🔵 青信号: 要件定義書 FR-002.1 から直接確認済み
export const EQUIPMENT_COLOR_MAP: Record<string, string> = {
  ahu: '#4A90E2', // 青（中央空調機）
  pac: '#7ED321', // 緑（パッケージエアコン）
  fcu: '#F39C12', // 橙（ファンコイルユニット）
  vrf_outdoor: '#2C3E50', // 濃紺（VRF 室外機）
  vrf_indoor: '#3498DB', // 明るい青（VRF 室内機）
  diffuser: '#E74C3C', // 赤（吹出口）
  damper: '#95A5A6', // グレー（ダンパー）
  fan: '#9B59B6', // 紫（送風機）
  pump: '#1ABC9C', // ティール（ポンプ）
  chiller: '#27AE60', // 深緑（チラー）
  boiler: '#E67E22', // オレンジ（ボイラー）
  cooling_tower: '#16A085', // 深ティール（冷却塔）
  valve: '#34495E', // 濃グレー（弁）
}

// 【定数定義】: 未知の機器タイプに対するフォールバックカラー
// 【実装内容】: 要件定義書 FR-002.2 に基づき、#CCCCCC（ライトグレー）をフォールバックとして定義
// 🔵 青信号: 要件定義書 FR-002.2 から直接確認済み
export const EQUIPMENT_FALLBACK_COLOR = '#CCCCCC'

/**
 * 【機能概要】: 機器タイプからカラーコードを取得する
 * 【実装方針】: EQUIPMENT_COLOR_MAP にタイプが存在すればその色を返し、
 *              未知タイプの場合は EQUIPMENT_FALLBACK_COLOR を返す
 * 【テスト対応】: TC-HP-002, TC-HP-003
 * 🔵 青信号: 要件定義書 FR-002.1, FR-002.2 に基づく実装
 * @param type - 機器タイプ文字列
 * @returns カラーコード（hexadecimal 文字列）
 */
export function getEquipmentColor(type: string): string {
  // 【カラー取得】: EQUIPMENT_COLOR_MAP からタイプに対応する色を取得
  // 【フォールバック処理】: 未知のタイプの場合はフォールバックカラーを返す
  return EQUIPMENT_COLOR_MAP[type] ?? EQUIPMENT_FALLBACK_COLOR
}
