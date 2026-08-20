---
name: typescript-api-design
description: Design or review TypeScript-heavy public APIs for inference, generic ownership, assignability, declaration quality, error locality, and type simplicity. Use when exported generics, builders, callbacks, extension contracts, or inference-sensitive APIs change.
---

# TypeScript API design

Treat the type system as consumer UX, not as a proof that the implementation can compile.

Prefer strong relationships with low annotation burden and understandable emitted declarations.

## 1. Start from inference direction

Prefer:

```text
consumer values
    -> inference
    -> callback/context types
    -> returned capability/definition types
```

rather than forcing consumers to predeclare every type argument before supplying values.

If ordinary usage requires explicit generic arguments, check whether the API boundary is blocking inference.

## 2. Give every generic a clear owner

Each type parameter should represent a relationship owned by the abstraction declaring it.

Avoid generic warehouses such as:

```ts
Runtime<TEntity, TId, TQuery, TMutation, TView, TRoute, TContext, TAdapter>
```

when those concepts belong to independent resources/actions/adapters.

Ask for every generic:

- Who introduces it?
- Who needs to know it?
- Where can it stop propagating?
- Does it provide consumer value or only satisfy internal plumbing?

## 3. Prevent generic infection

Watch for one type parameter spreading through service -> registry -> runtime -> plugin -> application even though most layers do not semantically care about it.

Prefer preserving relationships locally and exposing narrower typed capabilities over parameterizing the entire architecture.

Generic propagation is an architectural cost.

## 4. Preserve relationships instead of recovering them

Avoid erasing to `unknown`/`any` at one boundary and recovering later with assertions.

Prefer carrying the actual relationship through definitions/callbacks/returned objects.

Treat these as design smells when frequent:

- `as unknown as T`;
- broad `any` in exported contracts;
- repeated explicit generic arguments at call sites;
- duplicate annotations that merely restate inferred information;
- overload piles compensating for an awkward model;
- conditional types whose main job is repairing information lost earlier.

A localized assertion at a proven runtime boundary can be valid; cascading assertions indicate a type architecture problem.

## 5. Simplify type machinery

Before adding a conditional/mapped/infer helper, ask whether the model can expose the needed relationship more directly.

Look for:

- redundant aliases;
- conditional types over a model that could expose a type member directly;
- phantom type parameters with no observable relationship;
- overly distributive conditional types;
- unions missing a useful discriminant;
- parallel public/internal type models that drift;
- helper types consumers must import only to satisfy the library;
- complex overloads hiding a poor runtime/public shape.

Do not solve an architectural type problem with increasingly sophisticated TypeScript.

## 6. Optimize error locality

Invalid consumer code should fail as near as practical to the invalid value/callback, with an understandable expected type.

Avoid designs where one wrong field causes an enormous unrelated generic error at the root builder call.

When choosing between equally safe designs, prefer the one producing better editor feedback and smaller error surfaces.

## 7. Use `satisfies`, inference helpers, and annotations intentionally

Use annotations when they establish a contract or improve declaration clarity, not reflexively.

Use `satisfies` when preserving a value's specific inferred type while checking it against a contract is useful.

Avoid helper factories whose only purpose is compensating for a type model that could infer directly, unless TypeScript limitations make the helper materially improve consumer UX.

## 8. Keep runtime and type semantics aligned

Types must describe actual behavior:

- optionality;
- mutation/readonly ownership;
- sync/async return behavior;
- errors/rejections when represented in types;
- callback input variance;
- lifecycle availability;
- discriminants;
- extension cardinality.

Do not promise stronger invariants in types than runtime enforcement provides.

## 9. Treat emitted declarations as the public artifact

When public types change, reason about what consumers see in `.d.ts`:

- no private/internal import paths;
- no monorepo-only aliases;
- no implementation-only third-party types unless intentionally public;
- no giant inferred signatures that make the API unreadable;
- stable named public concepts where that improves declarations;
- no accidental API expansion caused by inferred return types exposing internals.

The source implementation can be elegant while the emitted consumer API is poor; optimize for the latter.

## 10. Type API gate

Before accepting an inference-sensitive API, verify:

- simple usage infers naturally;
- callbacks receive precise contextual types;
- important relationships survive adapter/extension boundaries;
- consumers do not need internal helper types;
- generic parameters stop where their semantic ownership stops;
- assertions are isolated and justified;
- invalid usage fails locally;
- declarations remain understandable and stable.
