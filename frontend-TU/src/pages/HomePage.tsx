// Home Page - Public page
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTuIdentity } from '../context/TuIdentityContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useTuIdentity();

  return (
    <div className="bg-tu-dark-beast-900 min-h-screen">
      <div className="tu-container flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-6xl font-bold mb-4 text-tu-primary-400">ICMS</h1>
        <p className="text-xl text-tu-dark-beast-300 mb-8">Innovation Contribution Management System</p>
        <p className="text-tu-dark-beast-400 mb-12 max-w-md text-center">
          Nền tảng quản lý ý tưởng sáng tạo - Dùng React + Rust 🚀
        </p>
        <div className="flex gap-4">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="tu-btn-primary"
            >
              Vào Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="tu-btn-primary"
              >
                Đăng Nhập
              </button>
              <button
                onClick={() => navigate('/login')}
                className="tu-btn-secondary"
              >
                Đăng Ký
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
