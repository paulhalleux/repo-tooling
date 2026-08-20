---
name: architecture-design
description: Design or reshape the architecture of a reusable TypeScript/frontend library before implementation. Use when ownership, package boundaries, state, lifecycle, error semantics, framework neutrality, or cross-cutting responsibilities are materially affected.
---

# Architecture design

Design the smallest durable model before writing substantial implementation code.

The goal is not maximum abstraction. The goal is clear ownership, one-way dependencies, coherent semantics, and low future coordination cost.

## 1. Define the architectural problem

Establish only what matters for the current change:

- capability/behavior being added or changed;
- existing concepts that already own related behavior;
- public contracts that must remain stable;
- packages/modules that may be affected;
- explicit non-goals;
- framework/library dependencies that must remain isolated;
- expected future variation that is concrete enough to influence the design now.

Do not redesign unrelated parts of the repository.

## 2. Find the semantic owner

For every new responsibility, ask:

- What concept naturally owns this behavior?
- Is it definition/configuration, runtime state, orchestration, adaptation, or presentation?
- Does an existing concept already own most of it?
- Is the behavior framework-neutral or framework-specific?
- Does this responsibility need to be globally available, locally composed, or owned by one instance?

Prefer moving behavior to the correct existing owner over creating a new manager/provider/registry/service.

A new abstraction must represent a distinct concept, not merely provide another place to put code.

## 3. Protect dependency direction

For reusable frontend libraries, default to:

```text
consumer/application
       |
framework + ecosystem adapters
       |
framework-agnostic semantic core
```

Core should not know about React, routers, query libraries, design systems, DOM APIs, or adapter convenience concepts unless that dependency is explicitly the purpose of the package.

Check conceptual leakage as well as imports. A core interface like `render(): unknown` can still encode renderer-driven architecture even without a React type import.

Identify semantic cycles, not only import cycles. If `Runtime` knows `Registry`, `Registry` knows `Resource`, and `Resource` must know `Runtime`, reconsider ownership.

Watch for excessive centrality. If every feature requires `Runtime`, `Application`, `Context`, `Manager`, or a shared service locator, inspect whether that abstraction has become a coordination bottleneck.

## 4. Design state ownership explicitly

For each stateful value determine:

- who owns the authoritative value;
- who may mutate it;
- who observes it;
- whether it is durable, URL-backed, server-owned, cached, derived, or transient UI state;
- whether adapters observe it or duplicate it;
- whether callers receive a snapshot, a live object, or a borrowed mutable object.

Prefer one authoritative owner. Adapt existing state instead of synchronizing copies across core, React, router, and cache layers.

Avoid state whose only purpose is keeping another state representation synchronized.

## 5. Introduce lifecycle only when real ownership requires it

When a concept truly owns resources or temporal behavior, define applicable semantics:

- construction;
- registration/configuration;
- initialization;
- ready/available state;
- mutation after initialization;
- failure and partial initialization;
- shutdown/disposal;
- idempotence;
- reinitialization/restart;
- callbacks after disposal.

Do not add `initialize/start/stop/dispose` mechanically to abstractions that own no resource or subscription.

Lifecycle should belong to the abstraction that owns the resource, not be accidentally delegated to React mounting when the concept exists independently of React.

## 6. Model errors as part of architecture

Classify relevant failures before choosing a mechanism:

- programmer misuse/invariant violation;
- domain failure;
- missing/unsupported capability;
- invalid lifecycle state;
- environmental failure;
- cancellation;
- extension/plugin failure.

Then decide deliberately whether the public contract uses throwing/rejection, `Result`, absence, status, callbacks/events, or another repository convention.

Do not let sibling APIs expose equivalent failures inconsistently without a reason.

## 7. Model ownership and mutability

For values crossing boundaries, clarify:

- who created and owns the value;
- whether the receiver may retain it;
- whether the receiver may mutate it;
- whether it is immutable definition data or mutable runtime state;
- who owns cleanup/disposal.

Prefer immutable definition/configuration objects where practical and keep mutation behind explicit runtime state owners.

Do not make everything readonly mechanically; use immutability to communicate ownership.

## 8. Minimize architectural power

Before adding a new concept, try in this order:

1. existing abstraction;
2. plain value/data;
3. plain function;
4. local composition;
5. narrow interface/capability;
6. state-owning object;
7. registry/plugin/runtime mechanism only when discovery or dynamic contribution actually requires it.

The most powerful mechanism is rarely the cheapest long-term architecture.

## 9. Check change locality

Ask how many independent concepts/packages must change to add one new member of the intended extension family.

If adding a new view/action/presentation/capability requires editing central unions, switches, registries, host bootstrap, React adapters, and router adapters, determine whether the design is accidentally closed.

Conversely, do not force open extensibility where a deliberately closed finite model is simpler and safer.

## 10. Architecture gate

Before substantial implementation, the design should pass:

### Conceptual integrity

- Every new abstraction represents a meaningful concept.
- Responsibilities sit with the correct owner.
- Dependencies point inward toward stable semantics.
- State has one authoritative owner.
- Lifecycle exists only where required and has clear ownership.
- Error behavior is coherent.
- Extensibility is deliberate rather than speculative.

### Consumer integrity

- Public API can remain simpler than the implementation.
- Framework-specific complexity stays in adapters.
- Intended downstream extensions can participate without unnecessary host edits.
- The design can evolve without exposing internal machinery.

## 11. Architecture challenge

Before freezing a non-trivial design, try to invalidate it:

- Could this be a function instead of a service/class?
- Could this be data instead of runtime machinery?
- Could this be composition instead of registration?
- Does this interface have more than one meaningful implementation?
- Is this abstraction hiding real variation or only reorganizing code?
- Is runtime mutability actually required?
- Is the host being asked to know something a downstream package should own?
- Can one concept be deleted without losing capability?

Do not propose a more elaborate replacement merely because another design is conceivable.

## 12. Output for a design decision

When a design decision is required, keep the result compact:

1. decision;
2. ownership and dependency rules;
3. state/lifecycle/error semantics if relevant;
4. public API implications;
5. rejected alternatives with concrete tradeoffs;
6. implementation invariants;
7. unresolved risks only when real.
