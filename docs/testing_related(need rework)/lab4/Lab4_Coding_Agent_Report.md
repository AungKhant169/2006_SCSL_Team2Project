# Coding Agent Evaluation

Project: PathSG / 2006_SCSL_Team2Project
Evaluation date: 20 October 2026 (Asia/Shanghai)
Assistant: Codex
Starting revision: `d2a95f40af0d0c576e2ea9dd7c68615d02285199`

This report covers the reconstruction and review of that version.
Current test results are recorded in `../testing/Black_Box_Testing.md`.

## 1. Profile Controller Reconstruction

### Inputs and Request

We chose `UserProfileController`, whose code is in `client/src/stores/profile.ts`
and `client/src/utils/profileValidation.ts`. We gave Codex the existing tests,
profile view, types, education definitions, postal utilities, and code that calls
the controller. The first attempt did not use the requirements document or class
diagram directly.

We asked Codex to rebuild both files after removing them, keep the existing interfaces
and behavior, and run the focused tests, regression suite, type check, and build.

### Procedure

1. We backed up both files and recorded their SHA-256 hashes. All 63 focused tests passed before the removal.
2. We removed the files. The tests could not load because the imports were missing.
3. Codex generated replacements using the tests and surrounding code. All 63 focused tests and 610 frontend tests passed.
4. We compared the replacements with the backup and found differences in number formats, one error message, and when messages were cleared.
5. We added ten tests for those differences. All ten failed against the first generated validator.
6. Codex corrected the format checks, error message, and watchers. The score-label lookup was also changed to a type-safe partial mapping. The final tests passed.

### Results

| Stage | Command from client | Result |
|---|---|---|
| Baseline | `npm test -- profileValidation.spec.ts profile.spec.ts` | 63 passed |
| Files removed | Same focused command | 2 suites failed to load; no tests executed |
| First reconstruction | Same focused command | 63 passed |
| First regression | `npm test` | 610 passed |
| Initial types | `npm run type-check` | Passed |
| Additional format checks | `npm test -- profileValidation.spec.ts` | 10 failed; 53 passed |
| Corrected focused run | `npm test -- profileValidation.spec.ts profile.spec.ts` | 73 passed |
| Corrected regression | `npm test` | 620 passed |
| Final types | `npm run type-check` | Passed |
| Changed-file formatting | Prettier check | Passed |
| Production build | `npm run build-only` | Passed |

We checked the final version against the original code as well as the tests.

## 2. Code Review

We also asked Codex to review parts of the frontend, backend, and CI workflow.
The main findings for that version were:

| Priority | Finding | Recommendation |
|---|---|---|
| High | Some frontend services still simulated responses | Connect them to backend endpoints and test identifiers and payloads |
| High | The admin interface relied on a client-side check | Check user roles at privileged server endpoints |
| Medium | Roadmap save used separate lookup/write sessions | Use one transaction and handle uniqueness conflicts |
| Medium | Client/server timeout values differed | Align timeout behavior and test failure handling |
| Medium | Pagination inputs lacked explicit nonnegative bounds | Define ranges and reject invalid queries |
| Low | The score-label lookup used a type assertion | Use `Partial<Record<TierId, string>>`; applied during reconstruction |

We ran the frontend checks but did not run the backend or live services for this review.
The larger changes remained recommendations.

## 3. Reflections

### Reconstruction

The first version passed the existing tests, but the comparison with the backup found
differences that those tests had missed. Adding the ten format and message tests made
the problem clear. After the corrections, 73 focused tests and all 620 frontend tests
passed. We found that checking the generated code against existing behavior was just
as useful as running the original tests.

### Code Review

The review gave us specific issues to check, including service integration, access
control, roadmap saves, and timeouts. We checked the suggestions against the code
and CI workflow before deciding what to change. We applied the small typing fix;
the larger changes needed more work and were left as recommendations.
