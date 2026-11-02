# Security Policy (`SECURITY.md`)

## Supported Versions

| Version | Schema | Supported |
| :--- | :--- | :--- |
| `2.0.x` (Enterprise Web) | `PlatformDatabaseV2` | ✅ Active |
| `1.0.x` (Legacy Python CLI) | `LegacyV1Snapshot` | ❌ Deprecated (Auto-migrated to v2) |

## Security Architecture Highlights

1. **Password Hashing:** All user, staff, and administrator passwords are salted and hashed via `hashPassword()` (`rp_sha256$...`) in `src/services/authService.ts`. Plaintext passwords are never stored in `PlatformDatabaseV2` or exposed on public login screens.
2. **Role-Based Access Control (`RoleGuard`):** Route access and UI rendering are strictly partitioned across `passenger`, `staff`, and `admin` roles.
3. **Cross-Account Protection:** Wallet operations (`depositToWallet`, `withdrawFromWallet`), ticket refunds (`refundTrainTicket`), and profile updates validate `userId` ownership before mutating state.
4. **Input Sanitization & Bounds Validation:** Numeric inputs (`parsePositiveNumber`, `parsePositiveInteger`) and email addresses (`isValidEmail` RFC regex) are validated prior to state execution.
