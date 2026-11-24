# DutchFlow Implementation Plan

## Delivery principles

- Build a working end-to-end slice before broadening lesson coverage.
- Keep learner data local in IndexedDB through Dexie; no authentication, backend, AWS, or paid APIs in the MVP.
- Keep Next.js App Router as the routing authority and learning rules independent of UI and persistence.
- Add modules through shared contracts and independent content, not module-specific changes to core services.
- Add tests alongside domain code and validate educational content in CI.

## Milestones

### 1. Walking skeleton

Create the smallest complete learning path: one verb, one exercise, answer evaluation, and a saved attempt in IndexedDB. Establish the Next.js App Router shell, TypeScript conventions, a responsive learning screen, the Dexie database, composition root, and one repository port/adapter. Define `learnerId` and `skillId` in the initial attempt schema; use a hardcoded local learner and a stable skill such as `verb:lopen:perfectum` from the first saved attempt. Set up Vitest, `fake-indexeddb`, ESLint with `eslint-plugin-boundaries`, and a CI workflow in this milestone. Configure a narrow composition-root exception in the boundaries rule so it can import both application services and infrastructure adapters. Add tests for the exercise evaluator and repository behavior.

**Done when:** a user can complete the exercise locally, see feedback, reload the app, and find the attempt still persisted.

If using static export, dynamic routes such as `/learn/[moduleId]` must provide `generateStaticParams`; it lists the supported MVP modules.

**Status: Complete (2026-11-22).** The local Perfectum exercise and Dexie attempt flow are implemented. ESLint, TypeScript, content validation, all four unit tests, the static export build, and `npm audit` passed; the persisted-attempt repository behavior is covered by a Dexie test.

### 2. Stable learning and content contracts

Define module metadata and the non-generic module contract, discriminated exercise and answer unions, exercise-renderer registry, `skillId` mapping, stable content IDs, and content-version rules. Add Zod schemas, translation maps, and the content-validation script. A lazy module registry supplies metadata and loaders to both runtime composition and App Router static routes.

**Done when:** the verb module and its content pass validation and use only shared application contracts.

**Status: Complete (2026-11-22).** The non-generic module contract, exercise-focus and renderer contracts, content schema, versioned IDs, lazy module registry, and CI content validation are in place. Typed answers are serializable tagged values; existing string-answer attempts and v1 backups remain readable, while exports use backup v2.

### 3. Dutch verb foundations

Add Perfectum and Imperfectum verb data and reusable conjugation rules. Store irregular and strong forms explicitly. Model regular weak endings, separable verbs, *ge-* exceptions, auxiliary selection, and accepted answer variants. Generate routine drills from data and author sentence-context exercises only where curation adds value.

**Done when:** representative rules and verb records have regression tests, generated forms validate, and evaluation handles supported variants.

**Status: Complete (2026-11-22).** Perfectum and singular/plural Imperfectum practice covers seven verbs, including explicit strong forms, generated weak forms, separable *opbellen*, the *be-* prefix exception, auxiliary variants, and accepted answers. Content validation compares generated weak forms with stored expected forms.

### 4. Preferences and session planning

Persist language level, explanation language, exercise strategy, and daily learning time independently of UI. Implement the pure `session-planner` using due skills, eligible new skills, selected strategy, and time budget. Application use cases load inputs and save proposed sessions.

**Done when:** deterministic tests cover planning decisions and preferences survive reloads.

**Status: Complete (2026-11-22).** Preferences are stored in a separate Dexie table and survive database closure/reopening. The pure planner applies the selected level, strategy, and daily time budget to practice, with deterministic planning tests. Due-review and known-skill inputs are now supplied by Milestone 5 persistence.

### 5. Skill progress and spaced repetition

Persist skill-level progress, attempts, and review schedules independently. Carry `EvaluationResult`'s `again`/`hard`/`good`/`easy` rating (or a deterministic mapping from its score) into the scheduler. Introduce the scheduler interface and select a compatible FSRS implementation/version after checking the project runtime and browser behavior. Make tests deterministic by injecting a fixed clock and disabling fuzzing.

**Done when:** attempts update the correct skill records and schedule due reviews reproducibly.

**Status: Complete (2026-11-22).** Attempts update per-skill counts and deterministic FSRS review cards in separate Dexie tables. Due cards feed the session planner, practiced skills are excluded from new work, and tests cover rating transitions, due queries, and skill-specific updates. The pinned `ts-fsrs@5.4.2` uses the FSRS-6 model and supports the project's Node 20 baseline; fuzzing and short learning steps are disabled.

### 6. Review experience and data portability

Build the due-review queue and progress screens. Request persistent browser storage where supported. Implement `application/export-import-data.ts` to export and import preferences, attempts, progress, and schedules as validated, versioned JSON.

**Done when:** a learner can export a backup, restore it, and continue with equivalent local progress.

**Status: Complete (2026-11-22).** The progress screen reports practiced skills and due reviews. Settings can export and restore versioned JSON backups for preferences, attempts, progress, and schedules. Imports are schema-validated before an atomic learner-scoped Dexie replacement, and the app requests persistent browser storage when supported.

### 7. Validate extensibility with another module

Add a small second module (for example Vocabulary or Grammar) with its own content and evaluation while reusing the contracts, renderer types where applicable, session planner, persistence, and scheduling. Add module content via dynamic imports.

**Done when:** the second module does not require changing verb logic or adding a custom routing layer.

**Status: Complete (2026-11-22).** Vocabulary has an independent Zod schema, authored content, skill IDs, and evaluation. It uses the shared typed-answer renderer, preferences, planner, IndexedDB progress, and FSRS scheduling. App Router static params list both modules, and content validation checks both datasets.

### 8. Optional listening and speaking capabilities

Add audio-prompt exercises and local/static audio assets when content is ready. Explore browser speech capabilities behind asynchronous evaluation, with feature detection and a typed/manual fallback where useful. Keep these optional and free of paid API dependencies.

**Done when:** unsupported browser features do not block other exercise types or saved learning progress.

### 9. Graded exercise types and adaptive practice

Extend the exercise and answer contracts with multiple-choice, fill-gap, word-ordering, and matching payloads. Add deterministic seeded option ordering, shared pure evaluators, per-skill results, adaptive exercise stages, and version 3 backups while retaining v1/v2 import. Modules list skills directly and declare supported types per skill; unsupported choices fall back to typed-answer. Multiple-choice and fill-gap generation/renderers shipped in phase 2A. Vocabulary word-ordering and multi-skill verb matching shipped in phase 2B. Matching is offered only when all sibling skills declared by the module are known at stage 1 or above and at least two sibling facets are due in the session's due-review candidates. The planner selects within the normal budget first, collapses sibling candidates only for a matching exercise present in that plan, then refills the freed time. Matching is priced at three times the normal per-skill estimate. Each matching pair applies its own correctness and rating to its `skillId`; the application resolves each skill's focus before saving progress and schedules. These writes are independent and not yet atomic.

**Done when:** each available type has pure evaluator and renderer tests, deterministic session selection is verified, old/new backup fixtures round-trip, content validation and all quality gates pass, and the exercise flow remains keyboard accessible.

**Status: Complete.** Phase 2B includes deterministic word-order generation, verb matching, accessible renderers, planner eligibility and budgeting, per-skill updates, backup v3 coverage, and passing quality gates.

## Test and quality gates

- Unit tests colocated with domain, conjugation, planner, scheduler, and evaluation code.
- Content schema and generated conjugation validation run through `scripts/validate-content` in CI.
- Dexie repository and migration tests cover stored learner records.
- Integration tests cover exercise completion and persistence; end-to-end tests cover core responsive flows and data backup/restore.
- Boundary linting checks the intended dependency direction.

## Decisions to confirm during implementation setup

- `ts-fsrs@5.4.2` is pinned for Node 20 compatibility and browser-side scheduling; scheduler metadata records both package and model versions.
- Verify the chosen Next.js features and deployment target work with `output: 'export'`.
- Select and configure the interface i18n library; `next-intl` is a candidate, while content translation remains schema-based data.
- Choose the first supported explanation locales and define locale fallback behavior.
