# Minimal Consumer Example (`file:../..`)

This app consumes `fluent-reveal-svelte` as a package dependency via:

```json
"fluent-reveal-svelte": "file:../.."
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

If this example works, your package metadata is good for basic consumers:

- `exports["."]` resolves the public API entry.
- `exports["./styles/reveal.css"]` resolves the stylesheet subpath.
- package `files` includes library source and docs needed by consumers.
- `peerDependencies.svelte` is declared.

The demo in `src/` can change freely; this example verifies package-facing behavior.
