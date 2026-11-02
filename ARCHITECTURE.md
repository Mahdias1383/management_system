# System Architecture & Engineering Specification (`ARCHITECTURE.md`)

## 1. Legacy Remediation & State Normalization (`v1` $\to$ `v2`)

The original Python CLI project relied on four volatile in-memory dictionaries (`user_dict`, `employee_dict`, `line_dic`, `train_dic`) and exhibited several critical defects:
- **Shared Mutable Reference Bugs:** In `panel_train_staff.py`, `list_state = []` and `train_info_dict = {}` were declared outside the `while True` input loop. Adding a second railway line or train mutated the station list and stop times of previously created lines/trains.
- **Unbounded Stack Recursion:** Every CLI menu called `get_back()` or re-invoked `self.display_panel()`, growing the call stack indefinitely.
- **Cross-Account Session Bleed:** `Shopping_Panel` held a single `self.balance` attribute unbound to the logged-in user record in `user_dict`, and `edit_profile()` prompted for any arbitrary `username` without verifying ownership.
- **Arithmetic & Type Vulnerabilities:** `add_money()` compared `elif amount < 0:` while `amount` was still a `str`, raising `TypeError`. Furthermore, choosing `"no"` inside `decrease_money()`'s `get_back()` erroneously invoked `self.add_money()`.

### How RailPulse Enterprise Solves These Defects
1. **Immutable Deep-Cloned Persistence (`src/services/storageAndMigration.ts`):** Every entity read or written to `PlatformDatabaseV2` passes through `deepClone()`, guaranteeing zero shared array/object references across railway lines or trains.
2. **Idempotent Schema Migration (`migrateV1ToV2`):** Automatically transforms legacy `v1` snapshots into normalized `v2` collections (`employees`, `passengers`, `lines`, `trains`, `tickets`, `transactions`, `auditLogs`) with salted SHA-256 simulated password hashes (`rp_sha256$...`).
3. **Strict RBAC Route & Session Isolation (`src/guards/RoleGuard.tsx`):** Every protected portal verifies `session.role` and `session.userId`. Passengers have zero visibility or route access to Staff or Admin workspaces, and all wallet/ticket/profile operations require an explicit `userId` match.

---

## 2. Mathematical Formulation of the `checkAccident` Collision Engine

Located in `src/services/collisionEngine.ts`, the dispatch safety engine models each corridor as an ordered sequence of stations $S_0, S_1, \dots, S_n$ with segment distances $d_1, d_2, \dots, d_n$ (in kilometers).

### Station Arrival & Departure Kinematics
For a train $T$ departing origin $S_0$ at clock minute $D_{T, 0}$ with average velocity $v_T$ (km/h) and station dwell times $w_{T, i}$ (minutes):

$$A_{T, 0} = D_{T, 0}$$

For each subsequent station $i \in \{1, \dots, n\}$:

$$\Delta t_{T, i} = \frac{d_i}{v_T} \times 60 \quad \text{(minutes)}$$

$$A_{T, i} = D_{T, i-1} + \Delta t_{T, i}$$

$$D_{T, i} = \begin{cases} A_{T, i} + w_{T, i} & \text{if } 1 \le i < n \\ A_{T, n} & \text{if } i = n \end{cases}$$

### Conflict Type 1: Station Platform Overlap
Two trains $T_1, T_2$ assigned to the same corridor experience a **Station Platform Collision** at intermediate station $S_i$ ($1 \le i < n$) if their dwell intervals intersect:

$$[A_{T_1, i}, D_{T_1, i}] \cap [A_{T_2, i}, D_{T_2, i}] \neq \emptyset \iff \max(A_{T_1, i}, A_{T_2, i}) \le \min(D_{T_1, i}, D_{T_2, i})$$

### Conflict Type 2: Track Segment Overtake & Headway Violation
On track block $B_i = (S_{i-1} \to S_i)$ ($1 \le i \le n$) with mandatory safety headway buffer $H = 5\text{ minutes}$, a **Track Segment Collision** occurs if:
1. **Entry Headway Violation:** $|D_{T_1, i-1} - D_{T_2, i-1}| < H$
2. **In-Block Overtake / Catch-Up:** Train $T_1$ departs $S_{i-1}$ at or before $T_2$ ($D_{T_1, i-1} \le D_{T_2, i-1}$), yet $T_2$ arrives at $S_i$ before $T_1$ clears the block plus headway ($A_{T_2, i} \le A_{T_1, i} + H$).

### Automated Safe Slot Recommender
When `checkAccident` detects one or more conflicts for a candidate departure time $t_0$, it iteratively probes $t_k = (t_0 + 10k) \bmod 1440$ for $k \in \{1, \dots, 144\}$ until it identifies the earliest conflict-free departure slot across all stations and track blocks.

---

## 3. Dual-Layout Presentation Architecture

- **`CustomerStorefrontLayout.tsx`:** Designed for high-conversion B2C passenger flows (Public Home, PNR Lookup, Passenger Dashboard). Features a clean consumer travel header, quick wallet balance indicator for signed-in passengers, and a subtle footer link to the corporate staff portal.
- **`EnterpriseBackofficeLayout.tsx`:** Designed for high-density B2B railway operations (`StaffOperationsPortal` and `AdminExecutivePortal`). Features a persistent collapsible vertical sidebar, contextual breadcrumbs, active operator badge, and tabular data grids.
