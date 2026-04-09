// ===================================================
// REGISTER PAGE - ICMS Account Creation Portal
// Thiết kế: Dark Mode, Premium UI with Icons & Effects
// ===================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTuIdentity } from '../context/TuIdentityContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, loading } = useTuIdentity();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string;
    confirmPassword?: string;
    name?: string;
  }>({});
  const [registerError, setRegisterError] = useState<string | null>(null);

  // ===================================================
  // VALIDATION
  // ===================================================
  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string; name?: string } = {};

    // Name validation
    if (!name) {
      newErrors.name = 'Full name is required';
    } else if (name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }

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

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm password';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===================================================
  // HANDLE SUBMIT
  // ===================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      console.log(
        '%c[TU-AUTH] Đang tạo tài khoản mới...',
        'color: #06b6d4; font-weight: bold; font-size: 14px;'
      );
      console.log(`👤 Name: ${name}, 📧 Email: ${email}`);

      // Call register function
      await register(email, password, name);

      // Success - redirect
      console.log(
        '%c[TU-AUTH] ✅ Registration Success! Redirecting...',
        'color: #10b981; font-weight: bold;'
      );

      // Redirect to /ideas after registration
      navigate('/ideas');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Registration failed';
      console.log(
        '%c[TU-AUTH] ❌ Registration Failed!',
        'color: #ef4444; font-weight: bold;'
      );
      setRegisterError(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </div>

      {/* Register Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="text-4xl mb-2">🎉</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Join ICMS
            </h1>
            <p className="text-slate-400 text-sm">Create your account to get started</p>
          </div>

          {/* Error Alert */}
          {registerError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start space-x-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-red-200 font-medium text-sm">{registerError}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                <span className="inline-flex items-center">
                  <span>👤 Full Name</span>
                </span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                placeholder="John Developer"
                className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg transition-all focus:outline-none focus:ring-2 ${
                  errors.name
                    ? 'border-red-500 focus:ring-red-500/50'
                    : 'border-slate-600 hover:border-slate-500 focus:ring-cyan-500/50 focus:border-cyan-500'
                } text-slate-100 placeholder-slate-400`}
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1 flex items-center">
                  <span className="mr-1">❌</span>
                  {errors.name}
                </p>
              )}
            </div>

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
                placeholder="your@email.com"
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

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                <span className="inline-flex items-center">
                  <span>🔐 Confirm Password</span>
                </span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
                placeholder="••••••••"
                className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg transition-all focus:outline-none focus:ring-2 ${
                  errors.confirmPassword
                    ? 'border-red-500 focus:ring-red-500/50'
                    : 'border-slate-600 hover:border-slate-500 focus:ring-cyan-500/50 focus:border-cyan-500'
                } text-slate-100 placeholder-slate-400`}
              />
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1 flex items-center">
                  <span className="mr-1">❌</span>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all duration-300 flex items-center justify-center space-x-2 ${
                loading
                  ? 'bg-slate-600 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg hover:shadow-green-500/50 hover:scale-105 active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>🎉</span>
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="border-t border-slate-700 pt-4 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <a 
                href="/login" 
                className="text-cyan-400 hover:text-cyan-300 font-semibold underline transition-colors"
              >
                Login here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
