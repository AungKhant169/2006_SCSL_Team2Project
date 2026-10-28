# Black-Box Testing

Authors: SC2006 SCSL Team 2

## 1. What We Tested

We tested profile saving with equivalence class partitioning and boundary value
analysis. The `UserProfileController` logic is in `useProfileStore().save()` in
`client/src/stores/profile.ts`, with validation in `client/src/utils/profileValidation.ts`.
We checked the returned result, error message, save request, stored profile, and
postal code used for distance calculations.

- Tests: `client/src/stores/__tests__/profileBlackBox.spec.ts`.
- Inputs and expected outputs: `client/src/test/profileBlackBoxCases.ts`.
- Specification: `docs/WIP_for_coming_labs/SRS_2006_Team2.docx`.
- The tests use a fake API. Postal code tests check the six-digit format.

## 2. Requirements and Assumptions

REQ-2.8 gives the score limits: PSLE 4-32 and L1R5 2-54 must be integers;
GPA is 0-4 and RP is 0-90. All limits are inclusive. REQ-2.9/2.16 cover postal
code validation and its error message. REQ-2.10 covers the saved postal code,
and REQ-2.6/2.7 cover the fields shown for each education level.

We used the following assumptions where the SRS leaves details open. These are
marked in the test data:

- Post-secondary and university profiles require either result or both; every supplied result must be valid.
- ELR2B2 is a nonnegative integer. Since the SRS gives no limits, we tested the assumed lower limit of 0 but did not set an upper limit.
- Preschool and primary profiles require no numeric score; primary result is `None`.
- Academic errors start with `Invalid academic score!`, as specified in the SRS. We also check the full field-specific messages used by the application.

The SRS does not specify decimal precision or every allowed number format. We used
0.01 to test either side of decimal boundaries; this does not impose a two-decimal limit.

## 3. Equivalence Classes

Inputs are strings, and `""` means empty. Each invalid case checks one input problem
at a time. For the two optional result fields, leaving both empty is a separate case.
We combined valid values in the same test where possible and checked that the save succeeded.

### 3.1 Academic Results

| Class ID | Definition | Representative test |
|---|---|---|
| PSLE-VALID | Whole-number score 4-32 | BB-PSLE-02 |
| PSLE-LOW | Whole-number score below 4 | BB-PSLE-01 |
| PSLE-HIGH | Whole-number score above 32 | BB-PSLE-06 |
| PSLE-FRACTION | Number with a fractional part | BB-PSLE-07 |
| PSLE-TEXT | Non-numeric text | BB-PSLE-08 |
| PSLE-MISSING | No PSLE result at secondary level | BB-PSLE-09 |
| L1R5-VALID | Whole-number score 2-54 | BB-L1R5-02 |
| L1R5-LOW | Whole-number score below 2 | BB-L1R5-01 |
| L1R5-HIGH | Whole-number score above 54 | BB-L1R5-06 |
| L1R5-FRACTION | Number with a fractional part | BB-L1R5-07 |
| L1R5-TEXT | Non-numeric text | BB-L1R5-08 |
| GPA-VALID | Numeric score 0-4 | BB-GPA-02 |
| GPA-LOW | Numeric score below 0 | BB-GPA-01 |
| GPA-HIGH | Numeric score above 4 | BB-GPA-06 |
| GPA-TEXT | Non-numeric text | BB-GPA-07 |
| RP-VALID | Numeric score 0-90 | BB-GPA-02 |
| RP-LOW | Numeric score below 0 | BB-RP-01 |
| RP-HIGH | Numeric score above 90 | BB-RP-06 |
| RP-TEXT | Non-numeric text | BB-RP-07 |
| ELR-VALID | Nonnegative integer (assumption) | BB-L1R5-02 |
| ELR-LOW | Negative integer (assumption) | BB-ELR-03 |
| ELR-FRACTION | Number with a fractional part (assumption) | BB-ELR-04 |
| ELR-TEXT | Non-numeric text | BB-ELR-05 |

### 3.2 Postal Code

| Class ID | Definition | Representative test |
|---|---|---|
| POSTAL-VALID | Six digits; leading zeros are allowed | BB-PSLE-02 |
| POSTAL-MISSING | Empty string | BB-POSTAL-04 |
| POSTAL-SHORT | Nonempty digit string shorter than six | BB-POSTAL-01 |
| POSTAL-LONG | Digit string longer than six | BB-POSTAL-03 |
| POSTAL-NONDIGIT | Nonempty string containing a nondigit | BB-POSTAL-05 uses six characters to isolate format from length |

### 3.3 Optional Results

| Input context | Expected behavior | Representative test |
|---|---|---|
| `preschool`; no score | Accept | BB-LEVEL-01 |
| `primary`; no score; primary result None | Accept | BB-LEVEL-02 |
| `secondary`; valid PSLE | Accept | BB-PSLE-02 |
| `postsec`; only valid L1R5 | Accept | BB-L1R5-03 |
| `postsec`; only valid ELR2B2 | Accept | BB-ELR-02 |
| `postsec`; both valid | Accept | BB-L1R5-02 |
| `postsec`; neither supplied | Reject: no result entered | BB-PAIR-01 |
| `postsec`; invalid first, valid second | Reject first field | BB-L1R5-06 |
| `postsec`; valid first, invalid second | Reject second field | BB-ELR-05 |
| `uni`; only valid GPA | Accept | BB-GPA-05 |
| `uni`; only valid RP | Accept | BB-RP-05 |
| `uni`; both valid | Accept | BB-GPA-02 |
| `uni`; neither supplied | Reject: no result entered | BB-PAIR-04 |
| `uni`; invalid first, valid second | Reject first field | BB-GPA-06 |
| `uni`; valid first, invalid second | Reject second field | BB-RP-06 |

An optional result can be blank when the other result is valid. The cases cover
all five education levels.

## 4. Boundary Values and Minimum Case Count

| Parameter | Boundary selections | Test IDs in value order |
|---|---|---|
| PSLE | 3, 4, 5; 31, 32, 33 | BB-PSLE-01 through BB-PSLE-06 |
| L1R5 | 1, 2, 3; 53, 54, 55 | BB-L1R5-01 through BB-L1R5-06 |
| GPA | -0.01, 0, 0.01; 3.99, 4, 4.01 | BB-GPA-01 through BB-GPA-06 |
| RP | -0.01, 0, 0.01; 89.99, 90, 90.01 | BB-RP-01, BB-GPA-02, BB-GPA-03, BB-GPA-04, BB-RP-05, BB-RP-06 |
| Postal length | 5, 6, 7 characters | BB-POSTAL-01, BB-PSLE-02, BB-POSTAL-03 |
| ELR2B2 assumed lower bound | -1, 0, 1 | BB-ELR-03, BB-L1R5-02, BB-ELR-02 |

For the classes, boundary values, and result combinations listed here, we need
40 cases: 24 invalid and 16 valid. This keeps each invalid input problem separate.

| Invalid inputs | Cases needed |
|---|---:|
| PSLE: below range, above range, fraction, text, missing | 5 |
| L1R5: below range, above range, fraction, text | 4 |
| GPA: below range, above range, text | 3 |
| RP: below range, above range, text | 3 |
| Postal: short, long, missing, nondigit | 4 |
| ELR2B2: negative, fraction, text | 3 |
| Post-secondary/university: neither result supplied | 2 |
| Total | 24 |

The 24 invalid cases each check a different problem. We check valid boundary values
in successful saves so that another error cannot hide the result.

| Education level | Cases needed | Reason |
|---|---:|---|
| Secondary | 4 | Four different valid PSLE boundary values |
| Post-secondary | 5 | Four L1R5 boundary values and one ELR2B2-only case; these also check ELR2B2 0/1 and both results together |
| University | 5 | Eight GPA/RP boundary values covered by three combined cases and two single-result cases |
| Preschool | 1 | No score required |
| Primary | 1 | No score required |
| Total | 16 | |

University needs five valid cases: three check GPA and RP together, one checks GPA
alone, and one checks RP alone. Four cases would miss a boundary value or a single-result
combination. BB-PSLE-02 also checks a valid postal code with a leading zero. Invalid
score cases with a valid alternative are included in the boundary tests.

## 5. Preconditions and Output Codes

Each test starts with a new Pinia instance and fake API, logged in as `planner2026`.
The saved profile starts at secondary level with score 12, postal code `654321`, and
primary result `None`. The directory also starts with postal code `654321`.
We set the form state directly before calling `save()` so the input filter cannot
change an invalid postal code before it is tested.

For a valid profile, we expect `true`, no error, one PUT request, and the correct
saved scores and postal code. The directory postal code should also update.
For an invalid profile, we expect `false`, the correct error, no PUT request, and
no change to the saved profile or directory postal code. The `saving` flag should
be false when the operation finishes.

`OK` means an empty inline error. Other codes represent these exact messages:

| Code | Exact inline error |
|---|---|
| E-POSTAL | `Please enter a valid 6-digit Singapore postal code.` |
| E-PSLE | `Invalid academic score! PSLE AL must be a whole number from 4 to 32.` |
| E-L1R5 | `Invalid academic score! L1R5 must be a whole number from 2 to 54.` |
| E-GPA | `Invalid academic score! GPA must be between 0.00 and 4.00.` |
| E-RP | `Invalid academic score! Rank points must be between 0 and 90.` |
| E-ELR | `Invalid academic score! ELR2B2 must be a whole number.` |
| E-POSTSEC-MISSING | `Invalid academic score! Enter an L1R5 or ELR2B2 aggregate.` |
| E-UNI-MISSING | `Invalid academic score! Enter a polytechnic GPA or A-Level rank points.` |

## 6. Test Cases and Results

The expected and actual columns show `return value / error code`. Each test also
checks the request count, saved profile, and directory postal code.

| Test ID | level | scoreA | scoreB | postal | Class; technique | Expected | Actual | Result |
|---|---|---|---|---|---|---|---|---|
| BB-PSLE-01 | secondary | `"3"` | `""` | `"119077"` | PSLE-LOW; EC+BVA | `false / E-PSLE` | `false / E-PSLE` | Pass |
| BB-PSLE-02 | secondary | `"4"` | `""` | `"012345"` | PSLE-VALID, POSTAL-VALID, POSTAL-LEADING-ZERO; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-PSLE-03 | secondary | `"5"` | `""` | `"119077"` | PSLE-VALID; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-PSLE-04 | secondary | `"31"` | `""` | `"119077"` | PSLE-VALID; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-PSLE-05 | secondary | `"32"` | `""` | `"119077"` | PSLE-VALID; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-PSLE-06 | secondary | `"33"` | `""` | `"119077"` | PSLE-HIGH; EC+BVA | `false / E-PSLE` | `false / E-PSLE` | Pass |
| BB-PSLE-07 | secondary | `"8.5"` | `""` | `"119077"` | PSLE-FRACTION; EC | `false / E-PSLE` | `false / E-PSLE` | Pass |
| BB-PSLE-08 | secondary | `"abc"` | `""` | `"119077"` | PSLE-TEXT; EC | `false / E-PSLE` | `false / E-PSLE` | Pass |
| BB-PSLE-09 | secondary | `""` | `""` | `"119077"` | PSLE-MISSING; EC | `false / E-PSLE` | `false / E-PSLE` | Pass |
| BB-L1R5-01 | postsec | `"1"` | `""` | `"119077"` | L1R5-LOW; EC+BVA | `false / E-L1R5` | `false / E-L1R5` | Pass |
| BB-L1R5-02 | postsec | `"2"` | `"0"` | `"119077"` | L1R5-VALID, ELR-VALID, POSTSEC-BOTH; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-L1R5-03 | postsec | `"3"` | `""` | `"119077"` | L1R5-VALID, POSTSEC-ONLY-FIRST; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-L1R5-04 | postsec | `"53"` | `""` | `"119077"` | L1R5-VALID; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-L1R5-05 | postsec | `"54"` | `""` | `"119077"` | L1R5-VALID; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-L1R5-06 | postsec | `"55"` | `"14"` | `"119077"` | L1R5-HIGH, POSTSEC-INVALID-FIRST; EC+BVA | `false / E-L1R5` | `false / E-L1R5` | Pass |
| BB-L1R5-07 | postsec | `"9.5"` | `""` | `"119077"` | L1R5-FRACTION; EC | `false / E-L1R5` | `false / E-L1R5` | Pass |
| BB-L1R5-08 | postsec | `"abc"` | `""` | `"119077"` | L1R5-TEXT; EC | `false / E-L1R5` | `false / E-L1R5` | Pass |
| BB-GPA-01 | uni | `"-0.01"` | `""` | `"119077"` | GPA-LOW; EC+BVA | `false / E-GPA` | `false / E-GPA` | Pass |
| BB-GPA-02 | uni | `"0"` | `"0"` | `"119077"` | GPA-VALID, RP-VALID, UNI-BOTH; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-GPA-03 | uni | `"0.01"` | `"0.01"` | `"119077"` | GPA-VALID, RP-VALID, UNI-BOTH; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-GPA-04 | uni | `"3.99"` | `"89.99"` | `"119077"` | GPA-VALID, RP-VALID, UNI-BOTH; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-GPA-05 | uni | `"4"` | `""` | `"119077"` | GPA-VALID, UNI-ONLY-FIRST; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-GPA-06 | uni | `"4.01"` | `"72.5"` | `"119077"` | GPA-HIGH, UNI-INVALID-FIRST; EC+BVA | `false / E-GPA` | `false / E-GPA` | Pass |
| BB-GPA-07 | uni | `"abc"` | `""` | `"119077"` | GPA-TEXT; EC | `false / E-GPA` | `false / E-GPA` | Pass |
| BB-RP-01 | uni | `""` | `"-0.01"` | `"119077"` | RP-LOW; EC+BVA | `false / E-RP` | `false / E-RP` | Pass |
| BB-RP-05 | uni | `""` | `"90"` | `"119077"` | RP-VALID, UNI-ONLY-SECOND; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-RP-06 | uni | `"3.5"` | `"90.01"` | `"119077"` | RP-HIGH, UNI-INVALID-SECOND; EC+BVA | `false / E-RP` | `false / E-RP` | Pass |
| BB-RP-07 | uni | `""` | `"abc"` | `"119077"` | RP-TEXT; EC | `false / E-RP` | `false / E-RP` | Pass |
| BB-POSTAL-01 | secondary | `"8"` | `""` | `"12345"` | POSTAL-SHORT; EC+BVA | `false / E-POSTAL` | `false / E-POSTAL` | Pass |
| BB-POSTAL-03 | secondary | `"8"` | `""` | `"1234567"` | POSTAL-LONG; EC+BVA | `false / E-POSTAL` | `false / E-POSTAL` | Pass |
| BB-POSTAL-04 | secondary | `"8"` | `""` | `""` | POSTAL-MISSING; EC | `false / E-POSTAL` | `false / E-POSTAL` | Pass |
| BB-POSTAL-05 | secondary | `"8"` | `""` | `"12345a"` | POSTAL-NONDIGIT; EC | `false / E-POSTAL` | `false / E-POSTAL` | Pass |
| BB-ELR-02 | postsec | `""` | `"1"` | `"119077"` | ELR-VALID, POSTSEC-ONLY-SECOND; EC+BVA | `true / OK` | `true / OK` | Pass |
| BB-ELR-03 | postsec | `"12"` | `"-1"` | `"119077"` | ELR-LOW; EC+BVA | `false / E-ELR` | `false / E-ELR` | Pass |
| BB-ELR-04 | postsec | `"12"` | `"8.5"` | `"119077"` | ELR-FRACTION; EC | `false / E-ELR` | `false / E-ELR` | Pass |
| BB-ELR-05 | postsec | `"12"` | `"abc"` | `"119077"` | ELR-TEXT, POSTSEC-INVALID-SECOND; EC | `false / E-ELR` | `false / E-ELR` | Pass |
| BB-LEVEL-01 | preschool | `""` | `""` | `"119077"` | LEVEL-PRESCHOOL; EC | `true / OK` | `true / OK` | Pass |
| BB-LEVEL-02 | primary | `""` | `""` | `"119077"` | LEVEL-PRIMARY; EC | `true / OK` | `true / OK` | Pass |
| BB-PAIR-01 | postsec | `""` | `""` | `"119077"` | POSTSEC-NONE; EC | `false / E-POSTSEC-MISSING` | `false / E-POSTSEC-MISSING` | Pass |
| BB-PAIR-04 | uni | `""` | `""` | `"119077"` | UNI-NONE; EC | `false / E-UNI-MISSING` | `false / E-UNI-MISSING` | Pass |

## 7. Execution Results

Executed on 2026-10-29: **40 matrix cases passed** within the full frontend run of
**68 files / 890 tests passed**, with no failures or skipped tests.

Run from `client`: `npm test -- src/stores/__tests__/profileBlackBox.spec.ts`.

The existing tests in `profile.spec.ts`, `profileValidation.spec.ts`, and
`postalCode.spec.ts` remain in the regression suite, alongside these 40 cases.
