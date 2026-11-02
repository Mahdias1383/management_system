import React from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { ActiveSession, Language, UserRole } from '../types/domain';
import { isAuthorizedForRole } from '../services/authService';

interface RoleGuardProps {
  session: ActiveSession | null;
  allowedRoles: UserRole[];
  lang: Language;
  onRedirectToLogin: (requiredRole?: UserRole) => void;
  onReturnHome: () => void;
  children: React.ReactNode;
}

/**
 * Enforces strict Role-Based Access Control (RBAC).
 * Prevents unauthenticated users or users with a different role (e.g., Passenger trying to view Staff/Admin)
 * from viewing or interacting with protected portals.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  session,
  allowedRoles,
  lang,
  onRedirectToLogin,
  onReturnHome,
  children,
}) => {
  const isFa = lang === 'fa';
  const check = isAuthorizedForRole(session, allowedRoles);

  if (!check.authorized) {
    const targetRole = allowedRoles[0] || 'passenger';
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isFa ? 'دسترسی محدود شده — نیازمند احراز هویت مجاز' : 'Restricted Access — Authorization Required'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {isFa ? check.reasonFa : check.reasonEn}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={onReturnHome}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {isFa ? 'بازگشت به صفحه اصلی' : 'Back to Home'}
            </button>
            <button
              type="button"
              onClick={() => onRedirectToLogin(targetRole)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isFa ? 'ورود به حساب مجاز' : 'Sign In with Authorized Role'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
