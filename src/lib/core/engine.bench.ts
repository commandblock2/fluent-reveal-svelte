// @vitest-environment jsdom
import { bench, describe, vi } from 'vitest'
import { createRevealContainer } from './engine'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverStub {
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}

  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

type InternalController = {
  lastPointer: { x: number; y: number; target: EventTarget | null } | null
  renderFrame: () => void
}

type Harness = {
  renderFrame: () => void
  destroy: () => void
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

function createHarness(itemCount: number, visibleCount: number): Harness {
  const restoreFns: Array<() => void> = []
  const container = document.createElement('section')
  document.body.appendChild(container)

  const containerRectSpy = vi
    .spyOn(container, 'getBoundingClientRect')
    .mockImplementation(() => createRect(0, 0, 720, 720))
  restoreFns.push(() => containerRectSpy.mockRestore())

  const controller = createRevealContainer(container, { cacheRects: false })
  let pointerTarget: HTMLElement | null = null

  for (let index = 0; index < itemCount; index += 1) {
    const host = document.createElement('div')
    const item = document.createElement('button')
    host.appendChild(item)
    container.appendChild(host)

    const visible = index < visibleCount
    const top = visible ? 16 + (index % 12) * 32 : 3000 + index * 48
    const hostRect = createRect(18, top, 220, 44)
    const itemRect = createRect(18, top, 220, 44)

    const hostRectSpy = vi.spyOn(host, 'getBoundingClientRect').mockImplementation(() => hostRect)
    const itemRectSpy = vi.spyOn(item, 'getBoundingClientRect').mockImplementation(() => itemRect)
    restoreFns.push(() => hostRectSpy.mockRestore())
    restoreFns.push(() => itemRectSpy.mockRestore())

    controller.registerBorder(host, { id: `bench-border-${index}` }, Symbol(`bench-border-owner-${index}`))
    controller.registerItem(
      item,
      { id: `bench-item-${index}`, border: true, hover: true, click: true },
      Symbol(`bench-item-owner-${index}`),
    )

    if (!pointerTarget && visible) {
      pointerTarget = item
    }
  }

  pointerTarget ??= container

  const internal = controller as unknown as InternalController
  internal.lastPointer = {
    x: 36,
    y: 36,
    target: pointerTarget,
  }

  return {
    renderFrame: () => {
      internal.renderFrame()
    },
    destroy: () => {
      controller.destroy()
      for (const restore of restoreFns) {
        restore()
      }
      container.remove()
    },
  }
}

describe('Reveal engine benchmark', () => {
  vi.stubGlobal('CSS', { supports: () => true })
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  const allVisibleHarness = createHarness(300, 300)
  const mostlyOffscreenHarness = createHarness(300, 12)

  bench('renderFrame with 300 visible controls', () => {
    allVisibleHarness.renderFrame()
  })

  bench('renderFrame with 300 controls and 12 visible', () => {
    mostlyOffscreenHarness.renderFrame()
  })
})
