---
name: jsdoc-contracts
description: Write or review complete JSDoc/TSDoc for public TypeScript library APIs and implementation surfaces with non-obvious contracts. Use when adding/changing exported symbols, lifecycle-sensitive APIs, generics, errors, ownership, or when documentation completeness is requested.
---

# JSDoc contracts

Documentation should explain the contract that types alone cannot fully express.

## Public API requirement

Every public/exported API introduced or materially changed should have useful documentation appropriate to its kind, including exported:

- functions and methods;
- classes and constructors;
- interfaces/type aliases when they represent consumer concepts;
- properties/options whose semantics are not obvious from the name;
- hooks/components/providers;
- constants and factories;
- extension/capability contracts.

Do not add verbose comments to trivial internal implementation lines.

## Document the full contract

As applicable, cover:

- purpose and intended usage;
- type parameters and the relationship they represent;
- parameters, especially ownership/default/nullability semantics;
- return value and whether it is owned, cached, mutable, or a snapshot;
- thrown errors or rejected failure conditions consumers are expected to handle;
- lifecycle: initialization, subscription, cleanup, disposal, reuse;
- ordering/reentrancy/concurrency semantics when relevant;
- side effects and externally observable mutations;
- important invariants/preconditions;
- compatibility or environment requirements when surprising.

Use the repository's preferred JSDoc/TSDoc tags consistently (`@typeParam`, `@param`, `@returns`, `@throws`, `@example`, etc.).

## Explain semantics, not syntax

Bad documentation merely repeats the declaration:

```text
@param id The id.
@returns The result.
```

Prefer explaining what makes the identifier valid, what lookup semantics apply, what absence means, and whether the returned value is stable/owned when those details matter.

Do not restate obvious TypeScript types in prose.

## Generics

Document type parameters when their role is not self-evident. Explain relationships such as "resource entity type", "resolved runtime type", "context supplied to actions", or "adapter-specific renderer payload" rather than saying "the T type".

## Lifecycle and ownership

Be especially explicit for libraries around:

- subscriptions/listeners;
- disposable resources;
- mutable registries/stores;
- async initialization;
- middleware chains;
- cached values;
- references passed between core and adapters.

State who owns cleanup and whether callers may retain/mutate returned objects.

## Examples

Add examples when they materially clarify inference, composition, lifecycle, or non-obvious usage. Do not add an example to every symbol mechanically.

Examples must compile conceptually against the current public API and should use consumer-facing imports.

## Relevant implementation surfaces

Document internal functions/classes when they encode important invariants, ownership, algorithms, or extension/lifecycle mechanics that a future maintainer could easily violate.

Avoid comments that narrate straightforward code.

## Review

Before finishing, verify documentation remains true for runtime behavior and that renamed/changed APIs did not leave stale descriptions or examples.
