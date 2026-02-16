export type RafThrottle = 'raf'

export type RevealBorderEffectOptions = {
  radius?: number
  color?: string
  widthPx?: number
  fadeStopPct?: number
  transitionMs?: number
}

export type RevealHoverEffectOptions = {
  color?: string
}

export type RevealClickPressEffectOptions = {
  scale?: number
  transitionMs?: number
}

export type RevealRippleEffectOptions = {
  enabled?: boolean
  durationMs?: number
  sizePx?: number
  startScale?: number
  endScale?: number
  startOpacity?: number
  midOpacity?: number
  endOpacity?: number
  coreStrength?: number
  midStrength?: number
}

export type RevealClickEffectOptions = {
  enabled?: boolean
  color?: string
  press?: RevealClickPressEffectOptions
  ripple?: RevealRippleEffectOptions
}

export type RevealContainerOptions = {
  enabled?: boolean
  border?: RevealBorderEffectOptions
  hover?: RevealHoverEffectOptions
  click?: RevealClickEffectOptions
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
  border: {
    radius: number
    color: string
    widthPx: number
    fadeStopPct: number
    transitionMs: number
  }
  hover: {
    color: string
  }
  click: {
    enabled: boolean
    color: string
    press: {
      scale: number
      transitionMs: number
    }
    ripple: {
      enabled: boolean
      durationMs: number
      sizePx: number
      startScale: number
      endScale: number
      startOpacity: number
      midOpacity: number
      endOpacity: number
      coreStrength: number
      midStrength: number
    }
  }
  throttle: RafThrottle
  cacheRects: boolean
  debug: boolean
}

export type PointerPoint = {
  x: number
  y: number
}
