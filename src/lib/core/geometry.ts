import type { PointerPoint } from './types'

export type RectLike = {
  left: number
  right: number
  top: number
  bottom: number
}

export function pointInRect(point: PointerPoint, rect: RectLike): boolean {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
}

export function intersectsRectRadius(rect: RectLike, x: number, y: number, radius: number): boolean {
  const cursorRect = {
    left: x - radius,
    right: x + radius,
    top: y - radius,
    bottom: y + radius,
  }

  return !(
    rect.left > cursorRect.right ||
    rect.right < cursorRect.left ||
    rect.top > cursorRect.bottom ||
    rect.bottom < cursorRect.top
  )
}

