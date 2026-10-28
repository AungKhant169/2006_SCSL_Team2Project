# Testing Deliverables

This folder contains the testing work products for the SC2006 project.

## 1. Black-Box Testing

Documentation:

[Black-Box Testing](./Black_Box_Testing.md)

Selected design control class:

`UserProfileController`

Implementation:

- `client/src/stores/profile.ts`
- `client/src/utils/profileValidation.ts`

Testing techniques:

- Equivalence Class Partitioning
- Boundary Value Analysis

Automated test implementation:

`client/src/utils/__tests__/profileValidation.spec.ts`

Focused test result:

```text
Test Files  1 passed (1)
Tests       53 passed (53)
```

---

## 2. White-Box Testing

Documentation:

[White-Box Testing](./White_Box_Testing.md)

Two methods were selected for Basis Path Testing.

### 2.1 `runAi()`

Implementation:

`client/src/stores/roadmap.ts`

Control Flow Graph:

[runAi CFG](./runAi_CFG.jpg)

Cyclomatic Complexity:

```text
V(G) = 4
```

Independent paths:

```text
P1 – Successful current AI request
P2 – Successful stale AI request
P3 – Failed current AI request
P4 – Failed stale AI request
```

Automated test implementation:

`client/src/stores/__tests__/roadmap.spec.ts`

Focused test result:

```text
Test Files  1 passed (1)
Tests       22 passed (22)
```

### 2.2 `submit()`

Implementation:

`client/src/stores/reviews.ts`

Control Flow Graph:

[submitReview CFG](./submitReview_CFG.jpg)

Cyclomatic Complexity:

```text
V(G) = 3
```

Independent paths:

```text
P1 – Blank review rejected
P2 – Duplicate review rejected
P3 – Valid review stored
```

Automated test implementation:

`client/src/stores/__tests__/reviews.spec.ts`

Focused test result:

```text
Test Files  1 passed (1)
Tests       18 passed (18)
```

---

## 3. Traceability

Documentation:

[Testing Traceability](./Traceability.md)

The testing artefacts demonstrate traceability from:

```text
Requirements / Use Cases
        ↓
Design Classes
        ↓
Implementation
        ↓
Test Cases
```

The selected areas are:

- User Profile Validation
- AI Roadmap Generation
- School Review Submission

---

## 4. Final Regression Test

After completing the additional testing work, the complete frontend
automated test suite was executed.

Command:

```bash
npm test
```

Result:

```text
Test Files  55 passed (55)
Tests       610 passed (610)
```

All frontend automated tests passed successfully.

---

## 5. Files in This Folder

| File | Purpose |
|---|---|
| `Black_Box_Testing.md` | Equivalence Class and Boundary Value testing documentation |
| `White_Box_Testing.md` | Basis Path testing documentation |
| `Traceability.md` | Requirements-to-tests traceability |
| `runAi_CFG.jpg` | Control Flow Graph for `runAi()` |
| `submitReview_CFG.jpg` | Control Flow Graph for review `submit()` |