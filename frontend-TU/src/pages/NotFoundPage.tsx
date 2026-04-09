// Not Found Page
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-tu-dark-beast-900 min-h-screen flex items-center justify-center p-4">
      <div className="tu-card text-center max-w-md">
        <h1 className="text-6xl font-bold text-tu-error mb-4">404</h1>
        <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
        <p className="text-tu-dark-beast-400 mb-8">
          Trang bạn tìm kiếm không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <button
          onClick={() => navigate('/')}
          className="tu-btn-primary inline-block"
        >
          Quay lại Trang Chủ
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
