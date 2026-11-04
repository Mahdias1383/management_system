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
  - [x] `README.md` (Bilingual documentation, 6 live high-res screenshots in `docs/screenshots/`, Mermaid architecture diagram, modular directory tree, setup guide, Default Seed Accounts table).
  - [x] `ARCHITECTURE.md` (Layered architecture, RBAC model, `v1` -> `v2` migration, `checkAccident` mathematical formulas).
  - [x] `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` (MIT), `.gitignore`, `.env`, `.env.example`.
  - [x] Standardized modular directory tree: `src/config/env.ts`, `src/types`, `src/services`, `src/guards`, `src/layouts`, `src/components/ui`, `src/pages/{public,passenger,staff,admin}`, `docs/screenshots`.

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
  - [x] `src/pages/PublicHomePage.tsx`: Hero Search Engine widget, Live National Departures Board (`trainSearchCardVariants`, `trainRouteStripVariants`), PNR Ticket Verification Lookup, and Enterprise Value Propositions (`guaranteeCardVariants`) with orchestrated `framer-motion` entry transitions and spring `'hover'` animations.
  - [x] `src/pages/AuthPage.tsx`: Clean Passenger Sign In / Registration + toggleable Corporate Staff / System Admin login with zero exposed password boxes.
  - [x] `src/pages/PassengerDashboard.tsx`: 4-tab passenger portal (`BOOKING`, `TICKETS`, `WALLET`, `PROFILE`) with interactive `SeatMapSelector` and `DigitalBoardingPassModal`.

- [x] **PHASE 4: RAILWAY OPERATIONS STAFF BACKOFFICE & COLLISION RADAR** — COMPLETED & VERIFIED
  - [x] `src/pages/StaffOperationsPortal.tsx`: 3-section sidebar workspace (`Corridor & Line Topology`, `Fleet & Timetable Dispatch`, `Collision Radar & Marey Chart`) with 1-click safe departure slot resolution.
  - [x] `src/components/MareyChart.tsx`: Interactive SVG time-distance diagram plotting all corridor trains, station dwell plateaus, and candidate collision zones.

- [x] **PHASE 5: SYSTEM ADMIN EXECUTIVE BACKOFFICE, REAL-TIME ALERT CENTER, 12-MONTH & 30-DAY REVENUE ANALYTICS & 5-PHASE QA SUITE** — COMPLETED & VERIFIED
  - [x] `src/services/alertCenterService.ts`: Real-time pub/sub event bus (`railpulse:executive-alert` + `storage` cross-tab sync) pushing notifications whenever a high-revenue booking is made (`purchaseTrainTicket` in `bookingEngine.ts`) or a temporal-spatial conflict is detected in the safety radar (`checkAccident` / `StaffOperationsPortal.tsx` / `AdminExecutivePortal.tsx`).
  - [x] `src/pages/AdminExecutivePortal.tsx` & `src/layouts/EnterpriseBackofficeLayout.tsx`: 5-section sidebar workspace (`Executive & Revenue Analytics`, `Real-Time Alert Center`, `Operations Staff Directory`, `Audit Trail & Data Snapshots`, `Engineering QA & Automated Tests`) plus an embedded live **Real-Time Alert Center** stream widget directly inside the `<aside>` sidebar (`sidebarAlertSlot`), floating real-time push toast notifications, `framer-motion` staggered entry transitions (`kpiGridVariants`, `kpiCardVariants`, `kpiIconVariants`), and a 12-Month Ticket Sales Revenue Recharts `AreaChart` section (`#ticket-sales-12m-area-section`).
  - [x] `src/components/RevenueAnalysis.tsx`: Recharts 30-day area/bar revenue visualization and `framer-motion` animated KPI summary cards (`revenueKpiGridVariants`, `revenueKpiCardVariants`) powered by `db.transactions` with `formatCurrency` and `'Vazirmatn FD'` font inheritance.
  - [x] `src/components/ui/motionPrimitives.ts`: Shared `framer-motion` spring physics (`SPRING_TRANSITION`, `SOFT_SPRING_TRANSITION`), `BUTTON_HOVER_PROPS` (`scale: 1.05`), `CARD_HOVER_PROPS` (`scale: 1.05, y: -5`), `fadeSlideUpVariants`, `staggerGridVariants`, and `interactiveCardVariants` applied across all Public (`PublicHomePage.tsx`, `PassengerDashboard.tsx`, `AuthPage.tsx`, `CustomerStorefrontLayout.tsx`) and Enterprise (`AdminExecutivePortal.tsx`, `StaffOperationsPortal.tsx`, `RevenueAnalysis.tsx`, `QATestSuitePanel.tsx`, `EnterpriseBackofficeLayout.tsx`) cards and buttons.
  - [x] `src/services/qaTestSuite.ts` & `src/components/QATestSuitePanel.tsx`: 12 programmatic test suites across all 5 mandatory testing phases (`UT-01`..`UT-05`, `IT-01`..`IT-02`, `MT-01`..`MT-02`, `E2E-01`..`E2E-02`, `UI-01`..`UI-03`).



- [x] **PHASE 6: BRAND IDENTITY, VECTOR SVG LOGO, PAIRED BILINGUAL GALLERY & GITHUB EXCELLENCE** — COMPLETED & VERIFIED
  - [x] `src/components/ui/RailPulseLogo.tsx`: Minimal, modern vector SVG logo with aerodynamic bullet train silhouette, pulse waveform frequency beam, converging perspective tracks, luminous gradient filters, dark/light mode adaptability, sizes (`sm`, `md`, `lg`, `xl`), and variants (`icon`, `full`, `lockup`).
  - [x] Logo Integration across headers:
    - `CustomerStorefrontLayout.tsx`: Integrated in public storefront header with responsive size and bilingual typography.
    - `EnterpriseBackofficeLayout.tsx`: Integrated into enterprise operational sidebar header (dynamically switching from `full` to `icon` when collapsed).
    - `AuthPage.tsx`: Centered above authentication portal container.
    - `DigitalBoardingPassModal.tsx`: Rendered on official passenger boarding pass header alongside PNR reference.
  - [x] WCAG 2.1 AA Accessibility:
    - Added `role="banner"`, `role="navigation"`, `role="dialog"`, `role="search"`, `aria-label`, `aria-current`, `aria-expanded`, and `aria-modal` attributes across interactive components.
  - [x] Paired Bilingual Screenshots Gallery:
    - Captured 12 high-resolution screenshots in `docs/screenshots/` (both Persian RTL and English LTR for all 6 subsystems):
      1. Storefront: `01-storefront-fa.png` & `01-storefront-en.png`
      2. Passenger Portal & Coach Seat Map: `02-passenger-booking-fa.png` & `02-passenger-booking-en.png`
      3. Digital Boarding Pass Modal: `03-boarding-pass-fa.png` & `03-boarding-pass-en.png`
      4. Staff Operations & Marey Radar: `04-staff-operations-fa.png` & `04-staff-operations-en.png`
      5. Admin Analytics & 12M AreaChart: `05-admin-analytics-fa.png` & `05-admin-analytics-en.png`
      6. 5-Phase Automated QA Suite: `06-qa-suite-fa.png` & `06-qa-suite-en.png`
  - [x] World-Class GitHub Repository Standards:
    - Created `.github/workflows/ci.yml` (GitHub Actions CI for linting, type-check, and build verification).
    - Created `.editorconfig` (consistent indentation, charset, and trimming).
    - Created `.gitattributes` (consistent LF line endings and binary handling).
    - Created `.env` and `.env.example` following production best practices.
    - Rewrote `README.md` to top-tier international standards with bilingual documentation, logo integration guide, paired screenshot comparison tables, and architecture diagrams.
  - [x] Verification:
    - `lint_applet` passed with 0 errors (`tsc --noEmit`).
    - `compile_applet` passed with 0 errors (`vite build`).

### Phase 7: Progressive Web App (PWA) Integration & Offline Capabilities
- [x] PWA Manifest (`public/manifest.json` and `manifest.json`):
  - Configured `id`, `start_url`, `scope`, `name`, `short_name: "RailPulse"` (≤ 12 chars), `display: "standalone"`, `background_color: "#0f172a"`, `theme_color: "#0f172a"`.
  - Defined bilingual travel shortcuts for Booking, Operations Backoffice, and Executive Analytics.
- [x] Responsive Icon Suite (`public/icons/`):
  - `icon.svg`: Scalable brand vector logo.
  - `icon-192.png`: 192x192 PNG for standard Android / mobile launchers.
  - `icon-512.png`: 512x512 PNG for high-DPI splash and store displays.
  - `icon-maskable-512.png`: 512x512 PNG with 10% safe zone padding for adaptive Android icons.
  - `apple-touch-icon.png`: 180x180 PNG for iOS home screen bookmarks.
- [x] HTML Head Integration (`index.html`):
  - Added `<link rel="manifest" href="/manifest.json" />`.
  - Added iOS Safari capabilities (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`).
- [x] In-App Install Prompt UI (`src/hooks/usePWAInstall.ts` & `src/components/ui/PWAInstallButton.tsx`):
  - Seamless install button mounted in both `CustomerStorefrontLayout` and `EnterpriseBackofficeLayout`.
  - Captures `beforeinstallprompt` on Chromium/Android.
  - Auto-hides when running in native `standalone` mode.
  - Provides guided step-by-step modal for iOS Safari users.
- [x] Offline Service Worker (`public/sw.js` & `src/main.tsx`):
  - Registered service worker precaching shell, icons, and manifest.

### Phase 8: CI Workflow Alignment & Environment Template Standardization
- [x] Root Cause Resolution for CI Lockfile Failure:
  - Identified that the repository's committed dependency lockfile is `bun.lock` (not `package-lock.json` or `yarn.lock`).
  - `.github/workflows/ci.yml` previously used `actions/setup-node@v4` with `cache: 'npm'`, causing GitHub Actions to fail looking for `package-lock.json`.
  - Replaced with `oven-sh/setup-bun@v2` with `bun install --frozen-lockfile`, `bun run lint`, and `bun run build`.
  - Preserved 100% of existing quality gates without introducing fabricated or unrelated lock files.
- [x] Environment Template Consolidation:
  - Removed duplicate redundant `.env-sample`.
  - Standardized on industry-standard `.env.example`.
  - Updated `.gitignore` to track only `.env.example`.

### Phase 9: Vitest Test Framework Integration
- [x] Initialized Vitest in project (`vitest.config.ts`):
  - Configured `@` alias resolution.
  - Set test environment to `node` with glob pattern `src/**/*.{test,spec}.{ts,tsx}`.
- [x] Added `test` script to `package.json` (`"test": "vitest run"`).
- [x] Built core service unit test suites:
  - `src/services/__tests__/authService.test.ts`: 23 automated tests verifying Persian/English digit conversions, identifier normalization, deterministic SHA-256 password hashing/verification, RFC-compliant email validation, password complexity scoring, strict RBAC authorization, and positive number/integer validation.
  - `src/services/__tests__/collisionEngine.test.ts`: 7 automated tests verifying time conversion math, station timetable calculation, headway safety buffer violations, and safe alternate departure recommendations.
- [x] Updated GitHub Actions CI workflow (`.github/workflows/ci.yml` and `.github/workflows/test.yml`) to execute `bun run test` on every push/PR.
- [x] 100% Passing: All 32 unit tests pass in under 400ms.

### Phase 10: Automated Audit Log & Dedicated Admin 'Activity Monitor'
- [x] Domain & Localization (`src/types/domain.ts`, `src/services/authService.ts`):
  - Extended `AuditLogEntry` with `entityType` (`TICKET`, `SCHEDULE`, `CORRIDOR`, `STAFF`, `WALLET`, `SECURITY`, `SYSTEM`) and `entityId`.
  - Added full Persian/English localization in `localizeAuditAction` for `UPDATE_TRAIN_SCHEDULE`, `TICKET_BOOKED`, `TICKET_REFUNDED`, `DISPATCH_TRAIN_SCHEDULE`, `REMOVE_TRAIN_SCHEDULE`, `WALLET_DEPOSIT`, `WALLET_WITHDRAWAL`, `DATABASE_SNAPSHOT_RESTORED`, and staff governance actions.
- [x] Automated Action Tracking (`src/services/bookingEngine.ts`, `src/pages/StaffOperationsPortal.tsx`, `src/pages/AdminExecutivePortal.tsx`):
  - Automatically logs passenger ticket reservations (`TICKET_BOOKED`) and refunds (`TICKET_REFUNDED`) with PNR reference IDs.
  - Added interactive Train Schedule Modification modal (`handleStartEditTrain` / `handleSaveEditTrain`) in `StaffOperationsPortal.tsx` with real-time `checkAccident` collision validation and automated `UPDATE_TRAIN_SCHEDULE` audit logging.
  - Automatically logs corridor creations/updates/deletions, staff provisioning/edits/revocations, and database snapshot imports.
- [x] Dedicated 'Activity Monitor' Tab (`src/pages/AdminExecutivePortal.tsx`):
  - Dedicated sidebar navigation tab (`Activity Monitor` / `پایشگر فعالیت‌ها (Activity Monitor)`).
  - 4 interactive KPI summary cards (Total Monitored Events, Ticket Reservations & Refunds, Schedule & Fleet Modifications, Staff & Account Governance).
  - Multi-category filter pills (`ALL`, `RESERVATIONS`, `SCHEDULES`, `STAFF`, `FINANCIAL`), actor role filter (`ALL`, `passenger`, `staff`, `admin`, `system`), and live keyword search.
  - Live simulation triggers (`Simulate Ticket Reservation` and `Simulate Schedule Modification`), CSV export, JSON snapshot import/export, and an expandable Activity Event Inspector modal with raw JSON copy.

### Phase 11: Compliance CSV Export & Universal `useOnClickOutside` Modal Dismissal Hook
- [x] Custom Hook (`src/hooks/useOnClickOutside.ts` & `src/hooks/index.ts`):
  - Implemented `useOnClickOutside<T extends HTMLElement>(ref, handler, options)` listening for outside `mousedown` and `touchstart` pointer events as well as `Escape` key presses (`closeOnEscape`).
  - Extracted pure testable helpers `isTargetOutsideElements` and `shouldDismissOnKeyDown`.
  - Added unit test suite (`src/hooks/__tests__/useOnClickOutside.test.ts`) verifying outside clicks, inside clicks, null refs, ignored trigger elements, and Escape key handling.
- [x] Universal Modal & Overlay Integration:
  - `src/components/ui/DigitalBoardingPassModal.tsx` (Digital Boarding Pass & QR dialog)
  - `src/components/ui/SeatMapSelector.tsx` (Interactive Coach Seat Selector dialog)
  - `src/components/ui/PWAInstallButton.tsx` (iOS/Desktop PWA Install Guide dialog)
  - `src/layouts/CustomerStorefrontLayout.tsx` (Developer Documentation & Architecture dialog)
  - `src/pages/StaffOperationsPortal.tsx` (Edit Corridor, Delete Corridor Confirmation, and Edit Train Schedule dialogs)
  - `src/pages/AdminExecutivePortal.tsx` (Activity Event Inspector, Edit Staff Account, and Revoke Staff Access Confirmation dialogs)

### Phase 12: Activity Monitor Keyword Search & Date-Range Picker Filtering + Framer Motion Entrance Animations
- [x] Pure Audit Filter Engine (`src/services/authService.ts`):
  - Implemented `parseAuditDateBoundary` and `filterAuditLogs(logs, options)` supporting keyword search across actor, role, action, entity ID, and bilingual descriptions (with Persian/English numeral normalization), inclusive start/end date-range filtering (`YYYY-MM-DD` start-of-day `00:00:00.000Z` to end-of-day `23:59:59.999Z`), quick time-window presets (`ALL`, `24H`, `7D`, `30D`), role filtering, and compliance category filtering.
  - Added unit tests in `src/services/__tests__/authService.test.ts`.
- [x] Activity Monitor UI Controls & Framer Motion Entrance Polish (`src/pages/AdminExecutivePortal.tsx` & `src/components/ui/motionPrimitives.ts`):
  - Added reusable `filterToolbarVariants` and `filterControlEntranceVariants` spring entrance primitives in `src/components/ui/motionPrimitives.ts`.
  - Applied subtle staggered Framer Motion entrance animations (`filterToolbarVariants`, `filterControlEntranceVariants`, `SOFT_SPRING_TRANSITION`, `BUTTON_HOVER_PROPS`, and `AnimatePresence`) to the keyword search input (`data-testid="activity-search-input"`), search clear button (`data-testid="activity-search-clear"`), actor role filter (`data-testid="activity-role-filter"`), Date-Range Picker (`data-testid="activity-date-range-picker"`), `From` (`data-testid="activity-start-date"`) and `To` (`data-testid="activity-end-date"`) date inputs, quick time-window preset buttons (`All Time`, `Last 24h`, `Last 7 Days`, `Last 30 Days`), and the `Reset Filters` (`data-testid="activity-reset-filters"`) button.

### Phase 13: Activity Monitor 'Select All' Checkbox & Bulk Selection CSV Export
- [x] Pure Bulk-Selection & CSV Scope Engine (`src/services/authService.ts`):
  - Implemented `computeAuditBulkSelectionState`, `toggleSelectAllAuditLogs`, `toggleSingleAuditLogSelection`, and `resolveAuditLogsForCsvExport` supporting checked, unchecked, and indeterminate states across visible/filtered audit log entries.
  - Added automated unit tests in `src/services/__tests__/authService.test.ts` verifying full selection, partial/indeterminate state transitions, deselection, and `SELECTED` scope CSV generation.
- [x] Activity Monitor Table Checkboxes & Bulk Action Bar (`src/pages/AdminExecutivePortal.tsx`):
  - Added a header "Select All" checkbox (`data-testid="activity-select-all-checkbox"`) in the Activity Monitor audit log table (`<thead>`) with automatic `.indeterminate` synchronization (`aria-checked="mixed"` when partially selected).
  - Added per-row checkboxes (`data-testid="activity-row-checkbox-${log.id}"`) in `<tbody>` with row highlight styling when selected.
  - Added an animated bulk-selection action bar (`data-testid="activity-bulk-selection-bar"`) with selected entry count (`data-testid="activity-selected-count-label"`), one-click bulk CSV export (`data-testid="activity-export-selected-csv"`), and clear selection button (`data-testid="activity-clear-selection"`), as well as dynamic selection awareness on the toolbar CSV button (`data-testid="activity-export-csv-btn"`).

### Phase 14: Comprehensive Bilingual Client-Side UI/UX Fine-Tuning & Visual Audit (FA RTL & EN LTR)
- [x] Bilingual Copy Purity & Localization (`src/services/authService.ts`, `src/services/alertCenterService.ts`, `src/pages/*`, `src/components/*`):
  - Eliminated mixed English parentheticals and technical abbreviations in Persian mode (`۵ ستاره ویژه`, `مرکز کنترل ترافیک و اعزام`, `پایشگر هوشمند فعالیت‌ها`, `کد رهگیری رزرو`, `کیلومتر/ساعت`, `سازمانی`, `صدور گزارش ممیزی انطباق`, `دانلود پشتیبان سامانه`, `بارگذاری پشتیبان`, `خروجی جدول`) and ensured pure English passenger/corridor names in English alerts (`localizeText(..., 'en')`).
  - Preserved raw bilingual `displayName` in `ActiveSession` (`src/pages/AuthPage.tsx`) so toggling between Persian (`fa`) and English (`en`) dynamically translates logged-in user names across headers and sidebars.
  - Localized entity IDs, train codes, PNR badges, and time windows (`toPersianDigits`, `formatTime`) across tables, modals, and alert cards.
- [x] Layout, Control Alignment & Directional Polish (`src/index.css`, `src/layouts/EnterpriseBackofficeLayout.tsx`, `src/pages/PublicHomePage.tsx`, `src/pages/PassengerDashboard.tsx`, `src/pages/StaffOperationsPortal.tsx`, `src/pages/AdminExecutivePortal.tsx`, `src/components/ui/motionPrimitives.ts`):
  - Unified control heights (`h-10` in storefront search & passenger booking filter bars; `h-8` in backoffice filter toolbars) for pixel-perfect horizontal alignment.
  - Added RTL placeholder alignment rule (`[dir="rtl"] input[dir="ltr"]:placeholder-shown`) in `src/index.css` so Persian placeholders on LTR technical inputs align cleanly to the right when empty.
  - Made the backoffice `<aside>` sticky (`sticky top-0 h-screen`) and stacked the portal subtitle underneath the breadcrumb trail in `EnterpriseBackofficeLayout.tsx` so breadcrumbs never truncate and the operator card/sign-out button stay anchored at the bottom of the viewport.
  - Wrapped intermediate station nodes (`flex-wrap items-center gap-y-2 gap-x-1.5`) in `StaffOperationsPortal.tsx` corridor cards to prevent horizontal overflow, upgraded the Edit Staff department input to a localized `<select>` dropdown in `AdminExecutivePortal.tsx`, and added `staggerChildren` propagation to `filterControlEntranceVariants`.

### Phase 15: Framer Motion Skeleton Loading Screens for Admin Dashboard Tables & Charts
- [x] Reusable Framer Motion Skeleton Primitives & Pure Geometry Engine (`src/components/ui/motionPrimitives.ts` & `src/components/ui/AdminSkeletons.tsx`):
  - Added `skeletonPulseVariants`, `skeletonStaggerContainerVariants`, `skeletonRowVariants`, and `skeletonBarGrowVariants` in `src/components/ui/motionPrimitives.ts`.
  - Created `AdminChartSkeleton`, `AdminKpiStripSkeleton`, and `AdminTableSkeletonRows` in `src/components/ui/AdminSkeletons.tsx`, backed by pure deterministic geometry calculators (`computeChartSkeletonBars`, `computeTableSkeletonSpec`, `computeKpiSkeletonConfig`) to guarantee zero Cumulative Layout Shift (`CLS = 0`).
  - Added unit tests in `src/components/ui/__tests__/AdminSkeletons.test.ts`.
- [x] Admin Dashboard Integration (`src/components/RevenueAnalysis.tsx` & `src/pages/AdminExecutivePortal.tsx`):
  - Integrated `AnimatePresence mode="wait"` chart and KPI skeletons into `RevenueAnalysis.tsx` (`h-72` chart container and 4-card financial strip) with interactive sync (`data-testid="revenue-30d-refresh-btn"`) and automatic transitions on corridor/chart-mode changes.
  - Integrated Framer Motion skeletons across `AdminExecutivePortal.tsx` for Executive & Revenue Analytics (`h-80` 12-Month AreaChart, `h-72` 12-Month LineChart, 30-Day Revenue Analysis, and KPI strips via `data-testid="admin-refresh-analytics-btn"`), Operations Staff Directory 5-column data table (`data-testid="staff-refresh-table-btn"`), and Activity Monitor 6-column Audit Logs data table & 4-card KPI strip (`data-testid="activity-refresh-logs-btn"`).

### Phase 16: Adaptive PWA Splash Screen Generation & High-Resolution Icons (`manifest.json` & `public/icons`)
- [x] High-Resolution & Adaptive Icon Asset Suite (`scripts/generate-pwa-assets.mjs` & `public/icons/`):
  - Generated standard high-resolution PNG icons (`72x72`, `96x96`, `128x128`, `144x144`, `152x152`, `180x180`, `192x192`, `384x384`, `512x512`, `1024x1024`), adaptive maskable icons (`icon-maskable.svg`, `192x192`, `384x384`, `512x512`, `1024x1024` with full-bleed background and 15% safe-zone margin), and monochrome pinned/badge icons (`icon-monochrome.svg`, `512x512`).
  - Generated adaptive mobile and tablet startup splash screens (`splash-dark.svg`, `splash-light.svg`, `splash-portrait-750x1334.png`, `splash-portrait-1170x2532.png`, `splash-portrait-light-1170x2532.png`, `splash-portrait-1290x2796.png`, `splash-landscape-2532x1170.png`, `splash-tablet-1668x2388.png`, `splash-tablet-landscape-2388x1668.png`).
- [x] Web App Manifest, Service Worker & Runtime Splash Engine (`public/manifest.json`, `manifest.json`, `public/sw.js`, `index.html`, `src/utils/pwaSplashGenerator.ts`, `src/components/ui/PWAInstallButton.tsx`):
  - Updated `public/manifest.json` and `manifest.json` with all icon resolutions (`any`, `maskable`, `monochrome`), narrow/wide `screenshots`, `display_override`, and `launch_handler`.
  - Created `src/utils/pwaSplashGenerator.ts` (and unit tests in `src/utils/__tests__/pwaSplashGenerator.test.ts`) to compute adaptive splash screen geometry, render dynamic HTML5 Canvas previews, and synchronize `<meta name="theme-color">` and startup splash attributes with active theme/locale.
### Phase 17: Global Keyboard Shortcuts & Command Palette (Ctrl+K / Cmd+K) for Admin Portal
- [x] Pure Command Palette & Shortcut Catalog Engine (`src/types/shortcuts.ts`, `src/utils/commandPaletteUtils.ts`, `src/utils/__tests__/commandPaletteUtils.test.ts`):
  - Defined normalized domain types: `AdminSidebarSection`, `CommandCategory` (`ALL`, `NAVIGATION`, `REPORTS`, `ACTIONS`, `SYSTEM`), `CommandIconName`, `CommandItem`, and `ShortcutGuideItem`.
  - Implemented pure utility functions in `src/utils/commandPaletteUtils.ts`:
    - `isEditableElement(target)`: Duck-typed check for `<input>`, `<textarea>`, `<select>`, and `isContentEditable` across SSR, iframes, and browser DOMs.
    - `normalizeSearchTerm(term)`: Normalizes Persian and English characters, removes diacritics, unifies Arabic kaf/yeh with Persian ke/ye, and maps English/Persian numerals.
    - `filterCommands(commands, query, category, lang)`: Scores and filters commands by title, description, category, and keywords across both languages.
    - `formatShortcutForPlatform(keys, isMac)`: Generates clean platform-specific display strings (`⌘K`, `Ctrl+K`, `Alt+1`, etc.).
    - `getDefaultShortcutsCatalog(lang)`: Comprehensive cheatsheet catalog covering Navigation (`Ctrl+K`, `?`, `g` then `o`/`s`/`l`/`c`/`q`, `Alt+1..5`), Reports (`Alt+E`), Actions (`Alt+R`, `Alt+N`), and System (`Alt+L`, `Alt+T`).
  - Added 8 comprehensive automated unit tests in `src/utils/__tests__/commandPaletteUtils.test.ts` (all passed, raising test suite to 58 tests across 6 files).
- [x] Keyboard Shortcut Listener Hook (`src/hooks/useAdminShortcuts.ts` & `src/hooks/index.ts`):
  - Created `useAdminShortcuts` hook supporting:
    - Global `Ctrl + K` / `Cmd + K` trigger (active universally, even when typing).
    - Help modal shortcut (`?` / `Shift + /`).
    - Two-key sequence shortcuts (`g` then `o` for Overview, `g` then `s` for Staff Directory, `g` then `l`/`a` for Audit Logs, `g` then `c` for Alert Center, `g` then `q` for QA Suite) with automatic 1-second timeout.
    - Direct hotkeys: `Alt + 1..5`, `Alt + E` (export CSV), `Alt + R` (refresh/sync data), `Alt + N` (new specialist), `Alt + L` (switch language), `Alt + T` (toggle theme).
    - Typing guard preventing key interception when users type inside text inputs, textareas, or selects.
- [x] Admin Command Palette & Shortcuts Modal Components (`src/components/ui/AdminCommandPalette.tsx`, `src/components/ui/AdminShortcutsModal.tsx`, `src/components/ui/index.ts`):
  - `AdminCommandPalette`: High-polish modal with search input, category chips, keyboard arrow navigation (`↑`/`↓`/`Enter`), scroll-into-view, command execution with auto-dismiss, footer shortcut hints, and outside-click dismissal (`useOnClickOutside`).
  - `AdminShortcutsModal`: Categorized keyboard shortcuts cheatsheet modal grouped into Screen Navigation, Reports & Audit Compliance, Actions & Quick Operations, and System & Accessibility.
- [x] Layout & Admin Portal Integration (`src/layouts/EnterpriseBackofficeLayout.tsx` & `src/pages/AdminExecutivePortal.tsx`):
  - Integrated command palette trigger button (`data-testid="backoffice-command-palette-trigger-btn"`) with `Ctrl+K` kbd pill in the backoffice command header.
  - Integrated keyboard shortcuts help trigger button (`data-testid="backoffice-shortcuts-help-trigger-btn"`) with `?` kbd pill.
  - Wireframed in `AdminExecutivePortal.tsx` with full command catalog (Navigation, Reports, Operations, System Actions).
  - Verified in browser via Playwright (opening via `Ctrl+K` and header button, search filtering, arrow navigation, enter execution, sequence `g` then `o`, shortcuts help via `?`, and outside click dismissal).
