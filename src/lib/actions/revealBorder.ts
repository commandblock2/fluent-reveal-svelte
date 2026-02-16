import type { Action } from 'svelte/action'
import { findNearestRevealContainer } from '../core/engine'
import type { RevealBorderOptions } from '../core/types'

const DEFAULT_OPTIONS: RevealBorderOptions = {}

export const revealBorder: Action<HTMLElement, RevealBorderOptions | undefined> = (node, options) => {
  const container = findNearestRevealContainer(node.parentElement)
  if (!container) {
    throw new Error('[fluent-reveal] revealBorder requires an ancestor with use:revealContainer.')
  }

  const owner = Symbol('reveal-border')
  container.registerBorder(node, options ?? DEFAULT_OPTIONS, owner)

  return {
    update(nextOptions) {
      container.updateBorder(owner, nextOptions ?? DEFAULT_OPTIONS)
    },
    destroy() {
      container.unregisterBorder(owner)
    },
  }
}

