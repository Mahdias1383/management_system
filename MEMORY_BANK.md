# RAILPULSE ENTERPRISE — SHORT-TERM WORKING MEMORY & R&D TRACKER (`MEMORY_BANK.md`)

## 1. ARCHITECTURAL & SECURITY CONTRACT (NON-NEGOTIABLE)
- **Zero Auth-Bypass / No Quick Role Switcher Bar:** Every portal (`PassengerDashboard`, `StaffOperationsPortal`, `AdminExecutivePortal`) is strictly protected by `RoleGuard` (`src/guards/RoleGuard.tsx`) and `isAuthorizedForRole` (`src/services/authService.ts`). No global role-switcher toolbar exists anywhere in the UI.
- **Zero Exposed Passwords on Login/Landing Screens:** Plaintext seed credentials (`Admin_train`, `sara_ahmadi`, `mahdi_as`) are NEVER displayed on `PublicHomePage.tsx` or `AuthPage.tsx`. They are documented in `README.md`, `ARCHITECTURE.md`, and inside a discreet collapsible "Developer Docs" modal in the footer of `CustomerStorefrontLayout.tsx`.
- **Zero Code Function / Variable Jargon in Visible UI Labels:** Internal Python/TypeScript identifiers (`user_shopping`, `edit_profile`, `add_employee`, `employees_information`, `add_train_line`, `num_state`, `name_line`, `id_train`, `Schema v2.0`, `Source: db.transactions`) are strictly banned from visible UI headings, buttons, tabs, and form labels.
- **No Public QA Test Runner Tab in Customer Header:** The 5-Phase Automated QA Suite (`QATestSuitePanel.tsx`) is housed exclusively inside the **System Administrator Backoffice Sidebar** (`AdminExecutivePortal.tsx` -> `Engineering QA & Automated Tests`).
- **Dual-Layout Architecture:**
  - `CustomerStorefrontLayout.tsx`: B2C travel booking storefront for `PublicHomePage.tsx`, `AuthPage.tsx`, and `PassengerDashboard.tsx`.
  - `EnterpriseBackofficeLayout.tsx`: B2B operational workspace with collapsible vertical sidebar (`260px` / `72px`), operator badge, and breadcrumb bar for `StaffOperationsPortal.tsx` and `AdminExecutivePortal.tsx`.

---

## 2. SEQUENTIAL 6-PHASE EXECUTION STATUS

- [x] **PHASE 0: PUBLIC GITHUB REPOSITORY HYGIENE & MEMORY INITIALIZATION** — COMPLETED & VERIFIED
  - [x] `MEMORY_BANK.md` initialized and maintained.
  - [x] `README.md` (Bilingual documentation, Mermaid architecture diagram, setup guide, Default Seed Accounts table).
  - [x] `ARCHITECTURE.md` (Layered architecture, RBAC model, `v1` -> `v2` migration, `checkAccident` mathematical formulas).
  - [x] `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` (MIT), `.gitignore`, `.env.example`.

- [x] **PHASE 1: CORE DOMAIN, STORAGE MIGRATION, COLLISION MATH & STRICT RBAC GUARDS** — COMPLETED & VERIFIED
  - [x] `src/types/domain.ts`: Normalized `v2` TypeScript interfaces including `seatNumbers`, `coachNumber`, and `sessionToken`.
  - [x] `src/services/authService.ts`: `normalizeIdentifier`, `hashPassword`, `verifyPassword`, `issueSessionToken`, `isAuthorizedForRole`, `isValidEmail`, `evaluatePasswordStrength`, `parsePositiveNumber`, `parsePositiveInteger`.
  - [x] `src/services/storageAndMigration.ts`: `deepClone`, `getDefaultLegacyV1Snapshot` (4 corridors, 6 trains, 3 staff, 2 passengers, 30-day historical `TICKET_PURCHASE` ledger), `migrateV1ToV2`, `loadDatabase`, `saveDatabase`, `resetToDefaultSeedDatabase`.
  - [x] `src/services/collisionEngine.ts`: `parseTimeToMinutes`, `formatMinutesToTime`, `computeTrainStationTimings`, `checkAccident` (Station Platform Overlaps + Track Segment Overtakes with 5-minute headway safety buffer + `suggestedSafeDeparture`).
  - [x] `src/services/bookingEngine.ts`: `depositToWallet`, `withdrawFromWallet`, `purchaseTrainTicket` (with coach/seat assignment, PNR, and QR payload), `refundTrainTicket`.
  - [x] `src/guards/RoleGuard.tsx`: Strict RBAC component blocking unauthenticated or cross-role access.

- [x] **PHASE 2: DUAL-LAYOUT UI/UX SYSTEM & ZERO-JARGON LOCALIZATION** — COMPLETED & VERIFIED
  - [x] `src/layouts/CustomerStorefrontLayout.tsx`: B2C top navigation, passenger wallet/profile sub-bar, discreet footer link to Corporate Portal & Developer Docs modal.
  - [x] `src/layouts/EnterpriseBackofficeLayout.tsx`: B2B collapsible vertical sidebar layout for Staff and Admin portals.

- [x] **PHASE 3: PUBLIC STOREFRONT, AUTHENTICATION & PASSENGER RESERVATION PORTAL** — COMPLETED & VERIFIED
  - [x] `src/pages/PublicHomePage.tsx`: Hero Search Engine widget, Live National Departures Board, PNR Ticket Verification Lookup, and Enterprise Value Propositions.
  - [x] `src/pages/AuthPage.tsx`: Clean Passenger Sign In / Registration + toggleable Corporate Staff / System Admin login with zero exposed password boxes.
  - [x] `src/pages/PassengerDashboard.tsx`: 4-tab passenger portal (`BOOKING`, `TICKETS`, `WALLET`, `PROFILE`) with interactive `SeatMapSelector` and `DigitalBoardingPassModal`.

- [x] **PHASE 4: RAILWAY OPERATIONS STAFF BACKOFFICE & COLLISION RADAR** — COMPLETED & VERIFIED
  - [x] `src/pages/StaffOperationsPortal.tsx`: 3-section sidebar workspace (`Corridor & Line Topology`, `Fleet & Timetable Dispatch`, `Collision Radar & Marey Chart`) with 1-click safe departure slot resolution.
  - [x] `src/components/MareyChart.tsx`: Interactive SVG time-distance diagram plotting all corridor trains, station dwell plateaus, and candidate collision zones.

- [x] **PHASE 5: SYSTEM ADMIN EXECUTIVE BACKOFFICE, 30-DAY REVENUE ANALYTICS & 5-PHASE QA SUITE** — COMPLETED & VERIFIED
  - [x] `src/pages/AdminExecutivePortal.tsx`: 4-section sidebar workspace (`Executive & Revenue Analytics`, `Operations Staff Directory`, `Audit Trail & Data Snapshots`, `Engineering QA & Automated Tests`).
  - [x] `src/components/RevenueAnalysis.tsx`: Recharts 30-day area/bar revenue visualization powered by `db.transactions`.
  - [x] `src/services/qaTestSuite.ts` & `src/components/QATestSuitePanel.tsx`: 12 programmatic test suites across all 5 mandatory testing phases (`UT-01`..`UT-05`, `IT-01`..`IT-02`, `MT-01`..`MT-02`, `E2E-01`..`E2E-02`, `UI-01`..`UI-03`).
