# AGENTS.md

## Project context

This is a web application project.

The agent should be able to:
- install dependencies
- start the local development server
- open the app in a browser
- verify UI flows manually
- run Playwright E2E tests
- inspect screenshots, traces, videos, and console errors when tests fail

Do not claim that the UI was verified unless:
- the browser was actually opened and the flow was checked, or
- Playwright E2E tests passed.

## Setup

Install project dependencies:

```bash
npm ci
```

Install Playwright browsers and required system dependencies:

```bash
npm run setup:e2e
```

If `npm run setup:e2e` is not available, run:

```bash
npx playwright install --with-deps chromium
```

## Run app

Start the local development server:

```bash
npm run dev
```

The app should be available at:

```text
http://127.0.0.1:3000
```

If the project uses Vite instead of Next.js, the app may be available at:

```text
http://127.0.0.1:5173
```

If the app does not open, check:
- whether the dev server started successfully
- whether the correct port is used
- whether the app is listening on `0.0.0.0`
- whether required environment variables are missing

## Browser / UI verification

When asked to check UI behavior:

1. Start the dev server with:

```bash
npm run dev
```

2. Open the app in the browser.

3. Reproduce the requested user flow.

4. Check browser console errors.

5. Check network errors if the page does not behave correctly.

6. Fix the smallest relevant code path.

7. Re-run the same flow in the browser.

8. Run E2E tests:

```bash
npm run test:e2e
```

## E2E tests

Run Playwright tests:

```bash
npm run test:e2e
```

Run Playwright tests with browser visible:

```bash
npm run test:e2e:headed
```

Run Playwright UI mode:

```bash
npm run test:e2e:ui
```

Run Playwright debug mode:

```bash
npm run test:e2e:debug
```

If Playwright fails, inspect:
- screenshots
- traces
- videos
- console output
- network errors
- test timeout reasons

Then fix the issue and re-run the failed test.

## Playwright artifacts

Playwright artifacts may be located in:

```text
test-results/
playwright-report/
```

Use these artifacts to understand failures before changing code.

## Environment variables

If the app requires environment variables, check for:

```text
.env
.env.local
.env.example
```

Do not invent production secrets.

If required values are missing, explain which environment variables are needed.

## Code change policy

When fixing UI or E2E issues:

- prefer the smallest working change
- do not rewrite unrelated components
- do not change public APIs unless necessary
- preserve existing styling conventions
- preserve existing component structure where possible
- add or update tests when the behavior is important

## Final response policy

After completing a task, summarize:

- what was checked
- what was broken
- what was changed
- which commands were run
- whether browser verification or Playwright tests passed
