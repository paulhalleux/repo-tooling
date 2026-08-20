---
name: frontend-library-review
description: Perform a production-quality review of a substantial reusable TypeScript/frontend library change with architecture, public API, TypeScript design, extensibility, adapter boundaries, code simplicity, and JSDoc prioritized before test/packaging verification.
---

# Frontend library review

Review as both a library architect and a downstream consumer. Do not behave like a style linter.

## 1. Start from the changed conceptual surface

Identify only relevant lanes:

- architecture/ownership/state/lifecycle;
- public API/modeling/naming/evolution;
- TypeScript inference/generic design;
- extensibility/change locality;
- adapter/core boundaries;
- React API/integration;
- code structure/abstraction/simplicity;
- JSDoc semantic completeness;
- tests/validation;
- packaging/distribution.

Load only sibling skills for lanes materially touched by the diff.

## 2. Review order

Prioritize findings in this order:

1. misplaced responsibility or broken architectural boundary;
2. unnecessary/high-cost abstraction or coordination mechanism;
3. public API/modeling problem or backwards-evolution trap;
4. TypeScript inference/generic architecture degradation;
5. extensibility defect, accidental closure, or excessive registration;
6. state/lifecycle/ownership/error-model inconsistency;
7. framework leakage or duplicated semantics across adapters;
8. concrete runtime correctness/regression issue;
9. missing/misleading JSDoc for public/non-obvious contracts;
10. meaningful test/validation gap or needless internal mocking;
11. package/declaration/distribution issue.

Correctness findings remain important; this ordering exists to ensure architectural debt is not hidden behind a passing test suite.

## 3. Conceptual integrity checks

Flag concrete evidence of:

- a new abstraction without a distinct semantic responsibility;
- service-locator or universal runtime centrality;
- duplicated sources of truth;
- lifecycle APIs without owned resources;
- framework-shaped contracts in agnostic core;
- semantic dependency cycles;
- state synchronization used instead of clear ownership;
- error behavior inconsistent with sibling APIs.

## 4. Consumer integrity checks

Review representative consumer call sites mentally or in existing fixtures:

- common usage complexity;
- naming/vocabulary consistency;
- inferred callback/value types;
- explicit generic burden;
- internal type leakage;
- ownership/disposal expectations;
- backwards-evolution constraints;
- advanced customization remaining progressive.

## 5. Extensibility and change-locality checks

For intended open extension axes, ask whether one new downstream implementation requires central edits across unrelated packages.

Flag universal plugin/registry infrastructure where configuration, callback, composition, or narrow capability would suffice.

Do not report finite closed models as defects when closure is deliberate and appropriate.

## 6. Simplicity challenge

Try to remove conceptual machinery without reducing capability:

- redundant interfaces/layers;
- forwarding services/wrappers;
- factories with no semantic role;
- generic plumbing;
- duplicated types/state;
- global registration that could be local composition;
- premature shared abstractions across independent adapters.

Do not suggest additional abstraction as the default fix for overengineering.

## 7. Documentation and verification

Only after architectural/code review, check:

- public JSDoc describes semantics, ownership, lifecycle, errors, and invariants where relevant;
- tests protect observable contracts rather than private call choreography;
- internal library modules are not mocked without a real boundary reason;
- package/declaration checks are appropriate to the changed surface.

## 8. Output

Return actionable findings ordered by severity and architectural impact. For each finding provide:

- severity;
- file/symbol;
- violated concept/contract;
- concrete maintenance/consumer/failure consequence;
- smallest corrective direction.

If no meaningful issues remain, say so rather than inventing speculative rewrites.
