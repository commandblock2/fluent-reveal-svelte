import { describe, expect, it } from 'vitest'
import { intersectsRectRadius, pointInRect, type RectLike } from './geometry'

const RECT: RectLike = {
  left: 10,
  top: 20,
  right: 110,
  bottom: 120,
}

describe('pointInRect', () => {
  it('returns true for coordinates inside the rect', () => {
    expect(pointInRect({ x: 60, y: 70 }, RECT)).toBe(true)
  })

  it('returns true for coordinates on the edge', () => {
    expect(pointInRect({ x: 10, y: 20 }, RECT)).toBe(true)
    expect(pointInRect({ x: 110, y: 120 }, RECT)).toBe(true)
  })

  it('returns false for coordinates outside the rect', () => {
    expect(pointInRect({ x: 9, y: 20 }, RECT)).toBe(false)
    expect(pointInRect({ x: 111, y: 121 }, RECT)).toBe(false)
  })
})

describe('intersectsRectRadius', () => {
  it('returns true when the radius area overlaps the rect', () => {
    expect(intersectsRectRadius(RECT, 5, 20, 5)).toBe(true)
  })

  it('returns false when the radius area is fully outside the rect', () => {
    expect(intersectsRectRadius(RECT, -30, -30, 5)).toBe(false)
  })

  it('returns true when cursor radius covers a rect corner', () => {
    expect(intersectsRectRadius(RECT, 0, 10, 15)).toBe(true)
  })
})

