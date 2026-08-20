---
name: public-api-design
description: Design or review the consumer-facing API of a reusable TypeScript/frontend library. Use for exported functions, builders, definitions, callbacks, configuration, lifecycle methods, naming, errors, compatibility, or APIs expected to evolve.
---

# Public API design

Treat public API design as product design for developers. Internal complexity is acceptable only when it buys a simpler, safer consumer model.

## 1. Start from ideal consumer code

Before optimizing internal types or implementation, write the intended common usage mentally or as a small fixture.

Ask:

- What should autocomplete reveal first?
- What should infer without annotations?
- What should be impossible or difficult to misuse?
- Where should an error appear when usage is invalid?
- Can a consumer understand the model from names and structure?
- Does advanced customization remain available without infecting the simple case?

Prefer progressive complexity:

```text
simple use -> small obvious API
advanced use -> additional optional composition
expert escape hatch -> explicit and isolated
```

Do not make common usage pay for hypothetical flexibility.

## 2. Design around concepts, not implementation machinery

Expose domain/library concepts rather than internal containers, registries, caches, dependency injection details, or adapter plumbing.

Public APIs should describe what the consumer means, not how the runtime happens to implement it.

Avoid leaking internal generic helper types merely because declaration emission can expose them.

## 3. Keep vocabulary consistent

Review related APIs together:

- `create` vs `define` vs `register` vs `add` vs `provide`;
- `Definition` vs `Config` vs `Options`;
- identity and ID conventions;
- callback argument shape;
- context placement;
- optional/default behavior;
- lifecycle verbs;
- sync vs async conventions;
- naming of result/error states.

Do not rename for cosmetic uniformity alone, but avoid every subsystem inventing a different grammar for the same conceptual operation.

Prefer names that reveal the model. Vague names such as `Manager`, `Handler`, `Provider`, `Config`, `Data`, `Item`, `Helper`, or `Utils` deserve scrutiny when a more specific concept exists.

## 4. Keep the simple path small

Prefer:

```ts
const page = definePage({
  id: 'users',
  view: usersView,
});
```

rather than requiring consumers to understand internal runtime types or specify generic parameters for normal usage.

Advanced options may exist, but should compose naturally:

```ts
definePage({
  id: 'users',
  view: usersView,
  actions,
  middleware,
  presentation,
});
```

Avoid option matrices where unrelated features become coupled because one giant configuration object owns everything.

## 5. Make ownership obvious

For public objects and callbacks, clarify:

- who creates/owns the value;
- whether consumers may retain or mutate it;
- whether returned values are stable/live/snapshots;
- whether a callback can be called concurrently or more than once;
- whether consumers must dispose/unsubscribe;
- whether the library retains supplied callbacks/objects.

Prefer API shapes that make ownership natural instead of relying entirely on documentation.

## 6. Make error behavior coherent

For each public operation determine what failure means and how consumers observe it.

Do not mix `undefined`, thrown errors, rejected promises, status objects, and callbacks for equivalent failure categories without reason.

Programmer misuse can reasonably fail differently from domain/environmental failure, but the distinction should be intentional.

## 7. Design for backwards evolution

For APIs expected to grow, ask:

- Can optional capabilities be added without breaking existing consumers?
- Is a closed union intentionally closed?
- Will an enum become a compatibility burden?
- Are positional parameters likely to grow?
- Can callback contexts gain fields compatibly?
- Are public concrete classes unnecessarily exposing constructor/lifecycle internals?
- Are return types exposing implementation details that will be hard to change?

Prefer parameter objects when a public operation is likely to accumulate independent options, but do not mechanically wrap every tiny stable function.

Avoid exporting closed structures solely because they are convenient internally when downstream extension is a stated requirement.

## 8. Preserve change locality

For APIs intended to be extensible, adding a downstream implementation should not require central upstream edits merely to recognize the new concrete type.

For APIs intentionally closed, keep them explicitly finite rather than pretending they are extensible.

A library is easier to evolve when open/closed boundaries are deliberate.

## 9. Prefer semantic escape hatches

If consumers need customization, provide the narrowest escape hatch that preserves the model.

A raw `any`, arbitrary callback over internal state, global service locator, or generic `metadata` bag is not automatically good extensibility.

If an escape hatch bypasses invariants, make that power explicit and isolated.

## 10. Public API gate

Before accepting a public design, verify:

- common usage is concise;
- names map to stable concepts;
- advanced behavior composes rather than replacing the API;
- ownership/lifecycle are understandable;
- failure semantics are coherent;
- framework details do not leak across package boundaries;
- future evolution has a plausible compatible path;
- internal implementation types are not accidentally public;
- downstream extension does not require needless host coordination.

When reviewing an existing change, classify concerns as breaking, risky, ergonomic, modeling, or documentation-only.
