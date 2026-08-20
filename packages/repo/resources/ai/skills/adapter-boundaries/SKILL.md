---
name: adapter-boundaries
description: Design or review framework/ecosystem adapters around an agnostic TypeScript core, including React, routers, query/state libraries, design systems, storage, transports, and host integrations. Use when deciding translation boundaries, framework leakage, adapter API quality, or shared-vs-specific semantics.
---

# Adapter boundaries

Adapters translate stable semantic contracts into ecosystem-native APIs. They should be idiomatic without becoming a second core.

## 1. Dependency direction

Default to:

```text
adapter -> core
```

not:

```text
core -> adapter
```

Sibling adapters should not depend on each other unless one is intentionally layered on another and that dependency is part of the package model.

Check conceptual leakage, not just imports. Core APIs invented solely because React/router/query needs a particular shape usually belong in an adapter or a framework-neutral semantic abstraction should be found first.

## 2. Separate semantics from translation

Core may own:

- resources/domain definitions;
- actions/commands;
- mutation/query semantics independent of a specific library;
- capabilities/services;
- permissions/policy;
- extension/contribution protocols;
- framework-neutral state/lifecycle;
- navigation/presentation intent when semantic.

Adapters may own:

- hooks/components/providers;
- framework lifecycle integration;
- subscription mechanics;
- router/query/store-specific options;
- framework-native rendering/error/loading behavior;
- DOM/browser integration;
- design-system components;
- ecosystem convenience factories.

If adapters duplicate semantic decisions, move those semantics inward. If core exposes framework-shaped machinery just to make adapters thinner, move the convenience outward.

## 3. Keep adapters thin but useful

Thin does not mean trivial wrappers.

An adapter should provide an idiomatic consumer API for its ecosystem and may contain substantial translation/lifecycle logic. It should not reimplement the domain/runtime rules already owned by core.

Avoid making consumers manually reconstruct low-level core plumbing merely to preserve an artificially tiny adapter.

## 4. Preserve one state owner

Adapters should usually observe/adapt authoritative core or ecosystem state rather than copy it and synchronize through effects/listeners.

If adapter-local state exists, it should represent genuinely adapter-owned UI/integration state.

Clarify who owns mutation, subscriptions, and disposal.

## 5. Preserve type relationships

Important core relationships should survive into adapter-facing APIs.

Avoid broad casts, parallel duplicate type systems, or `any` at the adapter boundary.

Framework-specific types should be exported only from the adapter package/subpath unless they are intentionally part of a shared framework-neutral contract.

## 6. Keep integrations optional

Using one adapter should not force unrelated ecosystem dependencies on consumers.

Check:

- package/subpath isolation;
- peer dependency placement where consumers provide the runtime;
- no framework types leaking from core exports;
- no adapter barrel that eagerly imports all optional integrations.

## 7. Preserve design-system neutrality

A framework adapter is not automatically a design-system adapter.

Avoid making core or general React adapters depend on concrete buttons, dialogs, toasts, forms, tables, icons, or styling systems when semantic concepts are sufficient.

Prefer semantic capabilities such as confirmation, notification, presentation intent, or action descriptors, then let design-system bindings interpret them.

A dedicated UI/design-system adapter may intentionally expose concrete component contracts.

## 8. Prefer local composition over host registration

Adapters and feature packages should be composable near the module that owns them when possible.

Do not require central host registration of every concrete renderer/page/action merely because an adapter needs to interpret contributions.

Use global registration only when runtime discovery or central policy is truly part of the semantics.

## 9. Adapter quality gate

Before accepting an adapter design, verify:

- core remains useful without the adapter;
- adapter APIs feel native to the ecosystem;
- semantic rules are not duplicated;
- framework state/lifecycle ownership is clear;
- types remain precise;
- optional dependencies remain isolated;
- design-system assumptions are intentional;
- adding another adapter would not require changing core solely for presentation convenience.
