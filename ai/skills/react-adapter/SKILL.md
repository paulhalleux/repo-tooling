---
name: react-adapter
description: Design, implement, or review the React-facing API of a framework-agnostic TypeScript library, including hooks, providers, components, subscriptions, refs, controlled state, SSR, and React-specific type ergonomics.
---

# React adapter

Expose idiomatic React around stable core semantics. Do not make React dictate the core model.

## 1. Design the React API as React

Do not mechanically expose every service method as a hook or every core object through Context.

Ask:

- What should be a hook?
- What should be a component/provider?
- What can remain a plain imported function/object?
- What state is tree-scoped versus globally/external owned?
- What should consumers compose declaratively?

The adapter should feel natural to React consumers, not like a service API with `use` prefixes.

## 2. Preserve state ownership

Keep one source of truth.

Derive render data during render when possible instead of duplicating external/core state into React state and synchronizing it with Effects.

Use Effects for synchronization with external systems, not ordinary derived state or event-driven computation.

For mutable state owned outside React that provides subscribe/getSnapshot semantics, prefer `useSyncExternalStore` when it matches the contract.

Adapter-local React state should represent genuinely React/UI-owned state.

## 3. Hooks

Hooks should expose meaningful capabilities and stable semantics.

Check:

- correct hook composition;
- subscription cleanup;
- intentional value/callback identity semantics;
- no mechanical `useMemo`/`useCallback`/`memo`;
- side-effect-free render reads;
- explicit ownership/cancellation of async work;
- no hidden global singleton assumptions unless intended.

Do not promise stable object/callback identity unless consumers need it and the implementation can preserve it.

## 4. Providers and Context

Use Context for dependencies/state that genuinely require React tree scoping.

Avoid Context as a second service locator or a mirrored copy of all runtime state.

Prefer narrow providers and external-store subscriptions for frequently changing externally owned state where appropriate.

Question whether a provider is needed at all when an explicit runtime/object parameter or module import is clearer.

## 5. Components and composition

Prefer composable components with explicit ownership and semantic props.

For modern React 19-targeted code, accept `ref` as a prop rather than introducing `forwardRef` in new components. Preserve older patterns only when the supported React range requires them.

Do not expose imperative handles unless an imperative capability is genuinely needed.

If rendering UI, preserve semantic HTML, focus ownership, keyboard behavior, disabled state, labels, and relevant ARIA relationships.

## 6. Controlled/uncontrolled design

If both modes exist, define ownership clearly:

- initial/default value semantics;
- authoritative value in controlled mode;
- change callback behavior;
- no silent ownership switching during component lifetime;
- consistent naming across the adapter.

Do not add controlled/uncontrolled duality when only one ownership model is actually needed.

## 7. SSR and hydration

Avoid `window`/`document` during module evaluation or server render unless explicitly client-only.

For external stores and environment-derived values, provide coherent server snapshots when SSR is supported.

Avoid initial renders that differ solely because browser-only mutable values were read too early.

## 8. Keep React out of core

Core should not accept `ReactNode`, component types, JSX, refs, Context, hook callbacks, or render-prop shapes solely to support the React adapter.

If core needs presentation semantics, model intent independently and let React interpret it.

## 9. React API quality gate

Before accepting a public React adapter API, verify:

- it feels idiomatic in JSX/hooks usage;
- consumers do not need to understand internal runtime plumbing;
- Context/provider scope is justified;
- state is not duplicated merely for React;
- identity guarantees are intentional;
- framework-specific types stay in the adapter;
- core semantics are reused rather than reimplemented;
- design-system choices are not baked into a general React adapter without intent.

## 10. Later verification

After architecture/API quality is settled, prefer React Testing Library and observable behavior. Avoid `react-test-renderer` for new tests and avoid mocking internal adapter/core modules merely to simplify arrangement.
