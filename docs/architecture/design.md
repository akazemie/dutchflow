# DutchFlow Architecture Design

## Goals and constraints

DutchFlow is a local-first Dutch-learning application. The initial module teaches Dutch verbs in the Perfectum and Imperfectum. The architecture must also support future modules such as Grammar, Vocabulary, Reading, Listening, and Speaking without making the core application verb-specific.

The MVP uses Next.js App Router, React, TypeScript, and IndexedDB through Dexie. It requires no authentication, backend server, AWS services, or paid external APIs. The UI is responsive and learner data remains independent of UI components and routes.

## Architecture at a glance

```text
Next.js App Router
        |
        v
Client features and hooks
        |
        v
Application use cases and ports <---- Composition root
        |                                      ^
        v                                      |
Learning domain                         Dexie adapters
```

This is a modular monolith, not a distributed system. The initial implementation uses explicit imports and a small number of stable contracts. Add discovery mechanisms, server synchronization, or other infrastructure only when product needs justify them.

## Dependency and runtime rules

- `app/` owns all routing. Pages and layouts stay thin and can be Server Components when they only render static structure.
- Any screen behavior that reads or writes learner data belongs in a `features/` Client Component or hook marked with `"use client"`. IndexedDB is browser-only and must never be accessed from a Server Component.
- Dependencies flow as `app -> features -> application -> learning`.
- `application` defines the ports needed by use cases. `infrastructure` implements them. The client-only composition root constructs Dexie repositories and injects them into application services.
- Keep UI, persistence, browser APIs, and framework imports out of learning-domain rules.
- Use `eslint-plugin-boundaries` to enforce the dependency direction. Give the composition root a narrow exception to import both `application` and `infrastructure`, since its purpose is to wire them together.
- Consider Next.js `output: 'export'` for static hosting and a future PWA. Keep browser-dependent initialization behind client boundaries and confirm the selected Next.js features support static export when implementation begins. Dynamic routes such as `/learn/[moduleId]` must provide `generateStaticParams`; it lists each supported module.

## Project structure

```text
src/
  app/                              # Next.js App Router: pages, layouts, route UI
    learn/
    settings/
    progress/
    composition-root.tsx              # Client-only wiring of application services and adapters
  features/                         # Client UI, hooks, and feature-specific components
    learning-session/
    preferences/
    progress/
  application/                      # Use cases and persistence ports
    start-session.ts
    submit-answer.ts
    get-review-queue.ts
    export-import-data.ts            # Validates and transfers learner-data JSON
    update-preferences.ts
    ports/
  learning/
    contracts/                      # Module and exercise contracts
    core/                           # Shared domain types and rules
    exercises/                      # Shared exercise type definitions
    planning/
      session-planner.ts            # Pure session planning function
    scheduling/
      scheduler.ts                  # Scheduler interface and adapter
    modules/
      verbs/
        module.ts
        conjugation/
        evaluation/
      vocabulary/
        module.ts
  content/                          # Educational data, separate from logic
    verbs/
      verbs.json
      authored-exercises.json
    vocabulary/
      vocabulary.json
  exercise-renderers/               # Client renderers keyed by exercise type
    multiple-choice/
    typed-answer/
    audio-prompt/
  i18n/                              # UI messages and locale configuration
  infrastructure/
    dexie/
      database.ts
      repositories/
      migrations/
scripts/
  validate-content.ts                # Root-level content validation command

tests/                               # Integration and end-to-end tests
```

Future module folders are created when needed. They do not need to exist in the MVP. Unit tests live next to implementation as `*.test.ts`; `tests/` is reserved for integration and end-to-end tests.

## Learning module and exercise contracts

Modules implement a non-generic base contract so modules with different internal data can coexist in one catalog. The contract exposes module identity and metadata (stable ID, display name, i18n key, supported levels), selects eligible items, creates exercises, evaluates typed answers asynchronously when necessary, and maps outcomes to one or more stable `skillId` values. `EvaluationResult` carries correctness, a score from 0 to 1, expected answers, feedback, and a scheduler rating (`again`, `hard`, `good`, or `easy`).

Exercises and answers use discriminated unions on `type`, with typed payloads per kind. The initial union member is `typed-answer`; answers are serializable objects such as `{ type: "typed-answer", value: "..." }`. Exercise title and answer-label fields keep renderer text localizable. This permits safe type erasure at the module boundary while retaining useful type narrowing in application code.

Exercise rendering is independent of modules. An `ExerciseRenderer` registry maps shared exercise types such as `multiple-choice`, `typed-answer`, and `audio-prompt` to UI components. Several modules may use one renderer; a new exercise type adds a renderer without requiring route registration. Next.js App Router remains the only routing system.

The learning module registry owns module metadata and lazy dynamic loaders. The composition root uses it to load modules, and App Router uses the same registry for static params and module validation. Adding a module requires a registry entry and its module folder, not additional hardcoded route or runtime branches.

## Content and Dutch verb modeling

Educational content is data, separate from application and module logic. Stable content IDs are immutable once released. Each item has a `contentVersion`; changed or retired content is handled through an explicit version or migration. Use Zod schemas for content validation and run `scripts/validate-content` in CI.

Verb data contains stable IDs, level and topic tags, examples, explicit irregular/strong forms, and translation maps for explanations (for example `{ en, nl, fa }`). Regular weak forms are generated by reusable conjugation rules, including the *'t kofschip* ending, and generated forms are checked against known forms in validation/tests. Model separable verbs (such as *opbellen*), *ge-* prefix exceptions (such as *bezoeken*), and verbs that can use both *hebben* and *zijn*. Evaluation accepts configured variants, including valid alternative forms and optional *ge-* where applicable.

Routine conjugation exercises are generated from verb data. Authored exercises are reserved for curated sentence context or a specific teaching point. Module content is loaded with dynamic `import()` per module so future content does not unnecessarily enlarge the initial bundle.

## Planning, progress, and scheduling

`learning/planning/session-planner.ts` is a pure function. It takes due skills, candidate new skills, the learner's exercise strategy, and the daily-time budget, and returns a proposed session. It has no database, UI, browser clock, or network dependency. Application use cases load inputs, call the planner, and persist the outcome.

Review is keyed by a reviewable facet, or skill, rather than by a whole learning item. Example skill IDs include `verb:lopen:imperfectum:plural` and `verb:lopen:perfectum`. Progress and review schedule records are keyed by `(learnerId, skillId)`, allowing different aspects of the same verb to be learned independently.

Use a scheduler interface so learning-domain code does not depend on a third-party API. The MVP pins `ts-fsrs@5.4.2` with the FSRS-6 model, records package/model metadata in review state, and disables fuzzing and short learning steps for reproducible daily scheduling. Keep the scheduler replaceable without changing session or UI code.

## Persistence, durability, and portability

Dexie is the IndexedDB adapter. Preferences, exercise attempts, item/skill progress, review schedules, and sessions are separate records accessed through repository ports. Define `learnerId` and `skillId` in the initial Dexie schema, including the walking skeleton: use a hardcoded local learner ID and a stable skill ID such as `verb:lopen:perfectum` for its first saved attempt. Persist serializable typed answers while tolerating existing string-answer attempts. Versioned backups accept v1 string answers and export the current v2 tagged-answer format. Use UUID record IDs, immutable content IDs, and `updatedAt` timestamps to leave a future path to synchronization without requiring it now.

Request persistent browser storage using `navigator.storage.persist()` when available. Provide JSON export and import for learner data so users can make backups and move data between browsers/devices. IndexedDB remains local to the browser/device; export/import is the MVP portability mechanism. Version the database schema and test migrations.

Audio can use static assets or local browser storage. Speech/listening evaluation may be asynchronous and use browser capabilities behind the exercise boundary; support and recognition quality vary by browser. No paid speech service is required for the MVP.

## Internationalization

Keep interface strings in `i18n/` and educational translations in content translation maps. Explanation language is a learner preference and affects both interface messaging and the selected content translation. These concerns share locale identifiers but remain separately maintainable.

## Testing strategy

- **Domain and planning:** deterministic unit tests for item eligibility, strategies, time budgets, skill mapping, and preference behavior.
- **Exercise evaluation:** table-driven tests for correct answers, accepted variants, normalization, invalid inputs, feedback, and asynchronous results.
- **Verb conjugation:** cases for regular weak and irregular/strong forms in both tenses, auxiliary selection, separable verbs, *ge-* exceptions, and verbs with alternate auxiliaries.
- **Spaced repetition:** fixed-clock tests for each rating, schedule transitions, due-date selection, boundaries, and persisted scheduler state.
- **Content:** Zod schema and content validation, including generated-form checks.
- **Persistence:** Dexie repository and migration tests.
- **Integration/E2E:** exercise flow from item selection through evaluation and persisted attempt; JSON export/import; key responsive learning paths.

## Main domain records

- **LearnerPreferences:** level, explanation language, exercise strategy, and daily learning time.
- **LearningModule:** stable identity and module metadata, represented by the module contract.
- **LearningItem:** immutable content identity, content version, level/tags, and module-specific content.
- **ExerciseDefinition:** generated or authored prompt, discriminated exercise type, and expected answer/evaluation metadata.
- **LearningSession:** learner, module, selected skills/exercises, strategy, and timestamps.
- **ExerciseAttempt:** learner answer, evaluation, time, session, item, and affected skill IDs.
- **SkillProgress:** per-learner performance/exposure keyed by learner and skill.
- **ReviewSchedule:** scheduler state and due time keyed by learner and skill.

IDs and timestamps are data fields rather than UI-derived values. Progress and history refer to stable content and skill IDs, never routes or component names.
