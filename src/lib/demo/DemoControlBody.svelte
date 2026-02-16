<script lang="ts">
  import { revealItem } from '../actions/revealItem'
  import { effectSignature, type DemoControl } from './types'

  type Props = {
    control: DemoControl
    dense?: boolean
  }

  let { control, dense = false }: Props = $props()
</script>

{#if control.kind === 'button'}
  <button class="demo-control button-control" class:dense use:revealItem={control.fx}>
    <span>{control.label}</span>
    <small>{effectSignature(control.fx)}</small>
  </button>
{:else if control.kind === 'icon'}
  <button class="demo-control icon-control" class:dense aria-label={control.label} use:revealItem={control.fx}>
    <span class="icon-glyph" aria-hidden="true">✷</span>
    <small>{effectSignature(control.fx)}</small>
  </button>
{:else if control.kind === 'input'}
  <label class="demo-control field-control" class:dense use:revealItem={control.fx}>
    <span>{control.label}</span>
    <input placeholder="type..." />
    <small>{effectSignature(control.fx)}</small>
  </label>
{:else if control.kind === 'select'}
  <label class="demo-control select-control" class:dense use:revealItem={control.fx}>
    <span>{control.label}</span>
    <select>
      <option>Default</option>
      <option>Focused</option>
      <option>Archive</option>
    </select>
    <small>{effectSignature(control.fx)}</small>
  </label>
{:else}
  <label class="demo-control toggle-control" class:dense use:revealItem={control.fx}>
    <span>{control.label}</span>
    <input type="checkbox" />
    <small>{effectSignature(control.fx)}</small>
  </label>
{/if}

