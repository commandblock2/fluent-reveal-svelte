<script lang="ts">
  import { revealBorder } from './lib/actions/revealBorder'
  import { revealContainer } from './lib/actions/revealContainer'
  import { revealItem } from './lib/actions/revealItem'
  import DemoControlBody from './lib/demo/DemoControlBody.svelte'
  import { denseToolbarControls, matrixControls } from './lib/demo/controls'
  import { effectSignature } from './lib/demo/types'
  import './lib/styles/reveal.css'

  const BUTTON_GROUPS = [
    'System',
    'Project',
    'Design',
    'Build',
    'Deploy',
    'Docs',
    'Media',
    'Search',
    'Security',
    'Testing',
  ] as const

  const libraryButtons = Array.from({ length: 100 }, (_, index) => {
    const number = index + 1
    const group = BUTTON_GROUPS[index % BUTTON_GROUPS.length]
    return {
      id: `action-${number.toString().padStart(3, '0')}`,
      label: `${group} Action ${number.toString().padStart(3, '0')}`,
    }
  })

  const generalSettings = $state({
    controlRadius: 12,
    cacheRects: true,
    debug: false,
  })

  const borderSettings = $state({
    radius: 96,
    colorHex: '#ffb26d',
    colorAlphaPercent: 94,
    widthPx: 1,
    fadeStopPct: 72,
    transitionMs: 180,
  })

  const hoverSettings = $state({
    colorHex: '#73dcff',
    colorAlphaPercent: 22,
  })

  const clickSettings = $state({
    enabled: true,
    rippleEnabled: true,
    colorHex: '#fff3d5',
    colorAlphaPercent: 55,
    pressScale: 0.98,
    pressTransitionMs: 96,
    rippleDurationMs: 980,
    rippleSizePx: 24,
    rippleStartScale: 0.2,
    rippleEndScale: 3.2,
    rippleStartOpacity: 0.52,
    rippleMidOpacity: 0.2,
    rippleEndOpacity: 0.18,
    rippleCoreStrength: 74,
    rippleMidStrength: 42,
  })

  const librarySettings = $state({
    query: '',
    gapPercent: 100,
  })

  const toRgba = (hex: string, alpha: number, fallbackHex: string): string => {
    const normalized = hex.trim().replace('#', '')
    const expanded =
      normalized.length === 3
        ? normalized
            .split('')
            .map((char) => `${char}${char}`)
            .join('')
        : normalized

    const fallback = fallbackHex.trim().replace('#', '')
    const fallbackExpanded =
      fallback.length === 3
        ? fallback
            .split('')
            .map((char) => `${char}${char}`)
            .join('')
        : fallback
    const source = /^[0-9a-fA-F]{6}$/.test(expanded) ? expanded : fallbackExpanded

    const red = parseInt(source.slice(0, 2), 16)
    const green = parseInt(source.slice(2, 4), 16)
    const blue = parseInt(source.slice(4, 6), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  }

  const containerOptions = $derived({
    border: {
      radius: borderSettings.radius,
      color: toRgba(borderSettings.colorHex, borderSettings.colorAlphaPercent / 100, '#ffb26d'),
      widthPx: borderSettings.widthPx,
      fadeStopPct: borderSettings.fadeStopPct,
      transitionMs: borderSettings.transitionMs,
    },
    hover: {
      color: toRgba(hoverSettings.colorHex, hoverSettings.colorAlphaPercent / 100, '#73dcff'),
    },
    click: {
      enabled: clickSettings.enabled,
      color: toRgba(clickSettings.colorHex, clickSettings.colorAlphaPercent / 100, '#fff3d5'),
      press: {
        scale: clickSettings.pressScale,
        transitionMs: clickSettings.pressTransitionMs,
      },
      ripple: {
        enabled: clickSettings.rippleEnabled,
        durationMs: clickSettings.rippleDurationMs,
        sizePx: clickSettings.rippleSizePx,
        startScale: clickSettings.rippleStartScale,
        endScale: clickSettings.rippleEndScale,
        startOpacity: clickSettings.rippleStartOpacity,
        midOpacity: clickSettings.rippleMidOpacity,
        endOpacity: clickSettings.rippleEndOpacity,
        coreStrength: clickSettings.rippleCoreStrength,
        midStrength: clickSettings.rippleMidStrength,
      },
    },
    cacheRects: generalSettings.cacheRects,
    debug: generalSettings.debug,
  })
  const libraryContainerOptions = $derived({
    ...containerOptions,
    cacheRects: false,
  })

  const normalizedButtonQuery = $derived(librarySettings.query.trim().toLowerCase())
  const filteredLibraryButtons = $derived.by(() => {
    if (!normalizedButtonQuery) {
      return libraryButtons
    }

    return libraryButtons.filter((button) => {
      return (
        button.label.toLowerCase().includes(normalizedButtonQuery) ||
        button.id.toLowerCase().includes(normalizedButtonQuery)
      )
    })
  })
</script>

<main
  class="page"
  style:--control-radius={`${generalSettings.controlRadius}px`}
  style:--combo-radius={`${generalSettings.controlRadius}px`}
>
  <section class="hero">
    <p class="eyebrow">Actions-first reveal runtime</p>
    <h1>Fluent Reveal Playground</h1>
    <p class="subtitle">
      Border, hover, and click effects are independently toggled per control in one container.
      The matrix shows all 8 combinations, and the dense toolbar exposes pointer stress behavior.
    </p>
  </section>

  <section class="knobs">
    <fieldset class="knob-group">
      <legend>General</legend>

      <label>
        Control radius
        <input type="range" min="0" max="28" step="1" bind:value={generalSettings.controlRadius} />
        <span>{generalSettings.controlRadius}px</span>
      </label>

      <label>
        Cache rects
        <input type="checkbox" bind:checked={generalSettings.cacheRects} />
      </label>

      <label>
        Debug dataset
        <input type="checkbox" bind:checked={generalSettings.debug} />
      </label>
    </fieldset>

    <fieldset class="knob-group">
      <legend>Border Effect</legend>

      <label>
        Border radius
        <input type="range" min="40" max="220" step="1" bind:value={borderSettings.radius} />
        <span>{borderSettings.radius}px</span>
      </label>

      <label>
        Border width
        <input type="range" min="0" max="16" step="0.1" bind:value={borderSettings.widthPx} />
        <span>{borderSettings.widthPx.toFixed(1)}px</span>
      </label>

      <label>
        Border falloff
        <input type="range" min="10" max="100" step="1" bind:value={borderSettings.fadeStopPct} />
        <span>{borderSettings.fadeStopPct}%</span>
      </label>

      <label>
        Border fade duration
        <input type="range" min="0" max="2000" step="10" bind:value={borderSettings.transitionMs} />
        <span>{borderSettings.transitionMs}ms</span>
      </label>

      <label>
        Border opacity
        <input type="range" min="0" max="100" step="1" bind:value={borderSettings.colorAlphaPercent} />
        <span>{borderSettings.colorAlphaPercent}%</span>
      </label>

      <label class="knob-color">
        Border color
        <input type="color" bind:value={borderSettings.colorHex} />
        <code>{borderSettings.colorHex}</code>
      </label>
    </fieldset>

    <fieldset class="knob-group">
      <legend>Click And Ripple</legend>

      <label>
        Click effect
        <input type="checkbox" bind:checked={clickSettings.enabled} />
      </label>

      <label>
        Ripple effect
        <input type="checkbox" bind:checked={clickSettings.rippleEnabled} />
      </label>

      <label>
        Press scale
        <input type="range" min="0.8" max="1" step="0.005" bind:value={clickSettings.pressScale} />
        <span>{clickSettings.pressScale.toFixed(3)}</span>
      </label>

      <label>
        Press duration
        <input
          type="range"
          min="0"
          max="1000"
          step="5"
          bind:value={clickSettings.pressTransitionMs}
        />
        <span>{clickSettings.pressTransitionMs}ms</span>
      </label>

      <label>
        Ripple duration
        <input
          type="range"
          min="120"
          max="4000"
          step="10"
          bind:value={clickSettings.rippleDurationMs}
        />
        <span>{clickSettings.rippleDurationMs}ms</span>
      </label>

      <label>
        Ripple size
        <input type="range" min="4" max="240" step="1" bind:value={clickSettings.rippleSizePx} />
        <span>{clickSettings.rippleSizePx}px</span>
      </label>

      <label>
        Ripple start scale
        <input
          type="range"
          min="0.05"
          max="2.5"
          step="0.01"
          bind:value={clickSettings.rippleStartScale}
        />
        <span>{clickSettings.rippleStartScale.toFixed(2)}</span>
      </label>

      <label>
        Ripple end scale
        <input type="range" min="0.2" max="8" step="0.01" bind:value={clickSettings.rippleEndScale} />
        <span>{clickSettings.rippleEndScale.toFixed(2)}</span>
      </label>

      <label>
        Ripple start opacity
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          bind:value={clickSettings.rippleStartOpacity}
        />
        <span>{clickSettings.rippleStartOpacity.toFixed(2)}</span>
      </label>

      <label>
        Ripple mid opacity
        <input type="range" min="0" max="1" step="0.01" bind:value={clickSettings.rippleMidOpacity} />
        <span>{clickSettings.rippleMidOpacity.toFixed(2)}</span>
      </label>

      <label>
        Ripple end opacity
        <input type="range" min="0" max="1" step="0.01" bind:value={clickSettings.rippleEndOpacity} />
        <span>{clickSettings.rippleEndOpacity.toFixed(2)}</span>
      </label>

      <label>
        Ripple core strength
        <input type="range" min="0" max="100" step="1" bind:value={clickSettings.rippleCoreStrength} />
        <span>{clickSettings.rippleCoreStrength}%</span>
      </label>

      <label>
        Ripple mid strength
        <input type="range" min="0" max="100" step="1" bind:value={clickSettings.rippleMidStrength} />
        <span>{clickSettings.rippleMidStrength}%</span>
      </label>

      <label>
        Ripple opacity
        <input type="range" min="0" max="100" step="1" bind:value={clickSettings.colorAlphaPercent} />
        <span>{clickSettings.colorAlphaPercent}%</span>
      </label>

      <label class="knob-color">
        Ripple color
        <input type="color" bind:value={clickSettings.colorHex} />
        <code>{clickSettings.colorHex}</code>
      </label>
    </fieldset>

    <fieldset class="knob-group">
      <legend>Hover</legend>

      <label>
        Hover opacity
        <input type="range" min="0" max="100" step="1" bind:value={hoverSettings.colorAlphaPercent} />
        <span>{hoverSettings.colorAlphaPercent}%</span>
      </label>

      <label class="knob-color">
        Hover color
        <input type="color" bind:value={hoverSettings.colorHex} />
        <code>{hoverSettings.colorHex}</code>
      </label>
    </fieldset>
  </section>

  <section class="surface" use:revealContainer={containerOptions}>
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

  <section
    class="library"
    style:--library-gap-scale={`${librarySettings.gapPercent / 100}`}
    use:revealContainer={libraryContainerOptions}
  >
    <header class="library-header">
      <h3>Filterable 100-Button Rack</h3>
      <p>Search by group name, action number, or id. Buttons stay horizontal and full-width.</p>
    </header>

    <label class="library-search">
      <span>Search actions</span>
      <input
        type="search"
        bind:value={librarySettings.query}
        placeholder="Try: system, deploy, 042, action-010"
        autocomplete="off"
      />
    </label>

    <label class="library-gap">
      <span>Button spacing</span>
      <input type="range" min="0" max="200" step="1" bind:value={librarySettings.gapPercent} />
      <strong>{librarySettings.gapPercent}%</strong>
    </label>

    <p class="library-meta">{filteredLibraryButtons.length} / {libraryButtons.length} actions visible</p>

    <div class="library-list">
      {#each filteredLibraryButtons as button (button.id)}
        <div class="library-item-host" use:revealBorder={{ id: `${button.id}-border` }}>
          <button
            type="button"
            class="library-button"
            use:revealItem={{
              id: button.id,
              border: true,
              hover: true,
              click: true,
            }}
          >
            <span>{button.label}</span>
            <small>{button.id}</small>
          </button>
        </div>
      {:else}
        <p class="library-empty">No actions found for "{librarySettings.query}".</p>
      {/each}
    </div>
  </section>
</main>
