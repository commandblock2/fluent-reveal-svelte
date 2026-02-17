<script lang="ts">
  import {
    revealBorder,
    revealContainer,
    revealItem,
    type RevealContainerOptions,
  } from 'fluent-reveal-svelte'
  import 'fluent-reveal-svelte/styles/reveal.css'

  const buttons = ['System', 'Project', 'Deploy', 'Search', 'Settings'] as const

  const options: RevealContainerOptions = {
    border: {
      radius: 96,
      color: 'rgba(255, 178, 109, 0.94)',
      widthPx: 1,
      fadeStopPct: 72,
      transitionMs: 180,
    },
    hover: {
      color: 'rgba(115, 220, 255, 0.22)',
    },
    focus: {
      enabled: true,
      color: 'rgba(146, 220, 255, 0.76)',
      widthPx: 2,
      offsetPx: 3,
      glowPx: 14,
      zIndex: 12,
    },
    click: {
      enabled: true,
      color: 'rgba(255, 243, 213, 0.55)',
      press: {
        scale: 0.98,
        transitionMs: 96,
      },
      ripple: {
        enabled: true,
        durationMs: 980,
        sizePx: 24,
        startScale: 0.2,
        endScale: 3.2,
        startOpacity: 0.52,
        midOpacity: 0.2,
        endOpacity: 0.18,
        coreStrength: 74,
        midStrength: 42,
      },
    },
    cacheRects: true,
  }
</script>

<main>
  <h1>fluent-reveal-svelte package consumer</h1>
  <p>All effects enabled. Try hover, click, and keyboard tab focus.</p>

  <section class="panel" use:revealContainer={options}>
    {#each buttons as label}
      <div class="button-border" use:revealBorder={{ id: `${label}-border` }}>
        <button
          type="button"
          class="demo-button"
          use:revealItem={{
            id: `${label}-item`,
            border: true,
            hover: true,
            click: true,
          }}
        >
          <span class="reveal-press-content">
            <span class="button-label">{label}</span>
            <small>All Effects</small>
          </span>
        </button>
      </div>
    {/each}
  </section>
</main>
