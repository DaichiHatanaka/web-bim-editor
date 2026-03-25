import type { DesignConditions, Orientation, ZoneUsage } from '../../schema/nodes/hvac-zone'

// -----------------------------------------------------------------
// 用途別負荷原単位テーブル [W/m²]
// -----------------------------------------------------------------
export const LOAD_INTENSITY_TABLE: Record<ZoneUsage, { cooling: number; heating: number }> = {
  office: { cooling: 150, heating: 100 },
  meeting: { cooling: 180, heating: 120 },
  server_room: { cooling: 300, heating: 50 },
  lobby: { cooling: 120, heating: 80 },
  corridor: { cooling: 80, heating: 60 },
  toilet: { cooling: 100, heating: 70 },
  kitchen: { cooling: 200, heating: 130 },
  warehouse: { cooling: 60, heating: 40 },
  mechanical_room: { cooling: 120, heating: 80 },
  electrical_room: { cooling: 180, heating: 110 },
  other: { cooling: 120, heating: 80 },
}

// -----------------------------------------------------------------
// 方位補正係数テーブル
// -----------------------------------------------------------------
export const ORIENTATION_FACTORS: Record<Orientation, number> = {
  N: 0.9,
  NE: 0.95,
  E: 1.05,
  SE: 1.1,
  S: 1.15,
  SW: 1.1,
  W: 1.1,
  NW: 0.95,
}

// -----------------------------------------------------------------
// ヘルパー関数
// -----------------------------------------------------------------

/**
 * 方位補正係数を返す。
 * undefined の場合は 1.0（補正なし）を返す。
 */
export function getOrientationFactor(orientation?: Orientation): number {
  if (orientation === undefined) return 1.0
  return ORIENTATION_FACTORS[orientation] ?? 1.0
}

/**
 * ガラス面積補正係数を返す。
 * glazingRatio > 0.3 の場合のみ補正を適用。
 * undefined は 0 として扱う。
 */
export function getGlazingFactor(glazingRatio?: number): number {
  const ratio = glazingRatio ?? 0
  if (ratio > 0.3) {
    return 1.0 + (ratio - 0.3) * 0.5
  }
  return 1.0
}

// -----------------------------------------------------------------
// 負荷計算に必要なフィールド型
// -----------------------------------------------------------------
export type ZoneLoadInput = {
  floorArea: number
  usage: ZoneUsage
  designConditions: DesignConditions
  orientation?: Orientation
  glazingRatio?: number
}

// -----------------------------------------------------------------
// 負荷計算結果の型
// -----------------------------------------------------------------
export type ZoneLoadCalcResult = {
  coolingLoad: number
  heatingLoad: number
  requiredAirflow: number
}

// 定数: 給気温度 [℃]（単一ダクト標準）
const SUPPLY_AIR_TEMPERATURE = 15

// 定数: 空気の密度 × 比熱 [kg/m³ × J/(kg·K)]
const AIR_RHO_CP = 1.2 * 1006

// -----------------------------------------------------------------
// 純粋関数: calculateZoneLoad
// -----------------------------------------------------------------

/**
 * HvacZoneNode の冷暖房負荷を m²単価法で計算する。
 *
 * @param zone 計算対象のゾーンの入力フィールド
 * @returns ZoneLoadCalcResult | undefined（floorArea <= 0 の場合は undefined）
 */
export function calculateZoneLoad(zone: ZoneLoadInput): ZoneLoadCalcResult | undefined {
  const { floorArea, usage, designConditions, orientation, glazingRatio } = zone

  // floorArea <= 0 は物理的に無効
  if (floorArea <= 0) return undefined

  // 用途別原単位（不正値は office にフォールバック）
  const unitTable = LOAD_INTENSITY_TABLE[usage] ?? LOAD_INTENSITY_TABLE.office

  // 補正係数
  const orientationFactor = getOrientationFactor(orientation)
  const glazingFactor = getGlazingFactor(glazingRatio)

  // 冷暖房負荷 [W]
  const coolingLoad = unitTable.cooling * floorArea * orientationFactor * glazingFactor
  const heatingLoad = unitTable.heating * floorArea * orientationFactor * glazingFactor

  // 必要給気量 [m³/h]
  // ΔT = summerDryBulb - SUPPLY_AIR_TEMPERATURE
  const deltaT = designConditions.summerDryBulb - SUPPLY_AIR_TEMPERATURE

  let requiredAirflow = 0
  if (deltaT > 0) {
    // requiredAirflow = coolingLoad / (ρ × cp × ΔT) × 3600
    requiredAirflow = (coolingLoad / (AIR_RHO_CP * deltaT)) * 3600
  }

  return { coolingLoad, heatingLoad, requiredAirflow }
}
