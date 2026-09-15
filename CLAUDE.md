# Claude Project Instructions

## Project Overview

This is an existing Hebrew RTL management dashboard for European hospitality properties.

The application is used for real operational and financial analysis. Accuracy and consistency of business calculations are more important than convenience or visual changes.

Before making significant changes, read `README.md`.

`README.md` documents the current business model, data sources, Excel structure, date attribution rules, and application architecture.

`DEPLOYMENT.md` documents deployment and hosting only. Historical test counts or verification results inside that file must not be treated as proof that the current codebase is valid.

---

# Core Architecture

The application is:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- SheetJS (`xlsx`)
- frontend-only
- Hebrew-first and RTL

There is currently no backend, API server, or database.

Uploaded Excel data is parsed client-side and persisted in browser `localStorage`.

Do not introduce a backend, API, database, React Router, state-management library, or other major architectural dependency unless explicitly requested.

---

# Source of Truth

## Data

All application data must flow through:

`src/data/DataContext.tsx`

UI components and pages must not read directly from:

- uploaded Excel files
- `mockData.ts`
- browser storage

Use `useData()`.

Excel parsing and normalization belong in the existing data layer.

Do not parse Excel data inside pages or components.

---

## Global Filters

Global filters are centralized in:

`src/context/FilterContext.tsx`

The global filters are:

- property
- country
- year
- month
- platform

Do not duplicate global filter state inside pages.

Pages that should respect global filters must use `useFilters()` and the existing filtering utilities.

A page may have page-specific controls when they are intentionally different from global filters.

Do not assume that every global filter must affect every feature. If applying a filter changes the business meaning of a KPI, target, or comparison, verify the intended business rule first.

---

# Business Calculations

The authoritative calculation layer is:

`src/lib/calculations.ts`

Official dashboard KPIs must use the existing centralized functions.

For official profitability metrics use:

- `calcRevenue`
- `calcExpenses`
- `calcProfit`
- `calcProfitMargin`

Do not independently calculate official Revenue, Expenses, Profit, or Profit Margin inside pages or components.

Do not create a second implementation of an existing KPI.

When a feature requires an existing metric, reuse the existing calculation function.

---

## Official Profitability Logic

Official revenue:

`gross booking revenue + Extras`

Official expenses:

`FullAmount of Expenses + Maintenance + booking/platform commission`

Official profit:

`revenue - expenses`

Official profit margin:

`profit / revenue`

One-time expenses are completely separate and must never be included in regular Revenue, Expenses, Profit, Margin, or P&L calculations unless explicitly requested.

---

# Date Attribution

Date attribution rules are centralized in `src/lib/calculations.ts`.

Use the existing helpers:

- `occDate`
- `extraDate`
- `expenseDate`
- `maintDate`
- `occMonth`
- `extraMonth`
- `expenseMonth`
- `oneTimeExpenseMonth`
- `maintMonth`

Do not duplicate date-attribution logic inside pages, tables, charts, or new utility files.

Current rules include:

- Occupation → Check-in date
- Extras → Month, with the existing fallback behavior
- Expenses → BillingDate, with the existing fallback behavior
- One-time expenses → same date logic as Expenses
- Maintenance → Date

If these rules need to change, change the centralized source rather than implementing an exception elsewhere.

---

# Period Comparison

Period-comparison logic is centralized in:

`src/lib/periods.ts`

Do not implement week/month/quarter/year comparison logic independently inside components.

A week is:

Sunday → Saturday.

Supported comparison modes include:

- week over week
- month over month
- quarter over quarter
- year over year
- last 7 days
- last 30 days
- month to date
- year to date
- custom date range

Partial periods must not be compared against full previous periods.

Reuse the existing equal-period logic.

Use `KPI_POLARITY` when determining whether a KPI change is good or bad.

Do not assume that an increase is always positive.

For example:

- higher revenue = good
- higher profit = good
- higher expenses = bad

---

# Monthly Targets

Target configuration is stored in:

`src/data/targets.ts`

Target logic is stored in:

`src/lib/targets.ts`

Do not put target calculation logic inside `MonthlyTargets.tsx`.

Do not invent targets for properties or years that do not have configured targets.

When `"all"` is selected, targets represent only properties that have targets configured for that year.

Actual results compared against those targets must represent the same population of properties.

Combined margin must be calculated as:

`combined profit / combined revenue`

Never average property margin percentages.

Current target values contain:

- revenue
- expenses
- profit
- margin

When modifying target values, keep them mathematically consistent unless explicitly told that a target is intentionally independent:

`profit = revenue - expenses`

`margin = profit / revenue`

---

# One-Time Expenses

`oneTimeExpenses` is an independent dataset.

It must remain separate from normal `expenses`.

Do not include it in:

- regular total expenses
- standard P&L
- normal profit
- normal profit margin
- normal property profitability

unless explicitly instructed.

---

# UI and UX

The application is Hebrew-first and RTL.

Preserve:

- RTL layout
- existing Tailwind design language
- existing spacing
- existing typography
- existing cards
- existing tables
- existing chart conventions
- existing icon conventions
- responsive behavior

Reuse existing UI components before creating new versions.

Important reusable components include:

- `Card`
- `DataTable`
- `KpiCard`
- `Select`
- `StatusBadge`

Do not redesign unrelated parts of the application when implementing a feature.

Desktop uses the Sidebar navigation.

Smaller screens use the horizontal navigation defined through the existing `NAV_ITEMS` structure.

Preserve both.

---

# Navigation

Navigation is currently implemented through:

- `PageKey`
- `NAV_ITEMS`
- local page state in `App.tsx`

There is no React Router.

Do not introduce React Router only to add a new page.

New dashboard pages should normally integrate with the existing navigation architecture.

---

# Implementation Rules

Before implementing a change:

1. Inspect the relevant existing files.
2. Understand how the same or similar feature is currently implemented.
3. Identify the existing source of truth.
4. Reuse existing functions, types, utilities, filters, and components.
5. Prefer the smallest correct change.

Do not speculate about code that has not been inspected.

Do not create parallel systems for functionality that already exists.

Avoid unnecessary refactoring.

Do not add dependencies unless there is a clear reason.

Do not implement hypothetical future functionality unless requested.

A request to change one feature is not permission to refactor unrelated code.

---

# Verification

A task is not complete merely because the code was written.

After significant changes:

1. Run or verify TypeScript compilation.
2. Run the production build when possible.
3. Check imports and exports.
4. Check for runtime/console errors where possible.
5. Verify existing navigation.
6. Verify relevant global filters.
7. Verify calculations against existing calculation functions.
8. Review the git diff for unintended changes.

For financial or KPI work, compare results against the existing source of truth.

Never change business logic simply to make a test pass.

---

# Documentation

If a change modifies:

- architecture
- screens
- business logic
- data sources
- Excel structure
- important filters
- deployment behavior

update the relevant documentation.

Do not allow `README.md` to describe functionality that no longer matches the actual application.

---

# Git Safety

Keep changes focused.

Do not use destructive commands such as:

- `git reset --hard`
- force push

unless explicitly instructed.

Do not delete unrelated files.

Do not overwrite work unrelated to the current task.

Before committing, review the changed files.

Use a clear commit message describing the actual change.

---

# Communication

For ordinary reversible implementation decisions, follow the existing architecture and proceed.

Ask before making assumptions when ambiguity affects:

- business logic
- financial calculations
- KPI definitions
- Excel column meaning
- target definitions
- date attribution
- destructive operations

When a task is complete, briefly report:

- what changed
- important files changed
- what was verified
- any unresolved issue
- whether I need to perform a manual action