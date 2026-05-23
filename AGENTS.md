# AGENTS.md

Client-side React + TypeScript app that converts Logo turtle scripts to OpenSCAD polygon output. Built with Vite, tested with Vitest.

## Common commands

```sh
npm install          # install dependencies
npm run dev          # dev server (http://localhost:5173)
npm run build        # type-check + production build (dist/)
npm run lint         # eslint
npm run test         # vitest watch mode
npm run test:run     # vitest single run (CI)
npm run test:coverage # coverage report
```

## Key facts

- No backend — all logic runs in the browser
- Source lives in [src/](src/)
- Tests colocated with source as `*.test.ts` / `*.test.tsx`
- Type errors and lint errors both fail the build — fix before committing
