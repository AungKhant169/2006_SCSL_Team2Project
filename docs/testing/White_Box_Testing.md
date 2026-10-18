# White-Box Testing

## 1. Method 1 — `runAi()`

### 1.1 Method Under Test

The first method selected for basis path testing is:

`runAi()` in `client/src/stores/roadmap.ts`

The method is responsible for requesting an AI-generated roadmap and handling:

- successful AI responses;
- AI failures;
- successful responses from stale requests;
- failures from stale requests.

### 1.2 Control Flow Graph

The Control Flow Graph was created using Visual Paradigm.

See:

`runAi_CFG.png`

### 1.3 Cyclomatic Complexity

The control flow graph contains three decision/branch points:

1. AI request succeeds or raises an exception;
2. `run != aiRun` after a successful response;
3. `run != aiRun` after an exception.

Therefore:

V(G) = P + 1

V(G) = 3 + 1

V(G) = 4

Hence, four independent execution paths are required.

### 1.4 Independent Paths

| Path | Execution Path | Expected Outcome |
|---|---|---|
| P1 | Success → `run == aiRun` | AI choices are stored and status becomes `ready` |
| P2 | Success → `run != aiRun` | Stale successful response is ignored |
| P3 | Exception → `run == aiRun` | Status becomes `error` |
| P4 | Exception → `run != aiRun` | Stale error is ignored |

### 1.5 Basis Path Test Cases

| Test ID | Path | Test Condition | Expected Output | Actual Output | Result |
|---|---|---|---|---|---|
| WB-AI-01 | P1 | Current AI request succeeds | `aiStatus = ready`; returned choices stored | `aiStatus = ready`; choices stored | Pass |
| WB-AI-02 | P2 | AI response arrives after stage changes | Response ignored; status remains `idle` | Response ignored; status remained `idle` | Pass |
| WB-AI-03 | P3 | Current AI request throws an error | `aiStatus = error` | `aiStatus = error` | Pass |
| WB-AI-04 | P4 | AI error occurs after stage changes | Error ignored; status remains `idle` | Error ignored; status remained `idle` | Pass |

### 1.6 Automated Test Implementation

The corresponding tests are implemented in:

`client/src/stores/__tests__/roadmap.spec.ts`

Relevant tests include:

- `fills the AI plan when it arrives`
- `ignores a late AI response after the stage has changed`
- `an AI failure is confined to the AI status and leaves the rule plan intact`
- `ignores a late AI error after the stage has changed`

The tests were executed using:

```bash
npm test -- roadmap.spec.ts