// ===================================================
// LOGIN PAGE - ICMS Authentication Portal
// Thiết kế: Dark Mode, Premium UI with Icons & Effects
// ===================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTuIdentity } from '../context/TuIdentityContext';
import { getDashboardPath } from '../utils/authUtils';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading } = useTuIdentity();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState<string | null>(null);

  // ===================================================
  // VALIDATION
  // ===================================================
  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===================================================
  // HANDLE SUBMIT
  // ===================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      console.log(
        '%c[TU-AUTH]: ⚡ Clearing old session before new login...',
        'color: #f59e0b; font-weight: bold; font-size: 14px;'
      );
      
      // 🔥 CLEAR OLD TOKENS & SESSION DATA
      localStorage.removeItem('tu_jwt_token');
      localStorage.removeItem('tu_user_info');
      localStorage.removeItem('tu_refresh_token');
      sessionStorage.clear();
      
      console.log(
        '%c[TU-AUTH]: ✅ Old session cleared. Starting fresh login...',
        'color: #06b6d4; font-weight: bold; font-size: 14px;'
      );
      console.log(`📧 Email: ${email}`);

      // Call login function
      await login(email, password);

      // Get user info after login and redirect
      const storedUserStr = localStorage.getItem('tu_user_info');
      const storedPowerStr = localStorage.getItem('tu_user_power');
      
      console.log('%c[TU-LOGIN-PAGE] 📦 Checking localStorage after login...', 'color: #06b6d4; font-weight: bold;');
      console.log('tu_user_info:', storedUserStr ? JSON.parse(storedUserStr) : 'NOT FOUND');
      console.log('tu_user_power (raw string):', storedPowerStr);
      
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        console.log(
          '%c[TU-LOGIN-PAGE] ✅ Login Success! Redirecting...',
          'color: #10b981; font-weight: bold;'
        );
        console.log(`👤 Role: ${storedUser.role}, ⚡ Power: ${storedUser.power} (type: ${typeof storedUser.power})`);

        // Use centralized getDashboardPath for routing
        const redirectPath = getDashboardPath(storedUser.power);
        console.log(`%c[TU-LOGIN-PAGE] 🎯 getDashboardPath(${storedUser.power}) returned: "${redirectPath}"`, 'color: #fbbf24; font-weight: bold;');
        navigate(redirectPath);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Invalid email or password';
      console.log(
        '%c[TU-AUTH] ❌ Login Failed!',
        'color: #ef4444; font-weight: bold;'
      );
      setLoginError(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="text-4xl mb-2">🚀</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              ICMS Login
            </h1>
            <p className="text-slate-400 text-sm">Ideas & Code Management System</p>
          </div>

          {/* Error Alert */}
          {loginError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start space-x-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-red-200 font-medium text-sm">{loginError}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                <span className="inline-flex items-center">
                  <span>✉️ Email Address</span>
                </span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="admin@icms.local"
                className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg transition-all focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500/50'
                    : 'border-slate-600 hover:border-slate-500 focus:ring-cyan-500/50 focus:border-cyan-500'
                } text-slate-100 placeholder-slate-400`}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1 flex items-center">
                  <span className="mr-1">❌</span>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                <span className="inline-flex items-center">
                  <span>🔒 Password</span>
                </span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                placeholder="••••••••"
                className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg transition-all focus:outline-none focus:ring-2 ${
                  errors.password
                    ? 'border-red-500 focus:ring-red-500/50'
                    : 'border-slate-600 hover:border-slate-500 focus:ring-cyan-500/50 focus:border-cyan-500'
                } text-slate-100 placeholder-slate-400`}
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1 flex items-center">
                  <span className="mr-1">❌</span>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all duration-300 flex items-center justify-center space-x-2 ${
                loading
                  ? 'bg-slate-600 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/50 hover:scale-105 active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>🔓</span>
                  <span>Login to ICMS</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="border-t border-slate-700 pt-4 text-center space-y-3">
            <p className="text-slate-400 text-sm">
              Demo Credentials: <br />
              <code className="bg-slate-700/50 px-2 py-1 rounded text-cyan-300 text-xs">
                admin@icms.local / Admin@1234
              </code>
            </p>

            {/* Sign Up Link */}
            <p className="text-slate-400 text-sm">
              Don't have an account?{' '}
              <a 
                href="/register" 
                className="text-cyan-400 hover:text-cyan-300 font-semibold underline transition-colors"
              >
                Sign up here
              </a>
            </p>
          </div>
        </div>

        {/* Floating elements animation */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          .animate-float { animation: float 3s ease-in-out infinite; }
        `}</style>
      </div>
    </div>
  );
};

export default LoginPage;
