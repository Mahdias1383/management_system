# Contributing to RailPulse Enterprise

Thank you for your interest in contributing to **RailPulse Enterprise**.

## Engineering Standards & Guardrails

1. **Strict RBAC & Session Isolation:**
   - Never introduce global role-switcher bars that bypass authentication.
   - Ensure all protected routes are wrapped in `RoleGuard` (`src/guards/RoleGuard.tsx`).
   - All passenger mutations (wallet deposits, withdrawals, ticket purchases, refunds, profile updates) must be strictly scoped to the authenticated `session.userId`.

2. **Zero Internal Jargon in UI Copy:**
   - Never expose internal Python or TypeScript function/variable names (`user_shopping`, `add_employee`, `num_state`, `list_state`, `id_train`) in user-facing labels.
   - Provide natural translations for both **Persian (`fa` - RTL)** and **English (`en` - LTR)**.

3. **Immutability & Pure Domain Logic:**
   - Never share mutable array or object references across entities. Always clone state via `deepClone()` in `src/services/storageAndMigration.ts`.

4. **Automated 5-Phase QA Verification:**
   - Before opening a Pull Request, run `npm run lint` (`tsc --noEmit`) and `npm run build`, and verify that all 12 automated test suites in `src/services/qaTestSuite.ts` pass at 100%.
