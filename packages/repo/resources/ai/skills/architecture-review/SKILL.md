---
name: architecture-review
description: Review an existing or proposed bounded architecture for conceptual integrity, ownership, dependency direction, public API/type quality, extensibility, change locality, and simplicity. Use when architecture is already present and needs critique; use architecture-design when creating the model.
---

# Architecture review

Review only the bounded architecture relevant to the request.

## 1. Define the review boundary

State the problem/capability, existing contracts that matter, package/module scope, and explicit non-goals.

Use targeted repository evidence rather than general architectural speculation.

## 2. Review conceptual integrity

Check:

- semantic ownership;
- dependency direction and cycles;
- core versus adapter responsibilities;
- state ownership/duplication;
- lifecycle only where real ownership requires it;
- coherent error/ownership semantics;
- abstraction centrality and coordination cost.

## 3. Review consumer integrity

Check:

- public API simplicity and vocabulary;
- TypeScript inference/generic ownership;
- implementation-detail leakage;
- backwards evolution;
- framework-specific leakage;
- extension/change locality.

## 4. Challenge architectural power

Ask whether functions/data/composition/narrow capabilities could replace services, registries, providers, runtime discovery, or plugin lifecycle.

Do not request extensibility when the model is intentionally finite.

## 5. Use the architect selectively

Use `architect` only if the review exposes a material decision with multiple credible remedies. Require a choice, not an open-ended brainstorm.

## 6. Output

Return the highest-value concrete findings and the smallest corrective direction. Distinguish architectural defects from optional alternative designs.
