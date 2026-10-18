# Testing Traceability

## 1. Overview

This document demonstrates traceability from software requirements and use cases
to the design model, implementation, and corresponding test cases.

The selected testing work covers:

- User profile validation
- AI roadmap generation
- School review submission

---

## 2. Traceability Matrix

| Requirement / Use Case | Design Element | Implementation | Test Technique | Test Implementation |
|---|---|---|---|---|
| UC-2.4 User Profile | `UserProfileController` | `client/src/stores/profile.ts`; `client/src/utils/profileValidation.ts` | Equivalence Class Partitioning and Boundary Value Analysis | `client/src/utils/__tests__/profileValidation.spec.ts` |
| UC-3.1 Generate Roadmap | `RoadmapController`, `AIRoadmapGenerator` | `client/src/stores/roadmap.ts` — `runAi()` | Basis Path Testing | `client/src/stores/__tests__/roadmap.spec.ts` |
| UC-4.1 Submit School Review | `ReviewController` | `client/src/stores/reviews.ts` — `submit()` | Basis Path Testing | `client/src/stores/__tests__/reviews.spec.ts` |

---

## 3. User Profile Validation Traceability

### Requirement / Use Case

UC-2.4 concerns the student's user profile, including academic information
and residential postal code used by the application.

### Design

The corresponding control class in the design model is:

`UserProfileController`

### Implementation

The relevant implementation is divided between:

- `client/src/stores/profile.ts`
- `client/src/utils/profileValidation.ts`

The profile store coordinates profile operations, while `validateProfile()`
performs validation of the submitted profile values.

### Testing

Black-box testing was performed using:

- Equivalence Class Partitioning
- Boundary Value Analysis

The tested inputs include:

- PSLE Achievement Level
- L1R5 aggregate# Testing Traceability

## 1. Overview

This document demonstrates traceability from the software requirements and use cases
to the design model, implementation, and test cases.

The selected testing work covers three important areas of the system:

1. User profile validation
2. AI-generated education roadmap
3. School review submission

The testing techniques used are:

- Equivalence Class Partitioning
- Boundary Value Analysis
- Basis Path Testing

Detailed black-box and white-box testing documentation can be found in:

- [Black-Box Testing](./Black_Box_Testing.md)
- [White-Box Testing](./White_Box_Testing.md)

---

## 2. Traceability Matrix

| Requirement / Use Case | Design Element | Implementation | Testing Technique | Test Implementation |
|---|---|---|---|---|
| UC-2.4 User Profile / profile validation | `UserProfileController` | `client/src/stores/profile.ts` and `client/src/utils/profileValidation.ts` | Equivalence Class Partitioning and Boundary Value Analysis | `client/src/utils/__tests__/profileValidation.spec.ts` |
| UC-3.1 Generate Education Roadmap | `RoadmapController`, `AIRoadmapGenerator` | `client/src/stores/roadmap.ts` — `runAi()` | Basis Path Testing | `client/src/stores/__tests__/roadmap.spec.ts` |
| UC-4.1 Submit School Review | `ReviewController` | `client/src/stores/reviews.ts` — `submit()` | Basis Path Testing | `client/src/stores/__tests__/reviews.spec.ts` |

---

# 3. User Profile Validation

## 3.1 Requirement / Use Case

The user profile contains information used by the education planning functions,
including the student's target education level, academic results, and postal code.

Profile information is also used during roadmap generation. For example, UC-3.1
uses saved user preferences and handles the case where a postal code is missing.

## 3.2 Design

The corresponding control class in the design model is:

`UserProfileController`

Its responsibility is to coordinate user profile operations and profile validation.

## 3.3 Implementation

The relevant implementation is divided between:

- `client/src/stores/profile.ts`
- `client/src/utils/profileValidation.ts`

`profile.ts` manages the student profile state and profile-saving operation.

`validateProfile()` in `profileValidation.ts` performs validation of the academic
results and postal code.

## 3.4 Testing

Black-box testing was performed using:

- Equivalence Class Partitioning
- Boundary Value Analysis

The selected test inputs cover:

- PSLE Achievement Level
- L1R5 aggregate
- Polytechnic GPA
- A-Level Rank Points
- invalid numeric inputs
- non-numeric inputs
- blank inputs

The detailed test design is documented in:

[Black-Box Testing](./Black_Box_Testing.md)

The automated tests are implemented in:

`client/src/utils/__tests__/profileValidation.spec.ts`

Focused test execution:

    npm test -- profileValidation.spec.ts

Result:

    Test Files  1 passed (1)
    Tests       53 passed (53)

All profile validation tests passed.

## 3.5 Traceability Chain

`User Profile Requirements`

→ `UserProfileController`

→ `profile.ts / profileValidation.ts`

→ Equivalence Classes and Boundary Values

→ `profileValidation.spec.ts`

---

# 4. AI-Generated Education Roadmap

## 4.1 Requirement / Use Case

UC-3.1 — Generate Education Roadmap allows an authenticated user to generate an
education roadmap using both rule-based and AI-generated approaches.

The use case specifies that the system invokes the AI-generated plan asynchronously.
It also defines an alternative flow for AI failure or timeout.

## 4.2 Design

The relevant design elements are:

- `RoadmapController`
- `AIRoadmapGenerator`

These design elements coordinate roadmap generation and AI-based recommendation
logic.

## 4.3 Implementation

The frontend roadmap control logic is implemented in:

`client/src/stores/roadmap.ts`

The selected method for white-box testing is:

`runAi()`

The method handles:

- starting an AI roadmap request;
- processing a successful AI response;
- handling an AI failure;
- ignoring a stale successful response;
- ignoring a stale failed response.

## 4.4 White-Box Testing

Basis Path Testing was performed on `runAi()`.

The Control Flow Graph was created using Visual Paradigm:

[runAi Control Flow Graph](./runAi_CFG.jpg)

The CFG contains the following important branch points:

1. successful AI request or exception;
2. whether a successful request has become stale;
3. whether a failed request has become stale.

Cyclomatic Complexity:

    V(G) = 4

Therefore, four independent paths were identified.

| Path | Execution Condition | Expected Result |
|---|---|---|
| P1 | AI succeeds and request is current | Store AI choices and set status to `ready` |
| P2 | AI succeeds but request is stale | Ignore stale response |
| P3 | AI fails and request is current | Set status to `error` |
| P4 | AI fails but request is stale | Ignore stale error |

The automated tests are implemented in:

`client/src/stores/__tests__/roadmap.spec.ts`

Relevant tests include:

- `fills the AI plan when it arrives`
- `ignores a late AI response after the stage has changed`
- `an AI failure is confined to the AI status and leaves the rule plan intact`
- `ignores a late AI error after the stage has changed`

Focused test execution:

    npm test -- roadmap.spec.ts

Result:

    Test Files  1 passed (1)
    Tests       22 passed (22)

All roadmap tests passed.

## 4.5 Traceability Chain

`UC-3.1 Generate Education Roadmap`

→ `RoadmapController / AIRoadmapGenerator`

→ `roadmap.ts::runAi()`

→ CFG

→ Basis Paths P1–P4

→ `roadmap.spec.ts`

---

# 5. School Review Submission

## 5.1 Requirement / Use Case

UC-4.1 — Submit School Review allows an authenticated user to submit a review on a
school profile.

The use case requires the system to:

- sanitise review input;
- reject blank reviews;
- save valid reviews;
- allow only one review per school from a single user account.

## 5.2 Design

The corresponding control class is:

`ReviewController`

It is responsible for coordinating review-related operations.

## 5.3 Implementation

The review submission logic is implemented in:

`client/src/stores/reviews.ts`

The selected method for white-box testing is:

`submit()`

The method:

1. sanitises the submitted review text;
2. rejects blank review text;
3. checks whether the user already has a review for the school;
4. rejects duplicate reviews;
5. stores a valid new review.

## 5.4 White-Box Testing

Basis Path Testing was performed on `submit()`.

The Control Flow Graph was created using Visual Paradigm:

[submitReview Control Flow Graph](./submitReview_CFG.jpg)

The method contains two decision points:

1. whether the sanitised review text is blank;
2. whether the user has already reviewed the school.

Cyclomatic Complexity:

    V(G) = 3

Therefore, three independent paths were identified.

| Path | Execution Condition | Expected Result |
|---|---|---|
| P1 | Review text is blank | Return blank-review error |
| P2 | Review is valid but user already reviewed the school | Return duplicate-review error |
| P3 | Review is valid and no existing review exists | Store review successfully |

The automated tests are implemented in:

`client/src/stores/__tests__/reviews.spec.ts`

Relevant tests include:

- `rejects blank text`
- `allows only one review per school per account`
- `adds a review that becomes the newest for that school`

Focused test execution:

    npm test -- reviews.spec.ts

Result:

    Test Files  1 passed (1)
    Tests       18 passed (18)

All review tests passed.

## 5.5 Traceability Chain

`UC-4.1 Submit School Review`

→ `ReviewController`

→ `reviews.ts::submit()`

→ CFG

→ Basis Paths P1–P3

→ `reviews.spec.ts`

---

# 6. Testing Artefact Summary

| Testing Area | Documentation | CFG | Automated Test File | Result |
|---|---|---|---|---|
| User Profile Validation | `Black_Box_Testing.md` | Not applicable | `profileValidation.spec.ts` | 53 passed |
| AI Roadmap Generation | `White_Box_Testing.md` | `runAi_CFG.jpg` | `roadmap.spec.ts` | 22 passed |
| Review Submission | `White_Box_Testing.md` | `submitReview_CFG.jpg` | `reviews.spec.ts` | 18 passed |

---

# 7. Final Regression Test

After completing the additional black-box and white-box testing work, the complete
frontend automated test suite was executed again.

Command:

    npm test

Final execution result:

    Test Files  55 passed (55)
    Tests       610 passed (610)

All 610 automated tests passed successfully.

This final regression test provides confidence that the additional testing work did
not introduce regressions into the existing frontend functionality.

---

# 8. Overall Traceability

The completed testing work demonstrates the following overall traceability:

### User Profile Validation

`Profile Requirements`

→ `UserProfileController`

→ `profile.ts / profileValidation.ts`

→ Equivalence Class Partitioning + Boundary Value Analysis

→ `profileValidation.spec.ts`

### AI Roadmap Generation

`UC-3.1 Generate Education Roadmap`

→ `RoadmapController / AIRoadmapGenerator`

→ `roadmap.ts::runAi()`

→ Basis Path Testing

→ `roadmap.spec.ts`

### School Review Submission

`UC-4.1 Submit School Review`

→ `ReviewController`

→ `reviews.ts::submit()`

→ Basis Path Testing

→ `reviews.spec.ts`
- Polytechnic GPA
- A-Level Rank Points
- invalid input classes

Automated tests are located in:

`client/src/utils/__tests__/profileValidation.spec.ts`

The focused test execution completed successfully:

```text
Test Files  1 passed (1)
Tests       53 passed (53)