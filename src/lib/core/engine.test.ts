import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createRevealContainer } from './engine'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('RevealContainerController invariants', () => {
  beforeAll(() => {
    vi.stubGlobal('CSS', {
      supports: () => true,
    })
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
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
})

