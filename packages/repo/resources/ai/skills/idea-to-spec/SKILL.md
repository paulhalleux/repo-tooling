---
name: idea-to-spec
description: Interactively turn a high-level product, application, platform, or reusable library idea into a complete, implementation-ready specification through focused question rounds. Use when the user has an idea but requirements, scope, product model, public API, architecture, extensibility, or constraints are still unclear. Do not jump directly to implementation.
---

# Idea to specification

Turn an incomplete idea into a coherent specification by interviewing the user, resolving ambiguity, challenging assumptions, and progressively recording decisions.

This is a **discovery skill**, not an implementation skill and not a one-shot prompt generator.

The objective is to reach a specification that a fresh engineering agent can understand without relying on the discovery conversation.

## Core behavior

- Ask questions interactively rather than presenting a giant questionnaire.
- Ask only questions whose answers can materially change the product, API, architecture, scope, or priorities.
- Prefer **3–6 high-value questions per round**. Use fewer when one decision blocks the rest.
- Group closely related questions so the user can answer naturally.
- Do not ask the user for facts that can be cheaply established from an available repository or supplied context.
- When the user is unsure, offer 2–4 concrete options with tradeoffs and give a recommended default.
- Challenge contradictions, accidental complexity, and requirements that conflict with stated goals.
- Distinguish **requirements**, **decisions**, **assumptions**, **preferences**, **open questions**, and **deferred concerns**.
- Keep a compact internal decision ledger and periodically summarize the current model so misunderstandings are corrected early.
- Do not force every category to contain a decision. Explicitly mark irrelevant or intentionally deferred concerns.
- Do not introduce implementation architecture before product/domain constraints justify it.
- Do not write code unless the user explicitly leaves discovery and asks for implementation.
- Avoid generic product-management ceremony, personas, market-analysis boilerplate, or enterprise requirements unless relevant to the idea.

## 1. Classify the idea

Infer whether the primary artifact is:

- reusable library/framework;
- application/product;
- developer tool;
- platform/runtime;
- plugin/extension ecosystem;
- hybrid product + reusable library.

Do not force the user to choose a category if it is already evident.

Use the classification only to prioritize questions. The specification structure may combine relevant sections.

## 2. Start from the idea, not from a template

First establish the smallest useful product frame:

- what is being built;
- what problem/opportunity motivates it;
- who directly uses it;
- what the user should be able to accomplish;
- what would make the result meaningfully better than the current alternative;
- any hard constraints already known.

If the idea is sufficiently concrete from the user's initial description, skip answered questions.

Do not ask about implementation details such as storage, routers, state libraries, package managers, or frameworks until those choices can affect a real requirement.

## 3. Interview in adaptive rounds

Use the following domains as a **coverage map**, not a fixed questionnaire.

### A. Purpose and success

Clarify when relevant:

- core problem and motivation;
- target users/consumers;
- primary jobs/use cases;
- desired outcomes;
- what success means;
- explicit anti-goals.

For internal/developer libraries, success may mean developer ergonomics, reuse, extensibility, type safety, framework independence, or reduced integration cost rather than business metrics.

### B. Scope and product model

Clarify:

- essential capabilities;
- optional/later capabilities;
- boundaries with adjacent systems;
- domain concepts and terminology;
- relationships between concepts;
- workflows/state transitions where relevant;
- what belongs to the product/library vs consumer code.

Prefer identifying a small semantic model over enumerating screens/files/classes.

### C. Consumer/developer experience

For applications, clarify relevant interaction and information architecture concerns.

For libraries/platforms, clarify:

- ideal common-case usage;
- public API style;
- configuration vs imperative APIs;
- inference expectations;
- discoverability;
- progressive complexity;
- escape hatches;
- extension author experience;
- host/application integration experience.

When useful, ask the user to choose between short pseudo-API sketches rather than discussing abstractions only in prose.

### D. Extensibility and openness

For extensible systems, clarify intended extension axes separately:

- what downstream packages/users may add or replace;
- whether contributions are static or runtime-loaded;
- discovery mechanism;
- ordering/conflict semantics;
- lifecycle requirements;
- capability/service boundaries;
- whether extension packages must work without central host edits;
- what is intentionally closed.

Do not assume a plugin system is required merely because customization is desired.

Prefer the least powerful extension mechanism that satisfies the actual requirement.

### E. Architecture constraints

Only after the semantic/product model is sufficiently clear, resolve architecture-level constraints such as:

- framework/library neutrality;
- package/module boundaries;
- dependency direction;
- state ownership;
- lifecycle and resource ownership;
- sync vs async semantics;
- environment/runtime targets;
- persistence/network boundaries;
- adapter responsibilities;
- compatibility expectations.

For reusable frontend libraries, explicitly consider whether the semantic core can remain usable without React, routers, query libraries, design systems, or browser-only APIs.

Use `../architecture-design/SKILL.md`, `../public-api-design/SKILL.md`, `../typescript-api-design/SKILL.md`, or `../extensibility-design/SKILL.md` selectively when a design question needs deeper treatment. Do not load all of them by default.

### F. Quality attributes

Clarify only attributes that can influence design:

- simplicity/maintainability;
- type safety;
- performance scale;
- bundle constraints;
- backwards compatibility;
- SSR/server compatibility;
- accessibility;
- offline behavior;
- security boundaries;
- observability/debuggability;
- extensibility stability.

Avoid generic "must be scalable, secure, maintainable" statements. Convert them into concrete implications or omit them.

### G. Delivery and evolution

Near the end, clarify where relevant:

- MVP vs later scope;
- migration/compatibility constraints;
- expected evolution axes;
- release/distribution model;
- examples/docs/devtools requirements;
- decisions intentionally deferred.

Testing strategy is not a discovery priority unless it changes architecture or the user explicitly wants it specified.

## 4. Question selection strategy

Before each round, rank missing information by expected design impact.

Prefer asking about a decision that changes several downstream choices over several low-impact details.

Typical priority:

```text
purpose / consumer
-> scope / semantic model
-> public experience
-> ownership / extensibility
-> architecture constraints
-> quality attributes
-> delivery details
```

Do not ask questions merely to fill sections.

### Good question

```text
Should third-party packages be able to add new view types without the host application registering those concrete types?

A. Yes — downstream packages should be self-contained. This implies a contribution/discovery contract.
B. No — the host explicitly owns available view types. Simpler and more closed.
C. Only statically at application composition time — my recommended default if runtime loading is not required.
```

### Weak question

```text
What design patterns should the architecture use?
```

Ask about semantics and constraints, then derive patterns.

## 5. Help the user decide

Do not behave like a passive form.

When alternatives exist:

1. state the material tradeoff;
2. recommend an option based on the user's stated goals;
3. allow the user to override it;
4. record the decision and its important consequence.

Example:

```text
For filters, I recommend treating URL persistence as an adapter capability rather than a core requirement. That keeps the core environment-agnostic while allowing router adapters to provide shareable state. Do you want that boundary, or should URL semantics be part of the core page model?
```

Avoid repeatedly asking questions whose answer can reasonably be derived from already accepted principles.

## 6. Maintain a decision ledger

After significant rounds, keep the current state conceptually organized as:

```text
Accepted decisions
- ...

Assumptions
- ...

Open questions
- ...

Deferred / non-goals
- ...
```

Do not dump the full ledger after every response. Surface it when useful for confirmation, when decisions interact, or before finalizing the specification.

If the user changes a decision, update the latest state rather than preserving obsolete alternatives as equal options.

## 7. Detect contradictions

Actively call out tensions such as:

```text
"No central registration" + "host explicitly chooses every extension"
"framework agnostic" + React nodes in core definitions
"runtime-loadable plugins" + fully static compile-time registry
"no breaking changes" + replacement of a stable public contract
"simple common API" + mandatory multi-generic configuration
```

Explain the conflict and ask the smallest decision needed to resolve it.

Do not silently invent a compromise.

## 8. Know when discovery is complete

Discovery is sufficiently complete when:

- the objective and target consumer are clear;
- primary use cases/capabilities are bounded;
- core concepts and responsibilities are understandable;
- common consumer/developer experience is defined at a useful level;
- intended extension axes and deliberate closed boundaries are known where relevant;
- major state/lifecycle/dependency ownership questions are resolved;
- important quality constraints are concrete;
- scope and non-goals prevent obvious drift;
- remaining unknowns can safely be deferred to implementation rather than changing the product model.

Do **not** seek artificial 100% certainty. Stop asking questions when additional answers would mostly be implementation detail.

Before finalizing, explicitly surface any remaining decisions that could still materially change the specification.

## 9. Produce the final specification

When discovery converges, produce a durable specification using only relevant sections.

Recommended structure:

```markdown
# <Product / Library Name or Working Title>

## 1. Summary
Concise description of what it is and why it exists.

## 2. Goals
- ...

## 3. Non-goals
- ...

## 4. Target users / consumers
Who uses it and in what context.

## 5. Primary use cases
Concrete jobs/workflows the product/library must support.

## 6. Product / domain model
Core concepts, responsibilities, terminology, and relationships.

## 7. Functional capabilities
Required capabilities grouped semantically, including MVP/later distinction when relevant.

## 8. Consumer / developer experience
Common workflows and representative public usage/API shapes where relevant.

## 9. Extensibility model
Extension axes, contribution semantics, composition/discovery, lifecycle, ordering/conflicts, and deliberate closed boundaries.

## 10. Architecture principles and boundaries
Core vs adapters, dependency direction, state ownership, lifecycle, environment/runtime constraints, and important invariants.

## 11. Type-system / API requirements
For typed libraries: inference relationships, generic ownership, compatibility, escape hatches, declaration/public-type expectations.

## 12. Framework / adapter model
Responsibilities and boundaries for React/router/query/design-system/other adapters when applicable.

## 13. Quality attributes
Only concrete attributes with architectural impact.

## 14. Evolution / compatibility
Expected extension/evolution axes, migration constraints, stability expectations.

## 15. Delivery scope
MVP, later work, examples/docs/devtools/distribution requirements as applicable.

## 16. Open questions / deferred decisions
Only unresolved items intentionally left for later.

## 17. Decision summary
High-impact accepted decisions that future agents must preserve.
```

Do not include empty or irrelevant sections merely to satisfy the template.

The specification should explain **what and why**, plus architecture-level invariants. Avoid prematurely specifying source-file layouts, class names, implementation algorithms, or dependency choices unless they are already intentional constraints.

## 10. Transition to execution

After the specification is accepted, recommend the smallest appropriate next step:

- use `task-spec exploration` if a major architecture area still needs focused design;
- use `task-spec implementation` to turn the accepted specification into a bounded implementation task;
- use `frontend-library-development` when implementation can begin directly;
- save the specification in repository documentation if the user wants it to become durable project context.

Do not automatically start implementation in the same discovery flow unless the user explicitly asks to proceed.

## Final quality check

Before presenting the final specification, verify:

- Would a fresh engineer understand the product without the conversation?
- Are goals and non-goals both concrete?
- Are requirements separated from proposed implementation?
- Are semantic concepts named consistently?
- Are ownership and boundaries explicit where they matter?
- Does the common user/developer experience remain simple?
- Is extensibility deliberate rather than universal?
- Are contradictions resolved or visibly deferred?
- Are recommendations recorded as accepted decisions only when the user actually accepted them?
- Is every section valuable enough to justify its tokens?
