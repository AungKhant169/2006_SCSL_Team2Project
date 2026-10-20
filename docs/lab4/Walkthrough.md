# Lab 4 Walkthrough: Sections 3.3.2–3.3.4

## Understanding the exercise

Section 3.3.2 asks you to temporarily delete the control class selected for black-box testing in Section 3.2.1, then ask an AI assistant to reconstruct it using tests and supporting materials.

Your selected class is `UserProfileController`. In this Vue/Pinia project, its responsibility is implemented across `profile.ts` and `profileValidation.ts`, rather than a TypeScript class with that exact name. The existing black-box testing and traceability documents establish this mapping.

The exercise has already been performed: back up the implementation, verify the baseline, delete both files, observe missing-import failures, generate new implementations, run tests, compare behaviour, make corrections, and verify again. The backups and execution logs are in `evidence/`; you do not need to delete the files again.

## Step 1: Understand the implementation

- `client/src/stores/profile.ts` maintains the target education level, academic results, postal code, and feedback messages. `save()` validates the form and updates the directory's postal-code anchor. `setLevel()` clears results belonging to the previous stage, and `reset()` restores the demo defaults. Saving updates frontend state; this exercise did not add backend profile persistence.
- `client/src/utils/profileValidation.ts` validates the six-digit postal code before checking academic results. It accepts integer PSLE scores from 4 to 32, integer L1R5 scores from 2 to 54, whole-number ELR2B2 scores, GPA values from 0 to 4, and rank points from 0 to 90. Preschool and primary targets do not require academic results. These are the existing project's validation rules.
- `client/src/utils/__tests__/profileValidation.spec.ts` retains the original 53 tests and adds 10 checks for numeric formats and error wording, giving 63 tests.
- `client/src/stores/__tests__/profile.spec.ts` contains 10 tests for the controller's state and actions.

## Step 2: Understand why a revision was needed

The first generated validator converted scores with `Number()`. Both `Number('8e0')` and `Number('0x8')` produce 8. Checking the numeric range alone therefore accepted text formats that the original implementation rejected. The original 610-test suite did not catch these differences.

Ten additional checks were added and observed failing before the implementation was corrected. The final validator checks the text format before checking its numeric value.

The report distinguishes the initial reconstruction from the compatibility review: original function bodies were first opened after the generated implementation passed the original tests. The final implementation required a follow-up revision informed by that comparison.

## Step 3: Reproduce the final checks

Open PowerShell in the project root and run:

```powershell
Set-Location client
npm.cmd test -- profileValidation.spec.ts profile.spec.ts
npm.cmd test
npm.cmd run type-check
npm.cmd run build-only
```

Expected results:

- Focused tests: 2 files and 73 tests passed.
- Full frontend suite: 55 files and 620 tests passed.
- Type checking and production build: passed.

You can capture your own terminal output as supporting evidence. The manual does not require every raw input and output to be pasted into the report when the process is accurately described.

To start the development interface, run `npm.cmd run dev`. Login and interactive behaviour depend on your local backend configuration; browser flows were not manually verified in this exercise. Useful behaviours to understand are postal-code error priority, rejection of PSLE 35, clearing old scores when changing the target stage, and updating the directory postal code after a valid save.

## Step 4: Use the report

`Lab4_Coding_Agent_Report.docx` and its Markdown source contain:

1. Section 3.3.2: selected controller, supporting materials, task brief, procedure, revisions, results, and limitations.
2. Section 3.3.3: the Codex code-quality review and refactoring suggestions.
3. Section 3.3.4: one brief reflection for each experiment.

The manual requires both experiments to use the same assistant. Your earlier Section 3.3.3 draft names Claude, so this report records an additional Codex review. The earlier Claude record is preserved separately in `evidence/previous-draft.txt`. The report's reconstruction brief is a reproducible description assembled from your request and the manual, rather than a verbatim user quotation.

Review the reflections against your group's understanding before incorporating them into the submission. The earlier draft's suggestion to add CI checks and its reference to `roadmap_rules.py` do not match this checkout; the report explains those findings. Existing testing documents record the earlier totals of 53 validation tests and 610 frontend tests. The totals after this exercise are 63 and 620 respectively.

## Evidence files

`01-baseline.txt`, `02-removed.txt`, and `03-regenerated-focused.txt` document the initial deletion and reconstruction. `06-format-gap.txt` records the failures exposed by the added checks. `07-final-focused.txt` through `11-build.txt` record final verification. Localised PowerShell source-location labels in the failure logs have been translated into English; test results are preserved.

`evidence/original/` contains the original implementation. `evidence/first-generation/` contains the first generated implementation. The pre-existing changes to `docs/testing/White_Box_Testing.md` were preserved. No Git commit or remote push was made during the reconstruction exercise. Subsequent pre-push validation is recorded in the report update.
