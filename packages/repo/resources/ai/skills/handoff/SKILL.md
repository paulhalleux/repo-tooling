---
name: handoff
description: Compress an active coding session into a concise, repository-grounded continuation brief for a fresh agent/session. Use when a thread is becoming context-heavy, work must continue elsewhere, or the user asks to preserve current progress and decisions without carrying the full conversation.
---

# Session handoff

Create a continuation artifact that lets a fresh agent resume useful work with minimal rediscovery.

A handoff is **not** a transcript summary and must not expose private chain-of-thought. Capture decisions, observable evidence, repository state, and next actions only.

## Core rules

- Describe the latest accepted state, not the chronology of the conversation.
- Ground claims in the current workspace when repository access is available.
- Distinguish completed work, settled decisions, unresolved issues, and hypotheses.
- Preserve architectural invariants and public API/type constraints that must not regress.
- Reference exact files/packages/symbols when useful; do not paste large code blocks.
- Do not copy test/build logs. Summarize relevant failures and point to saved logs/files if they matter.
- Do not invent progress based on discussion alone. If implementation status matters, inspect the workspace/diff.
- Keep rejected approaches only when their rejection prevents likely repeated work.
- Never include generic motivational/persona prompt text.
- Do not prescribe a particular model or subagent topology unless explicitly requested.

## Gather the minimum reliable state

When repository access is available, inspect only what is needed to establish current state, typically:

- applicable `AGENTS.md` guidance;
- `git status --short` and a focused diff/stat when changes are present;
- files/symbols actually changed or central to the next step;
- relevant task/architecture docs already created in the repository.

Do not perform broad rediscovery merely to produce a handoff.

## Recommended output

```markdown
# Handoff

## Goal
The overall outcome still being pursued.

## Current state
What is implemented or decided now. Mention important files/symbols and distinguish working-tree changes from committed/base behavior when relevant.

## Settled architecture
Only decisions the next agent should preserve:
- semantic ownership;
- dependency/package direction;
- state/lifecycle model;
- extensibility mechanism;
- adapter boundaries.

## Public API / TypeScript contract
Relevant API shape, compatibility requirements, inference relationships, naming, ownership/error semantics, or declaration constraints.

## Work completed
Concrete changes already made. Keep this concise and repository-grounded.

## Remaining work
The next coherent steps, ordered by dependency rather than by historical discussion.

## Unresolved questions / risks
Only genuine open issues. Mark hypotheses as hypotheses.

## Rejected approaches
Only approaches worth remembering, each with a short material reason.

## Validation state
Only checks already performed and meaningful known failures. Do not turn this into the main section.

## Resume instructions
The smallest useful first actions for a fresh agent, including files/symbols to inspect and which decisions should not be reopened without contradictory evidence.
```

Omit empty sections rather than filling them with boilerplate.

## Architectural handoff quality

For non-trivial library work, make sure the handoff answers where applicable:

- What concept owns the behavior?
- What remains framework-agnostic?
- Which package depends on which?
- Who owns mutable state?
- Is lifecycle real and who owns disposal?
- Which extension mechanism was selected and why is that power level necessary?
- Which generic/type relationships must remain inferable?
- Which public API choices are already settled?
- Which simplifications were deliberately made?

## Fresh-session safety

A fresh agent must treat the handoff as a high-quality snapshot, not infallible truth.

If repository state has changed since the handoff, current source and current repository instructions win. Revalidate assumptions that are cheap to check before making destructive or architectural changes.

## Token discipline

Aim for the smallest brief that prevents expensive rediscovery.

Prefer:

```text
packages/core owns action semantics; packages/react only adapts invocation/rendering.
```

over several paragraphs describing how that conclusion was reached.

A good handoff preserves **state and decisions**, not reasoning narration.
