---
name: simplicity-review
description: Perform a deletion-oriented architecture and code-quality review after a non-trivial implementation or refactor. Use to reduce conceptual machinery, coupling, indirection, type complexity, and accidental abstractions without changing required behavior.
---

# Simplicity review

Assume the change works. Now try to make the design easier to understand and cheaper to maintain by removing unnecessary concepts.

The target is conceptual simplicity, not minimum line count.

## 1. Review responsibilities and cohesion

For changed modules/files/classes/functions ask:

- Does this unit own one coherent responsibility?
- Is behavior located with the data/concept it belongs to?
- Is a large file actually incoherent, or merely large?
- Did decomposition create many files that must always change together?
- Are private helpers local enough to understand their purpose?

Do not split code merely to satisfy a line-count preference.

## 2. Challenge every new abstraction

For each new interface/class/service/provider/manager/factory/registry/resolver/coordinator ask:

- What variation does it hide?
- Who consumes it?
- How many meaningful implementations exist or are concretely expected?
- Does it reduce coupling or only move calls through another layer?
- Does the name represent a real domain/library concept?
- Would deleting it expose knowledge that genuinely should remain hidden?

If the abstraction has one trivial implementation and no semantic boundary, prefer direct composition unless it serves a concrete package/public-contract purpose.

## 3. Prefer precise concepts over vague containers

Scrutinize names like:

- Manager;
- Handler;
- Provider;
- Context;
- Service;
- Engine;
- Processor;
- Helper/Utils;
- Config/Data/Item/Metadata.

They are not forbidden. Determine whether a more precise concept such as `Registry`, `Resolver`, `Definition`, `Contribution`, `Store`, or a domain-specific name would clarify responsibility.

Naming problems often reveal modeling problems.

## 4. Remove coordination machinery

Look for:

- wrappers that add no semantic behavior;
- factories that only call constructors/functions;
- services that only forward methods;
- providers/context used as service locators;
- registries where local composition would work;
- duplicated state and synchronization effects;
- global concepts that could be local;
- classes that are immutable data plus one or two pure operations;
- unnecessary lifecycle APIs;
- compatibility layers with no current compatibility requirement.

Prefer deletion or collapsing layers before introducing a replacement abstraction.

## 5. Review duplication semantically

Do not DRY code only because it looks similar.

Distinguish:

- incidental duplication: the same semantic algorithm/contract repeated and likely to drift;
- independent similarity: two adapters happen to perform analogous framework-specific work but should remain independently owned.

Extract only when the duplicated code represents the same concept and the shared abstraction improves ownership.

## 6. Reduce type machinery

Look for:

- generics propagated through layers that do not own them;
- conditional/infer helpers repairing lost information;
- duplicate public/internal type models;
- assertions used as generic glue;
- overloads compensating for a poor API shape;
- explicit annotations that merely restate inference.

Prefer simplifying the runtime/public model before adding more type-level cleverness.

## 7. Check change locality

Ask what a future adjacent feature would require changing.

Flag shotgun surgery where a new concrete implementation would require edits to many central files or unrelated adapters.

Also flag over-generalization where a one-off requirement created a broad extension framework with no second meaningful variation.

## 8. Check adapter/core duplication

Adapters may contain real framework logic, but should not reimplement semantic core behavior.

If several adapters each duplicate semantic decisions, move those semantics inward.

If core contains framework-shaped abstractions only to reduce adapter code, move that convenience outward.

## 9. Deletion challenge

Try to remove roughly 10–20% of newly introduced conceptual machinery, not necessarily lines.

Questions:

- Can two concepts become one?
- Can one interface disappear?
- Can a class become a function/value?
- Can mutable registration become composition?
- Can configuration move next to the concept it configures?
- Can a global abstraction become local?
- Can a generic parameter stop propagating earlier?
- Can an extension point be narrower?

Do not sacrifice readability, explicit invariants, type safety, or needed extension capability for deletion.

## 10. Output

Return only concrete opportunities, ordered by expected maintenance value:

- concept/layer to simplify;
- why it is unnecessary or misplaced;
- smallest simplification direction;
- behavior/API constraints that must remain unchanged.

If the design is already appropriately simple, say so rather than inventing a rewrite.
