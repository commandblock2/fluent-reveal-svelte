# fluent-reveal-svelte

Pointer-driven Fluent-style border, hover, and click reveal effects for Svelte.

The library exposes 3 actions:
- `revealContainer`
- `revealBorder`
- `revealItem`

It uses fail-fast runtime checks and throws descriptive errors when DOM/action contracts are violated.

## Install

```bash
npm i fluent-reveal-svelte
```

Also import the reveal CSS once in your app entry or root layout.

```ts
import 'fluent-reveal-svelte/styles/reveal.css'
```

If your package setup uses a different CSS path, import the bundled `reveal.css` from this repo.

## Published Package Example

A minimal consumer app is available at `examples/package-minimal`.

It installs `fluent-reveal-svelte` from npm and enables border, hover, focus, and click effects on 5 buttons.

Run it with:

```bash
cd examples/package-minimal
npm install
npm run dev
```

## Benchmark

Run the engine micro-benchmark:

```bash
npm run bench
```

It compares render-loop cost for:
- 300 visible controls
- 300 controls with only 12 in viewport (offscreen controls are culled)

## Demo Deployment (GitHub Pages)

This repo can publish the demo page to:

`https://commandblock2.github.io/fluent-reveal-svelte/`

CI workflow:
- `.github/workflows/deploy-pages.yml`
- triggers on push to `main` and manual runs
- uses `npm run build:pages` (Vite base path `/fluent-reveal-svelte/`)

One-time GitHub setup:
1. Open repository `Settings`.
2. Open `Pages`.
3. Set `Build and deployment` source to `GitHub Actions`.

After that, each push to `main` deploys the latest demo.

## Before You Use It

### Required structure

`revealItem` must be inside an ancestor using `revealContainer`.

If `revealItem` has `border: true`, it must also have an ancestor using `revealBorder` (usually a wrapper around the item).

### Required content wrapper for press scale

Press scaling is applied to `.reveal-press-content`, not to the outer button node.  
Wrap button content like this:

```svelte
<button use:revealItem={{ border: true, hover: true, click: true }}>
  <span class="reveal-press-content">
    <span>Label</span>
  </span>
</button>
```

### Browser capabilities

The container will throw at runtime if required platform features are missing:
- CSS `mask-composite`
- `ResizeObserver`
- `MutationObserver`

## Minimal Example

```svelte
<script lang="ts">
  import { revealBorder, revealContainer, revealItem, type RevealContainerOptions } from 'fluent-reveal-svelte'
  import 'fluent-reveal-svelte/styles/reveal.css'

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

<section use:revealContainer={options}>
  <div use:revealBorder>
    <button
      class="my-button"
      use:revealItem={{ border: true, hover: true, click: true }}
    >
      <span class="reveal-press-content">
        <span>Deploy</span>
        <small>D P L</small>
      </span>
    </button>
  </div>
</section>

<style>
  .my-button {
    border-radius: 12px;
    border: 1px solid rgba(20, 35, 50, 0.16);
    background: rgba(255, 255, 255, 0.35);
    color: #15293a;
    padding: 0.55rem 0.75rem;
    display: flex;
    width: 100%;
  }

  .my-button > .reveal-press-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
  }
</style>
```

## Public API

### `revealContainer`

Attach to a parent region.

```ts
type RevealContainerOptions = {
  enabled?: boolean
  border?: {
    radius?: number
    color?: string
    widthPx?: number
    fadeStopPct?: number
    transitionMs?: number
  }
  hover?: {
    color?: string
  }
  focus?: {
    enabled?: boolean
    color?: string
    widthPx?: number
    offsetPx?: number
    glowPx?: number
    zIndex?: number
  }
  click?: {
    enabled?: boolean
    color?: string
    press?: {
      scale?: number
      transitionMs?: number
    }
    ripple?: {
      enabled?: boolean
      durationMs?: number
      sizePx?: number
      startScale?: number
      endScale?: number
      startOpacity?: number
      midOpacity?: number
      endOpacity?: number
      coreStrength?: number
      midStrength?: number
    }
  }
  throttle?: 'raf'
  cacheRects?: boolean
  debug?: boolean
}
```

#### Numeric ranges (clamped)

| Option | Range | Default |
| --- | --- | --- |
| `border.radius` | `0..600` | `90` |
| `border.widthPx` | `0..16` | `1` |
| `border.fadeStopPct` | `10..100` | `72` |
| `border.transitionMs` | `0..2000` | `180` |
| `focus.widthPx` | `0..16` | `2` |
| `focus.offsetPx` | `0..24` | `3` |
| `focus.glowPx` | `0..64` | `14` |
| `focus.zIndex` | `0..1000` | `12` |
| `click.press.scale` | `0.8..1` | `0.98` |
| `click.press.transitionMs` | `0..1000` | `96` |
| `click.ripple.durationMs` | `120..4000` | `980` |
| `click.ripple.sizePx` | `4..240` | `24` |
| `click.ripple.startScale` | `0.05..2.5` | `0.2` |
| `click.ripple.endScale` | `0.2..8` | `3.2` |
| `click.ripple.startOpacity` | `0..1` | `0.52` |
| `click.ripple.midOpacity` | `0..1` | `0.2` |
| `click.ripple.endOpacity` | `0..1` | `0.18` |
| `click.ripple.coreStrength` | `0..100` | `74` |
| `click.ripple.midStrength` | `0..100` | `42` |

Notes:
- `throttle` currently supports only `'raf'`
- `id` values are immutable once registered (`revealBorder` / `revealItem`)

### `revealBorder`

Attach to a wrapper element that should render the border effect.

```ts
type RevealBorderOptions = {
  id?: string
}
```

### `revealItem`

Attach to interactive elements.

```ts
type RevealItemOptions = {
  id?: string
  border: boolean
  hover: boolean
  click: boolean
}
```

Default behavior when options are omitted:
- `border: false`
- `hover: true`
- `click: true`

## Transparency Guidance

Effects are composited overlays. Visual quality depends on your surface styling.

Recommended:
- Keep control backgrounds partially transparent (`rgba(..., 0.2..0.7)`) for richer hover/ripple blending.
- Keep border hosts transparent.
- Use consistent border radii between host and item.
- Avoid stacking many strong opaque layers over the control if you want reveal to remain visible.

## FAQ

### 1) Do I need a separate div for the border effect?

If `revealItem` uses `border: true`, yes, use an ancestor wrapper with `use:revealBorder`.  
`revealItem` searches parent elements for a border host and throws if none is found.

### 2) What about button content?

Wrap content in `.reveal-press-content` if you want press scaling.  
This keeps the outer button and border stable while content scales.

### 3) How much should users worry about transparency?

A lot for visual quality, not for correctness.  
Opaque surfaces still work functionally, but reveal layers are less visible.

### 4) Is there a minimal example?

Yes, see the **Minimal Example** section above.

## Common Errors

- `[fluent-reveal] revealItem requires an ancestor with use:revealContainer.`
  - Add `use:revealContainer` on a parent.
- `[fluent-reveal] revealItem "<id>" has border=true but no registered revealBorder host was found.`
  - Wrap the item with a `use:revealBorder` ancestor.

## License

GPL-3.0 (see `LICENSE`).

Third-party asset notices are listed in `THIRD_PARTY_NOTICES.md`.
