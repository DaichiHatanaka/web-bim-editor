import { afterEach, describe, expect, it } from 'vitest'
import { calculatePolygonArea, isValidPolygon, snapToGrid } from '../../lib/zone-draw-utils'

describe('zone-draw-utils', () => {
  afterEach(() => {
    // 純粋関数のためリセット不要だが、既存パターンに準拠
  })

  describe('calculatePolygonArea', () => {
    describe('正常系', () => {
      it('TC-001: 矩形（10x5=50m2）', () => {
        expect(calculatePolygonArea([[0, 0], [10, 0], [10, 5], [0, 5]])).toBe(50)
      })

      it('TC-002: 三角形 25m2', () => {
        expect(calculatePolygonArea([[0, 0], [10, 0], [0, 5]])).toBe(25)
      })

      it('TC-003: L字型不規則多角形 75m2', () => {
        expect(calculatePolygonArea([[0, 0], [10, 0], [10, 5], [5, 5], [5, 10], [0, 10]])).toBe(75)
      })
    })

    describe('異常系', () => {
      it('TC-008: 空配列で 0', () => {
        expect(calculatePolygonArea([])).toBe(0)
      })

      it('TC-009: 1点で 0', () => {
        expect(calculatePolygonArea([[5, 3]])).toBe(0)
      })

      it('TC-010: 2点で 0', () => {
        expect(calculatePolygonArea([[0, 0], [10, 0]])).toBe(0)
      })
    })

    describe('境界値', () => {
      it('TC-014: 3点（最小有効ポリゴン） 6m2', () => {
        expect(calculatePolygonArea([[0, 0], [4, 0], [0, 3]])).toBe(6)
      })

      it('TC-015: 反時計回り頂点で正の値 50m2', () => {
        expect(calculatePolygonArea([[0, 0], [0, 5], [10, 5], [10, 0]])).toBe(50)
      })

      it('TC-017: 非常に大きな座標値 100000000m2', () => {
        expect(calculatePolygonArea([[0, 0], [10000, 0], [10000, 10000], [0, 10000]])).toBe(100000000)
      })
    })
  })

  describe('isValidPolygon', () => {
    describe('正常系', () => {
      it('TC-004: 3点以上で true', () => {
        expect(isValidPolygon([[0, 0], [5, 0], [5, 5]])).toBe(true)
      })

      it('TC-005: 4点矩形で true', () => {
        expect(isValidPolygon([[0, 0], [10, 0], [10, 5], [0, 5]])).toBe(true)
      })
    })

    describe('異常系', () => {
      it('TC-011: 空配列で false', () => {
        expect(isValidPolygon([])).toBe(false)
      })

      it('TC-012: 2点で false', () => {
        expect(isValidPolygon([[0, 0], [5, 5]])).toBe(false)
      })

      it('TC-013: undefined で false（例外を投げない）', () => {
        expect(isValidPolygon(undefined as any)).toBe(false)
      })
    })
  })

  describe('snapToGrid', () => {
    describe('正常系', () => {
      it('TC-006: gridSize=1.0 基本動作', () => {
        expect(snapToGrid([3.3, 7.8], 1.0)).toEqual([3, 8])
      })
    })

    describe('境界値', () => {
      it('TC-016: gridSize=0.5（500mmグリッド）', () => {
        expect(snapToGrid([3.3, 7.6], 0.5)).toEqual([3.5, 7.5])
      })
    })
  })
})
