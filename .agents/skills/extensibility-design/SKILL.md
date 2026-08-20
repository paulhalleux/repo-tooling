---
name: extensibility-design
description: Choose and design the least powerful extensibility mechanism that satisfies a reusable library requirement. Use for customization, callbacks, strategies, capabilities, contributions, registries, middleware, plugins, runtime discovery, or independently packaged extensions.
---

# Extensibility design

Extensibility is a cost center unless the variation and ownership model are explicit.

Use the least powerful mechanism that satisfies the actual requirement.

## 1. Identify the required variation

Before choosing a mechanism, answer:

- What exactly varies?
- Who owns each variation?
- Who selects/consumes it?
- Is composition known statically or discovered dynamically?
- Must independently packaged modules contribute without host source changes?
- Is contribution cardinality zero/one/many?
- Does ordering matter?
- Can contributions appear/disappear at runtime?
- Is failure isolated per extension?
- Does the extension own lifecycle/resources?

Do not start by designing a plugin system.

## 2. Choose the weakest sufficient mechanism

Prefer roughly in this order:

1. direct parameter/value;
2. configuration;
3. callback;
4. local composition;
5. strategy/narrow service capability;
6. typed contribution point;
7. middleware pipeline;
8. registry/runtime discovery;
9. plugin lifecycle only when extensions genuinely need coordinated initialization/disposal.

Moving downward increases semantic and coordination cost. Justify the extra power.

## 3. Prefer composition over registration

Do not create global registration merely because multiple things can exist.

Prefer definitions that compose their capabilities locally when discovery is not required.

A runtime full of `registerX()` methods can become a global bag of unrelated concepts and force central bootstrap coordination.

Registration is appropriate when contributors and consumers are intentionally decoupled in time/package ownership and discovery is part of the contract.

## 4. Define typed protocol semantics

For contribution/registry/plugin mechanisms, define:

- contributor and consumer;
- identity;
- cardinality;
- duplicate behavior;
- ordering and conflict resolution;
- registration window;
- mutability after startup;
- sync/async resolution;
- lazy/eager discovery;
- failure behavior;
- lifecycle/disposal ownership.

These are public protocol semantics, not incidental implementation details.

Prefer capability-specific contracts over a universal plugin object with optional fields for every extension type.

## 5. Keep contribution ownership local

If modules are independently packaged, they should normally be able to declare/provide their contribution near the module that owns it.

The host may own composition policy, but should not need to import and enumerate every concrete downstream extension merely so the framework recognizes it.

Avoid architectures where adding one extension requires changing central switches/unions/registries in several upstream packages unless the extension family is deliberately closed.

## 6. Analyze open/closed boundaries deliberately

Ask for each axis of variation:

- Is downstream extension intended?
- If yes, can a downstream package add one without modifying central upstream implementation?
- If no, is the model clearly and intentionally finite?

Do not force every domain model to be open. Closed unions can be excellent when the concept is truly finite and centrally owned.

Accidental closure and speculative openness are both design defects.

## 7. Check change locality

Estimate the conceptual edit set for adding one new member of the extension family.

If one new view/action/presentation/capability requires touching core, runtime switches, host registration, React, router, and unrelated adapters, identify which central knowledge is causing shotgun surgery.

Good extensibility usually localizes new concrete behavior to the owner plus the adapters that intentionally interpret it.

## 8. Keep framework semantics out of extension contracts

Framework-neutral extension contracts should describe semantic intent, not React nodes, router objects, query options, or design-system components.

Adapters may expose framework-specific extension points when the extension itself is framework-specific.

Do not compromise core neutrality to make one adapter's registration easier.

## 9. Avoid generic metadata escape hatches

A `metadata: Record<string, unknown>` field can be useful for opaque pass-through data, but should not become the primary extension system when behavior or typed semantics matter.

Prefer named typed contracts for capabilities consumers are expected to understand.

## 10. Extensibility gate

Before accepting an extensibility design, verify:

- the real variation is identified;
- a simpler mechanism would not suffice;
- contributor/consumer ownership is clear;
- dynamic registration exists only if discovery/mutation requires it;
- independently packaged contributors do not require unnecessary central host edits;
- lifecycle exists only where extensions own resources;
- conflict/order/failure semantics are explicit where applicable;
- type relationships survive the extension boundary;
- the extension point does not leak a particular framework unless intentionally adapter-specific.
