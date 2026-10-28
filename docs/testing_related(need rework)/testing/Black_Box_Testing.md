# Black-Box Testing

## 1. Selected Control Class

The selected control class is `UserProfileController`.

In the design model, `UserProfileController` is responsible for handling and validating
student profile information.

In the implementation, this responsibility is mainly realised by:

- `client/src/stores/profile.ts`
- `client/src/utils/profileValidation.ts`

The automated tests are implemented using Vitest in:

- `client/src/utils/__tests__/profileValidation.spec.ts`

## 2. Testing Techniques

The following black-box testing techniques are applied:

- Equivalence Class Partitioning
- Boundary Value Analysis

The test cases are selected to cover representative valid and invalid input classes while
minimising unnecessary duplicate test inputs.

---

## 3. PSLE Achievement Level

Valid PSLE Achievement Level:

- Whole number only
- Minimum: 4
- Maximum: 32

### Equivalence Classes

| Class | Input | Expected Behaviour |
|---|---|---|
| Valid | Whole number from 4 to 32 | Accept |
| Invalid | Whole number below 4 | Reject |
| Invalid | Whole number above 32 | Reject |
| Invalid | Decimal number | Reject |
| Invalid | Non-numeric input | Reject |
| Invalid | Blank input | Reject |

### Boundary Value Test Cases

| Test ID | Test Input | Test Category | Expected Output | Actual Output | Result |
|---|---:|---|---|---|---|
| BB-PSLE-01 | 3 | Lower boundary - 1 | Reject with PSLE AL error | Rejected with PSLE AL error | Pass |
| BB-PSLE-02 | 4 | Lower boundary | Accept | Accepted | Pass |
| BB-PSLE-03 | 5 | Lower boundary + 1 | Accept | Accepted | Pass |
| BB-PSLE-04 | 31 | Upper boundary - 1 | Accept | Accepted | Pass |
| BB-PSLE-05 | 32 | Upper boundary | Accept | Accepted | Pass |
| BB-PSLE-06 | 33 | Upper boundary + 1 | Reject with PSLE AL error | Rejected with PSLE AL error | Pass |
| BB-PSLE-07 | 8.5 | Invalid decimal class | Reject with PSLE AL error | Rejected with PSLE AL error | Pass |
| BB-PSLE-08 | abc | Invalid non-numeric class | Reject with PSLE AL error | Rejected with PSLE AL error | Pass |
| BB-PSLE-09 | blank | Invalid blank class | Reject with PSLE AL error | Rejected with PSLE AL error | Pass |

---

## 4. L1R5 Aggregate

Valid L1R5 aggregate:

- Whole number only
- Minimum: 2
- Maximum: 54

### Equivalence Classes

| Class | Input | Expected Behaviour |
|---|---|---|
| Valid | Whole number from 2 to 54 | Accept |
| Invalid | Whole number below 2 | Reject |
| Invalid | Whole number above 54 | Reject |
| Invalid | Decimal number | Reject |
| Invalid | Non-numeric input | Reject |

### Boundary Value Test Cases

| Test ID | Test Input | Test Category | Expected Output | Actual Output | Result |
|---|---:|---|---|---|---|
| BB-L1R5-01 | 1 | Lower boundary - 1 | Reject with L1R5 error | Rejected with L1R5 error | Pass |
| BB-L1R5-02 | 2 | Lower boundary | Accept | Accepted | Pass |
| BB-L1R5-03 | 3 | Lower boundary + 1 | Accept | Accepted | Pass |
| BB-L1R5-04 | 53 | Upper boundary - 1 | Accept | Accepted | Pass |
| BB-L1R5-05 | 54 | Upper boundary | Accept | Accepted | Pass |
| BB-L1R5-06 | 55 | Upper boundary + 1 | Reject with L1R5 error | Rejected with L1R5 error | Pass |
| BB-L1R5-07 | 9.5 | Invalid decimal class | Reject with L1R5 error | Rejected with L1R5 error | Pass |
| BB-L1R5-08 | x | Invalid non-numeric class | Reject with L1R5 error | Rejected with L1R5 error | Pass |

---

## 5. Polytechnic GPA

Valid GPA:

- Numeric value
- Minimum: 0.00
- Maximum: 4.00

### Equivalence Classes

| Class | Input | Expected Behaviour |
|---|---|---|
| Valid | Numeric value from 0.00 to 4.00 | Accept |
| Invalid | Value below 0.00 | Reject |
| Invalid | Value above 4.00 | Reject |
| Invalid | Non-numeric input | Reject |

### Boundary Value Test Cases

| Test ID | Test Input | Test Category | Expected Output | Actual Output | Result |
|---|---:|---|---|---|---|
| BB-GPA-01 | -0.01 | Lower boundary - 0.01 | Reject with GPA error | Rejected with GPA error | Pass |
| BB-GPA-02 | 0 | Lower boundary | Accept | Accepted | Pass |
| BB-GPA-03 | 0.01 | Just above lower boundary | Accept | Accepted | Pass |
| BB-GPA-04 | 3.99 | Just below upper boundary | Accept | Accepted | Pass |
| BB-GPA-05 | 4 | Upper boundary | Accept | Accepted | Pass |
| BB-GPA-06 | 4.01 | Just above upper boundary | Reject with GPA error | Rejected with GPA error | Pass |
| BB-GPA-07 | abc | Invalid non-numeric class | Reject with GPA error | Rejected with GPA error | Pass |

---

## 6. A-Level Rank Points

Valid A-Level Rank Points:

- Numeric value
- Minimum: 0
- Maximum: 90

### Equivalence Classes

| Class | Input | Expected Behaviour |
|---|---|---|
| Valid | Numeric value from 0 to 90 | Accept |
| Invalid | Value below 0 | Reject |
| Invalid | Value above 90 | Reject |
| Invalid | Non-numeric input | Reject |

### Boundary Value Test Cases

| Test ID | Test Input | Test Category | Expected Output | Actual Output | Result |
|---|---:|---|---|---|---|
| BB-RP-01 | -0.01 | Below lower boundary | Reject with Rank Points error | Rejected with Rank Points error | Pass |
| BB-RP-02 | 0 | Lower boundary | Accept | Accepted | Pass |
| BB-RP-03 | 0.01 | Just above lower boundary | Accept | Accepted | Pass |
| BB-RP-04 | 89.99 | Just below upper boundary | Accept | Accepted | Pass |
| BB-RP-05 | 90 | Upper boundary | Accept | Accepted | Pass |
| BB-RP-06 | 90.01 | Above upper boundary | Reject with Rank Points error | Rejected with Rank Points error | Pass |
| BB-RP-07 | rp | Invalid non-numeric class | Reject with Rank Points error | Rejected with Rank Points error | Pass |

---

## 7. Execution Result

The automated black-box tests were executed using Vitest.

Command used:

```bash
npm test -- profileValidation.spec.ts