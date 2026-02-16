<script lang="ts">
  import { revealBorder } from './lib/actions/revealBorder'
  import { revealContainer } from './lib/actions/revealContainer'
  import DemoControlBody from './lib/demo/DemoControlBody.svelte'
  import { denseToolbarControls, matrixControls } from './lib/demo/controls'
  import { effectSignature } from './lib/demo/types'
  import './lib/styles/reveal.css'

  let radius = $state(96)
  let controlRadius = $state(12)
  let cacheRects = $state(true)
  let clickEffect = $state(true)
  let debug = $state(false)

  const containerOptions = $derived({
    radius,
    cacheRects,
    clickEffect,
    debug,
    borderColor: 'rgba(255, 178, 109, 0.94)',
    hoverColor: 'rgba(115, 220, 255, 0.22)',
    clickColor: 'rgba(255, 243, 213, 0.55)',
  })
</script>

<main class="page">
  <section class="hero">
    <p class="eyebrow">Actions-first reveal runtime</p>
    <h1>Fluent Reveal Playground</h1>
    <p class="subtitle">
      Border, hover, and click effects are independently toggled per control in one container.
      The matrix shows all 8 combinations, and the dense toolbar exposes pointer stress behavior.
    </p>
  </section>

  <section class="knobs">
    <label>
      Radius
      <input type="range" min="40" max="180" step="1" bind:value={radius} />
      <span>{radius}px</span>
    </label>

    <label>
      Control radius
      <input type="range" min="0" max="28" step="1" bind:value={controlRadius} />
      <span>{controlRadius}px</span>
    </label>

    <label>
      Cache rects
      <input type="checkbox" bind:checked={cacheRects} />
    </label>

    <label>
      Click effect
      <input type="checkbox" bind:checked={clickEffect} />
    </label>

    <label>
      Debug dataset
      <input type="checkbox" bind:checked={debug} />
    </label>
  </section>

  <section
    class="surface"
    style:--control-radius={`${controlRadius}px`}
    style:--combo-radius={`${controlRadius}px`}
    use:revealContainer={containerOptions}
  >
    <div class="matrix-grid">
      {#each matrixControls as control}
        <article class="matrix-cell">
          <header>
            <h2>{control.label}</h2>
            <span class="signature">{effectSignature(control.fx)}</span>
          </header>
          <p>{control.note}</p>

          {#if control.fx.border}
            <div class="control-border" use:revealBorder={{ id: `${control.id}-border` }}>
              <DemoControlBody {control} />
            </div>
          {:else}
            <DemoControlBody {control} />
          {/if}
        </article>
      {/each}
    </div>

    <section class="toolbar">
      <header>
        <h3>Dense Toolbar</h3>
        <p>Mixed control types in a compressed row for proximity/intersection checks.</p>
      </header>
      <div class="toolbar-row">
        {#each denseToolbarControls as control}
          {#if control.fx.border}
            <div class="control-border dense-border" use:revealBorder={{ id: `${control.id}-border` }}>
              <DemoControlBody {control} dense={true} />
            </div>
          {:else}
            <DemoControlBody {control} dense={true} />
          {/if}
        {/each}
      </div>
    </section>
  </section>
</main>
