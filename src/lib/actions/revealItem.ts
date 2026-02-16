import type { Action } from 'svelte/action'
import { findNearestRevealContainer } from '../core/engine'
import type { RevealItemOptions } from '../core/types'

const DEFAULT_OPTIONS: RevealItemOptions = {
  border: false,
  hover: true,
  click: true,
}

function normalizeOptions(options?: RevealItemOptions): RevealItemOptions {
  if (!options) {
    return { ...DEFAULT_OPTIONS }
  }

  return {
    id: options.id,
    border: Boolean(options.border),
    hover: Boolean(options.hover),
    click: Boolean(options.click),
  }
}

export const revealItem: Action<HTMLElement, RevealItemOptions | undefined> = (node, options) => {
  const owner = Symbol('reveal-item')
  let container = findNearestRevealContainer(node.parentElement)
  let destroyed = false
  let registered = false
  let registerRaf = 0
  let currentOptions = normalizeOptions(options)

  const registerInFrame = (): void => {
    if (destroyed || registered) {
      return
    }

    registerRaf = window.requestAnimationFrame(() => {
      registerRaf = 0
      if (destroyed || registered) {
        return
      }

      container = container ?? findNearestRevealContainer(node.parentElement)
      if (!container) {
        throw new Error('[fluent-reveal] revealItem requires an ancestor with use:revealContainer.')
      }

      // Border hosts and container are expected to exist by this point. If not, throw immediately.
      container.registerItem(node, currentOptions, owner)
      registered = true
    })
  }

  if (container) {
    registerInFrame()
  } else {
    queueMicrotask(() => {
      if (destroyed || registered) {
        return
      }

      container = findNearestRevealContainer(node.parentElement)
      if (!container) {
        throw new Error('[fluent-reveal] revealItem requires an ancestor with use:revealContainer.')
      }

      registerInFrame()
    })
  }

  return {
    update(nextOptions) {
      currentOptions = normalizeOptions(nextOptions)
      if (registered && container) {
        container.updateItem(owner, currentOptions)
      }
    },
    destroy() {
      destroyed = true
      if (registerRaf !== 0) {
        window.cancelAnimationFrame(registerRaf)
        registerRaf = 0
      }
      if (registered && container) {
        container.unregisterItem(owner)
      }
    },
  }
}
