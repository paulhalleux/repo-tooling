---
name: implement-feature
description: Implement a non-trivial application or library feature with architecture/API quality established before bounded implementation and later validation. Use when a feature spans multiple files or requires understanding existing contracts; do not use for tiny local edits.
---

# Implement feature

Deliver a complete feature without letting implementation convenience decide the architecture.

## 1. Establish the outcome

Extract only:

- requested behavior;
- explicit constraints/non-goals;
- compatibility expectations;
- likely ownership/package scope;
- relevant public API implications.

Do not start with a long validation plan.

## 2. Resolve only necessary uncertainty

Search directly first. Use `explorer` only for non-trivial discovery such as package ownership, dependency/call paths, existing extension seams, or public callers.

If several questions are independent, explorers may run in parallel with distinct questions. Do not ask agents to rediscover the same context.

## 3. Settle architecture before implementation when needed

For substantive library changes, apply the relevant concerns from:

- `architecture-design`;
- `public-api-design`;
- `typescript-api-design`;
- `extensibility-design`;
- `adapter-boundaries` / `react-adapter`.

Use `architect` only when there is a real expensive-to-reverse decision.

Freeze a compact implementation contract:

- semantic owner;
- dependency/core-adapter boundary;
- public API shape;
- type relationships;
- state/lifecycle/error semantics if relevant;
- extension mechanism if relevant;
- invariants;
- non-goals.

Workers should not relitigate this contract unless concrete implementation evidence contradicts it.

## 4. Implement coherently

Prefer one writer for overlapping code.

Use `worker` when the assignment is sufficiently bounded and delegating isolates implementation noise. Provide exact writable scope, settled decisions/invariants, non-goals, and expected outcome.

During implementation prioritize:

- correct ownership;
- precise naming/modeling;
- simple data/control flow;
- minimal abstraction count;
- strong inference without generic infection;
- framework isolation;
- complete public JSDoc after semantics stabilize.

## 5. Simplify before proving

Before broad tests, inspect the resulting design with `simplicity-review` when the change is non-trivial.

Try to remove unnecessary layers, registration, wrappers, duplicated state, generic plumbing, or speculative extensibility while preserving the settled contract.

Do not run a rewrite merely because another architecture is imaginable.

## 6. Validate proportionally

Only after the implementation shape is accepted, run the narrowest relevant checks.

Use `tester` when logs/triage would pollute the main context.

Add or update tests when they protect changed behavior or prevent a meaningful regression; do not generate tests simply to increase coverage.

## 7. Review

For substantial library changes, prefer an architecture/API/code-quality review before focusing on validation gaps.

Escalate back to `architect` only when review reveals a concrete contradiction in the settled model.

## 8. Finish

Return:

- what changed semantically;
- important architecture/API/type decisions;
- simplifications made;
- validation performed;
- genuine unresolved risks only.
