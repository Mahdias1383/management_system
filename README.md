# RailPulse Enterprise — Integrated Railway Operations, Safety Dispatch & Passenger Reservation Platform

**RailPulse Enterprise (پلتفرم جامع مدیریت هوشمند خطوط ریلی و رزرواسیون بلیط)** is a modern React 19 + TypeScript + Tailwind CSS v4 web platform re-engineered from the legacy Python CLI train management codebase.

## Key Capabilities
- **Bilingual & Bi-Directional UI:** Instant switching between **Persian (فارسی - RTL)** with `Vazirmatn` and **English (LTR)** with `Plus Jakarta Sans` & `JetBrains Mono`, plus Dark/Light theme support.
- **Temporal-Spatial Railway Collision Detection (`checkAccident`):** Mathematical arrival/departure engine detecting both **Station Platform Overlaps** and **Track Segment Overtakes/Headway Violations** (with a 5-minute mandatory buffer), visualized via an interactive **Marey's Time-Distance Train Schedule Graph** and automatic safe departure slot recommender.
- **3 Role-Based Portals & Quick Persona Switcher:**
  - **System Administrator Portal:** Executive KPIs, Operations Staff CRUD (`add_employee`, `remove_employee`, `employees_information`), RFC email & password strength validation, and JSON snapshot export/import/reset.
  - **Train Operations & Dispatch Staff Portal:** Railway Line CRUD (`add_train_line`, `update_line`, `remove_line`, `view_lines`) with visual route topology, and Train Fleet CRUD (`add_train`, `remove_train`, `view_trains`) guarded by `checkAccident`.
  - **Passenger Booking & Wallet Portal:** Smart train search & filtering, atomic ticket purchasing (`user_shopping`), verifiable QR digital boarding passes with instant cancellation/refunds, atomic digital wallet (`add_money`, `decrease_money`), and strictly session-isolated profile management (`edit_profile`).
- **Built-In 5-Phase Automated QA Suite:** Live programmatic test runner executing 11 test suites across Unit, Integration, Schema Migration (`v1` Python dicts to `v2` normalized entities), E2E, and Session/UI Isolation phases.
