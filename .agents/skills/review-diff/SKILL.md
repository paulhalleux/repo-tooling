---
name: review-diff
description: Review the current implementation/diff for concrete correctness, regression, API, type-safety, lifecycle, and test issues. Use after code changes; do not use as an initial repository architecture survey.
---

# Review diff

Review changed behavior, not the whole repository.

## Scope

Start from the current diff and directly affected definitions/callers/tests. Expand only when a changed path requires it.

Use the `reviewer` agent for non-trivial changes. Keep the assignment focused on the diff and the stated feature/refactor intent.

## Severity bar

Report only actionable issues with a concrete failure mode or contract violation.

Prioritize:
1. correctness and invariant violations;
2. regressions and edge cases;
3. public API/type compatibility;
4. lifecycle, concurrency, ownership, and cleanup;
5. missing tests for changed behavior;
6. local maintainability hazards that create real future risk.

Ignore formatting/style handled by automation and unrelated legacy issues.

## Validation follow-up

If a finding can be resolved by running a specific test/check rather than more reasoning, use `tester` or run the targeted command directly.

Use `architect` only if a finding exposes an unresolved cross-cutting design or public compatibility decision.

## Output

Return findings ordered by severity with file/symbol references. If no meaningful issues remain, say so clearly and mention only genuine residual validation gaps.
