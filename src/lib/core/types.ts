export type RafThrottle = 'raf'

export type RevealContainerOptions = {
  enabled?: boolean
  radius?: number
  borderColor?: string
  hoverColor?: string
  clickColor?: string
  clickEffect?: boolean
  throttle?: RafThrottle
  cacheRects?: boolean
  debug?: boolean
}

export type RevealBorderOptions = {
  id?: string
}

export type RevealItemOptions = {
  id?: string
  border: boolean
  hover: boolean
  click: boolean
}

export type NormalizedRevealContainerOptions = {
  enabled: boolean
  radius: number
  borderColor: string
  hoverColor: string
  clickColor: string
  clickEffect: boolean
  throttle: RafThrottle
  cacheRects: boolean
  debug: boolean
}

export type PointerPoint = {
  x: number
  y: number
}

