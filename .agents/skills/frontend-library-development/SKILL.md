---
name: frontend-library-development
description: Coordinate non-trivial reusable TypeScript/frontend library work with architecture and code quality first. Use as the entry point for features/refactors spanning core semantics, public API, extensibility, TypeScript design, adapters, React, documentation, or later validation.
---

# Frontend library development

Optimize in this order unless the task clearly makes a phase irrelevant:

```text
architecture
-> public API / developer experience
-> TypeScript model
-> extensibility and adapter boundaries
-> implementation
-> code structure / simplicity
-> JSDoc contracts
-> tests / validation / distribution
```

Testing verifies the design; it does not define it.

`idea-to-spec`, `task-spec`, and `handoff` are companion workflow utilities, not phases of every library task:

- use `idea-to-spec` before this dispatcher when a high-level product/library idea still needs interactive discovery;
- use `task-spec` before this dispatcher when a fresh session needs a compact exploration/implementation contract;
- use `handoff` when the active session must be compressed or continued elsewhere;
- do not load these automatically for routine feature execution.

## 1. Classify only the concerns actually touched

Load companion skills selectively:

- architecture, ownership, package boundaries, state, lifecycle, errors -> `../architecture-design/SKILL.md`;
- exported API shape, naming, evolution, consumer DX -> `../public-api-design/SKILL.md`;
- generics, inference, assignability, declaration shape -> `../typescript-api-design/SKILL.md`;
- customization, contributions, middleware, registries, plugins -> `../extensibility-design/SKILL.md`;
- core/framework boundary or ecosystem integration -> `../adapter-boundaries/SKILL.md`;
- React hooks/providers/components/subscriptions/API -> `../react-adapter/SKILL.md`;
- deletion-oriented cleanup after implementation -> `../simplicity-review/SKILL.md`;
- public semantic documentation -> `../jsdoc-contracts/SKILL.md`;
- behavior/type tests and mocking decisions -> `../library-testing/SKILL.md`;
- exports/peer deps/package artifact -> `../package-distribution/SKILL.md`;
- final broad audit -> `../frontend-library-review/SKILL.md`.

Do not load the entire pack by default.

## 2. Establish a compact design contract

For non-trivial work, resolve only applicable items:

- semantic owner of the new behavior;
- core vs adapter responsibility;
- state owner and mutation model;
- lifecycle/ownership if real resources exist;
- public API shape and common consumer usage;
- TypeScript inference relationships;
- extension mechanism and whether it truly needs runtime registration;
- dependency direction/package impact;
- compatibility requirements;
- explicit non-goals.

If these are obvious from the request and repository, do not manufacture ceremony.

## 3. Use architecture gates before substantial implementation

### Conceptual integrity

- New abstractions represent real concepts.
- Responsibilities live with their semantic owner.
- Dependencies point toward stable core semantics.
- State has one authoritative owner.
- Lifecycle and error behavior are deliberate.
- Framework details remain in framework adapters.

### Consumer integrity

- Common public usage is simpler than internal implementation.
- Important values/types infer naturally.
- Advanced features are progressive rather than mandatory complexity.
- Intended extension axes do not require needless host edits.
- Internal machinery does not leak into public contracts.

If either gate fails, improve the design before scaling implementation.

## 4. Implement the settled model

Prefer one cohesive writer when code overlaps.

Workers should receive settled architecture/API decisions and must not independently redesign them unless implementation exposes a concrete contradiction.

During implementation:

- keep responsibilities cohesive;
- prefer precise names;
- avoid generic propagation unrelated to semantic ownership;
- avoid duplicated state;
- avoid framework-shaped core contracts;
- avoid new registries/services/providers unless justified by the design contract;
- preserve repository conventions where they do not conflict with stronger architectural invariants.

## 5. Run the simplicity challenge

For non-trivial changes, use `simplicity-review` or apply its core questions before validation:

- Can a concept/layer disappear?
- Can composition replace registration?
- Can a class/service become a function/value?
- Can generic plumbing stop earlier?
- Did similar code get abstracted despite representing independent concepts?
- Would adding the next adjacent implementation require shotgun surgery?

Do not optimize for fewer lines; optimize for fewer unnecessary concepts and clearer ownership.

## 6. Complete semantic documentation

For changed public APIs and important non-obvious implementation contracts, apply `jsdoc-contracts` after the model stabilizes so documentation describes final semantics rather than an intermediate design.

## 7. Verify proportionally

Only after architecture/code quality is settled, use relevant testing/package skills.

Prefer meaningful consumer/behavior verification over test volume or internal mocking.

## 8. Finish

Summarize:

- semantic/architectural change;
- important public API/type decisions;
- simplifications made or consciously rejected;
- validation performed;
- genuine unresolved risks only.
