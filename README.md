<div align="center">

# RailPulse Enterprise

### Next-Generation Intelligent Railway Infrastructure, Operations Command & High-Speed Travel Reservation Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-2563EB.svg)](./LICENSE)
[![TypeScript 5.8+](https://img.shields.io/badge/TypeScript-5.8+-3178C6.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC.svg)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-10B981.svg)](#progressive-web-app-pwa)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.x-8B5CF6.svg)](https://www.framer.com/motion/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-059669.svg)](#accessibility--wcag-21-aa)
[![QA Suite](https://img.shields.io/badge/Automated_QA-5_Phases_%7C_100%25_Passing-10B981.svg)](#qa-test-suite--diagnostics)

<br/>

**[Overview](#project-overview)** • **[Key Features](#key-features)** • **[Visual Subsystems](#visual-subsystems-gallery)** • **[Collision Physics](#temporal-spatial-collision-physics-engine)** • **[PWA Architecture](#progressive-web-app-pwa)** • **[System Architecture](#system-architecture--file-structure)** • **[Quickstart](#quickstart)**

</div>

---

## Project Overview

**RailPulse Enterprise** is an enterprise-grade railway operations, dispatch telemetry, and passenger reservation platform modeled after industry-leading transport systems (*Trainline, Eurostar, Linear, and Stripe Dashboard*). Re-engineered from a legacy Python CLI terminal prototype into a modern, production-deployable full-stack TypeScript web application, it delivers:

- **Zero Mock Fallbacks:** Realistic localized persistent database with deep-cloned immutable states.
- **True Bidirectional Localization:** Seamless real-time switching between Persian (RTL layout, Iranian Rial `IRR`, and `Vazirmatn FD` typography) and English (LTR layout, United States Dollar `USD`, and `Plus Jakarta Sans` typography).
- **Dual-Layout Architecture:** Complete separation between the public consumer booking interface (`CustomerStorefrontLayout`) and the high-density operational command center (`EnterpriseBackofficeLayout`).
- **Mathematical Safety Dispatch Engine (`checkAccident`):** Strict headway enforcement across rail corridor segments and station platforms (20-minute dwell stops, mandatory 5-minute safety buffer) with automated alternative departure calculation.
- **Progressive Web App (PWA):** Installable directly on desktop and mobile devices via standard web app manifest, offline service worker caching, and custom in-app install prompts.
- **Enterprise Role-Based Access Control (`RoleGuard`):** Strict route authorization isolating Passenger, Operations Staff, and System Administrator privileges with zero credential exposure.

---

## Key Features

| Functional Domain | Architectural Highlights & Capabilities |
| :--- | :--- |
| **Dual-Layout Separation** | Distinct layouts for public travelers (`CustomerStorefrontLayout`) and operations personnel (`EnterpriseBackofficeLayout`). |
| **Bi-Directional Localization** | Real-time locale toggling across layout directions, currencies (IRR / USD), and localized number formatters. |
| **Collision Prevention Engine** | Deterministic temporal-spatial calculation of station platform overlaps and in-transit overtakes with automated safe slot discovery. |
| **Coach Seat Selection** | Interactive coach layout with seat availability states, window/aisle designations, and instant capacity calculation. |
| **QR Digital Boarding Pass** | Official travel documents featuring unique 5-digit PNR tracking codes, ticket cancellation with instant wallet refund, and QR validation. |
| **Atomic Digital Wallet** | Real-time financial ledger supporting credit top-ups, withdrawals, ticket purchases, and full automated refund credits. |
| **Executive Analytics** | Recharts 12-month and 30-day revenue AreaCharts, animated KPI summary cards, and live reactive alert notifications. |
| **Progressive Web App (PWA)** | Full PWA compliance with `manifest.json`, high-resolution icons (192px, 512px, maskable, Apple Touch), and offline support. |
| **WCAG 2.1 AA Accessibility** | Semantic ARIA landmark roles (`role="banner"`, `role="navigation"`, `role="region"`, `role="search"`, `role="dialog"`), accessible labels, and focus rings. |
| **5-Phase Automated QA Suite** | Built-in administrative diagnostic runner testing Unit formulas, Integration flows, Data Migration, E2E journeys, and RBAC isolation. |

---

## Visual Subsystems Gallery

The platform features simultaneous support for Persian (RTL) and English (LTR) across all subsystems:

### 1. Storefront & Live Departures

| Persian | English |
|:-------:|:-------:|
| ![Storefront Persian](./docs/screenshots/01-storefront-fa.png) | ![Storefront English](./docs/screenshots/01-storefront-en.png) |

---

### 2. Passenger Portal & Booking Engine

| Persian | English |
|:-------:|:-------:|
| ![Passenger Booking Persian](./docs/screenshots/02-passenger-booking-fa.png) | ![Passenger Booking English](./docs/screenshots/02-passenger-booking-en.png) |

---

### 3. Digital Boarding Pass & QR Modal

| Persian | English |
|:-------:|:-------:|
| ![Boarding Pass Persian](./docs/screenshots/03-boarding-pass-fa.png) | ![Boarding Pass English](./docs/screenshots/03-boarding-pass-en.png) |

---

### 4. Operations Dispatch & Marey Diagram

| Persian | English |
|:-------:|:-------:|
| ![Staff Operations Persian](./docs/screenshots/04-staff-operations-fa.png) | ![Staff Operations English](./docs/screenshots/04-staff-operations-en.png) |

---

### 5. Executive Administration & Revenue Analytics

| Persian | English |
|:-------:|:-------:|
| ![Admin Analytics Persian](./docs/screenshots/05-admin-analytics-fa.png) | ![Admin Analytics English](./docs/screenshots/05-admin-analytics-en.png) |

---

### 6. QA Test Suite & Diagnostics

| Persian | English |
|:-------:|:-------:|
| ![QA Suite Persian](./docs/screenshots/06-qa-suite-fa.png) | ![QA Suite English](./docs/screenshots/06-qa-suite-en.png) |

---

## Temporal-Spatial Collision Physics Engine

The safety dispatch engine evaluates schedules across corridor topologies to prevent both **station platform dwell conflicts** and **in-transit overtake conflicts**:

```text
Station Arrival:   T_arr(s) = T_dep(s-1) + [dist(s-1, s) / speed] * 60
Station Departure: T_dep(s) = T_arr(s) + 20 min (Platform Dwell Stop)
Headway Safety:    |T_dep(Train_A, s) - T_dep(Train_B, s)| >= 5 min
```

If a temporal overlap or block overtake is detected, the engine projects forward from the candidate departure time in 5-minute increments until a safe, conflict-free window is verified:

```text
Earliest Safe Departure = min { t > T_candidate | checkAccident(t) == SAFE }
```

---

## Progressive Web App (PWA)

RailPulse Enterprise is fully configured as an installable Progressive Web App:

- **Web App Manifest (`public/manifest.json`):**
  - Unique application ID: `/`
  - Display mode: `standalone` (executes without browser URL chrome)
  - Color theme: `#0f172a` matching dark backoffice palette
  - Platform shortcuts: Instant access to Ticket Booking, Operations Backoffice, and Executive Analytics
- **Icon Suite (`public/icons/`):**
  - Scalable vector icon (`icon.svg`)
  - Standard launcher icons (`icon-192.png`, `icon-512.png`)
  - Adaptive Android maskable icon with 10% safe zone padding (`icon-maskable-512.png`)
  - iOS Safari home screen bookmark icon (`apple-touch-icon.png`)
- **Service Worker (`public/sw.js`):** Pre-caches application shell, typography, and assets for offline reliability.
- **In-App Install Prompt (`PWAInstallButton`):** Custom install button mounted in top navigation bars with guided fallback instructions for iOS Safari users.

---

## System Architecture & File Structure

```text
railpulse-enterprise/
├── .github/workflows/
│   ├── ci.yml                     # GitHub Actions CI (lint, test, build)
│   └── test.yml                   # Automated Vitest test runner on every push
├── .editorconfig                  # Consistent cross-editor formatting rules
├── .gitattributes                 # LF line-ending normalization
├── .env.example                   # Environment configuration template
├── README.md                      # International standard documentation
├── ARCHITECTURE.md                # System architecture & collision equations
├── CONTRIBUTING.md                # Engineering contribution guidelines
├── SECURITY.md                    # Security policies & vulnerability reporting
├── LICENSE                        # MIT Open Source License
├── docs/screenshots/              # 12 paired bilingual screenshots (FA & EN)
├── public/
│   ├── manifest.json              # Web App Manifest for PWA installation
│   ├── sw.js                      # Service Worker for offline asset caching
│   └── icons/                     # Vector and PNG icons (192px, 512px, maskable)
├── index.html                     # HTML5 entry with PWA tags & typography
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript 5.8 strict compiler options
├── vitest.config.ts               # Vitest test framework configuration
└── src/
    ├── App.tsx                    # Route engine, session manager & global toasts
    ├── config/env.ts              # Typed environment variables
    ├── types/domain.ts            # Normalized Enterprise v2 data models
    ├── guards/RoleGuard.tsx       # RBAC route authorization guard
    ├── hooks/
    │   └── usePWAInstall.ts       # Hook managing beforeinstallprompt & PWA events
    ├── layouts/
    │   ├── CustomerStorefrontLayout.tsx   # Public B2C travel layout
    │   └── EnterpriseBackofficeLayout.tsx # B2B vertical sidebar operational layout
    ├── services/
    │   ├── authService.ts         # SHA-256 hashing, session tokens & formatters
    │   ├── collisionEngine.ts     # checkAccident math & alternate safe slot
    │   ├── bookingEngine.ts       # Seat allocation, atomic wallet & PNR issuance
    │   ├── alertCenterService.ts  # Reactive notification stream
    │   ├── storageAndMigration.ts # Idempotent legacy v1 to v2 schema migration
    │   └── qaTestSuite.ts         # 5-Phase automated programmatic test suite
    ├── components/
    │   ├── SeatMapSelector.tsx    # Interactive coach layout with leather seats
    │   ├── DigitalBoardingPassModal.tsx # Verifiable QR boarding pass modal
    │   ├── MareyChart.tsx         # Time-distance train movement diagram
    │   ├── RevenueAnalysis.tsx    # Recharts 30-day & 12-month analytics
    │   ├── QATestSuitePanel.tsx   # Built-in administrative QA test runner
    │   └── ui/
    │       ├── RailPulseLogo.tsx  # Modern vector SVG brand identity
    │       ├── PWAInstallButton.tsx # In-app PWA install trigger & iOS guide
    │       ├── KpiStatCard.tsx    # Animated metric card with spring physics
    │       └── StatusBadge.tsx    # Semantic status badge
    └── pages/
        ├── public/
        │   ├── PublicHomePage.tsx # Storefront search & live departures
        │   └── AuthPage.tsx       # Authentication portal
        ├── passenger/
        │   └── PassengerDashboard.tsx # Booking, tickets & wallet
        ├── staff/
        │   └── StaffOperationsPortal.tsx # Railway dispatching & radar
        └── admin/
            └── AdminExecutivePortal.tsx  # Executive KPIs & QA runner
```

---

## Accessibility & WCAG 2.1 AA

- **Semantic Landmark Roles:** `role="banner"`, `role="navigation"`, `role="dialog"`, `role="search"`, and `role="region"` applied across all views.
- **Screen Reader Readiness:** Descriptive `aria-label`, `aria-current`, `aria-expanded`, and `aria-modal` attributes on every interactive element.
- **Keyboard Navigation:** High-contrast `focus:ring-2 focus:ring-blue-500` outlines on all focusable targets.
- **Color Contrast Compliance:** Exceeds 4.5:1 ratio for standard body text and 3.0:1 for large graphical interface components.

---

## Default Seed Credentials (Evaluation)

> **Notice:** Default credentials are documented for developers and evaluators. No plaintext credentials or role-switching bars are rendered on public screens.

| Portal Role | Identifier | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin.chief` | `Admin@123` | Executive Analytics, Staff Management, Audit Trail, 5-Phase QA Suite |
| **Operations Staff** | `mohammadi.control` | `Staff@123` | Corridor Topology, Timetable Dispatch, Collision Radar, Marey Chart |
| **Registered Passenger** | `sara.ahmadi@example.com` | `Passenger@123` | Online Booking, Coach Seat Map, Digital Wallet (IRR 45,000,000 / $450) |
| **Sample Passenger** | `mahdi.asadi@example.com` | `user123` | Pre-booked Ticket RP-89412 on TR-101 (Fadak Royal Express) |

---

## Quickstart

### Prerequisites
- Node.js `20.x` or later
- npm or bun

### 1. Clone & Install
```bash
git clone https://github.com/Mahdias1383/management_system.git
cd management_system
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000`.

### 4. Code Quality & Build Verification
```bash
# Typecheck & lint
npm run lint

# Run Vitest automated test suites
npm test

# Production build
npm run build
```

---

## License

This project is open-source and available under the **[MIT License](./LICENSE)**.
