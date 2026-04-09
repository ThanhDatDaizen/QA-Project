/**
 * authUtils.ts - Utility functions for authentication and routing
 * Tìm tập trung logic routing dựa trên power level
 */

/**
 * Lấy đường dẫn dashboard dựa trên power level
 * @param power - Power level của user (1, 5, 10, 15, 18, 20)
 * @returns Dashboard path dùng để navigate
 */
export const getDashboardPath = (power?: number | null): string => {
  console.log('%c[TU-AUTH-UTIL] 🔍 getDashboardPath called', 'color: #0ea5e9; font-weight: bold;');
  console.log('Power value:', power, 'Type:', typeof power);
  
  if (!power && power !== 0) {
    console.warn('%c[TU-AUTH-UTIL] ⚠️ Power is undefined/null, using default /ideas', 'color: #f59e0b; font-weight: bold;');
    return '/ideas';
  }

  switch (power) {
    case 20:
      console.log(
        '%c[TU-AUTH-UTIL] 👑 SuperAdmin (power=20) → /superadmin',
        'color: #fbbf24; font-weight: bold;'
      );
      return '/superadmin';
    
    case 18:
      console.log(
        '%c[TU-AUTH-UTIL] 🛠️ Admin (power=18) → /admin',
        'color: #0ea5e9; font-weight: bold;'
      );
      return '/admin';
    
    case 15:
      console.log(
        '%c[TU-AUTH-UTIL] 📊 QA Manager (power=15) → /qamanager',
        'color: #10b981; font-weight: bold;'
      );
      return '/qamanager';
    
    case 10:
      console.log(
        '%c[TU-AUTH-UTIL] 🛡️ QA Coordinator (power=10) → /qacoordinator',
        'color: #8b5cf6; font-weight: bold;'
      );
      return '/qacoordinator';
    
    case 5:
      console.log(
        '%c[TU-AUTH-UTIL] ✍️ Contributor (power=5) → /staff',
        'color: #60a5fa; font-weight: bold;'
      );
      return '/staff';
    
    case 1:
      console.log(
        '%c[TU-AUTH-UTIL] 👁️ Viewer (power=1) → /viewer',
        'color: #9ca3af; font-weight: bold;'
      );
      return '/viewer';
    
    default:
      console.warn(
        `%c[TU-AUTH-UTIL] ❓ Unknown power level (${power}), using default /ideas`,
        'color: #f59e0b; font-weight: bold;'
      );
      return '/ideas';
  }
};

/**
 * Xác định power level minimum cần thiết cho một route
 * @param path - Dashboard path (ví dụ: /admin, /staff)
 * @returns Minimum power level required
 */
export const getMinPowerForRoute = (path: string): number => {
  switch (path) {
    case '/superadmin':
      return 20;
    case '/admin':
      return 18;
    case '/qamanager':
      return 15;
    case '/qacoordinator':
      return 10;
    case '/staff':
      return 5;
    case '/viewer':
      return 1;
    default:
      return 1; // Default to viewer level for generic routes
  }
};
