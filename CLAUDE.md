# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

家計プランナー (Household Income Planner): a single-page React/TypeScript app that estimates the household financial impact of one person ("primary") changing their weekly work pattern, compared against their spouse ("spouse", whose work pattern stays fixed across the comparison). It computes Japanese payroll deductions (health insurance, welfare pension, employment insurance, income tax, residence tax), dependent-spouse status (103万円/130万円 thresholds), and household expense sharing, then compares a `'before'` and `'after'` scenario side by side.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check (`tsc`) then production build via Vite
- `npm run preview` — preview a production build
- `npm test` — run the full test suite once (Vitest)
- `npm run test:watch` — Vitest in watch mode
- `npm run lint` — ESLint over `.ts`/`.tsx`
- Run a single test file: `npx vitest run src/__tests__/calculator.test.ts`
- Run tests matching a name: `npx vitest run -t "所得税"`

Two test files: `src/__tests__/calculator.test.ts` (covers `calculator.ts` and `simulate.ts`) and `src/__tests__/paramsStorage.test.ts` (covers `sanitizeParams`).

## Architecture

The app has a strict separation between pure calculation logic and UI, with no state management library — everything flows from a single `useState<SimulatorParams>` in `App.tsx`, lazily hydrated from localStorage.

- **`src/calculator.ts`** — all Japanese tax/social-insurance math as pure functions (no framework dependencies). Each government-rate constant (health insurance 9.98%/4.99% employee share, welfare pension 18.3%/9.15%, employment insurance 0.6%, salary deduction brackets, progressive income tax brackets, residence tax, dependent-spouse thresholds) is documented inline with the rule it implements and the fiscal year it's valid for (currently 2024, Tokyo/協会けんぽ rates). `calcPersonMonthlyIncome()` is the single entry point for computing either person's net income — both `primary` and `spouse` go through the exact same function, since either one may turn out to be the dependent (see below). When changing a rate or bracket, update the comment citing the source/year alongside it.
- **`src/simulate.ts`** — orchestrates `calculator.ts` functions into one `simulate(params, scenario)` call, `scenario` being `'before' | 'after'`. It resolves both people's incomes, determines dependent status, applies the household's expense-sharing method, and returns a full `SimulationResult`. `App.tsx` calls this once per scenario and passes both results down for comparison.
- **`src/types.ts`** — the two central shapes: `SimulatorParams` (all user-editable inputs) and `SimulationResult` (full computed output for one scenario, including deduction breakdowns for both people). Primary's income/work-days fields come in `Before`/`After` pairs (they're the one whose pattern changes); spouse's fields are single-valued (fixed across the comparison). Changes to one side's inputs/outputs should stay symmetric with the other side's.
- **`src/components/`** — presentation only (`InputSection` edits `SimulatorParams`, `ResultSection` renders one `SimulationResult`, `ComparisonSection` diffs the two scenarios). These should stay free of tax/insurance calculation logic — that belongs in `calculator.ts`/`simulate.ts`.
- **`src/defaultParams.ts`** — the single source of truth for default `SimulatorParams`, imported by `App.tsx` (initial state fallback) and `paramsStorage.ts` (sanitization fallback).
- **`src/paramsStorage.ts`** — persistence. `sanitizeParams(unknown): SimulatorParams` validates an arbitrary payload field-by-field against `DEFAULT_PARAMS`, used by both `loadParams()` (localStorage) and JSON import in `App.tsx`. **Adding or renaming a `SimulatorParams` field requires updating `NUMERIC_KEYS`/enum arrays in this file too** — an unlisted field silently falls back to its default on every load instead of erroring, which is easy to miss.

### Primary vs. spouse, and who can be the dependent

The domain used to be modeled as literal husband/wife with a hardcoded "week 3 days → week 2 days" scenario and an assumption that the wife was always the one who might become a dependent. That's now generalized:

- `primary` is whoever's work pattern is being compared before/after; `spouse`'s work pattern is fixed for the comparison. Which real person maps to which role is just a matter of which fields the user fills in — there's no gendered assumption left in the code.
- `SimulatorParams.dependentCandidate` (`'primary' | 'spouse'`) says which of the two is evaluated against the 103万/130万 thresholds. `simulate.ts` resolves this once (`isDependentSpouse()` is called only for the candidate's income/hours) and derives both people's `isSocialInsuranceDependent`/spousal-deduction flags from that single resolution — evaluating both people independently was considered and rejected, because two low-income/low-hours people would then both qualify as depending on each other, which is nonsensical.
- `SimulationResult.dependentCandidate` echoes back which side was evaluated, so `ResultSection`/`ComparisonSection` can label the dependency badges with the right person ("本人" vs "配偶者") instead of a hardcoded role name.

### Dependents other than the spouse (mainly children)

`SimulatorParams.dependentsCount` (人数) and `dependentsClaimedBy` (`HouseholdMember`) add a flat per-dependent 扶養控除 (38万円 income tax / 33万円 residence tax, `DEPENDENT_DEDUCTION_INCOME_TAX`/`DEPENDENT_DEDUCTION_RESIDENCE_TAX` in `calculator.ts`) on top of whatever spousal deduction already applies — deliberately not modeling the 特定扶養親族 (63万円)/老人扶養親族 (48万/58万円)/16歳未満 (no deduction) age brackets real tax law has, since this is a rough estimator. `calcMonthlyIncomeTax`/`calcMonthlyResidenceTax` take a single `additionalDeduction: number` rather than an `isDependentSpouse` boolean specifically so `simulate.ts` can sum the spousal and dependents deductions before calling in — adding a third kind of deduction later should extend that same sum, not add another boolean parameter to those functions.

### Expense sharing methods

`SimulatorParams.sharingMethod` is `'percentage'` (spouse pays `spouseSharePercent`% of shared expenses) or `'fixedTransfer'` (one person transfers a fixed yen amount to the other, per `fixedTransferDirection`, who then covers all shared expenses from it). Both branches live in `simulate.ts` and must both be kept in sync with any new expense category added to `SimulatorParams`.

### Income input mode

`SimulatorParams.incomeInputMode` (`'monthlyPlusBonus'` | `'annual'`) decides which income fields are live: in `'monthlyPlusBonus'` mode the `*MonthlySalary*`/`*AnnualBonus*` fields drive the calculation; in `'annual'` mode the `*AnnualIncome*` fields do instead (resolved to a monthly-equivalent salary with bonus treated as 0). `simulate.ts`'s `resolveIncome()` is the only place that should read the raw fields — it also returns the annual income verbatim (not `monthly*12`) so the 103万/130万 dependent-spouse thresholds don't get nudged by `Math.floor` rounding when a user's exact boundary value is entered. `InputSection.tsx` seeds the inactive field set from the active one when the mode toggle flips, so switching modes doesn't silently reset values.

## Notes

- All UI copy, comments, and domain terminology are in Japanese; match this style when adding code or comments.
- This is a rough estimator, not a compliance tool — the app's own footer disclaims accuracy versus an actual tax/insurance professional. Don't over-engineer precision beyond what the existing bracket-based approximations already do unless asked.
- Avoid native `alert()`/`confirm()`/`prompt()` in this app — a blocking JS dialog has hung the renderer (and browser automation) here before. Use inline UI state instead (see `App.tsx`'s `resetArmed`/`importError` pattern).
