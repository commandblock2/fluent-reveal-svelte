# AGENTS — Svelte Reveal Effect Bootstrap Guide

This file is a build guide for creating a new Svelte-based reveal-effect project from scratch (border reveal, hover reveal, and click reveal) with CSS-first rendering and minimal JS writes.

## Recommendation: Best Package Form

Use an **actions-first Svelte library** as the primary form.

- Primary API: `use:revealContainer`, `use:revealBorder`, and `use:revealItem`
- Secondary API (if provided): thin wrapper components (`<RevealContainer>`, `<RevealBorder>`, `<RevealItem>`) built on top of the actions
- Internal structure: framework-agnostic core engine + Svelte adapter layer

Why this is best:

- Actions fit arbitrary existing markup (no forced component tree)
- Performance-sensitive pointer logic stays centralized
- Clear ownership of failures (registration is explicit, not discovered by selector)
- Wrapper components can still be provided for teams preferring declarative markup, but must remain thin action wrappers

## Strict No-Fallback Policy

This project intentionally avoids fallback paths to keep failures visible and debuggable.

- No selector-based child discovery API
- No silent no-op behavior for invalid wiring
- No compatibility mode in core runtime
- No automatic downgrade path for unsupported visual features
- No runtime DOM wrapper insertion for border hosts

If a required capability is unavailable, fail fast in development with explicit diagnostics.

## Scope and Non-Goals

Scope:

- Re-implement border reveal, hover reveal, click reveal
- Keep rendering mostly in CSS using custom properties and pseudo-elements
- Keep JS focused on pointer state, intersection checks, and class toggles

Non-goals:

- Do not re-write gradient strings for each element on every move
- Do not rely on global `document.querySelectorAll` for multi-instance setups
- Do not add selector-based registration paths (`borderSelector`, `itemSelector`)
- Do not add implicit compatibility layers inside core actions
- Do not auto-create wrapper `div`s for border effects

## Bootstrap Project

1. Scaffold a Svelte library project (`npm create svelte@latest` with library setup).
2. Add tooling: TypeScript, ESLint, Prettier, Vitest, Playwright.
3. Configure package exports for:
   - `./actions`
   - `./components`
   - `./styles.css`
4. Create a demo app in the same repo for profiling and visual verification.

## Demo Requirements: Effect Combination Matrix

The demo must separate the three effects and show per-control combinations:

- Border reveal: on/off
- Hover reveal: on/off
- Click reveal: on/off

Use a matrix of all 8 combinations so behavior is obvious:

1. border on, hover on, click on
2. border on, hover on, click off
3. border on, hover off, click on
4. border off, hover on, click on
5. border on, hover off, click off
6. border off, hover on, click off
7. border off, hover off, click on
8. border off, hover off, click off (control baseline)

Demo implementation guidance:

- Add per-control config (dataset or object map), not one global config only.
- Render labels on each control showing enabled effects (for quick visual validation).
- Include mixed control types: button, icon button, input, select, toggle.
- Include at least one dense toolbar row to surface proximity/intersection behavior.
- Any control with `border: true` must be rendered inside an explicit border host element.

Example per-control config shape:

```ts
type EffectFlags = {
  border: boolean;
  hover: boolean;
  click: boolean;
};
```

Example Svelte markup idea:

```svelte
{#each controls as c}
  {#if c.fx.border}
    <div class="control-border" use:revealBorder>
      <button class="control" use:revealItem={c.fx}>
        {c.label}
        <small>{c.fx.border ? "B" : "-"} {c.fx.hover ? "H" : "-"} {c.fx.click ? "C" : "-"}</small>
      </button>
    </div>
  {:else}
    <button class="control" use:revealItem={c.fx}>
      {c.label}
      <small>{c.fx.border ? "B" : "-"} {c.fx.hover ? "H" : "-"} {c.fx.click ? "C" : "-"}</small>
    </button>
  {/if}
{/each}
```

Action behavior rule:

- The runtime must check effect flags per target element so one container can host mixed configurations without re-initializing the whole container.

## Suggested Repository Structure

```txt
src/
  core/
    engine.ts
    geometry.ts
    types.ts
  actions/
    revealContainer.ts
    revealBorder.ts
    revealItem.ts
  components/
    RevealContainer.svelte
    RevealBorder.svelte
    RevealItem.svelte
  styles/
    reveal.css
  index.ts
demo/
  src/routes/+page.svelte
  src/lib/demo-data.ts
```

## Public API Contract (v1)

`revealContainer` options:

- `enabled?: boolean`
- `radius?: number`
- `borderColor?: string`
- `hoverColor?: string`
- `clickColor?: string`
- `clickEffect?: boolean`
- `throttle?: 'raf'` (fixed to RAF batching)
- `cacheRects?: boolean` (default: `true`)
- `debug?: boolean`

`revealBorder` options:

- `id?: string`

`revealItem` options:

- `id?: string`
- `border: boolean`
- `hover: boolean`
- `click: boolean`

Action lifecycle requirements:

- `init`: start empty registry, bind listeners, setup observers
- `update`: diff options, update CSS vars/classes only when needed
- `destroy`: remove listeners, observers, RAF handles, internal references

Registration requirements:

- `revealBorder` must register/unregister with nearest `revealContainer`.
- `revealItem` must register/unregister with nearest `revealContainer`.
- Missing container in dev mode must throw an explicit error.
- Duplicate registration ids in the same container must throw an explicit error.
- If `revealItem.border === true` and no registered `revealBorder` host is associated, throw an explicit error in dev mode.

## Border Host Contract

Border reveal uses an explicit host element (wrapper) whose pseudo-element renders the masked ring.

- The host must be present in markup (or via a thin `RevealBorder` component).
- The runtime must not inject wrapper elements dynamically.
- Actions manage behavior/state only; they do not reshape component DOM.
- Missing host for a border-enabled item is a wiring error, not a recoverable path.

## How The Effects Work (Runtime Model)

### Shared state

At runtime, each container action should hold only the minimum mutable state:

- `containerRect`
- `borderHosts[]` (`id`, `el`, `rect`) and `items[]` (`id`, `el`, `rect`, `flags`)
- `lastPointer` (`x`, `y`, `insideContainer`)
- `visibleBorders[]` (last intersection state per border)
- `hoveredItemId` (or element ref)
- `pressedItemId` + `pressStartTs` + `pressOrigin` for click pulse
- `rafId` and observer/listener handles for cleanup

### Border reveal flow

1. `pointermove` updates `lastPointer` and schedules one RAF.
2. RAF starts by reading state and bails early if pointer is outside `containerRect`.
3. If pointer is inside, write `--fx-x` and `--fx-y` once at container scope.
4. Loop through cached border host rects and test pointer-radius intersection.
5. Toggle `.reveal-visible` only when the intersection state changes.
6. Border gradient rendering stays in CSS `::before`; JS never writes per-item gradient strings.

### Hover reveal flow (item background)

1. On pointer enter/move over an item, compute pointer coordinates in item-local space.
2. Write local vars like `--item-fx-x` and `--item-fx-y` on that item only.
3. Toggle `.reveal-hover` for that item.
4. On leave, remove hover class and reset temporary vars/state.

### Click reveal flow

1. On `pointerdown`, capture target item and origin point.
2. Set `.reveal-pressed` and initialize `--click-progress: 0`.
3. Run a short RAF-driven progress update (or CSS animation trigger) until completion.
4. On `pointerup`/`pointercancel`, clear pressed state (or allow a brief finish phase).
5. Keep click visuals CSS-driven; JS only updates state/progress.

### Why this split works

- CSS handles painting and transitions.
- JS handles geometry, pointer lifecycle, and class/variable state.
- This keeps rendering flexible while minimizing expensive per-frame string/style churn.

## Minimal Engine Pseudocode

```ts
onPointerMove(e) {
  state.lastPointer = { x: e.clientX, y: e.clientY };
  scheduleRaf();
}

renderFrame() {
  if (!state.lastPointer) return;
  if (!pointInRect(state.lastPointer, state.containerRect)) {
    clearVisibleBorders();
    return;
  }

  writeContainerVarsOnce(state.lastPointer);

  for each host in state.borderHosts:
    next = intersects(host.rect, state.lastPointer, radius)
    if next != state.visibleBorders[i]:
      toggleVisibleClass(i, next)
      state.visibleBorders[i] = next
}
```

## Tiny Inline Simulation Script

Use this script as a rewrite reference for the event/state/render loop. It demonstrates:

- border visibility toggles from intersection checks
- item hover tracking + local pointer vars
- click press/release transitions
- RAF batching idea (many pointer events, one render)

```js
const radius = 80;
const container = { left: 0, top: 0, right: 460, bottom: 220 };

const borders = [
  { id: "b1", rect: { left: 20, top: 20, right: 170, bottom: 95 } },
  { id: "b2", rect: { left: 190, top: 20, right: 340, bottom: 95 } },
  { id: "b3", rect: { left: 20, top: 115, right: 170, bottom: 190 } },
];

const items = [
  { id: "i1", rect: { left: 24, top: 24, right: 166, bottom: 91 } },
  { id: "i2", rect: { left: 194, top: 24, right: 336, bottom: 91 } },
  { id: "i3", rect: { left: 24, top: 119, right: 166, bottom: 186 } },
];

const state = {
  visible: new Map(borders.map((b) => [b.id, false])),
  hovered: null,
  pressed: null,
  lastPointer: null,
};

function pointInRect(p, r) {
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
}

function intersects(r, x, y, size) {
  const cursor = {
    left: x - size,
    right: x + size,
    top: y - size,
    bottom: y + size,
  };
  return !(
    r.left > cursor.right ||
    r.right < cursor.left ||
    r.top > cursor.bottom ||
    r.bottom < cursor.top
  );
}

function findItemAt(x, y) {
  return items.find((item) => pointInRect({ x, y }, item.rect)) || null;
}

function localXY(rect, x, y) {
  return { x: Math.round(x - rect.left), y: Math.round(y - rect.top) };
}

function toggleBorder(id, next) {
  const prev = state.visible.get(id);
  if (prev === next) return;
  state.visible.set(id, next);
  console.log(`  ${id} .reveal-visible -> ${next ? "ON" : "OFF"}`);
}

function renderFrame(label) {
  console.log(`\n${label}`);
  const p = state.lastPointer;
  if (!p) {
    console.log("  no pointer state");
    return;
  }

  console.log(`  pointer: (${p.x}, ${p.y})`);
  if (!pointInRect(p, container)) {
    for (const b of borders) toggleBorder(b.id, false);
    if (state.hovered) {
      console.log(`  ${state.hovered} .reveal-hover -> OFF`);
      state.hovered = null;
    }
    console.log("  outside container: clear state, skip CSS var writes");
    return;
  }

  console.log(`  write vars once: --fx-x=${p.x}px --fx-y=${p.y}px`);
  for (const b of borders) toggleBorder(b.id, intersects(b.rect, p.x, p.y, radius));

  const item = findItemAt(p.x, p.y);
  if (state.hovered !== (item ? item.id : null)) {
    if (state.hovered) console.log(`  ${state.hovered} .reveal-hover -> OFF`);
    if (item) console.log(`  ${item.id} .reveal-hover -> ON`);
    state.hovered = item ? item.id : null;
  }

  if (item) {
    const pos = localXY(item.rect, p.x, p.y);
    console.log(`  write item vars: --item-fx-x=${pos.x}px --item-fx-y=${pos.y}px`);
  }

  if (state.pressed) {
    console.log(`  ${state.pressed} .reveal-pressed -> ON`);
  }
}

function pointerMove(x, y) {
  state.lastPointer = { x, y };
}

function pointerDown() {
  if (!state.lastPointer) return;
  const item = findItemAt(state.lastPointer.x, state.lastPointer.y);
  if (!item) {
    console.log("\npointerdown on empty area");
    return;
  }
  state.pressed = item.id;
  const origin = localXY(item.rect, state.lastPointer.x, state.lastPointer.y);
  console.log(
    `\npointerdown on ${item.id}: .reveal-pressed ON, ` +
      `--click-origin-x=${origin.x}px --click-origin-y=${origin.y}px --click-progress=0`
  );
}

function pointerUp() {
  if (!state.pressed) return;
  console.log(`\npointerup on ${state.pressed}: .reveal-pressed OFF`);
  state.pressed = null;
}

// Simulate "many pointer moves -> one RAF render with latest pointer"
pointerMove(30, 36);
pointerMove(38, 42);
pointerMove(46, 48);
renderFrame("burst #1 (single frame)");

pointerDown();
pointerMove(70, 62);
renderFrame("drag while pressed");

pointerUp();
pointerMove(222, 56);
renderFrame("move to item 2");

pointerMove(520, 20);
renderFrame("leave container");
```

Run:

```bash
node demo.js
```

## CSS-First Rendering Rules

1. Border reveal renders through `::before` and a mask ring.
2. Pointer coordinates are CSS vars written at container scope (`--fx-x`, `--fx-y`).
3. Border visibility is class-gated (`.reveal-visible`) to avoid unnecessary paints.
4. Hover/click states are class- and var-driven (`.reveal-hover`, `.reveal-pressed`, `--click-progress`).
5. Preserve content opacity; use rgba backgrounds, not parent opacity.

## Runtime Performance Rules

1. Use `pointermove` + `requestAnimationFrame` batching.
2. Early exit when cursor is outside container bounds.
3. Cache item rects; refresh on `pointerenter`, `resize`, `scroll`, and observed layout changes.
4. Batch reads before writes per frame.
5. Only toggle classes when state actually changes.
6. Keep per-frame complexity visible (`O(n)` baseline) and add optional spatial bucketing for large grids.

## Svelte Integration Rules

1. Never access `window`/`document` during SSR.
2. Action code runs client-side only; guard browser-specific branches.
3. Support dynamic lists:
   - `MutationObserver` for add/remove
   - `ResizeObserver` for geometry shifts
4. Scope all queries to the action node, not global document.
5. Allow multiple containers on one page without shared global vars.
6. Keep DOM shape declarative in Svelte markup; actions must never create border wrapper nodes.

## Accessibility and Input Semantics

1. Keep keyboard focus styles intact (`:focus-visible` not overridden by reveal layers).
2. Respect `prefers-reduced-motion` with reduced/disabled click pulse.
3. Handle `pointercancel` and touch/pen gracefully.
4. Ensure pseudo-elements never block interaction (`pointer-events: none`).

## Browser Compatibility Notes

1. Require modern browser support for `mask-composite` / `-webkit-mask-composite` behavior used by the chosen CSS strategy.
2. If required features are missing, surface a clear dev warning and stop effect initialization.
3. Ensure border radius inheritance works for both wrappers and inner controls.

## Testing Strategy

Unit tests:

- Geometry intersection math
- Option normalization
- State transition reducers (visible/hidden, pressed/released)

Component/action tests:

- Listener setup/teardown correctness
- Multi-instance isolation
- Dynamic DOM updates (items added/removed)

E2E visual/perf tests:

- Hover/click behavior snapshots
- No listener leaks across route changes
- Stress case with many items and pointer movement

## Delivery Milestones

1. Core engine with geometry + state transitions + API types.
2. `revealContainer` action with border reveal.
3. `revealItem` or container-managed item hover/click reveal.
4. CSS package finalized with documented variables and classes.
5. Demo page with knobs and perf metrics.
6. Tests + docs + publish pipeline.

## Definition of Done

All conditions must be true:

- Border/hover/click effects match intended visual behavior
- Multiple containers work independently
- Dynamic lists rebind correctly
- Cleanup is complete (no leaked listeners/RAF/observers)
- Reduced-motion mode is supported
- Package can be consumed from a fresh Svelte app with documented setup

## Session Handoff Snapshot (2026-02-16)

This section captures non-obvious context from the bootstrap session so a new chat can continue immediately.

Locked implementation direction:

- Library form: actions-first Svelte library (`use:revealContainer`, `use:revealBorder`, `use:revealItem`) with wrapper components only as thin proxies.
- Rendering split: CSS paints effects; JS computes geometry/state and writes minimal vars/classes.
- Multi-effect support: border/hover/click must be independently enabled per control in the same container.
- Demo requirement: include all 8 border/hover/click on/off combinations.
- Selector discovery is removed from API and runtime.
- Fail-fast diagnostics are required for invalid registration/wiring.
- Border host wrappers are declarative and user-authored; runtime wrapper injection is forbidden.

Critical engineering constraints:

- Do not use global `document.querySelectorAll` for instance wiring.
- Do not rewrite per-element gradient strings every pointermove.
- Always provide full action teardown (`destroy`) for listeners/RAF/observers.
- Keep SSR-safe boundaries (DOM access only in client/runtime action code).

Suggested first commands in a new session:

```bash
npm install
npm run dev
```

Suggested first implementation steps in a new session:

1. Create `src/lib/actions/revealContainer.ts` with init/update/destroy skeleton.
2. Create `src/lib/core/geometry.ts` (`pointInRect`, `intersectsRectRadius`) and unit tests.
3. Add `src/lib/styles/reveal.css` with border pseudo-element + class gates.
4. Build demo matrix page with per-control flags (`border`, `hover`, `click`).

Open choices to resolve early:

- Whether click pulse progress is RAF-driven JS var updates or pure CSS animation trigger.
- Whether spatial partitioning is needed in v1 or deferred until perf thresholds are measured.

## Session Start Contract

Use this kickoff prompt at the start of a new chat session:

```txt
Continue the Svelte reveal-effect rewrite in strict mode.
Constraints:
- actions-only API: use:revealContainer, use:revealBorder, use:revealItem
- no selector discovery
- no runtime wrapper insertion
- no fallback paths
- fail early with explicit dev errors for invalid wiring
Goal for this session:
- implement the next smallest vertical slice and verify with fast local checks
```

First commands to run in a new session:

```bash
npm install
npm run dev
```

## Runtime Invariants Checklist

These are hard invariants, not best-effort behaviors:

1. `revealItem` without a parent `revealContainer` in dev mode -> throw.
2. `revealBorder` without a parent `revealContainer` in dev mode -> throw.
3. Duplicate registration ids in one container -> throw.
4. Unregister of unknown id or mismatched owner -> throw in dev mode.
5. `revealItem.border === true` without an associated registered `revealBorder` host -> throw.
6. Missing required DOM capability for configured effect path -> stop initialization and report explicit diagnostics.

## Milestone-1 Acceptance Gate

Do not move to the next milestone until all items pass:

Required files:

- `src/lib/actions/revealContainer.ts`
- `src/lib/actions/revealBorder.ts`
- `src/lib/actions/revealItem.ts`
- `src/lib/core/geometry.ts`
- `src/lib/styles/reveal.css`

Required behavior:

1. A container with mixed controls supports independent `border`, `hover`, `click` flags.
2. Border effect only works through explicit border hosts (no runtime wrapper creation).
3. Teardown is clean (`destroy` removes listeners/RAF/observers and unregisters items/hosts).
4. At least 4 representative demo combinations render correctly (including full on/off baseline).

Required checks:

1. Unit tests pass for geometry and registration invariants.
2. Manual dev check shows no console errors in valid wiring, explicit errors in invalid wiring.
3. Pointer move performance remains stable in a dense toolbar sample.

## Design Principles for Fast Iteration

This project optimizes for short feedback loops and fast fault isolation.

1. No fallback paths in runtime behavior.
2. Fail early, fail loudly, and fail with actionable diagnostics.
3. Keep APIs explicit over implicit discovery.
4. Prefer small vertical slices that are testable in one session.
5. When behavior is ambiguous, choose the variant that makes breakage visible sooner.
