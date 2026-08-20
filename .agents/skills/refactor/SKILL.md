---
name: refactor
description: Refactor application/library structure with an emphasis on ownership, dependency direction, abstraction reduction, public/type contract preservation, and conceptual simplification. Use when behavior should remain stable while architecture/code quality improves.
---

# Refactor

Refactor to reduce conceptual cost, not to move code into more layers.

## 1. Freeze what must remain stable

Identify applicable invariants:

- public API shape/semantics;
- observable runtime behavior;
- framework/core boundaries;
- extension semantics;
- state/lifecycle ownership;
- TypeScript inference/assignability contracts;
- serialization/storage formats;
- supported integrations.

If the request intentionally changes one, state the exception.

## 2. Identify the architectural smell

Name the actual problem before choosing a structural change:

- misplaced responsibility;
- dependency cycle/wrong direction;
- excessive centrality;
- duplicated state;
- unnecessary registration/provider/service layer;
- poor public model;
- generic infection/type complexity;
- shotgun surgery/change locality;
- semantic duplication;
- vague abstraction/naming;
- framework leakage.

Do not refactor merely because a file is large or code could be made more abstract.

## 3. Map only affected concepts

Use targeted search or `explorer` for definitions, callers, exports, package boundaries, and directly related behavior.

Avoid broad repository audits unless the smell is genuinely cross-cutting.

## 4. Choose the smallest structural correction

Prefer, in order:

- move responsibility to the correct existing owner;
- delete a layer/duplicate state/type;
- collapse unnecessary indirection;
- replace registration with local composition;
- replace class/service with function/value where ownership permits;
- narrow an abstraction;
- introduce a new abstraction only when a genuinely new concept remains.

Use `architect` only when package/public/extensibility/state/lifecycle boundaries materially change.

## 5. Implement in coherent slices

Prefer one writer for overlapping code. Preserve understandable intermediate states for larger refactors.

Do not mix unrelated cleanup into the same refactor.

## 6. Run a simplicity challenge

Apply `simplicity-review` before broad validation:

- Did the refactor actually reduce concept/coordination cost?
- Did it replace one abstraction problem with another?
- Did generic/type machinery become simpler?
- Is change locality better?
- Did naming improve the model?
- Can any compatibility wrapper or transitional layer be removed now?

## 7. Validate preserved contracts

After structural quality is settled, run focused checks and relevant regression tests.

Use validation to prove preserved behavior, not to justify a more complicated design.

## 8. Finish

Explain the structural simplification achieved, contracts preserved, and validation performed. Do not describe unrelated opportunities.
