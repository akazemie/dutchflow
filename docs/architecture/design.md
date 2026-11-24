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

Modules implement a non-generic base contract so modules with different internal data can coexist in one catalog. The contract exposes module identity and metadata (stable ID, display name, i18n key, supported levels), lists an item's skills without creating exercises, declares supported exercise types for each skill, creates exercises, and evaluates tagged answers asynchronously when necessary. `EvaluationResult` carries correctness, a score from 0 to 1, expected answers, feedback, scheduler ratings, and per-skill results. Multi-skill exercise results update each skill's progress and schedule atomically with the attempt.

Exercises and answers use discriminated unions on `type`, with typed payloads per kind: typed-answer text; stored, shuffled multiple-choice options; fill-gap segments and accepted answers; tokenized word orders; and one-use matching pairs. Answers are serializable tagged objects such as `{ type: "typed-answer", value: "..." }` and `{ type: "matching", matches: { ... } }`. Exercises carry title, answer instructions, typo tolerance, and a partial-credit policy. Grading is pure domain logic: exact matches are correct, configured one-edit text tolerance may be rated `hard`, graded exercises use a 0.5 score threshold for partial credit, and correct multiple-choice answers are capped at `hard`. Grammar drills use no typo tolerance or partial credit. Exercise title and answer-label fields keep renderer text localizable. This permits safe type erasure at the module boundary while retaining useful type narrowing in application code.

Vocabulary typed answers apply one-edit tolerance to the target noun only; all surrounding text, including its article, must match exactly, and the noun must contain at least five letters.

Word ordering is currently vocabulary-only. It tokenizes the authored Dutch answer, accepts configured alternative orders only when they use the same normalized token multiset, and grades all-or-nothing while ignoring capitalization and terminal punctuation. Matching is currently verb-only: its three pairs represent Perfectum, Imperfectum singular, and Imperfectum plural. Identical normalized forms make the type unsupported. Each pair produces an independent skill result; correct pairs are rated `hard` and incorrect pairs `again`, while duplicate use of a right-side item makes every affected pair incorrect.

The planner offers matching only when every sibling skill reported by the module is known and has reached exercise stage 1, and at least two of that item's facet skills are due in the session's due-review candidates. It selects a matching candidate as part of the ordinary time-budgeted plan, then removes only the covered sibling candidates if that matching exercise was actually selected. It refills the freed time from remaining candidates; matching costs three times the per-skill exercise estimate. `submitAnswer` maps each returned skill ID to its own module focus. The Dexie answer recorder reads previous skill state and writes the attempt, progress, and schedules in one transaction; its record-building callbacks and FSRS scheduling are synchronous.

`startSession` returns an in-memory `LearningSession` containing the selected preferences and planned skills/types. It is persisted atomically with the first submitted answer, so opening or abandoning a session without answering creates no session row and every non-null attempt session ID resolves. Later answers reuse the existing session record. Every exercise answered from the session screen, including manual item/focus selections, uses that session's ID. The session is marked complete after its final planned exercise is answered; completion is idempotent and preserves the first completion timestamp.

Exercise rendering is independent of modules. An `ExerciseRenderer` registry maps shared exercise types such as `multiple-choice`, `fill-gap`, `typed-answer`, `word-ordering`, and `matching` to UI components. Several modules may use one renderer; a new exercise type adds a renderer without requiring route registration. Word ordering and matching use focusable native buttons for tap and keyboard operation, with live announcements and per-item feedback. New skills start with multiple choice, progress to fill-gap after a correct answer, then alternate more open exercise types; unsupported types fall back to typed-answer. Next.js App Router remains the only routing system.

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

Dexie is the IndexedDB adapter. Preferences, exercise attempts, item/skill progress, review schedules, and sessions are separate records accessed through repository ports. Define `learnerId` and `skillId` in the initial Dexie schema, including the walking skeleton: use a hardcoded local learner ID and a stable skill ID such as `verb:lopen:perfectum` for its first saved attempt. Persist serializable tagged answers while tolerating existing string-answer attempts. Versioned backups continue to accept v1 string answers and v2 typed-answer objects; v3 supports the full answer union. Skill progress has an optional, non-indexed exercise stage so older rows derive their initial stage from the correct streak without a Dexie schema migration. Use UUID record IDs, immutable content IDs, and `updatedAt` timestamps to leave a future path to synchronization without requiring it now.

Request persistent browser storage using `navigator.storage.persist()` when available. Provide JSON export and import for learner data so users can make backups and move data between browsers/devices. IndexedDB remains local to the browser/device; export/import is the MVP portability mechanism. Dexie v4 adds sessions and migrates legacy string answers to tagged typed answers, fills attempt `skillIds` from the compatible `skillId`, and sets legacy `sessionId` to `null`. Backup v4 includes sessions, attempt skill/session IDs, and optional attempt duration while retaining v1/v2/v3 import. Backup replacement and answer recording each use one Dexie transaction. Scheduler identifiers are validated against the known identifier list.

Audio can use static assets or local browser storage. Speech/listening evaluation may be asynchronous and use browser capabilities behind the exercise boundary; support and recognition quality vary by browser. No paid speech service is required for the MVP.

## Internationalization

Keep interface strings in a typed English/Dutch message catalog and educational translations in content translation maps. Explanation language is a learner preference and selects the interface locale (`en` or `nl`) as well as the content explanation. The Dutch catalog is a draft pending native review. Persian (`fa`) remains supported for explanations but falls back to English UI; the document remains `lang="en"`/`"nl"` and `dir="ltr"`, while only Persian explanation elements use `lang="fa" dir="rtl"`. Exercise prompts remain authored English source text regardless of explanation language.

The interface uses a small React context and has no locale routes or additional i18n dependency. Catalog parity is tested so every UI locale provides every message key.

## Daily learning-time budget

The application use case loads attempts since local midnight using the injected clock and sums their measured `durationMs`; legacy attempts without a duration contribute zero. The session UI measures visible-tab time from exercise display to submission and caps each attempt at five minutes. Planning, matching eligibility, and refill use one effective budget. When less than two minutes remain, the session reports the daily goal reached; an optional extra session receives exactly five minutes and excludes matching.

Playwright tests import backup fixtures through the real UI to set browser state. They run against the built static export using a file-serving test server that resolves exported route files and returns a real 404 for missing routes; production code has no test-only state controls.

## Testing strategy

- **Domain and planning:** deterministic unit tests for item eligibility, strategies, time budgets, skill mapping, and preference behavior.
- **Exercise evaluation:** table-driven tests for every exercise type, including correct answers, accepted variants, normalization, partial credit, invalid inputs, feedback, and asynchronous results.
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
