<div align="center">

# RailPulse Enterprise
### Next-Generation Intelligent Railway Operations, Collision Prevention & High-Speed Travel Reservation Platform
**سامانه جامع مدیریت هوشمند خطوط ریلی، مهندسی ترافیک و رزرواسیون قطارهای سریع‌السیر**

[![License: MIT](https://img.shields.io/badge/License-MIT-2563EB.svg)](./LICENSE)
[![TypeScript 5.8+](https://img.shields.io/badge/TypeScript-5.8+-3178C6.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC.svg)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.x-8B5CF6.svg)](https://www.framer.com/motion/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-059669.svg)](#accessibility-wcag-21-aa-compliance)
[![QA Suite](https://img.shields.io/badge/Automated_QA-5_Phases_%7C_100%25_Passing-10B981.svg)](#6-built-in-5-phase-automated-engineering-qa-suite)

[Overview](#overview) • [Bilingual Visual Tour](#bilingual-product-gallery--visual-tour) • [Logo & Branding System](#railpulse-brand-identity--vector-logo-system) • [Architecture](#system-architecture--dual-layout-ux) • [Collision Physics Engine](#temporal-spatial-collision-prevention-engine-checkaccident) • [Quickstart](#local-development--quickstart)

</div>

---

## Overview

**RailPulse Enterprise** is an international, enterprise-grade railway management and high-speed passenger reservation platform modeled after world-class platforms (*Trainline, Eurostar, Linear, and Stripe Dashboard*). It transforms a legacy Python CLI terminal prototype into a modern, production-deployable full-stack TypeScript web application with **zero mock fallbacks**, **true bidirectional localization** (Persian RTL with Iranian Rial `IRR` and English LTR with United States Dollar `USD`), and **uncompromising role-based access control (`RoleGuard`)**.

### Key Architectural Pillars
- **Dual-Layout Architecture:** Strict isolation between the public, high-conversion **Customer Storefront** (`CustomerStorefrontLayout`) and the high-density, command-driven **Enterprise Backoffice** (`EnterpriseBackofficeLayout`).
- **Mathematical Safety Dispatch Engine (`checkAccident`):** Enforces a mandatory 5-minute temporal-spatial headway safety buffer across corridor segments and station platform dwell times (20 minutes). Prevents train collisions before schedule approval and recommends the earliest safe alternate departure time.
- **Interactive Coach Seat Selection:** Visual SVG-rendered 4-column coach layout with window/aisle designations, real-time availability locks, and instant balance deduction.
- **Perforated QR Digital Boarding Pass:** Generates verifiable, print-ready passenger travel documents with unique PNR tracking codes and base64-payload QR codes.
- **Executive Analytics & Alert Center:** Dynamic Recharts 12-month and 30-day revenue visualizations with Persian numeric digits (`Vazirmatn FD`) and real-time push alerts for high-revenue bookings and headway conflicts.
- **5-Phase Programmatic Test Suite:** Comprehensive built-in test runner located strictly inside the administrator backoffice, validating Unit calculations, Integration workflows, Data Migration, End-to-End journeys, and RBAC boundary isolation.

---

## RailPulse Brand Identity & Vector Logo System

The **RailPulse Enterprise** brand identity embodies velocity, technological precision, and unwavering safety. 

```text
              ╭──────────────────────────────────────────────╮
              │               RAILPULSE LOGO                 │
              │                                              │
              │   [▲] Aerodynamic Bullet Train Silhouette    │
              │   [∿] Real-time Pulse Waveform Frequency     │
              │   [═] Converging High-Speed Perspective Track│
              │   [✦] Luminous Cyan/Blue Gradients           │
              ╰──────────────────────────────────────────────╯
```

### Logo Component Architecture (`src/components/ui/RailPulseLogo.tsx`)
The logo is engineered as an ultra-crisp, scalable SVG component supporting dark and light themes, configurable sizes (`sm`, `md`, `lg`, `xl`), and layout variants (`icon`, `full`, `lockup`):

```tsx
import { RailPulseLogo } from '@/components/ui';

// 1. Icon-only variant for compact spaces or mobile viewports
<RailPulseLogo size="sm" variant="icon" />

// 2. Full brand lockup with English & Persian bilingual typography
<RailPulseLogo size="md" variant="full" />
```

### Integration in Dashboard Headers:
1. **Public Storefront (`CustomerStorefrontLayout.tsx`):** Positioned at the top-start of the primary navigation bar with `size="md"` and `variant="full"`, wrapped inside an accessible semantic link with `role="banner"`.
2. **Enterprise Backoffice (`EnterpriseBackofficeLayout.tsx`):** Rendered prominently inside the sticky vertical sidebar header. When the sidebar collapses into icon-only mode, the logo dynamically switches from `variant="full"` to `variant="icon"`.
3. **Digital Boarding Pass Modal (`DigitalBoardingPassModal.tsx`):** Integrated into the boarding pass header ticket banner alongside passenger PNR telemetry.

---

## Bilingual Product Gallery & Visual Tour

Every major subsystem of RailPulse Enterprise has been documented in both **Persian (FA — RTL)** and **English (EN — LTR)** to provide complete visual coverage for international teams and evaluators.

---

### 1. Public Storefront & High-Speed Search Engine
*Real-time corridor departure boards, responsive origin/destination station filters, and instant PNR tracking.*

| فارسی (Persian RTL · IRR ریال) | English (International LTR · USD $) |
| :---: | :---: |
| ![Storefront Persian RTL](./docs/screenshots/01-storefront-fa.png) | ![Storefront English LTR](./docs/screenshots/01-storefront-en.png) |
| *ویترین فروشگاهی با فونت استاندارد Vazirmatn FD، فرمت پولی ریال و موتور جستجوی هوشمند کریدورها* | *International Storefront with Plus Jakarta Sans typography, USD ($) pricing, and instant search* |

---

### 2. Passenger Reservation Portal, Coach Seat Map & Digital Wallet
*Interactive coach seat selection, atomic wallet transactions, and booking confirmation.*

| فارسی (Persian RTL · IRR ریال) | English (International LTR · USD $) |
| :---: | :---: |
| ![Passenger Portal Persian](./docs/screenshots/02-passenger-booking-fa.png) | ![Passenger Portal English](./docs/screenshots/02-passenger-booking-en.png) |
| *انتخاب صندلی از روی نقشه شماتیک واگن، نمایش صندلی‌های راهرو و پنجره، و کسر آنی از کیف پول* | *Interactive coach seat selection with real-time capacity meters and instant wallet checkout* |

---

### 3. Verified Digital Boarding Pass & QR Code Verification Modal
*Perforated boarding document featuring PNR reference, coach/seat assignment, and print-ready layout.*

| فارسی (Persian RTL · IRR ریال) | English (International LTR · USD $) |
| :---: | :---: |
| ![Boarding Pass Persian](./docs/screenshots/03-boarding-pass-fa.png) | ![Boarding Pass English](./docs/screenshots/03-boarding-pass-en.png) |
| *کارت سوارشدن رسمی با بارکد دیجیتال QR، کد پیگیری ۵ رقمی و لوگوی اختصاصی ریل‌پالس* | *Verified digital boarding pass modal featuring verifiable QR code and PNR ticket reference* |

---

### 4. Railway Operations Dispatch, Corridor Topology & Marey Diagram
*Corridor engineering, intermediate station dwell configurations, and temporal-spatial distance-time diagrams.*

| فارسی (Persian RTL · IRR ریال) | English (International LTR · USD $) |
| :---: | :---: |
| ![Staff Operations Persian](./docs/screenshots/04-staff-operations-fa.png) | ![Staff Operations English](./docs/screenshots/04-staff-operations-en.png) |
| *میز کار عملیات ریلی، تعریف ایستگاه‌های میانی و پایش نمودار مهندسی زمان-مسافت ماری (Marey)* | *Railway operations dispatch workspace featuring corridor topology and Marey time-distance radar* |

---

### 5. Executive Administration Dashboard & 12-Month Revenue AreaChart
*Executive KPI monitoring, Recharts 12-month revenue analytics, staff directory, and real-time alert center.*

| فارسی (Persian RTL · IRR ریال) | English (International LTR · USD $) |
| :---: | :---: |
| ![Admin Analytics Persian](./docs/screenshots/05-admin-analytics-fa.png) | ![Admin Analytics English](./docs/screenshots/05-admin-analytics-en.png) |
| *داشبورد مدیریتی با نمودار مساحتی درآمد ۱۲ ماهه (Recharts)، مرکز هشدار و پایش سلامت سیستم* | *Executive backoffice dashboard visualizing 12-month ticket revenue trends and system KPIs* |

---

### 6. Built-in 5-Phase Automated Engineering QA Suite
*Internal automated test runner embedded inside the Administrator Backoffice validating all critical system contracts.*

| فارسی (Persian RTL · IRR ریال) | English (International LTR · USD $) |
| :---: | :---: |
| ![QA Suite Persian](./docs/screenshots/06-qa-suite-fa.png) | ![QA Suite English](./docs/screenshots/06-qa-suite-en.png) |
| *اجرای آزمون‌های ۵گانه درون‌برنامه‌ای: آزمون‌های واحد، یکپارچه‌سازی، مهاجرت داده، E2E و ایزولاسیون RBAC* | *Full 5-phase automated test runner demonstrating 100% green test execution across all suites* |

---

## System Architecture & Dual-Layout UX

```text
                                  ┌──────────────────────────────┐
                                  │      RailPulse Platform      │
                                  │       App Root (App.tsx)     │
                                  └──────────────┬───────────────┘
                                                 │
                      ┌──────────────────────────┴──────────────────────────┐
                      ▼                                                     ▼
      ┌───────────────────────────────┐                     ┌───────────────────────────────┐
      │   CustomerStorefrontLayout    │                     │   EnterpriseBackofficeLayout  │
      │  (B2C Passenger Travel Portal)│                     │  (B2B Command & Dispatch Center)│
      └──────────────┬────────────────┘                     └───────────────┬───────────────┘
                     │                                                      │
         ┌───────────┴───────────┐                              ┌───────────┴───────────┐
         ▼                       ▼                              ▼                       ▼
  ┌──────────────┐        ┌──────────────┐               ┌──────────────┐        ┌──────────────┐
  │PublicHomePage│        │PassengerDash │               │StaffOperations│       │AdminExecutive│
  │ • Live Board │        │ • Seat Map   │               │ • Marey Chart│        │ • 12M Chart  │
  │ • PNR Lookup │        │ • Wallet     │               │ • Headway Chk│        │ • Alert Center│
  │ • Corridor Srch│      │ • BoardingPass│              │ • Fleet Sched│        │ • QA Runner  │
  └──────────────┘        └──────────────┘               └──────────────┘        └──────────────┘
```

### Directory Structure
```text
railpulse-enterprise/
├── .github/
│   └── workflows/
│       └── ci.yml               # Automated GitHub Actions CI (Lint, TypeCheck, Build)
├── .editorconfig                 # Standard editor configuration for indentation and formatting
├── .env                          # Local active environment variables
├── .env.example                  # Environment configuration template
├── .gitattributes                # Consistent LF line-ending normalization
├── .gitignore                    # Standard Git ignore rules
├── ARCHITECTURE.md               # Technical architecture, schema definitions & collision math
├── CONTRIBUTING.md               # Engineering guidelines, commit standards & PR workflow
├── LICENSE                       # MIT Open Source License
├── MEMORY_BANK.md                # Short-term engineering working memory & test matrix
├── README.md                     # International repository documentation
├── SECURITY.md                   # Security policy, vulnerability reporting & cryptographic details
├── docs/
│   └── screenshots/              # 12 paired bilingual screenshots (FA RTL & EN LTR)
├── index.html                    # HTML5 entry point with Vazirmatn & Plus Jakarta Sans typography
├── metadata.json                 # Application identity and permission boundaries
├── package.json                  # Dependencies, scripts & build configuration
├── src/
│   ├── main.tsx                  # Application bootstrap entry point
│   ├── App.tsx                   # Top-level state orchestrator & route coordinator
│   ├── index.css                 # Global styling, Tailwind CSS v4, Vazirmatn FD & animations
│   ├── config/
│   │   ├── env.ts                # Strictly typed environment variables accessor
│   │   └── index.ts              # Configuration barrel export
│   ├── types/
│   │   ├── domain.ts             # Domain models (Train, Line, Ticket, Passenger, Staff, Admin)
│   │   └── index.ts              # Types barrel export
│   ├── guards/
│   │   ├── RoleGuard.tsx         # Enterprise RBAC route protection
│   │   └── index.ts              # Guards barrel export
│   ├── layouts/
│   │   ├── CustomerStorefrontLayout.tsx # B2C Passenger layout with RailPulse Logo header
│   │   ├── EnterpriseBackofficeLayout.tsx # B2B Staff & Admin layout with vertical sidebar
│   │   └── index.ts              # Layouts barrel export
│   ├── services/
│   │   ├── authService.ts        # SHA-256 password hashing, token issuance & localization
│   │   ├── alertCenterService.ts # Real-time reactive notification stream
│   │   ├── bookingEngine.ts      # Seat allocation, atomic wallet ledger & PNR generation
│   │   ├── collisionEngine.ts    # Mathematical collision physics & headway safety check
│   │   ├── qaTestSuite.ts        # 5-Phase automated programmatic test runner
│   │   ├── storageAndMigration.ts# Idempotent legacy v1 to v2 schema migration engine
│   │   └── index.ts              # Services barrel export
│   ├── components/
│   │   ├── DigitalBoardingPassModal.tsx # Perforated QR boarding pass modal
│   │   ├── SeatMapSelector.tsx   # Interactive visual coach seat selector
│   │   └── ui/
│   │       ├── RailPulseLogo.tsx # Modern vector SVG brand logo component
│   │       ├── KpiStatCard.tsx   # Framer Motion animated metric card
│   │       ├── StatusBadge.tsx   # Accessible status badges
│   │       ├── ToastNotificationBanner.tsx # Feedback notifications
│   │       ├── motionPrimitives.ts # Standardized Framer Motion transition curves
│   │       └── index.ts          # UI barrel export
│   └── pages/
│       ├── public/
│       │   ├── PublicHomePage.tsx # Public travel search engine & departures
│       │   ├── AuthPage.tsx       # Secure multi-portal login/registration
│       │   └── index.ts
│       ├── passenger/
│       │   ├── PassengerDashboard.tsx # Passenger booking, tickets & wallet
│       │   └── index.ts
│       ├── staff/
│       │   ├── StaffOperationsPortal.tsx # Railway dispatch & Marey radar
│       │   └── index.ts
│       └── admin/
│           ├── AdminExecutivePortal.tsx # Executive analytics & QA suite
│           └── index.ts
└── tsconfig.json                 # TypeScript 5.8 configuration
```

---

## Temporal-Spatial Collision Prevention Engine (`checkAccident`)

The core railway safety engine prevents train collisions by evaluating both **intermediate station dwell conflicts** and **in-transit segment headway conflicts** between trains scheduled on the same corridor:

$$T_{\text{arr}}(s) = T_{\text{dep}}(s-1) + \frac{d(s-1, s)}{v} \cdot 60$$

$$T_{\text{dep}}(s) = T_{\text{arr}}(s) + \Delta t_{\text{dwell}} \quad (\text{where } \Delta t_{\text{dwell}} = 20 \text{ min})$$

### Safety Conflict Rules:
1. **Station Platform Conflict:** A collision hazard is triggered if two trains occupy the same station platform with less than the safety buffer $B = 5 \text{ min}$:
   $$|T_{\text{arr}, A}(s) - T_{\text{arr}, B}(s)| < 5 \quad \lor \quad |T_{\text{dep}, A}(s) - T_{\text{dep}, B}(s)| < 5$$
2. **Segment Headway Conflict:** An in-transit conflict occurs if train $B$ catches up with or overtakes train $A$ within segment $(s-1, s)$:
   $$[T_{\text{dep}, B}(s-1) - T_{\text{dep}, A}(s-1)] \cdot [T_{\text{arr}, B}(s) - T_{\text{arr}, A}(s)] \le 0$$
3. **Earliest Safe Alternate Time:** When a conflict is detected, the engine projects forward from the requested departure time until it finds a conflict-free slot:
   $$T_{\text{safe}} = \min \{ t > T_{\text{candidate}} \mid \text{checkAccident}(t) = \text{SAFE} \}$$

---

## Default Seed Credentials (Internal Documentation)

> **Security Note:** In compliance with principal engineering standards, credentials are never rendered on public storefront screens. Default credentials for local development and technical evaluation:

| Role | Username / Identifier | Password | Default Scope |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin.chief` | `Admin@123` | Executive Dashboard, Staff Management, Audit Trail, 5-Phase QA Suite |
| **Railway Operations Staff** | `mohammadi.control` | `Staff@123` | Corridor Topology, Train Scheduling, Marey Diagram, Collision Radar |
| **Registered Passenger** | `sara.ahmadi@example.com` | `Passenger@123` | Online Booking, Coach Seat Map, Digital Wallet (IRR 45,000,000 / $450) |
| **Alternate Passenger** | `mahdi.asadi@example.com` | `user123` | Pre-booked Ticket RP-89412 on TR-101 (Fadak Royal HSR) |

---

## Environment Variables Configuration

The platform is configured using standard environment variables loaded at build and run time:

```bash
# Copy the environment template
cp .env.example .env
```

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_APP_TITLE` | `RailPulse Enterprise` | Application title displayed across browsers and OpenGraph meta tags |
| `VITE_APP_VERSION` | `2.4.0` | Active semantic release version |
| `VITE_DEFAULT_LOCALE` | `fa` | Initial locale (`fa` for Persian RTL or `en` for English LTR) |
| `VITE_DEFAULT_THEME` | `dark` | Initial color theme mode (`dark` or `light`) |
| `VITE_USD_EXCHANGE_RATE`| `100000` | Nominal exchange rate for currency conversions ($1.00 USD = 100,000 IRR) |
| `VITE_STORAGE_KEY` | `railpulse_enterprise_db_v2_irr` | LocalStorage namespace key for persistent database state |
| `VITE_SESSION_STORAGE_KEY` | `railpulse_active_session_v2` | LocalStorage namespace key for active session state |
| `VITE_COLLISION_SAFETY_BUFFER_MINUTES` | `5` | Headway safety buffer enforced by `checkAccident` |
| `VITE_DEFAULT_STATION_DWELL_MINUTES` | `20` | Intermediate station dwell stop time in minutes |
| `VITE_PNR_PREFIX` | `RP` | Prefix used for generated booking reference codes |

---

## Accessibility (WCAG 2.1 AA Compliance)

RailPulse Enterprise implements comprehensive accessibility features:
- **Semantic ARIA Roles:** `role="banner"`, `role="navigation"`, `role="dialog"`, `role="search"`, and `role="region"` applied across layouts and modals.
- **Screen Reader Compatibility:** Interactive elements have explicit `aria-label`, `aria-current`, `aria-expanded`, and `aria-modal` attributes.
- **Focus Rings & Keyboard Navigation:** High-contrast `focus:ring-2 focus:ring-blue-500` outlines ensure complete keyboard navigability.
- **Color Contrast:** Contrast ratios across all color themes strictly exceed 4.5:1 for body copy and 3.0:1 for large display elements.

---

## Local Development & Quickstart

### Prerequisites
- Node.js `20.x` or later
- npm or bun

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/Mahdias1383/management_system.git
cd management_system
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Start Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### 4. Run Typecheck & Linter
```bash
npm run lint
```

### 5. Build for Production
```bash
npm run build
```

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.
