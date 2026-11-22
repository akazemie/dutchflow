# DutchFlow

DutchFlow is a local-first Dutch-learning application. It practices the Perfectum and Imperfectum with Dutch verbs and includes an initial Vocabulary module. Learners can configure study preferences, while attempts, per-skill progress, and FSRS review schedules stay in IndexedDB on their device. The Progress screen shows due reviews, and Settings can export or restore a versioned JSON backup.

## Requirements

- Node.js 20.19 or newer
- npm

## Run locally

```bash
npm ci
npm run dev
```

Open the local URL printed by Next.js. The app does not require an account, backend, or paid API.

## Project checks

```bash
npm run lint
npm run typecheck
npm run validate-content
npm test
npm run build
```

See [the architecture design](docs/architecture/design.md) and [implementation plan](docs/architecture/implementation-plan.md) for the domain model and extension points.
