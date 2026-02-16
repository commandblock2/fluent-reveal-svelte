import type { Action } from 'svelte/action'
import { createRevealContainer } from '../core/engine'
import type { RevealContainerOptions } from '../core/types'

export const revealContainer: Action<HTMLElement, RevealContainerOptions | undefined> = (node, options) => {
  const controller = createRevealContainer(node, options)

  return {
    update(nextOptions) {
      controller.updateOptions(nextOptions)
    },
    destroy() {
      controller.destroy()
    },
  }
}

