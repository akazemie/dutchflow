# DutchFlow

DutchFlow is a local-first Dutch-learning application. Its first learning slice practices the Perfectum and Imperfectum with Dutch verbs, lets learners configure their study preferences, and saves attempts, per-skill progress, and FSRS review schedules to IndexedDB on the learner's device. Learners can view due reviews and export or restore a versioned JSON backup from Settings.

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
