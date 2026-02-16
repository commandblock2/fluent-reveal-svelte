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
  const container = findNearestRevealContainer(node.parentElement)
  if (!container) {
    throw new Error('[fluent-reveal] revealItem requires an ancestor with use:revealContainer.')
  }

  const owner = Symbol('reveal-item')
  container.registerItem(node, normalizeOptions(options), owner)

  return {
    update(nextOptions) {
      container.updateItem(owner, normalizeOptions(nextOptions))
    },
    destroy() {
      container.unregisterItem(owner)
    },
  }
}

