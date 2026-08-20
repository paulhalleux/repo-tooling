---
name: debug-failure
description: Diagnose and fix a reproducible bug, failing test, build/typecheck error, or runtime regression using evidence-driven narrowing and the cheapest capable agents. Use when the primary task is debugging rather than feature design.
---

# Debug failure

Debug by reducing uncertainty, not by generating many hypotheses at once.

## 1. Reproduce

Run the narrowest command or scenario that reproduces the failure. Capture the minimal error signature and affected test/path.

If reproduction output is noisy or many failures need classification, use `tester`.

## 2. Localize

Trace from the failure to the relevant implementation using targeted search. Use `explorer` only when the execution path, ownership, or callers are unclear.

Avoid reading broad unrelated areas.

## 3. Form and test one leading hypothesis

Prefer the explanation that fits both the failure and existing invariants. Inspect or instrument only what discriminates between plausible causes.

Do not rewrite architecture as the first debugging move.

## 4. Fix minimally

Once the root cause is supported by evidence, implement the smallest coherent fix. Use `worker` when the fix is bounded but implementation can be isolated from the main context.

Add a regression test that fails for the root cause when practical.

## 5. Validate

Re-run the reproducer first, then the nearest relevant suite/typecheck/build. Broaden only according to regression risk.

## 6. Escalate rarely

Use `architect` only if the bug demonstrates a systemic contract, lifecycle, concurrency, or package-boundary flaw that cannot be fixed locally without creating another inconsistency.

Finish with root cause, fix, regression coverage, and validation—not a debugging diary.
