---
name: public-api-review
description: Review an already-designed public library API for compatibility, modeling, naming, progressive complexity, ownership/error semantics, TypeScript ergonomics, framework leakage, and future evolution. Use after or alongside public-api-design for exported contracts.
---

# Public API review

Treat public API mistakes as more expensive than internal implementation mistakes.

## 1. Identify only the affected consumer surface

Inspect changed/affected:

- exports and package entry points;
- public definitions/functions/classes/builders;
- configuration/options;
- callbacks/context;
- lifecycle/ownership/error behavior;
- public generic/inference relationships.

## 2. Review model quality

Ask:

- Does the API expose stable concepts rather than implementation machinery?
- Is common usage concise?
- Is advanced behavior progressive?
- Are naming/vocabulary consistent with sibling APIs?
- Is ownership clear from shape/documentation?
- Are failure semantics coherent?
- Is a framework/design-system detail leaking across a neutral boundary?

## 3. Review compatibility and evolution

Check:

- new required members/parameters;
- narrowed generic constraints/assignability;
- accidental runtime behavior changes behind compatible types;
- closed structures blocking intended downstream extension;
- return types exposing internals;
- positional signatures likely to become brittle;
- lifecycle/ownership changes that require migration.

Do not add generalized future-proofing when the API has no plausible evolution pressure.

## 4. Review TypeScript consumer UX

When inference is material, use `typescript-api-design` rather than treating successful compilation as sufficient.

Flag explicit generic burden, lost contextual typing, generic infection, unsafe type recovery, or declarations exposing private machinery.

## 5. Output

Classify each finding as breaking, risky, modeling, ergonomic, type-DX, or documentation-only. Give the smallest corrective direction and migration implication when relevant.
