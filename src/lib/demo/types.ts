export type EffectFlags = {
  border: boolean
  hover: boolean
  click: boolean
}

export type DemoControlKind = 'button' | 'icon' | 'input' | 'select' | 'toggle'

export type DemoControl = {
  id: string
  label: string
  note: string
  kind: DemoControlKind
  fx: EffectFlags
}

export function effectSignature(flags: EffectFlags): string {
  return `${flags.border ? 'B' : '-'} ${flags.hover ? 'H' : '-'} ${flags.click ? 'C' : '-'}`
}

