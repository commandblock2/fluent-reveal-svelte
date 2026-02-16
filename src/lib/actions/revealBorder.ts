import type { Action } from 'svelte/action'
import { findNearestRevealContainer } from '../core/engine'
import type { RevealBorderOptions } from '../core/types'

const DEFAULT_OPTIONS: RevealBorderOptions = {}

export const revealBorder: Action<HTMLElement, RevealBorderOptions | undefined> = (node, options) => {
  const owner = Symbol('reveal-border')
  let container = findNearestRevealContainer(node.parentElement)
  let destroyed = false
  let registered = false
  let currentOptions = options ?? DEFAULT_OPTIONS

  const register = (): void => {
    if (destroyed || registered) {
      return
    }

    container = container ?? findNearestRevealContainer(node.parentElement)
    if (!container) {
      throw new Error('[fluent-reveal] revealBorder requires an ancestor with use:revealContainer.')
    }

    container.registerBorder(node, currentOptions, owner)
    registered = true
  }

  if (container) {
    register()
  } else {
    queueMicrotask(() => {
      if (destroyed || registered) {
        return
      }
      register()
    })
  }

  return {
    update(nextOptions) {
      currentOptions = nextOptions ?? DEFAULT_OPTIONS
      if (registered && container) {
        container.updateBorder(owner, currentOptions)
      }
    },
    destroy() {
      destroyed = true
      if (registered && container) {
        container.unregisterBorder(owner)
      }
    },
  }
}
