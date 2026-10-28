# Lab 4: Coding Agent Exercises

Project: PathSG / 2006_SCSL_Team2Project
Exercise date: 20 October 2026 (Asia/Shanghai)
Assistant used for both exercises recorded below: Codex
Starting commit: `d2a95f40af0d0c576e2ea9dd7c68615d02285199`

Repository scope update: This report records the original exercise at the starting commit above. The local branch was subsequently synchronised to team commit ff68f9b, which adds roadmap_rules.py and school details to the AI response. Only the Lab 4 profile implementation, tests, and documentation are retained as our changes. Backend files and repository-wide configuration remain as supplied by the team.

## 3.3.2 Reconstructing the Selected Control Class

### Selected class and supporting materials

The selected design control class was `UserProfileController`, the same class used for black-box testing in Section 3.2.1. The existing testing documentation maps this design responsibility to two implementation files: `client/src/stores/profile.ts`, which coordinates the profile form, and `client/src/utils/profileValidation.ts`, which validates its inputs. Both files were removed for this exercise, rather than removing only the validation helper.

The assistant used the existing equivalence-class and boundary-value tests in `client/src/utils/__tests__/profileValidation.spec.ts`, the store tests in `client/src/stores/__tests__/profile.spec.ts`, and `docs/testing/Black_Box_Testing.md`. It also inspected the profile view and its tests, education-level definitions, profile types, postal-code helpers, and callers in the authentication and roadmap stores. The mapping to the design class came from the existing testing and traceability documents. The class-diagram image and original requirements document were not independently interpreted in this reconstruction.

### Request and reconstruction brief

We asked Codex to help us complete Section 3.3.2 and write up the results. The task is summarised below, based on the lab manual and existing tests:

> Recreate the complete `UserProfileController` responsibility in `client/src/stores/profile.ts` and `client/src/utils/profileValidation.ts` after temporarily removing both files. Use the existing profile validation tests, profile store tests, profile view and its tests, education definitions, types, postal-code utilities, and callers to recover the public interface and expected behaviour. Preserve the existing tests and implement the missing code. Validate postal codes before academic results; support each target education level; preserve inline error messages, postal-code sanitisation, profile reset, and directory-anchor updates. Run the focused tests, the frontend regression suite, type checking, and the production build. Record any follow-up corrections accurately.

### Procedure and actual observations

1. The original implementation was copied into `evidence/original/` without displaying its bodies to the assistant. The original files' SHA-256 hashes were recorded. The focused tests passed: 2 files and 63 tests, comprising 53 validation tests and 10 store tests.
2. Both implementation files were deleted. A focused test run then failed to resolve the two missing imports. This was a test-collection failure, not 63 failed assertions; no test cases could run.
3. The assistant generated new implementations from the tests and surrounding interfaces. The new store exposed the required reactive fields, computed values, and actions. The validator implemented postal-code priority, stage-specific score checks, and the score-description helper. The original 63 focused tests passed without changing their assertions. The full frontend suite also passed: 55 files and 610 tests. Type checking passed.
4. Only after this first successful reconstruction was the original backup opened for comparison. This revealed a gap in the initial tests: the generated validator used JavaScript `Number()` conversion, which accepted representations such as `8e0`, `0x8`, and `8.0` for an integer score. The original implementation required digit-only integer text and ordinary decimal text. The generated ELR2B2 error wording also differed. The initial store cleared messages on more field changes than the original store did.
5. Ten additional checks were added without weakening or removing the original tests. Four cover non-digit PSLE formats, five cover non-standard GPA formats, and one checks the exact ELR2B2 error message. All ten failed against the first generated version, demonstrating the uncovered differences.
6. A follow-up revision added explicit numeric-format checks, restored the ELR2B2 wording, and aligned the message watchers with the existing store behaviour. An unnecessary type assertion in `describeScore()` was replaced with a `Partial<Record<TierId, string>>` lookup. The revised implementation passed all checks listed below. The first generated files remain in `evidence/first-generation/` for comparison.

### Validation results

| Stage | Command from `client/` | Actual result | Evidence |
|---|---|---|---|
| Original implementation | `npm test -- profileValidation.spec.ts profile.spec.ts` | 2 files, 63 tests passed | `01-baseline.txt` |
| Both files removed | Same focused command | 2 suites failed to load; no tests executed | `02-removed.txt` |
| First generated implementation | Same focused command | 2 files, 63 tests passed | `03-regenerated-focused.txt` |
| First regression run | `npm test` | 55 files, 610 tests passed | `04-regression.txt` |
| First type check | `npm run type-check` | Passed | `05-type-check.txt` |
| Added format checks before correction | `npm test -- profileValidation.spec.ts` | 10 failed, 53 passed | `06-format-gap.txt` |
| Final focused run | `npm test -- profileValidation.spec.ts profile.spec.ts` | 2 files, 73 tests passed | `07-final-focused.txt` |
| Final regression run | `npm test` | 55 files, 620 tests passed | `08-final-regression.txt` |
| Final type check | `npm run type-check` | Passed | `09-final-type-check.txt` |
| Changed-file formatting | `npm exec -- prettier --check src/stores/profile.ts src/utils/profileValidation.ts src/utils/__tests__/profileValidation.spec.ts` | Passed | `10-format-check.txt` |
| Production build | `npm run build-only` | Passed | `11-build.txt` |

Evidence filenames refer to `docs/lab4/evidence/`. The final validation test file contains 63 tests; the store test file contains 10. Earlier testing documents' totals of 53 validation tests and 610 frontend tests describe the earlier baseline.

### Outcome and limits

The reconstruction met the tested behaviour and integrated with the existing frontend. The first attempt needed follow-up corrections despite passing the original suite. The original implementation was consulted only during that follow-up, so the final outcome should be described as an initial reconstruction from tests followed by a compatibility review, rather than a completely independent final implementation. Passing the suite does not establish equivalence for every possible input. This exercise did not add backend profile persistence, run backend tests, or verify live external services.

## 3.3.3 Further Experiment: Code Quality Review

### Experiment and review brief

The further experiment used the same assistant, Codex, to review selected frontend and backend modules and suggest refactoring. The review brief followed the code-quality question in the existing draft: examine the codebase, provide objective and constructive feedback, explain the findings, and prioritise possible refactoring. The assistant read the actual implementation and CI configuration. This was a source review supported by frontend test results, not a complete security audit or a backend runtime assessment.

The supplied draft also contains an earlier Claude review. That is a separate historical record. The findings below record this session's Codex review so that Sections 3.3.2 and 3.3.3 use the same assistant, as requested by the manual. They do not claim that Codex performed the earlier Claude conversation or independently inspected all of its claimed supporting materials.

### AI review findings

The client separates views, state coordination, services, and pure utilities. The profile reconstruction demonstrates the practical value of this separation: validation can be tested independently, while store tests verify message handling and directory updates. The roadmap store also protects against stale asynchronous results using a request counter, with tests covering both late success and late failure. The HTTP helper provides a shared error representation, reducing repeated handling in callers.

The following findings deserve attention:

| Priority | Finding and source | Suggested next step |
|---|---|---|
| High | `directory.ts` and `roadmapPlan.ts` consume local school data. `roadmapAiService.ts` simulates AI results, and `datasetService.ts` simulates dataset updates, while server school and AI code also exists. Frontend tests therefore do not prove these backend integrations work. | Connect services to the real endpoints incrementally; document simulated behaviour; add contract and integration checks for identifiers and payloads. |
| High | `auth.ts` determines the admin interface from a reserved username. `authenticator.py` exposes an authenticated requester dependency, without a role-specific dependency in that file. A client-side username check cannot establish server-side authorisation. | Define account roles and enforce them in the server dependencies used by privileged endpoints before relying on the UI restriction. |
| Medium | `Roadmap.save()` in `server/models/roadmap.py` first queries for an existing row, then calls a helper that opens a different session to create or update it. Concurrent first saves can race against the unique user constraint. | Use a single transaction and handle uniqueness conflicts explicitly; add a concurrent-save test. |
| Medium | `server/core/roadmap_ai.py` says the server should stop before the client's five-second limit but sets `AI_TIMEOUT_SECONDS = 10`. The client simulator defines `AI_TIMEOUT_MS = 5000`. | Agree on timeout behaviour before connecting the real AI service, then update constants, documentation, and integration tests together. |
| Medium | `list_schools()` in `server/routers/school_api.py` limits the maximum result count but does not declare non-negative bounds for `limit` or `offset`. | Specify accepted query ranges and test invalid pagination inputs at the API boundary. |
| Low | The first reconstructed `describeScore()` narrowed `TierId` using an assertion even though preschool and primary were valid inputs. | Use a partial mapping keyed by the full `TierId` type, so missing labels are represented in the type. This small improvement was applied during the reconstruction follow-up. |

The existing `.github/workflows/ci.yml` already includes frontend formatting, type checking, tests, and build, plus backend linting, formatting, and tests. The earlier draft's suggestion to add these checks should therefore be revised to acknowledge what already exists. This session verified the local frontend checks; it did not run GitHub Actions or the server test suite. The earlier draft also refers to `roadmap_rules.py`, which is absent from this checkout; that filename should not be presented as a verified refactoring target here.

### Outcome

The review produced concrete suggestions tied to files in the current checkout and corrected stale claims in the earlier draft. The small type-safety improvement was applied and checked as part of the final frontend validation. Larger service-integration, authorisation, persistence, timeout, and pagination changes remain recommendations; they were not implemented in this exercise.

## 3.3.4 Reflections

### Reflection for 3.3.2

We used Codex to reconstruct the `UserProfileController` responsibility after backing up and temporarily deleting both its Pinia store and validation utility. The assistant was given the existing black-box and store tests, testing documentation, relevant views, types, education definitions, and callers. The first generated implementation passed all 63 original focused tests and the 610-test frontend suite, meeting our initial expectation that these materials would communicate the required interface and core behaviour. However, comparison with the backup exposed numeric-format and error-message differences that the initial tests did not detect. A follow-up revision was therefore needed: ten additional checks first demonstrated the gaps, after which the implementation was corrected. The final result passed 73 focused tests and all 620 frontend tests, as well as type checking and the production build. This exercise showed us that AI can reconstruct tested behaviour quickly, but test coverage and human review determine how much confidence that result deserves. We would specify accepted numeric text formats and exact messages more explicitly in a future reconstruction.

### Reflection for 3.3.3

For the further experiment, we used the same assistant, Codex, to review selected modules in the current codebase and suggest refactoring. The review brief asked for objective feedback supported by code evidence. The assistant examined frontend stores and services, backend persistence and authentication code, and the CI workflow. It identified useful priorities, including connecting simulated frontend services to the backend, defining server-enforced roles, and making roadmap saves atomic. Follow-up checking was valuable because the earlier Claude draft suggested adding CI checks that already existed and referred to a file absent from this checkout. One small type-safety improvement was applied, while the larger changes were retained as recommendations. The outcome met our expectation for an actionable review, although the passing frontend suite did not validate backend behaviour or live integrations. We learned to treat AI review output as proposals that require verification against the current repository, rather than as a complete or automatically correct assessment.
