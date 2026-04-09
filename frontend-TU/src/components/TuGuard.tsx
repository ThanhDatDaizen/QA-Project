// ===================================================
// TuGuard.tsx - Route Protection Component
// Tú bảo vệ route chỉ cho authenticated users
// ===================================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTuIdentity } from '../context/TuIdentityContext';

interface TuGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredRole?: string | string[];
  anyRole?: boolean;
}

/**
 * TuGuard - Tú check authentication trước khi cho access vào route
 * Nếu chưa login, redirect tới /login
 * Nếu yêu cầu admin nhưng user không phải admin, redirect tới /
 */
export const TuGuard: React.FC<TuGuardProps> = ({ 
  children, 
  requireAdmin = false,
  requiredRole,
  anyRole = false
}) => {
  const { isAuthenticated, user } = useTuIdentity();

  console.log(
    '%c[TU-GUARD] 🔐 Checking authentication...',
    'color: #0ea5e9; font-weight: bold;'
  );
  console.log(`  Authenticated: ${isAuthenticated}`);
  console.log(`  Require Admin: ${requireAdmin}`);
  console.log(`  Required Roles: ${requiredRole ? JSON.stringify(requiredRole) : 'none'}`);
  console.log(`  Any Role: ${anyRole}`);

  // Tú nếu chưa authenticate, redirect tới login
  if (!isAuthenticated) {
    console.warn('%c[TU-GUARD] ⚠️ User not authenticated, redirecting to login', 'color: #ff8800;');
    return <Navigate to="/login" replace />;
  }

  // Tú nếu cần admin nhưng user không phải admin (check power >= 18)
  if (requireAdmin && (user?.power || 0) < 18) {
    console.warn('%c[TU-GUARD] ⚠️ User power level insufficient (need >= 18), redirecting to home', 'color: #ff8800;');
    return <Navigate to="/" replace />;
  }

  // Tú check required roles nếu có
  if (requiredRole && user) {
    const rolesArray = typeof requiredRole === 'string' ? [requiredRole] : requiredRole;
    const userRole = user.role || '';
    const hasRole = rolesArray.includes(userRole);

    if (!hasRole) {
      console.warn(
        `%c[TU-GUARD] ⚠️ User role '${userRole}' not in required roles ${JSON.stringify(rolesArray)}, redirecting`,
        'color: #ff8800;'
      );
      return <Navigate to="/" replace />;
    }
  }

  console.log('%c[TU-GUARD] ✅ Access granted', 'color: #10b981;');
  return <>{children}</>;
};

export default TuGuard;
