/**
 * capacity-matching.ts
 * 負荷→機器容量マッチング 純粋関数
 *
 * 【機能概要】: ゾーンの冷却負荷(kW)から推奨機器容量を算出する
 * 【参照要件】: REQ-205
 * 🔵 信頼性: 設計文書 §6 Phase 2 + dataflow.md
 */

// ─── 標準容量テーブル [kW] ───────────────────────────────────────────────────

/**
 * 標準容量テーブル（昇順）
 * 空調機器の標準的な冷却容量ラインナップ
 */
export const STANDARD_CAPACITIES: readonly number[] = [
  5.6, 11.2, 14, 22.4, 28, 45, 56, 71, 90, 112, 140,
] as const

// ─── 純粋関数 ────────────────────────────────────────────────────────────────

/**
 * 冷却負荷(kW)から直近上位の標準容量を返す
 *
 * @param coolingLoadKw - 冷却負荷 [kW]
 * @returns 直近上位の標準容量 [kW]
 */
export function matchCapacity(coolingLoadKw: number): number {
  // 負荷が0以下の場合は最小値
  if (coolingLoadKw <= 0) {
    return STANDARD_CAPACITIES[0]!
  }

  // 直近上位を探す
  for (const cap of STANDARD_CAPACITIES) {
    if (cap >= coolingLoadKw) {
      return cap
    }
  }

  // 最大値を超える場合は最大値
  return STANDARD_CAPACITIES[STANDARD_CAPACITIES.length - 1]!
}

/**
 * 冷却負荷(kW)から推奨容量候補（前後を含む）を返す
 *
 * @param coolingLoadKw - 冷却負荷 [kW]
 * @returns 推奨容量候補の配列 [kW]
 */
export function getRecommendedCapacities(coolingLoadKw: number): number[] {
  if (coolingLoadKw <= 0) {
    return [STANDARD_CAPACITIES[0]!]
  }

  // マッチした位置のインデックスを探す
  let matchIndex = STANDARD_CAPACITIES.length - 1
  for (let i = 0; i < STANDARD_CAPACITIES.length; i++) {
    if (STANDARD_CAPACITIES[i]! >= coolingLoadKw) {
      matchIndex = i
      break
    }
  }

  const result: number[] = []

  // 1つ下の容量（あれば）
  if (matchIndex > 0) {
    result.push(STANDARD_CAPACITIES[matchIndex - 1]!)
  }

  // マッチした容量
  result.push(STANDARD_CAPACITIES[matchIndex]!)

  // 1つ上の容量（あれば）
  if (matchIndex < STANDARD_CAPACITIES.length - 1) {
    result.push(STANDARD_CAPACITIES[matchIndex + 1]!)
  }

  return result
}
