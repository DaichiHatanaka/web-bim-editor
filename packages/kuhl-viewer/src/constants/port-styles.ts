/**
 * TASK-0021: EquipmentRenderer - ポート medium 別カラーマップ定数
 *
 * 【機能概要】: ポートの medium タイプに対応する色を定義する定数ファイル
 * 【実装方針】: 要件定義書 FR-004.3 に基づき、全12種の medium タイプのカラーマップと
 *              フォールバックカラーを定義する
 * 【テスト対応】: TC-HP-006, TC-ERR-012
 * 🔵 青信号: 要件定義書 FR-004.3 ポート medium カラーマップから直接確認済み
 */

// 【定数定義】: ポート medium 別カラーマップ（全12種の medium タイプに対応）
// 【実装内容】: 要件定義書 FR-004.3 のカラーマップ仕様に基づいて定義
// 🔵 青信号: 要件定義書 FR-004.3 から直接確認済み
export const PORT_MEDIUM_COLOR_MAP: Record<string, string> = {
  // 【空気系統】: supply_air, return_air, outside_air, exhaust_air → #5DADE2（水色）
  supply_air: '#5DADE2',
  return_air: '#5DADE2',
  outside_air: '#5DADE2',
  exhaust_air: '#5DADE2',
  // 【水系統】: chilled_water, hot_water, condenser_water → #2874A6（濃青）
  chilled_water: '#2874A6',
  hot_water: '#2874A6',
  condenser_water: '#2874A6',
  // 【冷媒系統】: refrigerant_liquid, refrigerant_gas → #28A745（緑）
  refrigerant_liquid: '#28A745',
  refrigerant_gas: '#28A745',
  // 【排水】: drain → #999999（グレー）
  drain: '#999999',
  // 【電気・信号】: electric, signal → #FFD700（金色）
  electric: '#FFD700',
  signal: '#FFD700',
}

// 【定数定義】: 未知の medium タイプに対するフォールバックカラー
// 【実装内容】: 要件定義書 EC-005 に基づき、#AAAAAA（ミディアムグレー）をフォールバックとして定義
// 🔵 青信号: 要件定義書 EC-005 から直接確認済み
export const PORT_FALLBACK_COLOR = '#AAAAAA'

/**
 * 【機能概要】: ポート medium からカラーコードを取得する
 * 【実装方針】: PORT_MEDIUM_COLOR_MAP に medium が存在すればその色を返し、
 *              未知 medium の場合は PORT_FALLBACK_COLOR を返す
 * 【テスト対応】: TC-HP-006, TC-ERR-012
 * 🔵 青信号: 要件定義書 FR-004.3, EC-005 に基づく実装
 * @param medium - ポート medium 文字列
 * @returns カラーコード（hexadecimal 文字列）
 */
export function getPortColor(medium: string): string {
  // 【カラー取得】: PORT_MEDIUM_COLOR_MAP から medium に対応する色を取得
  // 【フォールバック処理】: 未知の medium の場合はフォールバックカラーを返す
  return PORT_MEDIUM_COLOR_MAP[medium] ?? PORT_FALLBACK_COLOR
}
