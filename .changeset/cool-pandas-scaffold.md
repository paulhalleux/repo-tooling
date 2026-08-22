---
"@paulhalleux/scaffold": minor
---

Add `@paulhalleux/scaffold`, a composable, prompt-driven project scaffolding
engine.

Scaffolds are composed from reusable layers instead of duplicated directory
trees; layer composition is the only model, with no single-directory
shorthand. Layers own their files, prompts, conditional file rules, and post-create
actions, and `package.json` fragments contributed by several layers are
deep-merged. Questions support `text`, `confirm`, `select`, and `multiselect`
with `when` conditions, templated defaults, and validation rules. Templates are
Handlebars in strict mode, so a missing variable fails the run instead of
producing a half-written project. Plans can be written into a new directory or
layered onto an existing or missing project directory with JSON merging and
conflict detection, and
catalogs can be loaded from bundled directories, local paths, or remote git
sources through `giget`.
