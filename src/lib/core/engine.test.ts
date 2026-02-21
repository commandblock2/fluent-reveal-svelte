import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createRevealContainer } from './engine'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverStub {
  static instances: IntersectionObserverStub[] = []

  private readonly callback: IntersectionObserverCallback
  private readonly observedTargets = new Set<Element>()

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    IntersectionObserverStub.instances.push(this)
  }

  observe(target: Element): void {
    this.observedTargets.add(target)
  }

  unobserve(target: Element): void {
    this.observedTargets.delete(target)
  }

  disconnect(): void {
    this.observedTargets.clear()
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  emit(target: Element, isIntersecting: boolean): void {
    if (!this.observedTargets.has(target)) {
      return
    }

    const boundingClientRect = target.getBoundingClientRect()
    const entry = {
      target,
      time: 0,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect,
      intersectionRect: isIntersecting ? boundingClientRect : createRect(0, 0, 0, 0),
      rootBounds: null,
    } as IntersectionObserverEntry

    this.callback([entry], this as unknown as IntersectionObserver)
  }

  static reset(): void {
    IntersectionObserverStub.instances.length = 0
  }
}

function createRect(left: number, top: number, width: number, height: number): DOMRectReadOnly {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRectReadOnly
}

describe('RevealContainerController invariants', () => {
  beforeAll(() => {
    vi.stubGlobal('CSS', {
      supports: () => true,
    })
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
  })

  afterEach(() => {
    IntersectionObserverStub.reset()
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('throws on duplicate registration ids in one container', () => {
    const containerNode = document.createElement('section')
    document.body.appendChild(containerNode)
    const controller = createRevealContainer(containerNode)

    const borderOne = document.createElement('div')
    const borderTwo = document.createElement('div')
    containerNode.append(borderOne, borderTwo)

    controller.registerBorder(borderOne, { id: 'shared-border' }, Symbol('border-1'))

    expect(() => {
      controller.registerBorder(borderTwo, { id: 'shared-border' }, Symbol('border-2'))
    }).toThrow(/Duplicate registration id/)

    controller.destroy()
    containerNode.remove()
  })

  it('throws when border=true item has no registered border host', () => {
    const containerNode = document.createElement('section')
    document.body.appendChild(containerNode)
    const controller = createRevealContainer(containerNode)
    const itemNode = document.createElement('button')
    containerNode.appendChild(itemNode)

    expect(() => {
      controller.registerItem(itemNode, { border: true, hover: true, click: true }, Symbol('item'))
    }).toThrow(/no registered revealBorder host/)

    controller.destroy()
    containerNode.remove()
  })

  it('throws when unregister is called with an unknown owner', () => {
    const containerNode = document.createElement('section')
    document.body.appendChild(containerNode)
    const controller = createRevealContainer(containerNode)

    expect(() => {
      controller.unregisterItem(Symbol('missing-item'))
    }).toThrow(/unknown owner/)

    controller.destroy()
    containerNode.remove()
  })

  it('skips offscreen records during rect refresh when visibility observer marks them hidden', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    const containerNode = document.createElement('section')
    document.body.appendChild(containerNode)

    const visibleBorder = document.createElement('div')
    const hiddenBorder = document.createElement('div')
    const visibleItem = document.createElement('button')
    const hiddenItem = document.createElement('button')
    visibleBorder.appendChild(visibleItem)
    hiddenBorder.appendChild(hiddenItem)
    containerNode.append(visibleBorder, hiddenBorder)

    const containerRectSpy = vi
      .spyOn(containerNode, 'getBoundingClientRect')
      .mockImplementation(() => createRect(0, 0, 320, 320))
    const visibleBorderRectSpy = vi
      .spyOn(visibleBorder, 'getBoundingClientRect')
      .mockImplementation(() => createRect(20, 20, 140, 48))
    const hiddenBorderRectSpy = vi
      .spyOn(hiddenBorder, 'getBoundingClientRect')
      .mockImplementation(() => createRect(20, 1800, 140, 48))
    const visibleItemRectSpy = vi
      .spyOn(visibleItem, 'getBoundingClientRect')
      .mockImplementation(() => createRect(20, 20, 140, 48))
    const hiddenItemRectSpy = vi
      .spyOn(hiddenItem, 'getBoundingClientRect')
      .mockImplementation(() => createRect(20, 1800, 140, 48))

    const controller = createRevealContainer(containerNode, { cacheRects: false })
    controller.registerBorder(visibleBorder, { id: 'visible-border' }, Symbol('visible-border-owner'))
    controller.registerBorder(hiddenBorder, { id: 'hidden-border' }, Symbol('hidden-border-owner'))
    controller.registerItem(
      visibleItem,
      { id: 'visible-item', border: true, hover: true, click: true },
      Symbol('visible-item-owner'),
    )
    controller.registerItem(
      hiddenItem,
      { id: 'hidden-item', border: true, hover: true, click: true },
      Symbol('hidden-item-owner'),
    )

    const observer = IntersectionObserverStub.instances.at(-1)
    expect(observer).toBeDefined()
    observer?.emit(visibleBorder, true)
    observer?.emit(hiddenBorder, false)
    observer?.emit(visibleItem, true)
    observer?.emit(hiddenItem, false)

    containerRectSpy.mockClear()
    visibleBorderRectSpy.mockClear()
    hiddenBorderRectSpy.mockClear()
    visibleItemRectSpy.mockClear()
    hiddenItemRectSpy.mockClear()

    const internal = controller as unknown as {
      lastPointer: { x: number; y: number; target: EventTarget | null } | null
      renderFrame: () => void
    }
    internal.lastPointer = { x: 40, y: 40, target: visibleItem }
    internal.renderFrame()

    expect(containerRectSpy).toHaveBeenCalledTimes(1)
    expect(visibleBorderRectSpy).toHaveBeenCalledTimes(1)
    expect(visibleItemRectSpy).toHaveBeenCalledTimes(1)
    expect(hiddenBorderRectSpy).not.toHaveBeenCalled()
    expect(hiddenItemRectSpy).not.toHaveBeenCalled()

    controller.destroy()
    containerNode.remove()
    rafSpy.mockRestore()
  })

  it('listens to container scroll and capture-phase window scroll', () => {
    const containerNode = document.createElement('section')
    document.body.appendChild(containerNode)

    const nodeAddSpy = vi.spyOn(containerNode, 'addEventListener')
    const nodeRemoveSpy = vi.spyOn(containerNode, 'removeEventListener')
    const windowAddSpy = vi.spyOn(window, 'addEventListener')
    const windowRemoveSpy = vi.spyOn(window, 'removeEventListener')

    const controller = createRevealContainer(containerNode)

    expect(nodeAddSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
    expect(windowAddSpy).toHaveBeenCalledWith('scroll', expect.any(Function), {
      passive: true,
      capture: true,
    })

    controller.destroy()

    expect(nodeRemoveSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(windowRemoveSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true)

    nodeAddSpy.mockRestore()
    nodeRemoveSpy.mockRestore()
    windowAddSpy.mockRestore()
    windowRemoveSpy.mockRestore()
    containerNode.remove()
  })
})
