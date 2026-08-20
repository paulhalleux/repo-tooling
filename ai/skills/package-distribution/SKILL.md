---
name: package-distribution
description: Design or review npm distribution for TypeScript/frontend libraries: package exports, declarations, peer dependencies, optional adapters, side effects, ESM/CJS boundaries, build artifacts, and consumer smoke tests. Use when changing package.json, entry points, build output, dependencies, or publish behavior.
---

# Package distribution

A library is not complete until a clean consumer can import it with the intended runtime and type behavior.

## Public entry points

Treat the package export map as API surface.

Verify:

- documented imports are exported intentionally;
- internal files are not accidentally importable as supported API;
- runtime and type declarations resolve through the same public entry points;
- subpath exports correspond to real architectural boundaries;
- adapters can be consumed without importing unrelated optional integrations.

Avoid adding a subpath for every source folder. Export consumer concepts, not implementation layout.

## Types and declarations

Publish declarations with the package when the library is authored in TypeScript.

Check built declarations for:

- private monorepo aliases;
- internal filesystem paths;
- leaked implementation dependencies;
- missing public types;
- declaration/runtime export mismatches.

## Dependencies

Classify dependencies by consumer ownership:

- runtime dependency: library requires and owns the dependency at runtime;
- peer dependency: host application/framework should supply a compatible shared runtime;
- dev dependency: needed only to build/test/develop the package.

React and similar host frameworks usually belong as peers for integration libraries, with a development copy available for tests/builds.

Do not force consumers of core packages to install optional adapter ecosystems.

## Side effects and tree shaking

Declare side-effect behavior truthfully. Do not mark a package side-effect-free if importing a module intentionally registers globals, patches runtime state, or performs required initialization.

Prefer explicit initialization/composition over import-time registration where architecture allows it.

## Runtime formats

Follow the repository's supported runtime matrix rather than adding formats speculatively. Ensure `exports`, emitted JavaScript, declarations, and test environment agree on ESM/CJS/browser/node conditions.

Avoid dual-package behavior differences between formats.

## Consumer smoke test

For meaningful distribution changes, validate from outside the source tree when practical:

- pack/build the package;
- import public entry points as a consumer;
- typecheck representative usage;
- execute a minimal runtime path;
- verify optional adapters/dependencies behave as intended.

A monorepo source import passing does not prove the published package works.
