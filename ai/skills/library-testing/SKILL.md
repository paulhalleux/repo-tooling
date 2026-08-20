---
name: library-testing
description: Design, write, or review tests for TypeScript/React libraries with emphasis on observable contracts, realistic integration, regression value, type-level behavior, and minimal mocking. Use when adding tests, deciding what to mock, or auditing weak/brittle test suites.
---

# Library testing

Tests should protect consumer-observable contracts and important internal invariants, not mirror implementation structure.

## Choose the smallest meaningful boundary

Prefer this order when it remains fast and deterministic:

1. real pure/core implementation;
2. real collaboration between library modules;
3. adapter integration against the real core;
4. framework-level component/hook test;
5. fake only at an actual external/environmental boundary.

Do not split a coherent behavior into heavily mocked unit tests merely to maximize isolation.

## Mocking policy

Do not mock something just because mocking is possible.

Avoid mocking:

- the library's own internal modules;
- pure utilities;
- deterministic in-memory services that are cheap to construct;
- a collaborator only to assert every method call;
- React internals;
- types/interfaces that have a small real implementation suitable for the test.

Use a fake/stub/mock when the real boundary is slow, non-deterministic, destructive, network/process/browser dependent, or otherwise unsuitable for the test.

Prefer a small purpose-built fake implementing the public boundary contract over a large dynamic mock object.

Spies are appropriate when the interaction itself is part of the contract (for example, notification exactly once or cleanup invocation), not as a default assertion style.

## Test behavior, not wiring

Good assertions answer questions such as:

- What value/result does the consumer observe?
- What state transition occurs?
- What contribution/action is available?
- What happens on absence, failure, cancellation, or disposal?
- What UI can the user observe/interact with?
- What TypeScript usage compiles or intentionally fails?

Avoid tests that fail merely because a private helper was renamed or an equivalent implementation calls collaborators differently.

## React tests

Prefer Testing Library and user/component-facing queries. Avoid `react-test-renderer` for new coverage.

Do not assert implementation hooks/state when the behavior can be observed through rendered output, events, accessibility semantics, or public callbacks.

For public hooks, direct hook tests are reasonable; treat returned values/effects as the public contract.

## High-value library coverage

Depending on the change, consider:

- core behavior tests;
- regression tests for discovered bugs;
- extension ordering/conflict/lifecycle tests;
- adapter integration tests;
- consumer-style type inference tests;
- package/export smoke tests;
- SSR/hydration tests for React integrations when supported;
- cleanup/disposal/cancellation tests.

## Low-value tests

Usually avoid:

- snapshots of large component trees or object graphs;
- tests of trivial getters/setters with no behavior;
- duplicating compiler/linter guarantees;
- exhaustive tests for implementation branches that have no distinct contract;
- brittle exact call-count/order assertions unless ordering is specified behavior.

## Workflow

For a bug, demonstrate the regression when practical before fixing it.

Run the narrowest relevant test first, then expand according to affected contracts. Coverage percentage is a signal, not the goal.
