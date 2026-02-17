# Minimal Consumer Example (Published Package)

This app consumes `fluent-reveal-svelte` from npm via:

```json
"fluent-reveal-svelte": "^0.1.0"
```

It intentionally imports by package name (not source-relative paths):

- `import { revealContainer, revealBorder, revealItem } from 'fluent-reveal-svelte'`
- `import 'fluent-reveal-svelte/styles/reveal.css'`

## Run

```bash
cd examples/package-minimal
npm install
npm run dev
```

## What this validates for publishing

If this example works, the published package is good for basic consumers:

- package resolution works from npm.
- `import { revealContainer, revealBorder, revealItem } from 'fluent-reveal-svelte'` resolves.
- `import 'fluent-reveal-svelte/styles/reveal.css'` resolves.

The demo in `src/` can change freely; this example verifies package-facing behavior.
