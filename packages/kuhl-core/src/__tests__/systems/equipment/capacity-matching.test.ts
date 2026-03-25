/**
 * TASK-0028: 容量マッチング テスト
 */

import { describe, expect, it } from 'vitest'

// ─── 純粋関数テスト: matchCapacity ────────────────────────────────────────────

describe('matchCapacity', () => {
  it('TC-001: 冷却負荷50kW → 56kW', async () => {
    const { matchCapacity } = await import(
      '../../../systems/equipment/capacity-matching'
    )
    expect(matchCapacity(50)).toBe(56)
  })

  it('TC-002: 冷却負荷5kW → 5.6kW', async () => {
    const { matchCapacity } = await import(
      '../../../systems/equipment/capacity-matching'
    )
    expect(matchCapacity(5)).toBe(5.6)
  })

  it('TC-003: 冷却負荷14kW → 14kW（ちょうど）', async () => {
    const { matchCapacity } = await import(
      '../../../systems/equipment/capacity-matching'
    )
    expect(matchCapacity(14)).toBe(14)
  })

  it('TC-004: 冷却負荷0kW → 5.6kW', async () => {
    const { matchCapacity } = await import(
      '../../../systems/equipment/capacity-matching'
    )
    expect(matchCapacity(0)).toBe(5.6)
  })

  it('TC-005: 冷却負荷200kW → 140kW（上限）', async () => {
    const { matchCapacity } = await import(
      '../../../systems/equipment/capacity-matching'
    )
    expect(matchCapacity(200)).toBe(140)
  })

  it('TC-006: 冷却負荷-10kW → 5.6kW', async () => {
    const { matchCapacity } = await import(
      '../../../systems/equipment/capacity-matching'
    )
    expect(matchCapacity(-10)).toBe(5.6)
  })
})

// ─── 純粋関数テスト: getRecommendedCapacities ─────────────────────────────────

describe('getRecommendedCapacities', () => {
  it('TC-007: 50kW → [45, 56, 71] を含む', async () => {
    const { getRecommendedCapacities } = await import(
      '../../../systems/equipment/capacity-matching'
    )
    const result = getRecommendedCapacities(50)
    expect(result).toContain(45)
    expect(result).toContain(56)
    expect(result).toContain(71)
  })

  it('TC-008: 5kW → [5.6] を含む', async () => {
    const { getRecommendedCapacities } = await import(
      '../../../systems/equipment/capacity-matching'
    )
    const result = getRecommendedCapacities(5)
    expect(result).toContain(5.6)
  })
})

// ─── STANDARD_CAPACITIES ─────────────────────────────────────────────────────

describe('STANDARD_CAPACITIES', () => {
  it('TC-009: 11要素の昇順配列', async () => {
    const { STANDARD_CAPACITIES } = await import(
      '../../../systems/equipment/capacity-matching'
    )
    expect(STANDARD_CAPACITIES).toHaveLength(11)
    for (let i = 1; i < STANDARD_CAPACITIES.length; i++) {
      expect(STANDARD_CAPACITIES[i]).toBeGreaterThan(STANDARD_CAPACITIES[i - 1]!)
    }
  })
})
