---
name: task-spec
description: Convert an informal development request and relevant repository context into a concise, self-contained task specification for a fresh coding-agent session or bounded delegation. Use when preparing a new thread, formalizing a substantial task, or compressing requirements before implementation. Supports exploration and implementation modes.
---

# Task specification

Produce an engineering contract, not a generic prompt-engineering artifact.

The purpose is to reduce rediscovery and ambiguity while keeping the next agent free to reason where decisions are not yet settled.

## Core rules

- Prefer repository-specific facts and constraints over generic advice.
- Keep only context that can materially change the next agent's decisions.
- Never invent repository facts, architectural decisions, APIs, or file paths. Mark genuinely unknown facts as unresolved.
- Do not add persona boilerplate such as "world-class senior engineer", generic SOLID/DRY/KISS lists, or instructions to "think deeply".
- Do not prescribe models, subagent counts, or orchestration mechanics unless the user explicitly asks for them.
- Do not copy large source excerpts, logs, or conversation history. Reference files/symbols and summarize the relevant fact.
- Separate requirements from assumptions and settled decisions from open questions.
- Preserve explicit non-goals and compatibility constraints; they prevent opportunistic redesign.
- Include testing/validation instructions only when they are part of the requested task or materially define completion. Architecture/code quality should not be replaced by a validation checklist.

## Choose a mode

Infer the mode from the request, or honor an explicit mode.

### Exploration mode

Use when the architecture or target solution is intentionally unresolved.

Do **not** smuggle a preferred implementation into the task specification. Capture the problem, constraints, qualities to optimize, and questions the next agent must resolve.

Recommended structure:

```markdown
# Task

## Objective
What problem must be understood or designed, and why it matters.

## Current state
Only repository facts relevant to the problem.

## Problems / observed shortcomings
Concrete symptoms or architectural concerns that motivate the work.

## Constraints
Invariants, package boundaries, compatibility requirements, framework rules, or other hard constraints.

## Desired qualities
For example: simpler ownership, framework-neutral core, strong inference, local extensibility, backwards evolvability.

## Scope
Known packages/modules/concepts that are in scope. Avoid speculative file lists.

## Non-goals
Things that should not be redesigned as collateral work.

## Questions to resolve
Material architectural/API/type questions that remain intentionally open.

## Expected outcome
What artifact or decision should exist when exploration is complete.
```

### Implementation mode

Use when important architecture/API decisions are already settled and the next agent should implement rather than re-litigate them.

Recommended structure:

```markdown
# Task

## Objective
The concrete outcome and why it is needed.

## Current state
Only facts necessary to understand the change.

## Required behavior
Observable or semantic requirements.

## Settled design decisions
Only decisions that are actually settled. Explain concise rationale only when it prevents accidental reversal.

## Architectural invariants
Responsibilities, dependency direction, state ownership, extensibility boundaries, lifecycle semantics, etc.

## Public API / type expectations
Compatibility, consumer ergonomics, inference, naming, or declaration constraints when relevant.

## Scope
Likely packages/modules and explicit writable scope if known.

## Non-goals
Adjacent improvements the implementation must not absorb.

## Quality bar
Task-specific architecture/code-quality requirements, not generic slogans.

## Completion criteria
A short list of conditions that prove the requested implementation is complete.

## Unresolved items
Only genuine blockers/unknowns the next agent still has to resolve.
```

## Compression heuristics

Prefer facts like:

```text
Core must remain usable without React.
Action entity/context relationships currently infer from the resource definition.
Downstream modules must contribute actions without host source changes.
```

over prose like:

```text
Please follow clean architecture, SOLID, DRY, KISS, YAGNI and write beautiful maintainable code.
```

When a conversation contains several iterations, preserve the **latest accepted state**, not every historical proposal.

Record a rejected approach only if a future agent is likely to repeat it and the reason for rejection materially affects the task.

## Repository grounding

When repository access is available and the task benefits from it:

1. Read the applicable `AGENTS.md` instructions.
2. Inspect only the minimal files/symbols needed to replace vague assumptions with facts.
3. Prefer exact package/module/symbol references over copied code.
4. Do not turn task-spec generation into a broad architecture review unless requested.

## Final quality check

Before returning the specification, verify:

- Can a fresh agent understand the goal without this conversation?
- Are all hard constraints explicit?
- Are settled decisions distinguishable from open questions?
- Is implementation detail omitted when exploration is the goal?
- Are non-goals strong enough to prevent scope drift?
- Is every included section useful enough to justify its tokens?
