import type { DemoControl, DemoControlKind, EffectFlags } from './types'

const MATRIX_FLAGS: EffectFlags[] = [
  { border: true, hover: true, click: true },
  { border: true, hover: true, click: false },
  { border: true, hover: false, click: true },
  { border: false, hover: true, click: true },
  { border: true, hover: false, click: false },
  { border: false, hover: true, click: false },
  { border: false, hover: false, click: true },
  { border: false, hover: false, click: false },
]

const MATRIX_KINDS: DemoControlKind[] = [
  'button',
  'icon',
  'input',
  'select',
  'toggle',
  'button',
  'icon',
  'toggle',
]

export const matrixControls: DemoControl[] = MATRIX_FLAGS.map((fx, index) => {
  const combo = index + 1
  return {
    id: `matrix-${combo}`,
    label: `Combo ${combo}`,
    note: `${fx.border ? 'Border' : 'No border'} · ${fx.hover ? 'Hover' : 'No hover'} · ${
      fx.click ? 'Click' : 'No click'
    }`,
    kind: MATRIX_KINDS[index] ?? 'button',
    fx,
  }
})

export const denseToolbarControls: DemoControl[] = [
  {
    id: 'toolbar-new',
    label: 'New',
    note: 'Primary action',
    kind: 'button',
    fx: { border: true, hover: true, click: true },
  },
  {
    id: 'toolbar-pin',
    label: 'Pin',
    note: 'Icon action',
    kind: 'icon',
    fx: { border: true, hover: true, click: false },
  },
  {
    id: 'toolbar-filter',
    label: 'Filter',
    note: 'Selection',
    kind: 'select',
    fx: { border: false, hover: true, click: true },
  },
  {
    id: 'toolbar-title',
    label: 'Title',
    note: 'Text input',
    kind: 'input',
    fx: { border: false, hover: true, click: false },
  },
  {
    id: 'toolbar-notify',
    label: 'Notify',
    note: 'Toggle',
    kind: 'toggle',
    fx: { border: true, hover: false, click: true },
  },
  {
    id: 'toolbar-share',
    label: 'Share',
    note: 'Utility',
    kind: 'button',
    fx: { border: false, hover: false, click: true },
  },
]

