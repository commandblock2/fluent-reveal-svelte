import { intersectsRectRadius, pointInRect } from './geometry'
import type {
  NormalizedRevealContainerOptions,
  PointerPoint,
  RevealBorderOptions,
  RevealContainerOptions,
  RevealItemOptions,
} from './types'

type RegistrationKind = 'border' | 'item'

type PointerSnapshot = PointerPoint & {
  target: EventTarget | null
}

type BorderRecord = {
  key: string
  id: string
  owner: symbol
  node: HTMLElement
  rect: DOMRectReadOnly
  visible: boolean
  activeBorderItems: number
}

type ItemRecord = {
  key: string
  id: string
  owner: symbol
  node: HTMLElement
  rect: DOMRectReadOnly
  flags: RevealItemOptions
  borderHostKey: string | null
}

const DEFAULT_OPTIONS: NormalizedRevealContainerOptions = {
  enabled: true,
  border: {
    radius: 90,
    color: 'rgba(147, 229, 255, 0.88)',
    widthPx: 1,
    fadeStopPct: 72,
    transitionMs: 180,
  },
  hover: {
    color: 'rgba(127, 225, 255, 0.2)',
  },
  focus: {
    enabled: true,
    color: 'rgba(146, 220, 255, 0.76)',
    widthPx: 2,
    offsetPx: 3,
    glowPx: 14,
    pulseDurationMs: 1200,
    zIndex: 12,
  },
  click: {
    enabled: true,
    color: 'rgba(255, 249, 223, 0.54)',
    press: {
      scale: 0.98,
      transitionMs: 96,
    },
    ripple: {
      enabled: true,
      durationMs: 980,
      sizePx: 24,
      startScale: 0.2,
      endScale: 3.2,
      startOpacity: 0.52,
      midOpacity: 0.2,
      endOpacity: 0.18,
      coreStrength: 74,
      midStrength: 42,
    },
  },
  throttle: 'raf',
  cacheRects: true,
  debug: false,
}

const CONTAINER_REGISTRY = new WeakMap<HTMLElement, RevealContainerController>()

function fail(message: string): never {
  throw new Error(`[fluent-reveal] ${message}`)
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }

  if (value < min) {
    return min
  }

  if (value > max) {
    return max
  }

  return value
}

function normalizeContainerOptions(
  options: RevealContainerOptions | undefined,
): NormalizedRevealContainerOptions {
  if (!options) {
    return {
      ...DEFAULT_OPTIONS,
      border: { ...DEFAULT_OPTIONS.border },
      hover: { ...DEFAULT_OPTIONS.hover },
      focus: { ...DEFAULT_OPTIONS.focus },
      click: {
        ...DEFAULT_OPTIONS.click,
        press: { ...DEFAULT_OPTIONS.click.press },
        ripple: { ...DEFAULT_OPTIONS.click.ripple },
      },
    }
  }

  if (options.throttle && options.throttle !== 'raf') {
    fail(`Unsupported throttle "${String(options.throttle)}". Use "raf".`)
  }

  const border = options.border
  const hover = options.hover
  const focus = options.focus
  const click = options.click
  const press = click?.press
  const ripple = click?.ripple

  return {
    enabled: options.enabled ?? DEFAULT_OPTIONS.enabled,
    border: {
      radius: clampNumber(border?.radius, 0, 600, DEFAULT_OPTIONS.border.radius),
      color: border?.color ?? DEFAULT_OPTIONS.border.color,
      widthPx: clampNumber(border?.widthPx, 0, 16, DEFAULT_OPTIONS.border.widthPx),
      fadeStopPct: clampNumber(border?.fadeStopPct, 10, 100, DEFAULT_OPTIONS.border.fadeStopPct),
      transitionMs: clampNumber(border?.transitionMs, 0, 2000, DEFAULT_OPTIONS.border.transitionMs),
    },
    hover: {
      color: hover?.color ?? DEFAULT_OPTIONS.hover.color,
    },
    focus: {
      enabled: focus?.enabled ?? DEFAULT_OPTIONS.focus.enabled,
      color: focus?.color ?? DEFAULT_OPTIONS.focus.color,
      widthPx: clampNumber(focus?.widthPx, 0, 16, DEFAULT_OPTIONS.focus.widthPx),
      offsetPx: clampNumber(focus?.offsetPx, 0, 24, DEFAULT_OPTIONS.focus.offsetPx),
      glowPx: clampNumber(focus?.glowPx, 0, 64, DEFAULT_OPTIONS.focus.glowPx),
      pulseDurationMs: clampNumber(
        focus?.pulseDurationMs,
        250,
        4000,
        DEFAULT_OPTIONS.focus.pulseDurationMs,
      ),
      zIndex: clampNumber(focus?.zIndex, 0, 1000, DEFAULT_OPTIONS.focus.zIndex),
    },
    click: {
      enabled: click?.enabled ?? DEFAULT_OPTIONS.click.enabled,
      color: click?.color ?? DEFAULT_OPTIONS.click.color,
      press: {
        scale: clampNumber(press?.scale, 0.8, 1, DEFAULT_OPTIONS.click.press.scale),
        transitionMs: clampNumber(
          press?.transitionMs,
          0,
          1000,
          DEFAULT_OPTIONS.click.press.transitionMs,
        ),
      },
      ripple: {
        enabled: ripple?.enabled ?? DEFAULT_OPTIONS.click.ripple.enabled,
        durationMs: clampNumber(ripple?.durationMs, 120, 4000, DEFAULT_OPTIONS.click.ripple.durationMs),
        sizePx: clampNumber(ripple?.sizePx, 4, 240, DEFAULT_OPTIONS.click.ripple.sizePx),
        startScale: clampNumber(ripple?.startScale, 0.05, 2.5, DEFAULT_OPTIONS.click.ripple.startScale),
        endScale: clampNumber(ripple?.endScale, 0.2, 8, DEFAULT_OPTIONS.click.ripple.endScale),
        startOpacity: clampNumber(
          ripple?.startOpacity,
          0,
          1,
          DEFAULT_OPTIONS.click.ripple.startOpacity,
        ),
        midOpacity: clampNumber(ripple?.midOpacity, 0, 1, DEFAULT_OPTIONS.click.ripple.midOpacity),
        endOpacity: clampNumber(ripple?.endOpacity, 0, 1, DEFAULT_OPTIONS.click.ripple.endOpacity),
        coreStrength: clampNumber(ripple?.coreStrength, 0, 100, DEFAULT_OPTIONS.click.ripple.coreStrength),
        midStrength: clampNumber(ripple?.midStrength, 0, 100, DEFAULT_OPTIONS.click.ripple.midStrength),
      },
    },
    throttle: 'raf',
    cacheRects: options.cacheRects ?? DEFAULT_OPTIONS.cacheRects,
    debug: options.debug ?? DEFAULT_OPTIONS.debug,
  }
}

function normalizeItemOptions(options: RevealItemOptions): RevealItemOptions {
  return {
    id: options.id,
    border: Boolean(options.border),
    hover: Boolean(options.hover),
    click: Boolean(options.click),
  }
}

function supportsMaskComposite(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
    return false
  }

  return CSS.supports('mask-composite', 'exclude')
}

export function findNearestRevealContainer(node: HTMLElement | null): RevealContainerController | null {
  let current: HTMLElement | null = node
  while (current) {
    const controller = CONTAINER_REGISTRY.get(current)
    if (controller) {
      return controller
    }
    current = current.parentElement
  }

  return null
}

export function createRevealContainer(
  node: HTMLElement,
  options?: RevealContainerOptions,
): RevealContainerController {
  if (CONTAINER_REGISTRY.has(node)) {
    fail('Duplicate revealContainer action on the same node.')
  }

  const controller = new RevealContainerController(node, options)
  CONTAINER_REGISTRY.set(node, controller)
  return controller
}

export class RevealContainerController {
  private readonly node: HTMLElement
  private options: NormalizedRevealContainerOptions
  private readonly bordersByKey = new Map<string, BorderRecord>()
  private readonly itemsByKey = new Map<string, ItemRecord>()
  private readonly borderKeyByNode = new WeakMap<Element, string>()
  private readonly itemKeyByNode = new WeakMap<Element, string>()
  private readonly borderOwnerToKey = new Map<symbol, string>()
  private readonly itemOwnerToKey = new Map<symbol, string>()
  private readonly registrationIds = new Map<string, RegistrationKind>()
  private readonly resizeObserver: ResizeObserver
  private readonly mutationObserver: MutationObserver
  private borderCounter = 0
  private itemCounter = 0
  private rafId = 0
  private rectCacheDirty = true
  private lastPointer: PointerSnapshot | null = null
  private hoveredItemKey: string | null = null
  private pressedItemKey: string | null = null
  private containerRect: DOMRectReadOnly
  private destroyed = false

  private readonly onPointerEnter = (event: PointerEvent): void => {
    this.lastPointer = {
      x: event.clientX,
      y: event.clientY,
      target: event.target,
    }
    this.invalidateLayout()
    this.scheduleFrame()
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.lastPointer = {
      x: event.clientX,
      y: event.clientY,
      target: event.target,
    }
    this.scheduleFrame()
  }

  private readonly onPointerLeave = (): void => {
    this.lastPointer = null
    this.clearBorderVisibility()
    this.clearHoverState()
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.options.enabled || !this.options.click.enabled) {
      return
    }

    if (!this.options.cacheRects) {
      this.refreshRects()
    } else if (this.rectCacheDirty) {
      this.refreshRects()
    }

    this.lastPointer = {
      x: event.clientX,
      y: event.clientY,
      target: event.target,
    }

    const targetKey = this.resolveItemKeyFromTarget(event.target, (item) => item.flags.click)
    if (!targetKey) {
      this.clearPressedState()
      return
    }

    const item = this.itemsByKey.get(targetKey)
    if (!item) {
      this.clearPressedState()
      return
    }

    if (this.pressedItemKey && this.pressedItemKey !== targetKey) {
      this.clearPressedState()
    }

    const localX = event.clientX - item.rect.left
    const localY = event.clientY - item.rect.top

    item.node.style.setProperty('--click-origin-x', `${localX}px`)
    item.node.style.setProperty('--click-origin-y', `${localY}px`)

    item.node.classList.remove('reveal-ripple-active', 'reveal-ripple-static')
    if (this.options.click.ripple.enabled) {
      void item.node.offsetWidth
      item.node.classList.add('reveal-ripple-active')
    }

    item.node.classList.add('reveal-pressed')
    this.pressedItemKey = targetKey
    this.scheduleFrame()
  }

  private readonly onPointerUp = (): void => {
    this.clearPressedState()
  }

  private readonly onPointerCancel = (): void => {
    this.clearPressedState()
  }

  private readonly onAnimationEnd = (event: AnimationEvent): void => {
    if (event.animationName !== 'reveal-click-follow') {
      return
    }

    const target = event.target
    if (!(target instanceof HTMLElement) || !target.classList.contains('reveal-item')) {
      return
    }

    if (!target.classList.contains('reveal-ripple-active')) {
      return
    }

    target.classList.remove('reveal-ripple-active')
    if (this.options.click.ripple.enabled) {
      target.classList.add('reveal-ripple-static')
    }
  }

  private readonly onWindowLayoutShift = (): void => {
    this.invalidateLayout()
  }

  constructor(node: HTMLElement, options?: RevealContainerOptions) {
    if (typeof window === 'undefined') {
      fail('revealContainer requires a browser runtime.')
    }
    if (!supportsMaskComposite()) {
      fail('Required CSS mask-composite support is missing. Reveal effects cannot initialize.')
    }
    if (typeof ResizeObserver === 'undefined') {
      fail('ResizeObserver is required by revealContainer.')
    }
    if (typeof MutationObserver === 'undefined') {
      fail('MutationObserver is required by revealContainer.')
    }

    this.node = node
    this.options = normalizeContainerOptions(options)
    this.containerRect = this.node.getBoundingClientRect()
    this.resizeObserver = new ResizeObserver(() => {
      this.invalidateLayout()
    })
    this.mutationObserver = new MutationObserver(() => {
      this.invalidateLayout()
    })

    this.node.classList.add('reveal-container')
    this.applyContainerOptions()
    this.bindListeners()
    this.resizeObserver.observe(this.node)
    this.mutationObserver.observe(this.node, { childList: true, subtree: true })
  }

  updateOptions(options?: RevealContainerOptions): void {
    this.assertAlive()
    this.options = normalizeContainerOptions(options)
    this.applyContainerOptions()
    if (!this.options.click.enabled) {
      this.clearPressedState()
      this.clearRippleState()
    } else if (!this.options.click.ripple.enabled) {
      this.clearRippleState()
    }
    this.invalidateLayout()
    this.scheduleFrame()
  }

  registerBorder(node: HTMLElement, options: RevealBorderOptions, owner: symbol): void {
    this.assertAlive()
    if (this.borderOwnerToKey.has(owner)) {
      fail('Duplicate border owner registration.')
    }
    if (this.borderKeyByNode.has(node)) {
      fail('revealBorder already registered for this node.')
    }

    const id = this.normalizeRegistrationId(options.id, 'border')
    this.assertIdAvailable(id)

    const key = `border:${id}`
    const record: BorderRecord = {
      key,
      id,
      owner,
      node,
      rect: node.getBoundingClientRect(),
      visible: false,
      activeBorderItems: 0,
    }

    this.bordersByKey.set(key, record)
    this.borderKeyByNode.set(node, key)
    this.borderOwnerToKey.set(owner, key)
    this.registrationIds.set(id, 'border')

    node.classList.add('reveal-border-host')
    this.resizeObserver.observe(node)
    this.invalidateLayout()
    this.scheduleFrame()
  }

  updateBorder(owner: symbol, options: RevealBorderOptions): void {
    this.assertAlive()
    const key = this.borderOwnerToKey.get(owner)
    if (!key) {
      fail('revealBorder update called for unknown owner.')
    }

    const record = this.bordersByKey.get(key)
    if (!record || record.owner !== owner) {
      fail('revealBorder update owner mismatch.')
    }

    if (options.id && options.id !== record.id) {
      fail(
        `revealBorder id cannot change after registration. Existing id "${record.id}", received "${options.id}".`,
      )
    }
  }

  unregisterBorder(owner: symbol): void {
    this.assertAlive()
    const key = this.borderOwnerToKey.get(owner)
    if (!key) {
      fail('revealBorder unregister called for unknown owner.')
    }

    const record = this.bordersByKey.get(key)
    if (!record || record.owner !== owner) {
      fail('revealBorder unregister owner mismatch.')
    }

    for (const item of this.itemsByKey.values()) {
      if (item.borderHostKey === key) {
        if (item.flags.border && item.node.isConnected) {
          fail(
            `Border host "${record.id}" removed while border-enabled item "${item.id}" is still registered.`,
          )
        }
        item.borderHostKey = null
      }
    }

    record.node.classList.remove('reveal-visible')
    record.node.classList.remove('reveal-border-host')
    record.node.style.removeProperty('--reveal-host-left')
    record.node.style.removeProperty('--reveal-host-top')

    this.resizeObserver.unobserve(record.node)
    this.bordersByKey.delete(key)
    this.borderOwnerToKey.delete(owner)
    this.borderKeyByNode.delete(record.node)
    this.registrationIds.delete(record.id)
    this.invalidateLayout()
    this.scheduleFrame()
  }

  registerItem(node: HTMLElement, options: RevealItemOptions, owner: symbol): void {
    this.assertAlive()
    if (this.itemOwnerToKey.has(owner)) {
      fail('Duplicate item owner registration.')
    }
    if (this.itemKeyByNode.has(node)) {
      fail('revealItem already registered for this node.')
    }

    const normalized = normalizeItemOptions(options)
    const id = this.normalizeRegistrationId(normalized.id, 'item')
    this.assertIdAvailable(id)

    const borderHostKey = normalized.border ? this.requireBorderHostForItem(node, id) : null
    if (borderHostKey) {
      this.incrementBorderItemCount(borderHostKey)
    }

    const key = `item:${id}`
    const record: ItemRecord = {
      key,
      id,
      owner,
      node,
      rect: node.getBoundingClientRect(),
      flags: normalized,
      borderHostKey,
    }

    this.itemsByKey.set(key, record)
    this.itemKeyByNode.set(node, key)
    this.itemOwnerToKey.set(owner, key)
    this.registrationIds.set(id, 'item')

    node.classList.add('reveal-item')
    this.resizeObserver.observe(node)
    this.invalidateLayout()
    this.scheduleFrame()
  }

  updateItem(owner: symbol, options: RevealItemOptions): void {
    this.assertAlive()
    const key = this.itemOwnerToKey.get(owner)
    if (!key) {
      fail('revealItem update called for unknown owner.')
    }

    const record = this.itemsByKey.get(key)
    if (!record || record.owner !== owner) {
      fail('revealItem update owner mismatch.')
    }

    const next = normalizeItemOptions(options)
    if (next.id && next.id !== record.id) {
      fail(`revealItem id cannot change after registration. Existing "${record.id}", received "${next.id}".`)
    }

    if (record.borderHostKey) {
      this.decrementBorderItemCount(record.borderHostKey)
      record.borderHostKey = null
    }

    if (next.border) {
      record.borderHostKey = this.requireBorderHostForItem(record.node, record.id)
      this.incrementBorderItemCount(record.borderHostKey)
    }

    record.flags = {
      ...next,
      id: record.id,
    }

    if (!record.flags.hover) {
      record.node.classList.remove('reveal-hover')
      if (this.hoveredItemKey === record.key) {
        this.hoveredItemKey = null
      }
    }

    if (!record.flags.click) {
      record.node.classList.remove('reveal-pressed', 'reveal-ripple-active', 'reveal-ripple-static')
      if (this.pressedItemKey === record.key) {
        this.pressedItemKey = null
      }
    }

    this.invalidateLayout()
    this.scheduleFrame()
  }

  unregisterItem(owner: symbol): void {
    this.assertAlive()
    const key = this.itemOwnerToKey.get(owner)
    if (!key) {
      fail('revealItem unregister called for unknown owner.')
    }

    const record = this.itemsByKey.get(key)
    if (!record || record.owner !== owner) {
      fail('revealItem unregister owner mismatch.')
    }

    if (record.borderHostKey) {
      this.decrementBorderItemCount(record.borderHostKey)
    }

    if (this.hoveredItemKey === key) {
      this.hoveredItemKey = null
    }

    if (this.pressedItemKey === key) {
      this.pressedItemKey = null
    }

    record.node.classList.remove(
      'reveal-item',
      'reveal-hover',
      'reveal-pressed',
      'reveal-ripple-active',
      'reveal-ripple-static',
    )
    record.node.style.removeProperty('--item-fx-x')
    record.node.style.removeProperty('--item-fx-y')
    record.node.style.removeProperty('--click-origin-x')
    record.node.style.removeProperty('--click-origin-y')

    this.resizeObserver.unobserve(record.node)
    this.itemsByKey.delete(key)
    this.itemOwnerToKey.delete(owner)
    this.itemKeyByNode.delete(record.node)
    this.registrationIds.delete(record.id)
    this.invalidateLayout()
    this.scheduleFrame()
  }

  destroy(): void {
    if (this.destroyed) {
      return
    }

    this.destroyed = true

    if (this.rafId !== 0) {
      window.cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }

    this.unbindListeners()
    this.resizeObserver.disconnect()
    this.mutationObserver.disconnect()
    this.clearBorderVisibility()
    this.clearHoverState()
    this.clearPressedState()
    this.clearRippleState()

    for (const border of this.bordersByKey.values()) {
      border.node.classList.remove('reveal-visible')
      border.node.classList.remove('reveal-border-host')
      border.node.style.removeProperty('--reveal-host-left')
      border.node.style.removeProperty('--reveal-host-top')
    }

    for (const item of this.itemsByKey.values()) {
      item.node.classList.remove(
        'reveal-item',
        'reveal-hover',
        'reveal-pressed',
        'reveal-ripple-active',
        'reveal-ripple-static',
      )
      item.node.style.removeProperty('--item-fx-x')
      item.node.style.removeProperty('--item-fx-y')
      item.node.style.removeProperty('--click-origin-x')
      item.node.style.removeProperty('--click-origin-y')
    }

    this.node.classList.remove('reveal-container')
    this.node.style.removeProperty('--fx-x')
    this.node.style.removeProperty('--fx-y')
    this.node.style.removeProperty('--reveal-radius')
    this.node.style.removeProperty('--reveal-border-color')
    this.node.style.removeProperty('--reveal-border-width')
    this.node.style.removeProperty('--reveal-border-fade-stop')
    this.node.style.removeProperty('--reveal-border-transition')
    this.node.style.removeProperty('--reveal-hover-color')
    this.node.style.removeProperty('--reveal-focus-color')
    this.node.style.removeProperty('--reveal-focus-width')
    this.node.style.removeProperty('--reveal-focus-offset')
    this.node.style.removeProperty('--reveal-focus-glow')
    this.node.style.removeProperty('--reveal-focus-glow-soft')
    this.node.style.removeProperty('--reveal-focus-pulse-duration')
    this.node.style.removeProperty('--reveal-focus-z-index')
    this.node.style.removeProperty('--reveal-click-color')
    this.node.style.removeProperty('--reveal-press-scale')
    this.node.style.removeProperty('--reveal-press-transition')
    this.node.style.removeProperty('--reveal-ripple-duration')
    this.node.style.removeProperty('--reveal-ripple-size')
    this.node.style.removeProperty('--reveal-ripple-start-scale')
    this.node.style.removeProperty('--reveal-ripple-end-scale')
    this.node.style.removeProperty('--reveal-ripple-start-opacity')
    this.node.style.removeProperty('--reveal-ripple-mid-opacity')
    this.node.style.removeProperty('--reveal-ripple-end-opacity')
    this.node.style.removeProperty('--reveal-ripple-core-strength')
    this.node.style.removeProperty('--reveal-ripple-mid-strength')
    delete this.node.dataset.revealDebug
    delete this.node.dataset.revealRipple
    delete this.node.dataset.revealFocus

    this.bordersByKey.clear()
    this.itemsByKey.clear()
    this.borderOwnerToKey.clear()
    this.itemOwnerToKey.clear()
    this.registrationIds.clear()
    CONTAINER_REGISTRY.delete(this.node)
  }

  private bindListeners(): void {
    this.node.addEventListener('pointerenter', this.onPointerEnter)
    this.node.addEventListener('pointermove', this.onPointerMove)
    this.node.addEventListener('pointerleave', this.onPointerLeave)
    this.node.addEventListener('pointerdown', this.onPointerDown)
    this.node.addEventListener('pointerup', this.onPointerUp)
    this.node.addEventListener('pointercancel', this.onPointerCancel)
    this.node.addEventListener('animationend', this.onAnimationEnd)
    window.addEventListener('pointerup', this.onPointerUp, { passive: true })
    window.addEventListener('pointercancel', this.onPointerCancel, { passive: true })
    window.addEventListener('resize', this.onWindowLayoutShift, { passive: true })
    window.addEventListener('scroll', this.onWindowLayoutShift, { passive: true })
  }

  private unbindListeners(): void {
    this.node.removeEventListener('pointerenter', this.onPointerEnter)
    this.node.removeEventListener('pointermove', this.onPointerMove)
    this.node.removeEventListener('pointerleave', this.onPointerLeave)
    this.node.removeEventListener('pointerdown', this.onPointerDown)
    this.node.removeEventListener('pointerup', this.onPointerUp)
    this.node.removeEventListener('pointercancel', this.onPointerCancel)
    this.node.removeEventListener('animationend', this.onAnimationEnd)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerCancel)
    window.removeEventListener('resize', this.onWindowLayoutShift)
    window.removeEventListener('scroll', this.onWindowLayoutShift)
  }

  private normalizeRegistrationId(id: string | undefined, kind: RegistrationKind): string {
    if (id && id.trim().length > 0) {
      return id
    }

    if (kind === 'border') {
      this.borderCounter += 1
      return `border-${this.borderCounter}`
    }

    this.itemCounter += 1
    return `item-${this.itemCounter}`
  }

  private assertIdAvailable(id: string): void {
    if (this.registrationIds.has(id)) {
      fail(`Duplicate registration id "${id}" in one revealContainer.`)
    }
  }

  private assertAlive(): void {
    if (this.destroyed) {
      fail('Reveal container controller has already been destroyed.')
    }
  }

  private invalidateLayout(): void {
    this.rectCacheDirty = true
    if (this.lastPointer) {
      this.scheduleFrame()
    }
  }

  private scheduleFrame(): void {
    if (this.rafId !== 0) {
      return
    }

    this.rafId = window.requestAnimationFrame(() => {
      this.rafId = 0
      this.renderFrame()
    })
  }

  private renderFrame(): void {
    if (this.destroyed || !this.options.enabled) {
      this.clearBorderVisibility()
      this.clearHoverState()
      this.clearPressedState()
      return
    }

    if (!this.options.cacheRects || this.rectCacheDirty) {
      this.refreshRects()
    }

    const pointer = this.lastPointer
    if (!pointer) {
      this.clearBorderVisibility()
      this.clearHoverState()
      return
    }

    if (!pointInRect(pointer, this.containerRect)) {
      this.clearBorderVisibility()
      this.clearHoverState()
      return
    }

    this.node.style.setProperty('--fx-x', `${pointer.x - this.containerRect.left}px`)
    this.node.style.setProperty('--fx-y', `${pointer.y - this.containerRect.top}px`)

    for (const border of this.bordersByKey.values()) {
      if (border.activeBorderItems === 0) {
        if (border.visible) {
          border.visible = false
          border.node.classList.remove('reveal-visible')
        }
        continue
      }

      const nextVisible = intersectsRectRadius(
        border.rect,
        pointer.x,
        pointer.y,
        this.options.border.radius,
      )
      if (nextVisible !== border.visible) {
        border.visible = nextVisible
        border.node.classList.toggle('reveal-visible', nextVisible)
      }
    }

    this.updateHoverState(pointer, pointer.target)
    this.updatePressedPointer(pointer)
  }

  private refreshRects(): void {
    this.containerRect = this.node.getBoundingClientRect()

    for (const border of this.bordersByKey.values()) {
      border.rect = border.node.getBoundingClientRect()
      border.node.style.setProperty('--reveal-host-left', `${border.rect.left - this.containerRect.left}px`)
      border.node.style.setProperty('--reveal-host-top', `${border.rect.top - this.containerRect.top}px`)
    }

    for (const item of this.itemsByKey.values()) {
      item.rect = item.node.getBoundingClientRect()
    }

    this.rectCacheDirty = false
  }

  private updateHoverState(pointer: PointerPoint, target: EventTarget | null): void {
    const nextHoverKey = this.resolveItemKeyFromTarget(target, (item) => item.flags.hover)
    if (nextHoverKey !== this.hoveredItemKey) {
      if (this.hoveredItemKey) {
        const previous = this.itemsByKey.get(this.hoveredItemKey)
        previous?.node.classList.remove('reveal-hover')
      }
      if (nextHoverKey) {
        const next = this.itemsByKey.get(nextHoverKey)
        next?.node.classList.add('reveal-hover')
      }
      this.hoveredItemKey = nextHoverKey
    }

    if (!this.hoveredItemKey) {
      return
    }

    const hoveredItem = this.itemsByKey.get(this.hoveredItemKey)
    if (!hoveredItem) {
      return
    }

    const localX = pointer.x - hoveredItem.rect.left
    const localY = pointer.y - hoveredItem.rect.top

    hoveredItem.node.style.setProperty('--item-fx-x', `${localX}px`)
    hoveredItem.node.style.setProperty('--item-fx-y', `${localY}px`)
  }

  private updatePressedPointer(pointer: PointerPoint): void {
    if (!this.pressedItemKey) {
      return
    }

    const pressedItem = this.itemsByKey.get(this.pressedItemKey)
    if (!pressedItem || !pressedItem.flags.click) {
      this.clearPressedState()
      return
    }

    const localX = pointer.x - pressedItem.rect.left
    const localY = pointer.y - pressedItem.rect.top
    pressedItem.node.style.setProperty('--click-origin-x', `${localX}px`)
    pressedItem.node.style.setProperty('--click-origin-y', `${localY}px`)
  }

  private resolveItemKeyFromTarget(
    target: EventTarget | null,
    predicate: (item: ItemRecord) => boolean,
  ): string | null {
    if (!(target instanceof Element)) {
      return null
    }

    let current: Element | null = target
    while (current && current !== this.node) {
      const key = this.itemKeyByNode.get(current)
      if (key) {
        const item = this.itemsByKey.get(key)
        if (!item) {
          return null
        }
        return predicate(item) ? key : null
      }
      current = current.parentElement
    }

    return null
  }

  private findNearestBorderHost(start: HTMLElement): BorderRecord | null {
    let current: HTMLElement | null = start.parentElement
    while (current && current !== this.node) {
      const key = this.borderKeyByNode.get(current)
      if (key) {
        const record = this.bordersByKey.get(key)
        if (!record) {
          fail(`Border registry mismatch for host key "${key}".`)
        }
        return record
      }
      current = current.parentElement
    }
    return null
  }

  private requireBorderHostForItem(node: HTMLElement, itemId: string): string {
    const host = this.findNearestBorderHost(node)
    if (!host) {
      fail(`revealItem "${itemId}" has border=true but no registered revealBorder host was found.`)
    }
    return host.key
  }

  private incrementBorderItemCount(borderKey: string): void {
    const border = this.bordersByKey.get(borderKey)
    if (!border) {
      fail(`Attempted to increment unknown border host "${borderKey}".`)
    }
    border.activeBorderItems += 1
  }

  private decrementBorderItemCount(borderKey: string): void {
    const border = this.bordersByKey.get(borderKey)
    if (!border) {
      fail(`Attempted to decrement unknown border host "${borderKey}".`)
    }
    if (border.activeBorderItems <= 0) {
      fail(`Border host "${border.id}" has inconsistent item registration counts.`)
    }
    border.activeBorderItems -= 1
  }

  private clearBorderVisibility(): void {
    for (const border of this.bordersByKey.values()) {
      if (border.visible) {
        border.visible = false
        border.node.classList.remove('reveal-visible')
      }
    }
  }

  private clearHoverState(): void {
    if (!this.hoveredItemKey) {
      return
    }

    const hovered = this.itemsByKey.get(this.hoveredItemKey)
    hovered?.node.classList.remove('reveal-hover')
    this.hoveredItemKey = null
  }

  private clearPressedState(): void {
    if (!this.pressedItemKey) {
      return
    }

    const pressed = this.itemsByKey.get(this.pressedItemKey)
    pressed?.node.classList.remove('reveal-pressed', 'reveal-ripple-active', 'reveal-ripple-static')
    this.pressedItemKey = null
  }

  private clearRippleState(): void {
    for (const item of this.itemsByKey.values()) {
      item.node.classList.remove('reveal-ripple-active', 'reveal-ripple-static')
    }
  }

  private applyContainerOptions(): void {
    this.node.style.setProperty('--reveal-radius', `${Math.max(0, this.options.border.radius)}px`)
    this.node.style.setProperty('--reveal-border-color', this.options.border.color)
    this.node.style.setProperty('--reveal-border-width', `${this.options.border.widthPx}px`)
    this.node.style.setProperty('--reveal-border-fade-stop', `${this.options.border.fadeStopPct}%`)
    this.node.style.setProperty('--reveal-border-transition', `${this.options.border.transitionMs}ms`)
    this.node.style.setProperty('--reveal-hover-color', this.options.hover.color)
    this.node.style.setProperty('--reveal-focus-color', this.options.focus.color)
    this.node.style.setProperty('--reveal-focus-width', `${this.options.focus.widthPx}px`)
    this.node.style.setProperty('--reveal-focus-offset', `${this.options.focus.offsetPx}px`)
    this.node.style.setProperty('--reveal-focus-glow', `${this.options.focus.glowPx}px`)
    this.node.style.setProperty('--reveal-focus-glow-soft', `${Math.max(1, this.options.focus.glowPx * 0.55)}px`)
    this.node.style.setProperty('--reveal-focus-pulse-duration', `${this.options.focus.pulseDurationMs}ms`)
    this.node.style.setProperty('--reveal-focus-z-index', `${this.options.focus.zIndex}`)
    this.node.style.setProperty('--reveal-click-color', this.options.click.color)
    this.node.style.setProperty('--reveal-press-scale', `${this.options.click.press.scale}`)
    this.node.style.setProperty('--reveal-press-transition', `${this.options.click.press.transitionMs}ms`)
    this.node.style.setProperty('--reveal-ripple-duration', `${this.options.click.ripple.durationMs}ms`)
    this.node.style.setProperty('--reveal-ripple-size', `${this.options.click.ripple.sizePx}px`)
    this.node.style.setProperty('--reveal-ripple-start-scale', `${this.options.click.ripple.startScale}`)
    this.node.style.setProperty('--reveal-ripple-end-scale', `${this.options.click.ripple.endScale}`)
    this.node.style.setProperty('--reveal-ripple-start-opacity', `${this.options.click.ripple.startOpacity}`)
    this.node.style.setProperty('--reveal-ripple-mid-opacity', `${this.options.click.ripple.midOpacity}`)
    this.node.style.setProperty('--reveal-ripple-end-opacity', `${this.options.click.ripple.endOpacity}`)
    this.node.style.setProperty('--reveal-ripple-core-strength', `${this.options.click.ripple.coreStrength}%`)
    this.node.style.setProperty('--reveal-ripple-mid-strength', `${this.options.click.ripple.midStrength}%`)
    this.node.dataset.revealRipple = this.options.click.ripple.enabled ? 'on' : 'off'
    this.node.dataset.revealFocus = this.options.focus.enabled ? 'on' : 'off'
    if (this.options.debug) {
      this.node.dataset.revealDebug = 'true'
    } else {
      delete this.node.dataset.revealDebug
    }
  }
}
