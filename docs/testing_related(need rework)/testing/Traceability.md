# Testing Traceability

## 1. Sources and Scope

The tables below link each tested requirement to its design class, code, and test cases.

- [Software requirements](../../WIP_for_coming_labs/SRS_2006_Team2.docx).
- [Design class diagram](<../../WIP_for_coming_labs/Class_Diagram(Design_Model).jpg>).

The controller logic is spread across frontend stores, helpers, and services.
These tests use a fake API.

## 2. Requirements to Tests

| Requirement / behavior | Design class | Method / file | Test cases | What we checked |
|---|---|---|---|---|
| UC-2.4; profile configuration main flow | UserProfileController | `client/src/stores/profile.ts::save()` | All BB cases | Save result, error message, request count, stored profile, and directory postal code |
| REQ-2.6 / REQ-2.7; valid target levels | UserProfileController | `profile.ts::save()` with level-dependent validation | BB-LEVEL-01/02 and the PSLE, L1R5, GPA, RP contexts | Validation and saving for all five education levels |
| REQ-2.8; PSLE whole-number 4-32 | UserProfileController | `client/src/utils/profileValidation.ts::validateProfile()`, invoked by save | BB-PSLE-01 through BB-PSLE-09 | Inclusive limits, fractions, text, and missing PSLE score |
| REQ-2.8; L1R5 whole-number 2-54 | UserProfileController | `validateProfile()`, invoked by save | BB-L1R5-01 through BB-L1R5-08 | Inclusive limits, fractions, and non-numeric results |
| REQ-2.8; GPA 0-4 | UserProfileController | `validateProfile()`, invoked by save | BB-GPA-01 through BB-GPA-07 | Inclusive limits and non-numeric results |
| REQ-2.8; RP 0-90 | UserProfileController | `validateProfile()`, invoked by save | BB-GPA-02/03/04; BB-RP-01/05/06/07 | Inclusive limits and non-numeric results |
| REQ-2.9 / REQ-2.16; six-digit postal format and error | UserProfileController | `save()` and `client/src/utils/postalCode.ts::isValidPostalCode()` | BB-POSTAL-01/03/04/05; BB-PSLE-02 | 5/6/7 characters, empty and non-digit input, and a leading zero |
| REQ-2.10; default proximity anchor | UserProfileController | `save()` and directory postal update | Every BB row | Valid saves update the directory postal code; invalid saves leave it unchanged |
| Acceptance assumption: ELR2B2 nonnegative integer | UserProfileController | `validateProfile()`, invoked by save | BB-L1R5-02; BB-ELR-02 through BB-ELR-05 | Assumed lower limit, fractions, and non-numeric input; the SRS gives no upper limit |
| Acceptance assumption: alternative result presence | UserProfileController | `validateProfile()`, invoked by save | BB-PAIR-01/04; BB-L1R5-02/03/06; BB-ELR-02/05; BB-GPA-02/05/06; BB-RP-05/06 | Either result or both can be used; both blank or an invalid result is rejected |
| Acceptance assumption: no numeric score at early levels | UserProfileController | `save()` | BB-LEVEL-01/02 | Preschool/primary acceptance with primary result None |
| UC-3.1; REQ-3.3; AI request orchestration | RoadmapController / AIRoadmapGenerator context | `client/src/stores/roadmap.ts::runAi()` | WB-AI-01 | A successful current request fills the AI plan |
| REQ-3.7; AI fault isolation | RoadmapController | `runAi()` | WB-AI-03 | An AI failure sets its error status and leaves the rule plan ready |
| Implementation property: stale results must not replace newer stage state | RoadmapController | `runAi()` and stage request invalidation | WB-AI-02/04 | A late success or failure does not overwrite the new stage |
| UC-4.1; REQ-4.1; review submission | ReviewController | `client/src/stores/reviews.ts::submit()` | WB-REV-03 | A successful submission adds the new review to the store |
| REQ-4.6; blank review rejection | ReviewController | `submit()` | WB-REV-01 | Blank-review message returned; no submission request |
| REQ-4.10 / BR-6; one review per account per school | ReviewController | `submit()` | WB-REV-02/04 | Duplicate blocked locally or refused by the fake server |
| REQ-4.12; generic failure handling support | ReviewController | `submit()` and HTTP error conversion | Supplementary network-error test in reviews.spec.ts | Error message returned and existing reviews kept |

The assumptions and expected error messages are listed in
[Black-Box Testing](./Black_Box_Testing.md). Section 4 explains how the 40 cases
cover the listed classes and boundaries without duplicate cases.

## 3. Basis Paths to Executable Tests

Both graphs have 11 edges and 9 nodes: `V(G) = 4`.
Inputs, expected outputs, and actual results are in [White-Box Testing](./White_Box_Testing.md).

| Method / CFG | Test ID | Path | Test name | Test file |
|---|---|---|---|---|
| runAi() / [CFG](./runAi_CFG.svg) | WB-AI-01 | 1-2-3-5-9 | fills the AI plan when it arrives | `client/src/stores/__tests__/roadmap.spec.ts` |
| runAi() / [CFG](./runAi_CFG.svg) | WB-AI-02 | 1-2-3-4-9 | ignores a late AI response after the stage has changed | `client/src/stores/__tests__/roadmap.spec.ts` |
| runAi() / [CFG](./runAi_CFG.svg) | WB-AI-03 | 1-2-6-8-9 | an AI failure is confined to the AI status and leaves the rule plan intact | `client/src/stores/__tests__/roadmap.spec.ts` |
| runAi() / [CFG](./runAi_CFG.svg) | WB-AI-04 | 1-2-6-7-9 | ignores a late AI error after the stage has changed | `client/src/stores/__tests__/roadmap.spec.ts` |
| submit() / [CFG](./submitReview_CFG.svg) | WB-REV-01 | 1-2-3-9 | rejects blank text %j (REQ-4.6) | `client/src/stores/__tests__/reviews.spec.ts` |
| submit() / [CFG](./submitReview_CFG.svg) | WB-REV-02 | 1-2-4-5-9 | allows only one review per school per account (BR-6) | `client/src/stores/__tests__/reviews.spec.ts` |
| submit() / [CFG](./submitReview_CFG.svg) | WB-REV-03 | 1-2-4-6-7-9 | adds a review that becomes the newest for that school | `client/src/stores/__tests__/reviews.spec.ts` |
| submit() / [CFG](./submitReview_CFG.svg) | WB-REV-04 | 1-2-4-6-8-9 | shows the server’s refusal when it knows better | `client/src/stores/__tests__/reviews.spec.ts` |

WB-REV-01 uses an empty string for its basis path. The same test also runs with
whitespace and empty HTML.

## 4. Execution Results

Executed on 2026-10-29: **68 files / 890 tests passed, 0 failed, 0 skipped**.
The total includes all 40 black-box cases and eight white-box basis-case IDs.

The run checks frontend behavior with a fake API. Backend security, database
behavior, live AI results, and UI rendering need separate tests.
