import { describe, expect, it } from 'vitest'
import { itemOverlapsPolygon, pointInPolygon, wallOverlapsPolygon } from './spatial-grid-manager'

const square: Array<[number, number]> = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
]

describe('spatial-grid-manager geometry helpers', () => {
  it('detects whether a point is inside a polygon', () => {
    expect(pointInPolygon(2, 2, square)).toBe(true)
    expect(pointInPolygon(5, 5, square)).toBe(false)
  })

  it('detects rotated item footprints overlapping a polygon', () => {
    expect(itemOverlapsPolygon([2, 0, 2], [2, 1, 2], [0, Math.PI / 4, 0], square)).toBe(true)
    expect(itemOverlapsPolygon([6, 0, 6], [1, 1, 1], [0, 0, 0], square)).toBe(false)
  })

  it('treats edge-overlapping walls as valid slab overlaps', () => {
    expect(wallOverlapsPolygon([0, 2], [4, 2], square)).toBe(true)
    expect(wallOverlapsPolygon([0, 0], [-2, -2], square)).toBe(false)
  })
})
